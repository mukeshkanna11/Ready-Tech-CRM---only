'use strict';

const express = require('express');

const controller =
  require('../controllers/auth.controller');

const {
  authenticate,
} = require('../middleware/auth.middleware');

const {
  authLimiter,
  loginLimiter,
  securityLimiter,
} = require('../middleware/rateLimit.middleware');

const router =
  express.Router();


// ======================================================
// PUBLIC AUTH
// ======================================================

router.post(
  '/register',
  authLimiter,
  controller.register
);

router.post(
  '/login',
  loginLimiter,
  controller.login
);

router.post(
  '/refresh',
  authLimiter,
  controller.refresh
);


// ======================================================
// AUTHENTICATED
// ======================================================

router.get(
  '/me',
  authenticate,
  controller.me
);

router.post(
  '/logout',
  authenticate,
  controller.logout
);

router.post(
  '/logout-all',
  authenticate,
  controller.logoutAll
);

router.post(
  '/change-password',
  authenticate,
  securityLimiter,
  controller.changePassword
);


module.exports = router;