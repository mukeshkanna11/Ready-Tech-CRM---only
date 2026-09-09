"use strict";

const mongoose = require("mongoose");

const Task = require("../models/Task");

const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const { sendSuccess } = require("../utils/apiResponse");
const { getPagination, buildPagination } = require("../utils/pagination");

const {
  TASK_STATUS,
  TASK_PRIORITY,
} = Task;

/*
|--------------------------------------------------------------------------
| CONSTANTS
|--------------------------------------------------------------------------
*/

const POPULATE = [
  {
    path: "assignedTo",
    select: "name email avatar",
  },
  {
    path: "createdBy",
    select: "name email avatar",
  },
  {
    path: "updatedBy",
    select: "name email avatar",
  },
  {
    path: "deletedBy",
    select: "name email avatar",
  },
  {
    path: "lead",
  },
  {
    path: "company",
  },
  {
    path: "contact",
  },
  {
    path: "opportunity",
  },
];

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const isValidObjectId = (value) => {
  return mongoose.Types.ObjectId.isValid(value);
};

const validateObjectId = (value, fieldName) => {
  if (!value) return;

  if (!isValidObjectId(value)) {
    throw new ApiError(
      400,
      `Invalid ${fieldName}`,
      "VALIDATION_ERROR"
    );
  }
};

const validateEnum = (value, allowed, fieldName) => {
  if (
    value !== undefined &&
    value !== null &&
    value !== "" &&
    !allowed.includes(value)
  ) {
    throw new ApiError(
      400,
      `Invalid ${fieldName}. Allowed values: ${allowed.join(", ")}`,
      "VALIDATION_ERROR"
    );
  }
};

const getUserId = (req) => {
  const userId =
    req.user?._id ||
    req.user?.id ||
    req.user?.userId;

  if (!userId) {
    throw new ApiError(
      401,
      "Authenticated user not found",
      "UNAUTHORIZED"
    );
  }

  return userId;
};

