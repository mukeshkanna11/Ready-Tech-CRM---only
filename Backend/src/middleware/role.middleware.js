const ApiError = require('../utils/ApiError');

const authorizeRoles = (...roles) => (req, _res, next) => {
  const roleName = req.user?.role?.name;

  if (!roleName || !roles.includes(roleName)) {
    return next(new ApiError(403, 'You do not have permission for this action', 'FORBIDDEN'));
  }

  next();
};

const authorizePermission = (permission) => (req, _res, next) => {
  const permissions = req.user?.role?.permissions || [];

  if (!permissions.includes(permission) && !permissions.includes('*')) {
    return next(new ApiError(403, `Missing permission: ${permission}`, 'PERMISSION_DENIED'));
  }

  next();
};

module.exports = { authorizeRoles, authorizePermission };
