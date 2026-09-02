const mongoose = require('mongoose');

const schema = new mongoose.Schema(
{
  name: { type: String, required: true, trim: true, index: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', index: true },
  contact: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' },
  lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  value: { type: Number, min: 0, default: 0 },
  currency: { type: String, default: 'INR', uppercase: true },
  stage: { type: String, enum: ['QUALIFICATION','DISCOVERY','PROPOSAL','NEGOTIATION','CLOSED_WON','CLOSED_LOST'], default: 'QUALIFICATION', index: true },
  probability: { type: Number, min: 0, max: 100, default: 10 },
  expectedCloseDate: Date,
  source: String,
  products: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantity: { type: Number, min: 1, default: 1 },
    price: { type: Number, min: 0, default: 0 }
  }],
  notes: String
}
, { timestamps: true, versionKey: false });

module.exports = mongoose.model('Opportunity', schema);
