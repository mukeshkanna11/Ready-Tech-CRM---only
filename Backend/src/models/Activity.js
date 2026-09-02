// src/models/Activity.js

const mongoose = require("mongoose");

const ACTIVITY_TYPES = [
  "CALL",
  "EMAIL",
  "MEETING",
  "DEMO",
  "FOLLOW_UP",
  "WHATSAPP",
  "TASK",
  "NOTE",
  "OTHER",
];

const ACTIVITY_STATUS = [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "OVERDUE",
];

const ACTIVITY_PRIORITY = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
];

const ACTIVITY_OUTCOMES = [
  "NO_RESPONSE",
  "CONNECTED",
  "INTERESTED",
  "NOT_INTERESTED",
  "FOLLOW_UP_REQUIRED",
  "MEETING_SCHEDULED",
  "DEMO_SCHEDULED",
  "PROPOSAL_REQUESTED",
  "CONVERTED",
  "LOST",
  "OTHER",
];

const activitySchema = new mongoose.Schema(
  {
    // =====================================================
    // BASIC INFORMATION
    // =====================================================

    type: {
      type: String,
      enum: ACTIVITY_TYPES,
      required: [true, "Activity type is required"],
      index: true,
    },

    subject: {
      type: String,
      required: [true, "Activity subject is required"],
      trim: true,
      maxlength: 200,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 5000,
    },

    // =====================================================
    // STATUS / PRIORITY
    // =====================================================

    status: {
      type: String,
      enum: ACTIVITY_STATUS,
      default: "PENDING",
      index: true,
    },

    priority: {
      type: String,
      enum: ACTIVITY_PRIORITY,
      default: "MEDIUM",
      index: true,
    },

    outcome: {
      type: String,
      enum: ACTIVITY_OUTCOMES,
      default: null,
    },

    outcomeNotes: {
      type: String,
      trim: true,
      maxlength: 3000,
    },

    // =====================================================
    // SCHEDULING
    // =====================================================

    scheduledAt: {
      type: Date,
      index: true,
    },

    dueAt: {
      type: Date,
      index: true,
    },

    startedAt: {
      type: Date,
    },

    completedAt: {
      type: Date,
    },

    durationMinutes: {
      type: Number,
      min: 0,
      max: 1440,
    },

    // =====================================================
    // OWNERSHIP
    // =====================================================

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // =====================================================
    // CRM RELATIONSHIPS
    // =====================================================

    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      index: true,
    },

    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      index: true,
    },

    contact: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contact",
      index: true,
    },

    opportunity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Opportunity",
      index: true,
    },

    // =====================================================
    // COMMUNICATION DETAILS
    // =====================================================

    location: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    meetingLink: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    phoneNumber: {
      type: String,
      trim: true,
      maxlength: 30,
    },

    emailAddress: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },

    // =====================================================
    // REMINDER
    // =====================================================

    reminderEnabled: {
      type: Boolean,
      default: false,
    },

    reminderAt: {
      type: Date,
      index: true,
    },

    reminderSent: {
      type: Boolean,
      default: false,
    },

    // =====================================================
    // RECURRENCE
    // =====================================================

    isRecurring: {
      type: Boolean,
      default: false,
    },

    recurrence: {
      type: {
        type: String,
        enum: [
          "DAILY",
          "WEEKLY",
          "MONTHLY",
          "YEARLY",
        ],
      },

      interval: {
        type: Number,
        min: 1,
        default: 1,
      },

      endDate: {
        type: Date,
      },
    },

    // =====================================================
    // TAGS
    // =====================================================

    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
        maxlength: 50,
      },
    ],

    // =====================================================
    // ATTACHMENTS
    // =====================================================

    attachments: [
      {
        name: {
          type: String,
          trim: true,
          maxlength: 255,
        },

        url: {
          type: String,
          trim: true,
          maxlength: 2000,
        },

        mimeType: {
          type: String,
          trim: true,
          maxlength: 100,
        },

        size: {
          type: Number,
          min: 0,
        },
      },
    ],

    // =====================================================
    // INTERNAL NOTES
    // =====================================================

    internalNotes: {
      type: String,
      trim: true,
      maxlength: 5000,
    },

    // =====================================================
    // SOFT DELETE
    // =====================================================

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: {
      type: Date,
    },

    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// =========================================================
// INDEXES
// =========================================================

// Activity list / filtering
activitySchema.index({
  assignedTo: 1,
  status: 1,
  scheduledAt: 1,
});

// Calendar queries
activitySchema.index({
  scheduledAt: 1,
  status: 1,
});

// Lead activity timeline
activitySchema.index({
  lead: 1,
  createdAt: -1,
});

// Company activity timeline
activitySchema.index({
  company: 1,
  createdAt: -1,
});

// Contact activity timeline
activitySchema.index({
  contact: 1,
  createdAt: -1,
});

// Opportunity activity timeline
activitySchema.index({
  opportunity: 1,
  createdAt: -1,
});

// Reminder worker
activitySchema.index({
  reminderEnabled: 1,
  reminderSent: 1,
  reminderAt: 1,
});

// Soft-delete filtering
activitySchema.index({
  isDeleted: 1,
  createdAt: -1,
});

// =========================================================
// VALIDATION
// =========================================================

activitySchema.pre("validate", function (next) {
  // Completed activity should have completedAt
  if (
    this.status === "COMPLETED" &&
    !this.completedAt
  ) {
    this.completedAt = new Date();
  }

  // Non-completed activity should not accidentally retain
  // completion timestamp when status is changed back.
  if (
    this.status !== "COMPLETED" &&
    this.isModified("status") &&
    this.status !== "CANCELLED"
  ) {
    this.completedAt = undefined;
  }

  // Reminder cannot be enabled without reminderAt
  if (
    this.reminderEnabled &&
    !this.reminderAt
  ) {
    return next(
      new Error(
        "reminderAt is required when reminderEnabled is true"
      )
    );
  }

  // Recurring activity requires recurrence configuration
  if (
    this.isRecurring &&
    !this.recurrence?.type
  ) {
    return next(
      new Error(
        "recurrence.type is required for recurring activities"
      )
    );
  }

  next();
});

module.exports = mongoose.model(
  "Activity",
  activitySchema
);

module.exports.ACTIVITY_TYPES = ACTIVITY_TYPES;
module.exports.ACTIVITY_STATUS = ACTIVITY_STATUS;
module.exports.ACTIVITY_PRIORITY = ACTIVITY_PRIORITY;
module.exports.ACTIVITY_OUTCOMES = ACTIVITY_OUTCOMES;