const escapeRegex = (value = "") => {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const populateTask = (query) => {
  let result = query;

  for (const populate of POPULATE) {
    result = result.populate(populate);
  }

  return result;
};

/*
|--------------------------------------------------------------------------
| BASE FILTER
|--------------------------------------------------------------------------
*/

const buildBaseFilter = (req) => {
  return {
    isDeleted: false,
  };
};

/*
|--------------------------------------------------------------------------
| COMMON FILTERS
|--------------------------------------------------------------------------
*/

const applyCommonFilters = (filter, query = {}) => {
  const {
    status,
    priority,
    assignedTo,
    createdBy,
    lead,
    company,
    contact,
    opportunity,
    from,
    to,
    reminderEnabled,
    overdue,
    upcoming,
  } = query;

  /*
  |------------------------------------------------------------
  | STATUS
  |------------------------------------------------------------
  */

  if (status) {
    validateEnum(status, TASK_STATUS, "status");
    filter.status = status;
  }

  /*
  |------------------------------------------------------------
  | PRIORITY
  |------------------------------------------------------------
  */

  if (priority) {
    validateEnum(priority, TASK_PRIORITY, "priority");
    filter.priority = priority;
  }

  /*
  |------------------------------------------------------------
  | OBJECT IDS
  |------------------------------------------------------------
  */

  if (assignedTo) {
    validateObjectId(assignedTo, "assignedTo");
    filter.assignedTo = assignedTo;
  }

  if (createdBy) {
    validateObjectId(createdBy, "createdBy");
    filter.createdBy = createdBy;
  }

  if (lead) {
    validateObjectId(lead, "lead");
    filter.lead = lead;
  }

  if (company) {
    validateObjectId(company, "company");
    filter.company = company;
  }

  if (contact) {
    validateObjectId(contact, "contact");
    filter.contact = contact;
  }

  if (opportunity) {
    validateObjectId(opportunity, "opportunity");
    filter.opportunity = opportunity;
  }

  /*
  |------------------------------------------------------------
  | DATE RANGE
  |------------------------------------------------------------
  */

  if (from || to) {
    filter.dueAt = {};

    if (from) {
      const fromDate = new Date(from);

      if (Number.isNaN(fromDate.getTime())) {
        throw new ApiError(
          400,
          "Invalid from date",
          "VALIDATION_ERROR"
        );
      }

      filter.dueAt.$gte = fromDate;
    }

    if (to) {
      const toDate = new Date(to);

      if (Number.isNaN(toDate.getTime())) {
        throw new ApiError(
          400,
          "Invalid to date",
          "VALIDATION_ERROR"
        );
      }

      toDate.setHours(23, 59, 59, 999);

      filter.dueAt.$lte = toDate;
    }
  }

  /*
  |------------------------------------------------------------
  | REMINDER
  |------------------------------------------------------------
  */

  if (reminderEnabled !== undefined) {
    filter.reminderEnabled =
      reminderEnabled === true ||
      reminderEnabled === "true";
  }

  /*
  |------------------------------------------------------------
  | OVERDUE
  |------------------------------------------------------------
  */

  if (overdue === true || overdue === "true") {
    filter.dueAt = {
      ...(filter.dueAt || {}),
      $lt: new Date(),
    };

    filter.status = {
      $nin: ["COMPLETED", "CANCELLED"],
    };
  }

  /*
  |------------------------------------------------------------
  | UPCOMING
  |------------------------------------------------------------
  */

  if (upcoming === true || upcoming === "true") {
    filter.dueAt = {
      ...(filter.dueAt || {}),
      $gte: new Date(),
    };

    filter.status = {
      $nin: ["COMPLETED", "CANCELLED"],
    };
  }

  return filter;
};

/*
|--------------------------------------------------------------------------
| SORT
|--------------------------------------------------------------------------
*/

const getSort = (query = {}) => {
  const allowedSortFields = [
    "createdAt",
    "updatedAt",
    "title",
    "dueAt",
    "startAt",
    "priority",
    "status",
  ];

  const sortBy = allowedSortFields.includes(query.sortBy)
    ? query.sortBy
    : "createdAt";

  const sortOrder =
    String(query.sortOrder).toLowerCase() === "asc"
      ? 1
      : -1;

  return {
    [sortBy]: sortOrder,
  };
};

/*
|--------------------------------------------------------------------------
| CREATE
| POST /tasks
|--------------------------------------------------------------------------
*/

exports.create = asyncHandler(async (req, res) => {
  const userId = getUserId(req);

  const {
    title,
    description,
    status,
    priority,
    startAt,
    dueAt,
    reminderEnabled,
    reminderAt,
    assignedTo,
    lead,
    company,
    contact,
    opportunity,
  } = req.body;

  /*
  |------------------------------------------------------------
  | REQUIRED
  |------------------------------------------------------------
  */

  if (!title || !String(title).trim()) {
    throw new ApiError(
      400,
      "Task title is required",
      "VALIDATION_ERROR"
    );
  }

  /*
  |------------------------------------------------------------
  | ENUM VALIDATION
  |------------------------------------------------------------
  */

  validateEnum(status, TASK_STATUS, "status");
  validateEnum(priority, TASK_PRIORITY, "priority");

  /*
  |------------------------------------------------------------
  | ID VALIDATION
  |------------------------------------------------------------
  */

  validateObjectId(assignedTo, "assignedTo");
  validateObjectId(lead, "lead");
  validateObjectId(company, "company");
  validateObjectId(contact, "contact");
  validateObjectId(opportunity, "opportunity");

  /*
  |------------------------------------------------------------
  | DATE VALIDATION
  |------------------------------------------------------------
  */

  let parsedStartAt = null;
  let parsedDueAt = null;
  let parsedReminderAt = null;

  if (startAt) {
    parsedStartAt = new Date(startAt);

    if (Number.isNaN(parsedStartAt.getTime())) {
      throw new ApiError(
        400,
        "Invalid startAt",
        "VALIDATION_ERROR"
      );
    }
  }

  if (dueAt) {
    parsedDueAt = new Date(dueAt);

    if (Number.isNaN(parsedDueAt.getTime())) {
      throw new ApiError(
        400,
        "Invalid dueAt",
        "VALIDATION_ERROR"
      );
    }
  }

  if (reminderAt) {
    parsedReminderAt = new Date(reminderAt);

    if (Number.isNaN(parsedReminderAt.getTime())) {
      throw new ApiError(
        400,
        "Invalid reminderAt",
        "VALIDATION_ERROR"
      );
    }
  }

  if (
    parsedStartAt &&
    parsedDueAt &&
    parsedDueAt < parsedStartAt
  ) {
    throw new ApiError(
      400,
      "dueAt cannot be earlier than startAt",
      "VALIDATION_ERROR"
    );
  }

  if (
    reminderEnabled &&
    parsedReminderAt &&
    parsedDueAt &&
    parsedReminderAt > parsedDueAt
  ) {
    throw new ApiError(
      400,
      "reminderAt cannot be later than dueAt",
      "VALIDATION_ERROR"
    );
  }

  /*
  |------------------------------------------------------------
  | CREATE
  |------------------------------------------------------------
  */

  const task = await Task.create({
    title: String(title).trim(),
    description: description || "",
    status: status || "PENDING",
    priority: priority || "MEDIUM",
    startAt: parsedStartAt,
    dueAt: parsedDueAt,
    reminderEnabled: Boolean(reminderEnabled),
    reminderAt: parsedReminderAt,
    assignedTo: assignedTo || userId,
    lead: lead || null,
    company: company || null,
    contact: contact || null,
    opportunity: opportunity || null,
    createdBy: userId,
    updatedBy: userId,
  });

  const populatedTask = await populateTask(
    Task.findById(task._id)
  );

  return sendSuccess(
    res,
    populatedTask,
    "Task created successfully",
    201
  );
});

/*
|--------------------------------------------------------------------------
| GET ALL
| GET /tasks
|--------------------------------------------------------------------------
*/

exports.getAll = asyncHandler(async (req, res) => {
  const {
    page,
    limit,
    skip,
  } = getPagination(req.query);

  const filter = buildBaseFilter(req);

  /*
  |------------------------------------------------------------
  | SEARCH
  |------------------------------------------------------------
  */

  if (req.query.search) {
    const search = escapeRegex(req.query.search.trim());

    if (search) {
      filter.$or = [
        {
          title: {
            $regex: search,
            $options: "i",
          },
        },
        {
          description: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }
  }

  applyCommonFilters(filter, req.query);

  const sort = getSort(req.query);

  const [tasks, total] = await Promise.all([
    populateTask(
      Task.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
    ),

    Task.countDocuments(filter),
  ]);

  const pagination = buildPagination(
    page,
    limit,
    total
  );

  return sendSuccess(
    res,
    {
      tasks,
      pagination,
    },
    "Tasks retrieved successfully"
  );
});

/*
|--------------------------------------------------------------------------
| GET BY ID
| GET /tasks/:id
|--------------------------------------------------------------------------
*/

exports.getById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  validateObjectId(id, "task id");

  const task = await populateTask(
    Task.findOne({
      _id: id,
      isDeleted: false,
    })
  );

  if (!task) {
    throw new ApiError(
      404,
      "Task not found",
      "TASK_NOT_FOUND"
    );
  }

  return sendSuccess(
    res,
    task,
    "Task retrieved successfully"
  );
});

/*
|--------------------------------------------------------------------------
| UPDATE
| PUT /tasks/:id
|--------------------------------------------------------------------------
*/

exports.update = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;

  validateObjectId(id, "task id");

  const task = await Task.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!task) {
    throw new ApiError(
      404,
      "Task not found",
      "TASK_NOT_FOUND"
    );
  }

  const allowedFields = [
    "title",
    "description",
    "status",
    "priority",
    "startAt",
    "dueAt",
    "reminderEnabled",
    "reminderAt",
    "assignedTo",
    "lead",
    "company",
    "contact",
    "opportunity",
  ];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      task[field] = req.body[field];
    }
  }

  /*
  |------------------------------------------------------------
  | VALIDATE ENUMS
  |------------------------------------------------------------
  */

  validateEnum(task.status, TASK_STATUS, "status");
  validateEnum(task.priority, TASK_PRIORITY, "priority");

  /*
  |------------------------------------------------------------
  | VALIDATE IDS
  |------------------------------------------------------------
  */

  validateObjectId(task.assignedTo, "assignedTo");
  validateObjectId(task.lead, "lead");
  validateObjectId(task.company, "company");
  validateObjectId(task.contact, "contact");
  validateObjectId(task.opportunity, "opportunity");

  /*
  |------------------------------------------------------------
  | DATE VALIDATION
  |------------------------------------------------------------
  */

  if (task.startAt && Number.isNaN(task.startAt.getTime())) {
    throw new ApiError(
      400,
      "Invalid startAt",
      "VALIDATION_ERROR"
    );
  }

  if (task.dueAt && Number.isNaN(task.dueAt.getTime())) {
    throw new ApiError(
      400,
      "Invalid dueAt",
      "VALIDATION_ERROR"
    );
  }

  if (
    task.startAt &&
    task.dueAt &&
    task.dueAt < task.startAt
  ) {
    throw new ApiError(
      400,
      "dueAt cannot be earlier than startAt",
      "VALIDATION_ERROR"
    );
  }

  /*
  |------------------------------------------------------------
  | STATUS TIMESTAMPS
  |------------------------------------------------------------
  */

  if (task.status === "COMPLETED") {
    task.completedAt =
      task.completedAt || new Date();

    task.cancelledAt = null;
  }

  if (task.status === "CANCELLED") {
    task.cancelledAt =
      task.cancelledAt || new Date();

    task.completedAt = null;
  }

  if (
    task.status !== "COMPLETED" &&
    task.status !== "CANCELLED"
  ) {
    task.completedAt = null;
    task.cancelledAt = null;
  }

  task.updatedBy = userId;

  await task.save();

  const populatedTask = await populateTask(
    Task.findById(task._id)
  );

  return sendSuccess(
    res,
    populatedTask,
    "Task updated successfully"
  );
});

