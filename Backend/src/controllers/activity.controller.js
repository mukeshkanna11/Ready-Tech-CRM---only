"use strict";

const mongoose = require("mongoose");

const Activity = require("../models/Activity");

const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const { sendSuccess } = require("../utils/apiResponse");
const { getPagination } = require("../utils/pagination");

const {
  ACTIVITY_TYPES,
  ACTIVITY_STATUS,
  ACTIVITY_PRIORITY,
  ACTIVITY_OUTCOMES,
} = Activity;

// -----------------------------------------------------
// CONSTANTS / HELPERS
// -----------------------------------------------------

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
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isValidObjectId = (value) =>
  mongoose.Types.ObjectId.isValid(value);

const getUserId = (req) =>
  req.user?._id || req.user?.id;

const validateEnum = (value, allowed, field) => {
  if (
    value !== undefined &&
    value !== null &&
    value !== ""
  ) {
    if (!allowed.includes(value)) {
      throw new ApiError(
        400,
        `Invalid ${field}. Allowed values: ${allowed.join(", ")}`
      );
    }
  }
};

const validateObjectId = (value, field) => {
  if (value && !isValidObjectId(value)) {
    throw new ApiError(
      400,
      `Invalid ${field}`
    );
  }
};

const buildBaseFilter = () => ({
  isDeleted: false,
});

// -----------------------------------------------------
// COMMON FILTERS
// -----------------------------------------------------

const applyCommonFilters = (filter, query) => {
  const {
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
  } = query;

  validateEnum(
    type,
    ACTIVITY_TYPES,
    "type"
  );

  validateEnum(
    status,
    ACTIVITY_STATUS,
    "status"
  );

  validateEnum(
    priority,
    ACTIVITY_PRIORITY,
    "priority"
  );

  validateEnum(
    outcome,
    ACTIVITY_OUTCOMES,
    "outcome"
  );

  validateObjectId(
    assignedTo,
    "assignedTo"
  );

  validateObjectId(
    createdBy,
    "createdBy"
  );

  validateObjectId(
    lead,
    "lead"
  );

  validateObjectId(
    company,
    "company"
  );

  validateObjectId(
    contact,
    "contact"
  );

  validateObjectId(
    opportunity,
    "opportunity"
  );

  if (type) {
    filter.type = type;
  }

  if (status) {
    filter.status = status;
  }

  if (priority) {
    filter.priority = priority;
  }

  if (outcome) {
    filter.outcome = outcome;
  }

  if (assignedTo) {
    filter.assignedTo = assignedTo;
  }

  if (createdBy) {
    filter.createdBy = createdBy;
  }

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

  // ---------------------------------------------------
  // DATE RANGE
  // ---------------------------------------------------

  if (from || to) {
    filter.scheduledAt = {};

    if (from) {
      const fromDate = new Date(from);

      if (Number.isNaN(fromDate.getTime())) {
        throw new ApiError(
          400,
          "Invalid from date"
        );
      }

      filter.scheduledAt.$gte = fromDate;
    }

    if (to) {
      const toDate = new Date(to);

      if (Number.isNaN(toDate.getTime())) {
        throw new ApiError(
          400,
          "Invalid to date"
        );
      }

      toDate.setHours(
        23,
        59,
        59,
        999
      );

      filter.scheduledAt.$lte = toDate;
    }
  }

  // ---------------------------------------------------
  // REMINDER
  // ---------------------------------------------------

  if (reminderEnabled !== undefined) {
    filter.reminderEnabled =
      reminderEnabled === true ||
      reminderEnabled === "true";
  }

  // ---------------------------------------------------
  // OVERDUE
  // ---------------------------------------------------

  if (
    overdue === true ||
    overdue === "true"
  ) {
    filter.scheduledAt = {
      ...(filter.scheduledAt || {}),
      $lt: new Date(),
    };

    filter.status = {
      $nin: [
        "COMPLETED",
        "CANCELLED",
      ],
    };
  }

  // ---------------------------------------------------
  // UPCOMING
  // ---------------------------------------------------

  if (
    upcoming === true ||
    upcoming === "true"
  ) {
    filter.scheduledAt = {
      ...(filter.scheduledAt || {}),
      $gte: new Date(),
    };

    filter.status = {
      $nin: [
        "COMPLETED",
        "CANCELLED",
      ],
    };
  }
};

