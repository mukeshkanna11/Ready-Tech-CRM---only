'use strict';

const mongoose = require('mongoose');

// ======================================================
// LEAD SOURCE SCHEMA
// ======================================================
//
// Workspace-defined lead sources, in addition to the
// built-in LEAD_SOURCES. `key` is the value stored in
// Lead.source and is immutable after creation. `name`
// is the display label.

const leadSourceSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      default: null,
      index: true,
    },

    key: {
      type: String,
      required: [true, 'Source key is required'],
      uppercase: true,
      trim: true,
      match: [/^[A-Z][A-Z0-9_]{1,49}$/, 'Invalid source key'],
    },

    name: {
      type: String,
      required: [true, 'Source name is required'],
      trim: true,
      maxlength: [60, 'Source name cannot exceed 60 characters'],
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// One key per workspace.
leadSourceSchema.index({ workspace: 1, key: 1 }, { unique: true });

module.exports =
  mongoose.models.LeadSource ||
  mongoose.model('LeadSource', leadSourceSchema);
