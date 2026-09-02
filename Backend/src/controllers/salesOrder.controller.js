'use strict';

const mongoose = require('mongoose');

const SalesOrder = require('../models/SalesOrder');
const Quotation = require('../models/Quotation');
const Company = require('../models/Company');
const Contact = require('../models/Contact');
const Opportunity = require('../models/Opportunity');
const User = require('../models/User');
const Product = require('../models/Product');

const {
  SALES_ORDER_STATUSES,
  SALES_ORDER_CURRENCIES,
  PAYMENT_STATUSES,
  PAYMENT_TERMS,
} = require('../models/SalesOrder');

// ======================================================
// HELPERS
// ======================================================

const isValidObjectId = (value) => {
  return mongoose.Types.ObjectId.isValid(value);
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
    parseInt(req.query.page, 10) || 1,
    1
  );

  const limit = Math.min(
    Math.max(
      parseInt(req.query.limit, 10) || 20,
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

const buildDate = (value, endOfDay = false) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }

  return date;
};

const normalizeTags = (tags) => {
  if (!Array.isArray(tags)) {
    return [];
  }

  return [
    ...new Set(
      tags
        .map((tag) => String(tag).trim())
        .filter(Boolean)
    ),
  ].slice(0, 30);
};

const validateItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return 'At least one sales order item is required.';
  }

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];

    if (!item.product) {
      return `Item ${index + 1}: product is required.`;
    }

    if (!isValidObjectId(item.product)) {
      return `Item ${index + 1}: invalid product ID.`;
    }

    const quantity = Number(item.quantity);

    if (
      Number.isNaN(quantity) ||
      quantity <= 0
    ) {
      return `Item ${index + 1}: quantity must be greater than 0.`;
    }

    const unitPrice = Number(item.unitPrice);

    if (
      Number.isNaN(unitPrice) ||
      unitPrice < 0
    ) {
      return `Item ${index + 1}: unit price cannot be negative.`;
    }

    const taxRate = Number(item.taxRate || 0);

    if (
      Number.isNaN(taxRate) ||
      taxRate < 0 ||
      taxRate > 100
    ) {
      return `Item ${index + 1}: tax rate must be between 0 and 100.`;
    }

    const discountRate = Number(
      item.discountRate || 0
    );

    if (
      Number.isNaN(discountRate) ||
      discountRate < 0 ||
      discountRate > 100
    ) {
      return `Item ${index + 1}: discount rate must be between 0 and 100.`;
    }
  }

  return null;
};

const validateReference = async (
  Model,
  id,
  fieldName
) => {
  if (!id) {
    return null;
  }

  if (!isValidObjectId(id)) {
    return `${fieldName} is invalid.`;
  }

  const exists = await Model.exists({
    _id: id,
  });

  if (!exists) {
    return `${fieldName} not found.`;
  }

  return null;
};

const populateSalesOrder = (query) => {
  return query
    .populate(
      'company',
      'name companyName email phone website city state country'
    )
    .populate(
      'contact',
      'firstName lastName email phone designation company'
    )
    .populate(
      'opportunity',
      'name value stage status probability expectedCloseDate'
    )
    .populate(
      'quotation',
      'quotationNumber issueDate validUntil status currency grandTotal'
    )
    .populate(
      'owner',
      'firstName lastName name email role'
    )
    .populate(
      'createdBy',
      'firstName lastName name email'
    )
    .populate(
      'updatedBy',
      'firstName lastName name email'
    )
    .populate(
      'items.product',
      'name sku code price sellingPrice unitPrice currency'
    );
};

// ======================================================
// CREATE SALES ORDER
// ======================================================