// -----------------------------------------------------
// CREATE
// POST /activities
// -----------------------------------------------------

exports.create = asyncHandler(
  async (req, res) => {
    const userId = getUserId(req);

    if (!userId) {
      throw new ApiError(
        401,
        "Authenticated user not found"
      );
    }

    const {
      type,
      subject,
      assignedTo,
      ...payload
    } = req.body;

    if (!type) {
      throw new ApiError(
        400,
        "Activity type is required"
      );
    }

    if (
      !subject ||
      !String(subject).trim()
    ) {
      throw new ApiError(
        400,
        "Activity subject is required"
      );
    }

    validateEnum(
      type,
      ACTIVITY_TYPES,
      "type"
    );

    const finalAssignedTo =
      assignedTo || userId;

    validateObjectId(
      finalAssignedTo,
      "assignedTo"
    );

    const activity =
      await Activity.create({
        ...payload,
        type,
        subject: String(subject).trim(),
        assignedTo: finalAssignedTo,
        createdBy: userId,
      });

    const populated =
      await populateActivity(
        Activity.findById(activity._id)
      ).exec();

    return sendSuccess(
      res,
      populated,
      "Activity created successfully",
      201
    );
  }
);

// -----------------------------------------------------
// GET ALL
// GET /activities
// -----------------------------------------------------

