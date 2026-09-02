const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const Lead = require('../models/Lead');
const Opportunity = require('../models/Opportunity');
const Activity = require('../models/Activity');
const Invoice = require('../models/Invoice');

const dateMatch = (query, field = 'createdAt') => {
  const match = {};
  if (query.from || query.to) {
    match[field] = {};
    if (query.from) match[field].$gte = new Date(query.from);
    if (query.to) {
      const to = new Date(query.to);
      to.setHours(23, 59, 59, 999);
      match[field].$lte = to;
    }
  }
  return match;
};

exports.leads = asyncHandler(async (req, res) => {
  const result = await Lead.aggregate([
    { $match: dateMatch(req.query) },
    { $group: { _id: '$status', count: { $sum: 1 }, value: { $sum: '$value' } } },
    { $sort: { count: -1 } },
  ]);
  sendSuccess(res, result, 'Lead report fetched');
});

exports.sales = asyncHandler(async (req, res) => {
  const result = await Opportunity.aggregate([
    { $match: { ...dateMatch(req.query), stage: 'CLOSED_WON' } },
    { $group: { _id: null, count: { $sum: 1 }, value: { $sum: '$value' } } },
  ]);
  sendSuccess(res, result[0] || { count: 0, value: 0 }, 'Sales report fetched');
});

exports.pipeline = asyncHandler(async (_req, res) => {
  const result = await Opportunity.aggregate([
    { $group: { _id: '$stage', count: { $sum: 1 }, value: { $sum: '$value' } } },
  ]);
  sendSuccess(res, result, 'Pipeline report fetched');
});

exports.activities = asyncHandler(async (req, res) => {
  const result = await Activity.aggregate([
    { $match: dateMatch(req.query) },
    { $group: { _id: '$type', count: { $sum: 1 } } },
  ]);
  sendSuccess(res, result, 'Activity report fetched');
});

exports.revenue = asyncHandler(async (req, res) => {
  const result = await Invoice.aggregate([
    { $match: dateMatch(req.query, 'issueDate') },
    {
      $group: {
        _id: null,
        billed: { $sum: '$grandTotal' },
        paid: { $sum: '$amountPaid' },
      },
    },
  ]);
  sendSuccess(res, result[0] || { billed: 0, paid: 0 }, 'Revenue report fetched');
});
