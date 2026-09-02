const mongoose = require('mongoose');

const schema = new mongoose.Schema(
{
  title: { type: String, required: true, trim: true },
  description: String,
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  dueDate: { type: Date, required: true, index: true },
  priority: { type: String, enum: ['LOW','MEDIUM','HIGH','URGENT'], default: 'MEDIUM' },
  status: { type: String, enum: ['PENDING','IN_PROGRESS','COMPLETED','CANCELLED'], default: 'PENDING', index: true },
  lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  contact: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' },
  opportunity: { type: mongoose.Schema.Types.ObjectId, ref: 'Opportunity' },
  completedAt: Date
}
, { timestamps: true, versionKey: false });

module.exports = mongoose.model('Task', schema);
