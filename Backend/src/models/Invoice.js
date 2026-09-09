const mongoose = require('mongoose');

// ======================================================
// INVOICE SCHEMA
// CRM / ERP SALES INVOICE
// ======================================================

const invoiceItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
    },

    description: {
      type: String,
      trim: true,
      default: '',
    },

    // HSN / SAC - GST ready
    hsnSac: {
      type: String,
      trim: true,
      default: '',
    },

    quantity: {
      type: Number,
      min: 0.001,
      default: 1,
    },

    unit: {
      type: String,
      trim: true,
      default: 'PCS',
    },

    unitPrice: {
      type: Number,
      min: 0,
      default: 0,
    },

    // Item level discount percentage
    discountRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    // Item level discount amount
    discountAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    // GST percentage
    taxRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    // Calculated taxable amount
    taxableAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    // Calculated tax amount
    taxAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    // Final item total
    total: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  {
    _id: true,
  }
);

// ======================================================
// MAIN INVOICE SCHEMA
// ======================================================

const invoiceSchema = new mongoose.Schema(
  {
    // ====================================================
    // INVOICE IDENTIFICATION
    // ====================================================

    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: 16,
      index: true,
    },

    quotation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quotation',
      default: null,
      index: true,
    },

    salesOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SalesOrder',
      default: null,
      index: true,
    },

    // ====================================================
    // CRM RELATIONSHIPS
    // ====================================================

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

    // ====================================================
    // AD-HOC CLIENT SNAPSHOT
    // ====================================================
    //
    // Set only for invoices raised against a new client
    // that is not in the CRM. Stays null for the normal
    // company/contact flow.
    //
    // ====================================================

    billTo: {
      type: {
        name: { type: String, trim: true },
        email: { type: String, trim: true, lowercase: true },
        phone: { type: String, trim: true },
        gstin: { type: String, trim: true, uppercase: true },
        billingAddress: { type: String, trim: true },
        shippingAddress: { type: String, trim: true },
        city: { type: String, trim: true },
        state: { type: String, trim: true },
        country: { type: String, trim: true },
        postalCode: { type: String, trim: true },
      },
      default: null,
      _id: false,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    // ====================================================
    // DATES
    // ====================================================

    issueDate: {
      type: Date,
      default: Date.now,
      index: true,
    },

    dueDate: {
      type: Date,
      default: null,
      index: true,
    },

    // ====================================================
    // CURRENCY
    // ====================================================

    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: 'INR',
      maxlength: 3,
    },

    // ====================================================
    // BILLING / GST DETAILS
    // ====================================================

    placeOfSupply: {
      type: String,
      trim: true,
      default: '',
    },

    reverseCharge: {
      type: Boolean,
      default: false,
    },

    // Drives the GST split:
    // CGST_SGST -> intra-state (tax split in half)
    // IGST      -> inter-state (full tax as IGST)
    taxMode: {
      type: String,
      enum: ['CGST_SGST', 'IGST'],
      default: 'CGST_SGST',
    },

    // ====================================================
    // INVOICE ITEMS
    // ====================================================

    items: {
      type: [invoiceItemSchema],
      default: [],
    },

    // ====================================================
    // AMOUNTS
    // ====================================================

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

    taxableTotal: {
      type: Number,
      min: 0,
      default: 0,
    },

    taxTotal: {
      type: Number,
      min: 0,
      default: 0,
    },

    // Optional GST breakup
    cgstTotal: {
      type: Number,
      min: 0,
      default: 0,
    },

    sgstTotal: {
      type: Number,
      min: 0,
      default: 0,
    },

    igstTotal: {
      type: Number,
      min: 0,
      default: 0,
    },

    grandTotal: {
      type: Number,
      min: 0,
      default: 0,
    },

    // ====================================================
    // PAYMENT
    // ====================================================

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

    // ====================================================
    // STATUS
    // ====================================================

    status: {
      type: String,
      enum: [
        'DRAFT',
        'SENT',
        'PARTIALLY_PAID',
        'PAID',
        'OVERDUE',
        'CANCELLED',
      ],
      default: 'DRAFT',
      index: true,
    },

    // ====================================================
    // NOTES
    // ====================================================

    notes: {
      type: String,
      trim: true,
      default: '',
    },

    termsAndConditions: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: '',
    },

    cancellationReason: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ======================================================
// INDEXES
// ======================================================

invoiceSchema.index({
  company: 1,
  status: 1,
  createdAt: -1,
});

invoiceSchema.index({
  owner: 1,
  status: 1,
  createdAt: -1,
});

invoiceSchema.index({
  issueDate: -1,
});

invoiceSchema.index({
  dueDate: 1,
  status: 1,
});

// ======================================================
// NORMALIZATION
// ======================================================

// Runs on pre('validate') - like Lead and SalesOrder -
// so the derived values are corrected before the
// schema validators see them.
invoiceSchema.pre('validate', function normalizeInvoice() {
  if (this.invoiceNumber) {
    this.invoiceNumber = this.invoiceNumber
      .trim()
      .toUpperCase();
  }

  if (this.currency) {
    this.currency = this.currency
      .trim()
      .toUpperCase();
  }

  if (this.amountPaid > this.grandTotal) {
    this.amountPaid = this.grandTotal;
  }

  this.balanceDue = Math.max(
    0,
    this.grandTotal - this.amountPaid
  );
});

module.exports = mongoose.model('Invoice', invoiceSchema);