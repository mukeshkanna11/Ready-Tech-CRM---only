'use strict';

const Invoice = require('../models/Invoice');

const generateNumber = require('../utils/generateNumber');
const { calculateTotals } = require('./quotation.service');

// ======================================================
// INVOICE SERVICE
// ======================================================
// Responsibilities:
//
// 1. Prepare invoice before create/update
// 2. Generate invoice number
// 3. Calculate invoice totals from items
// 4. Normalize invoice data
// 5. Sync payment status
// 6. Calculate balance due
// 7. Handle overdue status
//
// IMPORTANT:
// Calculated totals from frontend are NOT trusted.
// Invoice totals are recalculated on backend.
// ======================================================


// ======================================================
// CONSTANTS
// ======================================================

const INVOICE_STATUSES = [
  'DRAFT',
  'SENT',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE',
  'CANCELLED',
];


// ======================================================
// MONEY HELPER
// ======================================================
// Avoid floating-point issues for normal invoice
// calculations.
// ======================================================

const roundMoney = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.round(
    (number + Number.EPSILON) * 100
  ) / 100;
};


// ======================================================
// NUMBER HELPER
// ======================================================

const safeNumber = (value, fallback = 0) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
};


// ======================================================
// STRING HELPER
// ======================================================

const normalizeString = (value) => {
  if (
    value === undefined ||
    value === null
  ) {
    return '';
  }

  return String(value).trim();
};


// ======================================================
// CURRENCY NORMALIZATION
// ======================================================

const normalizeCurrency = (value) => {
  const currency =
    normalizeString(value).toUpperCase();

  return currency || 'INR';
};


// ======================================================
// NORMALIZE ITEMS
// ======================================================

const normalizeItems = (items) => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => ({
    ...item,

    description:
      normalizeString(item.description),

    hsnSac:
      normalizeString(item.hsnSac),

    unit:
      normalizeString(item.unit).toUpperCase() ||
      'PCS',

    quantity: Math.max(
      0.001,
      safeNumber(item.quantity, 1)
    ),

    unitPrice: Math.max(
      0,
      roundMoney(item.unitPrice)
    ),

    taxRate: Math.min(
      100,
      Math.max(
        0,
        safeNumber(item.taxRate, 0)
      )
    ),

    discountRate: Math.min(
      100,
      Math.max(
        0,
        safeNumber(item.discountRate, 0)
      )
    ),
  }));
};


// ======================================================
// CALCULATE ITEM TOTALS
// ======================================================
//
// This service primarily relies on quotation.service's
// calculateTotals() so quotation and invoice calculations
// remain consistent.
//
// If calculateTotals() returns item-level calculations,
// we preserve them.
// ======================================================

const calculateInvoiceTotals = (items) => {
  const normalizedItems =
    normalizeItems(items);

  const calculated =
    calculateTotals(normalizedItems);

  return {
    items:
      calculated.items ||
      normalizedItems,

    subtotal: roundMoney(
      calculated.subtotal
    ),

    discountTotal: roundMoney(
      calculated.discountTotal
    ),

    taxableTotal: roundMoney(
      calculated.taxableTotal ??
      (
        safeNumber(calculated.subtotal) -
        safeNumber(calculated.discountTotal)
      )
    ),

    taxTotal: roundMoney(
      calculated.taxTotal
    ),

    cgstTotal: roundMoney(
      calculated.cgstTotal
    ),

    sgstTotal: roundMoney(
      calculated.sgstTotal
    ),

    igstTotal: roundMoney(
      calculated.igstTotal
    ),

    grandTotal: roundMoney(
      calculated.grandTotal
    ),
  };
};


// ======================================================
// GENERATE INVOICE NUMBER
// ======================================================

const getInvoiceNumber = async (
  requestedNumber
) => {
  const supplied =
    normalizeString(requestedNumber);

  if (supplied) {
    return supplied.toUpperCase();
  }

  return generateNumber('INV');
};


// ======================================================
// PREPARE INVOICE
// ======================================================
// Used during:
//
// POST /api/invoices
//
// and when invoice items are updated.
//
// NOTE:
// Existing invoice calculated totals from frontend are
// ignored and recalculated here.
// ======================================================

const prepareInvoice = async (
  payload = {}
) => {
  const data = {
    ...payload,
  };

  // ----------------------------------------------------
  // Normalize invoice number
  // ----------------------------------------------------

  data.invoiceNumber =
    await getInvoiceNumber(
      payload.invoiceNumber
    );

  // ----------------------------------------------------
  // Normalize currency
  // ----------------------------------------------------

  data.currency =
    normalizeCurrency(
      payload.currency
    );

  // ----------------------------------------------------
  // Normalize notes
  // ----------------------------------------------------

  if (payload.notes !== undefined) {
    data.notes =
      normalizeString(payload.notes);
  }

  // ----------------------------------------------------
  // Normalize place of supply
  // ----------------------------------------------------

  if (
    payload.placeOfSupply !== undefined
  ) {
    data.placeOfSupply =
      normalizeString(
        payload.placeOfSupply
      );
  }

  // ----------------------------------------------------
  // Normalize reverse charge
  // ----------------------------------------------------

  if (
    payload.reverseCharge !== undefined
  ) {
    data.reverseCharge =
      Boolean(payload.reverseCharge);
  }

  // ----------------------------------------------------
  // Items
  // ----------------------------------------------------

  const totals =
    calculateInvoiceTotals(
      payload.items
    );

  data.items = totals.items;

  // ----------------------------------------------------
  // Backend calculated totals
  // ----------------------------------------------------

  data.subtotal =
    totals.subtotal;

  data.discountTotal =
    totals.discountTotal;

  data.taxableTotal =
    totals.taxableTotal;

  data.taxTotal =
    totals.taxTotal;

  data.cgstTotal =
    totals.cgstTotal;

  data.sgstTotal =
    totals.sgstTotal;

  data.igstTotal =
    totals.igstTotal;

  data.grandTotal =
    totals.grandTotal;

  // ----------------------------------------------------
  // Payment
  // ----------------------------------------------------

  const requestedAmountPaid =
    safeNumber(
      payload.amountPaid,
      0
    );

  data.amountPaid =
    Math.min(
      Math.max(
        0,
        roundMoney(requestedAmountPaid)
      ),
      data.grandTotal
    );

  // ----------------------------------------------------
  // Balance
  // ----------------------------------------------------

  data.balanceDue =
    roundMoney(
      Math.max(
        0,
        data.grandTotal -
          data.amountPaid
      )
    );

  // ----------------------------------------------------
  // Don't automatically overwrite CANCELLED
  // ----------------------------------------------------

  if (
    payload.status &&
    INVOICE_STATUSES.includes(
      payload.status
    )
  ) {
    data.status = payload.status;
  }

  return data;
};


