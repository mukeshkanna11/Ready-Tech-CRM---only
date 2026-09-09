'use strict';

const mongoose = require('mongoose');

const conditionSchema = new mongoose.Schema(
  {
    field: {
      type: String,
      required: true,
      trim: true,
    },

    operator: {
      type: String,
      required: true,
      enum: [
        'EQUALS',
        'NOT_EQUALS',
        'CONTAINS',
        'NOT_CONTAINS',
        'STARTS_WITH',
        'ENDS_WITH',
        'GREATER_THAN',
        'LESS_THAN',
        'GREATER_THAN_OR_EQUAL',
        'LESS_THAN_OR_EQUAL',
        'IS_EMPTY',
        'IS_NOT_EMPTY',
        'IN',
        'NOT_IN',
      ],
    },

    value: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { _id: false }
);

const actionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: [
        'SEND_EMAIL',
        'CREATE_TASK',
        'UPDATE_RECORD',
        'ASSIGN_OWNER',
        'ADD_TAG',
        'REMOVE_TAG',
        'CREATE_NOTIFICATION',
      ],
    },

    config: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    order: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const automationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },

    module: {
      type: String,
      required: true,
      enum: [
        'LEAD',
        'CONTACT',
        'CLIENT',
        'DEAL',
        'OPPORTUNITY',
        'TASK',
        'SALES_ORDER',
        'INVOICE',
        'PAYMENT',
        'PRODUCT',
        'INVENTORY',
        'PURCHASE_ORDER',
        'EXPENSE',
        'EMPLOYEE',
      ],
    },

    trigger: {
      event: {
        type: String,
        required: true,
        trim: true,
      },

      config: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
    },

    conditions: {
      type: [conditionSchema],
      default: [],
    },

    conditionLogic: {
      type: String,
      enum: ['AND', 'OR'],
      default: 'AND',
    },

    actions: {
      type: [actionSchema],
      default: [],
    },

    status: {
      type: String,
      enum: ['DRAFT', 'ACTIVE', 'PAUSED'],
      default: 'DRAFT',
      index: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    lastExecutedAt: {
      type: Date,
      default: null,
    },

    executionCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

automationSchema.index({ module: 1, 'trigger.event': 1 });
automationSchema.index({ status: 1, isDeleted: 1 });
automationSchema.index({ createdBy: 1 });

module.exports =
  mongoose.models.Automation ||
  mongoose.model('Automation', automationSchema);