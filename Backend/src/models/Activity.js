"use strict";

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

const RECURRENCE_TYPES = [
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "YEARLY",
];

const attachmentSchema = new mongoose.Schema(
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
  { _id: false }
);

const recurrenceSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: RECURRENCE_TYPES,
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
  { _id: false }
);

const activitySchema = new mongoose.Schema(
  {
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

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Assigned user is required"],
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

    // CRM relationships
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

    // Reminder
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

    // Recurrence
    isRecurring: {
      type: Boolean,
      default: false,
    },

    recurrence: {
      type: recurrenceSchema,
    },

    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
        maxlength: 50,
      },
    ],

    attachments: [attachmentSchema],

    internalNotes: {
      type: String,
      trim: true,
      maxlength: 5000,
    },

    // Soft delete
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

// Indexes
activitySchema.index({
  assignedTo: 1,
  status: 1,
  scheduledAt: 1,
});

activitySchema.index({
  scheduledAt: 1,
  status: 1,
});

activitySchema.index({
  lead: 1,
  createdAt: -1,
});

activitySchema.index({
  company: 1,
  createdAt: -1,
});

activitySchema.index({
  contact: 1,
  createdAt: -1,
});

activitySchema.index({
  opportunity: 1,
  createdAt: -1,
});

activitySchema.index({
  reminderEnabled: 1,
  reminderSent: 1,
  reminderAt: 1,
});

activitySchema.index({
  isDeleted: 1,
  createdAt: -1,
});

// Validation
activitySchema.pre("validate", function () {
  // Completed activity automatically gets completedAt
  if (this.status === "COMPLETED" && !this.completedAt) {
    this.completedAt = new Date();
  }

  // Clear completion date when moved back
  if (
    this.status !== "COMPLETED" &&
    this.isModified("status") &&
    this.status !== "CANCELLED"
  ) {
    this.completedAt = undefined;
  }

  // Reminder validation
  if (this.reminderEnabled && !this.reminderAt) {
    throw new Error(
      "reminderAt is required when reminderEnabled is true"
    );
  }

  // Recurrence validation
  if (this.isRecurring && !this.recurrence?.type) {
    throw new Error(
      "recurrence.type is required for recurring activities"
    );
  }

  // Recurrence end date validation
  if (
    this.recurrence?.endDate &&
    this.scheduledAt &&
    this.recurrence.endDate < this.scheduledAt
  ) {
    throw new Error(
      "recurrence.endDate cannot be before scheduledAt"
    );
  }
});

module.exports = mongoose.model("Activity", activitySchema);

module.exports.ACTIVITY_TYPES = ACTIVITY_TYPES;
module.exports.ACTIVITY_STATUS = ACTIVITY_STATUS;
module.exports.ACTIVITY_PRIORITY = ACTIVITY_PRIORITY;
module.exports.ACTIVITY_OUTCOMES = ACTIVITY_OUTCOMES;