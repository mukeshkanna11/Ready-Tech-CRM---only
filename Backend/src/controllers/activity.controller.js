// src/controllers/activity.controller.js

"use strict";

const Activity = require("../models/Activity");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const {
  sendSuccess,
  sendError,
} = require("../utils/apiResponse");
const {
  parsePagination,
} = require("../utils/pagination");

// ============================================================
// HELPERS
// ============================================================

const POPULATE = [
  {
    path: "assignedTo",
    select: "name email role",
  },
  {
    path: "createdBy",
    select: "name email role",
  },
  {
    path: "updatedBy",
    select: "name email role",
  },
  {
    path: "lead",
    select: "name email phone company status source",
  },
  {
    path: "company",
    select: "name email phone website industry",
  },
  {
    path: "contact",
    select: "name email phone designation company",
  },
  {
    path: "opportunity",
    select: "name stage value probability status",
  },
  {
    path: "deletedBy",
    select: "name email",
  },
];

const populateActivity = (query) => {
  POPULATE.forEach((item) => {
    query = query.populate(item);
  });

  return query;
};

const escapeRegex = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ============================================================
// CREATE ACTIVITY
// ============================================================

/**
 * POST /api/v1/activities
 */
exports.create = asyncHandler(async (req, res) => {
  const {
    type,
    subject,
    description,
    scheduledAt,
    dueAt,
    status,
    priority,
    outcome,
    outcomeNotes,
    assignedTo,
    lead,
    company,
    contact,
    opportunity,
    location,
    meetingLink,
    phoneNumber,
    emailAddress,
    reminderEnabled,
    reminderAt,
    isRecurring,
    recurrence,
    tags,
    attachments,
    internalNotes,
    durationMinutes,
    startedAt,
  } = req.body;

  if (!type) {
    throw new ApiError(400, "Activity type is required");
  }

  if (!subject) {
    throw new ApiError(400, "Activity subject is required");
  }

  // ----------------------------------------------------------
  // At least one CRM entity should normally be connected.
  // But standalone activities are allowed.
  // ----------------------------------------------------------

  const activity = await Activity.create({
    type,
    subject,
    description,

    scheduledAt,
    dueAt,

    status: status || "PENDING",
    priority: priority || "MEDIUM",

    outcome,
    outcomeNotes,

    assignedTo: assignedTo || req.user._id,
    createdBy: req.user._id,

    lead,
    company,
    contact,
    opportunity,

    location,
    meetingLink,
    phoneNumber,
    emailAddress,

    reminderEnabled: Boolean(reminderEnabled),
    reminderAt,

    isRecurring: Boolean(isRecurring),
    recurrence,

    tags,
    attachments,
    internalNotes,

    durationMinutes,
    startedAt,
  });

  let query = Activity.findById(activity._id);

  query = populateActivity(query);

  const populatedActivity = await query;

  return sendSuccess(
    res,
    201,
    "Activity created successfully",
    populatedActivity
  );
});

// ============================================================
// GET ALL ACTIVITIES
// ============================================================

/**
 * GET /api/v1/activities
 *
 * Supported:
 *
 * ?page=1
 * ?limit=20
 * ?search=meeting
 * ?type=CALL
 * ?status=PENDING
 * ?priority=HIGH
 * ?assignedTo=USER_ID
 * ?lead=LEAD_ID
 * ?company=COMPANY_ID
 * ?contact=CONTACT_ID
 * ?opportunity=OPPORTUNITY_ID
 * ?from=2026-08-01
 * ?to=2026-08-31
 * ?sortBy=scheduledAt
 * ?sortOrder=asc
 */
