'use strict';

const mongoose = require('mongoose');

const { Schema } = mongoose;

// ======================================================
// COMPANY SCHEMA
// ======================================================

const companySchema = new Schema(
  {
    // ==================================================
    // BASIC COMPANY INFORMATION
    // ==================================================

    name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      minlength: [2, 'Company name must be at least 2 characters'],
      maxlength: [200, 'Company name cannot exceed 200 characters'],
      index: true,
    },

    legalName: {
      type: String,
      trim: true,
      maxlength: [250, 'Legal name cannot exceed 250 characters'],
      default: null,
    },

    companyCode: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: [50, 'Company code cannot exceed 50 characters'],
      default: null,
    },

    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
      default: null,
    },

    // ==================================================
    // COMPANY CLASSIFICATION
    // ==================================================

    industry: {
      type: String,
      trim: true,
      maxlength: [100, 'Industry cannot exceed 100 characters'],
      default: null,
      index: true,
    },

    companyType: {
      type: String,
      enum: {
        values: [
          'PROSPECT',
          'CUSTOMER',
          'PARTNER',
          'RESELLER',
          'VENDOR',
          'OTHER',
        ],
        message: 'Invalid company type',
      },
      default: 'PROSPECT',
      index: true,
    },

    ownership: {
      type: String,
      enum: {
        values: [
          'PRIVATE',
          'PUBLIC',
          'GOVERNMENT',
          'NON_PROFIT',
          'OTHER',
        ],
        message: 'Invalid ownership type',
      },
      default: null,
    },

    employeeCount: {
      type: Number,
      min: [0, 'Employee count cannot be negative'],
      default: null,
    },

    annualRevenue: {
      type: Number,
      min: [0, 'Annual revenue cannot be negative'],
      default: null,
    },

    // ==================================================
    // WEBSITE
    // ==================================================

    website: {
      type: String,
      trim: true,
      maxlength: [500, 'Website cannot exceed 500 characters'],
      default: null,
    },

    // ==================================================
    // CONTACT INFORMATION
    // ==================================================

    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: [254, 'Email cannot exceed 254 characters'],
      default: null,
    },

    phone: {
      type: String,
      trim: true,
      maxlength: [30, 'Phone cannot exceed 30 characters'],
      default: null,
    },

    alternatePhone: {
      type: String,
      trim: true,
      maxlength: [30, 'Alternate phone cannot exceed 30 characters'],
      default: null,
    },

    fax: {
      type: String,
      trim: true,
      maxlength: [30, 'Fax cannot exceed 30 characters'],
      default: null,
    },

    // ==================================================
    // BILLING ADDRESS
    // ==================================================

    billingAddress: {
      addressLine1: {
        type: String,
        trim: true,
        maxlength: 250,
        default: null,
      },

      addressLine2: {
        type: String,
        trim: true,
        maxlength: 250,
        default: null,
      },

      city: {
        type: String,
        trim: true,
        maxlength: 100,
        default: null,
      },

      state: {
        type: String,
        trim: true,
        maxlength: 100,
        default: null,
      },

      country: {
        type: String,
        trim: true,
        maxlength: 100,
        default: null,
      },

      postalCode: {
        type: String,
        trim: true,
        maxlength: 20,
        default: null,
      },
    },

    // ==================================================
    // SHIPPING ADDRESS
    // ==================================================

    shippingAddress: {
      addressLine1: {
        type: String,
        trim: true,
        maxlength: 250,
        default: null,
      },

      addressLine2: {
        type: String,
        trim: true,
        maxlength: 250,
        default: null,
      },

      city: {
        type: String,
        trim: true,
        maxlength: 100,
        default: null,
      },

      state: {
        type: String,
        trim: true,
        maxlength: 100,
        default: null,
      },

      country: {
        type: String,
        trim: true,
        maxlength: 100,
        default: null,
      },

      postalCode: {
        type: String,
        trim: true,
        maxlength: 20,
        default: null,
      },
    },

    // ==================================================
    // TAX & BUSINESS REGISTRATION
    // ==================================================

    gstin: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: [20, 'GSTIN cannot exceed 20 characters'],
      default: null,
      index: true,
    },

    pan: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: [20, 'PAN cannot exceed 20 characters'],
      default: null,
      index: true,
    },

    taxId: {
      type: String,
      trim: true,
      maxlength: [100, 'Tax ID cannot exceed 100 characters'],
      default: null,
    },

    registrationNumber: {
      type: String,
      trim: true,
      maxlength: [100, 'Registration number cannot exceed 100 characters'],
      default: null,
    },

    // ==================================================
    // CRM SOURCE
    // ==================================================

    source: {
      type: String,
      enum: {
        values: [
          'WEBSITE',
          'REFERRAL',
          'ADVERTISEMENT',
          'SOCIAL_MEDIA',
          'EMAIL',
          'PHONE',
          'IMPORT',
          'MANUAL',
          'OTHER',
        ],
        message: 'Invalid company source',
      },
      default: 'MANUAL',
      index: true,
    },

    // ==================================================
    // CRM STATUS
    // ==================================================

    status: {
      type: String,
      enum: {
        values: [
          'ACTIVE',
          'INACTIVE',
          'PROSPECT',
          'CUSTOMER',
          'CHURNED',
        ],
        message: 'Invalid company status',
      },
      default: 'ACTIVE',
      index: true,
    },

    // ==================================================
    // COMPANY RATING
    // ==================================================

    rating: {
      type: String,
      enum: {
        values: ['HOT', 'WARM', 'COLD'],
        message: 'Invalid company rating',
      },
      default: 'WARM',
      index: true,
    },

    // ==================================================
    // COMPANY OWNER
    // ==================================================

    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    // ==================================================
    // TAGS
    // ==================================================

    tags: [
      {
        type: String,
        trim: true,
        maxlength: 50,
      },
    ],

    // ==================================================
    // CUSTOM FIELDS
    // ==================================================

    customFields: {
      type: Schema.Types.Mixed,
      default: {},
    },

    // ==================================================
    // SOFT DELETE
    // ==================================================

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: {
      type: Date,
      default: null,
    },

    // ==================================================
    // AUDIT FIELDS
    // ==================================================

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    // Automatically creates:
    // createdAt
    // updatedAt
    timestamps: true,

    // Don't expose mongoose __v
    versionKey: false,

    // Convert virtuals when using JSON
    toJSON: {
      virtuals: true,
    },

    // Convert virtuals when using objects
    toObject: {
      virtuals: true,
    },
  }
);

