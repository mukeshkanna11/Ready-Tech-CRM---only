const mongoose = require('mongoose');

const Payment = require('../models/Payment');
const Invoice = require('../models/Invoice');

const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { sendSuccess } = require('../utils/apiResponse');

// ======================================================
// HELPERS
// ======================================================

const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(id);

const generatePaymentNumber = async () => {
  const year = new Date().getFullYear();

  const lastPayment = await Payment.findOne({
    paymentNumber: new RegExp(`^PAY-${year}-`, 'i'),
  })
    .sort({ createdAt: -1 })
    .select('paymentNumber')
    .lean();

  let nextNumber = 1;

  if (lastPayment?.paymentNumber) {
    const match = lastPayment.paymentNumber.match(
      /-(\d+)$/
    );

    if (match) {
      nextNumber = Number(match[1]) + 1;
    }
  }

  return `PAY-${year}-${String(nextNumber).padStart(
    5,
    '0'
  )}`;
};

const populatePayment = (query) =>
  query
    .populate(
      'invoice',
      'invoiceNumber grandTotal amountPaid balanceDue status currency issueDate dueDate'
    )
    .populate(
      'company',
      'name companyName email phone website city state country'
    )
    .populate(
      'contact',
      'firstName lastName email phone designation'
    )
    .populate(
      'owner',
      'firstName lastName name email'
    )
    .populate(
      'createdBy',
      'firstName lastName name email'
    )
    .populate(
      'updatedBy',
      'firstName lastName name email'
    );

// ======================================================
// CREATE PAYMENT
// POST /api/v1/payments
// ======================================================

const create = asyncHandler(async (req, res) => {
  const {
    invoice: invoiceId,
    amount,
    paymentDate,
    paymentMethod,
    transactionReference,
    chequeNumber,
    bankName,
    currency,
    notes,
    status,
  } = req.body;

  // ----------------------------------------------------
  // VALIDATE INVOICE ID
  // ----------------------------------------------------

  if (!invoiceId || !isValidObjectId(invoiceId)) {
    throw new ApiError(
      400,
      'Valid invoice ID is required',
      'INVALID_INVOICE_ID'
    );
  }

  const invoice = await Invoice.findById(invoiceId);

  if (!invoice) {
    throw new ApiError(
      404,
      'Invoice not found',
      'INVOICE_NOT_FOUND'
    );
  }

  // ----------------------------------------------------
  // INVOICE STATUS
  // ----------------------------------------------------

  if (invoice.status === 'CANCELLED') {
    throw new ApiError(
      400,
      'Cannot record payment for a cancelled invoice',
      'INVOICE_CANCELLED'
    );
  }

  // ----------------------------------------------------
  // PAYMENT AMOUNT
  // ----------------------------------------------------

  const paymentAmount = Number(amount);

  if (
    !Number.isFinite(paymentAmount) ||
    paymentAmount <= 0
  ) {
    throw new ApiError(
      400,
      'Payment amount must be greater than zero',
      'INVALID_PAYMENT_AMOUNT'
    );
  }

  const currentPaid = Number(invoice.amountPaid || 0);

  const balanceDue = Math.max(
    0,
    Number(invoice.grandTotal || 0) - currentPaid
  );

  if (paymentAmount > balanceDue) {
    throw new ApiError(
      400,
      `Payment cannot exceed balance due of ${balanceDue}`,
      'PAYMENT_EXCEEDS_BALANCE'
    );
  }

  // ----------------------------------------------------
  // PAYMENT METHOD
  // ----------------------------------------------------

  const allowedMethods = [
    'CASH',
    'BANK_TRANSFER',
    'UPI',
    'CARD',
    'CHEQUE',
    'OTHER',
  ];

  const normalizedMethod = String(
    paymentMethod || 'BANK_TRANSFER'
  ).toUpperCase();

  if (!allowedMethods.includes(normalizedMethod)) {
    throw new ApiError(
      400,
      `Invalid payment method. Allowed values: ${allowedMethods.join(
        ', '
      )}`,
      'INVALID_PAYMENT_METHOD'
    );
  }

  // ----------------------------------------------------
  // PAYMENT STATUS
  // ----------------------------------------------------

  const allowedStatuses = [
    'PENDING',
    'COMPLETED',
    'FAILED',
    'CANCELLED',
    'REFUNDED',
  ];

  const normalizedStatus = String(
    status || 'COMPLETED'
  ).toUpperCase();

  if (!allowedStatuses.includes(normalizedStatus)) {
    throw new ApiError(
      400,
      `Invalid payment status. Allowed values: ${allowedStatuses.join(
        ', '
      )}`,
      'INVALID_PAYMENT_STATUS'
    );
  }

  // Only completed payments affect invoice totals.
  const affectsInvoice =
    normalizedStatus === 'COMPLETED';

  // ----------------------------------------------------
  // DATE
  // ----------------------------------------------------

  const parsedPaymentDate = paymentDate
    ? new Date(paymentDate)
    : new Date();

  if (Number.isNaN(parsedPaymentDate.getTime())) {
    throw new ApiError(
      400,
      'Invalid payment date',
      'INVALID_PAYMENT_DATE'
    );
  }

  // ----------------------------------------------------
  // CREATE PAYMENT
  // ----------------------------------------------------

  let paymentNumber;
  let payment;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    paymentNumber = await generatePaymentNumber();

    try {
      payment = await Payment.create({
        paymentNumber,
        invoice: invoice._id,
        company: invoice.company,
        contact: invoice.contact,
        owner:
          invoice.owner ||
          req.user?._id ||
          req.user?.id ||
          null,
        amount: paymentAmount,
        paymentDate: parsedPaymentDate,
        paymentMethod: normalizedMethod,
        transactionReference:
          transactionReference || '',
        chequeNumber: chequeNumber || '',
        bankName: bankName || '',
        currency:
          currency ||
          invoice.currency ||
          'INR',
        notes: notes || '',
        status: normalizedStatus,
        createdBy:
          req.user?._id ||
          req.user?.id ||
          null,
      });

      break;
    } catch (error) {
      if (
        error?.code === 11000 &&
        attempt < 3
      ) {
        continue;
      }

      throw error;
    }
  }

  if (!payment) {
    throw new ApiError(
      500,
      'Unable to generate payment number',
      'PAYMENT_NUMBER_ERROR'
    );
  }

  // ----------------------------------------------------
  // UPDATE INVOICE
  // ----------------------------------------------------

  if (affectsInvoice) {
    const newAmountPaid =
      currentPaid + paymentAmount;

    const newBalanceDue = Math.max(
      0,
      Number(invoice.grandTotal || 0) -
        newAmountPaid
    );

    invoice.amountPaid = newAmountPaid;
    invoice.balanceDue = newBalanceDue;

    if (newBalanceDue === 0) {
      invoice.status = 'PAID';
    } else if (newAmountPaid > 0) {
      invoice.status = 'PARTIALLY_PAID';
    } else if (
      invoice.dueDate &&
      new Date(invoice.dueDate) < new Date()
    ) {
      invoice.status = 'OVERDUE';
    }

    await invoice.save();
  }

  const populated = await populatePayment(
    Payment.findById(payment._id)
  );

  return sendSuccess(
    res,
    populated,
    'Payment recorded successfully',
    201
  );
});