/*
|--------------------------------------------------------------------------
| DELETE
| DELETE /tasks/:id
|--------------------------------------------------------------------------
*/

exports.remove = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;

  validateObjectId(id, "task id");

  const task = await Task.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!task) {
    throw new ApiError(
      404,
      "Task not found",
      "TASK_NOT_FOUND"
    );
  }

  task.isDeleted = true;
  task.deletedAt = new Date();
  task.deletedBy = userId;
  task.updatedBy = userId;

  await task.save();

  return sendSuccess(
    res,
    null,
    "Task deleted successfully"
  );
});

/*
|--------------------------------------------------------------------------
| START
| PATCH /tasks/:id/start
|--------------------------------------------------------------------------
*/

exports.start = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;

  validateObjectId(id, "task id");

  const task = await Task.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!task) {
    throw new ApiError(
      404,
      "Task not found",
      "TASK_NOT_FOUND"
    );
  }

  if (task.status === "COMPLETED") {
    throw new ApiError(
      400,
      "Completed task cannot be started",
      "INVALID_TASK_STATUS"
    );
  }

  if (task.status === "CANCELLED") {
    throw new ApiError(
      400,
      "Cancelled task cannot be started",
      "INVALID_TASK_STATUS"
    );
  }

  task.status = "IN_PROGRESS";
  task.startAt = task.startAt || new Date();
  task.updatedBy = userId;

  await task.save();

  const populatedTask = await populateTask(
    Task.findById(task._id)
  );

  return sendSuccess(
    res,
    populatedTask,
    "Task started successfully"
  );
});

