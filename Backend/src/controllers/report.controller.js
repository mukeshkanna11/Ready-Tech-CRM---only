'use strict';

const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');
const { sendSuccess } = require('../utils/apiResponse');
const Lead = require('../models/Lead');
const Opportunity = require('../models/Opportunity');
const Activity = require('../models/Activity');
const Invoice = require('../models/Invoice');
const SalesOrder = require('../models/SalesOrder');
const { resolveOwnerIds } = require('./team.controller');

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
// SCOPE HELPERS
// ======================================================

// Lead/Activity carry a workspace; legacy rows have none.
const workspaceScope = (req) => ({
  workspace: { $in: [req.user?.workspace || null, null] },
});

// ?owner/?team/?territory -> { [field]: { $in: ids } } or {}
const ownerScope = async (req, field) => {
  const ids = await resolveOwnerIds(req);
  return ids ? { [field]: { $in: ids } } : {};
};

const pct = (part, whole) =>
  whole ? Math.round((part / whole) * 1000) / 10 : 0;

const userNames = async (ids) => {
  const users = await User.find({ _id: { $in: ids.filter(Boolean) } })
    .select('name email')
    .lean();
  return Object.fromEntries(users.map((u) => [String(u._id), u.name || u.email]));
};

const SOURCE_PATTERN = /^[A-Z][A-Z0-9_]{1,49}$/;
const LEAD_STATUSES = [...LEAD_FUNNEL_STAGES, 'LOST'];

// ======================================================
// LEAD REPORT + CONVERSION ANALYTICS
// GET /reports/leads?from&to&owner&team&territory&source&status
// ======================================================
//
// Funnel uses the current lead status: a lead at a later
// stage is counted as having reached every earlier stage
// (`count` = reached, `current` = currently at the stage).
// LOST leads count only towards the first stage.

const LEAD_GROUP = {
  total: { $sum: 1 },
  won: { $sum: { $cond: [{ $eq: ['$status', 'WON'] }, 1, 0] } },
  lost: { $sum: { $cond: [{ $eq: ['$status', 'LOST'] }, 1, 0] } },
  value: { $sum: { $ifNull: ['$value', 0] } },
  wonValue: {
    $sum: { $cond: [{ $eq: ['$status', 'WON'] }, { $ifNull: ['$value', 0] }, 0] },
  },
};

const shapeLeadGroup = (row) => ({
  total: row.total || 0,
  won: row.won || 0,
  lost: row.lost || 0,
  open: Math.max((row.total || 0) - (row.won || 0) - (row.lost || 0), 0),
  value: row.value || 0,
  wonValue: row.wonValue || 0,
  conversionRate: pct(row.won || 0, row.total || 0),
});