exports.getAll = asyncHandler(async (req, res) => {
  const {
    page,
    limit,
    skip,
  } = parsePagination(req.query);

  const {
    search,
    type,
    status,
    priority,
    assignedTo,
    createdBy,
    lead,
    company,
    contact,
    opportunity,
    outcome,
    from,
    to,
    overdue,
    upcoming,
    reminderEnabled,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = req.query;

  const filter = {
    isDeleted: false,
  };

  // ----------------------------------------------------------
  // SEARCH
  // ----------------------------------------------------------

  if (search?.trim()) {
    const regex = new RegExp(
      escapeRegex(search.trim()),
      "i"
    );

    filter.$or = [
      { subject: regex },
      { description: regex },
      { outcomeNotes: regex },
      { internalNotes: regex },
      { emailAddress: regex },
      { phoneNumber: regex },
      { location: regex },
      { tags: regex },
    ];
  }

  // ----------------------------------------------------------
  // ENUM FILTERS
  // ----------------------------------------------------------

  if (type) {
    filter.type = type.toUpperCase();
  }

  if (status) {
    filter.status = status.toUpperCase();
  }

  if (priority) {
    filter.priority = priority.toUpperCase();
  }

  if (outcome) {
    filter.outcome = outcome.toUpperCase();
  }

  // ----------------------------------------------------------
  // USER FILTERS
  // ----------------------------------------------------------

  if (assignedTo) {
    filter.assignedTo = assignedTo;
  }

  if (createdBy) {
    filter.createdBy = createdBy;
  }

  // ----------------------------------------------------------
  // CRM RELATION FILTERS
  // ----------------------------------------------------------

  if (lead) {
    filter.lead = lead;
  }

  if (company) {
    filter.company = company;
  }

  if (contact) {
    filter.contact = contact;
  }

  if (opportunity) {
    filter.opportunity = opportunity;
  }

  // ----------------------------------------------------------
  // DATE RANGE
  // ----------------------------------------------------------

  if (from || to) {
    filter.scheduledAt = {};

    if (from) {
      const fromDate = new Date(from);

      if (Number.isNaN(fromDate.getTime())) {
        throw new ApiError(400, "Invalid from date");
      }

      filter.scheduledAt.$gte = fromDate;
    }

    if (to) {
      const toDate = new Date(to);

      if (Number.isNaN(toDate.getTime())) {
        throw new ApiError(400, "Invalid to date");
      }

      // Include complete "to" day when only a date is supplied.
      if (
        /^\d{4}-\d{2}-\d{2}$/.test(to)
      ) {
        toDate.setHours(23, 59, 59, 999);
      }

      filter.scheduledAt.$lte = toDate;
    }
  }

  // ----------------------------------------------------------
  // OVERDUE
  // ----------------------------------------------------------

  if (overdue === "true") {
    filter.scheduledAt = {
      ...(filter.scheduledAt || {}),
      $lt: new Date(),
    };

    filter.status = {
      $nin: ["COMPLETED", "CANCELLED"],
    };
  }

  // ----------------------------------------------------------
  // UPCOMING
  // ----------------------------------------------------------

  if (upcoming === "true") {
    filter.scheduledAt = {
      ...(filter.scheduledAt || {}),
      $gte: new Date(),
    };

    filter.status = {
      $nin: ["COMPLETED", "CANCELLED"],
    };
  }

  // ----------------------------------------------------------
  // REMINDER
  // ----------------------------------------------------------

  if (reminderEnabled !== undefined) {
    filter.reminderEnabled =
      reminderEnabled === "true";
  }

  // ----------------------------------------------------------
  // SORT
  // ----------------------------------------------------------

  const allowedSortFields = [
    "createdAt",
    "updatedAt",
    "scheduledAt",
    "dueAt",
    "completedAt",
    "subject",
    "priority",
    "status",
    "type",
  ];

  const safeSortField = allowedSortFields.includes(
    sortBy
  )
    ? sortBy
    : "createdAt";

  const safeSortOrder =
    sortOrder === "asc" ? 1 : -1;

  const sort = {
    [safeSortField]: safeSortOrder,
  };

  // ----------------------------------------------------------
  // QUERY
  // ----------------------------------------------------------

  const [activities, total] = await Promise.all([
    populateActivity(
      Activity.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean()
    ),

    Activity.countDocuments(filter),
  ]);

  const totalPages =
    Math.ceil(total / limit) || 1;

  return sendSuccess(
    res,
    200,
    "Activities fetched successfully",
    {
      activities,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    }
  );
});

// ============================================================
// GET ACTIVITY BY ID
// ============================================================

/**
 * GET /api/v1/activities/:id
 */
exports.getById = asyncHandler(async (req, res) => {
  let query = Activity.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  query = populateActivity(query);

  const activity = await query;

  if (!activity) {
    throw new ApiError(
      404,
      "Activity not found"
    );
  }

  return sendSuccess(
    res,
    200,
    "Activity fetched successfully",
    activity
  );
});

// ============================================================
// UPDATE ACTIVITY
// ============================================================

/**
 * PUT /api/v1/activities/:id
 */
exports.update = asyncHandler(async (req, res) => {
  const activity = await Activity.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  if (!activity) {
    throw new ApiError(
      404,
      "Activity not found"
    );
  }

  const allowedFields = [
    "type",
    "subject",
    "description",
    "scheduledAt",
    "dueAt",
    "status",
    "priority",
    "outcome",
    "outcomeNotes",
    "assignedTo",
    "lead",
    "company",
    "contact",
    "opportunity",
    "location",
    "meetingLink",
    "phoneNumber",
    "emailAddress",
    "reminderEnabled",
    "reminderAt",
    "isRecurring",
    "recurrence",
    "tags",
    "attachments",
    "internalNotes",
    "durationMinutes",
    "startedAt",
  ];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      activity[field] = req.body[field];
    }
  });

  activity.updatedBy = req.user._id;

  await activity.save();

  let query = Activity.findById(activity._id);

  query = populateActivity(query);

  const updatedActivity = await query;

  return sendSuccess(
    res,
    200,
    "Activity updated successfully",
    updatedActivity
  );
});

