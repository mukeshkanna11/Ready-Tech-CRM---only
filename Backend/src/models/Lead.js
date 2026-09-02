'use strict';

const mongoose = require('mongoose');

// ======================================================
// LEAD SCHEMA
// CRM SALES LEAD
// ======================================================

const leadSchema = new mongoose.Schema(
  {
    // ==================================================
    // BASIC LEAD INFORMATION
    // ==================================================

    name: {
      type: String,
      required: [true, 'Lead name is required'],
      trim: true,
      minlength: [2, 'Lead name must be at least 2 characters'],
      maxlength: [200, 'Lead name cannot exceed 200 characters'],
      index: true,
    },

    designation: {
      type: String,
      trim: true,
      default: '',
      maxlength: [150, 'Designation cannot exceed 150 characters'],
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: '',
      maxlength: [254, 'Email cannot exceed 254 characters'],
      index: true,
    },

    phone: {
      type: String,
      trim: true,
      default: '',
      maxlength: [30, 'Phone cannot exceed 30 characters'],
    },

    alternatePhone: {
      type: String,
      trim: true,
      default: '',
      maxlength: [30, 'Alternate phone cannot exceed 30 characters'],
    },

    // ==================================================
    // COMPANY INFORMATION
    // ==================================================

    companyName: {
      type: String,
      trim: true,
      default: '',
      maxlength: [200, 'Company name cannot exceed 200 characters'],
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

    // ==================================================
    // BUSINESS / TAX INFORMATION
    // ==================================================
    //
    // These fields are stored only as customer/business
    // identification details.
    //
    // No GST calculation is performed in Lead model.
    //
    // ==================================================

    gstin: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
      maxlength: [15, 'GSTIN cannot exceed 15 characters'],
      index: true,
      validate: {
        validator: function validateGSTIN(value) {
          if (!value) return true;

          // Standard Indian GSTIN format
          return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i.test(
            value
          );
        },
        message: 'Invalid GSTIN format',
      },
    },

    panNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
      maxlength: [10, 'PAN number cannot exceed 10 characters'],
      index: true,
      validate: {
        validator: function validatePAN(value) {
          if (!value) return true;

          // Standard Indian PAN format
          return /^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(value);
        },
        message: 'Invalid PAN number format',
      },
    },

    // ==================================================
    // LEAD SOURCE
    // ==================================================

    source: {
      type: String,
      enum: {
        values: [
          'WEBSITE',
          'REFERRAL',
          'SOCIAL_MEDIA',
          'ADVERTISEMENT',
          'EMAIL',
          'PHONE',
          'WALK_IN',
          'IMPORT',
          'OTHER',
        ],
        message: 'Invalid lead source',
      },
      default: 'OTHER',
      index: true,
    },

    // ==================================================
    // LEAD STATUS
    // ==================================================

    status: {
      type: String,
      enum: {
        values: [
          'NEW',
          'CONTACTED',
          'QUALIFIED',
          'PROPOSAL',
          'NEGOTIATION',
          'WON',
          'LOST',
        ],
        message: 'Invalid lead status',
      },
      default: 'NEW',
      index: true,
    },

    // ==================================================
    // ASSIGNMENT
    // ==================================================

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    // ==================================================
    // SALES VALUE
    // ==================================================

    value: {
      type: Number,
      min: [0, 'Lead value cannot be negative'],
      default: 0,
    },

    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: 'INR',
      minlength: [3, 'Currency must be 3 characters'],
      maxlength: [3, 'Currency must be 3 characters'],
    },

    // ==================================================
    // EXPECTED CLOSE
    // ==================================================

    expectedCloseDate: {
      type: Date,
      default: null,
      index: true,
    },

    // ==================================================
    // ADDRESS
    // ==================================================

    address: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Address cannot exceed 500 characters'],
    },

    city: {
      type: String,
      trim: true,
      default: '',
      maxlength: [100, 'City cannot exceed 100 characters'],
      index: true,
    },

    state: {
      type: String,
      trim: true,
      default: '',
      maxlength: [100, 'State cannot exceed 100 characters'],
    },

    country: {
      type: String,
      trim: true,
      default: '',
      maxlength: [100, 'Country cannot exceed 100 characters'],
    },

    postalCode: {
      type: String,
      trim: true,
      default: '',
      maxlength: [20, 'Postal code cannot exceed 20 characters'],
    },

    // ==================================================
    // TAGS
    // ==================================================

    tags: {
      type: [String],
      default: [],
    },

    // ==================================================
    // LOST REASON
    // ==================================================

    lostReason: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Lost reason cannot exceed 500 characters'],
    },

    // ==================================================
    // NOTES
    // ==================================================

    notes: {
      type: String,
      trim: true,
      default: '',
      maxlength: [5000, 'Notes cannot exceed 5000 characters'],
    },

    // ==================================================
    // CONTACT / FOLLOW-UP
    // ==================================================

    lastContactAt: {
      type: Date,
      default: null,
      index: true,
    },

    nextFollowUpAt: {
      type: Date,
      default: null,
      index: true,
    },

    // ==================================================
    // CONVERSION
    // ==================================================

    convertedAt: {
      type: Date,
      default: null,
      index: true,
    },

    convertedOpportunity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Opportunity',
      default: null,
      index: true,
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

// Main lead listing
leadSchema.index({
  status: 1,
  createdAt: -1,
});

// Assigned sales user
leadSchema.index({
  assignedTo: 1,
  status: 1,
  createdAt: -1,
});

// Company-wise leads
leadSchema.index({
  company: 1,
  status: 1,
  createdAt: -1,
});

