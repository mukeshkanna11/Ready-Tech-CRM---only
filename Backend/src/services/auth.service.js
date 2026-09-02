'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const User = require('../models/User');
const Role = require('../models/Role');

const env = require('../config/env');
const ApiError = require('../utils/ApiError');

// ======================================================
// AUTH CONSTANTS
// ======================================================

const DEFAULT_ROLE = 'USER';

const ACCESS_TOKEN_TYPE = 'access';
const REFRESH_TOKEN_TYPE = 'refresh';


// ======================================================
// EMAIL
// ======================================================

const normalizeEmail = (email) => {
  return String(email || '')
    .trim()
    .toLowerCase();
};


// ======================================================
// OBJECT ID
// ======================================================

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};


// ======================================================
// TOKEN HASH
// ======================================================
//
// Raw refresh token is NEVER stored in database.
// Only SHA-256 hash is stored.
//
// ======================================================

const hashToken = (token) => {
  return crypto
    .createHash('sha256')
    .update(String(token))
    .digest('hex');
};


// ======================================================
// SAFE HASH COMPARISON
// ======================================================

const compareTokenHash = (
  incomingHash,
  storedHash
) => {
  if (!incomingHash || !storedHash) {
    return false;
  }

  const incomingBuffer =
    Buffer.from(incomingHash);

  const storedBuffer =
    Buffer.from(storedHash);

  if (
    incomingBuffer.length !==
    storedBuffer.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    incomingBuffer,
    storedBuffer
  );
};


// ======================================================
// ACCESS TOKEN
// ======================================================

const signAccessToken = (user) => {
  if (!user?._id) {
    throw new ApiError(
      500,
      'Unable to create access token',
      'TOKEN_USER_INVALID'
    );
  }

  const roleName =
    typeof user.role === 'object'
      ? user.role?.name
      : user.role;

  return jwt.sign(
    {
      sub: user._id.toString(),

      role:
        roleName || DEFAULT_ROLE,

      type:
        ACCESS_TOKEN_TYPE,
    },

    env.jwtAccessSecret,

    {
      expiresIn:
        env.jwtAccessExpires,

      ...(env.jwtIssuer && {
        issuer: env.jwtIssuer,
      }),

      ...(env.jwtAudience && {
        audience: env.jwtAudience,
      }),
    }
  );
};


// ======================================================
// REFRESH TOKEN
// ======================================================

const signRefreshToken = (user) => {
  if (!user?._id) {
    throw new ApiError(
      500,
      'Unable to create refresh token',
      'TOKEN_USER_INVALID'
    );
  }

  return jwt.sign(
    {
      sub: user._id.toString(),

      type:
        REFRESH_TOKEN_TYPE,

      jti:
        crypto
          .randomBytes(24)
          .toString('hex'),
    },

    env.jwtRefreshSecret,

    {
      expiresIn:
        env.jwtRefreshExpires,

      ...(env.jwtIssuer && {
        issuer: env.jwtIssuer,
      }),

      ...(env.jwtAudience && {
        audience: env.jwtAudience,
      }),
    }
  );
};


// ======================================================
// VERIFY REFRESH TOKEN
// ======================================================

const verifyRefreshToken = (
  token
) => {
  if (!token) {
    throw new ApiError(
      401,
      'Refresh token required',
      'REFRESH_REQUIRED'
    );
  }

  try {
    const payload =
      jwt.verify(
        token,
        env.jwtRefreshSecret,
        {
          ...(env.jwtIssuer && {
            issuer: env.jwtIssuer,
          }),

          ...(env.jwtAudience && {
            audience: env.jwtAudience,
          }),
        }
      );

    if (
      !payload ||
      typeof payload !== 'object'
    ) {
      throw new Error(
        'Invalid token payload'
      );
    }

    // ----------------------------------------------
    // Must be refresh token
    // ----------------------------------------------

    if (
      payload.type !==
      REFRESH_TOKEN_TYPE
    ) {
      throw new ApiError(
        401,
        'Invalid refresh token',
        'INVALID_REFRESH_TOKEN'
      );
    }

    // ----------------------------------------------
    // User ID required
    // ----------------------------------------------

    if (
      !payload.sub ||
      !isValidObjectId(
        payload.sub
      )
    ) {
      throw new ApiError(
        401,
        'Invalid refresh token',
        'INVALID_REFRESH_TOKEN'
      );
    }

    return payload;
  } catch (error) {
    if (
      error instanceof ApiError
    ) {
      throw error;
    }

    throw new ApiError(
      401,
      'Invalid or expired refresh token',
      'INVALID_REFRESH_TOKEN'
    );
  }
};


