'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');


// ======================================================
// USER SCHEMA
// ======================================================

const userSchema = new mongoose.Schema(
  {
    // --------------------------------------------------
    // BASIC INFORMATION
    // --------------------------------------------------

    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [120, 'Name cannot exceed 120 characters'],
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      maxlength: [254, 'Email cannot exceed 254 characters'],
    },

    phone: {
      type: String,
      trim: true,
      maxlength: [30, 'Phone number cannot exceed 30 characters'],
      default: '',
    },

    avatar: {
      type: String,
      trim: true,
      maxlength: [500, 'Avatar URL is too long'],
      default: '',
    },


    // --------------------------------------------------
    // AUTHENTICATION
    // --------------------------------------------------

    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      maxlength: [72, 'Password cannot exceed 72 characters'],
      select: false,
    },


    // --------------------------------------------------
    // ROLE / ACCESS CONTROL
    // --------------------------------------------------

    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      required: [true, 'User role is required'],
      index: true,
    },


    // --------------------------------------------------
    // ACCOUNT STATUS
    // --------------------------------------------------

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },

    passwordChangedAt: {
      type: Date,
      default: null,
    },


    // --------------------------------------------------
    // REFRESH TOKEN
    // --------------------------------------------------

    refreshTokenHash: {
      type: String,
      default: null,
      select: false,
    },
  },
  {
    timestamps: true,

    versionKey: false,

    toJSON: {
      transform: (_doc, ret) => {
        delete ret.password;
        delete ret.refreshTokenHash;

        return ret;
      },
    },
  }
);


// ======================================================
// INDEXES
// ======================================================

// Unique email
userSchema.index(
  { email: 1 },
  { unique: true }
);

// Role + active users
userSchema.index({
  role: 1,
  isActive: 1,
});

// Latest users
userSchema.index({
  createdAt: -1,
});


// ======================================================
// NORMALIZE EMAIL
// ======================================================
//
// IMPORTANT:
// No `next` parameter.
// Compatible with modern Mongoose middleware.
//
// ======================================================

userSchema.pre(
  'validate',
  function normalizeEmail() {
    if (this.email) {
      this.email = String(this.email)
        .trim()
        .toLowerCase();
    }
  }
);


// ======================================================
// NORMALIZE NAME
// ======================================================

userSchema.pre(
  'validate',
  function normalizeName() {
    if (this.name) {
      this.name = String(this.name)
        .trim();
    }
  }
);


// ======================================================
// NORMALIZE PHONE
// ======================================================

userSchema.pre(
  'validate',
  function normalizePhone() {
    if (this.phone) {
      this.phone = String(this.phone)
        .trim();
    }
  }
);


// ======================================================
// PASSWORD HASHING
// ======================================================
//
// Password is automatically hashed before save.
//
// ======================================================

userSchema.pre(
  'save',
  async function hashPassword() {
    // Password was not modified
    if (!this.isModified('password')) {
      return;
    }

    // Password changed timestamp
    this.passwordChangedAt = new Date();

    // Hash password
    this.password = await bcrypt.hash(
      this.password,
      12
    );
  }
);


// ======================================================
// PASSWORD COMPARISON
// ======================================================

userSchema.methods.comparePassword =
  async function comparePassword(
    candidatePassword
  ) {
    if (
      !candidatePassword ||
      !this.password
    ) {
      return false;
    }

    return bcrypt.compare(
      candidatePassword,
      this.password
    );
  };


// ======================================================
// SAFE USER JSON
// ======================================================

userSchema.methods.toSafeJSON =
  function toSafeJSON() {
    const obj = this.toObject();

    delete obj.password;
    delete obj.refreshTokenHash;

    return obj;
  };


// ======================================================
// PASSWORD CHANGED CHECK
// ======================================================

userSchema.methods.changedPasswordAfter =
  function changedPasswordAfter(
    jwtIssuedAt
  ) {
    if (
      !this.passwordChangedAt ||
      !jwtIssuedAt
    ) {
      return false;
    }

    const changedTimestamp =
      Math.floor(
        this.passwordChangedAt.getTime() / 1000
      );

    return (
      changedTimestamp >
      Number(jwtIssuedAt)
    );
  };


// ======================================================
// CLEAR REFRESH TOKEN
// ======================================================

userSchema.methods.clearRefreshToken =
  async function clearRefreshToken() {
    this.refreshTokenHash = null;

    await this.save({
      validateBeforeSave: false,
    });

    return this;
  };


// ======================================================
// UPDATE LOGIN INFORMATION
// ======================================================

userSchema.methods.markLogin =
  async function markLogin() {
    this.lastLoginAt = new Date();

    await this.save({
      validateBeforeSave: false,
    });

    return this;
  };


// ======================================================
// MODEL
// ======================================================

const User =
  mongoose.models.User ||
  mongoose.model(
    'User',
    userSchema
  );

module.exports = User;