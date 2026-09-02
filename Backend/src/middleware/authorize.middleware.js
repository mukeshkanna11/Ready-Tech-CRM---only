'use strict';

const ApiError =
  require('../utils/ApiError');


// ======================================================
// HELPERS
// ======================================================

const normalize = (value) => {
  if (
    value === undefined ||
    value === null
  ) {
    return '';
  }

  return String(value)
    .trim()
    .toUpperCase();
};


const normalizeArray = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(normalize)
    .filter(Boolean);
};


// ======================================================
// ROLE CHECK
// ======================================================
//
// Usage:
//
// authorizeRoles('ADMIN')
//
// authorizeRoles(
//   'ADMIN',
//   'MANAGER'
// )
//
// ======================================================

const authorizeRoles =
  (...roles) =>
  (req, _res, next) => {
    const allowedRoles =
      normalizeArray(roles);

    if (
      allowedRoles.length === 0
    ) {
      return next(
        new ApiError(
          500,
          'Authorization roles are not configured',
          'AUTHORIZATION_CONFIG_ERROR'
        )
      );
    }

    // ----------------------------------------------
    // Authenticated user
    // ----------------------------------------------

    const user =
      req.user;

    if (!user) {
      return next(
        new ApiError(
          401,
          'Authentication required',
          'AUTH_REQUIRED'
        )
      );
    }

    // ----------------------------------------------
    // Current role
    // ----------------------------------------------

    const roleName =
      normalize(
        user.role?.name
      );

    if (!roleName) {
      return next(
        new ApiError(
          403,
          'User role is not configured',
          'ROLE_NOT_CONFIGURED'
        )
      );
    }

    // ----------------------------------------------
    // Super admin / wildcard
    // ----------------------------------------------

    const isSuperAdmin =
      roleName ===
        'SUPER_ADMIN' ||
      roleName === 'ADMIN';

    if (isSuperAdmin) {
      return next();
    }

    // ----------------------------------------------
    // Role authorization
    // ----------------------------------------------

    if (
      !allowedRoles.includes(
        roleName
      )
    ) {
      return next(
        new ApiError(
          403,
          'You do not have permission for this action',
          'FORBIDDEN'
        )
      );
    }

    return next();
  };


// ======================================================
// PERMISSION MATCHER
// ======================================================
//
// Supported:
//
// '*'
//
// 'CRM:*'
//
// 'CRM:LEADS:*'
//
// 'CRM:LEADS:READ'
//
// Exact permission:
//
// 'LEADS_READ'
//
// ======================================================

const permissionMatches = (
  grantedPermission,
  requiredPermission
) => {
  const granted =
    normalize(
      grantedPermission
    );

  const required =
    normalize(
      requiredPermission
    );

  if (
    !granted ||
    !required
  ) {
    return false;
  }

  // Full wildcard
  if (
    granted === '*'
  ) {
    return true;
  }

  // Exact permission
  if (
    granted === required
  ) {
    return true;
  }

  // ----------------------------------------------
  // Hierarchical wildcard
  //
  // CRM:* allows
  // CRM:LEADS:READ
  // CRM:LEADS:CREATE
  // CRM:CONTACTS:READ
  //
  // ----------------------------------------------

  if (
    granted.endsWith(':*')
  ) {
    const prefix =
      granted.slice(
        0,
        -2
      );

    if (
      required === prefix ||
      required.startsWith(
        `${prefix}:`
      )
    ) {
      return true;
    }
  }

  return false;
};


// ======================================================
// PERMISSION AUTHORIZATION
// ======================================================
//
// Usage:
//
// authorizePermission(
//   'LEADS_READ'
// )
//
// ======================================================