// ======================================================
// GET PAYMENTS
// GET /api/v1/payments
// ======================================================

const list = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    search,
    invoice,
    company,
    paymentMethod,
    status,
    sortBy = 'paymentDate',
    sortOrder = 'desc',
  } = req.query;

  const pageNumber = Math.max(
    1,
    Number(page) || 1
  );

  const limitNumber = Math.min(
    100,
    Math.max(1, Number(limit) || 20)
  );

  const filter = {};

  if (invoice) {
    if (!isValidObjectId(invoice)) {
      throw new ApiError(
        400,
        'Invalid invoice ID',
        'INVALID_INVOICE_ID'
      );
    }

    filter.invoice = invoice;
  }

  if (company) {
    if (!isValidObjectId(company)) {
      throw new ApiError(
        400,
        'Invalid company ID',
        'INVALID_COMPANY_ID'
      );
    }

    filter.company = company;
  }

  if (paymentMethod) {
    filter.paymentMethod =
      String(paymentMethod).toUpperCase();
  }

  if (status) {
    filter.status =
      String(status).toUpperCase();
  }

  if (search) {
    const regex = new RegExp(
      String(search).replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&'
      ),
      'i'
    );

    filter.$or = [
      {
        paymentNumber: regex,
      },
      {
        transactionReference: regex,
      },
      {
        bankName: regex,
      },
      {
        chequeNumber: regex,
      },
    ];
  }

  const allowedSortFields = [
    'createdAt',
    'paymentDate',
    'amount',
    'paymentNumber',
  ];

  const safeSortField =
    allowedSortFields.includes(sortBy)
      ? sortBy
      : 'paymentDate';

  const sort = {
    [safeSortField]:
      String(sortOrder).toLowerCase() === 'asc'
        ? 1
        : -1,
  };

  const skip =
    (pageNumber - 1) * limitNumber;

  const [payments, total] =
    await Promise.all([
      populatePayment(
        Payment.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limitNumber)
      ),
      Payment.countDocuments(filter),
    ]);

  return res.status(200).json({
    success: true,
    data: payments,
    pagination: {
      page: pageNumber,
      limit: limitNumber,
      total,
      totalPages: Math.ceil(
        total / limitNumber
      ),
    },
  });
});