exports.leads = asyncHandler(async (req, res) => {
  const match = {
    ...dateMatch(req.query),
    ...workspaceScope(req),
    ...(await ownerScope(req, 'assignedTo')),
  };

  if (req.query.source) {
    const source = String(req.query.source).toUpperCase();
    if (!SOURCE_PATTERN.test(source)) {
      throw new ApiError(400, 'Invalid source', 'INVALID_SOURCE');
    }
    match.source = source;
  }

  if (req.query.status) {
    const status = String(req.query.status).toUpperCase();
    if (!LEAD_STATUSES.includes(status)) {
      throw new ApiError(400, 'Invalid status', 'INVALID_STATUS');
    }
    match.status = status;
  }

  const [facets] = await Lead.aggregate([
    { $match: match },
    {
      $facet: {
        byStatus: [
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
              value: { $sum: { $ifNull: ['$value', 0] } },
            },
          },
          { $sort: { count: -1 } },
        ],
        bySource: [
          { $group: { _id: { $ifNull: ['$source', 'OTHER'] }, ...LEAD_GROUP } },
          { $sort: { total: -1 } },
        ],
        byOwner: [
          { $group: { _id: '$assignedTo', ...LEAD_GROUP } },
          { $sort: { total: -1 } },
        ],
        conversionTime: [
          { $match: { status: 'WON', convertedAt: { $ne: null } } },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              avgMs: { $avg: { $subtract: ['$convertedAt', '$createdAt'] } },
            },
          },
        ],
      },
    },
  ]);

  const result = facets.byStatus;
  const statusMap = Object.fromEntries(
    result.map((row) => [row._id, { count: row.count || 0, value: row.value || 0 }]),
  );
  const countOf = (stage) => statusMap[stage]?.count || 0;

  const totalLeads = result.reduce((sum, row) => sum + (row.count || 0), 0);
  const totalValue = result.reduce((sum, row) => sum + (row.value || 0), 0);

  const reached = LEAD_FUNNEL_STAGES.map((_, index) =>
    index === 0
      ? totalLeads
      : LEAD_FUNNEL_STAGES.slice(index).reduce((sum, stage) => sum + countOf(stage), 0),
  );

  const funnel = LEAD_FUNNEL_STAGES.map((stage, index) => ({
    stage,
    count: reached[index],
    current: countOf(stage),
    value: statusMap[stage]?.value || 0,
    conversionRate:
      index === 0 ? pct(reached[0], totalLeads) : pct(reached[index], reached[index - 1]),
    dropOff: index === 0 ? null : Math.max(reached[index - 1] - reached[index], 0),
  }));

  const conversions = funnel.map((row, index) => ({
    stage: row.stage,
    count: row.count,
    conversionRate: row.conversionRate,
    dropOff: row.dropOff,
    previousStage: index > 0 ? LEAD_FUNNEL_STAGES[index - 1] : null,
  }));

  const names = await userNames(facets.byOwner.map((row) => row._id));
  const time = facets.conversionTime[0];

  sendSuccess(
    res,
    {
      // Existing frontend compatibility
      rows: result,
      data: result,

      totalLeads,
      totalValue,
      wonLeads: countOf('WON'),
      wonValue: statusMap.WON?.value || 0,
      lostLeads: countOf('LOST'),
      overallConversionRate: pct(countOf('WON'), totalLeads),
      avgConversionDays: time
        ? Math.round((time.avgMs / 86400000) * 10) / 10
        : null,
      convertedWithDate: time?.count || 0,

      funnel,
      conversions,
      bySource: facets.bySource.map((row) => ({ source: row._id, ...shapeLeadGroup(row) })),
      byOwner: facets.byOwner.map((row) => ({
        owner: row._id || null,
        name: row._id ? names[String(row._id)] || 'Unknown user' : 'Unassigned',
        ...shapeLeadGroup(row),
      })),
    },
    'Lead conversion report fetched',
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
  const ownerMatch = await ownerScope(req, 'owner');

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
// GET /reports/pipeline?owner&team&territory&stage
// ======================================================

exports.pipeline = asyncHandler(async (req, res) => {
  const match = await ownerScope(req, 'owner');

  if (req.query.stage) {
    const stage = String(req.query.stage).toUpperCase();
    if (!/^[A-Z][A-Z0-9_]{0,49}$/.test(stage)) {
      throw new ApiError(400, 'Invalid stage', 'INVALID_STAGE');
    }
    match.stage = stage;
  }

  const result = await Opportunity.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$stage',
        count: { $sum: 1 },
        value: { $sum: { $ifNull: ['$value', 0] } },
      },
    },
  ]);

  sendSuccess(res, result, 'Pipeline report fetched');
});

// ======================================================
// ACTIVITIES
// GET /reports/activities?from&to&owner&team&territory
// ======================================================

exports.activities = asyncHandler(async (req, res) => {
  const result = await Activity.aggregate([
    {
      $match: {
        ...dateMatch(req.query),
        ...workspaceScope(req),
        ...(await ownerScope(req, 'assignedTo')),
        isDeleted: { $ne: true },
      },
    },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } },
      },
    },
    { $sort: { count: -1 } },
  ]);

  sendSuccess(res, result, 'Activity report fetched');
});

// ======================================================
// SALES ORDERS
// GET /reports/sales-orders?from&to&owner&team&territory
// ======================================================

exports.salesOrders = asyncHandler(async (req, res) => {
  const rows = await SalesOrder.aggregate([
    {
      $match: {
        ...dateMatch(req.query, 'orderDate'),
        ...(await ownerScope(req, 'owner')),
      },
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        value: { $sum: { $ifNull: ['$grandTotal', 0] } },
        paid: { $sum: { $ifNull: ['$amountPaid', 0] } },
      },
    },
    { $sort: { count: -1 } },
  ]);

  const totals = rows.reduce(
    (acc, row) => ({
      count: acc.count + row.count,
      value: acc.value + row.value,
      paid: acc.paid + row.paid,
    }),
    { count: 0, value: 0, paid: 0 },
  );

  sendSuccess(res, { rows, totals }, 'Sales order report fetched');
});

// ======================================================
// SALES PERFORMANCE (per salesperson)
// GET /reports/performance?from&to&owner&team&territory
// ======================================================
//
// leads*         -> leads created in range, by assignedTo
// opportunities  -> created in range (created), closed in
//                   range (won/lost by actualCloseDate),
//                   currently open (pipelineValue)
// activities     -> completed in range / follow-ups created

