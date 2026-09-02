const mongoose = require('mongoose');

const schema = new mongoose.Schema(
{
  content: { type: String, required: true, trim: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  contact: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' },
  opportunity: { type: mongoose.Schema.Types.ObjectId, ref: 'Opportunity' },
  quotation: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation' },
  invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' }
}
, { timestamps: true, versionKey: false });

module.exports = mongoose.model('Note', schema);
