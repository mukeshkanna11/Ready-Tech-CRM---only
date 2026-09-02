'use strict';

const mongoose = require('mongoose');

// ======================================================
// GENERIC CRM CRUD CONTROLLER FACTORY
// ======================================================
//
// Used by:
// - Company
// - Contact
// - Lead
// - Opportunity
// - Activity
// - Invoice
// - Quotation
// - Product
// - Vendor
// - etc.
//
// Features:
// ------------------------------------------------------
// GET list
// Search
// Pagination
// Sorting
// Filters
// ObjectId filters
// Date filters
// Populate
// GET by ID
// CREATE
// UPDATE
// DELETE
// Transform create
// Transform update
// Lifecycle hooks
// Validation handling
// Duplicate handling
// Cast error handling
// Mongo error handling
// Regex protection
// Sort protection
// Mongo operator protection
// Lean queries
// Production-safe errors
// ======================================================


// ======================================================
// FACTORY
// ======================================================

const createCrudController = ({
  Model,

  // ----------------------------------------------
  // Population
  // ----------------------------------------------

  populate = '',

  // ----------------------------------------------
  // Searchable fields
  // ----------------------------------------------

  searchFields = [],

  // ----------------------------------------------
  // Allowed normal filters
  // ----------------------------------------------

  filterFields = [],

  // ----------------------------------------------
  // Default sorting
  // ----------------------------------------------

  defaultSort = '-createdAt',

  // ----------------------------------------------
  // Allowed sorting fields
  // ----------------------------------------------

  allowedSortFields = [],

  // ----------------------------------------------
  // Create transformer
  // ----------------------------------------------
  //
  // Example:
  //
  // transformCreate: prepareInvoice
  //
  // ----------------------------------------------

  transformCreate = null,

  // ----------------------------------------------
  // Update transformer
  // ----------------------------------------------

  transformUpdate = null,

  // ----------------------------------------------
  // Lifecycle hooks
  // ----------------------------------------------

  beforeCreate = null,
  afterCreate = null,

  beforeUpdate = null,
  afterUpdate = null,

  beforeDelete = null,
  afterDelete = null,

  // ----------------------------------------------
  // Optional soft delete
  // ----------------------------------------------

  softDelete = false,

  // ----------------------------------------------
  // Soft delete field
  // ----------------------------------------------

  softDeleteField = 'deleted',

  // ----------------------------------------------
  // Automatically filter deleted records
  // ----------------------------------------------

  excludeDeleted = true,

  // ----------------------------------------------
  // Maximum pagination limit
  // ----------------------------------------------

  maxLimit = 100,
}) => {
  // ==================================================
  // VALIDATION
  // ==================================================

  if (!Model) {
    throw new Error(
      'Model is required for createCrudController'
    );
  }

  if (
    !Model.modelName ||
    typeof Model.find !== 'function'
  ) {
    throw new Error(
      'A valid Mongoose model is required'
    );
  }

  // ==================================================
  // HELPERS
  // ==================================================

  /**
   * Escape regex special characters.
   *
   * Prevents user search text from becoming
   * an unintended regular expression.
   */
  const escapeRegex = (value) => {
    return String(value).replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    );
  };


  /**
   * Parse boolean query values.
   */
  const parseBoolean = (value) => {
    if (
      value === true ||
      value === 'true' ||
      value === '1'
    ) {
      return true;
    }

    if (
      value === false ||
      value === 'false' ||
      value === '0'
    ) {
      return false;
    }

    return value;
  };


  /**
   * Check valid ObjectId.
   */
  const isValidObjectId = (value) => {
    return mongoose.Types.ObjectId.isValid(
      value
    );
  };


  /**
   * Remove dangerous Mongo keys.
   */
  const sanitizeObject = (
    value,
    {
      allowDotNotation = false,
    } = {}
  ) => {
    if (
      !value ||
      typeof value !== 'object' ||
      Array.isArray(value)
    ) {
      return value;
    }

    const result = {};

    Object.keys(value).forEach((key) => {
      if (key.startsWith('$')) {
        return;
      }

      if (
        !allowDotNotation &&
        key.includes('.')
      ) {
        return;
      }

      result[key] = value[key];
    });

    return result;
  };


  /**
   * Validate request body.
   */
  const validateBody = (body) => {
    return (
      body &&
      typeof body === 'object' &&
      !Array.isArray(body)
    );
  };


  /**
   * Remove protected/system fields.
   */
  const sanitizeCreateBody = (body) => {
    const data = sanitizeObject(body);

    const protectedFields = [
      '_id',
      '__v',
      'createdAt',
      'updatedAt',
    ];

    protectedFields.forEach((field) => {
      delete data[field];
    });

    return data;
  };


  /**
   * Remove protected/system fields during update.
   */
  const sanitizeUpdateBody = (body) => {
    const data = sanitizeObject(body);

    const protectedFields = [
      '_id',
      '__v',
      'createdAt',
      'updatedAt',
    ];

    protectedFields.forEach((field) => {
      delete data[field];
    });

    return data;
  };


  /**
   * Apply populate configuration.
   */
  const applyPopulate = (query) => {
    if (!populate) {
      return query;
    }

    if (Array.isArray(populate)) {
      return query.populate(populate);
    }

    return query.populate(populate);
  };


  /**
   * Format validation errors.
   */
  const formatValidationErrors = (
    error
  ) => {
    if (
      !error ||
      error.name !== 'ValidationError'
    ) {
      return [];
    }

    return Object.values(
      error.errors || {}
    ).map((err) => ({
      field: err.path,
      message: err.message,
      value: err.value,
      kind: err.kind,
    }));
  };


  /**
   * Get duplicate key field.
   */
  const getDuplicateField = (
    error
  ) => {
    if (error?.keyPattern) {
      return Object.keys(
        error.keyPattern
      )[0];
    }

    if (error?.keyValue) {
      return Object.keys(
        error.keyValue
      )[0];
    }

    return undefined;
  };


  /**
   * Create standard error response.
   */
  const handleError = (
    res,
    error,
    operation
  ) => {
    console.error(
      `${Model.modelName} ${operation} error:`,
      error
    );

    // ----------------------------------------------
    // Mongoose validation
    // ----------------------------------------------

    if (
      error?.name === 'ValidationError'
    ) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors:
          formatValidationErrors(error),
      });
    }

    // ----------------------------------------------
    // Invalid ObjectId / CastError
    // ----------------------------------------------

    if (
      error?.name === 'CastError'
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid value provided',
        field: error.path,
        value: error.value,
      });
    }

    // ----------------------------------------------
    // Duplicate key
    // ----------------------------------------------

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          'A record with the same unique value already exists',
        field:
          getDuplicateField(error),
      });
    }

    // ----------------------------------------------
    // Mongo server error
    // ----------------------------------------------

    if (
      error?.name === 'MongoServerError'
    ) {
      return res.status(500).json({
        success: false,
        message:
          'Database operation failed',
        error:
          process.env.NODE_ENV ===
          'development'
            ? error.message
            : undefined,
      });
    }

    // ----------------------------------------------
    // Application/API error
    // ----------------------------------------------

    if (
      error?.statusCode &&
      error.statusCode >= 400 &&
      error.statusCode < 500
    ) {
      return res.status(
        error.statusCode
      ).json({
        success: false,
        message:
          error.message ||
          'Request failed',
        code:
          error.code ||
          undefined,
      });
    }

    // ----------------------------------------------
    // Production-safe server error
    // ----------------------------------------------

    return res.status(500).json({
      success: false,
      message:
        `Failed to ${operation} ${Model.modelName}`,
      error:
        process.env.NODE_ENV ===
        'development'
          ? error.message
          : undefined,
    });
  };


  /**
   * Build search query.
   */
  const applySearch = (
    filter,
    search
  ) => {
    const normalizedSearch =
      String(search || '').trim();

    if (
      !normalizedSearch ||
      !Array.isArray(searchFields) ||
      searchFields.length === 0
    ) {
      return;
    }

    const safeSearch =
      escapeRegex(normalizedSearch);

    filter.$or =
      searchFields
        .filter(
          (field) =>
            typeof field === 'string' &&
            field.trim()
        )
        .map((field) => ({
          [field]: {
            $regex: safeSearch,
            $options: 'i',
          },
        }));
  };


  /**
   * Apply configured filters.
   */
  const applyConfiguredFilters = (
    filter,
    req
  ) => {
    if (
      !Array.isArray(filterFields)
    ) {
      return;
    }

    filterFields.forEach((field) => {
      const value =
        req.query[field];

      if (
        value === undefined ||
        value === null ||
        value === ''
      ) {
        return;
      }

      // --------------------------------------------
      // Comma-separated values
      // --------------------------------------------

      if (
        typeof value === 'string' &&
        value.includes(',')
      ) {
        filter[field] = {
          $in: value
            .split(',')
            .map((item) =>
              item.trim()
            )
            .filter(Boolean),
        };

        return;
      }

      filter[field] =
        parseBoolean(value);
    });
  };


  /**
   * Common CRM ObjectId filters.
   */
  const applyObjectIdFilters = (
    filter,
    req
  ) => {
    const objectIdFields = [
      'owner',
      'company',
      'lead',
      'contact',
      'opportunity',
      'assignedTo',
      'user',
      'recordId',
      'quotation',
      'invoice',
      'product',
      'vendor',
    ];

    objectIdFields.forEach(
      (field) => {
        const value =
          req.query[field];

        if (
          !value ||
          !isValidObjectId(value)
        ) {
          return;
        }

        filter[field] = value;
      }
    );
  };


  /**
   * Date filter helper.
   */
  const applyDateFilters = (
    filter,
    req
  ) => {
    const {
      fromDate,
      toDate,
    } = req.query;

    if (!fromDate && !toDate) {
      return;
    }

    const createdAt = {};

    if (fromDate) {
      const from =
        new Date(fromDate);

      if (
        !Number.isNaN(
          from.getTime()
        )
      ) {
        createdAt.$gte = from;
      }
    }

    if (toDate) {
      const to =
        new Date(toDate);

      if (
        !Number.isNaN(
          to.getTime()
        )
      ) {
        to.setHours(
          23,
          59,
          59,
          999
        );

        createdAt.$lte = to;
      }
    }

    if (
      Object.keys(createdAt)
        .length > 0
    ) {
      filter.createdAt =
        createdAt;
    }
  };


  /**
   * Validate and normalize sort.
   *
   * Prevent arbitrary Mongo sort injection.
   */
  const resolveSort = (
    requestedSort
  ) => {
    const sort =
      String(
        requestedSort ||
          defaultSort
      ).trim();

    if (
      !sort ||
      !Array.isArray(
        allowedSortFields
      ) ||
      allowedSortFields.length === 0
    ) {
      return defaultSort;
    }

    const parts =
      sort
        .split(',')
        .map((part) =>
          part.trim()
        )
        .filter(Boolean);

    const validParts =
      parts.filter((part) => {
        const field =
          part.startsWith('-')
            ? part.slice(1)
            : part;

        return allowedSortFields.includes(
          field
        );
      });

    return validParts.length > 0
      ? validParts.join(' ')
      : defaultSort;
  };


  /**
   * Build list filter.
   */
  const buildListFilter = (
    req
  ) => {
    const filter = {};

    // ----------------------------------------------
    // Soft deleted records
    // ----------------------------------------------

    if (
      softDelete &&
      excludeDeleted
    ) {
      filter[softDeleteField] =
        false;
    }

    // ----------------------------------------------
    // Search
    // ----------------------------------------------

    applySearch(
      filter,
      req.query.search
    );

    // ----------------------------------------------
    // Configured filters
    // ----------------------------------------------

    applyConfiguredFilters(
      filter,
      req
    );

    // ----------------------------------------------
    // ObjectId filters
    // ----------------------------------------------

    applyObjectIdFilters(
      filter,
      req
    );

    // ----------------------------------------------
    // Date filters
    // ----------------------------------------------

    applyDateFilters(
      filter,
      req
    );

    return filter;
  };


  // ==================================================
  // GET LIST
  // ==================================================
  //
  // GET /api/resource
  //
  // Examples:
  //
  // ?page=1
  // ?limit=20
  // ?search=arun
  // ?sort=-createdAt
  // ?status=ACTIVE
  // ?owner=xxx
  // ?fromDate=2026-01-01
  // ?toDate=2026-12-31
  //
  // ==================================================

  const list = async (
    req,
    res
  ) => {
    try {
      // --------------------------------------------
      // Pagination
      // --------------------------------------------

      const page = Math.max(
        parseInt(
          req.query.page,
          10
        ) || 1,
        1
      );

      const requestedLimit =
        parseInt(
          req.query.limit,
          10
        ) || 20;

      const limit = Math.min(
        Math.max(
          requestedLimit,
          1
        ),
        maxLimit
      );

      const skip =
        (page - 1) * limit;

      // --------------------------------------------
      // Filter
      // --------------------------------------------

      const filter =
        buildListFilter(req);

      // --------------------------------------------
      // Sort
      // --------------------------------------------

      const sort =
        resolveSort(
          req.query.sort
        );

      // --------------------------------------------
      // Query
      // --------------------------------------------

      let query =
        Model.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limit);

      query =
        applyPopulate(query);

      // --------------------------------------------
      // Execute
      // --------------------------------------------

      const [
        items,
        total,
      ] = await Promise.all([
        query.lean(),
        Model.countDocuments(
          filter
        ),
      ]);

      // --------------------------------------------
      // Pagination
      // --------------------------------------------

      const totalPages =
        total > 0
          ? Math.ceil(
              total / limit
            )
          : 0;

      const hasNextPage =
        page < totalPages;

      const hasPrevPage =
        page > 1;

      return res.status(200).json({
        success: true,

        data: items,

        pagination: {
          page,
          limit,
          total,
          totalPages,

          hasNextPage,
          hasPrevPage,

          nextPage:
            hasNextPage
              ? page + 1
              : null,

          prevPage:
            hasPrevPage
              ? page - 1
              : null,
        },
      });
    } catch (error) {
      return handleError(
        res,
        error,
        'fetch'
      );
    }
  };


  // ==================================================
  // GET BY ID
  // ==================================================
  //
  // GET /api/resource/:id
  //
  // ==================================================

  const getById = async (
    req,
    res
  ) => {
    try {
      const { id } =
        req.params;

      // --------------------------------------------
      // Validate ID
      // --------------------------------------------

      if (
        !isValidObjectId(id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Invalid record ID',
        });
      }

      // --------------------------------------------
      // Filter
      // --------------------------------------------

      const filter = {
        _id: id,
      };

      if (
        softDelete &&
        excludeDeleted
      ) {
        filter[
          softDeleteField
        ] = false;
      }

      // --------------------------------------------
      // Query
      // --------------------------------------------

      let query =
        Model.findOne(filter);

      query =
        applyPopulate(query);

      const item =
        await query.lean();

      // --------------------------------------------
      // Not found
      // --------------------------------------------

      if (!item) {
        return res.status(404).json({
          success: false,
          message:
            `${Model.modelName} not found`,
        });
      }

      return res.status(200).json({
        success: true,
        data: item,
      });
    } catch (error) {
      return handleError(
        res,
        error,
        'fetch'
      );
    }
  };


  // ==================================================
  // CREATE
  // ==================================================
  //
  // POST /api/resource
  //
  // Supports:
  //
  // transformCreate()
  // beforeCreate()
  // afterCreate()
  //
  // ==================================================

  const create = async (
    req,
    res
  ) => {
    try {
      // --------------------------------------------
      // Validate body
      // --------------------------------------------

      if (
        !validateBody(
          req.body
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Request body must be a valid object',
        });
      }

      // --------------------------------------------
      // Sanitize
      // --------------------------------------------

      let data =
        sanitizeCreateBody(
          req.body
        );

      // --------------------------------------------
      // Transform
      // --------------------------------------------

      if (
        typeof transformCreate ===
        'function'
      ) {
        data =
          await transformCreate(
            data,
            req
          );
      }

      // --------------------------------------------
      // Before create hook
      // --------------------------------------------

      if (
        typeof beforeCreate ===
        'function'
      ) {
        data =
          await beforeCreate(
            data,
            req
          );
      }

      // --------------------------------------------
      // Final validation
      // --------------------------------------------

      if (
        !data ||
        typeof data !== 'object' ||
        Array.isArray(data)
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Invalid transformed create data',
        });
      }

      // --------------------------------------------
      // Create
      // --------------------------------------------

      const document =
        await Model.create(data);

      // --------------------------------------------
      // Populate created document
      // --------------------------------------------

      let query =
        Model.findById(
          document._id
        );

      query =
        applyPopulate(query);

      const createdItem =
        await query.lean();

      // --------------------------------------------
      // After create hook
      // --------------------------------------------

      let finalItem =
        createdItem;

      if (
        typeof afterCreate ===
        'function'
      ) {
        const hookResult =
          await afterCreate(
            createdItem,
            req
          );

        if (hookResult) {
          finalItem =
            hookResult;
        }
      }

      return res.status(201).json({
        success: true,

        message:
          `${Model.modelName} created successfully`,

        data: finalItem,
      });
    } catch (error) {
      return handleError(
        res,
        error,
        'create'
      );
    }
  };


  // ==================================================
  // UPDATE
  // ==================================================
  //
  // PUT /api/resource/:id
  //
  // Supports:
  //
  // transformUpdate()
  // beforeUpdate()
  // afterUpdate()
  //
  // ==================================================

  const update = async (
    req,
    res
  ) => {
    try {
      const { id } =
        req.params;

      // --------------------------------------------
      // Validate ID
      // --------------------------------------------

      if (
        !isValidObjectId(id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Invalid record ID',
        });
      }

      // --------------------------------------------
      // Validate body
      // --------------------------------------------

      if (
        !validateBody(
          req.body
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Request body must be a valid object',
        });
      }

      // --------------------------------------------
      // Check record exists
      // --------------------------------------------

      let existingQuery =
        Model.findById(id);

      existingQuery =
        applyPopulate(
          existingQuery
        );

      const existing =
        await existingQuery;

      if (!existing) {
        return res.status(404).json({
          success: false,
          message:
            `${Model.modelName} not found`,
        });
      }

      // --------------------------------------------
      // Sanitize body
      // --------------------------------------------

      let updateData =
        sanitizeUpdateBody(
          req.body
        );

      // --------------------------------------------
      // Transform update
      // --------------------------------------------

      if (
        typeof transformUpdate ===
        'function'
      ) {
        updateData =
          await transformUpdate(
            updateData,
            req,
            existing
          );
      }

      // --------------------------------------------
      // Before update hook
      // --------------------------------------------

      if (
        typeof beforeUpdate ===
        'function'
      ) {
        updateData =
          await beforeUpdate(
            updateData,
            req,
            existing
          );
      }

      // --------------------------------------------
      // Final validation
      // --------------------------------------------

      if (
        !updateData ||
        typeof updateData !==
          'object' ||
        Array.isArray(
          updateData
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Invalid transformed update data',
        });
      }

      // --------------------------------------------
      // Sanitize transformed data
      // --------------------------------------------

      updateData =
        sanitizeObject(
          updateData
        );

      // --------------------------------------------
      // Protected fields
      // --------------------------------------------

      delete updateData._id;
      delete updateData.__v;
      delete updateData.createdAt;
      delete updateData.updatedAt;

      // --------------------------------------------
      // Update
      // --------------------------------------------

      let query =
        Model.findByIdAndUpdate(
          id,
          updateData,
          {
            new: true,
            runValidators: true,
            context: 'query',
          }
        );

      query =
        applyPopulate(query);

      const updatedItem =
        await query.lean();

      // --------------------------------------------
      // Safety
      // --------------------------------------------

      if (!updatedItem) {
        return res.status(404).json({
          success: false,
          message:
            `${Model.modelName} not found`,
        });
      }

      // --------------------------------------------
      // After update
      // --------------------------------------------

      let finalItem =
        updatedItem;

      if (
        typeof afterUpdate ===
        'function'
      ) {
        const hookResult =
          await afterUpdate(
            updatedItem,
            req,
            existing
          );

        if (hookResult) {
          finalItem =
            hookResult;
        }
      }

      return res.status(200).json({
        success: true,

        message:
          `${Model.modelName} updated successfully`,

        data: finalItem,
      });
    } catch (error) {
      return handleError(
        res,
        error,
        'update'
      );
    }
  };


  // ==================================================
  // DELETE
  // ==================================================
  //
  // DELETE /api/resource/:id
  //
  // Supports optional soft delete.
  //
  // ==================================================

  const remove = async (
    req,
    res
  ) => {
    try {
      const { id } =
        req.params;

      // --------------------------------------------
      // Validate ID
      // --------------------------------------------

      if (
        !isValidObjectId(id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Invalid record ID',
        });
      }

      // --------------------------------------------
      // Check record
      // --------------------------------------------

      const existing =
        await Model.findById(id);

      if (!existing) {
        return res.status(404).json({
          success: false,
          message:
            `${Model.modelName} not found`,
        });
      }

      // --------------------------------------------
      // Before delete hook
      // --------------------------------------------

      if (
        typeof beforeDelete ===
        'function'
      ) {
        await beforeDelete(
          existing,
          req
        );
      }

      // --------------------------------------------
      // Soft delete
      // --------------------------------------------

      if (
        softDelete
      ) {
        const update = {
          [softDeleteField]:
            true,
        };

        const deletedItem =
          await Model.findByIdAndUpdate(
            id,
            update,
            {
              new: true,
              runValidators: true,
            }
          ).lean();

        // ------------------------------------------
        // After delete
        // ------------------------------------------

        if (
          typeof afterDelete ===
          'function'
        ) {
          await afterDelete(
            deletedItem,
            req
          );
        }

        return res.status(200).json({
          success: true,

          message:
            `${Model.modelName} deleted successfully`,

          data: {
            id:
              deletedItem._id,
          },
        });
      }

      // --------------------------------------------
      // Hard delete
      // --------------------------------------------

      const deletedItem =
        await Model.findByIdAndDelete(
          id
        );

      if (!deletedItem) {
        return res.status(404).json({
          success: false,
          message:
            `${Model.modelName} not found`,
        });
      }

      // --------------------------------------------
      // After delete hook
      // --------------------------------------------

      if (
        typeof afterDelete ===
        'function'
      ) {
        await afterDelete(
          deletedItem,
          req
        );
      }

      return res.status(200).json({
        success: true,

        message:
          `${Model.modelName} deleted successfully`,

        data: {
          id:
            deletedItem._id,
        },
      });
    } catch (error) {
      return handleError(
        res,
        error,
        'delete'
      );
    }
  };


  // ==================================================
  // RETURN CONTROLLER
  // ==================================================

  return {
    list,
    getById,
    create,
    update,
    remove,
  };
};


// ======================================================
// EXPORT
// ======================================================

module.exports =
  createCrudController; 