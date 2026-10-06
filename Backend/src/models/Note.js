const mongoose = require('mongoose');

// Files are stored by upload.middleware (uploads/); `filename` is the stored name.
const attachmentSchema = new mongoose.Schema(
{
  name: { type: String, trim: true, maxlength: 255, required: true },
  filename: { type: String, trim: true, maxlength: 255, required: true },
  mimeType: { type: String, trim: true, maxlength: 100 },
  size: { type: Number, min: 0 },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  uploadedAt: { type: Date, default: Date.now }
});

const schema = new mongoose.Schema(
{
  // Tenant. Optional until the workspace migration has been run.
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', default: null, index: true },
  content: { type: String, required: true, trim: true, maxlength: 10000 },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', index: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', index: true },
  contact: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', index: true },
  opportunity: { type: mongoose.Schema.Types.ObjectId, ref: 'Opportunity', index: true },
  quotation: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation' },
  invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  attachments: { type: [attachmentSchema], default: [] }
}
, { timestamps: true, versionKey: false });

module.exports = mongoose.model('Note', schema);
