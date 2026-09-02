const mongoose = require('mongoose');

const schema = new mongoose.Schema(
{
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, default: 'SYSTEM' },
  entityType: String,
  entityId: mongoose.Schema.Types.ObjectId,
  isRead: { type: Boolean, default: false, index: true },
  readAt: Date
}
, { timestamps: true, versionKey: false });

module.exports = mongoose.model('Notification', schema);
