'use strict';

const mongoose = require('mongoose');

// Reusable email subject + body. Supports {{variables}}, see communication.service.
const emailTemplateSchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', default: null, index: true },
    name: { type: String, required: [true, 'Template name is required'], trim: true, maxlength: 100 },
    subject: { type: String, required: [true, 'Subject is required'], trim: true, maxlength: 300 },
    body: { type: String, required: [true, 'Body is required'], maxlength: 20000 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

module.exports =
  mongoose.models.EmailTemplate || mongoose.model('EmailTemplate', emailTemplateSchema);