/*
|--------------------------------------------------------------------------
| COMPLETE
| PATCH /tasks/:id/complete
|--------------------------------------------------------------------------
*/

exports.complete = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;

  validateObjectId(id, "task id");

  const task = await Task.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!task) {
    throw new ApiError(
      404,
      "Task not found",
      "TASK_NOT_FOUND"
    );
  }

  if (task.status === "COMPLETED") {
    throw new ApiError(
      400,
      "Task is already completed",
      "INVALID_TASK_STATUS"
    );
  }

  if (task.status === "CANCELLED") {
    throw new ApiError(
      400,
      "Cancelled task cannot be completed",
      "INVALID_TASK_STATUS"
    );
  }

  task.status = "COMPLETED";
  task.completedAt = new Date();
  task.cancelledAt = null;
  task.updatedBy = userId;

  await task.save();

  const populatedTask = await populateTask(
    Task.findById(task._id)
  );

  return sendSuccess(
    res,
    populatedTask,
    "Task completed successfully"
  );
});

/*
|--------------------------------------------------------------------------
| CANCEL
| PATCH /tasks/:id/cancel
|--------------------------------------------------------------------------
*/

exports.cancel = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;

  validateObjectId(id, "task id");

  const task = await Task.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!task) {
    throw new ApiError(
      404,
      "Task not found",
      "TASK_NOT_FOUND"
    );
  }

  if (task.status === "COMPLETED") {
    throw new ApiError(
      400,
      "Completed task cannot be cancelled",
      "INVALID_TASK_STATUS"
    );
  }

  if (task.status === "CANCELLED") {
    throw new ApiError(
      400,
      "Task is already cancelled",
      "INVALID_TASK_STATUS"
    );
  }

  task.status = "CANCELLED";
  task.cancelledAt = new Date();
  task.completedAt = null;
  task.updatedBy = userId;

  await task.save();

  const populatedTask = await populateTask(
    Task.findById(task._id)
  );

  return sendSuccess(
    res,
    populatedTask,
    "Task cancelled successfully"
  );
});