// ======================================================
// GET DEFAULT ROLE
// ======================================================

const getDefaultRole = async () => {
  const role =
    await Role.findOne({
      name: DEFAULT_ROLE,
    });

  if (!role) {
    throw new ApiError(
      500,
      'Default user role is not configured',
      'ROLE_NOT_CONFIGURED'
    );
  }

  return role;
};


// ======================================================
// POPULATE USER ROLE
// ======================================================

const populateUserRole = async (
  user
) => {
  if (!user) {
    return user;
  }

  await user.populate({
    path: 'role',
    select:
      'name permissions',
  });

  return user;
};


// ======================================================
// REGISTER
// ======================================================
//
// Public registration always creates USER.
//
// Never trust roleName from frontend.
//
// ======================================================

const register = async ({
  name,
  email,
  password,
  phone,
}) => {
  const normalizedEmail =
    normalizeEmail(email);

  // ----------------------------------------------
  // Duplicate email check
  // ----------------------------------------------

  const existingUser =
    await User.findOne({
      email:
        normalizedEmail,
    })
      .select('_id')
      .lean();

  if (existingUser) {
    throw new ApiError(
      409,
      'Email already registered',
      'EMAIL_EXISTS'
    );
  }

  // ----------------------------------------------
  // Default role
  // ----------------------------------------------

  const role =
    await getDefaultRole();

  // ----------------------------------------------
  // Create user
  // ----------------------------------------------

  const user =
    await User.create({
      name:
        String(name).trim(),

      email:
        normalizedEmail,

      password,

      ...(phone
        ? {
            phone:
              String(phone).trim(),
          }
        : {}),

      role:
        role._id,

      isActive:
        true,
    });

  // ----------------------------------------------
  // Populate role
  // ----------------------------------------------

  await populateUserRole(
    user
  );

  // ----------------------------------------------
  // Generate token pair
  // ----------------------------------------------

  const accessToken =
    signAccessToken(user);

  const refreshToken =
    signRefreshToken(user);

  // ----------------------------------------------
  // Store hashed refresh token
  // ----------------------------------------------

  user.refreshTokenHash =
    hashToken(
      refreshToken
    );

  user.lastLoginAt =
    new Date();

  await user.save({
    validateBeforeSave: false,
  });

  // ----------------------------------------------
  // Safe response
  // ----------------------------------------------

  return {
    user:
      user.toSafeJSON(),

    accessToken,

    refreshToken,
  };
};


// ======================================================
// LOGIN
// ======================================================