// ======================================================
// SYNC PAYMENT STATUS
// ======================================================
// Updates:
//
// amountPaid
// balanceDue
// status
//
// Rules:
//
// CANCELLED
//   → remains CANCELLED
//
// amountPaid >= grandTotal
//   → PAID
//
// amountPaid > 0
//   → PARTIALLY_PAID
//
// amountPaid = 0
//   → SENT / DRAFT / OVERDUE based on state
// ======================================================

const syncPaymentStatus = async (
  invoice,
  options = {}
) => {
  if (!invoice) {
    throw new Error(
      'Invoice is required'
    );
  }

  const {
    save = true,
    preserveDraft = true,
  } = options;

  const grandTotal =
    roundMoney(
      invoice.grandTotal
    );

  let amountPaid =
    roundMoney(
      invoice.amountPaid
    );

  // ----------------------------------------------------
  // Safety
  // ----------------------------------------------------

  amountPaid =
    Math.max(
      0,
      Math.min(
        amountPaid,
        grandTotal
      )
    );

  invoice.amountPaid =
    amountPaid;

  invoice.balanceDue =
    roundMoney(
      Math.max(
        0,
        grandTotal -
          amountPaid
      )
    );

  // ----------------------------------------------------
  // Cancelled invoices
  // ----------------------------------------------------

  if (
    invoice.status === 'CANCELLED'
  ) {
    if (save) {
      await invoice.save();
    }

    return invoice;
  }

  // ----------------------------------------------------
  // Zero total invoice
  // ----------------------------------------------------

  if (grandTotal <= 0) {
    if (
      !preserveDraft ||
      invoice.status !== 'DRAFT'
    ) {
      invoice.status = 'DRAFT';
    }

    if (save) {
      await invoice.save();
    }

    return invoice;
  }

  // ----------------------------------------------------
  // Fully paid
  // ----------------------------------------------------

  if (
    amountPaid >= grandTotal
  ) {
    invoice.amountPaid =
      grandTotal;

    invoice.balanceDue = 0;

    invoice.status =
      'PAID';
  }

  // ----------------------------------------------------
  // Partially paid
  // ----------------------------------------------------

  else if (
    amountPaid > 0
  ) {
    invoice.status =
      'PARTIALLY_PAID';
  }

  // ----------------------------------------------------
  // No payment
  // ----------------------------------------------------

  else {
    invoice.balanceDue =
      grandTotal;

    // Don't automatically change a draft invoice
    if (
      preserveDraft &&
      invoice.status === 'DRAFT'
    ) {
      // Keep DRAFT
    }

    // Cancelled handled above

    else if (
      invoice.dueDate &&
      new Date(invoice.dueDate) <
        new Date()
    ) {
      invoice.status =
        'OVERDUE';
    }

    else {
      invoice.status =
        'SENT';
    }
  }

  // ----------------------------------------------------
  // Save
  // ----------------------------------------------------

  if (save) {
    await invoice.save();
  }

  return invoice;
};


// ======================================================
// MARK INVOICE AS OVERDUE
// ======================================================
// Can be used from a cron/job later.
//
// Only invoices which are not paid/cancelled/draft
// are eligible.
// ======================================================

const markOverdueInvoices = async () => {
  const now = new Date();

  const result =
    await Invoice.updateMany(
      {
        dueDate: {
          $lt: now,
        },

        status: {
          $in: [
            'SENT',
            'PARTIALLY_PAID',
          ],
        },

        $expr: {
          $lt: [
            '$amountPaid',
            '$grandTotal',
          ],
        },
      },
      {
        $set: {
          status: 'OVERDUE',
        },
      }
    );

  return result;
};


// ======================================================
// GET PAYMENT SUMMARY
// ======================================================

const getPaymentSummary = (
  invoice
) => {
  const grandTotal =
    roundMoney(
      invoice?.grandTotal
    );

  const amountPaid =
    roundMoney(
      invoice?.amountPaid
    );

  const balanceDue =
    roundMoney(
      Math.max(
        0,
        grandTotal -
          amountPaid
      )
    );

  const paymentPercentage =
    grandTotal > 0
      ? roundMoney(
          (amountPaid /
            grandTotal) *
            100
        )
      : 0;

  return {
    grandTotal,
    amountPaid,
    balanceDue,
    paymentPercentage,
    isPaid:
      grandTotal > 0 &&
      amountPaid >= grandTotal,
  };
};


// ======================================================
// EXPORT
// ======================================================

module.exports = {
  prepareInvoice,
  syncPaymentStatus,
  markOverdueInvoices,
  getPaymentSummary,
  calculateInvoiceTotals,
  roundMoney,
};