// Contact-wise leads
leadSchema.index({
  contact: 1,
  createdAt: -1,
});

// Source-wise leads
leadSchema.index({
  source: 1,
  createdAt: -1,
});

// Expected closing
leadSchema.index({
  expectedCloseDate: 1,
  status: 1,
});

// Follow-up
leadSchema.index({
  nextFollowUpAt: 1,
  status: 1,
});

// Email search
leadSchema.index({
  email: 1,
});

// Company name search
leadSchema.index({
  companyName: 1,
  createdAt: -1,
});

// City search
leadSchema.index({
  city: 1,
  status: 1,
});

// GSTIN search
leadSchema.index({
  gstin: 1,
});

// PAN search
leadSchema.index({
  panNumber: 1,
});

// ======================================================
// NORMALIZATION - CREATE / SAVE
// ======================================================

leadSchema.pre('validate', function normalizeLead() {
  // Basic details
  if (this.name) {
    this.name = this.name.trim();
  }

  if (this.designation) {
    this.designation = this.designation.trim();
  }

  if (this.email) {
    this.email = this.email
      .trim()
      .toLowerCase();
  }

  if (this.phone) {
    this.phone = this.phone.trim();
  }

  if (this.alternatePhone) {
    this.alternatePhone = this.alternatePhone.trim();
  }

  // Company
  if (this.companyName) {
    this.companyName = this.companyName.trim();
  }

  // GSTIN
  if (this.gstin) {
    this.gstin = this.gstin
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '');
  }

  // PAN
  if (this.panNumber) {
    this.panNumber = this.panNumber
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '');
  }

  // Currency
  if (this.currency) {
    this.currency = this.currency
      .trim()
      .toUpperCase();
  }

  // Address
  if (this.address) {
    this.address = this.address.trim();
  }

  if (this.city) {
    this.city = this.city.trim();
  }

  if (this.state) {
    this.state = this.state.trim();
  }

  if (this.country) {
    this.country = this.country.trim();
  }

  if (this.postalCode) {
    this.postalCode = this.postalCode.trim();
  }

  // Lost reason
  if (this.lostReason) {
    this.lostReason = this.lostReason.trim();
  }

  // Tags
  if (Array.isArray(this.tags)) {
    this.tags = [
      ...new Set(
        this.tags
          .map((tag) =>
            String(tag)
              .trim()
              .toUpperCase()
          )
          .filter(Boolean)
      ),
    ];
  }

  // LOST validation
  if (
    this.status === 'LOST' &&
    !this.lostReason
  ) {
    throw new Error(
      'Lost reason is required when lead status is LOST'
    );
  }

  // Clear lost reason for non-lost leads
  if (this.status !== 'LOST') {
    this.lostReason = '';
  }
});


// ======================================================
// NORMALIZE UPDATE OPERATIONS
// ======================================================

leadSchema.pre(
  'findOneAndUpdate',
  function normalizeLeadUpdate() {
    const update = this.getUpdate() || {};

    // Support both:
    // { name: 'Test' }
    // and
    // { $set: { name: 'Test' } }

    const data = update.$set || update;

    // Basic details
    if (data.name !== undefined) {
      data.name = String(data.name).trim();
    }

    if (data.designation !== undefined) {
      data.designation =
        String(data.designation).trim();
    }

    if (data.email !== undefined) {
      data.email =
        String(data.email)
          .trim()
          .toLowerCase();
    }

    if (data.phone !== undefined) {
      data.phone =
        String(data.phone).trim();
    }

    if (data.alternatePhone !== undefined) {
      data.alternatePhone =
        String(data.alternatePhone).trim();
    }

    // Company
    if (data.companyName !== undefined) {
      data.companyName =
        String(data.companyName).trim();
    }

    // GSTIN
    if (data.gstin !== undefined) {
      data.gstin =
        String(data.gstin)
          .trim()
          .toUpperCase()
          .replace(/\s+/g, '');
    }

    // PAN
    if (data.panNumber !== undefined) {
      data.panNumber =
        String(data.panNumber)
          .trim()
          .toUpperCase()
          .replace(/\s+/g, '');
    }

    // Currency
    if (data.currency !== undefined) {
      data.currency =
        String(data.currency)
          .trim()
          .toUpperCase();
    }

    // Address
    if (data.address !== undefined) {
      data.address =
        String(data.address).trim();
    }

    if (data.city !== undefined) {
      data.city =
        String(data.city).trim();
    }

    if (data.state !== undefined) {
      data.state =
        String(data.state).trim();
    }

    if (data.country !== undefined) {
      data.country =
        String(data.country).trim();
    }

    if (data.postalCode !== undefined) {
      data.postalCode =
        String(data.postalCode).trim();
    }

    // Lost reason
    if (data.lostReason !== undefined) {
      data.lostReason =
        String(data.lostReason).trim();
    }

    // Tags
    if (Array.isArray(data.tags)) {
      data.tags = [
        ...new Set(
          data.tags
            .map((tag) =>
              String(tag)
                .trim()
                .toUpperCase()
            )
            .filter(Boolean)
        ),
      ];
    }

    // Important:
    // No next() here.
  }
);

// ======================================================
// VIRTUAL - FULL LEAD SUMMARY
// ======================================================

leadSchema.virtual(
  'isConverted'
).get(function isConverted() {
  return Boolean(
    this.convertedAt ||
    this.convertedOpportunity
  );
});

// ======================================================
// JSON
// ======================================================

leadSchema.set(
  'toJSON',
  {
    virtuals: true,
  }
);

// ======================================================
// MODEL
// ======================================================

const Lead =
  mongoose.model(
    'Lead',
    leadSchema
  );

module.exports = Lead;