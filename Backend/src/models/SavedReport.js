'use strict';

const mongoose = require('mongoose');

// ======================================================
// SAVED (CUSTOM) REPORT SCHEMA
// ======================================================
//
// Source/field/filter values are validated against the
// whitelist in customReport.controller before saving.

const savedReportSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      default: null,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Report name is required'],
      trim: true,
      maxlength: [100, 'Report name cannot exceed 100 characters'],
    },
    source: { type: String, required: true },
    columns: { type: [String], default: [] },
    filters: [
      {
        _id: false,
        field: String,
        op: String,
        value: String,
      },
    ],
    sort: {
      field: { type: String, default: 'createdAt' },
      dir: { type: String, enum: ['asc', 'desc'], default: 'desc' },
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

module.exports =
  mongoose.models.SavedReport ||
  mongoose.model('SavedReport', savedReportSchema);
