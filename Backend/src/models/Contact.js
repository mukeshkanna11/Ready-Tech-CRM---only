'use strict';

const mongoose = require('mongoose');


// ======================================================
// CONTACT SCHEMA
// ======================================================

const contactSchema = new mongoose.Schema(
  {
    // ======================================================
    // PERSONAL INFORMATION
    // ======================================================

    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      minlength: [2, 'First name must be at least 2 characters'],
      maxlength: [100, 'First name cannot exceed 100 characters'],
    },

    lastName: {
      type: String,
      trim: true,
      default: '',
      maxlength: [100, 'Last name cannot exceed 100 characters'],
    },

    designation: {
      type: String,
      trim: true,
      default: '',
      maxlength: [150, 'Designation cannot exceed 150 characters'],
    },

    department: {
      type: String,
      trim: true,
      default: '',
      maxlength: [150, 'Department cannot exceed 150 characters'],
    },


    // ======================================================
    // CONTACT DETAILS
    // ======================================================

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
      maxlength: [30, 'Phone number cannot exceed 30 characters'],
    },

    alternatePhone: {
      type: String,
      trim: true,
      default: '',
      maxlength: [30, 'Alternate phone cannot exceed 30 characters'],
    },

    website: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Website URL is too long'],
    },


    // ======================================================
    // COMPANY
    // ======================================================

    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      default: null,
      index: true,
    },


    // ======================================================
    // CONTACT OWNER
    // ======================================================

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },


    // ======================================================
    // SOURCE
    // ======================================================

    source: {
      type: String,
      trim: true,
      default: '',
      maxlength: [100, 'Source cannot exceed 100 characters'],
      index: true,
    },


    // ======================================================
    // STATUS
    // ======================================================

    status: {
      type: String,
      enum: {
        values: [
          'ACTIVE',
          'INACTIVE',
        ],
        message: 'Invalid contact status',
      },
      default: 'ACTIVE',
      index: true,
    },


    // ======================================================
    // ADDRESS
    // ======================================================

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


    // ======================================================
    // TAGS
    // ======================================================

    tags: {
      type: [String],
      default: [],
    },


    // ======================================================
    // NOTES
    // ======================================================

    notes: {
      type: String,
      trim: true,
      default: '',
      maxlength: [5000, 'Notes cannot exceed 5000 characters'],
    },


    // ======================================================
    // ACTIVITY TRACKING
    // ======================================================

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
  },
  {
    timestamps: true,
    versionKey: false,
  }
);


// ======================================================
// INDEXES
// ======================================================

contactSchema.index({
  company: 1,
  status: 1,
  createdAt: -1,
});

contactSchema.index({
  owner: 1,
  status: 1,
  createdAt: -1,
});

contactSchema.index({
  source: 1,
  status: 1,
});

contactSchema.index({
  nextFollowUpAt: 1,
});

contactSchema.index({
  createdAt: -1,
});


// ======================================================
// NORMALIZE CONTACT DATA
// ======================================================

const normalizeContactData = (data) => {
  if (!data || typeof data !== 'object') {
    return;
  }

  if (data.firstName !== undefined) {
    data.firstName =
      String(data.firstName).trim();
  }

  if (data.lastName !== undefined) {
    data.lastName =
      String(data.lastName).trim();
  }

  if (data.designation !== undefined) {
    data.designation =
      String(data.designation).trim();
  }

  if (data.department !== undefined) {
    data.department =
      String(data.department).trim();
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

  if (data.website !== undefined) {
    data.website =
      String(data.website).trim();
  }

  if (data.source !== undefined) {
    data.source =
      String(data.source).trim();
  }

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

  if (data.notes !== undefined) {
    data.notes =
      String(data.notes).trim();
  }

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
};


// ======================================================
// SAVE MIDDLEWARE
// ======================================================
//
// IMPORTANT:
// Async middleware is used intentionally.
// No next() is required.
//
// ======================================================

contactSchema.pre(
  'save',
  async function () {
    normalizeContactData(this);
  }
);


// ======================================================
// FIND ONE AND UPDATE
// ======================================================
//
// Works for:
//
// findOneAndUpdate()
// findByIdAndUpdate()
//
// ======================================================

contactSchema.pre(
  'findOneAndUpdate',
  async function () {
    const update =
      this.getUpdate();

    if (!update) {
      return;
    }

    // --------------------------------------------------
    // Handle $set update
    // --------------------------------------------------

    if (update.$set) {
      normalizeContactData(
        update.$set
      );
    }

    // --------------------------------------------------
    // Handle direct update
    // --------------------------------------------------

    const directFields = [
      'firstName',
      'lastName',
      'designation',
      'department',
      'email',
      'phone',
      'alternatePhone',
      'website',
      'source',
      'address',
      'city',
      'state',
      'country',
      'postalCode',
      'notes',
      'tags',
    ];

    const directUpdate = {};

    directFields.forEach(
      (field) => {
        if (
          update[field] !== undefined
        ) {
          directUpdate[field] =
            update[field];
        }
      }
    );

    if (
      Object.keys(directUpdate)
        .length > 0
    ) {
      normalizeContactData(
        directUpdate
      );

      this.setUpdate({
        ...update,
        ...directUpdate,
      });
    }
  }
);


// ======================================================
// VIRTUAL FULL NAME
// ======================================================

contactSchema.virtual(
  'fullName'
).get(function () {
  return [
    this.firstName,
    this.lastName,
  ]
    .filter(Boolean)
    .join(' ');
});


// ======================================================
// JSON
// ======================================================

contactSchema.set(
  'toJSON',
  {
    virtuals: true,
  }
);


// ======================================================
// MODEL
// ======================================================

const Contact =
  mongoose.model(
    'Contact',
    contactSchema
  );

module.exports = Contact;   