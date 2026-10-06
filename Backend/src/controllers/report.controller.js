'use strict';

const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');
const { sendSuccess } = require('../utils/apiResponse');
const Lead = require('../models/Lead');
const Opportunity = require('../models/Opportunity');
const Activity = require('../models/Activity');
const Invoice = require('../models/Invoice');

const LEAD_FUNNEL_STAGES = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'PROPOSAL',
  'NEGOTIATION',
  'WON',
];

const dateMatch = (query, field = 'createdAt') => {
  const match = {};

  if (query.from || query.to) {
    match[field] = {};

    if (query.from) {
      const from = new Date(query.from);

      if (!Number.isNaN(from.getTime())) {
        from.setHours(0, 0, 0, 0);
        match[field].$gte = from;
      }
    }

    if (query.to) {
      const to = new Date(query.to);

      if (!Number.isNaN(to.getTime())) {
        to.setHours(23, 59, 59, 999);
        match[field].$lte = to;
      }
    }

    if (Object.keys(match[field]).length === 0) {
      delete match[field];
    }
  }

  return match;
};

// ======================================================
// LEAD REPORT + CONVERSION ANALYTICS
// GET /reports/leads?from&to
// ======================================================

exports.leads = asyncHandler(async (req, res) => {
  const match = dateMatch(req.query);

  const result = await Lead.aggregate([
    { $match: match },

    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        value: { $sum: { $ifNull: ['$value', 0] } },
      },
    },

    { $sort: { count: -1 } },
  ]);

  // Keep the existing response rows unchanged.
  const statusMap = Object.fromEntries(
    result.map((row) => [
      row._id,
      {
        count: row.count || 0,
        value: row.value || 0,
      },
    ])
  );

  const totalLeads = result.reduce(
    (sum, row) => sum + (row.count || 0),
    0
  );

  const totalValue = result.reduce(
    (sum, row) => sum + (row.value || 0),
    0
  );

  // ----------------------------------------------------
  // Funnel
  // ----------------------------------------------------

  const funnel = LEAD_FUNNEL_STAGES.map((stage, index) => {
    const count = statusMap[stage]?.count || 0;
    const value = statusMap[stage]?.value || 0;

    let conversionRate = null;
    let dropOff = null;

    if (index === 0) {
      conversionRate = totalLeads
        ? Math.round((count / totalLeads) * 1000) / 10
        : 0;
    } else {
      const previousCount =
        statusMap[LEAD_FUNNEL_STAGES[index - 1]]?.count || 0;

      conversionRate = previousCount
        ? Math.round((count / previousCount) * 1000) / 10
        : 0;

      dropOff = Math.max(previousCount - count, 0);
    }

    return {
      stage,
      count,
      value,
      conversionRate,
      dropOff,
    };
  });

  // ----------------------------------------------------
  // Overall conversion
  // ----------------------------------------------------

  const wonCount = statusMap.WON?.count || 0;
  const wonValue = statusMap.WON?.value || 0;

  const overallConversionRate = totalLeads
    ? Math.round((wonCount / totalLeads) * 1000) / 10
    : 0;

  // ----------------------------------------------------
  // Stage-to-stage conversion summary
  // ----------------------------------------------------

  const conversions = funnel.map((row, index) => ({
    stage: row.stage,
    count: row.count,
    conversionRate: row.conversionRate,
    dropOff: row.dropOff,
    previousStage:
      index > 0 ? LEAD_FUNNEL_STAGES[index - 1] : null,
  }));

  sendSuccess(
    res,
    {
      // Existing frontend compatibility
      rows: result,

      // Keep old array-style consumers working.
      data: result,

      // New analytics
      totalLeads,
      totalValue,
      wonLeads: wonCount,
      wonValue,
      overallConversionRate,

      funnel,
      conversions,
    },
    'Lead conversion report fetched'
  );
});

// ======================================================
// SALES PERFORMANCE
// GET /reports/sales?from&to&owner&groupBy=day|week|month
// ======================================================

const SALES_PERIOD_FORMATS = {
  day: '%Y-%m-%d',
  week: '%G-W%V',
  month: '%Y-%m',
};

