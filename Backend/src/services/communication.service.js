'use strict';

const mongoose = require('mongoose');

const Activity = require('../models/Activity');
const Lead = require('../models/Lead');
const Contact = require('../models/Contact');
const Company = require('../models/Company');
const Opportunity = require('../models/Opportunity');
const ApiError = require('../utils/ApiError');

// ======================================================
// SHARED HELPERS FOR EMAIL / SMS / WHATSAPP
// ======================================================

const workspaceOf = (req) => req.user?.workspace || null;

const fullName = (contact) =>
  [contact?.firstName, contact?.lastName].filter(Boolean).join(' ').trim();

// Record types a communication can be sent from / linked to.
const RECORDS = {
  lead: {
    load: (id) => Lead.findById(id),
    describe: (lead) => ({
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      companyName: lead.companyName,
      links: { lead: lead._id, company: lead.company, contact: lead.contact },
    }),
  },
  contact: {
    load: (id) => Contact.findById(id).populate('company', 'name'),
    describe: (contact) => ({
      name: fullName(contact),
      email: contact.email,
      phone: contact.phone,
      companyName: contact.company?.name,
      links: { contact: contact._id, company: contact.company?._id || contact.company },
    }),
  },
  company: {
    load: (id) => Company.findOne({ _id: id, isDeleted: { $ne: true } }),
    describe: (company) => ({
      name: company.name,
      email: company.email,
      phone: company.phone,
      companyName: company.name,
      links: { company: company._id },
    }),
  },
  opportunity: {
    load: (id) =>
      Opportunity.findById(id)
        .populate('contact', 'firstName lastName email phone')
        .populate('company', 'name email phone'),
    describe: (opportunity) => ({
      name: fullName(opportunity.contact) || opportunity.company?.name || opportunity.name,
      email: opportunity.contact?.email || opportunity.company?.email,
      phone: opportunity.contact?.phone || opportunity.company?.phone,
      companyName: opportunity.company?.name,
      links: {
        opportunity: opportunity._id,
        contact: opportunity.contact?._id,
        company: opportunity.company?._id,
        lead: opportunity.lead,
      },
    }),
  },
};

// Loads a CRM record and returns its recipient details.
// Records with a workspace field must belong to the user's workspace.
const resolveRecord = async (req, recordType, recordId) => {
  const config = RECORDS[recordType];
  if (!config) throw new ApiError(400, 'Unsupported record type', 'INVALID_RECORD_TYPE');
  if (!mongoose.isValidObjectId(recordId)) throw new ApiError(400, 'Invalid record ID', 'INVALID_ID');

  const doc = await config.load(recordId);
  const workspace = workspaceOf(req);

  if (!doc || (doc.workspace && workspace && String(doc.workspace) !== String(workspace))) {
    throw new ApiError(404, 'Record not found', 'RECORD_NOT_FOUND');
  }

  return { doc, recordType, ...config.describe(doc) };
};

// {{name}}, {{firstName}}, {{email}}, {{phone}}, {{company}}, {{senderName}}, {{senderEmail}}
const buildVariables = (recipient, user) => ({
  name: recipient?.name || '',
  firstName: String(recipient?.name || '').split(' ')[0] || '',
  email: recipient?.email || '',
  phone: recipient?.phone || '',
  company: recipient?.companyName || '',
  senderName: user?.name || '',
  senderEmail: user?.email || '',
});

const renderTemplate = (text, variables) =>
  String(text || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(variables, key) ? variables[key] : match,
  );

const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

// Plain-text body -> simple HTML email.
const textToHtml = (text) =>
  `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;white-space:normal;">${escapeHtml(
    text,
  ).replace(/\r?\n/g, '<br>')}</div>`;

// Saves the communication as an Activity (sent or failed) so it appears
// in record history and communication logs.
const logCommunication = async (req, { type, subject, body, links, delivery }) => {
  const userId = req.user?._id;
  const cleanLinks = Object.fromEntries(
    Object.entries(links || {}).filter(([, value]) => value),
  );

  return Activity.create({
    workspace: workspaceOf(req),
    type,
    subject: String(subject || type).slice(0, 200),
    description: String(body || '').slice(0, 5000),
    status: delivery.status === 'SENT' ? 'COMPLETED' : 'CANCELLED',
    priority: 'MEDIUM',
    scheduledAt: new Date(),
    assignedTo: userId,
    createdBy: userId,
    updatedBy: userId,
    ...cleanLinks,
    ...(delivery.channel === 'EMAIL' ? { emailAddress: delivery.to } : { phoneNumber: delivery.to }),
    delivery,
  });
};

// Updates lastContactAt on the record after a successful send.
const touchRecord = async (recipient) => {
  if (['lead', 'contact'].includes(recipient.recordType)) {
    await recipient.doc.constructor.updateOne(
      { _id: recipient.doc._id },
      { $set: { lastContactAt: new Date() } },
    );
  }
};

// Provider "not configured" errors are returned without logging an attempt.
const isNotConfigured = (error) =>
  ['EMAIL_SERVICE_NOT_CONFIGURED', 'MESSAGING_NOT_CONFIGURED'].includes(error?.code);

module.exports = {
  RECORDS,
  workspaceOf,
  resolveRecord,
  buildVariables,
  renderTemplate,
  textToHtml,
  logCommunication,
  touchRecord,
  isNotConfigured,
};
