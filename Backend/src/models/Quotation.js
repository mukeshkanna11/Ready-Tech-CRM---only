'use strict';

const mongoose = require('mongoose');

const { Schema } = mongoose;

// ============================================================
// CONSTANTS
// ============================================================

const QUOTATION_STATUSES = [
  'DRAFT',
  'SENT',
  'VIEWED',
  'ACCEPTED',
  'REJECTED',
  'EXPIRED',
];

const QUOTATION_CURRENCIES = [
  'INR',
  'USD',
  'EUR',
  'GBP',
  'AED',
  'SAR',
];

// ============================================================
// QUOTATION ITEM SCHEMA
// ============================================================

const quotationItemSchema = new Schema(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      index: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: [
        2000,
        'Item description cannot exceed 2000 characters',
      ],
      default: '',
    },

    quantity: {
      type: Number,
      required: true,
      min: [0.01, 'Quantity must be greater than 0'],
      default: 1,
    },

    unitPrice: {
      type: Number,
      required: true,
      min: [0, 'Unit price cannot be negative'],
      default: 0,
    },

    taxRate: {
      type: Number,
      min: [0, 'Tax rate cannot be negative'],
      max: [100, 'Tax rate cannot exceed 100'],
      default: 0,
    },

    discountRate: {
      type: Number,
      min: [0, 'Discount rate cannot be negative'],
      max: [100, 'Discount rate cannot exceed 100'],
      default: 0,
    },

    // Calculated values
    lineSubtotal: {
      type: Number,
      min: [0, 'Line subtotal cannot be negative'],
      default: 0,
    },

    discountAmount: {
      type: Number,
      min: [0, 'Discount amount cannot be negative'],
      default: 0,
    },

    taxableAmount: {
      type: Number,
      min: [0, 'Taxable amount cannot be negative'],
      default: 0,
    },

    taxAmount: {
      type: Number,
      min: [0, 'Tax amount cannot be negative'],
      default: 0,
    },

    lineTotal: {
      type: Number,
      min: [0, 'Line total cannot be negative'],
      default: 0,
    },
  },
  {
    _id: true,
  }
);

// ============================================================
// MAIN QUOTATION SCHEMA
// ============================================================

