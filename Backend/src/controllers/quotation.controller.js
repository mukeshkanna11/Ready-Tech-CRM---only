'use strict';

const mongoose = require('mongoose');

const Quotation = require('../models/Quotation');
const Company = require('../models/Company');
const Contact = require('../models/Contact');
const Opportunity = require('../models/Opportunity');
const User = require('../models/User');
const Product = require('../models/Product');

// ============================================================
// HELPERS
// ============================================================

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

const escapeRegex = (value = '') => {
  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
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

const buildDate = (value) => {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

const populateQuotation = (query) => {
  return query
    .populate({
      path: 'company',
      select: 'name email phone website industry status',
    })
    .populate({
      path: 'contact',
      select:
        'firstName lastName email phone designation company',
    })
    .populate({
      path: 'opportunity',
      select:
        'name value stage status probability expectedCloseDate',
    })
    .populate({
      path: 'owner',
      select:
        'firstName lastName name email role',
    })
    .populate({
      path: 'createdBy',
      select:
        'firstName lastName name email role',
    })
    .populate({
      path: 'updatedBy',
      select:
        'firstName lastName name email role',
    })
    .populate({
      path: 'items.product',
      select:
        'name sku price sellingPrice unit category status',
    });
};

// ============================================================
// CREATE QUOTATION
// ============================================================

const createQuotation = async (req, res, next) => {
  try {
    const userId = getUserId(req);

    const {
      quotationNumber,
      company,
      contact,
      opportunity,
      owner,
      issueDate,
      validUntil,
      currency,
      items,
      status,
      notes,
      termsAndConditions,
      customerNotes,
      internalNotes,
      billingAddress,
      shippingAddress,
      tags,
    } = req.body;

    // --------------------------------------------------------
    // Basic validation
    // --------------------------------------------------------

    if (!quotationNumber) {
      return res.status(400).json({
        success: false,
        message: 'Quotation number is required',
      });
    }

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          'At least one quotation item is required',
      });
    }

    // --------------------------------------------------------
    // Validate quotation number
    // --------------------------------------------------------

    const normalizedQuotationNumber =
      String(quotationNumber)
        .trim()
        .toUpperCase();

    const existingQuotation =
      await Quotation.findOne({
        quotationNumber:
          normalizedQuotationNumber,
      }).lean();

    if (existingQuotation) {
      return res.status(409).json({
        success: false,
        message:
          'Quotation number already exists',
      });
    }

    // --------------------------------------------------------
    // Validate company
    // --------------------------------------------------------

    if (
      company &&
      !isValidObjectId(company)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid company ID',
      });
    }

    if (company) {
      const companyExists =
        await Company.exists({
          _id: company,
        });

      if (!companyExists) {
        return res.status(404).json({
          success: false,
          message: 'Company not found',
        });
      }
    }

    // --------------------------------------------------------
    // Validate contact
    // --------------------------------------------------------

    if (
      contact &&
      !isValidObjectId(contact)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid contact ID',
      });
    }

    if (contact) {
      const contactExists =
        await Contact.exists({
          _id: contact,
        });

      if (!contactExists) {
        return res.status(404).json({
          success: false,
          message: 'Contact not found',
        });
      }
    }

    // --------------------------------------------------------
    // Validate opportunity
    // --------------------------------------------------------

    if (
      opportunity &&
      !isValidObjectId(opportunity)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid opportunity ID',
      });
    }

    if (opportunity) {
      const opportunityExists =
        await Opportunity.exists({
          _id: opportunity,
        });

      if (!opportunityExists) {
        return res.status(404).json({
          success: false,
          message: 'Opportunity not found',
        });
      }
    }

    // --------------------------------------------------------
    // Validate owner
    // --------------------------------------------------------

    if (
      owner &&
      !isValidObjectId(owner)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid owner ID',
      });
    }

    if (owner) {
      const ownerExists =
        await User.exists({
          _id: owner,
        });

      if (!ownerExists) {
        return res.status(404).json({
          success: false,
          message: 'Owner not found',
        });
      }
    }

    // --------------------------------------------------------
    // Validate products
    // --------------------------------------------------------

    for (const item of items) {
      if (
        item.product &&
        !isValidObjectId(item.product)
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Invalid product ID in quotation items',
        });
      }

      if (item.product) {
        const productExists =
          await Product.exists({
            _id: item.product,
          });

        if (!productExists) {
          return res.status(404).json({
            success: false,
            message:
              `Product not found: ${item.product}`,
          });
        }
      }

      const quantity = Number(
        item.quantity ?? 1
      );

      const unitPrice = Number(
        item.unitPrice ?? 0
      );

      const taxRate = Number(
        item.taxRate ?? 0
      );

      const discountRate = Number(
        item.discountRate ?? 0
      );

      if (
        !Number.isFinite(quantity) ||
        quantity <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Item quantity must be greater than 0',
        });
      }

      if (
        !Number.isFinite(unitPrice) ||
        unitPrice < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Item unit price cannot be negative',
        });
      }

      if (
        !Number.isFinite(taxRate) ||
        taxRate < 0 ||
        taxRate > 100
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Item tax rate must be between 0 and 100',
        });
      }

      if (
        !Number.isFinite(discountRate) ||
        discountRate < 0 ||
        discountRate > 100
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Item discount rate must be between 0 and 100',
        });
      }
    }

    // --------------------------------------------------------
    // Date validation
    // --------------------------------------------------------

    const parsedIssueDate =
      issueDate
        ? buildDate(issueDate)
        : new Date();

    if (!parsedIssueDate) {
      return res.status(400).json({
        success: false,
        message: 'Invalid issue date',
      });
    }

    const parsedValidUntil =
      validUntil
        ? buildDate(validUntil)
        : null;

    if (
      validUntil &&
      !parsedValidUntil
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid valid-until date',
      });
    }

    if (
      parsedValidUntil &&
      parsedValidUntil < parsedIssueDate
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Valid-until date cannot be before issue date',
      });
    }

    // --------------------------------------------------------
    // Create
    // --------------------------------------------------------

    const quotation =
      new Quotation({
        quotationNumber:
          normalizedQuotationNumber,

        company: company || undefined,

        contact: contact || undefined,

        opportunity:
          opportunity || undefined,

        owner:
          owner ||
          userId ||
          undefined,

        createdBy:
          userId ||
          undefined,

        issueDate:
          parsedIssueDate,

        validUntil:
          parsedValidUntil || undefined,

        currency:
          currency || 'INR',

        items,

        status:
          status || 'DRAFT',

        notes:
          notes || '',

        termsAndConditions:
          termsAndConditions || '',

        customerNotes:
          customerNotes || '',

        internalNotes:
          internalNotes || '',

        billingAddress:
          billingAddress || '',

        shippingAddress:
          shippingAddress || '',

        tags:
          Array.isArray(tags)
            ? tags
            : [],
      });

    await quotation.save();

    const populatedQuotation =
      await populateQuotation(
        Quotation.findById(quotation._id)
      );

    return res.status(201).json({
      success: true,
      message:
        'Quotation created successfully',
      data: populatedQuotation,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          'Quotation number already exists',
      });
    }

    next(error);
  }
};

