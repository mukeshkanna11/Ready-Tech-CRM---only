"use strict";

const mongoose = require("mongoose");

const { Schema } = mongoose;

/*
|--------------------------------------------------------------------------
| ENUMS
|--------------------------------------------------------------------------
*/

const TASK_STATUS = [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

const TASK_PRIORITY = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
];

/*
|--------------------------------------------------------------------------
| TASK SCHEMA
|--------------------------------------------------------------------------
*/

const taskSchema = new Schema(
  {
    // ---------------------------------------------------
    // BASIC
    // ---------------------------------------------------

    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      minlength: [2, "Task title must be at least 2 characters"],
      maxlength: [200, "Task title cannot exceed 200 characters"],
      index: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: [5000, "Task description cannot exceed 5000 characters"],
      default: "",
    },

    // ---------------------------------------------------
    // STATUS / PRIORITY
    // ---------------------------------------------------

    status: {
      type: String,
      enum: {
        values: TASK_STATUS,
        message: `Invalid status. Allowed values: ${TASK_STATUS.join(", ")}`,
      },
      default: "PENDING",
      index: true,
    },

    priority: {
      type: String,
      enum: {
        values: TASK_PRIORITY,
        message: `Invalid priority. Allowed values: ${TASK_PRIORITY.join(", ")}`,
      },
      default: "MEDIUM",
      index: true,
    },

    // ---------------------------------------------------
    // DATES
    // ---------------------------------------------------

    startAt: {
      type: Date,
      default: null,
      index: true,
    },

    dueAt: {
      type: Date,
      default: null,
      index: true,
    },

    completedAt: {
      type: Date,
      default: null,
      index: true,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    // ---------------------------------------------------
    // REMINDER
    // ---------------------------------------------------

    reminderEnabled: {
      type: Boolean,
      default: false,
      index: true,
    },

    reminderAt: {
      type: Date,
      default: null,
    },

    // ---------------------------------------------------
    // ASSIGNMENT
    // ---------------------------------------------------

    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    // ---------------------------------------------------
    // CRM RELATIONSHIPS
    // ---------------------------------------------------

    lead: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
      default: null,
      index: true,
    },

    company: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      default: null,
      index: true,
    },

    contact: {
      type: Schema.Types.ObjectId,
      ref: "Contact",
      default: null,
      index: true,
    },

    opportunity: {
      type: Schema.Types.ObjectId,
      ref: "Opportunity",
      default: null,
      index: true,
    },

    // ---------------------------------------------------
    // AUDIT
    // ---------------------------------------------------

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // ---------------------------------------------------
    // SOFT DELETE
    // ---------------------------------------------------

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: {
      type: Date,
      default: null,
    },

    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

/*
|--------------------------------------------------------------------------
| INDEXES
|--------------------------------------------------------------------------
*/

taskSchema.index({
  title: "text",
  description: "text",
});

taskSchema.index({
  assignedTo: 1,
  status: 1,
  dueAt: 1,
});

taskSchema.index({
  createdBy: 1,
  status: 1,
  createdAt: -1,
});

taskSchema.index({
  isDeleted: 1,
  dueAt: 1,
});

taskSchema.index({
  lead: 1,
  createdAt: -1,
});

taskSchema.index({
  company: 1,
  createdAt: -1,
});

taskSchema.index({
  contact: 1,
  createdAt: -1,
});

taskSchema.index({
  opportunity: 1,
  createdAt: -1,
});

/*
|--------------------------------------------------------------------------
| VIRTUALS
|--------------------------------------------------------------------------
*/

taskSchema.virtual("isOverdue").get(function () {
  if (!this.dueAt) return false;

  return (
    this.dueAt < new Date() &&
    !["COMPLETED", "CANCELLED"].includes(this.status)
  );
});

taskSchema.virtual("isCompleted").get(function () {
  return this.status === "COMPLETED";
});

/*
|--------------------------------------------------------------------------
| JSON
|--------------------------------------------------------------------------
*/

taskSchema.set("toJSON", {
  virtuals: true,
});

taskSchema.set("toObject", {
  virtuals: true,
});

/*
|--------------------------------------------------------------------------
| STATIC ENUMS
|--------------------------------------------------------------------------
*/

taskSchema.statics.TASK_STATUS = TASK_STATUS;
taskSchema.statics.TASK_PRIORITY = TASK_PRIORITY;

/*
|--------------------------------------------------------------------------
| EXPORT
|--------------------------------------------------------------------------
*/

module.exports =
  mongoose.models.Task || mongoose.model("Task", taskSchema);