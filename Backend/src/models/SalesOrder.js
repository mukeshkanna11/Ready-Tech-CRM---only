'use strict';

const mongoose = require('mongoose');

// ======================================================
// CONSTANTS
// ======================================================

const SALES_ORDER_STATUSES = [
  'DRAFT',
  'CONFIRMED',
  'PROCESSING',
  'COMPLETED',
  'CANCELLED',
];

const SALES_ORDER_CURRENCIES = [
  'INR',
  'USD',
  'EUR',
  'GBP',
  'AED',
  'SAR',
];

const PAYMENT_STATUSES = [
  'UNPAID',
  'PARTIAL',
  'PAID',
];

const PAYMENT_TERMS = [
  'DUE_ON_RECEIPT',
  'NET_7',
  'NET_15',
  'NET_30',
  'NET_45',
  'NET_60',
  'NET_90',
  'CUSTOM',
];

// ======================================================
// ITEM SCHEMA
// ======================================================

const salesOrderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },

    quantity: {
      type: Number,
      required: true,
      min: 0.01,
      default: 1,
    },

    unitPrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    taxRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    discountRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    // Calculated fields
    lineSubtotal: {
      type: Number,
      min: 0,
      default: 0,
    },

    discountAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    taxableAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    taxAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    lineTotal: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  {
    _id: true,
    versionKey: false,
  }
);

// ======================================================
// MAIN SALES ORDER SCHEMA
// ======================================================

const salesOrderSchema = new mongoose.Schema(
  {
    // --------------------------------------------------
    // ORDER IDENTIFICATION
    // --------------------------------------------------

    salesOrderNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: 100,
      index: true,
    },

    // --------------------------------------------------
    // SOURCE RELATIONSHIPS
    // --------------------------------------------------

    quotation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quotation',
      index: true,
    },

    opportunity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Opportunity',
      index: true,
    },

    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      index: true,
    },

    contact: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contact',
      index: true,
    },

    // --------------------------------------------------
    // OWNERSHIP / AUDIT
    // --------------------------------------------------

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // --------------------------------------------------
    // ORDER DATES
    // --------------------------------------------------

    orderDate: {
      type: Date,
      default: Date.now,
      index: true,
    },

    expectedDeliveryDate: {
      type: Date,
      index: true,
    },

    actualDeliveryDate: {
      type: Date,
    },

    confirmedAt: {
      type: Date,
    },

    processingAt: {
      type: Date,
    },

    completedAt: {
      type: Date,
    },

    cancelledAt: {
      type: Date,
    },

    // --------------------------------------------------
    // CURRENCY
    // --------------------------------------------------

    currency: {
      type: String,
      enum: SALES_ORDER_CURRENCIES,
      default: 'INR',
      uppercase: true,
      trim: true,
      index: true,
    },

    // --------------------------------------------------
    // PRODUCTS / ITEMS
    // --------------------------------------------------

    items: {
      type: [salesOrderItemSchema],
      required: true,
      validate: {
        validator: function (items) {
          return Array.isArray(items) && items.length > 0;
        },
        message: 'Sales order must contain at least one item.',
      },
    },

    // --------------------------------------------------
    // TOTALS
    // --------------------------------------------------

    subtotal: {
      type: Number,
      min: 0,
      default: 0,
    },

    discountTotal: {
      type: Number,
      min: 0,
      default: 0,
    },

    taxTotal: {
      type: Number,
      min: 0,
      default: 0,
    },

    grandTotal: {
      type: Number,
      min: 0,
      default: 0,
      index: true,
    },

    // --------------------------------------------------
    // ORDER STATUS
    // --------------------------------------------------

    status: {
      type: String,
      enum: SALES_ORDER_STATUSES,
      default: 'DRAFT',
      index: true,
    },

    cancellationReason: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },

    completionNotes: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },

    // --------------------------------------------------
    // PAYMENT
    // --------------------------------------------------

    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: 'UNPAID',
      index: true,
    },

    paymentTerms: {
      type: String,
      enum: PAYMENT_TERMS,
      default: 'DUE_ON_RECEIPT',
    },

    customPaymentTerms: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },

    amountPaid: {
      type: Number,
      min: 0,
      default: 0,
    },

    balanceDue: {
      type: Number,
      min: 0,
      default: 0,
    },

    // --------------------------------------------------
    // DELIVERY
    // --------------------------------------------------

    deliveryTerms: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },

    shippingMethod: {
      type: String,
      trim: true,
      maxlength: 200,
      default: '',
    },

    // --------------------------------------------------
    // ADDRESSES
    // --------------------------------------------------

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

    // --------------------------------------------------
    // NOTES
    // --------------------------------------------------

    customerNotes: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: '',
    },

    internalNotes: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: '',
    },

    termsAndConditions: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: '',
    },

    // --------------------------------------------------
    // TAGS
    // --------------------------------------------------

    tags: {
      type: [String],
      default: [],
      validate: {
        validator: function (tags) {
          return Array.isArray(tags) && tags.length <= 30;
        },
        message: 'Maximum 30 tags are allowed.',
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
    },
    toObject: {
      virtuals: true,
    },
  }
);

// ======================================================
// INDEXES
// ======================================================

salesOrderSchema.index({
  company: 1,
  status: 1,
});

salesOrderSchema.index({
  contact: 1,
  status: 1,
});

salesOrderSchema.index({
  opportunity: 1,
});

salesOrderSchema.index({
  quotation: 1,
});

salesOrderSchema.index({
  owner: 1,
  status: 1,
});

salesOrderSchema.index({
  paymentStatus: 1,
});

salesOrderSchema.index({
  orderDate: -1,
});

