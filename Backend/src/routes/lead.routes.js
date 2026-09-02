'use strict';

const express = require('express');

const {
  authenticate,
} = require('../middleware/auth.middleware');

const controller =
  require('../controllers/lead.controller');

const router =
  express.Router();


// ======================================================
// AUTHENTICATION
// ======================================================

router.use(authenticate);


// ======================================================
// LEAD CRUD
// ======================================================

// GET    /api/v1/leads
// POST   /api/v1/leads

router
  .route('/')
  .get(controller.list)
  .post(controller.create);


// GET    /api/v1/leads/:id
// PUT    /api/v1/leads/:id
// DELETE /api/v1/leads/:id

router
  .route('/:id')
  .get(controller.getById)
  .put(controller.update)
  .delete(controller.remove);


// ======================================================
// LEAD ASSIGNMENT
// ======================================================

// PATCH /api/v1/leads/:id/assign

router.patch(
  '/:id/assign',
  controller.assign
);


// ======================================================
// LEAD STATUS
// ======================================================

// PATCH /api/v1/leads/:id/status

router.patch(
  '/:id/status',
  controller.status
);


// ======================================================
// LEAD FOLLOW-UP
// ======================================================

// PATCH /api/v1/leads/:id/follow-up

router.patch(
  '/:id/follow-up',
  controller.followUp
);


// ======================================================
// LEAD CONVERSION
// ======================================================

// PATCH /api/v1/leads/:id/convert

router.patch(
  '/:id/convert',
  controller.convert
);


module.exports = router;