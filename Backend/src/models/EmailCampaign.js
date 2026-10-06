'use strict';

const mongoose = require('mongoose');

const recipientSchema = new mongoose.Schema(
  {
    recordType: { type: String, enum: ['lead', 'contact'], required: true },
    record: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, trim: true, maxlength: 200 },
    email: { type: String, trim: true, lowercase: true, maxlength: 254, required: true },
    status: { type: String, enum: ['PENDING', 'SENT', 'FAILED'], default: 'PENDING' },
    messageId: { type: String, trim: true, maxlength: 200 },
    error: { type: String, trim: true, maxlength: 1000 },
    sentAt: { type: Date },
  },
  { _id: false },
);

// DRAFT -> SENDING -> SENT | PARTIAL | FAILED. Only DRAFT can be edited or sent.
const emailCampaignSchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', default: null, index: true },
    name: { type: String, required: [true, 'Campaign name is required'], trim: true, maxlength: 150 },
    subject: { type: String, required: [true, 'Subject is required'], trim: true, maxlength: 300 },
    body: { type: String, required: [true, 'Body is required'], maxlength: 20000 },
    template: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailTemplate', default: null },
    recipients: { type: [recipientSchema], default: [] },
    status: {
      type: String,
      enum: ['DRAFT', 'SENDING', 'SENT', 'PARTIAL', 'FAILED'],
      default: 'DRAFT',
      index: true,
    },
    stats: {
      total: { type: Number, default: 0 },
      sent: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
    },
    startedAt: { type: Date },
    completedAt: { type: Date },
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

module.exports =
  mongoose.models.EmailCampaign || mongoose.model('EmailCampaign', emailCampaignSchema);
