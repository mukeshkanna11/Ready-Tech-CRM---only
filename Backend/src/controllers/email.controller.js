"use strict";

const mongoose = require("mongoose");

const EmailTemplate = require("../models/EmailTemplate");
const EmailCampaign = require("../models/EmailCampaign");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const { sendSuccess } = require("../utils/apiResponse");
const logger = require("../config/logger");
// Accessed through the module object so the provider can be swapped in tests.
const emailService = require("../services/email.service");
const {
  workspaceOf,
  resolveRecord,
  buildVariables,
  renderTemplate,
  textToHtml,
  logCommunication,
  touchRecord,
  isNotConfigured,
} = require("../services/communication.service");

const MAX_CAMPAIGN_RECIPIENTS = 1000;
// A campaign stuck in SENDING longer than this (e.g. server restart) can be resumed.
const STALE_SENDING_MS = 15 * 60 * 1000;

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const requireText = (value, field, max) => {
  const text = String(value ?? "").trim();
  if (!text) throw new ApiError(400, `${field} is required`, "VALIDATION_ERROR");
  if (max && text.length > max) {
    throw new ApiError(400, `${field} cannot exceed ${max} characters`, "VALIDATION_ERROR");
  }
  return text;
};

const findTemplate = async (req, id) => {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid template ID", "INVALID_ID");
  const template = await EmailTemplate.findOne({ _id: id, workspace: workspaceOf(req) });
  if (!template) throw new ApiError(404, "Template not found", "TEMPLATE_NOT_FOUND");
  return template;
};

// Sends one email and always records the outcome as an EMAIL activity.
// Returns { sent, messageId, error, activity }.
const deliverEmail = async (req, recipient, { subject, body, template, campaign }) => {
  const variables = buildVariables(recipient, req.user);
  const finalSubject = renderTemplate(subject, variables);
  const finalBody = renderTemplate(body, variables);

  let result;
  try {
    const sent = await emailService.sendEmail({
      to: recipient.email,
      subject: finalSubject,
      text: finalBody,
      html: textToHtml(finalBody),
      replyTo: req.user?.email || undefined,
    });
    result = { sent: true, messageId: sent?.id || null };
  } catch (error) {
    if (isNotConfigured(error)) throw error;
    result = { sent: false, error: error.message || "Email could not be sent" };
  }

  // The send already happened; a logging failure must not hide that.
  try {
    result.activity = await logCommunication(req, {
      type: "EMAIL",
      subject: finalSubject,
      body: finalBody,
      links: recipient.links,
      delivery: {
        channel: "EMAIL",
        provider: "RESEND",
        to: recipient.email,
        status: result.sent ? "SENT" : "FAILED",
        messageId: result.messageId || undefined,
        error: result.error,
        template: template || undefined,
        campaign: campaign || undefined,
      },
    });
    if (result.sent) await touchRecord(recipient);
  } catch (error) {
    logger.error("Email communication log failed", error);
  }

  return { ...result, subject: finalSubject, body: finalBody };
};

// Resolves subject/body from an optional template plus overrides.
const composeContent = async (req, { templateId, subject, body }) => {
  let template = null;
  if (templateId) template = await findTemplate(req, templateId);

  return {
    template: template?._id || null,
    subject: requireText(subject || template?.subject, "Subject", 300),
    body: requireText(body || template?.body, "Message", 20000),
  };
};

// ======================================================
// SEND FROM A CRM RECORD
// ======================================================

// POST /communications/email/send
// { recordType: lead|contact|company|opportunity, recordId, templateId?, subject?, body? }
const sendRecordEmail = asyncHandler(async (req, res) => {
  const { recordType, recordId } = req.body || {};
  const recipient = await resolveRecord(req, recordType, recordId);

  if (!recipient.email) {
    throw new ApiError(400, "This record does not have an email address", "EMAIL_MISSING");
  }

  const content = await composeContent(req, req.body || {});
  const result = await deliverEmail(req, recipient, content);

  if (!result.sent) {
    throw new ApiError(
      502,
      `Email could not be sent: ${result.error}. The attempt was saved in the communication log.`,
      "EMAIL_SEND_FAILED",
    );
  }

  sendSuccess(
    res,
    { messageId: result.messageId, recipient: recipient.email, activityId: result.activity?._id },
    "Email sent successfully",
  );
});

