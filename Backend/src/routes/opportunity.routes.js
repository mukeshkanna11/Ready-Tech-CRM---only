'use strict';

const express = require('express');

const router = express.Router();

const {
  createOpportunity,
  getOpportunities,
  getOpportunityById,
  updateOpportunity,
  deleteOpportunity,

  getOpportunityStats,
  getOpportunityPipeline,

  updateOpportunityStage,
  closeOpportunity,

  getMyOpportunities,
  getUpcomingClosures,
} = require('../controllers/opportunity.controller');

const {
  authenticate,
} = require('../middleware/auth.middleware');

// ======================================================
// OPPORTUNITY ROUTES
// ======================================================

// ------------------------------------------------------
// IMPORTANT
// ------------------------------------------------------
// Static routes MUST come before "/:id"
// otherwise Express can treat "stats", "pipeline",
// "mine", etc. as an opportunity ID.
// ------------------------------------------------------

// ======================================================
// DASHBOARD / REPORTING
// ======================================================

// Opportunity statistics
// GET /api/v1/opportunities/stats
router.get(
  '/stats',
  authenticate,
  getOpportunityStats
);

// Opportunity pipeline / Kanban
// GET /api/v1/opportunities/pipeline
router.get(
  '/pipeline',
  authenticate,
  getOpportunityPipeline
);

// My opportunities
// GET /api/v1/opportunities/mine
router.get(
  '/mine',
  authenticate,
  getMyOpportunities
);

// Upcoming opportunity closures
// GET /api/v1/opportunities/upcoming-closures
router.get(
  '/upcoming-closures',
  authenticate,
  getUpcomingClosures
);

// ======================================================
// CREATE
// ======================================================

// POST /api/v1/opportunities
router.post(
  '/',
  authenticate,
  createOpportunity
);

// ======================================================
// LIST
// ======================================================

// GET /api/v1/opportunities
router.get(
  '/',
  authenticate,
  getOpportunities
);

// ======================================================
// STAGE UPDATE
// ======================================================

// PATCH /api/v1/opportunities/:id/stage
router.patch(
  '/:id/stage',
  authenticate,
  updateOpportunityStage
);

// ======================================================
// CLOSE OPPORTUNITY
// ======================================================

// POST /api/v1/opportunities/:id/close
router.post(
  '/:id/close',
  authenticate,
  closeOpportunity
);

// ======================================================
// GET BY ID
// ======================================================

// GET /api/v1/opportunities/:id
router.get(
  '/:id',
  authenticate,
  getOpportunityById
);

// ======================================================
// UPDATE
// ======================================================

// PUT /api/v1/opportunities/:id
router.put(
  '/:id',
  authenticate,
  updateOpportunity
);

// ======================================================
// DELETE
// ======================================================

// DELETE /api/v1/opportunities/:id
router.delete(
  '/:id',
  authenticate,
  deleteOpportunity
);

module.exports = router;