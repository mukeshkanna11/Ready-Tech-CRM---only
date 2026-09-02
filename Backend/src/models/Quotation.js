const mongoose = require('mongoose');

const schema = new mongoose.Schema(
{
  quotationNumber: { type: String, required: true, unique: true, index: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  contact: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' },
  opportunity: { type: mongoose.Schema.Types.ObjectId, ref: 'Opportunity' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  issueDate: { type: Date, default: Date.now },
  validUntil: Date,
  currency: { type: String, default: 'INR', uppercase: true },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    description: String,
    quantity: { type: Number, min: 1, default: 1 },
    unitPrice: { type: Number, min: 0, default: 0 },
    taxRate: { type: Number, min: 0, default: 0 },
    discountRate: { type: Number, min: 0, default: 0 }
  }],
  subtotal: { type: Number, min: 0, default: 0 },
  taxTotal: { type: Number, min: 0, default: 0 },
  discountTotal: { type: Number, min: 0, default: 0 },
  grandTotal: { type: Number, min: 0, default: 0 },
  status: { type: String, enum: ['DRAFT','SENT','VIEWED','ACCEPTED','REJECTED','EXPIRED'], default: 'DRAFT', index: true },
  notes: String
}
, { timestamps: true, versionKey: false });

module.exports = mongoose.model('Quotation', schema);