// POST /communications/email/leads/:id/send  { subject, text|html }  (original lead endpoint)
const sendLeadEmail = (req, res, next) => {
  const { subject, text, html, templateId } = req.body || {};
  req.body = {
    recordType: "lead",
    recordId: req.params.id,
    templateId,
    subject,
    body: text || String(html || "").replace(/<[^>]*>/g, " ").trim(),
  };
  return sendRecordEmail(req, res, next);
};

// POST /communications/email/preview  { templateId?|subject+body, recordType, recordId }
const previewEmail = asyncHandler(async (req, res) => {
  const { recordType, recordId } = req.body || {};
  const content = await composeContent(req, req.body || {});
  const recipient = recordType ? await resolveRecord(req, recordType, recordId) : null;
  const variables = buildVariables(recipient, req.user);

  sendSuccess(res, {
    to: recipient?.email || null,
    subject: renderTemplate(content.subject, variables),
    body: renderTemplate(content.body, variables),
  }, "Email preview generated");
});

// ======================================================
// TEMPLATES
// ======================================================

const assertUniqueTemplateName = async (req, name, excludeId) => {
  const exists = await EmailTemplate.exists({
    workspace: workspaceOf(req),
    name: { $regex: `^${escapeRegex(name)}$`, $options: "i" },
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  });
  if (exists) throw new ApiError(409, "A template with this name already exists", "TEMPLATE_EXISTS");
};

const listTemplates = asyncHandler(async (req, res) => {
  const filter = { workspace: workspaceOf(req) };
  if (req.query.search) {
    filter.name = { $regex: escapeRegex(String(req.query.search)), $options: "i" };
  }
  const templates = await EmailTemplate.find(filter).sort({ name: 1 }).lean();
  sendSuccess(res, templates, "Email templates fetched");
});

const getTemplate = asyncHandler(async (req, res) => {
  sendSuccess(res, await findTemplate(req, req.params.id), "Email template fetched");
});

const createTemplate = asyncHandler(async (req, res) => {
  const name = requireText(req.body?.name, "Template name", 100);
  await assertUniqueTemplateName(req, name);

  const template = await EmailTemplate.create({
    workspace: workspaceOf(req),
    name,
    subject: requireText(req.body?.subject, "Subject", 300),
    body: requireText(req.body?.body, "Body", 20000),
    createdBy: req.user?._id,
    updatedBy: req.user?._id,
  });

  sendSuccess(res, template, "Email template created", 201);
});

const updateTemplate = asyncHandler(async (req, res) => {
  const template = await findTemplate(req, req.params.id);
  const { name, subject, body } = req.body || {};

  if (name !== undefined) {
    const cleanName = requireText(name, "Template name", 100);
    await assertUniqueTemplateName(req, cleanName, template._id);
    template.name = cleanName;
  }
  if (subject !== undefined) template.subject = requireText(subject, "Subject", 300);
  if (body !== undefined) template.body = requireText(body, "Body", 20000);
  template.updatedBy = req.user?._id;

  await template.save();
  sendSuccess(res, template, "Email template updated");
});

const removeTemplate = asyncHandler(async (req, res) => {
  const template = await findTemplate(req, req.params.id);
  await template.deleteOne();
  // Campaigns keep their own copy of subject/body.
  await EmailCampaign.updateMany({ template: template._id }, { $set: { template: null } });
  sendSuccess(res, null, "Email template deleted");
});

// ======================================================
// CAMPAIGNS
// ======================================================

const findCampaign = async (req, id) => {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid campaign ID", "INVALID_ID");
  const campaign = await EmailCampaign.findOne({ _id: id, workspace: workspaceOf(req) });
  if (!campaign) throw new ApiError(404, "Campaign not found", "CAMPAIGN_NOT_FOUND");
  return campaign;
};

