const User = require('../models/User');
const Role = require('../models/Role');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const { getPagination, buildPagination } = require('../utils/pagination');

exports.list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};

  if (req.query.search) {
    filter.$or = [
      { name: { $regex: req.query.search, $options: 'i' } },
      { email: { $regex: req.query.search, $options: 'i' } },
    ];
  }

  if (req.query.role) filter.role = req.query.role;
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

  const [items, total] = await Promise.all([
    User.find(filter).select('-password -refreshTokenHash').populate('role').sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  sendSuccess(res, items, 'Users fetched successfully', 200, {
    pagination: buildPagination(page, limit, total),
  });
});

exports.create = asyncHandler(async (req, res) => {
  const { name, email, password, phone, role } = req.body;

  if (await User.exists({ email: email.toLowerCase() })) {
    throw new ApiError(409, 'Email already exists', 'EMAIL_EXISTS');
  }

  const roleDoc = await Role.findById(role);
  if (!roleDoc) throw new ApiError(400, 'Invalid role', 'INVALID_ROLE');

  const user = await User.create({ name, email, password, phone, role });
  await user.populate('role');

  sendSuccess(res, user.toSafeJSON(), 'User created successfully', 201);
});

exports.getById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password -refreshTokenHash').populate('role');
  if (!user) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  sendSuccess(res, user, 'User fetched successfully');
});

exports.update = asyncHandler(async (req, res) => {
  const allowed = ['name', 'phone', 'avatar', 'role', 'isActive'];
  const payload = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));

  if (payload.role) {
    const role = await Role.findById(payload.role);
    if (!role) throw new ApiError(400, 'Invalid role', 'INVALID_ROLE');
  }

  const user = await User.findByIdAndUpdate(req.params.id, payload, {
    new: true,
    runValidators: true,
  }).select('-password -refreshTokenHash').populate('role');

  if (!user) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  sendSuccess(res, user, 'User updated successfully');
});

exports.remove = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  sendSuccess(res, null, 'User deleted successfully');
});
