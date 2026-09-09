"use strict";

const express = require("express");
const controller = require("../controllers/activity.controller");
const {
  authenticate,
} = require("../middleware/auth.middleware");

const router = express.Router();

// -----------------------------------------------------
// Authentication
// -----------------------------------------------------

router.use(authenticate);

// -----------------------------------------------------
// Dashboard / personal / calendar routes
// Keep these BEFORE /:id
// -----------------------------------------------------

router.get(
  "/my",
  controller.getMyActivities
);

router.get(
  "/upcoming",
  controller.getUpcoming
);

router.get(
  "/overdue",
  controller.getOverdue
);

router.get(
  "/calendar",
  controller.getCalendar
);

router.get(
  "/stats",
  controller.getStats
);

// -----------------------------------------------------
// CRM Timeline routes
// -----------------------------------------------------

router.get(
  "/lead/:leadId",
  controller.getLeadTimeline
);

router.get(
  "/company/:companyId",
  controller.getCompanyTimeline
);

router.get(
  "/contact/:contactId",
  controller.getContactTimeline
);

router.get(
  "/opportunity/:opportunityId",
  controller.getOpportunityTimeline
);

// -----------------------------------------------------
// Activity collection
// GET    /
// POST   /
// -----------------------------------------------------

router
  .route("/")
  .get(controller.getAll)
  .post(controller.create);

// -----------------------------------------------------
// Activity actions
// IMPORTANT: these must come before /:id
// -----------------------------------------------------

router.patch(
  "/:id/complete",
  controller.complete
);

router.patch(
  "/:id/cancel",
  controller.cancel
);

router.patch(
  "/:id/start",
  controller.start
);

router.patch(
  "/:id/assign",
  controller.assign
);

router.patch(
  "/:id/restore",
  controller.restore
);

// -----------------------------------------------------
// Single activity
// GET    /:id
// PUT    /:id
// DELETE /:id
// -----------------------------------------------------

router
  .route("/:id")
  .get(controller.getById)
  .put(controller.update)
  .delete(controller.remove);

module.exports = router;