exports.performance = asyncHandler(async (req, res) => {
  const ids = await resolveOwnerIds(req);
  const workspace = req.user?.workspace || null;

  const users = await User.find({
    workspace,
    ...(ids ? { _id: { $in: ids } } : {}),
  })
    .select('name email isActive')
    .lean();
  const userIds = users.map((u) => u._id);

  const created = dateMatch(req.query).createdAt;
  const closed = dateMatch(req.query, 'closedOn').closedOn;
  const completed = dateMatch(req.query, 'completedAt').completedAt;
  const inRange = (range) => (range ? [{ $match: { d: range } }] : []);
  const isStatus = (status) => ({ $cond: [{ $eq: ['$status', status] }, 1, 0] });
  const inRangeExpr = (field, range) => ({
    $and: [
      ...(range?.$gte ? [{ $gte: [field, range.$gte] }] : []),
      ...(range?.$lte ? [{ $lte: [field, range.$lte] }] : []),
    ],
  });

  const [leadRows, oppRows, activityRows] = await Promise.all([
    Lead.aggregate([
      {
        $match: {
          assignedTo: { $in: userIds },
          ...workspaceScope(req),
          ...(created ? { createdAt: created } : {}),
        },
      },
      {
        $group: {
          _id: '$assignedTo',
          leadsAssigned: { $sum: 1 },
          leadsWon: { $sum: isStatus('WON') },
        },
      },
    ]),

    Opportunity.aggregate([
      { $match: { owner: { $in: userIds } } },
      {
        $addFields: {
          value: { $ifNull: ['$value', 0] },
          closedOn: { $ifNull: ['$actualCloseDate', '$updatedAt'] },
        },
      },
      {
        $addFields: {
          isCreated: inRangeExpr('$createdAt', created),
          isClosed: inRangeExpr('$closedOn', closed),
        },
      },
      {
        $group: {
          _id: '$owner',
          created: { $sum: { $cond: ['$isCreated', 1, 0] } },
          won: { $sum: { $cond: [{ $and: ['$isClosed', { $eq: ['$status', 'WON'] }] }, 1, 0] } },
          lost: { $sum: { $cond: [{ $and: ['$isClosed', { $eq: ['$status', 'LOST'] }] }, 1, 0] } },
          wonRevenue: {
            $sum: { $cond: [{ $and: ['$isClosed', { $eq: ['$status', 'WON'] }] }, '$value', 0] },
          },
          openCount: { $sum: isStatus('OPEN') },
          pipelineValue: {
            $sum: { $cond: [{ $eq: ['$status', 'OPEN'] }, '$value', 0] },
          },
        },
      },
    ]),

    Activity.aggregate([
      {
        $match: {
          assignedTo: { $in: userIds },
          ...workspaceScope(req),
          isDeleted: { $ne: true },
        },
      },
      {
        $facet: {
          completed: [
            { $match: { status: 'COMPLETED' } },
            { $addFields: { d: { $ifNull: ['$completedAt', '$updatedAt'] } } },
            ...inRange(completed),
            { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
          ],
          followUps: [
            { $match: { type: 'FOLLOW_UP' } },
            { $addFields: { d: '$createdAt' } },
            ...inRange(created),
            {
              $group: {
                _id: '$assignedTo',
                count: { $sum: 1 },
                done: { $sum: isStatus('COMPLETED') },
              },
            },
          ],
        },
      },
    ]),
  ]);

  const byId = (rows) => Object.fromEntries(rows.map((r) => [String(r._id), r]));
  const leadMap = byId(leadRows);
  const oppMap = byId(oppRows);
  const doneMap = byId(activityRows[0].completed);
  const followMap = byId(activityRows[0].followUps);

  const rows = users
    .map((user) => {
      const key = String(user._id);
      const lead = leadMap[key] || {};
      const opp = oppMap[key] || {};
      const won = opp.won || 0;
      const lost = opp.lost || 0;

      return {
        user: user._id,
        name: user.name || user.email,
        email: user.email,
        isActive: user.isActive !== false,
        leadsAssigned: lead.leadsAssigned || 0,
        leadsWon: lead.leadsWon || 0,
        conversionRate: pct(lead.leadsWon || 0, lead.leadsAssigned || 0),
        opportunitiesCreated: opp.created || 0,
        opportunitiesWon: won,
        opportunitiesLost: lost,
        winRate: pct(won, won + lost),
        openOpportunities: opp.openCount || 0,
        pipelineValue: opp.pipelineValue || 0,
        wonRevenue: opp.wonRevenue || 0,
        activitiesCompleted: doneMap[key]?.count || 0,
        followUps: followMap[key]?.count || 0,
        followUpsCompleted: followMap[key]?.done || 0,
      };
    })
    .sort((a, b) => b.wonRevenue - a.wonRevenue || b.opportunitiesWon - a.opportunitiesWon)
    .map((row, index) => ({ rank: index + 1, ...row }));

  const sum = (field) => rows.reduce((total, row) => total + row[field], 0);
  const totals = {
    salespeople: rows.length,
    leadsAssigned: sum('leadsAssigned'),
    leadsWon: sum('leadsWon'),
    opportunitiesCreated: sum('opportunitiesCreated'),
    opportunitiesWon: sum('opportunitiesWon'),
    opportunitiesLost: sum('opportunitiesLost'),
    pipelineValue: sum('pipelineValue'),
    wonRevenue: sum('wonRevenue'),
    activitiesCompleted: sum('activitiesCompleted'),
    followUps: sum('followUps'),
  };
  totals.winRate = pct(totals.opportunitiesWon, totals.opportunitiesWon + totals.opportunitiesLost);
  totals.conversionRate = pct(totals.leadsWon, totals.leadsAssigned);

  sendSuccess(res, { totals, rows }, 'Sales performance fetched');
});

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