// ======================================================
// GET PAYMENT BY ID
// GET /api/v1/payments/:id
// ======================================================

const getById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    throw new ApiError(
      400,
      'Invalid payment ID',
      'INVALID_PAYMENT_ID'
    );
  }

  const payment = await populatePayment(
    Payment.findById(id)
  );

  if (!payment) {
    throw new ApiError(
      404,
      'Payment not found',
      'PAYMENT_NOT_FOUND'
    );
  }

  return sendSuccess(
    res,
    payment,
    'Payment fetched successfully'
  );
});

// ======================================================
// CANCEL PAYMENT
// PATCH /api/v1/payments/:id/cancel
// ======================================================

const cancel = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    throw new ApiError(
      400,
      'Invalid payment ID',
      'INVALID_PAYMENT_ID'
    );
  }

  const payment = await Payment.findById(id);

  if (!payment) {
    throw new ApiError(
      404,
      'Payment not found',
      'PAYMENT_NOT_FOUND'
    );
  }

  if (payment.status === 'CANCELLED') {
    throw new ApiError(
      400,
      'Payment is already cancelled',
      'PAYMENT_CANCELLED'
    );
  }

  if (payment.status !== 'COMPLETED') {
    payment.status = 'CANCELLED';

    payment.updatedBy =
      req.user?._id ||
      req.user?.id ||
      null;

    await payment.save();

    return sendSuccess(
      res,
      payment,
      'Payment cancelled successfully'
    );
  }

  const invoice = await Invoice.findById(
    payment.invoice
  );

  if (!invoice) {
    throw new ApiError(
      404,
      'Related invoice not found',
      'INVOICE_NOT_FOUND'
    );
  }

  const newAmountPaid = Math.max(
    0,
    Number(invoice.amountPaid || 0) -
      Number(payment.amount || 0)
  );

  const newBalanceDue = Math.max(
    0,
    Number(invoice.grandTotal || 0) -
      newAmountPaid
  );

  invoice.amountPaid = newAmountPaid;
  invoice.balanceDue = newBalanceDue;

  if (newAmountPaid === 0) {
    if (
      invoice.dueDate &&
      new Date(invoice.dueDate) < new Date()
    ) {
      invoice.status = 'OVERDUE';
    } else {
      invoice.status = 'SENT';
    }
  } else if (newBalanceDue > 0) {
    invoice.status = 'PARTIALLY_PAID';
  }

  await invoice.save();

  payment.status = 'CANCELLED';

  payment.updatedBy =
    req.user?._id ||
    req.user?.id ||
    null;

  await payment.save();

  const populated = await populatePayment(
    Payment.findById(payment._id)
  );

  return sendSuccess(
    res,
    populated,
    'Payment cancelled and invoice balance restored'
  );
});

// ======================================================
// INVOICE PAYMENT HISTORY
// GET /api/v1/payments/invoice/:invoiceId
// ======================================================

const invoiceHistory = asyncHandler(
  async (req, res) => {
    const { invoiceId } = req.params;

    if (!isValidObjectId(invoiceId)) {
      throw new ApiError(
        400,
        'Invalid invoice ID',
        'INVALID_INVOICE_ID'
      );
    }

    const invoice = await Invoice.findById(
      invoiceId
    ).select(
      'invoiceNumber grandTotal amountPaid balanceDue status currency'
    );

    if (!invoice) {
      throw new ApiError(
        404,
        'Invoice not found',
        'INVOICE_NOT_FOUND'
      );
    }

    const payments = await populatePayment(
      Payment.find({
        invoice: invoiceId,
      }).sort({
        paymentDate: -1,
        createdAt: -1,
      })
    );

    return res.status(200).json({
      success: true,
      data: {
        invoice,
        payments,
      },
    });
  }
);

// ======================================================
// EXPORT
// ======================================================

module.exports = {
  create,
  list,
  getById,
  cancel,
  invoiceHistory,
};