const createSalesOrder = async (req, res, next) => {
  try {
    const {
      salesOrderNumber,
      quotation,
      opportunity,
      company,
      contact,
      owner,
      orderDate,
      expectedDeliveryDate,
      actualDeliveryDate,
      currency,
      items,
      status,
      paymentStatus,
      paymentTerms,
      customPaymentTerms,
      amountPaid,
      deliveryTerms,
      shippingMethod,
      billingAddress,
      shippingAddress,
      customerNotes,
      internalNotes,
      termsAndConditions,
      tags,
    } = req.body;

    // --------------------------------------------------
    // Required fields
    // --------------------------------------------------

    if (!salesOrderNumber) {
      return res.status(400).json({
        success: false,
        message: 'Sales order number is required.',
      });
    }

    if (!company) {
      return res.status(400).json({
        success: false,
        message: 'Company is required.',
      });
    }

    if (!contact) {
      return res.status(400).json({
        success: false,
        message: 'Contact is required.',
      });
    }

    // --------------------------------------------------
    // Validate references
    // --------------------------------------------------

    const referenceChecks = [
      [Company, company, 'Company'],
      [Contact, contact, 'Contact'],
      [Quotation, quotation, 'Quotation'],
      [Opportunity, opportunity, 'Opportunity'],
      [User, owner, 'Owner'],
    ];

    for (const [
      Model,
      id,
      fieldName,
    ] of referenceChecks) {
      const error = await validateReference(
        Model,
        id,
        fieldName
      );

      if (error) {
        return res.status(400).json({
          success: false,
          message: error,
        });
      }
    }

    // --------------------------------------------------
    // Validate items
    // --------------------------------------------------

    const itemError = validateItems(items);

    if (itemError) {
      return res.status(400).json({
        success: false,
        message: itemError,
      });
    }

    // --------------------------------------------------
    // Validate currency
    // --------------------------------------------------

    const normalizedCurrency = String(
      currency || 'INR'
    ).toUpperCase();

    if (
      !SALES_ORDER_CURRENCIES.includes(
        normalizedCurrency
      )
    ) {
      return res.status(400).json({
        success: false,
        message: `Invalid currency. Allowed values: ${SALES_ORDER_CURRENCIES.join(
          ', '
        )}.`,
      });
    }

    // --------------------------------------------------
    // Validate status
    // --------------------------------------------------

    const normalizedStatus = String(
      status || 'DRAFT'
    ).toUpperCase();

    if (
      !SALES_ORDER_STATUSES.includes(
        normalizedStatus
      )
    ) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${SALES_ORDER_STATUSES.join(
          ', '
        )}.`,
      });
    }

    // --------------------------------------------------
    // Validate payment status
    // --------------------------------------------------

    const normalizedPaymentStatus = String(
      paymentStatus || 'UNPAID'
    ).toUpperCase();

    if (
      !PAYMENT_STATUSES.includes(
        normalizedPaymentStatus
      )
    ) {
      return res.status(400).json({
        success: false,
        message: `Invalid payment status. Allowed values: ${PAYMENT_STATUSES.join(
          ', '
        )}.`,
      });
    }

    // --------------------------------------------------
    // Validate payment terms
    // --------------------------------------------------

    const normalizedPaymentTerms = String(
      paymentTerms || 'DUE_ON_RECEIPT'
    ).toUpperCase();

    if (
      !PAYMENT_TERMS.includes(
        normalizedPaymentTerms
      )
    ) {
      return res.status(400).json({
        success: false,
        message: `Invalid payment terms. Allowed values: ${PAYMENT_TERMS.join(
          ', '
        )}.`,
      });
    }

    // --------------------------------------------------
    // Duplicate sales order number
    // --------------------------------------------------

    const duplicate =
      await SalesOrder.findOne({
        salesOrderNumber:
          String(salesOrderNumber)
            .trim()
            .toUpperCase(),
      });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message:
          'Sales order number already exists.',
      });
    }

    // --------------------------------------------------
    // Validate product IDs
    // --------------------------------------------------

    const productIds = [
      ...new Set(
        items.map((item) =>
          String(item.product)
        )
      ),
    ];

    const products = await Product.find({
      _id: {
        $in: productIds,
      },
    }).select('_id');

    if (products.length !== productIds.length) {
      return res.status(400).json({
        success: false,
        message:
          'One or more products were not found.',
      });
    }

    // --------------------------------------------------
    // Validate dates
    // --------------------------------------------------

    const parsedOrderDate = orderDate
      ? new Date(orderDate)
      : new Date();

    if (Number.isNaN(parsedOrderDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order date.',
      });
    }

    let parsedExpectedDeliveryDate;

    if (expectedDeliveryDate) {
      parsedExpectedDeliveryDate = new Date(
        expectedDeliveryDate
      );

      if (
        Number.isNaN(
          parsedExpectedDeliveryDate.getTime()
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Invalid expected delivery date.',
        });
      }
    }

    let parsedActualDeliveryDate;

    if (actualDeliveryDate) {
      parsedActualDeliveryDate = new Date(
        actualDeliveryDate
      );

      if (
        Number.isNaN(
          parsedActualDeliveryDate.getTime()
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Invalid actual delivery date.',
        });
      }
    }

    // --------------------------------------------------
    // Create
    // --------------------------------------------------

    const salesOrder =
      new SalesOrder({
        salesOrderNumber:
          String(salesOrderNumber)
            .trim()
            .toUpperCase(),

        quotation,
        opportunity,
        company,
        contact,
        owner,

        createdBy: getUserId(req),

        orderDate: parsedOrderDate,

        expectedDeliveryDate:
          parsedExpectedDeliveryDate,

        actualDeliveryDate:
          parsedActualDeliveryDate,

        currency: normalizedCurrency,

        items,

        status: normalizedStatus,

        paymentStatus:
          normalizedPaymentStatus,

        paymentTerms:
          normalizedPaymentTerms,

        customPaymentTerms:
          customPaymentTerms || '',

        amountPaid:
          Number(amountPaid || 0),

        deliveryTerms:
          deliveryTerms || '',

        shippingMethod:
          shippingMethod || '',

        billingAddress:
          billingAddress || '',

        shippingAddress:
          shippingAddress || '',

        customerNotes:
          customerNotes || '',

        internalNotes:
          internalNotes || '',

        termsAndConditions:
          termsAndConditions || '',

        tags: normalizeTags(tags),
      });

    await salesOrder.save();

    const populated =
      await populateSalesOrder(
        SalesOrder.findById(salesOrder._id)
      );

    return res.status(201).json({
      success: true,
      message:
        'Sales order created successfully.',
      data: populated,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          'Sales order number already exists.',
      });
    }

    next(error);
  }
};

// ======================================================
// GET SALES ORDERS
// ======================================================

const getSalesOrders = async (req, res, next) => {
  try {
    const {
      page,
      limit,
      skip,
    } = normalizePagination(req);

    const {
      search,
      salesOrderNumber,
      status,
      statuses,
      paymentStatus,
      paymentStatuses,
      currency,
      company,
      contact,
      opportunity,
      quotation,
      owner,
      minAmount,
      maxAmount,
      orderDateFrom,
      orderDateTo,
      deliveryDateFrom,
      deliveryDateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const filter = {};

    // --------------------------------------------------
    // Search
    // --------------------------------------------------

    if (search) {
      const regex = new RegExp(
        escapeRegex(search),
        'i'
      );

      filter.$or = [
        {
          salesOrderNumber: regex,
        },
        {
          customerNotes: regex,
        },
        {
          internalNotes: regex,
        },
        {
          shippingMethod: regex,
        },
      ];
    }

    // --------------------------------------------------
    // Sales Order Number
    // --------------------------------------------------

    if (salesOrderNumber) {
      filter.salesOrderNumber =
        new RegExp(
          escapeRegex(salesOrderNumber),
          'i'
        );
    }

    // --------------------------------------------------
    // Status
    // --------------------------------------------------

    if (status) {
      filter.status = String(status).toUpperCase();
    }

    if (statuses) {
      const values = String(statuses)
        .split(',')
        .map((value) =>
          value.trim().toUpperCase()
        )
        .filter(Boolean);

      filter.status = {
        $in: values,
      };
    }

    // --------------------------------------------------
    // Payment Status
    // --------------------------------------------------

    if (paymentStatus) {
      filter.paymentStatus =
        String(paymentStatus).toUpperCase();
    }

    if (paymentStatuses) {
      const values = String(paymentStatuses)
        .split(',')
        .map((value) =>
          value.trim().toUpperCase()
        )
        .filter(Boolean);

      filter.paymentStatus = {
        $in: values,
      };
    }

    // --------------------------------------------------
    // Currency
    // --------------------------------------------------

    if (currency) {
      filter.currency =
        String(currency).toUpperCase();
    }

    // --------------------------------------------------
    // References
    // --------------------------------------------------

    const referenceFilters = [
      ['company', company],
      ['contact', contact],
      ['opportunity', opportunity],
      ['quotation', quotation],
      ['owner', owner],
    ];

    for (const [field, value] of referenceFilters) {
      if (value) {
        if (!isValidObjectId(value)) {
          return res.status(400).json({
            success: false,
            message: `Invalid ${field} ID.`,
          });
        }

        filter[field] = value;
      }
    }

    // --------------------------------------------------
    // Amount filters
    // --------------------------------------------------

    if (minAmount !== undefined) {
      const value = Number(minAmount);

      if (Number.isNaN(value)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid minAmount.',
        });
      }

      filter.grandTotal = {
        ...(filter.grandTotal || {}),
        $gte: value,
      };
    }

    if (maxAmount !== undefined) {
      const value = Number(maxAmount);

      if (Number.isNaN(value)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid maxAmount.',
        });
      }

      filter.grandTotal = {
        ...(filter.grandTotal || {}),
        $lte: value,
      };
    }

    // --------------------------------------------------
    // Order date range
    // --------------------------------------------------

    if (orderDateFrom || orderDateTo) {
      filter.orderDate = {};

      if (orderDateFrom) {
        const date = buildDate(orderDateFrom);

        if (!date) {
          return res.status(400).json({
            success: false,
            message:
              'Invalid orderDateFrom.',
          });
        }

        filter.orderDate.$gte = date;
      }

      if (orderDateTo) {
        const date = buildDate(
          orderDateTo,
          true
        );

        if (!date) {
          return res.status(400).json({
            success: false,
            message:
              'Invalid orderDateTo.',
          });
        }

        filter.orderDate.$lte = date;
      }
    }

    // --------------------------------------------------
    // Delivery date range
    // --------------------------------------------------

    if (
      deliveryDateFrom ||
      deliveryDateTo
    ) {
      filter.expectedDeliveryDate = {};

      if (deliveryDateFrom) {
        const date = buildDate(
          deliveryDateFrom
        );

        if (!date) {
          return res.status(400).json({
            success: false,
            message:
              'Invalid deliveryDateFrom.',
          });
        }

        filter.expectedDeliveryDate.$gte =
          date;
      }

      if (deliveryDateTo) {
        const date = buildDate(
          deliveryDateTo,
          true
        );

        if (!date) {
          return res.status(400).json({
            success: false,
            message:
              'Invalid deliveryDateTo.',
          });
        }

        filter.expectedDeliveryDate.$lte =
          date;
      }
    }

    // --------------------------------------------------
    // Sorting
    // --------------------------------------------------

    const allowedSortFields = [
      'createdAt',
      'updatedAt',
      'orderDate',
      'expectedDeliveryDate',
      'grandTotal',
      'salesOrderNumber',
      'status',
      'paymentStatus',
    ];

    const safeSortBy =
      allowedSortFields.includes(sortBy)
        ? sortBy
        : 'createdAt';

    const safeSortOrder =
      String(sortOrder).toLowerCase() === 'asc'
        ? 1
        : -1;

    const sort = {
      [safeSortBy]: safeSortOrder,
    };

    // --------------------------------------------------
    // Query
    // --------------------------------------------------

    const [salesOrders, total] =
      await Promise.all([
        populateSalesOrder(
          SalesOrder.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limit)
        ),

        SalesOrder.countDocuments(filter),
      ]);

    const totalPages = Math.ceil(
      total / limit
    );

    return res.status(200).json({
      success: true,
      data: salesOrders,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage:
          page < totalPages,
        hasPrevPage:
          page > 1,
      },
      filters: filter,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// GET SALES ORDER BY ID
// ======================================================

const getSalesOrderById = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid sales order ID.',
      });
    }

    const salesOrder =
      await populateSalesOrder(
        SalesOrder.findById(id)
      );

    if (!salesOrder) {
      return res.status(404).json({
        success: false,
        message:
          'Sales order not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: salesOrder,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// UPDATE SALES ORDER
// ======================================================

const updateSalesOrder = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid sales order ID.',
      });
    }

    const salesOrder =
      await SalesOrder.findById(id);

    if (!salesOrder) {
      return res.status(404).json({
        success: false,
        message:
          'Sales order not found.',
      });
    }

    // --------------------------------------------------
    // Protect finalized orders
    // --------------------------------------------------

    if (
      ['COMPLETED', 'CANCELLED'].includes(
        salesOrder.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Completed or cancelled sales orders cannot be edited.',
      });
    }

    const body = req.body;

    // --------------------------------------------------
    // Sales order number
    // --------------------------------------------------

    if (body.salesOrderNumber) {
      const normalizedNumber =
        String(body.salesOrderNumber)
          .trim()
          .toUpperCase();

      const duplicate =
        await SalesOrder.findOne({
          salesOrderNumber:
            normalizedNumber,
          _id: {
            $ne: id,
          },
        });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message:
            'Sales order number already exists.',
        });
      }

      salesOrder.salesOrderNumber =
        normalizedNumber;
    }

    // --------------------------------------------------
    // References
    // --------------------------------------------------

    const referenceFields = [
      ['quotation', Quotation],
      ['opportunity', Opportunity],
      ['company', Company],
      ['contact', Contact],
      ['owner', User],
    ];

    for (const [
      field,
      Model,
    ] of referenceFields) {
      if (
        Object.prototype.hasOwnProperty.call(
          body,
          field
        )
      ) {
        const value = body[field];

        const error =
          await validateReference(
            Model,
            value,
            field.charAt(0).toUpperCase() +
              field.slice(1)
          );

        if (error) {
          return res.status(400).json({
            success: false,
            message: error,
          });
        }

        salesOrder[field] = value;
      }
    }

    // --------------------------------------------------
    // Items
    // --------------------------------------------------

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        'items'
      )
    ) {
      const itemError =
        validateItems(body.items);

      if (itemError) {
        return res.status(400).json({
          success: false,
          message: itemError,
        });
      }

      const productIds = [
        ...new Set(
          body.items.map((item) =>
            String(item.product)
          )
        ),
      ];

      const products =
        await Product.find({
          _id: {
            $in: productIds,
          },
        }).select('_id');

      if (
        products.length !==
        productIds.length
      ) {
        return res.status(400).json({
          success: false,
          message:
            'One or more products were not found.',
        });
      }

      salesOrder.items = body.items;
    }

    // --------------------------------------------------
    // Currency
    // --------------------------------------------------

    if (body.currency) {
      const currency =
        String(body.currency).toUpperCase();

      if (
        !SALES_ORDER_CURRENCIES.includes(
          currency
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Invalid currency.',
        });
      }

      salesOrder.currency = currency;
    }

    // --------------------------------------------------
    // Dates
    // --------------------------------------------------

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        'orderDate'
      )
    ) {
      const date = new Date(
        body.orderDate
      );

      if (Number.isNaN(date.getTime())) {
        return res.status(400).json({
          success: false,
          message:
            'Invalid order date.',
        });
      }

      salesOrder.orderDate = date;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        'expectedDeliveryDate'
      )
    ) {
      if (body.expectedDeliveryDate) {
        const date = new Date(
          body.expectedDeliveryDate
        );

        if (
          Number.isNaN(date.getTime())
        ) {
          return res.status(400).json({
            success: false,
            message:
              'Invalid expected delivery date.',
          });
        }

        salesOrder.expectedDeliveryDate =
          date;
      } else {
        salesOrder.expectedDeliveryDate =
          undefined;
      }
    }

    // --------------------------------------------------
    // Editable fields
    // --------------------------------------------------

    const editableFields = [
      'customPaymentTerms',
      'deliveryTerms',
      'shippingMethod',
      'billingAddress',
      'shippingAddress',
      'customerNotes',
      'internalNotes',
      'termsAndConditions',
      'cancellationReason',
      'completionNotes',
    ];

    editableFields.forEach((field) => {
      if (
        Object.prototype.hasOwnProperty.call(
          body,
          field
        )
      ) {
        salesOrder[field] =
          body[field] || '';
      }
    });

    // --------------------------------------------------
    // Payment
    // --------------------------------------------------

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        'amountPaid'
      )
    ) {
      const amountPaid = Number(
        body.amountPaid
      );

      if (
        Number.isNaN(amountPaid) ||
        amountPaid < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Amount paid cannot be negative.',
        });
      }

      if (
        amountPaid >
        Number(salesOrder.grandTotal || 0)
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Amount paid cannot exceed grand total.',
        });
      }

      salesOrder.amountPaid =
        amountPaid;
    }

    if (body.paymentTerms) {
      const paymentTerms =
        String(
          body.paymentTerms
        ).toUpperCase();

      if (
        !PAYMENT_TERMS.includes(
          paymentTerms
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Invalid payment terms.',
        });
      }

      salesOrder.paymentTerms =
        paymentTerms;
    }

    // Payment status is derived by model
    if (body.paymentStatus) {
      const paymentStatus =
        String(
          body.paymentStatus
        ).toUpperCase();

      if (
        !PAYMENT_STATUSES.includes(
          paymentStatus
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Invalid payment status.',
        });
      }
    }

    // --------------------------------------------------
    // Tags
    // --------------------------------------------------

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        'tags'
      )
    ) {
      salesOrder.tags =
        normalizeTags(body.tags);
    }

    // --------------------------------------------------
    // Status
    // --------------------------------------------------

    if (body.status) {
      const newStatus =
        String(
          body.status
        ).toUpperCase();

      if (
        !SALES_ORDER_STATUSES.includes(
          newStatus
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Invalid sales order status.',
        });
      }

      // Completed / cancelled should use
      // dedicated endpoints.
      if (
        ['COMPLETED', 'CANCELLED'].includes(
          newStatus
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Use the dedicated status action endpoint for completed or cancelled orders.',
        });
      }

      salesOrder.status = newStatus;
    }

    salesOrder.updatedBy =
      getUserId(req);

    await salesOrder.save();

    const populated =
      await populateSalesOrder(
        SalesOrder.findById(id)
      );

    return res.status(200).json({
      success: true,
      message:
        'Sales order updated successfully.',
      data: populated,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          'Sales order number already exists.',
      });
    }

    next(error);
  }
};

// ======================================================
// DELETE SALES ORDER
// ======================================================

const deleteSalesOrder = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid sales order ID.',
      });
    }

    const salesOrder =
      await SalesOrder.findById(id);

    if (!salesOrder) {
      return res.status(404).json({
        success: false,
        message:
          'Sales order not found.',
      });
    }

    // Do not delete confirmed/processing/completed
    if (
      [
        'CONFIRMED',
        'PROCESSING',
        'COMPLETED',
      ].includes(salesOrder.status)
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Confirmed, processing, or completed sales orders cannot be deleted.',
      });
    }

    await SalesOrder.deleteOne({
      _id: id,
    });

    return res.status(200).json({
      success: true,
      message:
        'Sales order deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// SALES ORDER STATS
// ======================================================

const getSalesOrderStats = async (
  req,
  res,
  next
) => {
  try {
    const match = {};

    // Optional date filtering
    const {
      orderDateFrom,
      orderDateTo,
      owner,
      company,
      currency,
    } = req.query;

    if (orderDateFrom || orderDateTo) {
      match.orderDate = {};

      if (orderDateFrom) {
        const date = buildDate(
          orderDateFrom
        );

        if (!date) {
          return res.status(400).json({
            success: false,
            message:
              'Invalid orderDateFrom.',
          });
        }

        match.orderDate.$gte = date;
      }

      if (orderDateTo) {
        const date = buildDate(
          orderDateTo,
          true
        );

        if (!date) {
          return res.status(400).json({
            success: false,
            message:
              'Invalid orderDateTo.',
          });
        }

        match.orderDate.$lte = date;
      }
    }

    if (owner) {
      if (!isValidObjectId(owner)) {
        return res.status(400).json({
          success: false,
          message:
            'Invalid owner ID.',
        });
      }

      match.owner =
        new mongoose.Types.ObjectId(owner);
    }

    if (company) {
      if (!isValidObjectId(company)) {
        return res.status(400).json({
          success: false,
          message:
            'Invalid company ID.',
        });
      }

      match.company =
        new mongoose.Types.ObjectId(company);
    }

    if (currency) {
      match.currency =
        String(currency).toUpperCase();
    }

    const [
      overall,
      statusBreakdown,
      paymentBreakdown,
      currencyBreakdown,
      monthlyRevenue,
    ] = await Promise.all([
      SalesOrder.aggregate([
        {
          $match: match,
        },
        {
          $group: {
            _id: null,
            totalOrders: {
              $sum: 1,
            },
            totalValue: {
              $sum: '$grandTotal',
            },
            totalPaid: {
              $sum: '$amountPaid',
            },
            totalBalanceDue: {
              $sum: '$balanceDue',
            },
            averageOrderValue: {
              $avg: '$grandTotal',
            },
          },
        },
      ]),

      SalesOrder.aggregate([
        {
          $match: match,
        },
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
            value: -1,
          },
        },
      ]),

      SalesOrder.aggregate([
        {
          $match: match,
        },
        {
          $group: {
            _id: '$paymentStatus',
            count: {
              $sum: 1,
            },
            value: {
              $sum: '$grandTotal',
            },
            paid: {
              $sum: '$amountPaid',
            },
            balance: {
              $sum: '$balanceDue',
            },
          },
        },
        {
          $sort: {
            value: -1,
          },
        },
      ]),

      SalesOrder.aggregate([
        {
          $match: match,
        },
        {
          $group: {
            _id: '$currency',
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
            value: -1,
          },
        },
      ]),

      SalesOrder.aggregate([
        {
          $match: match,
        },
        {
          $group: {
            _id: {
              year: {
                $year: '$orderDate',
              },
              month: {
                $month: '$orderDate',
              },
            },
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
            '_id.year': 1,
            '_id.month': 1,
          },
        },
      ]),
    ]);

    const summary =
      overall[0] || {
        totalOrders: 0,
        totalValue: 0,
        totalPaid: 0,
        totalBalanceDue: 0,
        averageOrderValue: 0,
      };

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalOrders:
            summary.totalOrders || 0,

          totalValue:
            Number(
              summary.totalValue || 0
            ),

          totalPaid:
            Number(
              summary.totalPaid || 0
            ),

          totalBalanceDue:
            Number(
              summary.totalBalanceDue || 0
            ),

          averageOrderValue:
            Number(
              summary.averageOrderValue || 0
            ),
        },

        statusBreakdown,
        paymentBreakdown,
        currencyBreakdown,
        monthlyRevenue,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// UPDATE STATUS
// ======================================================

const updateSalesOrderStatus = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid sales order ID.',
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required.',
      });
    }

    const normalizedStatus =
      String(status).toUpperCase();

    if (
      !SALES_ORDER_STATUSES.includes(
        normalizedStatus
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid sales order status.',
      });
    }

    const salesOrder =
      await SalesOrder.findById(id);

    if (!salesOrder) {
      return res.status(404).json({
        success: false,
        message:
          'Sales order not found.',
      });
    }

    const currentStatus =
      salesOrder.status;

    // --------------------------------------------------
    // Same status
    // --------------------------------------------------

    if (
      currentStatus === normalizedStatus
    ) {
      return res.status(200).json({
        success: true,
        message:
          'Sales order already has this status.',
        data: salesOrder,
      });
    }

    // --------------------------------------------------
    // Terminal protection
    // --------------------------------------------------

    if (
      ['COMPLETED', 'CANCELLED'].includes(
        currentStatus
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Completed or cancelled sales orders cannot change status.',
      });
    }

    // --------------------------------------------------
    // Transition rules
    // --------------------------------------------------

    const allowedTransitions = {
      DRAFT: [
        'CONFIRMED',
        'CANCELLED',
      ],

      CONFIRMED: [
        'PROCESSING',
        'CANCELLED',
      ],

      PROCESSING: [
        'COMPLETED',
        'CANCELLED',
      ],

      COMPLETED: [],

      CANCELLED: [],
    };

    if (
      !allowedTransitions[
        currentStatus
      ]?.includes(normalizedStatus)
    ) {
      return res.status(400).json({
        success: false,
        message: `Cannot change sales order status from ${currentStatus} to ${normalizedStatus}.`,
      });
    }

    salesOrder.status =
      normalizedStatus;

    salesOrder.updatedBy =
      getUserId(req);

    await salesOrder.save();

    const populated =
      await populateSalesOrder(
        SalesOrder.findById(id)
      );

    return res.status(200).json({
      success: true,
      message:
        `Sales order status changed to ${normalizedStatus}.`,
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// CONFIRM SALES ORDER
// ======================================================

const confirmSalesOrder = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid sales order ID.',
      });
    }

    const salesOrder =
      await SalesOrder.findById(id);

    if (!salesOrder) {
      return res.status(404).json({
        success: false,
        message:
          'Sales order not found.',
      });
    }

    if (salesOrder.status !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        message:
          'Only draft sales orders can be confirmed.',
      });
    }

    salesOrder.status =
      'CONFIRMED';

    salesOrder.updatedBy =
      getUserId(req);

    await salesOrder.save();

    const populated =
      await populateSalesOrder(
        SalesOrder.findById(id)
      );

    return res.status(200).json({
      success: true,
      message:
        'Sales order confirmed successfully.',
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// PROCESS SALES ORDER
// ======================================================

const processSalesOrder = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid sales order ID.',
      });
    }

    const salesOrder =
      await SalesOrder.findById(id);

    if (!salesOrder) {
      return res.status(404).json({
        success: false,
        message:
          'Sales order not found.',
      });
    }

    if (
      salesOrder.status !== 'CONFIRMED'
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Only confirmed sales orders can be moved to processing.',
      });
    }

    salesOrder.status =
      'PROCESSING';

    salesOrder.updatedBy =
      getUserId(req);

    await salesOrder.save();

    const populated =
      await populateSalesOrder(
        SalesOrder.findById(id)
      );

    return res.status(200).json({
      success: true,
      message:
        'Sales order moved to processing.',
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// COMPLETE SALES ORDER
// ======================================================

const completeSalesOrder = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    const {
      actualDeliveryDate,
      completionNotes,
    } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid sales order ID.',
      });
    }

    const salesOrder =
      await SalesOrder.findById(id);

    if (!salesOrder) {
      return res.status(404).json({
        success: false,
        message:
          'Sales order not found.',
      });
    }

    if (
      salesOrder.status !== 'PROCESSING'
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Only processing sales orders can be completed.',
      });
    }

    if (actualDeliveryDate) {
      const date = new Date(
        actualDeliveryDate
      );

      if (Number.isNaN(date.getTime())) {
        return res.status(400).json({
          success: false,
          message:
            'Invalid actual delivery date.',
        });
      }

      salesOrder.actualDeliveryDate =
        date;
    } else {
      salesOrder.actualDeliveryDate =
        new Date();
    }

    salesOrder.completionNotes =
      completionNotes ||
      salesOrder.completionNotes ||
      '';

    salesOrder.status =
      'COMPLETED';

    salesOrder.updatedBy =
      getUserId(req);

    await salesOrder.save();

    const populated =
      await populateSalesOrder(
        SalesOrder.findById(id)
      );

    return res.status(200).json({
      success: true,
      message:
        'Sales order completed successfully.',
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// CANCEL SALES ORDER
// ======================================================

const cancelSalesOrder = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    const {
      cancellationReason,
    } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid sales order ID.',
      });
    }

    const salesOrder =
      await SalesOrder.findById(id);

    if (!salesOrder) {
      return res.status(404).json({
        success: false,
        message:
          'Sales order not found.',
      });
    }

    if (
      ['COMPLETED', 'CANCELLED'].includes(
        salesOrder.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Completed or already cancelled sales orders cannot be cancelled.',
      });
    }

    if (
      !cancellationReason ||
      !String(cancellationReason).trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Cancellation reason is required.',
      });
    }

    salesOrder.status =
      'CANCELLED';

    salesOrder.cancellationReason =
      String(
        cancellationReason
      ).trim();

    salesOrder.updatedBy =
      getUserId(req);

    await salesOrder.save();

    const populated =
      await populateSalesOrder(
        SalesOrder.findById(id)
      );

    return res.status(200).json({
      success: true,
      message:
        'Sales order cancelled successfully.',
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// UPDATE PAYMENT
// ======================================================

const updateSalesOrderPayment = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    const {
      amountPaid,
    } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid sales order ID.',
      });
    }

    if (
      amountPaid === undefined ||
      amountPaid === null
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Amount paid is required.',
      });
    }

    const numericAmount =
      Number(amountPaid);

    if (
      Number.isNaN(numericAmount) ||
      numericAmount < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Amount paid must be a valid non-negative number.',
      });
    }

    const salesOrder =
      await SalesOrder.findById(id);

    if (!salesOrder) {
      return res.status(404).json({
        success: false,
        message:
          'Sales order not found.',
      });
    }

    if (
      numericAmount >
      salesOrder.grandTotal
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Amount paid cannot exceed grand total.',
      });
    }

    salesOrder.amountPaid =
      numericAmount;

    salesOrder.updatedBy =
      getUserId(req);

    await salesOrder.save();

    const populated =
      await populateSalesOrder(
        SalesOrder.findById(id)
      );

    return res.status(200).json({
      success: true,
      message:
        'Sales order payment updated successfully.',
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  createSalesOrder,
  getSalesOrders,
  getSalesOrderById,
  updateSalesOrder,
  deleteSalesOrder,
  getSalesOrderStats,
  updateSalesOrderStatus,
  confirmSalesOrder,
  processSalesOrder,
  completeSalesOrder,
  cancelSalesOrder,
  updateSalesOrderPayment,
};