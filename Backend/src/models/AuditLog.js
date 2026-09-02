const mongoose = require('mongoose');

// ======================================================
// AUDIT LOG SCHEMA
// CRM / ERP System Audit Trail
// ======================================================

const auditLogSchema = new mongoose.Schema(
  {
    // ====================================================
    // USER
    // User who performed the action
    // ====================================================
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      default: null,
    },

    // ====================================================
    // ACTION
    // Example:
    // CREATE, UPDATE, DELETE, LOGIN, LOGOUT, EXPORT, etc.
    // ====================================================
    action: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    // ====================================================
    // MODULE
    // Example:
    // LEAD, CLIENT, CONTACT, OPPORTUNITY, INVOICE, USER
    // ====================================================
    module: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    // ====================================================
    // RECORD
    // ID of the affected CRM record
    // ====================================================
    recordId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },

    // ====================================================
    // DESCRIPTION
    // Human-readable audit description
    // ====================================================
    description: {
      type: String,
      trim: true,
      default: '',
    },

    // ====================================================
    // CHANGES
    // Stores old/new values or any additional metadata
    //
    // Example:
    // {
    //   status: {
    //     old: "NEW",
    //     new: "QUALIFIED"
    //   }
    // }
    // ====================================================
    changes: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    // ====================================================
    // IP ADDRESS
    // ====================================================
    ip: {
      type: String,
      trim: true,
      default: null,
    },

    // ====================================================
    // USER AGENT
    // Browser / device information
    // ====================================================
    userAgent: {
      type: String,
      trim: true,
      default: null,
    },

    // ====================================================
    // REQUEST METHOD
    // GET / POST / PUT / PATCH / DELETE
    // ====================================================
    method: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },

    // ====================================================
    // REQUEST PATH
    // Example:
    // /api/leads/65f123...
    // ====================================================
    path: {
      type: String,
      trim: true,
      default: null,
    },

    // ====================================================
    // STATUS
    // SUCCESS / FAILED
    // ====================================================
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILED'],
      default: 'SUCCESS',
      index: true,
    },

    // ====================================================
    // ERROR MESSAGE
    // Useful when an audit operation fails
    // ====================================================
    error: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ======================================================
// COMPOUND INDEXES
// ======================================================

// Find audit history of a specific CRM record
auditLogSchema.index({
  module: 1,
  recordId: 1,
  createdAt: -1,
});

// Find user's recent activities
auditLogSchema.index({
  user: 1,
  createdAt: -1,
});

// Filter audit logs by module/action/date
auditLogSchema.index({
  module: 1,
  action: 1,
  createdAt: -1,
});

// General recent audit logs
auditLogSchema.index({
  createdAt: -1,
});

// ======================================================
// MODEL
// ======================================================

module.exports = mongoose.model('AuditLog', auditLogSchema);