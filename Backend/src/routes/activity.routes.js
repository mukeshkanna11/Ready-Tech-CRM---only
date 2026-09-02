// src/routes/activity.routes.js

"use strict";

const express = require("express");

const controller = require("../controllers/activity.controller");

const {
  authenticate,
} = require("../middleware/auth.middleware");

const router = express.Router();


// ============================================================
// AUTHENTICATION
// ============================================================

router.use(authenticate);


// ============================================================
// SPECIAL / STATIC ROUTES
// ============================================================

// Current user's activities
router.get(
  "/my",
  controller.getMyActivities
);

// Upcoming activities
router.get(
  "/upcoming",
  controller.getUpcoming
);

// Overdue activities
router.get(
  "/overdue",
  controller.getOverdue
);

// Calendar activities
router.get(
  "/calendar",
  controller.getCalendar
);

// Activity statistics
router.get(
  "/stats",
  controller.getStats
);


// ============================================================
// CRM TIMELINES
// ============================================================

// Lead timeline
router.get(
  "/lead/:leadId",
  controller.getLeadTimeline
);

// Company timeline
router.get(
  "/company/:companyId",
  controller.getCompanyTimeline
);

// Contact timeline
router.get(
  "/contact/:contactId",
  controller.getContactTimeline
);

// Opportunity timeline
router.get(
  "/opportunity/:opportunityId",
  controller.getOpportunityTimeline
);


// ============================================================
// MAIN CRUD
// ============================================================

router
  .route("/")
  .get(controller.getAll)
  .post(controller.create);


// ============================================================
// ACTIVITY ACTIONS
// ============================================================

// Complete activity
router.patch(
  "/:id/complete",
  controller.complete
);

// Cancel activity
router.patch(
  "/:id/cancel",
  controller.cancel
);

// Start activity
router.patch(
  "/:id/start",
  controller.start
);

// Assign activity
router.patch(
  "/:id/assign",
  controller.assign
);

// Restore deleted/archived activity
router.patch(
  "/:id/restore",
  controller.restore
);


// ============================================================
// SINGLE ACTIVITY
// ============================================================

router
  .route("/:id")
  .get(controller.getById)
  .put(controller.update)
  .delete(controller.remove);


// ============================================================
// EXPORT
// ============================================================

module.exports = router;