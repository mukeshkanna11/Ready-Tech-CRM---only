'use strict';

const {
  rateLimit,
} = require('express-rate-limit');


// ======================================================
// CONFIG
// ======================================================

const WINDOW_MS =
  15 * 60 * 1000;

const API_LIMIT =
  Number(
    process.env.API_RATE_LIMIT || 300
  );

const AUTH_LIMIT =
  Number(
    process.env.AUTH_RATE_LIMIT || 20
  );


// ======================================================
// COMMON RESPONSE
// ======================================================

const rateLimitResponse = {
  success: false,
  message:
    'Too many requests. Please try again later.',
  code:
    'RATE_LIMIT_EXCEEDED',
};


// ======================================================
// GENERAL API LIMITER
// ======================================================
//
// Protects normal CRM / ERP APIs.
//
// Example:
//
// GET    /api/v1/companies
// POST   /api/v1/leads
// PUT    /api/v1/invoices/:id
//
// 300 requests / 15 minutes / client
//
// ======================================================

const apiLimiter =
  rateLimit({
    windowMs:
      WINDOW_MS,

    limit:
      API_LIMIT,

    standardHeaders:
      'draft-8',

    legacyHeaders:
      false,

    message:
      rateLimitResponse,

    handler:
      (_req, res) => {
        return res.status(429).json(
          rateLimitResponse
        );
      },

    skipSuccessfulRequests:
      false,

    skipFailedRequests:
      false,
  });


// ======================================================
// AUTH LIMITER
// ======================================================
//
// Used for:
//
// POST /auth/login
// POST /auth/register
// POST /auth/refresh
//
// More restrictive than normal APIs.
//
// 20 requests / 15 minutes
//
// ======================================================

const authLimiter =
  rateLimit({
    windowMs:
      WINDOW_MS,

    limit:
      AUTH_LIMIT,

    standardHeaders:
      'draft-8',

    legacyHeaders:
      false,

    message: {
      success:
        false,

      message:
        'Too many authentication attempts. Please try again later.',

      code:
        'AUTH_RATE_LIMIT_EXCEEDED',
    },

    handler:
      (_req, res) => {
        return res.status(429).json({
          success:
            false,

          message:
            'Too many authentication attempts. Please try again later.',

          code:
            'AUTH_RATE_LIMIT_EXCEEDED',
        });
      },

    skipSuccessfulRequests:
      false,

    skipFailedRequests:
      false,
  });


// ======================================================
// STRICT LOGIN LIMITER
// ======================================================
//
// Login deserves an even stricter limiter because
// repeated password attempts are security-sensitive.
//
// ======================================================

const loginLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    limit:
      Number(
        process.env.LOGIN_RATE_LIMIT || 10
      ),

    standardHeaders:
      'draft-8',

    legacyHeaders:
      false,

    message: {
      success:
        false,

      message:
        'Too many login attempts. Please try again later.',

      code:
        'LOGIN_RATE_LIMIT_EXCEEDED',
    },

    handler:
      (_req, res) => {
        return res.status(429).json({
          success:
            false,

          message:
            'Too many login attempts. Please try again later.',

          code:
            'LOGIN_RATE_LIMIT_EXCEEDED',
        });
      },
  });


// ======================================================
// PASSWORD / SECURITY LIMITER
// ======================================================
//
// For:
//
// - Change password
// - Forgot password
// - Reset password
// - OTP verification
//
// ======================================================

const securityLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    limit:
      Number(
        process.env.SECURITY_RATE_LIMIT || 10
      ),

    standardHeaders:
      'draft-8',

    legacyHeaders:
      false,

    message: {
      success:
        false,

      message:
        'Too many security requests. Please try again later.',

      code:
        'SECURITY_RATE_LIMIT_EXCEEDED',
    },

    handler:
      (_req, res) => {
        return res.status(429).json({
          success:
            false,

          message:
            'Too many security requests. Please try again later.',

          code:
            'SECURITY_RATE_LIMIT_EXCEEDED',
        });
      },
  });


// ======================================================
// EXPORT
// ======================================================

module.exports = {
  apiLimiter,
  authLimiter,
  loginLimiter,
  securityLimiter,
};