exports.getAll = asyncHandler(
  async (req, res) => {
    const {
  page,
  limit,
} = getPagination(req.query);

    const {
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const filter =
      buildBaseFilter();

    applyCommonFilters(
      filter,
      req.query
    );

    if (search) {
      const regex = new RegExp(
        escapeRegex(search),
        "i"
      );

      filter.$or = [
        {
          subject: regex,
        },
        {
          description: regex,
        },
        {
          outcomeNotes: regex,
        },
        {
          internalNotes: regex,
        },
        {
          phoneNumber: regex,
        },
        {
          emailAddress: regex,
        },
      ];
    }

    const allowedSortFields = [
      "createdAt",
      "updatedAt",
      "scheduledAt",
      "dueAt",
      "priority",
      "status",
      "type",
      "subject",
    ];

    const safeSortBy =
      allowedSortFields.includes(sortBy)
        ? sortBy
        : "createdAt";

    const sortDirection =
      String(sortOrder).toLowerCase() === "asc"
        ? 1
        : -1;

    const skip =
      (page - 1) * limit;

    const [
      activities,
      total,
    ] = await Promise.all([
      populateActivity(
        Activity.find(filter)
          .sort({
            [safeSortBy]: sortDirection,
          })
          .skip(skip)
          .limit(limit)
      ).exec(),

      Activity.countDocuments(filter),
    ]);

    return sendSuccess(
      res,
      {
        activities,
        pagination: {
          page,
          limit,
          total,
          totalPages:
            Math.ceil(total / limit),
        },
      },
      "Activities fetched successfully",
      200
    );
  }
);

// -----------------------------------------------------
// GET BY ID
// GET /activities/:id
// -----------------------------------------------------

exports.getById = asyncHandler(
  async (req, res) => {
    const { id } = req.params;

    validateObjectId(
      id,
      "activity id"
    );

    const activity =
      await populateActivity(
        Activity.findOne({
          _id: id,
          isDeleted: false,
        })
      ).exec();

    if (!activity) {
      throw new ApiError(
        404,
        "Activity not found"
      );
    }

    return sendSuccess(
      res,
      activity,
      "Activity fetched successfully",
      200
    );
  }
);

// -----------------------------------------------------
// UPDATE
// PUT /activities/:id
// -----------------------------------------------------

exports.update = asyncHandler(
  async (req, res) => {
    const { id } = req.params;

    validateObjectId(
      id,
      "activity id"
    );

    const {
      type,
      status,
      priority,
      outcome,
      assignedTo,
      ...updates
    } = req.body;

    if (type) {
      validateEnum(
        type,
        ACTIVITY_TYPES,
        "type"
      );

      updates.type = type;
    }

    if (status) {
      validateEnum(
        status,
        ACTIVITY_STATUS,
        "status"
      );

      updates.status = status;
    }

    if (priority) {
      validateEnum(
        priority,
        ACTIVITY_PRIORITY,
        "priority"
      );

      updates.priority = priority;
    }

    if (outcome) {
      validateEnum(
        outcome,
        ACTIVITY_OUTCOMES,
        "outcome"
      );

      updates.outcome = outcome;
    }

    if (assignedTo) {
      validateObjectId(
        assignedTo,
        "assignedTo"
      );

      updates.assignedTo =
        assignedTo;
    }

    if (
      updates.subject !== undefined
    ) {
      if (
        !String(
          updates.subject
        ).trim()
      ) {
        throw new ApiError(
          400,
          "Activity subject cannot be empty"
        );
      }

      updates.subject =
        String(
          updates.subject
        ).trim();
    }

    updates.updatedBy =
      getUserId(req);

    const activity =
      await Activity.findOneAndUpdate(
        {
          _id: id,
          isDeleted: false,
        },
        updates,
        {
          new: true,
          runValidators: true,
        }
      );

    if (!activity) {
      throw new ApiError(
        404,
        "Activity not found"
      );
    }

    const populated =
      await populateActivity(
        Activity.findById(activity._id)
      ).exec();

    return sendSuccess(
      res,
      populated,
      "Activity updated successfully",
      200
    );
  }
);

// -----------------------------------------------------
// SOFT DELETE
// DELETE /activities/:id
// -----------------------------------------------------

exports.remove = asyncHandler(
  async (req, res) => {
    const { id } = req.params;

    validateObjectId(
      id,
      "activity id"
    );

    const activity =
      await Activity.findOne({
        _id: id,
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
    activity.deletedBy =
      getUserId(req);
    activity.updatedBy =
      getUserId(req);

    await activity.save();

    return sendSuccess(
      res,
      {
        id: activity._id,
      },
      "Activity deleted successfully",
      200
    );
  }
);

// -----------------------------------------------------
// COMPLETE
// PATCH /activities/:id/complete
// -----------------------------------------------------

exports.complete = asyncHandler(
  async (req, res) => {
    const { id } = req.params;

    validateObjectId(
      id,
      "activity id"
    );

    const activity =
      await Activity.findOne({
        _id: id,
        isDeleted: false,
      });

    if (!activity) {
      throw new ApiError(
        404,
        "Activity not found"
      );
    }

    activity.status =
      "COMPLETED";

    activity.completedAt =
      new Date();

    if (
      req.body.durationMinutes !==
      undefined
    ) {
      activity.durationMinutes =
        req.body.durationMinutes;
    }

    if (req.body.outcome) {
      validateEnum(
        req.body.outcome,
        ACTIVITY_OUTCOMES,
        "outcome"
      );

      activity.outcome =
        req.body.outcome;
    }

    if (
      req.body.outcomeNotes !==
      undefined
    ) {
      activity.outcomeNotes =
        req.body.outcomeNotes;
    }

    activity.updatedBy =
      getUserId(req);

    await activity.save();

    const populated =
      await populateActivity(
        Activity.findById(activity._id)
      ).exec();

    return sendSuccess(
      res,
      populated,
      "Activity completed successfully",
      200
    );
  }
);

// -----------------------------------------------------
// CANCEL
// PATCH /activities/:id/cancel
// -----------------------------------------------------

exports.cancel = asyncHandler(
  async (req, res) => {
    const { id } = req.params;

    validateObjectId(
      id,
      "activity id"
    );

    const activity =
      await Activity.findOne({
        _id: id,
        isDeleted: false,
      });

    if (!activity) {
      throw new ApiError(
        404,
        "Activity not found"
      );
    }

    activity.status =
      "CANCELLED";

    activity.updatedBy =
      getUserId(req);

    await activity.save();

    const populated =
      await populateActivity(
        Activity.findById(activity._id)
      ).exec();

    return sendSuccess(
      res,
      populated,
      "Activity cancelled successfully",
      200
    );
  }
);

// -----------------------------------------------------
// START
// PATCH /activities/:id/start
// -----------------------------------------------------

exports.start = asyncHandler(
  async (req, res) => {
    const { id } = req.params;

    validateObjectId(
      id,
      "activity id"
    );

    const activity =
      await Activity.findOne({
        _id: id,
        isDeleted: false,
      });

    if (!activity) {
      throw new ApiError(
        404,
        "Activity not found"
      );
    }

    activity.status =
      "IN_PROGRESS";

    activity.startedAt =
      new Date();

    activity.updatedBy =
      getUserId(req);

    await activity.save();

    const populated =
      await populateActivity(
        Activity.findById(activity._id)
      ).exec();

    return sendSuccess(
      res,
      populated,
      "Activity started successfully",
      200
    );
  }
);

// -----------------------------------------------------
// ASSIGN
// PATCH /activities/:id/assign
// -----------------------------------------------------

exports.assign = asyncHandler(
  async (req, res) => {
    const { id } = req.params;
    const { assignedTo } = req.body;

    validateObjectId(
      id,
      "activity id"
    );

    if (!assignedTo) {
      throw new ApiError(
        400,
        "assignedTo is required"
      );
    }

    validateObjectId(
      assignedTo,
      "assignedTo"
    );

    const activity =
      await Activity.findOne({
        _id: id,
        isDeleted: false,
      });

    if (!activity) {
      throw new ApiError(
        404,
        "Activity not found"
      );
    }

    activity.assignedTo =
      assignedTo;

    activity.updatedBy =
      getUserId(req);

    await activity.save();

    const populated =
      await populateActivity(
        Activity.findById(activity._id)
      ).exec();

    return sendSuccess(
      res,
      populated,
      "Activity assigned successfully",
      200
    );
  }
);

// -----------------------------------------------------
// LEAD TIMELINE
// GET /activities/lead/:leadId
// -----------------------------------------------------

exports.getLeadTimeline =
  asyncHandler(
    async (req, res) => {
      const { leadId } = req.params;

      validateObjectId(
        leadId,
        "lead id"
      );

      const activities =
        await populateActivity(
          Activity.find({
            lead: leadId,
            isDeleted: false,
          }).sort({
            scheduledAt: -1,
            createdAt: -1,
          })
        ).exec();

      return sendSuccess(
        res,
        {
          activities,
          total: activities.length,
        },
        "Lead activity timeline fetched successfully",
        200
      );
    }
  );

// -----------------------------------------------------
// COMPANY TIMELINE
// GET /activities/company/:companyId
// -----------------------------------------------------

exports.getCompanyTimeline =
  asyncHandler(
    async (req, res) => {
      const { companyId } =
        req.params;

      validateObjectId(
        companyId,
        "company id"
      );

      const activities =
        await populateActivity(
          Activity.find({
            company: companyId,
            isDeleted: false,
          }).sort({
            scheduledAt: -1,
            createdAt: -1,
          })
        ).exec();

      return sendSuccess(
        res,
        {
          activities,
          total: activities.length,
        },
        "Company activity timeline fetched successfully",
        200
      );
    }
  );

// -----------------------------------------------------
// CONTACT TIMELINE
// GET /activities/contact/:contactId
// -----------------------------------------------------

exports.getContactTimeline =
  asyncHandler(
    async (req, res) => {
      const { contactId } =
        req.params;

      validateObjectId(
        contactId,
        "contact id"
      );

      const activities =
        await populateActivity(
          Activity.find({
            contact: contactId,
            isDeleted: false,
          }).sort({
            scheduledAt: -1,
            createdAt: -1,
          })
        ).exec();

      return sendSuccess(
        res,
        {
          activities,
          total: activities.length,
        },
        "Contact activity timeline fetched successfully",
        200
      );
    }
  );

// -----------------------------------------------------
// OPPORTUNITY TIMELINE
// GET /activities/opportunity/:opportunityId
// -----------------------------------------------------

exports.getOpportunityTimeline =
  asyncHandler(
    async (req, res) => {
      const {
        opportunityId,
      } = req.params;

      validateObjectId(
        opportunityId,
        "opportunity id"
      );

      const activities =
        await populateActivity(
          Activity.find({
            opportunity:
              opportunityId,
            isDeleted: false,
          }).sort({
            scheduledAt: -1,
            createdAt: -1,
          })
        ).exec();

      return sendSuccess(
        res,
        {
          activities,
          total: activities.length,
        },
        "Opportunity activity timeline fetched successfully",
        200
      );
    }
  );

// -----------------------------------------------------
// MY ACTIVITIES
// GET /activities/my
// -----------------------------------------------------

// -----------------------------------------------------
// MY ACTIVITIES
// GET /activities/my
// -----------------------------------------------------

exports.getMyActivities =
  asyncHandler(
    async (req, res) => {
      const userId =
        getUserId(req);

      if (!userId) {
        throw new ApiError(
          401,
          "Authenticated user not found"
        );
      }

      const {
        page,
        limit,
        skip,
      } = getPagination(
        req.query
      );

      const filter =
        buildBaseFilter();

      filter.assignedTo =
        userId;

      applyCommonFilters(
        filter,
        req.query
      );

      const [
        activities,
        total,
      ] = await Promise.all([
        populateActivity(
          Activity.find(filter)
            .sort({
              scheduledAt: 1,
              createdAt: -1,
            })
            .skip(skip)
            .limit(limit)
        ).exec(),

        Activity.countDocuments(
          filter
        ),
      ]);

      return sendSuccess(
        res,
        {
          activities,
          pagination: {
            page,
            limit,
            total,
            totalPages:
              Math.ceil(
                total / limit
              ),
          },
        },
        "My activities fetched successfully",
        200
      );
    }
  );

// -----------------------------------------------------
// UPCOMING
// GET /activities/upcoming
// -----------------------------------------------------

exports.getUpcoming =
  asyncHandler(
    async (req, res) => {
      const {
        page,
        limit,
        skip,
      } = getPagination(
        req.query
      );

      const filter =
        buildBaseFilter();

      filter.scheduledAt = {
        $gte: new Date(),
      };

      filter.status = {
        $nin: [
          "COMPLETED",
          "CANCELLED",
        ],
      };

      applyCommonFilters(
        filter,
        req.query
      );

      const [
        activities,
        total,
      ] = await Promise.all([
        populateActivity(
          Activity.find(filter)
            .sort({
              scheduledAt: 1,
            })
            .skip(skip)
            .limit(limit)
        ).exec(),

        Activity.countDocuments(
          filter
        ),
      ]);

      return sendSuccess(
        res,
        {
          activities,
          pagination: {
            page,
            limit,
            total,
            totalPages:
              Math.ceil(
                total / limit
              ),
          },
        },
        "Upcoming activities fetched successfully",
        200
      );
    }
  );

// -----------------------------------------------------
// OVERDUE
// GET /activities/overdue
// -----------------------------------------------------

exports.getOverdue =
  asyncHandler(
    async (req, res) => {
      const {
        page,
        limit,
        skip,
      } = getPagination(
        req.query
      );

      const filter =
        buildBaseFilter();

      filter.scheduledAt = {
        $lt: new Date(),
      };

      filter.status = {
        $nin: [
          "COMPLETED",
          "CANCELLED",
        ],
      };

      applyCommonFilters(
        filter,
        req.query
      );

      const [
        activities,
        total,
      ] = await Promise.all([
        populateActivity(
          Activity.find(filter)
            .sort({
              scheduledAt: 1,
            })
            .skip(skip)
            .limit(limit)
        ).exec(),

        Activity.countDocuments(
          filter
        ),
      ]);

      return sendSuccess(
        res,
        {
          activities,
          pagination: {
            page,
            limit,
            total,
            totalPages:
              Math.ceil(
                total / limit
              ),
          },
        },
        "Overdue activities fetched successfully",
        200
      );
    }
  );
// -----------------------------------------------------
// CALENDAR
// GET /activities/calendar
// -----------------------------------------------------

exports.getCalendar =
  asyncHandler(
    async (req, res) => {
      const {
        from,
        to,
        assignedTo,
      } = req.query;

      if (!from || !to) {
        throw new ApiError(
          400,
          "from and to dates are required"
        );
      }

      const fromDate =
        new Date(from);

      const toDate =
        new Date(to);

      if (
        Number.isNaN(
          fromDate.getTime()
        )
      ) {
        throw new ApiError(
          400,
          "Invalid from date"
        );
      }

      if (
        Number.isNaN(
          toDate.getTime()
        )
      ) {
        throw new ApiError(
          400,
          "Invalid to date"
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

      if (assignedTo) {
        validateObjectId(
          assignedTo,
          "assignedTo"
        );

        filter.assignedTo =
          assignedTo;
      }

      const activities =
        await populateActivity(
          Activity.find(filter)
            .sort({
              scheduledAt: 1,
            })
        ).exec();

      return sendSuccess(
        res,
        {
          activities,
          from: fromDate,
          to: toDate,
          total: activities.length,
        },
        "Activity calendar fetched successfully",
        200
      );
    }
  );

// -----------------------------------------------------
// STATS
// GET /activities/stats
// -----------------------------------------------------

exports.getStats =
  asyncHandler(
    async (req, res) => {
      const filter =
        buildBaseFilter();

      applyCommonFilters(
        filter,
        req.query
      );

      const now =
        new Date();

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
        Activity.countDocuments(
          filter
        ),

        Activity.countDocuments({
          ...filter,
          status: "PENDING",
        }),

        Activity.countDocuments({
          ...filter,
          status: "IN_PROGRESS",
        }),

        Activity.countDocuments({
          ...filter,
          status: "COMPLETED",
        }),

        Activity.countDocuments({
          ...filter,
          status: "CANCELLED",
        }),

        Activity.countDocuments({
          ...filter,
          scheduledAt: {
            ...(filter.scheduledAt || {}),
            $lt: now,
          },
          status: {
            $nin: [
              "COMPLETED",
              "CANCELLED",
            ],
          },
        }),

        Activity.aggregate([
          {
            $match: filter,
          },
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
          {
            $match: filter,
          },
          {
            $group: {
              _id: "$priority",
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
          {
            $match: {
              ...filter,
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
        },
        "Activity statistics fetched successfully",
        200
      );
    }
  );

// -----------------------------------------------------
// RESTORE
// PATCH /activities/:id/restore
// -----------------------------------------------------

exports.restore =
  asyncHandler(
    async (req, res) => {
      const { id } = req.params;

      validateObjectId(
        id,
        "activity id"
      );

      const activity =
        await Activity.findOne({
          _id: id,
          isDeleted: true,
        });

      if (!activity) {
        throw new ApiError(
          404,
          "Deleted activity not found"
        );
      }

      activity.isDeleted =
        false;

      activity.deletedAt =
        undefined;

      activity.deletedBy =
        undefined;

      activity.updatedBy =
        getUserId(req);

      await activity.save();

      const populated =
        await populateActivity(
          Activity.findById(activity._id)
        ).exec();

      return sendSuccess(
        res,
        populated,
        "Activity restored successfully",
        200
      );
    }
  );