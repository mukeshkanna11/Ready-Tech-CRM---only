const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const { getDashboard } = require('../services/dashboard.service');

exports.get = asyncHandler(async (_req, res) => {
  sendSuccess(res, await getDashboard(), 'Dashboard fetched successfully');
});
