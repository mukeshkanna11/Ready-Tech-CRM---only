'use strict';

const mongoose = require('mongoose');

const { Schema } = mongoose;

// ======================================================
// OPPORTUNITY CONSTANTS
// ======================================================

const OPPORTUNITY_STAGES = [
  'QUALIFICATION',
  'DISCOVERY',
  'PROPOSAL',
  'NEGOTIATION',
  'CLOSED_WON',
  'CLOSED_LOST',
];

const OPPORTUNITY_PRIORITIES = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT',
];

const OPPORTUNITY_STATUS = [
  'OPEN',
  'WON',
  'LOST',
];

const OPPORTUNITY_SOURCES = [
  'WEBSITE',
  'REFERRAL',
  'EMAIL',
  'PHONE',
  'SOCIAL_MEDIA',
  'CAMPAIGN',
  'ADVERTISEMENT',
  'PARTNER',
  'EXISTING_CUSTOMER',
  'LEAD',
  'OTHER',
];

// ======================================================
// PRODUCT SUB-SCHEMA
// ======================================================

const opportunityProductSchema = new Schema(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product is required'],
    },

    quantity: {
      type: Number,
      min: [1, 'Quantity must be at least 1'],
      default: 1,
    },

    price: {
      type: Number,
      min: [0, 'Price cannot be negative'],
      default: 0,
    },

    discount: {
      type: Number,
      min: [0, 'Discount cannot be negative'],
      max: [100, 'Discount cannot exceed 100'],
      default: 0,
    },

    tax: {
      type: Number,
      min: [0, 'Tax cannot be negative'],
      default: 0,
    },

    total: {
      type: Number,
      min: [0, 'Total cannot be negative'],
      default: 0,
    },
  },
  {
    _id: true,
  }
);

// ======================================================
// OPPORTUNITY SCHEMA
// ======================================================

const opportunitySchema = new Schema(
  {
    // --------------------------------------------------
    // BASIC INFORMATION
    // --------------------------------------------------

    name: {
      type: String,
      required: [true, 'Opportunity name is required'],
      trim: true,
      minlength: [2, 'Opportunity name must be at least 2 characters'],
      maxlength: [200, 'Opportunity name cannot exceed 200 characters'],
      index: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
      default: '',
    },

    // --------------------------------------------------
    // CRM RELATIONSHIPS
    // --------------------------------------------------

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

    lead: {
      type: Schema.Types.ObjectId,
      ref: 'Lead',
      index: true,
    },

    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },

    // --------------------------------------------------
    // DEAL VALUE
    // --------------------------------------------------

    value: {
      type: Number,
      min: [0, 'Opportunity value cannot be negative'],
      default: 0,
    },

    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: 'INR',
      minlength: 3,
      maxlength: 3,
    },

    // --------------------------------------------------
    // PIPELINE
    // --------------------------------------------------

    stage: {
      type: String,
      enum: {
        values: OPPORTUNITY_STAGES,
        message: 'Invalid opportunity stage',
      },
      default: 'QUALIFICATION',
      index: true,
    },

    status: {
      type: String,
      enum: {
        values: OPPORTUNITY_STATUS,
        message: 'Invalid opportunity status',
      },
      default: 'OPEN',
      index: true,
    },

    probability: {
      type: Number,
      min: [0, 'Probability cannot be below 0'],
      max: [100, 'Probability cannot exceed 100'],
      default: 10,
    },

    // --------------------------------------------------
    // FORECASTING
    // --------------------------------------------------

    expectedRevenue: {
      type: Number,
      min: [0, 'Expected revenue cannot be negative'],
      default: 0,
    },

    expectedCloseDate: {
      type: Date,
      index: true,
    },

    actualCloseDate: {
      type: Date,
      index: true,
    },

    // --------------------------------------------------
    // PRIORITY
    // --------------------------------------------------

    priority: {
      type: String,
      enum: {
        values: OPPORTUNITY_PRIORITIES,
        message: 'Invalid opportunity priority',
      },
      default: 'MEDIUM',
      index: true,
    },

    // --------------------------------------------------
    // SOURCE
    // --------------------------------------------------

    source: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 100,
    },

    sourceType: {
      type: String,
      enum: {
        values: OPPORTUNITY_SOURCES,
        message: 'Invalid opportunity source type',
      },
      default: 'OTHER',
      index: true,
    },

    // --------------------------------------------------
    // PRODUCTS
    // --------------------------------------------------

    products: {
      type: [opportunityProductSchema],
      default: [],
    },

    // --------------------------------------------------
    // FOLLOW-UP
    // --------------------------------------------------

    nextFollowUpDate: {
      type: Date,
      index: true,
    },

    lastContactedAt: {
      type: Date,
      index: true,
    },

    // --------------------------------------------------
    // LOST / WON INFORMATION
    // --------------------------------------------------

    lostReason: {
      type: String,
      trim: true,
      maxlength: [1000, 'Lost reason cannot exceed 1000 characters'],
      default: '',
    },

    wonReason: {
      type: String,
      trim: true,
      maxlength: [1000, 'Won reason cannot exceed 1000 characters'],
      default: '',
    },

    // --------------------------------------------------
    // TAGS
    // --------------------------------------------------

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

    // --------------------------------------------------
    // NOTES
    // --------------------------------------------------

    notes: {
      type: String,
      trim: true,
      maxlength: [5000, 'Notes cannot exceed 5000 characters'],
      default: '',
    },

    // --------------------------------------------------
    // AUDIT INFORMATION
    // --------------------------------------------------

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
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