// ============================================================
// DELETE ACTIVITY - SOFT DELETE
// ============================================================

/**
 * DELETE /api/v1/activities/:id
 */
exports.remove = asyncHandler(async (req, res) => {
  const activity = await Activity.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  if (!activity) {
    throw new ApiError(
      404,
      "Activity not found"
    );
  }

  activity.isDeleted = true;
  activity.deletedAt = new Date();
  activity.deletedBy = req.user._id;

  await activity.save();

  return sendSuccess(
    res,
    200,
    "Activity deleted successfully"
  );
});

// ============================================================
// COMPLETE ACTIVITY
// ============================================================

/**
 * PATCH /api/v1/activities/:id/complete
 */
exports.complete = asyncHandler(async (req, res) => {
  const {
    outcome,
    outcomeNotes,
    durationMinutes,
  } = req.body;

  const activity = await Activity.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  if (!activity) {
    throw new ApiError(
      404,
      "Activity not found"
    );
  }

  activity.status = "COMPLETED";
  activity.completedAt = new Date();

  if (outcome !== undefined) {
    activity.outcome = outcome;
  }

  if (outcomeNotes !== undefined) {
    activity.outcomeNotes = outcomeNotes;
  }

  if (durationMinutes !== undefined) {
    activity.durationMinutes =
      durationMinutes;
  }

  activity.updatedBy = req.user._id;

  await activity.save();

  let query = Activity.findById(activity._id);

  query = populateActivity(query);

  const updatedActivity = await query;

  return sendSuccess(
    res,
    200,
    "Activity completed successfully",
    updatedActivity
  );
});

// ============================================================
// CANCEL ACTIVITY
// ============================================================

/**
 * PATCH /api/v1/activities/:id/cancel
 */
exports.cancel = asyncHandler(async (req, res) => {
  const activity = await Activity.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  if (!activity) {
    throw new ApiError(
      404,
      "Activity not found"
    );
  }

  activity.status = "CANCELLED";
  activity.updatedBy = req.user._id;

  await activity.save();

  return sendSuccess(
    res,
    200,
    "Activity cancelled successfully",
    activity
  );
});

// ============================================================
// START ACTIVITY
// ============================================================

/**
 * PATCH /api/v1/activities/:id/start
 */
exports.start = asyncHandler(async (req, res) => {
  const activity = await Activity.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  if (!activity) {
    throw new ApiError(
      404,
      "Activity not found"
    );
  }

  if (activity.status === "COMPLETED") {
    throw new ApiError(
      400,
      "Completed activity cannot be started"
    );
  }

  if (activity.status === "CANCELLED") {
    throw new ApiError(
      400,
      "Cancelled activity cannot be started"
    );
  }

  activity.status = "IN_PROGRESS";
  activity.startedAt = new Date();
  activity.updatedBy = req.user._id;

  await activity.save();

  return sendSuccess(
    res,
    200,
    "Activity started successfully",
    activity
  );
});

// ============================================================
// ASSIGN ACTIVITY
// ============================================================

/**
 * PATCH /api/v1/activities/:id/assign
 *
 * Body:
 * {
 *   "assignedTo": "USER_ID"
 * }
 */
exports.assign = asyncHandler(async (req, res) => {
  const { assignedTo } = req.body;

  if (!assignedTo) {
    throw new ApiError(
      400,
      "assignedTo is required"
    );
  }

  const activity = await Activity.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  if (!activity) {
    throw new ApiError(
      404,
      "Activity not found"
    );
  }

  activity.assignedTo = assignedTo;
  activity.updatedBy = req.user._id;

  await activity.save();

  let query = Activity.findById(activity._id);

  query = populateActivity(query);

  const updatedActivity = await query;

  return sendSuccess(
    res,
    200,
    "Activity assigned successfully",
    updatedActivity
  );
});

// ============================================================
// LEAD TIMELINE
// ============================================================

/**
 * GET /api/v1/activities/lead/:leadId
 */