exports.sales = asyncHandler(async (req, res) => {
  const ownerMatch = {};

  if (req.query.owner) {
    if (!mongoose.isValidObjectId(req.query.owner)) {
      throw new ApiError(
        400,
        'Invalid owner',
        'INVALID_OWNER'
      );
    }

    ownerMatch.owner = new mongoose.Types.ObjectId(
      req.query.owner
    );
  }

  const closeRange = dateMatch(
    req.query,
    'closeDate'
  ).closeDate;

  const format =
    SALES_PERIOD_FORMATS[req.query.groupBy] ||
    SALES_PERIOD_FORMATS.month;

  const isWon = {
    $eq: ['$stage', 'CLOSED_WON'],
  };

  const isLost = {
    $eq: ['$stage', 'CLOSED_LOST'],
  };

  const isOpen = {
    $and: [
      { $not: [isWon] },
      { $not: [isLost] },
    ],
  };

  const sumIf = (
    cond,
    field = '$value'
  ) => ({
    $sum: {
      $cond: [cond, field, 0],
    },
  });

  const countIf = (cond) => ({
    $sum: {
      $cond: [cond, 1, 0],
    },
  });

  const scope = closeRange
    ? {
        $or: [
          {
            $expr: isOpen,
          },
          {
            $and: [
              {
                $expr: {
                  $not: [isOpen],
                },
              },
              {
                closeDate: closeRange,
              },
            ],
          },
        ],
      }
    : {};

  const groupFields = {
    wonCount: countIf(isWon),
    wonValue: sumIf(isWon),
    lostCount: countIf(isLost),
    lostValue: sumIf(isLost),
    openCount: countIf(isOpen),
    openValue: sumIf(isOpen),
  };

  const [result] = await Opportunity.aggregate([
    {
      $match: ownerMatch,
    },

    {
      $addFields: {
        value: {
          $ifNull: ['$value', 0],
        },

        closeDate: {
          $ifNull: [
            '$actualCloseDate',
            '$updatedAt',
          ],
        },
      },
    },

    {
      $match: scope,
    },

    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              ...groupFields,
            },
          },
        ],

        byUser: [
          {
            $group: {
              _id: '$owner',
              ...groupFields,
            },
          },

          {
            $lookup: {
              from: User.collection.name,
              localField: '_id',
              foreignField: '_id',
              as: 'user',
            },
          },

          {
            $addFields: {
              user: {
                $map: {
                  input: '$user',
                  as: 'u',
                  in: {
                    name: '$$u.name',
                    email: '$$u.email',
                  },
                },
              },
            },
          },

          {
            $sort: {
              wonValue: -1,
              openValue: -1,
            },
          },
        ],

        byPeriod: [
          {
            $match: {
              $expr: {
                $not: [isOpen],
              },
            },
          },

          {
            $group: {
              _id: {
                $dateToString: {
                  format,
                  date: '$closeDate',
                },
              },

              wonCount: countIf(isWon),
              wonValue: sumIf(isWon),
              lostCount: countIf(isLost),
              lostValue: sumIf(isLost),
            },
          },

          {
            $sort: {
              _id: 1,
            },
          },
        ],
      },
    },
  ]);

  const withRates = (row = {}) => {
    const wonCount = row.wonCount || 0;
    const lostCount = row.lostCount || 0;
    const closed = wonCount + lostCount;

    return {
      wonCount,
      wonValue: row.wonValue || 0,
      lostCount,
      lostValue: row.lostValue || 0,
      openCount: row.openCount || 0,
      openValue: row.openValue || 0,

      winRate: closed
        ? Math.round(
            (wonCount / closed) * 1000
          ) / 10
        : 0,

      avgDealSize: wonCount
        ? Math.round(
            ((row.wonValue || 0) / wonCount) *
              100
          ) / 100
        : 0,
    };
  };

  const totals = withRates(
    result?.totals?.[0]
  );

  sendSuccess(
    res,
    {
      count: totals.wonCount,
      value: totals.wonValue,

      totals: {
        ...totals,
        totalSales: totals.wonValue,
      },

      byUser: (
        result?.byUser || []
      ).map((row) => ({
        owner: row._id || null,
        name:
          row.user?.[0]?.name ||
          row.user?.[0]?.email ||
          'Unassigned',
        email:
          row.user?.[0]?.email || null,
        ...withRates(row),
      })),

      byPeriod: (
        result?.byPeriod || []
      ).map((row) => ({
        period: row._id,
        ...withRates(row),
      })),

      groupBy:
        req.query.groupBy in SALES_PERIOD_FORMATS
          ? req.query.groupBy
          : 'month',
    },

    'Sales report fetched'
  );
});

// ======================================================
// PIPELINE
// ======================================================

exports.pipeline = asyncHandler(
  async (_req, res) => {
    const result =
      await Opportunity.aggregate([
        {
          $group: {
            _id: '$stage',
            count: { $sum: 1 },
            value: {
              $sum: {
                $ifNull: ['$value', 0],
              },
            },
          },
        },
      ]);

    sendSuccess(
      res,
      result,
      'Pipeline report fetched'
    );
  }
);

// ======================================================
// ACTIVITIES
// ======================================================

exports.activities = asyncHandler(
  async (req, res) => {
    const result =
      await Activity.aggregate([
        {
          $match: dateMatch(req.query),
        },

        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
          },
        },
      ]);

    sendSuccess(
      res,
      result,
      'Activity report fetched'
    );
  }
);

// ======================================================
// REVENUE
// ======================================================

exports.revenue = asyncHandler(
  async (req, res) => {
    const result =
      await Invoice.aggregate([
        {
          $match: dateMatch(
            req.query,
            'issueDate'
          ),
        },

        {
          $group: {
            _id: null,

            billed: {
              $sum: {
                $ifNull: [
                  '$grandTotal',
                  0,
                ],
              },
            },

            paid: {
              $sum: {
                $ifNull: [
                  '$amountPaid',
                  0,
                ],
              },
            },
          },
        },
      ]);

    sendSuccess(
      res,
      result[0] || {
        billed: 0,
        paid: 0,
      },
      'Revenue report fetched'
    );
  }
);