const authorizePermission =
  (permission) =>
  (req, _res, next) => {
    const requiredPermission =
      normalize(
        permission
      );

    // ----------------------------------------------
    // Configuration validation
    // ----------------------------------------------

    if (
      !requiredPermission
    ) {
      return next(
        new ApiError(
          500,
          'Authorization permission is not configured',
          'AUTHORIZATION_CONFIG_ERROR'
        )
      );
    }

    // ----------------------------------------------
    // Authentication
    // ----------------------------------------------

    const user =
      req.user;

    if (!user) {
      return next(
        new ApiError(
          401,
          'Authentication required',
          'AUTH_REQUIRED'
        )
      );
    }

    // ----------------------------------------------
    // Role
    // ----------------------------------------------

    const roleName =
      normalize(
        user.role?.name
      );

    if (!roleName) {
      return next(
        new ApiError(
          403,
          'User role is not configured',
          'ROLE_NOT_CONFIGURED'
        )
      );
    }

    // ----------------------------------------------
    // Admin bypass
    // ----------------------------------------------

    if (
      roleName ===
        'SUPER_ADMIN' ||
      roleName === 'ADMIN'
    ) {
      return next();
    }

    // ----------------------------------------------
    // Permissions
    // ----------------------------------------------

    const permissions =
      normalizeArray(
        user.role?.permissions
      );

    // ----------------------------------------------
    // Permission check
    // ----------------------------------------------

    const hasPermission =
      permissions.some(
        (grantedPermission) =>
          permissionMatches(
            grantedPermission,
            requiredPermission
          )
      );

    if (
      !hasPermission
    ) {
      return next(
        new ApiError(
          403,
          `Missing permission: ${requiredPermission}`,
          'PERMISSION_DENIED',
          {
            required:
              requiredPermission,
          }
        )
      );
    }

    return next();
  };


// ======================================================
// MULTIPLE PERMISSIONS - ANY
// ======================================================
//
// User needs at least ONE permission.
//
// ======================================================

const authorizeAnyPermission =
  (...permissions) =>
  (req, _res, next) => {
    const requiredPermissions =
      normalizeArray(
        permissions
      );

    if (
      requiredPermissions.length ===
      0
    ) {
      return next(
        new ApiError(
          500,
          'Authorization permissions are not configured',
          'AUTHORIZATION_CONFIG_ERROR'
        )
      );
    }

    const user =
      req.user;

    if (!user) {
      return next(
        new ApiError(
          401,
          'Authentication required',
          'AUTH_REQUIRED'
        )
      );
    }

    const roleName =
      normalize(
        user.role?.name
      );

    if (
      roleName ===
        'SUPER_ADMIN' ||
      roleName === 'ADMIN'
    ) {
      return next();
    }

    const grantedPermissions =
      normalizeArray(
        user.role?.permissions
      );

    const allowed =
      requiredPermissions.some(
        (requiredPermission) =>
          grantedPermissions.some(
            (grantedPermission) =>
              permissionMatches(
                grantedPermission,
                requiredPermission
              )
          )
      );

    if (!allowed) {
      return next(
        new ApiError(
          403,
          'You do not have the required permission',
          'PERMISSION_DENIED'
        )
      );
    }

    return next();
  };


// ======================================================
// MULTIPLE PERMISSIONS - ALL
// ======================================================
//
// User needs ALL permissions.
//
// ======================================================

const authorizeAllPermissions =
  (...permissions) =>
  (req, _res, next) => {
    const requiredPermissions =
      normalizeArray(
        permissions
      );

    if (
      requiredPermissions.length ===
      0
    ) {
      return next(
        new ApiError(
          500,
          'Authorization permissions are not configured',
          'AUTHORIZATION_CONFIG_ERROR'
        )
      );
    }

    const user =
      req.user;

    if (!user) {
      return next(
        new ApiError(
          401,
          'Authentication required',
          'AUTH_REQUIRED'
        )
      );
    }

    const roleName =
      normalize(
        user.role?.name
      );

    if (
      roleName ===
        'SUPER_ADMIN' ||
      roleName === 'ADMIN'
    ) {
      return next();
    }

    const grantedPermissions =
      normalizeArray(
        user.role?.permissions
      );

    const allowed =
      requiredPermissions.every(
        (requiredPermission) =>
          grantedPermissions.some(
            (grantedPermission) =>
              permissionMatches(
                grantedPermission,
                requiredPermission
              )
          )
      );

    if (!allowed) {
      return next(
        new ApiError(
          403,
          'You do not have all the required permissions',
          'PERMISSION_DENIED'
        )
      );
    }

    return next();
  };


// ======================================================
// EXPORT
// ======================================================

module.exports = {
  authorizeRoles,
  authorizePermission,
  authorizeAnyPermission,
  authorizeAllPermissions,
};