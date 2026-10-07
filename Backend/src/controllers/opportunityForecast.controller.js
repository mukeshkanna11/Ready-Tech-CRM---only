'use strict';

const Opportunity = require('../models/Opportunity');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const { getStages } = require('../services/pipelineStage.service');
const User = require('../models/User');
const { resolveOwnerIds } = require('./team.controller');

// ======================================================
// SALES FORECAST
// ======================================================
//
// GET /api/v1/opportunities/forecast?from=YYYY-MM-DD&to=YYYY-MM-DD&owner=<id>
//
// Period date per opportunity:
//   OPEN     -> expectedCloseDate
//   WON/LOST -> actualCloseDate (fallback expectedCloseDate)
//
// Weighted value (OPEN only) = value * probability / 100
// Forecast = won value + weighted open value

const parseDate = (value, endOfDay = false) => {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, `Invalid date: ${value}`, 'INVALID_DATE');
  }

  if (endOfDay) date.setHours(23, 59, 59, 999);
  return date;
};

const sumIf = (status, field = '$value') => ({
  $sum: { $cond: [{ $eq: ['$status', status] }, field, 0] },
});

const countIf = (status) => ({
  $sum: { $cond: [{ $eq: ['$status', status] }, 1, 0] },
});

const TOTALS_GROUP = {
  count: { $sum: 1 },
  totalValue: { $sum: '$value' },
  openCount: countIf('OPEN'),
  openValue: sumIf('OPEN'),
  weightedValue: sumIf('OPEN', '$weighted'),
  wonCount: countIf('WON'),
  wonValue: sumIf('WON'),
  lostCount: countIf('LOST'),
  lostValue: sumIf('LOST'),
};

const round = (value) => Math.round((Number(value) || 0) * 100) / 100;

const shapeTotals = (row = {}) => {
  const wonCount = row.wonCount || 0;
  const lostCount = row.lostCount || 0;
  const closed = wonCount + lostCount;

  return {
    count: row.count || 0,
    totalValue: round(row.totalValue),
    openCount: row.openCount || 0,
    openValue: round(row.openValue),
    weightedValue: round(row.weightedValue),
    wonCount,
    wonValue: round(row.wonValue),
    lostCount,
    lostValue: round(row.lostValue),
    forecastValue: round((row.wonValue || 0) + (row.weightedValue || 0)),
    winRate: closed ? round((wonCount / closed) * 100) : 0,
  };
};

exports.getForecast = asyncHandler(async (req, res) => {
  const from = parseDate(req.query.from);
  const to = parseDate(req.query.to, true);

  if (from && to && from > to) {
    throw new ApiError(400, '"from" must be before "to"', 'INVALID_PERIOD');
  }

  // ?owner / ?team / ?territory
  const ownerIds = await resolveOwnerIds(req);
  const baseMatch = ownerIds ? { owner: { $in: ownerIds } } : {};

  const periodMatch = {};
  if (from) periodMatch.$gte = from;
  if (to) periodMatch.$lte = to;
  const hasPeriod = Boolean(from || to);

  const prepare = [
    { $match: baseMatch },
    {
      $addFields: {
        value: { $ifNull: ['$value', 0] },
        status: { $ifNull: ['$status', 'OPEN'] },
        periodDate: {
          $cond: [
            { $eq: [{ $ifNull: ['$status', 'OPEN'] }, 'OPEN'] },
            '$expectedCloseDate',
            { $ifNull: ['$actualCloseDate', '$expectedCloseDate'] },
          ],
        },
        weighted: {
          $multiply: [
            { $ifNull: ['$value', 0] },
            { $divide: [{ $ifNull: ['$probability', 0] }, 100] },
          ],
        },
      },
    },
  ];

  const [result] = await Opportunity.aggregate([
    ...prepare,
    {
      $facet: {
        totals: [
          ...(hasPeriod ? [{ $match: { periodDate: periodMatch } }] : []),
          { $group: { _id: null, ...TOTALS_GROUP } },
        ],

        byMonth: [
          { $match: { periodDate: hasPeriod ? periodMatch : { $ne: null } } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m', date: '$periodDate' } },
              ...TOTALS_GROUP,
            },
          },
          { $sort: { _id: 1 } },
        ],

        byStage: [
          ...(hasPeriod ? [{ $match: { periodDate: periodMatch } }] : []),
          { $match: { status: 'OPEN' } },
          {
            $group: {
              _id: '$stage',
              count: { $sum: 1 },
              value: { $sum: '$value' },
              weightedValue: { $sum: '$weighted' },
            },
          },
        ],

        byOwner: [
          ...(hasPeriod ? [{ $match: { periodDate: periodMatch } }] : []),
          { $group: { _id: '$owner', ...TOTALS_GROUP } },
          { $sort: { wonValue: -1, weightedValue: -1 } },
        ],

        // Open deals with no expected close date can't be placed in a period.
        undatedOpen: [
          { $match: { status: 'OPEN', expectedCloseDate: null } },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              value: { $sum: '$value' },
              weightedValue: { $sum: '$weighted' },
            },
          },
        ],
      },
    },
  ]);

  const ownerRows = result.byOwner || [];
  const owners = await User.find({ _id: { $in: ownerRows.map((r) => r._id).filter(Boolean) } })
    .select('name email')
    .lean();
  const ownerNames = Object.fromEntries(owners.map((u) => [String(u._id), u.name || u.email]));

  const stages = await getStages();
  const stageOrder = stages.map((stage) => stage.key);
  const stageNames = Object.fromEntries(stages.map((s) => [s.key, s.name]));

  const byStage = (result.byStage || [])
    .map((row) => ({
      stage: row._id,
      name: stageNames[row._id] || row._id,
      count: row.count,
      value: round(row.value),
      weightedValue: round(row.weightedValue),
      // Value-weighted average probability of the stage's open deals.
      probability: row.value ? round((row.weightedValue / row.value) * 100) : null,
    }))
    .sort((a, b) => {
      const ai = stageOrder.indexOf(a.stage);
      const bi = stageOrder.indexOf(b.stage);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });

  const undated = result.undatedOpen?.[0];

  sendSuccess(
    res,
    {
      period: { from: from || null, to: to || null },
      totals: shapeTotals(result.totals?.[0]),
      byMonth: (result.byMonth || []).map((row) => ({
        month: row._id,
        ...shapeTotals(row),
      })),
      byStage,
      byOwner: ownerRows.map((row) => ({
        owner: row._id || null,
        name: row._id ? ownerNames[String(row._id)] || 'Unknown user' : 'Unassigned',
        ...shapeTotals(row),
      })),
      undatedOpen: {
        count: undated?.count || 0,
        value: round(undated?.value),
        weightedValue: round(undated?.weightedValue),
      },
    },
    'Sales forecast fetched',
  );
});