// ============================================================
// GET ALL QUOTATIONS
// ============================================================

const getQuotations = async (req, res, next) => {
  try {
    const {
      page,
      limit,
      skip,
    } = normalizePagination(req);

    const {
      search,
      quotationNumber,
      company,
      contact,
      opportunity,
      owner,
      status,
      currency,
      minAmount,
      maxAmount,
      issueFrom,
      issueTo,
      validFrom,
      validTo,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const filter = {};

    // --------------------------------------------------------
    // Search
    // --------------------------------------------------------

    if (search?.trim()) {
      const regex = new RegExp(
        escapeRegex(search.trim()),
        'i'
      );

      filter.$or = [
        {
          quotationNumber: regex,
        },
        {
          notes: regex,
        },
        {
          customerNotes: regex,
        },
        {
          internalNotes: regex,
        },
      ];
    }

    // --------------------------------------------------------
    // Exact quotation number
    // --------------------------------------------------------

    if (quotationNumber?.trim()) {
      filter.quotationNumber =
        new RegExp(
          `^${escapeRegex(
            quotationNumber.trim()
          )}$`,
          'i'
        );
    }

    // --------------------------------------------------------
    // ObjectId filters
    // --------------------------------------------------------

    const objectIdFilters = [
      ['company', company],
      ['contact', contact],
      ['opportunity', opportunity],
      ['owner', owner],
    ];

    for (
      const [field, value] of objectIdFilters
    ) {
      if (value) {
        if (!isValidObjectId(value)) {
          return res.status(400).json({
            success: false,
            message:
              `Invalid ${field} ID`,
          });
        }

        filter[field] = value;
      }
    }

    // --------------------------------------------------------
    // Status
    // --------------------------------------------------------

    if (status) {
      const statuses = String(status)
        .split(',')
        .map((item) =>
          item.trim().toUpperCase()
        )
        .filter(Boolean);

      filter.status =
        statuses.length === 1
          ? statuses[0]
          : { $in: statuses };
    }

    // --------------------------------------------------------
    // Currency
    // --------------------------------------------------------

    if (currency) {
      filter.currency =
        String(currency)
          .trim()
          .toUpperCase();
    }

    // --------------------------------------------------------
    // Amount
    // --------------------------------------------------------

    if (
      minAmount !== undefined ||
      maxAmount !== undefined
    ) {
      filter.grandTotal = {};

      if (minAmount !== undefined) {
        const value = Number(minAmount);

        if (!Number.isFinite(value)) {
          return res.status(400).json({
            success: false,
            message:
              'Invalid minAmount',
          });
        }

        filter.grandTotal.$gte = value;
      }

      if (maxAmount !== undefined) {
        const value = Number(maxAmount);

        if (!Number.isFinite(value)) {
          return res.status(400).json({
            success: false,
            message:
              'Invalid maxAmount',
          });
        }

        filter.grandTotal.$lte = value;
      }
    }

    // --------------------------------------------------------
    // Issue date range
    // --------------------------------------------------------

    if (issueFrom || issueTo) {
      filter.issueDate = {};

      if (issueFrom) {
        const date = buildDate(issueFrom);

        if (!date) {
          return res.status(400).json({
            success: false,
            message:
              'Invalid issueFrom date',
          });
        }

        filter.issueDate.$gte = date;
      }

      if (issueTo) {
        const date = buildDate(issueTo);

        if (!date) {
          return res.status(400).json({
            success: false,
            message:
              'Invalid issueTo date',
          });
        }

        date.setHours(
          23,
          59,
          59,
          999
        );

        filter.issueDate.$lte = date;
      }
    }

    // --------------------------------------------------------
    // Valid until range
    // --------------------------------------------------------

    if (validFrom || validTo) {
      filter.validUntil = {};

      if (validFrom) {
        const date = buildDate(validFrom);

        if (!date) {
          return res.status(400).json({
            success: false,
            message:
              'Invalid validFrom date',
          });
        }

        filter.validUntil.$gte = date;
      }

      if (validTo) {
        const date = buildDate(validTo);

        if (!date) {
          return res.status(400).json({
            success: false,
            message:
              'Invalid validTo date',
          });
        }

        date.setHours(
          23,
          59,
          59,
          999
        );

        filter.validUntil.$lte = date;
      }
    }

    // --------------------------------------------------------
    // Sorting
    // --------------------------------------------------------

    const allowedSortFields = [
      'createdAt',
      'updatedAt',
      'issueDate',
      'validUntil',
      'grandTotal',
      'quotationNumber',
      'status',
    ];

    const safeSortBy =
      allowedSortFields.includes(sortBy)
        ? sortBy
        : 'createdAt';

    const safeSortOrder =
      String(sortOrder).toLowerCase() ===
      'asc'
        ? 1
        : -1;

    const sort = {
      [safeSortBy]: safeSortOrder,
    };

    // --------------------------------------------------------
    // Query
    // --------------------------------------------------------

    const [quotations, total] =
      await Promise.all([
        populateQuotation(
          Quotation.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limit)
        ),

        Quotation.countDocuments(filter),
      ]);

    const totalPages =
      Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      data: quotations,
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

// ============================================================
// GET QUOTATION BY ID
// ============================================================

const getQuotationById = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid quotation ID',
      });
    }

    const quotation =
      await populateQuotation(
        Quotation.findById(id)
      );

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message:
          'Quotation not found',
      });
    }

    // Automatically mark as VIEWED
    if (
      quotation.status === 'SENT'
    ) {
      quotation.status = 'VIEWED';
      quotation.viewedAt =
        quotation.viewedAt ||
        new Date();

      await quotation.save();
    }

    return res.status(200).json({
      success: true,
      data: quotation,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// UPDATE QUOTATION
// ============================================================

const updateQuotation = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    const userId = getUserId(req);

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid quotation ID',
      });
    }

    const quotation =
      await Quotation.findById(id);

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message:
          'Quotation not found',
      });
    }

    // --------------------------------------------------------
    // Prevent modifying finalized quotation
    // --------------------------------------------------------

    if (
      ['ACCEPTED', 'REJECTED'].includes(
        quotation.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Cannot modify a ${quotation.status.toLowerCase()} quotation`,
      });
    }

    const allowedFields = [
      'quotationNumber',
      'company',
      'contact',
      'opportunity',
      'owner',
      'issueDate',
      'validUntil',
      'currency',
      'items',
      'status',
      'notes',
      'termsAndConditions',
      'customerNotes',
      'internalNotes',
      'billingAddress',
      'shippingAddress',
      'tags',
    ];

    for (const field of allowedFields) {
      if (
        Object.prototype.hasOwnProperty.call(
          req.body,
          field
        )
      ) {
        quotation[field] =
          req.body[field];
      }
    }

    quotation.updatedBy =
      userId || quotation.updatedBy;

    // --------------------------------------------------------
    // Validate quotation number
    // --------------------------------------------------------

    if (quotation.quotationNumber) {
      quotation.quotationNumber =
        String(
          quotation.quotationNumber
        )
          .trim()
          .toUpperCase();

      const duplicate =
        await Quotation.findOne({
          quotationNumber:
            quotation.quotationNumber,

          _id: {
            $ne: quotation._id,
          },
        }).lean();

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message:
            'Quotation number already exists',
        });
      }
    }

    // --------------------------------------------------------
    // Validate relationships
    // --------------------------------------------------------

    if (
      quotation.company &&
      !isValidObjectId(
        quotation.company
      )
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid company ID',
      });
    }

    if (
      quotation.contact &&
      !isValidObjectId(
        quotation.contact
      )
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid contact ID',
      });
    }

    if (
      quotation.opportunity &&
      !isValidObjectId(
        quotation.opportunity
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid opportunity ID',
      });
    }

    if (
      quotation.owner &&
      !isValidObjectId(
        quotation.owner
      )
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid owner ID',
      });
    }

    // --------------------------------------------------------
    // Validate dates
    // --------------------------------------------------------

    if (
      quotation.issueDate &&
      Number.isNaN(
        new Date(
          quotation.issueDate
        ).getTime()
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid issue date',
      });
    }

    if (
      quotation.validUntil &&
      Number.isNaN(
        new Date(
          quotation.validUntil
        ).getTime()
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid valid-until date',
      });
    }

    if (
      quotation.issueDate &&
      quotation.validUntil &&
      new Date(
        quotation.validUntil
      ) <
        new Date(
          quotation.issueDate
        )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Valid-until date cannot be before issue date',
      });
    }

    // --------------------------------------------------------
    // Save
    // --------------------------------------------------------

    await quotation.save();

    const updatedQuotation =
      await populateQuotation(
        Quotation.findById(
          quotation._id
        )
      );

    return res.status(200).json({
      success: true,
      message:
        'Quotation updated successfully',
      data: updatedQuotation,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          'Quotation number already exists',
      });
    }

    next(error);
  }
};

// ============================================================
// DELETE QUOTATION
// ============================================================

const deleteQuotation = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid quotation ID',
      });
    }

    const quotation =
      await Quotation.findById(id);

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message:
          'Quotation not found',
      });
    }

    // --------------------------------------------------------
    // Prevent deletion of accepted quotation
    // --------------------------------------------------------

    if (
      quotation.status === 'ACCEPTED'
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Accepted quotation cannot be deleted',
      });
    }

    await Quotation.deleteOne({
      _id: id,
    });

    return res.status(200).json({
      success: true,
      message:
        'Quotation deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// QUOTATION STATS
// ============================================================

const getQuotationStats = async (
  req,
  res,
  next
) => {
  try {
    const [
      summary,
      statusStats,
      revenueStats,
    ] = await Promise.all([
      Quotation.aggregate([
        {
          $group: {
            _id: null,
            totalQuotations: {
              $sum: 1,
            },

            totalValue: {
              $sum: '$grandTotal',
            },

            averageValue: {
              $avg: '$grandTotal',
            },
          },
        },
      ]),

      Quotation.aggregate([
        {
          $group: {
            _id: '$status',

            count: {
              $sum: 1,
            },

            value: {
              $sum: '$grandTotal',
            },
          },
        },

        {
          $sort: {
            count: -1,
          },
        },
      ]),

      Quotation.aggregate([
        {
          $match: {
            status: 'ACCEPTED',
          },
        },

        {
          $group: {
            _id: null,

            acceptedValue: {
              $sum: '$grandTotal',
            },

            acceptedCount: {
              $sum: 1,
            },
          },
        },
      ]),
    ]);

    const statusMap = {};

    statusStats.forEach((item) => {
      statusMap[item._id] = {
        count: item.count,
        value: Number(
          item.value.toFixed(2)
        ),
      };
    });

    const total =
      summary[0]?.totalQuotations || 0;

    const totalValue =
      summary[0]?.totalValue || 0;

    const averageValue =
      summary[0]?.averageValue || 0;

    const acceptedCount =
      revenueStats[0]?.acceptedCount || 0;

    const acceptedValue =
      revenueStats[0]?.acceptedValue || 0;

    const acceptanceRate =
      total > 0
        ? Number(
            (
              (acceptedCount / total) *
              100
            ).toFixed(2)
          )
        : 0;

    return res.status(200).json({
      success: true,
      data: {
        totalQuotations: total,

        totalValue: Number(
          totalValue.toFixed(2)
        ),

        averageValue: Number(
          averageValue.toFixed(2)
        ),

        acceptedCount,

        acceptedValue: Number(
          acceptedValue.toFixed(2)
        ),

        acceptanceRate,

        draft:
          statusMap.DRAFT || {
            count: 0,
            value: 0,
          },

        sent:
          statusMap.SENT || {
            count: 0,
            value: 0,
          },

        viewed:
          statusMap.VIEWED || {
            count: 0,
            value: 0,
          },

        accepted:
          statusMap.ACCEPTED || {
            count: 0,
            value: 0,
          },

        rejected:
          statusMap.REJECTED || {
            count: 0,
            value: 0,
          },

        expired:
          statusMap.EXPIRED || {
            count: 0,
            value: 0,
          },

        byStatus: statusStats,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// UPDATE QUOTATION STATUS
// ============================================================

const updateQuotationStatus = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    const {
      status,
      reason,
    } = req.body;

    const userId = getUserId(req);

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid quotation ID',
      });
    }

    const allowedStatuses = [
      'DRAFT',
      'SENT',
      'VIEWED',
      'ACCEPTED',
      'REJECTED',
      'EXPIRED',
    ];

    const normalizedStatus =
      String(status || '')
        .trim()
        .toUpperCase();

    if (
      !allowedStatuses.includes(
        normalizedStatus
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid quotation status',
      });
    }

    const quotation =
      await Quotation.findById(id);

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message:
          'Quotation not found',
      });
    }

    // --------------------------------------------------------
    // Business rules
    // --------------------------------------------------------

    if (
      quotation.status === 'ACCEPTED' &&
      normalizedStatus !== 'ACCEPTED'
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Accepted quotation cannot change status',
      });
    }

    if (
      quotation.status === 'REJECTED' &&
      normalizedStatus !== 'REJECTED'
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Rejected quotation cannot change status',
      });
    }

    if (
      normalizedStatus === 'ACCEPTED' &&
      quotation.validUntil &&
      new Date(
        quotation.validUntil
      ) < new Date()
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Expired quotation cannot be accepted',
      });
    }

    quotation.status =
      normalizedStatus;

    quotation.updatedBy =
      userId || quotation.updatedBy;

    if (
      normalizedStatus === 'SENT'
    ) {
      quotation.sentAt =
        quotation.sentAt ||
        new Date();
    }

    if (
      normalizedStatus === 'VIEWED'
    ) {
      quotation.viewedAt =
        quotation.viewedAt ||
        new Date();

      quotation.sentAt =
        quotation.sentAt ||
        new Date();
    }

    if (
      normalizedStatus === 'ACCEPTED'
    ) {
      quotation.acceptedAt =
        quotation.acceptedAt ||
        new Date();

      quotation.sentAt =
        quotation.sentAt ||
        new Date();
    }

    if (
      normalizedStatus === 'REJECTED'
    ) {
      quotation.rejectedAt =
        quotation.rejectedAt ||
        new Date();

      quotation.sentAt =
        quotation.sentAt ||
        new Date();

      if (reason) {
        quotation.internalNotes =
          quotation.internalNotes
            ? `${quotation.internalNotes}\nRejection reason: ${reason}`
            : `Rejection reason: ${reason}`;
      }
    }

    if (
      normalizedStatus === 'EXPIRED'
    ) {
      quotation.expiredAt =
        quotation.expiredAt ||
        new Date();
    }

    await quotation.save();

    const updatedQuotation =
      await populateQuotation(
        Quotation.findById(id)
      );

    return res.status(200).json({
      success: true,
      message:
        'Quotation status updated successfully',
      data: updatedQuotation,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// SEND QUOTATION
// ============================================================

const sendQuotation = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    const userId = getUserId(req);

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid quotation ID',
      });
    }

    const quotation =
      await Quotation.findById(id);

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message:
          'Quotation not found',
      });
    }

    if (
      ['ACCEPTED', 'REJECTED'].includes(
        quotation.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Cannot send a ${quotation.status.toLowerCase()} quotation`,
      });
    }

    if (
      quotation.validUntil &&
      new Date(
        quotation.validUntil
      ) < new Date()
    ) {
      quotation.status = 'EXPIRED';
      quotation.expiredAt = new Date();

      await quotation.save();

      return res.status(400).json({
        success: false,
        message:
          'Quotation has expired',
      });
    }

    quotation.status = 'SENT';

    quotation.sentAt =
      quotation.sentAt ||
      new Date();

    quotation.updatedBy =
      userId || quotation.updatedBy;

    await quotation.save();

    const updatedQuotation =
      await populateQuotation(
        Quotation.findById(id)
      );

    return res.status(200).json({
      success: true,
      message:
        'Quotation marked as sent',
      data: updatedQuotation,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// ACCEPT QUOTATION
// ============================================================

const acceptQuotation = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    const userId = getUserId(req);

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid quotation ID',
      });
    }

    const quotation =
      await Quotation.findById(id);

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message:
          'Quotation not found',
      });
    }

    if (
      quotation.status === 'ACCEPTED'
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Quotation is already accepted',
      });
    }

    if (
      quotation.status === 'REJECTED'
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Rejected quotation cannot be accepted',
      });
    }

    if (
      quotation.validUntil &&
      new Date(
        quotation.validUntil
      ) < new Date()
    ) {
      quotation.status = 'EXPIRED';
      quotation.expiredAt =
        new Date();

      await quotation.save();

      return res.status(400).json({
        success: false,
        message:
          'Quotation has expired',
      });
    }

    quotation.status =
      'ACCEPTED';

    quotation.acceptedAt =
      new Date();

    quotation.updatedBy =
      userId || quotation.updatedBy;

    await quotation.save();

    const updatedQuotation =
      await populateQuotation(
        Quotation.findById(id)
      );

    return res.status(200).json({
      success: true,
      message:
        'Quotation accepted successfully',
      data: updatedQuotation,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// REJECT QUOTATION
// ============================================================

const rejectQuotation = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    const {
      reason,
    } = req.body;

    const userId = getUserId(req);

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid quotation ID',
      });
    }

    const quotation =
      await Quotation.findById(id);

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message:
          'Quotation not found',
      });
    }

    if (
      quotation.status === 'ACCEPTED'
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Accepted quotation cannot be rejected',
      });
    }

    quotation.status =
      'REJECTED';

    quotation.rejectedAt =
      new Date();

    quotation.updatedBy =
      userId || quotation.updatedBy;

    if (reason) {
      quotation.internalNotes =
        quotation.internalNotes
          ? `${quotation.internalNotes}\nRejection reason: ${reason}`
          : `Rejection reason: ${reason}`;
    }

    await quotation.save();

    const updatedQuotation =
      await populateQuotation(
        Quotation.findById(id)
      );

    return res.status(200).json({
      success: true,
      message:
        'Quotation rejected successfully',
      data: updatedQuotation,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  createQuotation,
  getQuotations,
  getQuotationById,
  updateQuotation,
  deleteQuotation,
  getQuotationStats,
  updateQuotationStatus,
  sendQuotation,
  acceptQuotation,
  rejectQuotation,
};