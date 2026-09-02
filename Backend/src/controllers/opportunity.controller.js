'use strict';

const mongoose = require('mongoose');

const Opportunity = require('../models/Opportunity');
const Company = require('../models/Company');
const Contact = require('../models/Contact');
const Lead = require('../models/Lead');
const User = require('../models/User');
const Product = require('../models/Product');

const {
  OPPORTUNITY_STAGES,
  OPPORTUNITY_PRIORITIES,
  OPPORTUNITY_STATUS,
  OPPORTUNITY_SOURCES,
} = Opportunity;

// ======================================================
// HELPERS
// ======================================================

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

const getUserId = (req) => {
  return (
    req.user?._id ||
    req.user?.id ||
    req.user?.userId ||
    null
  );
};

const normalizePagination = (req) => {
  const page = Math.max(
    Number.parseInt(req.query.page, 10) || 1,
    1
  );

  const limit = Math.min(
    Math.max(
      Number.parseInt(req.query.limit, 10) || 10,
      1
    ),
    100
  );

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const escapeRegex = (value = '') => {
  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
  );
};

const buildDateRange = (from, to) => {
  const range = {};

  if (from) {
    const fromDate = new Date(from);

    if (!Number.isNaN(fromDate.getTime())) {
      fromDate.setHours(0, 0, 0, 0);
      range.$gte = fromDate;
    }
  }

  if (to) {
    const toDate = new Date(to);

    if (!Number.isNaN(toDate.getTime())) {
      toDate.setHours(23, 59, 59, 999);
      range.$lte = toDate;
    }
  }

  return Object.keys(range).length
    ? range
    : null;
};

const populateOpportunity = (query) => {
  return query
    .populate({
      path: 'company',
      select: 'name email phone website industry status',
    })
    .populate({
      path: 'contact',
      select:
        'firstName lastName email phone designation department company',
    })
    .populate({
      path: 'lead',
      select:
        'firstName lastName name email phone company status source owner',
    })
    .populate({
      path: 'owner',
      select: 'firstName lastName name email role',
    })
    .populate({
      path: 'createdBy',
      select: 'firstName lastName name email',
    })
    .populate({
      path: 'updatedBy',
      select: 'firstName lastName name email',
    })
    .populate({
      path: 'products.product',
      select:
        'name sku price sellingPrice salePrice currency stock quantity status',
    });
};

// ======================================================
// CREATE OPPORTUNITY
// ======================================================

