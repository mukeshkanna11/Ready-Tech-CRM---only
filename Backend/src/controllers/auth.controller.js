'use strict';

const auth = require('../services/auth.service');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const env = require('../config/env');

// ======================================================
// REFRESH COOKIE CONFIG
// ======================================================

const REFRESH_COOKIE_NAME = 'refreshToken';

const REFRESH_COOKIE_MAX_AGE =
  7 * 24 * 60 * 60 * 1000;

const refreshCookieOptions = {
  httpOnly: true,

  secure:
    env.cookieSecure,

  sameSite:
    env.cookieSameSite,

  path:
    '/api/v1/auth',

  maxAge:
    REFRESH_COOKIE_MAX_AGE,
};


// ======================================================
// COOKIE HELPERS
// ======================================================

const setRefreshCookie = (
  res,
  token
) => {
  if (!token) {
    return;
  }

  res.cookie(
    REFRESH_COOKIE_NAME,
    token,
    refreshCookieOptions
  );
};


const clearRefreshCookie = (
  res
) => {
  res.clearCookie(
    REFRESH_COOKIE_NAME,
    {
      httpOnly:
        refreshCookieOptions.httpOnly,

      secure:
        refreshCookieOptions.secure,

      sameSite:
        refreshCookieOptions.sameSite,

      path:
        refreshCookieOptions.path,
    }
  );
};


// ======================================================
// REGISTER
// ======================================================

exports.register = asyncHandler(
  async (req, res) => {
    const result =
      await auth.register(
        req.body
      );

    // ----------------------------------------------
    // Refresh token → HTTP-only cookie
    // ----------------------------------------------

    setRefreshCookie(
      res,
      result.refreshToken
    );

    // ----------------------------------------------
    // Never expose refresh token in JSON
    // ----------------------------------------------

    const response = {
      user:
        result.user,

      accessToken:
        result.accessToken,
    };

    return sendSuccess(
      res,
      response,
      'Registration successful',
      201
    );
  }
);


// ======================================================
// LOGIN
// ======================================================

exports.login = asyncHandler(
  async (req, res) => {
    const result =
      await auth.login(
        req.body
      );

    // ----------------------------------------------
    // Store refresh token in HTTP-only cookie
    // ----------------------------------------------

    setRefreshCookie(
      res,
      result.refreshToken
    );

    // ----------------------------------------------
    // Do not expose refresh token
    // ----------------------------------------------

    const response = {
      user:
        result.user,

      accessToken:
        result.accessToken,
    };

    return sendSuccess(
      res,
      response,
      'Login successful'
    );
  }
);


// ======================================================
// CURRENT USER
// ======================================================
//
// GET /api/v1/auth/me
//
// Authentication middleware should already
// attach req.user.
//
// ======================================================

exports.me = asyncHandler(
  async (req, res) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message:
          'Authentication required',
        code:
          'AUTH_REQUIRED',
      });
    }

    const user =
      await auth.getAuthUser(
        req.user._id
      );

    return sendSuccess(
      res,
      user,
      'Current user fetched'
    );
  }
);


// ======================================================
// REFRESH ACCESS TOKEN
// ======================================================
//
// Refresh token comes ONLY from HTTP-only cookie.
//
// Frontend does not need to manually handle
// refresh token.
//
// ======================================================

exports.refresh = asyncHandler(
  async (req, res) => {
    const token =
      req.cookies?.[
        REFRESH_COOKIE_NAME
      ];

    const result =
      await auth.refresh(
        token
      );

    // ----------------------------------------------
    // Rotate refresh token cookie
    // ----------------------------------------------

    setRefreshCookie(
      res,
      result.refreshToken
    );

    // ----------------------------------------------
    // Only access token in response
    // ----------------------------------------------

    return sendSuccess(
      res,
      {
        accessToken:
          result.accessToken,
      },
      'Token refreshed successfully'
    );
  }
);


// ======================================================
// LOGOUT
// ======================================================
//
// Revoke refresh token + clear cookie.
//
// ======================================================

exports.logout = asyncHandler(
  async (req, res) => {
    if (req.user?._id) {
      await auth.logout(
        req.user._id
      );
    }

    clearRefreshCookie(
      res
    );

    return sendSuccess(
      res,
      null,
      'Logged out successfully'
    );
  }
);


// ======================================================
// LOGOUT ALL DEVICES
// ======================================================
//
// Current User model uses one refresh hash,
// therefore removing it invalidates all
// refresh sessions.
//
// ======================================================

exports.logoutAll = asyncHandler(
  async (req, res) => {
    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        message:
          'Authentication required',
        code:
          'AUTH_REQUIRED',
      });
    }

    await auth.logoutAll(
      req.user._id
    );

    clearRefreshCookie(
      res
    );

    return sendSuccess(
      res,
      null,
      'Logged out from all devices successfully'
    );
  }
);


// ======================================================
// CHANGE PASSWORD
// ======================================================
//
// POST /api/v1/auth/change-password
//
// Body:
// {
//   currentPassword,
//   newPassword
// }
//
// ======================================================

exports.changePassword =
  asyncHandler(
    async (req, res) => {
      if (!req.user?._id) {
        return res.status(401).json({
          success: false,
          message:
            'Authentication required',
          code:
            'AUTH_REQUIRED',
        });
      }

      const {
        currentPassword,
        newPassword,
      } = req.body || {};

      const result =
        await auth.changePassword(
          req.user._id,
          currentPassword,
          newPassword
        );

      // ----------------------------------------------
      // Password change revokes refresh session
      // ----------------------------------------------

      clearRefreshCookie(
        res
      );

      return sendSuccess(
        res,
        null,
        result.message ||
          'Password changed successfully'
      );
    }
  );


// ======================================================
// FORCE LOGOUT
// ======================================================
//
// Intended for authenticated admin/security
// controller usage.
//
// ======================================================

exports.forceLogout =
  asyncHandler(
    async (req, res) => {
      const { userId } =
        req.params;

      await auth.forceLogout(
        userId
      );

      return sendSuccess(
        res,
        null,
        'User sessions revoked successfully'
      );
    }
  );


// ======================================================
// EXPORT COOKIE HELPERS
// ======================================================
//
// Optional internal use/testing.
//
// ======================================================

exports.setRefreshCookie =
  setRefreshCookie;

exports.clearRefreshCookie =
  clearRefreshCookie;