/*
|--------------------------------------------------------------------------
| ASSIGN
| PATCH /tasks/:id/assign
|--------------------------------------------------------------------------
*/

exports.assign = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;
  const { assignedTo } = req.body;

  validateObjectId(id, "task id");

  if (!assignedTo) {
    throw new ApiError(
      400,
      "assignedTo is required",
      "VALIDATION_ERROR"
    );
  }

  validateObjectId(assignedTo, "assignedTo");

  const task = await Task.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!task) {
    throw new ApiError(
      404,
      "Task not found",
      "TASK_NOT_FOUND"
    );
  }

  task.assignedTo = assignedTo;
  task.updatedBy = userId;

  await task.save();

  const populatedTask = await populateTask(
    Task.findById(task._id)
  );

  return sendSuccess(
    res,
    populatedTask,
    "Task assigned successfully"
  );
});

/*
|--------------------------------------------------------------------------
| MY TASKS
| GET /tasks/my
|--------------------------------------------------------------------------
*/

exports.getMyTasks = asyncHandler(async (req, res) => {
  const userId = getUserId(req);

  const {
    page,
    limit,
    skip,
  } = getPagination(req.query);

  const filter = {
    isDeleted: false,
    assignedTo: userId,
  };

  applyCommonFilters(filter, req.query);

  const sort = getSort(req.query);

  const [tasks, total] = await Promise.all([
    populateTask(
      Task.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
    ),

    Task.countDocuments(filter),
  ]);

  return sendSuccess(
    res,
    {
      tasks,
      pagination: buildPagination(
        page,
        limit,
        total
      ),
    },
    "My tasks retrieved successfully"
  );
});

/*
|--------------------------------------------------------------------------
| UPCOMING
| GET /tasks/upcoming
|--------------------------------------------------------------------------
*/

exports.getUpcoming = asyncHandler(async (req, res) => {
  const userId = getUserId(req);

  const {
    page,
    limit,
    skip,
  } = getPagination(req.query);

  const filter = {
    isDeleted: false,
    dueAt: {
      $gte: new Date(),
    },
    status: {
      $nin: ["COMPLETED", "CANCELLED"],
    },
  };

  /*
  |------------------------------------------------------------
  | Optional assignedTo
  |------------------------------------------------------------
  */

  if (req.query.assignedTo) {
    validateObjectId(
      req.query.assignedTo,
      "assignedTo"
    );

    filter.assignedTo = req.query.assignedTo;
  } else if (req.query.mine === "true") {
    filter.assignedTo = userId;
  }

  /*
  |------------------------------------------------------------
  | Other filters
  |------------------------------------------------------------
  */

  if (req.query.priority) {
    validateEnum(
      req.query.priority,
      TASK_PRIORITY,
      "priority"
    );

    filter.priority = req.query.priority;
  }

  const sort = {
    dueAt: 1,
  };

  const [tasks, total] = await Promise.all([
    populateTask(
      Task.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
    ),

    Task.countDocuments(filter),
  ]);

  return sendSuccess(
    res,
    {
      tasks,
      pagination: buildPagination(
        page,
        limit,
        total
      ),
    },
    "Upcoming tasks retrieved successfully"
  );
});

