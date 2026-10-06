'use strict';

const mongoose = require('mongoose');

// ======================================================
// WORKSPACE (TENANT) SCHEMA
// ======================================================

const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Workspace name is required'],
      trim: true,
      maxlength: [150, 'Workspace name cannot exceed 150 characters'],
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    status: {
      type: String,
      enum: {
        values: ['ACTIVE', 'SUSPENDED'],
        message: 'Invalid workspace status',
      },
      default: 'ACTIVE',
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports =
  mongoose.models.Workspace ||
  mongoose.model('Workspace', workspaceSchema);
