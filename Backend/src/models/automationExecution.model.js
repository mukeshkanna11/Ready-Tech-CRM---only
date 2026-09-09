'use strict';

const mongoose = require('mongoose');

const automationExecutionSchema = new mongoose.Schema(
  {
    automation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Automation',
      required: true,
      index: true,
    },

    triggerEvent: {
      type: String,
      required: true,
    },

    module: {
      type: String,
      required: true,
    },

    recordId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },

    status: {
      type: String,
      enum: ['SUCCESS', 'FAILED', 'SKIPPED', 'RUNNING'],
      default: 'RUNNING',
      index: true,
    },

    conditionsPassed: {
      type: Boolean,
      default: false,
    },

    actionsExecuted: {
      type: Number,
      default: 0,
    },

    inputData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    outputData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    error: {
      type: String,
      default: null,
    },

    startedAt: {
      type: Date,
      default: Date.now,
    },

    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

automationExecutionSchema.index({
  automation: 1,
  createdAt: -1,
});

module.exports =
  mongoose.models.AutomationExecution ||
  mongoose.model('AutomationExecution', automationExecutionSchema);