// ======================================================
// INDEXES
// ======================================================

// Text search
companySchema.index({
  name: 'text',
  legalName: 'text',
  email: 'text',
  phone: 'text',
  industry: 'text',
  gstin: 'text',
});

// Company listing
companySchema.index({
  isDeleted: 1,
  createdAt: -1,
});

// Status filtering
companySchema.index({
  status: 1,
  isDeleted: 1,
});

// Owner filtering
companySchema.index({
  owner: 1,
  isDeleted: 1,
});

// Company type filtering
companySchema.index({
  companyType: 1,
  isDeleted: 1,
});

// Industry filtering
companySchema.index({
  industry: 1,
  isDeleted: 1,
});

// Source filtering
companySchema.index({
  source: 1,
  isDeleted: 1,
});

// ======================================================
// VIRTUALS
// ======================================================

// Display name
companySchema.virtual('displayName').get(function () {
  return this.name || '';
});

// ======================================================
// QUERY HELPERS
// ======================================================

// Only active/non-deleted companies
companySchema.query.active = function () {
  return this.where({
    isDeleted: false,
  });
};

// Only deleted companies
companySchema.query.deleted = function () {
  return this.where({
    isDeleted: true,
  });
};

// ======================================================
// STATIC METHODS
// ======================================================

// Find active company by ID
companySchema.statics.findActiveById = function (id) {
  return this.findOne({
    _id: id,
    isDeleted: false,
  });
};

// Find company by name
companySchema.statics.findByCompanyName = function (name) {
  return this.findOne({
    name: {
      $regex: `^${String(name).trim()}$`,
      $options: 'i',
    },
    isDeleted: false,
  });
};

// ======================================================
// MODEL EXPORT
// ======================================================

const Company = mongoose.model('Company', companySchema);

module.exports = Company;