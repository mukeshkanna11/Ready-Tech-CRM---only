'use strict';

const ai = require('../services/ai.service');
const sms = require('../services/sms.service');
const Activity = require('../models/Activity');
const Note = require('../models/Note');
const Task = require('../models/Task');
const Lead = require('../models/Lead');
const Opportunity = require('../models/Opportunity');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const { authorizePermission } = require('../middleware/authorize.middleware');
const {
  resolveRecord,
  buildVariables,
  renderTemplate,
  logCommunication,
  touchRecord,
  isNotConfigured,
} = require('../services/communication.service');
const { sendRecordEmail } = require('./email.controller');
const { getForecast } = require('./opportunityForecast.controller');

// ======================================================
// AI ENDPOINTS
// ======================================================
//
// All AI calls are user-triggered POSTs and read-only.
// The only write is POST /ai/records/:type/:id/send, which
// sends the user-reviewed text through the existing
// email / WhatsApp integrations.

const RESOURCES = { lead: 'LEADS', contact: 'CONTACTS', company: 'COMPANIES', opportunity: 'OPPORTUNITIES' };

const can = (req, permission) =>
  new Promise((resolve, reject) => {
    authorizePermission(permission)(req, null, (error) => (error ? reject(error) : resolve()));
  });

const days = (date, future = false) => {
  if (!date) return null;
  const diff = (new Date(date).getTime() - Date.now()) / 86_400_000;
  return Math.round(future ? diff : -diff);
};

const clip = (value, max) => (value ? String(value).slice(0, max) : undefined);

const requireText = (value, label, max) => {
  const text = String(value || '').trim();
  if (!text) throw new ApiError(400, `${label} is required`, 'VALIDATION_ERROR');
  if (text.length > max) throw new ApiError(400, `${label} cannot exceed ${max} characters`, 'VALIDATION_ERROR');
  return text;
};

// ------------------------------------------------------
// Minimal context (no names, emails or phone numbers)
// ------------------------------------------------------

const FACTS = {
  lead: (d) => ({
    status: d.status,
    source: d.source,
    value: d.value,
    designation: d.designation,
    hasEmail: Boolean(d.email),
    hasPhone: Boolean(d.phone),
    hasCompany: Boolean(d.companyName || d.company),
    region: [d.city, d.state, d.country].filter(Boolean).join(', ') || undefined,
    tags: d.tags?.slice(0, 5),
    notes: clip(d.notes, 400),
    lostReason: clip(d.lostReason, 150),
    ageDays: days(d.createdAt),
    daysSinceLastContact: days(d.lastContactAt),
    nextFollowUpInDays: days(d.nextFollowUpAt, true),
    expectedCloseInDays: days(d.expectedCloseDate, true),
  }),
  contact: (d) => ({
    designation: d.designation,
    department: d.department,
    status: d.status,
    source: d.source,
    tags: d.tags?.slice(0, 5),
    notes: clip(d.notes, 400),
    ageDays: days(d.createdAt),
    daysSinceLastContact: days(d.lastContactAt),
    nextFollowUpInDays: days(d.nextFollowUpAt, true),
  }),
  company: (d) => ({
    industry: d.industry,
    companyType: d.companyType,
    employeeCount: d.employeeCount,
    annualRevenue: d.annualRevenue,
    status: d.status,
    rating: d.rating,
    tags: d.tags?.slice(0, 5),
    description: clip(d.description, 300),
    ageDays: days(d.createdAt),
  }),
  opportunity: (d) => ({
    stage: d.stage,
    status: d.status,
    value: d.value,
    probability: d.probability,
    priority: d.priority,
    source: d.source,
    notes: clip(d.notes, 300),
    lostReason: clip(d.lostReason, 150),
    ageDays: days(d.createdAt),
    expectedCloseInDays: days(d.expectedCloseDate, true),
    daysSinceLastContact: days(d.lastContactedAt),
  }),
};