// [{ recordType: lead|contact, recordId }] -> recipient snapshots (deduped by email).
const resolveRecipients = async (req, input) => {
  if (!Array.isArray(input)) throw new ApiError(400, "recipients must be a list", "VALIDATION_ERROR");
  if (input.length > MAX_CAMPAIGN_RECIPIENTS) {
    throw new ApiError(400, `A campaign can have at most ${MAX_CAMPAIGN_RECIPIENTS} recipients`, "TOO_MANY_RECIPIENTS");
  }

  const recipients = [];
  const skipped = [];
  const seen = new Set();

  for (const item of input) {
    if (!["lead", "contact"].includes(item?.recordType)) {
      skipped.push({ ...item, reason: "Unsupported record type" });
      continue;
    }
    try {
      const recipient = await resolveRecord(req, item.recordType, item.recordId);
      const email = String(recipient.email || "").toLowerCase();
      if (!email) {
        skipped.push({ ...item, name: recipient.name, reason: "No email address" });
      } else if (seen.has(email)) {
        skipped.push({ ...item, name: recipient.name, reason: "Duplicate email" });
      } else {
        seen.add(email);
        recipients.push({ recordType: item.recordType, record: recipient.doc._id, name: recipient.name, email });
      }
    } catch {
      skipped.push({ ...item, reason: "Record not found" });
    }
  }

  return { recipients, skipped };
};

const applyCampaignInput = async (req, campaign, body) => {
  const { name, subject, templateId, recipients } = body || {};
  let skipped = [];

  if (name !== undefined || campaign.isNew) campaign.name = requireText(name, "Campaign name", 150);

  if (templateId !== undefined) {
    campaign.template = templateId ? (await findTemplate(req, templateId))._id : null;
  }

  if (body.subject !== undefined || body.body !== undefined || campaign.isNew) {
    const template = campaign.template ? await EmailTemplate.findById(campaign.template) : null;
    campaign.subject = requireText(subject ?? (campaign.isNew ? template?.subject : campaign.subject), "Subject", 300);
    campaign.body = requireText(body.body ?? (campaign.isNew ? template?.body : campaign.body), "Message", 20000);
  }

  if (recipients !== undefined) {
    const resolved = await resolveRecipients(req, recipients);
    campaign.recipients = resolved.recipients;
    campaign.stats = { total: resolved.recipients.length, sent: 0, failed: 0 };
    skipped = resolved.skipped;
  }

  return skipped;
};

const campaignSummary = (campaign) => {
  const data = campaign.toObject ? campaign.toObject() : campaign;
  return { ...data, recipientCount: data.recipients?.length || 0 };
};

const listCampaigns = asyncHandler(async (req, res) => {
  const filter = { workspace: workspaceOf(req) };
  if (req.query.status) filter.status = String(req.query.status);
  const campaigns = await EmailCampaign.find(filter)
    .select("-recipients -body")
    .sort({ createdAt: -1 })
    .limit(200)
    .populate("sentBy createdBy", "name email")
    .lean();
  sendSuccess(res, campaigns, "Email campaigns fetched");
});

const getCampaign = asyncHandler(async (req, res) => {
  const campaign = await findCampaign(req, req.params.id);
  await campaign.populate("sentBy createdBy template", "name email");
  sendSuccess(res, campaignSummary(campaign), "Email campaign fetched");
});

const createCampaign = asyncHandler(async (req, res) => {
  const campaign = new EmailCampaign({ workspace: workspaceOf(req), createdBy: req.user?._id });
  const skipped = await applyCampaignInput(req, campaign, { recipients: [], ...req.body });
  await campaign.save();
  sendSuccess(res, { ...campaignSummary(campaign), skipped }, "Email campaign created", 201);
});

const updateCampaign = asyncHandler(async (req, res) => {
  const campaign = await findCampaign(req, req.params.id);
  if (campaign.status !== "DRAFT") {
    throw new ApiError(409, "Only draft campaigns can be edited", "CAMPAIGN_LOCKED");
  }
  const skipped = await applyCampaignInput(req, campaign, req.body || {});
  // Guard against a send that started while this edit was in flight.
  await campaign.validate();
  const { name, subject, body, template, recipients, stats } = campaign.toObject();
  const saved = await EmailCampaign.findOneAndUpdate(
    { _id: campaign._id, status: "DRAFT" },
    { $set: { name, subject, body, template, recipients, stats } },
    { new: true },
  );
  if (!saved) throw new ApiError(409, "Only draft campaigns can be edited", "CAMPAIGN_LOCKED");
  sendSuccess(res, { ...campaignSummary(saved), skipped }, "Email campaign updated");
});

