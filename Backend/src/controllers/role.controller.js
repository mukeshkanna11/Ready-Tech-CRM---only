const Role = require('../models/Role');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const createCrudController = require('../utils/controllerFactory');

const crud = createCrudController({ Model: Role });

// Block deleting system roles or roles still assigned to users.
const remove = asyncHandler(async (req, res, next) => {
  const role = await Role.findById(req.params.id).select('isSystem');

  if (role?.isSystem) {
    throw new ApiError(400, 'System roles cannot be deleted', 'SYSTEM_ROLE');
  }

  if (role && (await User.exists({ role: role._id }))) {
    throw new ApiError(409, 'Role is assigned to users', 'ROLE_IN_USE');
  }

  return crud.remove(req, res, next);
});

module.exports = { ...crud, remove };