// Record facts + recent history (activities, notes, open tasks, deals).
const buildContext = async (recipient, { history = true } = {}) => {
  const { doc, recordType } = recipient;
  const context = { recordType, record: FACTS[recordType](doc) };
  if (!history) return context;

  const link = { [recordType]: doc._id };
  const [activities, notes, tasks, deals] = await Promise.all([
    Activity.find({ ...link, isDeleted: { $ne: true } })
      .sort({ createdAt: -1 })
      .limit(8)
      .select('type status outcome subject createdAt')
      .lean(),
    Note.find(link).sort({ createdAt: -1 }).limit(3).select('content createdAt').lean(),
    Task.find({ ...link, isDeleted: { $ne: true }, status: { $nin: ['COMPLETED', 'CANCELLED'] } })
      .sort({ dueAt: 1 })
      .limit(5)
      .select('title dueAt')
      .lean(),
    recordType === 'opportunity'
      ? []
      : Opportunity.find(link).sort({ updatedAt: -1 }).limit(5).select('stage status value probability').lean(),
  ]);

  return {
    ...context,
    recentActivities: activities.map((a) => ({
      type: a.type,
      status: a.status,
      outcome: a.outcome,
      subject: clip(a.subject, 100),
      daysAgo: days(a.createdAt),
    })),
    recentNotes: notes.map((n) => ({ text: clip(n.content, 300), daysAgo: days(n.createdAt) })),
    openTasks: tasks.map((t) => ({ title: clip(t.title, 100), dueInDays: days(t.dueAt, true) })),
    deals: deals.map(({ stage, status, value, probability }) => ({ stage, status, value, probability })),
  };
};

// Loads a record the user may read (workspace checked by resolveRecord).
const loadRecord = async (req, type = req.params.type) => {
  if (!RESOURCES[type]) throw new ApiError(400, 'Unsupported record type', 'INVALID_RECORD_TYPE');
  await can(req, `${RESOURCES[type]}:READ`);
  return resolveRecord(req, type, req.params.id || req.body?.recordId);
};

// ------------------------------------------------------
// Handlers
// ------------------------------------------------------

// GET /ai/status - lets the UI show a "not configured" state without an AI call.
exports.status = (req, res) => sendSuccess(res, { configured: ai.isConfigured(), model: ai.MODEL }, 'AI status');

