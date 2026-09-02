'use strict';

const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const User = require('../models/User');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// ======================================================
// CONSTANTS
// ======================================================

const ACCESS_TOKEN_TYPE = 'access';

// ======================================================
// AUTHENTICATE
// ======================================================

const authenticate = asyncHandler(async (req, _res, next) => {
  // ----------------------------------------------------
  // 1. Read Authorization header
  // ----------------------------------------------------

  const authorization = req.headers.authorization;

  if (!authorization || typeof authorization !== 'string') {
    throw new ApiError(
      401,
      'Authentication required',
      'AUTH_REQUIRED',
    );
  }

  // ----------------------------------------------------
  // 2. Validate Bearer format
  // ----------------------------------------------------

  const [scheme, token] = authorization.trim().split(/\s+/);

  if (!scheme || scheme.toLowerCase() !== 'bearer') {
    throw new ApiError(
      401,
      'Invalid authorization format',
      'INVALID_AUTH_HEADER',
    );
  }

  if (!token) {
    throw new ApiError(
      401,
      'Access token required',
      'ACCESS_TOKEN_REQUIRED',
    );
  }

  // ----------------------------------------------------
  // 3. Verify JWT
  // ----------------------------------------------------

  let payload;

  try {
    payload = jwt.verify(token, env.jwtAccessSecret, {
      algorithms: ['HS256'],

      ...(env.jwtIssuer
        ? {
            issuer: env.jwtIssuer,
          }
        : {}),

      ...(env.jwtAudience
        ? {
            audience: env.jwtAudience,
          }
        : {}),
    });
  } catch (error) {
    if (error?.name === 'TokenExpiredError') {
      throw new ApiError(
        401,
        'Access token has expired',
        'ACCESS_TOKEN_EXPIRED',
      );
    }

    throw new ApiError(
      401,
      'Invalid access token',
      'INVALID_ACCESS_TOKEN',
    );
  }

  // ----------------------------------------------------
  // 4. Validate JWT payload
  // ----------------------------------------------------

  if (
    !payload ||
    typeof payload !== 'object' ||
    Array.isArray(payload)
  ) {
    throw new ApiError(
      401,
      'Invalid access token payload',
      'INVALID_ACCESS_TOKEN',
    );
  }

  // ----------------------------------------------------
  // 5. Ensure this is an access token
  // ----------------------------------------------------

  if (payload.type !== ACCESS_TOKEN_TYPE) {
    throw new ApiError(
      401,
      'Invalid access token',
      'INVALID_ACCESS_TOKEN',
    );
  }

  // ----------------------------------------------------
  // 6. Validate user ID
  // ----------------------------------------------------

  if (
    !payload.sub ||
    !mongoose.Types.ObjectId.isValid(payload.sub)
  ) {
    throw new ApiError(
      401,
      'Invalid access token subject',
      'INVALID_ACCESS_TOKEN',
    );
  }

  // ----------------------------------------------------
  // 7. Load current user
  // ----------------------------------------------------
  //
  // IMPORTANT:
  // Do not load refreshTokenHash during normal API auth.
  //
  // Role is loaded from DB so permission changes become
  // effective immediately.
  //
  // ----------------------------------------------------

  const user = await User.findById(payload.sub).populate({
    path: 'role',
    select: 'name permissions isSystem',
  });

  // ----------------------------------------------------
  // 8. User existence
  // ----------------------------------------------------

  if (!user) {
    throw new ApiError(
      401,
      'User no longer exists',
      'USER_NOT_FOUND',
    );
  }

  // ----------------------------------------------------
  // 9. Account status
  // ----------------------------------------------------

  if (!user.isActive) {
    throw new ApiError(
      403,
      'User account is inactive',
      'ACCOUNT_INACTIVE',
    );
  }

  // ----------------------------------------------------
  // 10. Role validation
  // ----------------------------------------------------

  if (!user.role) {
    throw new ApiError(
      403,
      'User role is not configured',
      'ROLE_NOT_CONFIGURED',
    );
  }

  if (!user.role.name) {
    throw new ApiError(
      403,
      'User role is invalid',
      'INVALID_USER_ROLE',
    );
  }

  // ----------------------------------------------------
  // 11. Attach authenticated user
  // ----------------------------------------------------

  req.user = user;

  // ----------------------------------------------------
  // 12. Authentication metadata
  // ----------------------------------------------------

  req.auth = {
    userId: user._id,
    role: user.role.name,

    permissions: Array.isArray(user.role.permissions)
      ? user.role.permissions
      : [],

    tokenType: ACCESS_TOKEN_TYPE,

    tokenIssuedAt: payload.iat
      ? new Date(payload.iat * 1000)
      : null,

    tokenExpiresAt: payload.exp
      ? new Date(payload.exp * 1000)
      : null,
  };

  // ----------------------------------------------------
  // 13. Continue request
  // ----------------------------------------------------

  return next();
});

// ======================================================
// OPTIONAL AUTHENTICATION
// ======================================================
//
// Useful for endpoints where login is optional.
//
// If token is valid:
//   req.user is populated.
//
// If token is missing:
//   request continues.
//
// If token exists but is invalid:
//   request is rejected.
//
// ======================================================

const optionalAuthenticate = asyncHandler(
  async (req, _res, next) => {
    const authorization = req.headers.authorization;

    if (!authorization) {
      req.user = null;
      req.auth = null;
      return next();
    }

    return authenticate(req, _res, next);
  },
);

// ======================================================
// EXPORT
// ======================================================

module.exports = {
  authenticate,
  optionalAuthenticate,
};