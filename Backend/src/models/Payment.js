const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    // ====================================================
    // PAYMENT IDENTIFICATION
    // ====================================================

    paymentNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: 30,
      index: true,
    },

    // ====================================================
    // CRM RELATIONSHIPS
    // ====================================================

    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      required: true,
      index: true,
    },

    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      default: null,
      index: true,
    },

    contact: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contact',
      default: null,
      index: true,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    // ====================================================
    // PAYMENT DETAILS
    // ====================================================

    paymentDate: {
      type: Date,
      default: Date.now,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },

    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: 'INR',
      maxlength: 3,
    },

    paymentMethod: {
      type: String,
      enum: [
        'CASH',
        'BANK_TRANSFER',
        'UPI',
        'CARD',
        'CHEQUE',
        'OTHER',
      ],
      required: true,
      default: 'BANK_TRANSFER',
      index: true,
    },

    transactionReference: {
      type: String,
      trim: true,
      maxlength: 150,
      default: '',
      index: true,
    },

    chequeNumber: {
      type: String,
      trim: true,
      maxlength: 100,
      default: '',
    },

    bankName: {
      type: String,
      trim: true,
      maxlength: 150,
      default: '',
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },

    // ====================================================
    // STATUS
    // ====================================================

    status: {
      type: String,
      enum: [
        'PENDING',
        'COMPLETED',
        'FAILED',
        'CANCELLED',
        'REFUNDED',
      ],
      default: 'COMPLETED',
      index: true,
    },

    // ====================================================
    // AUDIT
    // ====================================================

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ====================================================
// INDEXES
// ====================================================

paymentSchema.index({
  invoice: 1,
  paymentDate: -1,
});

paymentSchema.index({
  company: 1,
  status: 1,
  createdAt: -1,
});

paymentSchema.index({
  paymentMethod: 1,
  paymentDate: -1,
});

paymentSchema.index({
  transactionReference: 1,
});

// ====================================================
// NORMALIZATION
// ====================================================

paymentSchema.pre('validate', function normalizePayment() {
  if (this.paymentNumber) {
    this.paymentNumber = this.paymentNumber
      .trim()
      .toUpperCase();
  }

  if (this.currency) {
    this.currency = this.currency
      .trim()
      .toUpperCase();
  }

  if (this.paymentMethod) {
    this.paymentMethod = this.paymentMethod
      .trim()
      .toUpperCase();
  }

  if (this.status) {
    this.status = this.status
      .trim()
      .toUpperCase();
  }
});

module.exports = mongoose.model('Payment', paymentSchema);