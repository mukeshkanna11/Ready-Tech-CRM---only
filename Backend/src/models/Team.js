'use strict';

const mongoose = require('mongoose');

// ======================================================
// TEAM / TERRITORY SCHEMAS
// ======================================================
//
// Sales teams and territories, scoped to the user's
// workspace (same convention as LeadSource/Note).

const { ObjectId } = mongoose.Schema.Types;

const base = {
  workspace: { type: ObjectId, ref: 'Workspace', default: null, index: true },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [80, 'Name cannot exceed 80 characters'],
  },
  description: { type: String, trim: true, default: '', maxlength: 500 },
  members: [{ type: ObjectId, ref: 'User' }],
  createdBy: { type: ObjectId, ref: 'User', default: null },
};

const teamSchema = new mongoose.Schema(
  { ...base, manager: { type: ObjectId, ref: 'User', default: null } },
  { timestamps: true },
);

const territorySchema = new mongoose.Schema(
  {
    ...base,
    region: { type: String, trim: true, default: '', maxlength: 120 },
    teams: [{ type: ObjectId, ref: 'Team' }],
  },
  { timestamps: true },
);

teamSchema.index({ workspace: 1, name: 1 }, { unique: true });
territorySchema.index({ workspace: 1, name: 1 }, { unique: true });

module.exports = {
  Team: mongoose.models.Team || mongoose.model('Team', teamSchema),
  Territory:
    mongoose.models.Territory || mongoose.model('Territory', territorySchema),
};