const quotationSchema = new Schema(
  {
    // --------------------------------------------------------
    // IDENTIFICATION
    // --------------------------------------------------------

    quotationNumber: {
      type: String,
      required: [true, 'Quotation number is required'],
      unique: true,
      index: true,
      trim: true,
      uppercase: true,
      maxlength: 50,
    },

    // --------------------------------------------------------
    // RELATIONSHIPS
    // --------------------------------------------------------

    company: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      index: true,
    },

    contact: {
      type: Schema.Types.ObjectId,
      ref: 'Contact',
      index: true,
    },

    opportunity: {
      type: Schema.Types.ObjectId,
      ref: 'Opportunity',
      index: true,
    },

    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },

    // --------------------------------------------------------
    // DATES
    // --------------------------------------------------------

    issueDate: {
      type: Date,
      default: Date.now,
      index: true,
    },

    validUntil: {
      type: Date,
      index: true,
    },

    sentAt: {
      type: Date,
      index: true,
    },

    viewedAt: {
      type: Date,
      index: true,
    },

    acceptedAt: {
      type: Date,
      index: true,
    },

    rejectedAt: {
      type: Date,
      index: true,
    },

    expiredAt: {
      type: Date,
      index: true,
    },

    // --------------------------------------------------------
    // COMMERCIAL
    // --------------------------------------------------------

    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: 'INR',
      enum: {
        values: QUOTATION_CURRENCIES,
        message: 'Invalid quotation currency',
      },
    },

    items: {
      type: [quotationItemSchema],
      default: [],
      validate: {
        validator: function (items) {
          return Array.isArray(items) && items.length > 0;
        },
        message: 'At least one quotation item is required',
      },
    },

    subtotal: {
      type: Number,
      min: [0, 'Subtotal cannot be negative'],
      default: 0,
    },

    taxTotal: {
      type: Number,
      min: [0, 'Tax total cannot be negative'],
      default: 0,
    },

    discountTotal: {
      type: Number,
      min: [0, 'Discount total cannot be negative'],
      default: 0,
    },

    grandTotal: {
      type: Number,
      min: [0, 'Grand total cannot be negative'],
      default: 0,
      index: true,
    },

    // --------------------------------------------------------
    // STATUS
    // --------------------------------------------------------

    status: {
      type: String,
      enum: {
        values: QUOTATION_STATUSES,
        message: 'Invalid quotation status',
      },
      default: 'DRAFT',
      index: true,
    },

    // --------------------------------------------------------
    // NOTES / TERMS
    // --------------------------------------------------------

    notes: {
      type: String,
      trim: true,
      maxlength: [
        5000,
        'Notes cannot exceed 5000 characters',
      ],
      default: '',
    },

    termsAndConditions: {
      type: String,
      trim: true,
      maxlength: [
        10000,
        'Terms and conditions cannot exceed 10000 characters',
      ],
      default: '',
    },

    customerNotes: {
      type: String,
      trim: true,
      maxlength: [
        5000,
        'Customer notes cannot exceed 5000 characters',
      ],
      default: '',
    },

    internalNotes: {
      type: String,
      trim: true,
      maxlength: [
        5000,
        'Internal notes cannot exceed 5000 characters',
      ],
      default: '',
    },

    // --------------------------------------------------------
    // OPTIONAL ADDRESS / SHIPPING INFORMATION
    // --------------------------------------------------------

    billingAddress: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: '',
    },

    shippingAddress: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: '',
    },

    // --------------------------------------------------------
    // TAGS
    // --------------------------------------------------------

    tags: {
      type: [
        {
          type: String,
          trim: true,
          maxlength: 50,
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ============================================================
// INDEXES
// ============================================================

quotationSchema.index({
  quotationNumber: 1,
});

quotationSchema.index({
  company: 1,
  status: 1,
});

quotationSchema.index({
  contact: 1,
  status: 1,
});

quotationSchema.index({
  opportunity: 1,
});

quotationSchema.index({
  owner: 1,
  status: 1,
});

quotationSchema.index({
  status: 1,
  validUntil: 1,
});

quotationSchema.index({
  issueDate: -1,
});

quotationSchema.index({
  grandTotal: -1,
});

quotationSchema.index({
  createdAt: -1,
});

quotationSchema.index({
  quotationNumber: 'text',
  notes: 'text',
  customerNotes: 'text',
  internalNotes: 'text',
});

// ============================================================
// CALCULATE TOTALS METHOD
// ============================================================

quotationSchema.methods.calculateTotals = function () {
  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;

  if (!Array.isArray(this.items)) {
    this.subtotal = 0;
    this.discountTotal = 0;
    this.taxTotal = 0;
    this.grandTotal = 0;
    return 0;
  }

  this.items.forEach((item) => {
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.unitPrice || 0);
    const discountRate = Number(item.discountRate || 0);
    const taxRate = Number(item.taxRate || 0);

    // Gross line value
    const lineSubtotal = quantity * unitPrice;

    // Discount
    const discountAmount =
      lineSubtotal * (discountRate / 100);

    // After discount
    const taxableAmount =
      lineSubtotal - discountAmount;

    // Tax
    const taxAmount =
      taxableAmount * (taxRate / 100);

    // Final line total
    const lineTotal =
      taxableAmount + taxAmount;

    item.lineSubtotal = Number(
      lineSubtotal.toFixed(2)
    );

    item.discountAmount = Number(
      discountAmount.toFixed(2)
    );

    item.taxableAmount = Number(
      taxableAmount.toFixed(2)
    );

    item.taxAmount = Number(
      taxAmount.toFixed(2)
    );

    item.lineTotal = Number(
      lineTotal.toFixed(2)
    );

    subtotal += lineSubtotal;
    discountTotal += discountAmount;
    taxTotal += taxAmount;
  });

  this.subtotal = Number(
    subtotal.toFixed(2)
  );

  this.discountTotal = Number(
    discountTotal.toFixed(2)
  );

  this.taxTotal = Number(
    taxTotal.toFixed(2)
  );

  this.grandTotal = Number(
    (subtotal - discountTotal + taxTotal).toFixed(2)
  );

  return this.grandTotal;
};

// ============================================================
// PRE VALIDATE
// ============================================================

quotationSchema.pre(
  'validate',
  function () {
    // Calculate quotation totals
    this.calculateTotals();

    // Normalize quotation number
    if (this.quotationNumber) {
      this.quotationNumber =
        String(this.quotationNumber)
          .trim()
          .toUpperCase();
    }

    // Normalize currency
    if (this.currency) {
      this.currency =
        String(this.currency)
          .trim()
          .toUpperCase();
    }

    // --------------------------------------------------------
    // Status date handling
    // --------------------------------------------------------

    if (this.status === 'SENT') {
      if (!this.sentAt) {
        this.sentAt = new Date();
      }
    }

    if (this.status === 'VIEWED') {
      if (!this.viewedAt) {
        this.viewedAt = new Date();
      }

      if (!this.sentAt) {
        this.sentAt = new Date();
      }
    }

    if (this.status === 'ACCEPTED') {
      if (!this.acceptedAt) {
        this.acceptedAt = new Date();
      }

      if (!this.sentAt) {
        this.sentAt = new Date();
      }
    }

    if (this.status === 'REJECTED') {
      if (!this.rejectedAt) {
        this.rejectedAt = new Date();
      }

      if (!this.sentAt) {
        this.sentAt = new Date();
      }
    }

    // --------------------------------------------------------
    // Expiry handling
    // --------------------------------------------------------

    if (
      this.validUntil &&
      this.status !== 'ACCEPTED' &&
      this.status !== 'REJECTED'
    ) {
      const today = new Date();

      if (this.validUntil < today) {
        this.status = 'EXPIRED';

        if (!this.expiredAt) {
          this.expiredAt = new Date();
        }
      }
    }
  }
);

// ============================================================
// JSON / OBJECT
// ============================================================

quotationSchema.set('toJSON', {
  virtuals: true,
});

quotationSchema.set('toObject', {
  virtuals: true,
});

// ============================================================
// MODEL
// ============================================================

const Quotation = mongoose.model(
  'Quotation',
  quotationSchema
);

// ============================================================
// EXPORTS
// ============================================================

module.exports = Quotation;

module.exports.QUOTATION_STATUSES =
  QUOTATION_STATUSES;

module.exports.QUOTATION_CURRENCIES =
  QUOTATION_CURRENCIES;