exports.getLeadTimeline = asyncHandler(
  async (req, res) => {
    const activities = await populateActivity(
      Activity.find({
        lead: req.params.leadId,
        isDeleted: false,
      })
        .sort({ scheduledAt: -1, createdAt: -1 })
        .lean()
    );

    return sendSuccess(
      res,
      200,
      "Lead activity timeline fetched successfully",
      activities
    );
  }
);

// ============================================================
// COMPANY TIMELINE
// ============================================================

/**
 * GET /api/v1/activities/company/:companyId
 */
exports.getCompanyTimeline = asyncHandler(
  async (req, res) => {
    const activities = await populateActivity(
      Activity.find({
        company: req.params.companyId,
        isDeleted: false,
      })
        .sort({ scheduledAt: -1, createdAt: -1 })
        .lean()
    );

    return sendSuccess(
      res,
      200,
      "Company activity timeline fetched successfully",
      activities
    );
  }
);

// ============================================================
// CONTACT TIMELINE
// ============================================================

/**
 * GET /api/v1/activities/contact/:contactId
 */
exports.getContactTimeline = asyncHandler(
  async (req, res) => {
    const activities = await populateActivity(
      Activity.find({
        contact: req.params.contactId,
        isDeleted: false,
      })
        .sort({ scheduledAt: -1, createdAt: -1 })
        .lean()
    );

    return sendSuccess(
      res,
      200,
      "Contact activity timeline fetched successfully",
      activities
    );
  }
);

// ============================================================
// OPPORTUNITY TIMELINE
// ============================================================

/**
 * GET /api/v1/activities/opportunity/:opportunityId
 */
exports.getOpportunityTimeline =
  asyncHandler(async (req, res) => {
    const activities = await populateActivity(
      Activity.find({
        opportunity: req.params.opportunityId,
        isDeleted: false,
      })
        .sort({
          scheduledAt: -1,
          createdAt: -1,
        })
        .lean()
    );

    return sendSuccess(
      res,
      200,
      "Opportunity activity timeline fetched successfully",
      activities
    );
  });

// ============================================================
// MY ACTIVITIES
// ============================================================

/**
 * GET /api/v1/activities/my
 */
exports.getMyActivities = asyncHandler(
  async (req, res) => {
    const {
      page,
      limit,
      skip,
    } = parsePagination(req.query);

    const filter = {
      assignedTo: req.user._id,
      isDeleted: false,
    };

    if (req.query.status) {
      filter.status =
        req.query.status.toUpperCase();
    }

    if (req.query.type) {
      filter.type =
        req.query.type.toUpperCase();
    }

    const [activities, total] =
      await Promise.all([
        populateActivity(
          Activity.find(filter)
            .sort({
              scheduledAt: 1,
              createdAt: -1,
            })
            .skip(skip)
            .limit(limit)
            .lean()
        ),

        Activity.countDocuments(filter),
      ]);

    const totalPages =
      Math.ceil(total / limit) || 1;

    return sendSuccess(
      res,
      200,
      "My activities fetched successfully",
      {
        activities,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      }
    );
  }
);

// ============================================================
// UPCOMING ACTIVITIES
// ============================================================

/**
 * GET /api/v1/activities/upcoming
 */
exports.getUpcoming = asyncHandler(
  async (req, res) => {
    const limit = Math.min(
      Number(req.query.limit) || 20,
      100
    );

    const filter = {
      isDeleted: false,
      scheduledAt: {
        $gte: new Date(),
      },
      status: {
        $nin: [
          "COMPLETED",
          "CANCELLED",
        ],
      },
    };

    if (req.query.assignedTo) {
      filter.assignedTo =
        req.query.assignedTo;
    }

    const activities = await populateActivity(
      Activity.find(filter)
        .sort({ scheduledAt: 1 })
        .limit(limit)
        .lean()
    );

    return sendSuccess(
      res,
      200,
      "Upcoming activities fetched successfully",
      activities
    );
  }
);

// ============================================================
// OVERDUE ACTIVITIES
// ============================================================

/**
 * GET /api/v1/activities/overdue
 */
exports.getOverdue = asyncHandler(
  async (req, res) => {
    const limit = Math.min(
      Number(req.query.limit) || 50,
      100
    );

    const filter = {
      isDeleted: false,
      scheduledAt: {
        $lt: new Date(),
      },
      status: {
        $nin: [
          "COMPLETED",
          "CANCELLED",
        ],
      },
    };

    if (req.query.assignedTo) {
      filter.assignedTo =
        req.query.assignedTo;
    }

    const activities = await populateActivity(
      Activity.find(filter)
        .sort({ scheduledAt: 1 })
        .limit(limit)
        .lean()
    );

    return sendSuccess(
      res,
      200,
      "Overdue activities fetched successfully",
      activities
    );
  }
);