salesOrderSchema.index({
  expectedDeliveryDate: 1,
});

salesOrderSchema.index({
  grandTotal: -1,
});

salesOrderSchema.index({
  createdAt: -1,
});

// Search index
salesOrderSchema.index({
  salesOrderNumber: 'text',
  customerNotes: 'text',
  internalNotes: 'text',
  shippingMethod: 'text',
});

// ======================================================
// VIRTUALS
// ======================================================

salesOrderSchema.virtual('itemCount').get(function () {
  return Array.isArray(this.items) ? this.items.length : 0;
});

salesOrderSchema.virtual('totalQuantity').get(function () {
  if (!Array.isArray(this.items)) {
    return 0;
  }

  return this.items.reduce((total, item) => {
    return total + Number(item.quantity || 0);
  }, 0);
});

salesOrderSchema.virtual('isPaid').get(function () {
  return this.paymentStatus === 'PAID';
});

salesOrderSchema.virtual('isCancelled').get(function () {
  return this.status === 'CANCELLED';
});

salesOrderSchema.virtual('isCompleted').get(function () {
  return this.status === 'COMPLETED';
});

// ======================================================
// CALCULATE ITEM TOTALS
// ======================================================

salesOrderSchema.methods.calculateTotals = function () {
  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;

  this.items.forEach((item) => {
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.unitPrice || 0);

    const taxRate = Number(item.taxRate || 0);
    const discountRate = Number(item.discountRate || 0);

    // Base line subtotal
    const lineSubtotal = quantity * unitPrice;

    // Discount
    const discountAmount =
      lineSubtotal * (discountRate / 100);

    // Taxable amount
    const taxableAmount =
      lineSubtotal - discountAmount;

    // Tax
    const taxAmount =
      taxableAmount * (taxRate / 100);

    // Final line total
    const lineTotal =
      taxableAmount + taxAmount;

    item.lineSubtotal = Number(lineSubtotal.toFixed(2));
    item.discountAmount = Number(discountAmount.toFixed(2));
    item.taxableAmount = Number(taxableAmount.toFixed(2));
    item.taxAmount = Number(taxAmount.toFixed(2));
    item.lineTotal = Number(lineTotal.toFixed(2));

    subtotal += lineSubtotal;
    discountTotal += discountAmount;
    taxTotal += taxAmount;
  });

  this.subtotal = Number(subtotal.toFixed(2));
  this.discountTotal = Number(discountTotal.toFixed(2));
  this.taxTotal = Number(taxTotal.toFixed(2));
  this.grandTotal = Number(
    (subtotal - discountTotal + taxTotal).toFixed(2)
  );

  // Keep balance consistent
  const paid = Number(this.amountPaid || 0);

  this.balanceDue = Number(
    Math.max(this.grandTotal - paid, 0).toFixed(2)
  );

  // Automatically derive payment status
  if (paid <= 0) {
    this.paymentStatus = 'UNPAID';
  } else if (paid >= this.grandTotal) {
    this.paymentStatus = 'PAID';
  } else {
    this.paymentStatus = 'PARTIAL';
  }

  return this;
};

// ======================================================
// STATUS TIMESTAMP MANAGEMENT
// ======================================================

salesOrderSchema.methods.updateStatusTimestamps = function () {
  const now = new Date();

  if (this.status === 'CONFIRMED' && !this.confirmedAt) {
    this.confirmedAt = now;
  }

  if (this.status === 'PROCESSING' && !this.processingAt) {
    this.processingAt = now;
  }

  if (this.status === 'COMPLETED' && !this.completedAt) {
    this.completedAt = now;

    if (!this.actualDeliveryDate) {
      this.actualDeliveryDate = now;
    }
  }

  if (this.status === 'CANCELLED' && !this.cancelledAt) {
    this.cancelledAt = now;
  }

  return this;
};

// ======================================================
// PRE VALIDATE
// ======================================================

salesOrderSchema.pre('validate', function () {
  // Normalize
  if (this.salesOrderNumber) {
    this.salesOrderNumber =
      String(this.salesOrderNumber).trim().toUpperCase();
  }

  if (this.currency) {
    this.currency =
      String(this.currency).trim().toUpperCase();
  }

  // Calculate totals
  if (Array.isArray(this.items) && this.items.length > 0) {
    this.calculateTotals();
  }

  // Normalize amount paid
  if (this.amountPaid < 0) {
    this.amountPaid = 0;
  }

  // Never allow paid amount above grand total
  if (this.amountPaid > this.grandTotal) {
    this.amountPaid = this.grandTotal;
  }

  // Recalculate balance
  this.balanceDue = Number(
    Math.max(
      Number(this.grandTotal || 0) -
        Number(this.amountPaid || 0),
      0
    ).toFixed(2)
  );

  // Payment status
  if (this.amountPaid <= 0) {
    this.paymentStatus = 'UNPAID';
  } else if (this.amountPaid >= this.grandTotal) {
    this.paymentStatus = 'PAID';
  } else {
    this.paymentStatus = 'PARTIAL';
  }

  // Status timestamps
  this.updateStatusTimestamps();
});

// ======================================================
// EXPORT
// ======================================================

module.exports = mongoose.model(
  'SalesOrder',
  salesOrderSchema
);

module.exports.SALES_ORDER_STATUSES =
  SALES_ORDER_STATUSES;

module.exports.SALES_ORDER_CURRENCIES =
  SALES_ORDER_CURRENCIES;

module.exports.PAYMENT_STATUSES =
  PAYMENT_STATUSES;

module.exports.PAYMENT_TERMS =
  PAYMENT_TERMS;