// POST /ai/assistant { question, recordType?, recordId? }
exports.assistant = asyncHandler(async (req, res) => {
  const question = requireText(req.body?.question, 'Question', 500);
  await can(req, 'OPPORTUNITIES:READ');

  const workspace = req.user?.workspace || null;
  const [deals, leads] = await Promise.all([
    Opportunity.aggregate([
      { $group: { _id: { stage: '$stage', status: '$status' }, count: { $sum: 1 }, value: { $sum: { $ifNull: ['$value', 0] } } } },
      { $sort: { count: -1 } },
      { $limit: 15 },
    ]),
    Lead.aggregate([
      { $match: { workspace: { $in: [workspace, null] } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  const data = {
    question,
    pipeline: deals.map((d) => ({ ...d._id, count: d.count, value: d.value })),
    leadsByStatus: Object.fromEntries(leads.map((l) => [l._id, l.count])),
  };

  if (req.body?.recordType && req.body?.recordId) {
    data.record = await buildContext(await loadRecord(req, req.body.recordType));
  }

  sendSuccess(res, await ai.assistant(data), 'AI answer generated');
});

// POST /ai/leads/:id/qualify | /ai/leads/:id/score
exports.qualifyLead = asyncHandler(async (req, res) => {
  const context = await buildContext(await loadRecord(req, 'lead'));
  sendSuccess(res, await ai.qualifyLead({ ...context, allowedStatuses: ai.LEAD_STATUSES }), 'Lead qualified');
});

exports.scoreLead = asyncHandler(async (req, res) => {
  const context = await buildContext(await loadRecord(req, 'lead'));
  sendSuccess(res, await ai.scoreLead(context), 'Lead scored');
});

// POST /ai/records/:type/:id/insights
exports.insights = asyncHandler(async (req, res) => {
  const context = await buildContext(await loadRecord(req));
  sendSuccess(res, await ai.insights(context), 'Insights generated');
});

// POST /ai/records/:type/:id/follow-ups
exports.followUps = asyncHandler(async (req, res) => {
  const context = await buildContext(await loadRecord(req));
  sendSuccess(res, await ai.followUps(context), 'Follow-ups suggested');
});

// POST /ai/records/:type/:id/draft { channel: EMAIL|WHATSAPP, purpose, tone? }
exports.draft = asyncHandler(async (req, res) => {
  const channel = req.body?.channel === 'WHATSAPP' ? 'WHATSAPP' : 'EMAIL';
  const purpose = requireText(req.body?.purpose, 'Purpose', 300);
  const tone = ['FRIENDLY', 'FORMAL', 'CONCISE', 'PERSUASIVE'].includes(req.body?.tone) ? req.body.tone : 'FRIENDLY';

  const recipient = await loadRecord(req);
  const context = await buildContext(recipient);
  const draft = await ai.draftMessage({ ...context, channel, purpose, tone });

  sendSuccess(
    res,
    { ...draft, channel, subject: channel === 'WHATSAPP' ? '' : draft.subject, canSend: Boolean(channel === 'EMAIL' ? recipient.email : recipient.phone) },
    'Draft generated',
  );
});

// POST /ai/records/:type/:id/summarize { notes }
exports.summarize = asyncHandler(async (req, res) => {
  const notes = requireText(req.body?.notes, 'Notes', 8000);
  const recipient = await loadRecord(req);
  const context = await buildContext(recipient, { history: false });
  sendSuccess(res, await ai.summarize({ ...context, notes }), 'Summary generated');
});

// Runs an existing Express handler and captures its `data` payload.
const capture = (handler, req, query) =>
  new Promise((resolve, reject) => {
    const fakeReq = Object.create(req, { query: { value: query } });
    const fakeRes = {
      status() {
        return this;
      },
      json(body) {
        resolve(body?.data);
      },
    };
    handler(fakeReq, fakeRes, (error) => reject(error || new Error('Forecast unavailable')));
  });

// POST /ai/forecast { from?, to?, owner?, team?, territory? }
// The deterministic forecast is calculated by the existing endpoint;
// AI only interprets those numbers.
exports.forecast = asyncHandler(async (req, res) => {
  await can(req, 'OPPORTUNITIES:READ');
  const query = Object.fromEntries(
    ['from', 'to', 'owner', 'team', 'territory']
      .filter((key) => req.body?.[key])
      .map((key) => [key, String(req.body[key])]),
  );

  const forecast = await capture(getForecast, req, query);
  if (!forecast?.totals?.count) {
    throw new ApiError(400, 'There are no opportunities in this period to analyse.', 'NO_FORECAST_DATA');
  }

  const data = {
    period: forecast.period,
    totals: forecast.totals,
    byMonth: forecast.byMonth?.slice(0, 12),
    byStage: forecast.byStage,
    bySalesperson: forecast.byOwner?.slice(0, 10).map(({ name, ...rest }, i) => ({ salesperson: `Rep ${i + 1}`, ...rest })),
    undatedOpen: forecast.undatedOpen,
  };

  sendSuccess(res, await ai.forecastInsights(data), 'Forecast insights generated');
});

// POST /ai/workflow { description, module? } -> validated DRAFT (not saved)
exports.workflow = asyncHandler(async (req, res) => {
  await can(req, 'AUTOMATIONS:READ');
  const description = requireText(req.body?.description, 'Description', 1000);
  const module = ai.WF.modules.includes(req.body?.module) ? req.body.module : undefined;

  sendSuccess(
    res,
    await ai.workflow({ description, preferredModule: module, allowedModules: ai.WF.modules }),
    'Workflow draft generated',
  );
});

// POST /ai/records/:type/:id/send { channel, subject?, body }
// User-confirmed send of a reviewed draft via the existing integrations.
exports.send = asyncHandler(async (req, res, next) => {
  await can(req, 'ACTIVITIES:CREATE');
  const channel = req.body?.channel;

  if (channel === 'EMAIL') {
    await loadRecord(req);
    req.body = {
      recordType: req.params.type,
      recordId: req.params.id,
      subject: req.body.subject,
      body: req.body.body,
    };
    return sendRecordEmail(req, res, next);
  }

  if (channel !== 'WHATSAPP') throw new ApiError(400, 'Channel must be EMAIL or WHATSAPP', 'INVALID_CHANNEL');

  const recipient = await loadRecord(req);
  if (!recipient.phone) throw new ApiError(400, 'This record does not have a phone number', 'PHONE_MISSING');

  const body = renderTemplate(requireText(req.body?.body, 'Message', 1600), buildVariables(recipient, req.user));

  let result;
  try {
    const sent = await sms.sendMessage({ channel: 'WHATSAPP', to: recipient.phone, body });
    result = { sent: true, messageId: sent.id, to: sent.to };
  } catch (error) {
    if (isNotConfigured(error) || error.statusCode === 400) throw error;
    result = { sent: false, error: error.message, to: recipient.phone };
  }

  const activity = await logCommunication(req, {
    type: 'WHATSAPP',
    subject: 'WhatsApp message',
    body,
    links: recipient.links,
    delivery: {
      channel: 'WHATSAPP',
      provider: 'TWILIO',
      to: result.to,
      status: result.sent ? 'SENT' : 'FAILED',
      messageId: result.messageId || undefined,
      error: result.error,
    },
  });

  if (!result.sent) {
    throw new ApiError(502, `WhatsApp could not be sent: ${result.error}. The attempt was saved in the communication log.`, 'WHATSAPP_SEND_FAILED');
  }

  await touchRecord(recipient);
  sendSuccess(res, { messageId: result.messageId, activityId: activity._id }, 'WhatsApp message sent');
});