const removeCampaign = asyncHandler(async (req, res) => {
  const campaign = await findCampaign(req, req.params.id);
  if (campaign.status === "SENDING") {
    throw new ApiError(409, "A campaign cannot be deleted while it is sending", "CAMPAIGN_SENDING");
  }
  await campaign.deleteOne();
  sendSuccess(res, null, "Email campaign deleted");
});

// Sends every PENDING recipient. Runs after the HTTP response.
const processCampaign = async (req, campaignId) => {
  const campaign = await EmailCampaign.findById(campaignId);
  if (!campaign) return;

  for (const recipient of campaign.recipients) {
    if (recipient.status !== "PENDING") continue;

    let result;
    try {
      const target = await resolveRecord(req, recipient.recordType, recipient.record).catch(() => null);
      result = await deliverEmail(
        req,
        target ? { ...target, email: recipient.email } : { recordType: recipient.recordType, name: recipient.name, email: recipient.email, links: {} },
        { subject: campaign.subject, body: campaign.body, template: campaign.template, campaign: campaign._id },
      );
    } catch (error) {
      result = { sent: false, error: error.message };
    }

    await EmailCampaign.updateOne(
      { _id: campaign._id, "recipients.email": recipient.email },
      {
        $set: {
          "recipients.$.status": result.sent ? "SENT" : "FAILED",
          "recipients.$.messageId": result.messageId || undefined,
          "recipients.$.error": result.error || undefined,
          "recipients.$.sentAt": new Date(),
        },
        $inc: { [result.sent ? "stats.sent" : "stats.failed"]: 1 },
      },
    );
  }

  const final = await EmailCampaign.findById(campaign._id).select("stats");
  const { sent, failed } = final.stats;
  await EmailCampaign.updateOne(
    { _id: campaign._id },
    {
      $set: {
        status: failed === 0 ? "SENT" : sent === 0 ? "FAILED" : "PARTIAL",
        completedAt: new Date(),
      },
    },
  );
};

// POST /communications/email/campaigns/:id/send
// Only a DRAFT (or a stale SENDING) campaign is claimed, so a campaign is never sent twice.
const sendCampaign = asyncHandler(async (req, res) => {
  const campaign = await findCampaign(req, req.params.id);

  if (!campaign.recipients.length) {
    throw new ApiError(400, "Add at least one recipient before sending", "NO_RECIPIENTS");
  }
  if (!process.env.RESEND_API_KEY) {
    throw new ApiError(503, "Email is not configured. Please set RESEND_API_KEY.", "EMAIL_SERVICE_NOT_CONFIGURED");
  }

  const claimed = await EmailCampaign.findOneAndUpdate(
    {
      _id: campaign._id,
      $or: [
        { status: "DRAFT" },
        { status: "SENDING", startedAt: { $lt: new Date(Date.now() - STALE_SENDING_MS) } },
      ],
    },
    { $set: { status: "SENDING", startedAt: new Date(), sentBy: req.user?._id } },
    { new: true },
  );

  if (!claimed) {
    throw new ApiError(409, `Campaign is already ${campaign.status.toLowerCase()}`, "CAMPAIGN_ALREADY_SENT");
  }

  // Keep only what the background job needs from the request.
  const jobReq = { user: req.user };
  setImmediate(() => {
    processCampaign(jobReq, claimed._id).catch((error) => {
      logger.error("Campaign send failed", error);
      EmailCampaign.updateOne(
        { _id: claimed._id, status: "SENDING" },
        { $set: { status: "FAILED", completedAt: new Date() } },
      ).catch(() => {});
    });
  });

  sendSuccess(res, campaignSummary(claimed), "Campaign is sending", 202);
});

module.exports = {
  sendRecordEmail,
  sendLeadEmail,
  previewEmail,
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  removeTemplate,
  listCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  removeCampaign,
  sendCampaign,
};