const createOpportunity = async (req, res, next) => {
  try {
    const {
      name,
      description,
      company,
      contact,
      lead,
      owner,
      value,
      currency,
      stage,
      status,
      probability,
      expectedCloseDate,
      actualCloseDate,
      priority,
      source,
      sourceType,
      products,
      nextFollowUpDate,
      lastContactedAt,
      lostReason,
      wonReason,
      tags,
      notes,
    } = req.body;

    // --------------------------------------------------
    // REQUIRED VALIDATION
    // --------------------------------------------------

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Opportunity name is required',
      });
    }

    // --------------------------------------------------
    // OBJECT ID VALIDATION
    // --------------------------------------------------

    const objectIdFields = [
      {
        name: 'company',
        value: company,
      },
      {
        name: 'contact',
        value: contact,
      },
      {
        name: 'lead',
        value: lead,
      },
      {
        name: 'owner',
        value: owner,
      },
    ];

    for (const field of objectIdFields) {
      if (
        field.value &&
        !isValidObjectId(field.value)
      ) {
        return res.status(400).json({
          success: false,
          message: `Invalid ${field.name}`,
        });
      }
    }

    // --------------------------------------------------
    // ENUM VALIDATION
    // --------------------------------------------------

    if (
      stage &&
      !OPPORTUNITY_STAGES.includes(stage)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid opportunity stage',
        allowedStages: OPPORTUNITY_STAGES,
      });
    }

    if (
      priority &&
      !OPPORTUNITY_PRIORITIES.includes(priority)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid opportunity priority',
        allowedPriorities: OPPORTUNITY_PRIORITIES,
      });
    }

    if (
      status &&
      !OPPORTUNITY_STATUS.includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid opportunity status',
        allowedStatuses: OPPORTUNITY_STATUS,
      });
    }

    if (
      sourceType &&
      !OPPORTUNITY_SOURCES.includes(sourceType)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid opportunity source type',
        allowedSources: OPPORTUNITY_SOURCES,
      });
    }

    // --------------------------------------------------
    // NUMERIC VALIDATION
    // --------------------------------------------------

    const numericValue =
      value !== undefined
        ? Number(value)
        : 0;

    const numericProbability =
      probability !== undefined
        ? Number(probability)
        : 10;

    if (
      Number.isNaN(numericValue) ||
      numericValue < 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Value must be a valid positive number',
      });
    }

    if (
      Number.isNaN(numericProbability) ||
      numericProbability < 0 ||
      numericProbability > 100
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Probability must be between 0 and 100',
      });
    }

    // --------------------------------------------------
    // PRODUCTS VALIDATION
    // --------------------------------------------------

    const normalizedProducts = Array.isArray(products)
      ? products
      : [];

    for (const item of normalizedProducts) {
      if (
        !item.product ||
        !isValidObjectId(item.product)
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Each opportunity product must contain a valid product ID',
        });
      }

      if (
        item.quantity !== undefined &&
        Number(item.quantity) < 1
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Product quantity must be at least 1',
        });
      }

      if (
        item.price !== undefined &&
        Number(item.price) < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Product price cannot be negative',
        });
      }
    }

    // --------------------------------------------------
    // CREATE
    // --------------------------------------------------

    const opportunity = new Opportunity({
      name: String(name).trim(),

      description:
        description !== undefined
          ? String(description).trim()
          : '',

      company: company || undefined,
      contact: contact || undefined,
      lead: lead || undefined,

      owner:
        owner && isValidObjectId(owner)
          ? owner
          : getUserId(req),

      value: numericValue,

      currency:
        currency
          ? String(currency).trim().toUpperCase()
          : 'INR',

      stage: stage || 'QUALIFICATION',

      probability: numericProbability,

      expectedCloseDate:
        expectedCloseDate || undefined,

      actualCloseDate:
        actualCloseDate || undefined,

      priority:
        priority || 'MEDIUM',

      source:
        source
          ? String(source).trim()
          : undefined,

      sourceType:
        sourceType || 'OTHER',

      products: normalizedProducts,

      nextFollowUpDate:
        nextFollowUpDate || undefined,

      lastContactedAt:
        lastContactedAt || undefined,

      lostReason:
        lostReason
          ? String(lostReason).trim()
          : '',

      wonReason:
        wonReason
          ? String(wonReason).trim()
          : '',

      tags: Array.isArray(tags)
        ? tags
            .map((tag) => String(tag).trim())
            .filter(Boolean)
        : [],

      notes:
        notes
          ? String(notes).trim()
          : '',

      createdBy: getUserId(req),
      updatedBy: getUserId(req),
    });

    await opportunity.save();

    const populatedOpportunity =
      await populateOpportunity(
        Opportunity.findById(opportunity._id)
      );

    return res.status(201).json({
      success: true,
      message: 'Opportunity created successfully',
      data: populatedOpportunity,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// GET ALL OPPORTUNITIES
// ======================================================

const getOpportunities = async (req, res, next) => {
  try {
    const {
      search,
      stage,
      status,
      priority,
      owner,
      company,
      contact,
      lead,
      sourceType,
      source,
      dateFrom,
      dateTo,
      closeDateFrom,
      closeDateTo,
      minValue,
      maxValue,
      minProbability,
      maxProbability,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const {
      page,
      limit,
      skip,
    } = normalizePagination(req);

    const filter = {};

    // --------------------------------------------------
    // SEARCH
    // --------------------------------------------------

    if (search && String(search).trim()) {
      const searchRegex = new RegExp(
        escapeRegex(String(search).trim()),
        'i'
      );

      filter.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { notes: searchRegex },
        { source: searchRegex },
        { lostReason: searchRegex },
        { wonReason: searchRegex },
      ];
    }

    // --------------------------------------------------
    // FILTERS
    // --------------------------------------------------

    if (stage) {
      filter.stage = stage;
    }

    if (status) {
      filter.status = status;
    }

    if (priority) {
      filter.priority = priority;
    }

    if (owner) {
      if (!isValidObjectId(owner)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid owner ID',
        });
      }

      filter.owner = owner;
    }

    if (company) {
      if (!isValidObjectId(company)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid company ID',
        });
      }

      filter.company = company;
    }

    if (contact) {
      if (!isValidObjectId(contact)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid contact ID',
        });
      }

      filter.contact = contact;
    }

    if (lead) {
      if (!isValidObjectId(lead)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid lead ID',
        });
      }

      filter.lead = lead;
    }

    if (sourceType) {
      filter.sourceType = sourceType;
    }

    if (source) {
      filter.source = new RegExp(
        escapeRegex(String(source)),
        'i'
      );
    }

    // --------------------------------------------------
    // EXPECTED CLOSE DATE
    // --------------------------------------------------

    const expectedCloseRange =
      buildDateRange(
        closeDateFrom,
        closeDateTo
      );

    if (expectedCloseRange) {
      filter.expectedCloseDate =
        expectedCloseRange;
    }

    // --------------------------------------------------
    // CREATED DATE
    // --------------------------------------------------

    const createdRange =
      buildDateRange(
        dateFrom,
        dateTo
      );

    if (createdRange) {
      filter.createdAt = createdRange;
    }

    // --------------------------------------------------
    // VALUE FILTER
    // --------------------------------------------------

    if (
      minValue !== undefined ||
      maxValue !== undefined
    ) {
      filter.value = {};

      if (minValue !== undefined) {
        filter.value.$gte = Number(minValue);
      }

      if (maxValue !== undefined) {
        filter.value.$lte = Number(maxValue);
      }
    }

    // --------------------------------------------------
    // PROBABILITY FILTER
    // --------------------------------------------------

    if (
      minProbability !== undefined ||
      maxProbability !== undefined
    ) {
      filter.probability = {};

      if (minProbability !== undefined) {
        filter.probability.$gte =
          Number(minProbability);
      }

      if (maxProbability !== undefined) {
        filter.probability.$lte =
          Number(maxProbability);
      }
    }

    // --------------------------------------------------
    // SORTING
    // --------------------------------------------------

    const allowedSortFields = [
      'createdAt',
      'updatedAt',
      'name',
      'value',
      'probability',
      'expectedRevenue',
      'expectedCloseDate',
      'priority',
      'stage',
      'status',
    ];

    const safeSortBy =
      allowedSortFields.includes(sortBy)
        ? sortBy
        : 'createdAt';

    const safeSortOrder =
      String(sortOrder).toLowerCase() === 'asc'
        ? 1
        : -1;

    // --------------------------------------------------
    // QUERY
    // --------------------------------------------------

    const [opportunities, total] =
      await Promise.all([
        populateOpportunity(
          Opportunity.find(filter)
            .sort({
              [safeSortBy]: safeSortOrder,
            })
            .skip(skip)
            .limit(limit)
            .lean()
        ),

        Opportunity.countDocuments(filter),
      ]);

    const totalPages =
      Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      data: opportunities,

      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage:
          page < totalPages,
        hasPreviousPage:
          page > 1,
      },

      filters: {
        search: search || '',
        stage: stage || null,
        status: status || null,
        priority: priority || null,
        owner: owner || null,
        company: company || null,
        contact: contact || null,
        lead: lead || null,
        sourceType: sourceType || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// GET OPPORTUNITY BY ID
// ======================================================

const getOpportunityById = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid opportunity ID',
      });
    }

    const opportunity =
      await populateOpportunity(
        Opportunity.findById(id)
      );

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        message: 'Opportunity not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: opportunity,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// UPDATE OPPORTUNITY
// ======================================================

