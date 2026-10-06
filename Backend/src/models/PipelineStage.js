'use strict';

const mongoose = require('mongoose');

// ======================================================
// PIPELINE STAGE SCHEMA
// ======================================================
//
// `key` is the value stored in Opportunity.stage and is
// immutable after creation. `name` is the display label.

const pipelineStageSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, 'Stage key is required'],
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^[A-Z][A-Z0-9_]{1,49}$/, 'Invalid stage key'],
    },

    name: {
      type: String,
      required: [true, 'Stage name is required'],
      trim: true,
      maxlength: [60, 'Stage name cannot exceed 60 characters'],
    },

    order: {
      type: Number,
      default: 0,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // CLOSED_WON / CLOSED_LOST drive Opportunity status logic.
    isSystem: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

module.exports =
  mongoose.models.PipelineStage ||
  mongoose.model('PipelineStage', pipelineStageSchema);