/*
|--------------------------------------------------------------------------
| OVERDUE
| GET /tasks/overdue
|--------------------------------------------------------------------------
*/

exports.getOverdue = asyncHandler(async (req, res) => {
  const userId = getUserId(req);

  const {
    page,
    limit,
    skip,
  } = getPagination(req.query);

  const filter = {
    isDeleted: false,
    dueAt: {
      $lt: new Date(),
    },
    status: {
      $nin: ["COMPLETED", "CANCELLED"],
    },
  };

  if (req.query.assignedTo) {
    validateObjectId(
      req.query.assignedTo,
      "assignedTo"
    );

    filter.assignedTo = req.query.assignedTo;
  } else if (req.query.mine === "true") {
    filter.assignedTo = userId;
  }

  if (req.query.priority) {
    validateEnum(
      req.query.priority,
      TASK_PRIORITY,
      "priority"
    );

    filter.priority = req.query.priority;
  }

  const [tasks, total] = await Promise.all([
    populateTask(
      Task.find(filter)
        .sort({ dueAt: 1 })
        .skip(skip)
        .limit(limit)
    ),

    Task.countDocuments(filter),
  ]);

  return sendSuccess(
    res,
    {
      tasks,
      pagination: buildPagination(
        page,
        limit,
        total
      ),
    },
    "Overdue tasks retrieved successfully"
  );
});

/*
|--------------------------------------------------------------------------
| STATS
| GET /tasks/stats
|--------------------------------------------------------------------------
*/

exports.getStats = asyncHandler(async (req, res) => {
  const filter = buildBaseFilter(req);

  applyCommonFilters(filter, {
    ...req.query,
    status: undefined,
    overdue: undefined,
    upcoming: undefined,
  });

  const now = new Date();

  const [
    total,
    pending,
    inProgress,
    completed,
    cancelled,
    overdue,
    upcoming,
    urgent,
    high,
  ] = await Promise.all([
    Task.countDocuments(filter),

    Task.countDocuments({
      ...filter,
      status: "PENDING",
    }),

    Task.countDocuments({
      ...filter,
      status: "IN_PROGRESS",
    }),

    Task.countDocuments({
      ...filter,
      status: "COMPLETED",
    }),

    Task.countDocuments({
      ...filter,
      status: "CANCELLED",
    }),

    Task.countDocuments({
      ...filter,
      dueAt: { $lt: now },
      status: {
        $nin: ["COMPLETED", "CANCELLED"],
      },
    }),

    Task.countDocuments({
      ...filter,
      dueAt: { $gte: now },
      status: {
        $nin: ["COMPLETED", "CANCELLED"],
      },
    }),

    Task.countDocuments({
      ...filter,
      priority: "URGENT",
      status: {
        $nin: ["COMPLETED", "CANCELLED"],
      },
    }),

    Task.countDocuments({
      ...filter,
      priority: "HIGH",
      status: {
        $nin: ["COMPLETED", "CANCELLED"],
      },
    }),
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
      upcoming,
      urgent,
      high,
    },
    "Task statistics retrieved successfully"
  );
});

/*
|--------------------------------------------------------------------------
| RESTORE
| PATCH /tasks/:id/restore
|--------------------------------------------------------------------------
*/