const updateOpportunity = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid opportunity ID',
      });
    }

    const existing =
      await Opportunity.findById(id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Opportunity not found',
      });
    }

    const allowedFields = [
      'name',
      'description',
      'company',
      'contact',
      'lead',
      'owner',
      'value',
      'currency',
      'stage',
      'status',
      'probability',
      'expectedCloseDate',
      'actualCloseDate',
      'priority',
      'source',
      'sourceType',
      'products',
      'nextFollowUpDate',
      'lastContactedAt',
      'lostReason',
      'wonReason',
      'tags',
      'notes',
    ];

    const updateData = {};

    for (const field of allowedFields) {
      if (
        Object.prototype.hasOwnProperty.call(
          req.body,
          field
        )
      ) {
        updateData[field] =
          req.body[field];
      }
    }

    // --------------------------------------------------
    // BASIC VALIDATION
    // --------------------------------------------------

    if (
      updateData.name !== undefined &&
      !String(updateData.name).trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Opportunity name cannot be empty',
      });
    }

    // --------------------------------------------------
    // OBJECT IDS
    // --------------------------------------------------

    const objectIdFields = [
      'company',
      'contact',
      'lead',
      'owner',
    ];

    for (const field of objectIdFields) {
      if (
        updateData[field] &&
        !isValidObjectId(
          updateData[field]
        )
      ) {
        return res.status(400).json({
          success: false,
          message: `Invalid ${field}`,
        });
      }
    }

    // --------------------------------------------------
    // ENUMS
    // --------------------------------------------------

    if (
      updateData.stage &&
      !OPPORTUNITY_STAGES.includes(
        updateData.stage
      )
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid opportunity stage',
        allowedStages:
          OPPORTUNITY_STAGES,
      });
    }

    if (
      updateData.status &&
      !OPPORTUNITY_STATUS.includes(
        updateData.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid opportunity status',
        allowedStatuses:
          OPPORTUNITY_STATUS,
      });
    }

    if (
      updateData.priority &&
      !OPPORTUNITY_PRIORITIES.includes(
        updateData.priority
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid opportunity priority',
        allowedPriorities:
          OPPORTUNITY_PRIORITIES,
      });
    }

    if (
      updateData.sourceType &&
      !OPPORTUNITY_SOURCES.includes(
        updateData.sourceType
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid opportunity source type',
        allowedSources:
          OPPORTUNITY_SOURCES,
      });
    }

    // --------------------------------------------------
    // NUMBERS
    // --------------------------------------------------

    if (updateData.value !== undefined) {
      const numericValue =
        Number(updateData.value);

      if (
        Number.isNaN(numericValue) ||
        numericValue < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Value must be a valid positive number',
        });
      }

      updateData.value =
        numericValue;
    }

    if (
      updateData.probability !== undefined
    ) {
      const numericProbability =
        Number(updateData.probability);

      if (
        Number.isNaN(
          numericProbability
        ) ||
        numericProbability < 0 ||
        numericProbability > 100
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Probability must be between 0 and 100',
        });
      }

      updateData.probability =
        numericProbability;
    }

    // --------------------------------------------------
    // PRODUCTS
    // --------------------------------------------------

    if (
      updateData.products !== undefined
    ) {
      if (
        !Array.isArray(
          updateData.products
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Products must be an array',
        });
      }

      for (
        const item of updateData.products
      ) {
        if (
          !item.product ||
          !isValidObjectId(
            item.product
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              'Invalid product ID',
          });
        }

        if (
          item.quantity !== undefined &&
          Number(item.quantity) < 1
        ) {
          return res.status(400).json({
            success: false,
            message:
              'Product quantity must be at least 1',
          });
        }

        if (
          item.price !== undefined &&
          Number(item.price) < 0
        ) {
          return res.status(400).json({
            success: false,
            message:
              'Product price cannot be negative',
          });
        }
      }
    }

    // --------------------------------------------------
    // NORMALIZATION
    // --------------------------------------------------

    if (updateData.name !== undefined) {
      updateData.name =
        String(updateData.name).trim();
    }

    if (
      updateData.currency !== undefined
    ) {
      updateData.currency =
        String(updateData.currency)
          .trim()
          .toUpperCase();
    }

    if (
      updateData.source !== undefined
    ) {
      updateData.source =
        String(updateData.source).trim();
    }

    if (
      updateData.description !== undefined
    ) {
      updateData.description =
        String(updateData.description).trim();
    }

    if (
      updateData.notes !== undefined
    ) {
      updateData.notes =
        String(updateData.notes).trim();
    }

    if (
      updateData.tags !== undefined
    ) {
      updateData.tags =
        Array.isArray(updateData.tags)
          ? updateData.tags
              .map((tag) =>
                String(tag).trim()
              )
              .filter(Boolean)
          : [];
    }

    // --------------------------------------------------
    // UPDATE AUDIT
    // --------------------------------------------------

    updateData.updatedBy =
      getUserId(req);

    // --------------------------------------------------
    // FIND + SAVE
    //
    // Using document.save() ensures schema
    // pre('validate') runs and recalculates:
    // expectedRevenue / status / probability
    // --------------------------------------------------

    Object.assign(
      existing,
      updateData
    );

    await existing.save();

    const updatedOpportunity =
      await populateOpportunity(
        Opportunity.findById(id)
      );

    return res.status(200).json({
      success: true,
      message:
        'Opportunity updated successfully',
      data: updatedOpportunity,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// DELETE OPPORTUNITY
// ======================================================

const deleteOpportunity = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid opportunity ID',
      });
    }

    const opportunity =
      await Opportunity.findById(id);

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        message: 'Opportunity not found',
      });
    }

    await Opportunity.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message:
        'Opportunity deleted successfully',
      data: {
        id,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// RESTORE OPPORTUNITY
// ======================================================
//
// Current schema does not have deletedAt.
// Therefore this endpoint is intentionally NOT
// exposed in routes.
// ======================================================

// ======================================================
// GET OPPORTUNITY STATS
// ======================================================

const getOpportunityStats = async (
  req,
  res,
  next
) => {
  try {
    const match = {};

    // Optional owner filter
    if (req.query.owner) {
      if (
        !isValidObjectId(
          req.query.owner
        )
      ) {
        return res.status(400).json({
          success: false,
          message: 'Invalid owner ID',
        });
      }

      match.owner =
        new mongoose.Types.ObjectId(
          req.query.owner
        );
    }

    // Optional date filter
    const dateRange =
      buildDateRange(
        req.query.dateFrom,
        req.query.dateTo
      );

    if (dateRange) {
      match.createdAt =
        dateRange;
    }

    // --------------------------------------------------
    // OVERALL STATS
    // --------------------------------------------------

    const [
      total,
      open,
      won,
      lost,
      totalValue,
      openValue,
      wonRevenue,
      lostValue,
    ] = await Promise.all([
      Opportunity.countDocuments(match),

      Opportunity.countDocuments({
        ...match,
        status: 'OPEN',
      }),

      Opportunity.countDocuments({
        ...match,
        status: 'WON',
      }),

      Opportunity.countDocuments({
        ...match,
        status: 'LOST',
      }),

      Opportunity.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            value: {
              $sum: '$value',
            },
          },
        },
      ]),

      Opportunity.aggregate([
        {
          $match: {
            ...match,
            status: 'OPEN',
          },
        },
        {
          $group: {
            _id: null,
            value: {
              $sum: '$value',
            },
            weightedValue: {
              $sum: '$expectedRevenue',
            },
          },
        },
      ]),

      Opportunity.aggregate([
        {
          $match: {
            ...match,
            status: 'WON',
          },
        },
        {
          $group: {
            _id: null,
            value: {
              $sum: '$value',
            },
          },
        },
      ]),

      Opportunity.aggregate([
        {
          $match: {
            ...match,
            status: 'LOST',
          },
        },
        {
          $group: {
            _id: null,
            value: {
              $sum: '$value',
            },
          },
        },
      ]),
    ]);

    const totalPipelineValue =
      totalValue[0]?.value || 0;

    const openPipelineValue =
      openValue[0]?.value || 0;

    const weightedPipelineValue =
      openValue[0]?.weightedValue || 0;

    const totalWonRevenue =
      wonRevenue[0]?.value || 0;

    const totalLostValue =
      lostValue[0]?.value || 0;

    const closedCount =
      won + lost;

    const winRate =
      closedCount > 0
        ? Number(
            (
              (won / closedCount) *
              100
            ).toFixed(2)
          )
        : 0;

    // --------------------------------------------------
    // STAGE STATS
    // --------------------------------------------------

    const stageStats =
      await Opportunity.aggregate([
        {
          $match: match,
        },
        {
          $group: {
            _id: '$stage',

            count: {
              $sum: 1,
            },

            value: {
              $sum: '$value',
            },

            expectedRevenue: {
              $sum: '$expectedRevenue',
            },
          },
        },
        {
          $sort: {
            value: -1,
          },
        },
      ]);

    // --------------------------------------------------
    // PRIORITY STATS
    // --------------------------------------------------

    const priorityStats =
      await Opportunity.aggregate([
        {
          $match: match,
        },
        {
          $group: {
            _id: '$priority',

            count: {
              $sum: 1,
            },

            value: {
              $sum: '$value',
            },
          },
        },
        {
          $sort: {
            value: -1,
          },
        },
      ]);

    // --------------------------------------------------
    // SOURCE STATS
    // --------------------------------------------------

    const sourceStats =
      await Opportunity.aggregate([
        {
          $match: match,
        },
        {
          $group: {
            _id: '$sourceType',

            count: {
              $sum: 1,
            },

            value: {
              $sum: '$value',
            },
          },
        },
        {
          $sort: {
            value: -1,
          },
        },
      ]);

    // --------------------------------------------------
    // MONTHLY PIPELINE
    // --------------------------------------------------

    const monthlyPipeline =
      await Opportunity.aggregate([
        {
          $match: match,
        },
        {
          $group: {
            _id: {
              year: {
                $year: '$createdAt',
              },

              month: {
                $month: '$createdAt',
              },
            },

            count: {
              $sum: 1,
            },

            value: {
              $sum: '$value',
            },

            expectedRevenue: {
              $sum: '$expectedRevenue',
            },
          },
        },
        {
          $sort: {
            '_id.year': 1,
            '_id.month': 1,
          },
        },
      ]);

    // --------------------------------------------------
    // UPCOMING CLOSURES
    // --------------------------------------------------

    const upcomingClosures =
      await Opportunity.countDocuments({
        ...match,

        status: 'OPEN',

        expectedCloseDate: {
          $gte: new Date(),
        },
      });

    return res.status(200).json({
      success: true,

      data: {
        overview: {
          total,
          open,
          won,
          lost,

          totalPipelineValue,
          openPipelineValue,
          weightedPipelineValue,

          wonRevenue: totalWonRevenue,
          lostValue: totalLostValue,

          winRate,
          upcomingClosures,
        },

        stages: stageStats,

        priorities: priorityStats,

        sources: sourceStats,

        monthlyPipeline,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// GET PIPELINE
// ======================================================

const getOpportunityPipeline = async (
  req,
  res,
  next
) => {
  try {
    const filter = {
      status: 'OPEN',
    };

    if (req.query.owner) {
      if (
        !isValidObjectId(
          req.query.owner
        )
      ) {
        return res.status(400).json({
          success: false,
          message: 'Invalid owner ID',
        });
      }

      filter.owner =
        req.query.owner;
    }

    if (req.query.company) {
      if (
        !isValidObjectId(
          req.query.company
        )
      ) {
        return res.status(400).json({
          success: false,
          message: 'Invalid company ID',
        });
      }

      filter.company =
        req.query.company;
    }

    const pipeline =
      await Opportunity.aggregate([
        {
          $match: filter,
        },

        {
          $group: {
            _id: '$stage',

            count: {
              $sum: 1,
            },

            totalValue: {
              $sum: '$value',
            },

            expectedRevenue: {
              $sum: '$expectedRevenue',
            },

            opportunities: {
              $push: {
                _id: '$_id',
                name: '$name',
                value: '$value',
                currency: '$currency',
                probability:
                  '$probability',
                expectedRevenue:
                  '$expectedRevenue',
                expectedCloseDate:
                  '$expectedCloseDate',
                priority:
                  '$priority',
                owner: '$owner',
                company:
                  '$company',
              },
            },
          },
        },
      ]);

    const stageOrder =
      OPPORTUNITY_STAGES;

    pipeline.sort((a, b) => {
      return (
        stageOrder.indexOf(a._id) -
        stageOrder.indexOf(b._id)
      );
    });

    // Populate aggregated owner/company IDs
    const populatedPipeline =
      await Promise.all(
        pipeline.map(async (stage) => {
          const opportunities =
            await Opportunity.find({
              _id: {
                $in:
                  stage.opportunities.map(
                    (item) =>
                      item._id
                  ),
              },
            })
              .populate({
                path: 'company',
                select:
                  'name email phone',
              })
              .populate({
                path: 'owner',
                select:
                  'firstName lastName name email',
              })
              .sort({
                createdAt: -1,
              })
              .lean();

          return {
            stage: stage._id,

            count: stage.count,

            totalValue:
              stage.totalValue,

            expectedRevenue:
              stage.expectedRevenue,

            opportunities,
          };
        })
      );

    return res.status(200).json({
      success: true,
      data: populatedPipeline,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// UPDATE OPPORTUNITY STAGE
// ======================================================

const updateOpportunityStage = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;
    const {
      stage,
      probability,
    } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid opportunity ID',
      });
    }

    if (
      !stage ||
      !OPPORTUNITY_STAGES.includes(stage)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid opportunity stage',
        allowedStages:
          OPPORTUNITY_STAGES,
      });
    }

    const opportunity =
      await Opportunity.findById(id);

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        message: 'Opportunity not found',
      });
    }

    opportunity.stage = stage;

    if (probability !== undefined) {
      const numericProbability =
        Number(probability);

      if (
        Number.isNaN(
          numericProbability
        ) ||
        numericProbability < 0 ||
        numericProbability > 100
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Probability must be between 0 and 100',
        });
      }

      opportunity.probability =
        numericProbability;
    }

    opportunity.updatedBy =
      getUserId(req);

    await opportunity.save();

    const updated =
      await populateOpportunity(
        Opportunity.findById(id)
      );

    return res.status(200).json({
      success: true,
      message:
        'Opportunity stage updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// CLOSE OPPORTUNITY
// ======================================================

const closeOpportunity = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    const {
      result,
      reason,
      actualCloseDate,
    } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid opportunity ID',
      });
    }

    if (
      !['WON', 'LOST'].includes(result)
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Result must be either WON or LOST',
      });
    }

    const opportunity =
      await Opportunity.findById(id);

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        message: 'Opportunity not found',
      });
    }

    if (result === 'WON') {
      opportunity.stage =
        'CLOSED_WON';

      opportunity.status =
        'WON';

      opportunity.probability =
        100;

      opportunity.wonReason =
        reason
          ? String(reason).trim()
          : '';

      opportunity.lostReason = '';
    }

    if (result === 'LOST') {
      opportunity.stage =
        'CLOSED_LOST';

      opportunity.status =
        'LOST';

      opportunity.probability =
        0;

      opportunity.lostReason =
        reason
          ? String(reason).trim()
          : '';

      opportunity.wonReason = '';
    }

    opportunity.actualCloseDate =
      actualCloseDate
        ? new Date(actualCloseDate)
        : new Date();

    opportunity.updatedBy =
      getUserId(req);

    await opportunity.save();

    const updated =
      await populateOpportunity(
        Opportunity.findById(id)
      );

    return res.status(200).json({
      success: true,
      message:
        result === 'WON'
          ? 'Opportunity marked as won'
          : 'Opportunity marked as lost',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// GET MY OPPORTUNITIES
// ======================================================

const getMyOpportunities = async (
  req,
  res,
  next
) => {
  try {
    const userId =
      getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          'Authenticated user not found',
      });
    }

    const {
      page,
      limit,
      skip,
    } = normalizePagination(req);

    const filter = {
      owner: userId,
    };

    if (req.query.status) {
      filter.status =
        req.query.status;
    }

    if (req.query.stage) {
      filter.stage =
        req.query.stage;
    }

    const [data, total] =
      await Promise.all([
        populateOpportunity(
          Opportunity.find(filter)
            .sort({
              createdAt: -1,
            })
            .skip(skip)
            .limit(limit)
            .lean()
        ),

        Opportunity.countDocuments(
          filter
        ),
      ]);

    const totalPages =
      Math.ceil(total / limit);

    return res.status(200).json({
      success: true,

      data,

      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage:
          page < totalPages,
        hasPreviousPage:
          page > 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// GET UPCOMING CLOSES
// ======================================================

const getUpcomingClosures = async (
  req,
  res,
  next
) => {
  try {
    const days = Math.min(
      Math.max(
        Number.parseInt(
          req.query.days,
          10
        ) || 30,
        1
      ),
      365
    );

    const startDate =
      new Date();

    startDate.setHours(
      0,
      0,
      0,
      0
    );

    const endDate =
      new Date();

    endDate.setDate(
      endDate.getDate() + days
    );

    endDate.setHours(
      23,
      59,
      59,
      999
    );

    const filter = {
      status: 'OPEN',

      expectedCloseDate: {
        $gte: startDate,
        $lte: endDate,
      },
    };

    if (req.query.owner) {
      if (
        !isValidObjectId(
          req.query.owner
        )
      ) {
        return res.status(400).json({
          success: false,
          message: 'Invalid owner ID',
        });
      }

      filter.owner =
        req.query.owner;
    }

    const opportunities =
      await populateOpportunity(
        Opportunity.find(filter)
          .sort({
            expectedCloseDate: 1,
          })
          .limit(100)
          .lean()
      );

    return res.status(200).json({
      success: true,

      data: opportunities,

      meta: {
        days,
        count:
          opportunities.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  createOpportunity,
  getOpportunities,
  getOpportunityById,
  updateOpportunity,
  deleteOpportunity,

  getOpportunityStats,
  getOpportunityPipeline,

  updateOpportunityStage,
  closeOpportunity,

  getMyOpportunities,
  getUpcomingClosures,
};