// ============================================================
// CALENDAR
// ============================================================

/**
 * GET /api/v1/activities/calendar?from=...&to=...
 */
exports.getCalendar = asyncHandler(
  async (req, res) => {
    const { from, to } = req.query;

    if (!from || !to) {
      throw new ApiError(
        400,
        "from and to dates are required"
      );
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);

    if (
      Number.isNaN(fromDate.getTime()) ||
      Number.isNaN(toDate.getTime())
    ) {
      throw new ApiError(
        400,
        "Invalid calendar date range"
      );
    }

    toDate.setHours(
      23,
      59,
      59,
      999
    );

    const filter = {
      isDeleted: false,
      scheduledAt: {
        $gte: fromDate,
        $lte: toDate,
      },
    };

    if (req.query.assignedTo) {
      filter.assignedTo =
        req.query.assignedTo;
    }

    const activities = await populateActivity(
      Activity.find(filter)
        .sort({ scheduledAt: 1 })
        .lean()
    );

    return sendSuccess(
      res,
      200,
      "Activity calendar fetched successfully",
      activities
    );
  }
);

// ============================================================
// ACTIVITY STATISTICS
// ============================================================

/**
 * GET /api/v1/activities/stats
 */
exports.getStats = asyncHandler(
  async (req, res) => {
    const match = {
      isDeleted: false,
    };

    if (req.query.assignedTo) {
      match.assignedTo =
        req.query.assignedTo;
    }

    if (req.query.from || req.query.to) {
      match.createdAt = {};

      if (req.query.from) {
        match.createdAt.$gte =
          new Date(req.query.from);
      }

      if (req.query.to) {
        const date = new Date(
          req.query.to
        );

        date.setHours(
          23,
          59,
          59,
          999
        );

        match.createdAt.$lte = date;
      }
    }

    const [
      total,
      pending,
      inProgress,
      completed,
      cancelled,
      overdue,
      byType,
      byPriority,
      byOutcome,
    ] = await Promise.all([
      Activity.countDocuments(match),

      Activity.countDocuments({
        ...match,
        status: "PENDING",
      }),

      Activity.countDocuments({
        ...match,
        status: "IN_PROGRESS",
      }),

      Activity.countDocuments({
        ...match,
        status: "COMPLETED",
      }),

      Activity.countDocuments({
        ...match,
        status: "CANCELLED",
      }),

      Activity.countDocuments({
        ...match,
        scheduledAt: {
          $lt: new Date(),
        },
        status: {
          $nin: [
            "COMPLETED",
            "CANCELLED",
          ],
        },
      }),

      Activity.aggregate([
        { $match: match },

        {
          $group: {
            _id: "$type",
            count: {
              $sum: 1,
            },
          },
        },

        {
          $sort: {
            count: -1,
          },
        },
      ]),

      Activity.aggregate([
        { $match: match },

        {
          $group: {
            _id: "$priority",
            count: {
              $sum: 1,
            },
          },
        },
      ]),

      Activity.aggregate([
        {
          $match: {
            ...match,
            outcome: {
              $ne: null,
            },
          },
        },

        {
          $group: {
            _id: "$outcome",
            count: {
              $sum: 1,
            },
          },
        },

        {
          $sort: {
            count: -1,
          },
        },
      ]),
    ]);

    return sendSuccess(
      res,
      200,
      "Activity statistics fetched successfully",
      {
        total,
        pending,
        inProgress,
        completed,
        cancelled,
        overdue,
        byType,
        byPriority,
        byOutcome,
      }
    );
  }
);

// ============================================================
// RESTORE SOFT-DELETED ACTIVITY
// ============================================================

/**
 * PATCH /api/v1/activities/:id/restore
 */
exports.restore = asyncHandler(
  async (req, res) => {
    const activity =
      await Activity.findOne({
        _id: req.params.id,
        isDeleted: true,
      });

    if (!activity) {
      throw new ApiError(
        404,
        "Deleted activity not found"
      );
    }

    activity.isDeleted = false;
    activity.deletedAt = undefined;
    activity.deletedBy = undefined;
    activity.updatedBy = req.user._id;

    await activity.save();

    let query = Activity.findById(
      activity._id
    );

    query = populateActivity(query);

    const restoredActivity =
      await query;

    return sendSuccess(
      res,
      200,
      "Activity restored successfully",
      restoredActivity
    );
  }
);       