exports.restore = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;

  validateObjectId(id, "task id");

  const task = await Task.findOne({
    _id: id,
    isDeleted: true,
  });

  if (!task) {
    throw new ApiError(
      404,
      "Deleted task not found",
      "TASK_NOT_FOUND"
    );
  }

  task.isDeleted = false;
  task.deletedAt = null;
  task.deletedBy = null;
  task.updatedBy = userId;

  await task.save();

  const populatedTask = await populateTask(
    Task.findById(task._id)
  );

  return sendSuccess(
    res,
    populatedTask,
    "Task restored successfully"
  );
});

/*
|--------------------------------------------------------------------------
| LEAD TASKS
| GET /tasks/lead/:leadId
|--------------------------------------------------------------------------
*/

exports.getLeadTasks = asyncHandler(async (req, res) => {
  const { leadId } = req.params;

  validateObjectId(leadId, "lead id");

  const {
    page,
    limit,
    skip,
  } = getPagination(req.query);

  const filter = {
    isDeleted: false,
    lead: leadId,
  };

  applyCommonFilters(filter, req.query);

  const [tasks, total] = await Promise.all([
    populateTask(
      Task.find(filter)
        .sort({ dueAt: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
    ),

    Task.countDocuments(filter),
  ]);

  return sendSuccess(
    res,
    {
      tasks,
      pagination: buildPagination(
        page,
        limit,
        total
      ),
    },
    "Lead tasks retrieved successfully"
  );
});

/*
|--------------------------------------------------------------------------
| COMPANY TASKS
| GET /tasks/company/:companyId
|--------------------------------------------------------------------------
*/

exports.getCompanyTasks = asyncHandler(async (req, res) => {
  const { companyId } = req.params;

  validateObjectId(companyId, "company id");

  const {
    page,
    limit,
    skip,
  } = getPagination(req.query);

  const filter = {
    isDeleted: false,
    company: companyId,
  };

  applyCommonFilters(filter, req.query);

  const [tasks, total] = await Promise.all([
    populateTask(
      Task.find(filter)
        .sort({ dueAt: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
    ),

    Task.countDocuments(filter),
  ]);

  return sendSuccess(
    res,
    {
      tasks,
      pagination: buildPagination(
        page,
        limit,
        total
      ),
    },
    "Company tasks retrieved successfully"
  );
});

/*
|--------------------------------------------------------------------------
| CONTACT TASKS
| GET /tasks/contact/:contactId
|--------------------------------------------------------------------------
*/

exports.getContactTasks = asyncHandler(async (req, res) => {
  const { contactId } = req.params;

  validateObjectId(contactId, "contact id");

  const {
    page,
    limit,
    skip,
  } = getPagination(req.query);

  const filter = {
    isDeleted: false,
    contact: contactId,
  };

  applyCommonFilters(filter, req.query);

  const [tasks, total] = await Promise.all([
    populateTask(
      Task.find(filter)
        .sort({ dueAt: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
    ),

    Task.countDocuments(filter),
  ]);

  return sendSuccess(
    res,
    {
      tasks,
      pagination: buildPagination(
        page,
        limit,
        total
      ),
    },
    "Contact tasks retrieved successfully"
  );
});

/*
|--------------------------------------------------------------------------
| OPPORTUNITY TASKS
| GET /tasks/opportunity/:opportunityId
|--------------------------------------------------------------------------
*/

exports.getOpportunityTasks = asyncHandler(
  async (req, res) => {
    const { opportunityId } = req.params;

    validateObjectId(
      opportunityId,
      "opportunity id"
    );

    const {
      page,
      limit,
      skip,
    } = getPagination(req.query);

    const filter = {
      isDeleted: false,
      opportunity: opportunityId,
    };

    applyCommonFilters(filter, req.query);

    const [tasks, total] = await Promise.all([
      populateTask(
        Task.find(filter)
          .sort({ dueAt: 1, createdAt: -1 })
          .skip(skip)
          .limit(limit)
      ),

      Task.countDocuments(filter),
    ]);

    return sendSuccess(
      res,
      {
        tasks,
        pagination: buildPagination(
          page,
          limit,
          total
        ),
      },
      "Opportunity tasks retrieved successfully"
    );
  }
);