const login = async ({
  email,
  password,
}) => {
  const normalizedEmail =
    normalizeEmail(email);

  // ----------------------------------------------
  // Fetch user with credentials
  // ----------------------------------------------

  const user =
    await User.findOne({
      email:
        normalizedEmail,
    })
      .select(
        '+password +refreshTokenHash'
      )
      .populate({
        path: 'role',
        select:
          'name permissions',
      });

  // ----------------------------------------------
  // Generic credential error
  // ----------------------------------------------

  if (!user) {
    throw new ApiError(
      401,
      'Invalid email or password',
      'INVALID_CREDENTIALS'
    );
  }

  // ----------------------------------------------
  // Account status
  // ----------------------------------------------

  if (!user.isActive) {
    throw new ApiError(
      403,
      'Your account is inactive. Please contact an administrator.',
      'ACCOUNT_INACTIVE'
    );
  }

  // ----------------------------------------------
  // Role validation
  // ----------------------------------------------

  if (!user.role) {
    throw new ApiError(
      403,
      'User role is not configured',
      'ROLE_NOT_CONFIGURED'
    );
  }

  // ----------------------------------------------
  // Password verification
  // ----------------------------------------------

  const validPassword =
    await user.comparePassword(
      password
    );

  if (!validPassword) {
    throw new ApiError(
      401,
      'Invalid email or password',
      'INVALID_CREDENTIALS'
    );
  }

  // ----------------------------------------------
  // Generate token pair
  // ----------------------------------------------

  const accessToken =
    signAccessToken(user);

  const refreshToken =
    signRefreshToken(user);

  // ----------------------------------------------
  // Rotate refresh token
  // ----------------------------------------------

  user.refreshTokenHash =
    hashToken(
      refreshToken
    );

  user.lastLoginAt =
    new Date();

  await user.save({
    validateBeforeSave: false,
  });

  // ----------------------------------------------
  // Response
  // ----------------------------------------------

  return {
    user:
      user.toSafeJSON(),

    accessToken,

    refreshToken,
  };
};


// ======================================================
// REFRESH TOKEN
// ======================================================
//
// Refresh-token rotation.
//
// Old token:
//   valid → new token generated
//
// Reused/old token:
//   rejected
//
// ======================================================

const refresh = async (
  token
) => {
  // ----------------------------------------------
  // Verify JWT
  // ----------------------------------------------

  const payload =
    verifyRefreshToken(
      token
    );

  // ----------------------------------------------
  // Find user
  // ----------------------------------------------

  const user =
    await User.findById(
      payload.sub
    )
      .select(
        '+refreshTokenHash'
      )
      .populate({
        path: 'role',
        select:
          'name permissions',
      });

  // ----------------------------------------------
  // User validation
  // ----------------------------------------------

  if (!user) {
    throw new ApiError(
      401,
      'Refresh token is no longer valid',
      'REFRESH_REVOKED'
    );
  }

  if (!user.isActive) {
    throw new ApiError(
      403,
      'User account is inactive',
      'ACCOUNT_INACTIVE'
    );
  }

  if (!user.role) {
    throw new ApiError(
      403,
      'User role is not configured',
      'ROLE_NOT_CONFIGURED'
    );
  }

  // ----------------------------------------------
  // Stored hash validation
  // ----------------------------------------------

  if (
    !user.refreshTokenHash
  ) {
    throw new ApiError(
      401,
      'Refresh token is no longer valid',
      'REFRESH_REVOKED'
    );
  }

  const incomingHash =
    hashToken(token);

  const validToken =
    compareTokenHash(
      incomingHash,
      user.refreshTokenHash
    );

  if (!validToken) {
    throw new ApiError(
      401,
      'Refresh token is no longer valid',
      'REFRESH_REVOKED'
    );
  }

  // ----------------------------------------------
  // Generate new token pair
  // ----------------------------------------------

  const accessToken =
    signAccessToken(user);

  const refreshToken =
    signRefreshToken(user);

  // ----------------------------------------------
  // Replace old refresh hash
  // ----------------------------------------------

  user.refreshTokenHash =
    hashToken(
      refreshToken
    );

  await user.save({
    validateBeforeSave: false,
  });

  // ----------------------------------------------
  // Response
  // ----------------------------------------------

  return {
    accessToken,

    refreshToken,
  };
};


// ======================================================
// LOGOUT
// ======================================================
//
// Current refresh token is revoked.
//
// ======================================================

const logout = async (
  userId
) => {
  if (
    !isValidObjectId(userId)
  ) {
    throw new ApiError(
      400,
      'Invalid user ID',
      'INVALID_USER_ID'
    );
  }

  await User.findByIdAndUpdate(
    userId,
    {
      $unset: {
        refreshTokenHash: 1,
      },
    }
  );

  return {
    success: true,
  };
};


// ======================================================
// LOGOUT ALL DEVICES
// ======================================================
//
// Since the current User model stores one refresh
// token hash, removing it invalidates all sessions.
//
// ======================================================