// Text search
opportunitySchema.index({
  name: 'text',
  description: 'text',
  notes: 'text',
});

// Owner + stage
opportunitySchema.index({
  owner: 1,
  stage: 1,
});

// Company + stage
opportunitySchema.index({
  company: 1,
  stage: 1,
});

// Status + expected close date
opportunitySchema.index({
  status: 1,
  expectedCloseDate: 1,
});

// Created date
opportunitySchema.index({
  createdAt: -1,
});

// Priority + status
opportunitySchema.index({
  priority: 1,
  status: 1,
});

// Follow-up
opportunitySchema.index({
  nextFollowUpDate: 1,
  status: 1,
});

// Source analytics
opportunitySchema.index({
  sourceType: 1,
  createdAt: -1,
});

// ======================================================
// VIRTUALS
// ======================================================

// ------------------------------------------------------
// Weighted pipeline value
// ------------------------------------------------------

opportunitySchema.virtual('weightedValue').get(function () {
  const value = Number(this.value || 0);
  const probability = Number(this.probability || 0);

  return Number(
    ((value * probability) / 100).toFixed(2)
  );
});

// ------------------------------------------------------
// Product subtotal
// ------------------------------------------------------

opportunitySchema.virtual('productTotal').get(function () {
  if (!Array.isArray(this.products)) {
    return 0;
  }

  return Number(
    this.products
      .reduce((total, item) => {
        return total + Number(item.total || 0);
      }, 0)
      .toFixed(2)
  );
});

// ======================================================
// PRODUCT TOTAL CALCULATION
// ======================================================

opportunitySchema.methods.calculateProductTotal = function () {
  if (!Array.isArray(this.products)) {
    return 0;
  }

  let grandTotal = 0;

  this.products.forEach((item) => {
    const quantity = Number(item.quantity || 0);
    const price = Number(item.price || 0);
    const discount = Number(item.discount || 0);
    const tax = Number(item.tax || 0);

    // Gross amount
    const gross = quantity * price;

    // Discount
    const discountAmount =
      gross * (discount / 100);

    // Amount after discount
    const taxableAmount =
      gross - discountAmount;

    // Tax
    const taxAmount =
      taxableAmount * (tax / 100);

    // Final item total
    const itemTotal =
      taxableAmount + taxAmount;

    item.total = Number(
      itemTotal.toFixed(2)
    );

    grandTotal += itemTotal;
  });

  return Number(
    grandTotal.toFixed(2)
  );
};

// ======================================================
// PRE VALIDATION
// ======================================================

opportunitySchema.pre(
  'validate',
  function () {
    // --------------------------------------------------
    // NORMALIZE NUMERIC VALUES
    // --------------------------------------------------

    const value = Number(this.value || 0);

    let probability = Number(
      this.probability || 0
    );

    // --------------------------------------------------
    // STAGE → STATUS SYNCHRONIZATION
    // --------------------------------------------------

    if (this.stage === 'CLOSED_WON') {
      this.status = 'WON';

      // Won opportunities always have 100% probability
      probability = 100;
      this.probability = 100;

      // Set actual close date automatically
      if (!this.actualCloseDate) {
        this.actualCloseDate = new Date();
      }
    }

    else if (this.stage === 'CLOSED_LOST') {
      this.status = 'LOST';

      // Lost opportunities always have 0% probability
      probability = 0;
      this.probability = 0;

      // Set actual close date automatically
      if (!this.actualCloseDate) {
        this.actualCloseDate = new Date();
      }
    }

    else {
      // Every non-closed opportunity is OPEN
      this.status = 'OPEN';

      // Active opportunity should not have actual close date
      this.actualCloseDate = undefined;
    }

    // --------------------------------------------------
    // EXPECTED REVENUE
    // --------------------------------------------------

    this.expectedRevenue = Number(
      (
        value *
        (probability / 100)
      ).toFixed(2)
    );

    // --------------------------------------------------
    // PRODUCT TOTALS
    // --------------------------------------------------

    if (Array.isArray(this.products)) {
      this.calculateProductTotal();
    }

    // --------------------------------------------------
    // WON / LOST REASON CLEANUP
    // --------------------------------------------------

    if (this.stage === 'CLOSED_WON') {
      this.lostReason = '';
    }

    else if (this.stage === 'CLOSED_LOST') {
      this.wonReason = '';
    }

    else {
      this.wonReason = '';
      this.lostReason = '';
    }

    // --------------------------------------------------
    // CLOSE DATE CLEANUP
    // --------------------------------------------------

    if (
      this.stage !== 'CLOSED_WON' &&
      this.stage !== 'CLOSED_LOST'
    ) {
      this.actualCloseDate = undefined;
    }
  }
);

// ======================================================
// JSON OUTPUT
// ======================================================

opportunitySchema.set(
  'toJSON',
  {
    virtuals: true,
  }
);

opportunitySchema.set(
  'toObject',
  {
    virtuals: true,
  }
);

// ======================================================
// MODEL
// ======================================================

const Opportunity = mongoose.model(
  'Opportunity',
  opportunitySchema
);

// ======================================================
// EXPORT MODEL
// ======================================================

module.exports = Opportunity;

// ======================================================
// EXPORT ENUMS
// ======================================================

module.exports.OPPORTUNITY_STAGES =
  OPPORTUNITY_STAGES;

module.exports.OPPORTUNITY_PRIORITIES =
  OPPORTUNITY_PRIORITIES;

module.exports.OPPORTUNITY_STATUS =
  OPPORTUNITY_STATUS;

module.exports.OPPORTUNITY_SOURCES =
  OPPORTUNITY_SOURCES;