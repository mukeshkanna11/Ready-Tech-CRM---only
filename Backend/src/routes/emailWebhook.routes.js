'use strict';

const express =
  require('express');

const controller =
  require('../controllers/emailWebhook.controller');

const router =
  express.Router();


// ======================================================
// WEBHOOK SECRET PROTECTION
// ======================================================

const verifyWebhookSecret =
  (req, res, next) => {

    const configuredSecret =
      process.env.EMAIL_WEBHOOK_SECRET;

    // Do not allow an unprotected
    // webhook in production.
    if (!configuredSecret) {
      if (
        process.env.NODE_ENV === 'production'
      ) {
        return res.status(500).json({
          success: false,
          message:
            'Email webhook secret is not configured',
          error: {
            code:
              'EMAIL_WEBHOOK_SECRET_MISSING',
          },
        });
      }

      // Development only
      return next();
    }

    const receivedSecret =
      req.headers[
        'x-email-webhook-secret'
      ];

    if (
      !receivedSecret ||
      receivedSecret !== configuredSecret
    ) {
      return res.status(401).json({
        success: false,
        message:
          'Invalid email webhook secret',
        error: {
          code:
            'INVALID_EMAIL_WEBHOOK_SECRET',
        },
      });
    }

    next();
  };


// ======================================================
// INCOMING EMAIL
// ======================================================

// POST /api/v1/email/webhook

router.post(
  '/webhook',
  verifyWebhookSecret,
  controller.receiveEmail
);


module.exports = router;