const logoutAll = async (
  userId
) => {
  if (
    !isValidObjectId(userId)
  ) {
    throw new ApiError(
      400,
      'Invalid user ID',
      'INVALID_USER_ID'
    );
  }

  await User.findByIdAndUpdate(
    userId,
    {
      $unset: {
        refreshTokenHash: 1,
      },
    }
  );

  return {
    success: true,
  };
};


// ======================================================
// REVOKE USER TOKENS
// ======================================================
//
// Internal reusable function.
//
// Useful for:
// - Password change
// - Password reset
// - Admin deactivate
// - Security action
//
// ======================================================

const revokeUserTokens = async (
  userId
) => {
  if (
    !isValidObjectId(userId)
  ) {
    throw new ApiError(
      400,
      'Invalid user ID',
      'INVALID_USER_ID'
    );
  }

  await User.findByIdAndUpdate(
    userId,
    {
      $unset: {
        refreshTokenHash: 1,
      },
    }
  );

  return true;
};


// ======================================================
// GET AUTH USER
// ======================================================
//
// Useful for:
// GET /api/auth/me
//
// ======================================================

const getAuthUser = async (
  userId
) => {
  if (
    !isValidObjectId(userId)
  ) {
    throw new ApiError(
      400,
      'Invalid user ID',
      'INVALID_USER_ID'
    );
  }

  const user =
    await User.findById(
      userId
    ).populate({
      path: 'role',
      select:
        'name permissions',
    });

  if (!user) {
    throw new ApiError(
      404,
      'User not found',
      'USER_NOT_FOUND'
    );
  }

  if (!user.isActive) {
    throw new ApiError(
      403,
      'User account is inactive',
      'ACCOUNT_INACTIVE'
    );
  }

  return user.toSafeJSON();
};


// ======================================================
// CHANGE PASSWORD
// ======================================================
//
// Password comparison should normally be handled
// through User.comparePassword().
//
// After password change:
// all existing refresh tokens are revoked.
//
// ======================================================

const changePassword = async (
  userId,
  currentPassword,
  newPassword
) => {
  if (
    !isValidObjectId(userId)
  ) {
    throw new ApiError(
      400,
      'Invalid user ID',
      'INVALID_USER_ID'
    );
  }

  const user =
    await User.findById(
      userId
    ).select('+password');

  if (!user) {
    throw new ApiError(
      404,
      'User not found',
      'USER_NOT_FOUND'
    );
  }

  if (!user.isActive) {
    throw new ApiError(
      403,
      'User account is inactive',
      'ACCOUNT_INACTIVE'
    );
  }

  // ----------------------------------------------
  // Current password
  // ----------------------------------------------

  const valid =
    await user.comparePassword(
      currentPassword
    );

  if (!valid) {
    throw new ApiError(
      401,
      'Current password is incorrect',
      'INVALID_CURRENT_PASSWORD'
    );
  }

  // ----------------------------------------------
  // Prevent same password
  // ----------------------------------------------

  const samePassword =
    await user.comparePassword(
      newPassword
    );

  if (samePassword) {
    throw new ApiError(
      400,
      'New password must be different from current password',
      'PASSWORD_UNCHANGED'
    );
  }

  // ----------------------------------------------
  // Update password
  // ----------------------------------------------

  user.password =
    newPassword;

  // ----------------------------------------------
  // Revoke existing sessions
  // ----------------------------------------------

  user.refreshTokenHash =
    undefined;

  await user.save();

  return {
    success: true,
    message:
      'Password changed successfully',
  };
};


// ======================================================
// ADMIN FORCE LOGOUT
// ======================================================

const forceLogout = async (
  userId
) => {
  return revokeUserTokens(
    userId
  );
};


// ======================================================
// EXPORT
// ======================================================

module.exports = {
  // Authentication
  register,
  login,
  refresh,
  logout,

  // Session management
  logoutAll,
  revokeUserTokens,
  forceLogout,

  // User
  getAuthUser,
  changePassword,

  // Tokens
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,

  // Utilities
  hashToken,
  normalizeEmail,
};