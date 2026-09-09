'use strict';

const Invoice = require('../models/Invoice');
const SalesOrder = require('../models/SalesOrder');

const ApiError = require('../utils/ApiError');

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

    discountAmount: Math.max(
      0,
      roundMoney(item.discountAmount)
    ),
  }));
};


// ======================================================
// CALCULATE ITEM + INVOICE TOTALS
// ======================================================
//
// Self-contained GST-aware calculation.
//
// Per item:
//   lineSubtotal   = quantity * unitPrice
//   discountAmount = discountRate % of lineSubtotal
//                    (or the explicit discountAmount)
//   taxableAmount  = lineSubtotal - discountAmount
//   taxAmount      = taxRate % of taxableAmount
//   total          = taxableAmount + taxAmount
//
// Invoice level GST split is driven by taxMode:
//   CGST_SGST -> intra-state, tax split in half
//   IGST      -> inter-state, full tax as IGST
// ======================================================

const calculateInvoiceTotals = (
  items,
  taxMode = 'CGST_SGST'
) => {
  const normalizedItems =
    normalizeItems(items);

  let subtotal = 0;
  let discountTotal = 0;
  let taxableTotal = 0;
  let taxTotal = 0;

  const calculatedItems =
    normalizedItems.map((item) => {
      const lineSubtotal =
        roundMoney(
          item.quantity *
            item.unitPrice
        );

      // An explicit amount wins only when no
      // percentage was supplied.
      const discountAmount =
        item.discountRate > 0
          ? roundMoney(
              lineSubtotal *
                (item.discountRate / 100)
            )
          : Math.min(
              lineSubtotal,
              Math.max(
                0,
                roundMoney(
                  item.discountAmount
                )
              )
            );

      const taxableAmount =
        roundMoney(
          Math.max(
            0,
            lineSubtotal -
              discountAmount
          )
        );

      const taxAmount =
        roundMoney(
          taxableAmount *
            (item.taxRate / 100)
        );

      const total =
        roundMoney(
          taxableAmount + taxAmount
        );

      subtotal += lineSubtotal;
      discountTotal += discountAmount;
      taxableTotal += taxableAmount;
      taxTotal += taxAmount;

      return {
        ...item,
        discountAmount,
        taxableAmount,
        taxAmount,
        total,
      };
    });

  subtotal = roundMoney(subtotal);
  discountTotal = roundMoney(discountTotal);
  taxableTotal = roundMoney(taxableTotal);
  taxTotal = roundMoney(taxTotal);

  // ----------------------------------------------------
  // GST split
  // ----------------------------------------------------

  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;

  if (taxMode === 'IGST') {
    igstTotal = taxTotal;
  } else {
    cgstTotal = roundMoney(taxTotal / 2);

    // Keep the halves summing exactly to taxTotal.
    sgstTotal = roundMoney(
      taxTotal - cgstTotal
    );
  }

  return {
    items: calculatedItems,
    subtotal,
    discountTotal,
    taxableTotal,
    taxTotal,
    cgstTotal,
    sgstTotal,
    igstTotal,

    grandTotal: roundMoney(
      taxableTotal + taxTotal
    ),
  };
};


// ======================================================
// GENERATE INVOICE NUMBER
// ======================================================
//
// Derived from the Invoice collection itself so numbers
// survive a server restart.
//
// Format: INV-<year>-<00001>
//
// Zero padding keeps lexicographic sort identical to
// numeric sort.
// ======================================================

const getInvoiceNumber = async (
  requestedNumber
) => {
  const supplied =
    normalizeString(requestedNumber);

  if (supplied) {
    return supplied.toUpperCase();
  }

  const prefix =
    `INV-${new Date().getFullYear()}-`;

  const last =
    await Invoice.findOne({
      invoiceNumber: {
        $regex:
          `^${prefix}\\d+$`,
      },
    })
      .sort({
        invoiceNumber: -1,
      })
      .select('invoiceNumber')
      .lean();

  let next = 1;

  if (last?.invoiceNumber) {
    const parsed = parseInt(
      last.invoiceNumber.slice(
        prefix.length
      ),
      10
    );

    if (Number.isFinite(parsed)) {
      next = parsed + 1;
    }
  }

  return `${prefix}${String(next).padStart(5, '0')}`;
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
  // Tax mode (drives the CGST/SGST vs IGST split)
  // ----------------------------------------------------

  data.taxMode =
    payload.taxMode === 'IGST'
      ? 'IGST'
      : 'CGST_SGST';

  // ----------------------------------------------------
  // Terms & conditions
  // ----------------------------------------------------

  if (
    payload.termsAndConditions !== undefined
  ) {
    data.termsAndConditions =
      normalizeString(
        payload.termsAndConditions
      );
  }

  // ----------------------------------------------------
  // Items
  // ----------------------------------------------------

  const totals =
    calculateInvoiceTotals(
      payload.items,
      data.taxMode
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
// BUILD INVOICE FROM SALES ORDER
// ======================================================
// Converts an existing sales order into an invoice
// payload. Totals are still recalculated by
// prepareInvoice(), so the sales order totals are only
// used as the source of items.
// ======================================================

const buildInvoiceFromSalesOrder = async (
  salesOrderId,
  overrides = {}
) => {
  const salesOrder =
    await SalesOrder.findById(
      salesOrderId
    ).lean();

  if (!salesOrder) {
    throw new ApiError(
      404,
      'Sales order not found',
      'SALES_ORDER_NOT_FOUND'
    );
  }

  if (
    salesOrder.status === 'CANCELLED'
  ) {
    throw new ApiError(
      400,
      'A cancelled sales order cannot be invoiced',
      'SALES_ORDER_CANCELLED'
    );
  }

  // ----------------------------------------------------
  // Map sales order items to invoice items
  // ----------------------------------------------------

  const items =
    (salesOrder.items || []).map(
      (item) => ({
        product: item.product || null,
        description: item.description,
        hsnSac: item.hsnSac || '',
        quantity: item.quantity,
        unit: item.unit || 'PCS',
        unitPrice: item.unitPrice,
        discountRate: item.discountRate,
        taxRate: item.taxRate,
      })
    );

  if (items.length === 0) {
    throw new ApiError(
      400,
      'This sales order has no items to invoice',
      'SALES_ORDER_EMPTY'
    );
  }

  return prepareInvoice({
    salesOrder: salesOrder._id,
    quotation:
      salesOrder.quotation || null,
    company: salesOrder.company || null,
    contact: salesOrder.contact || null,
    owner: salesOrder.owner || null,

    currency: salesOrder.currency,

    placeOfSupply:
      salesOrder.placeOfSupply || '',

    termsAndConditions:
      salesOrder.termsAndConditions || '',

    notes: salesOrder.notes || '',

    items,

    status: 'DRAFT',

    ...overrides,
  });
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
  buildInvoiceFromSalesOrder,
  syncPaymentStatus,
  markOverdueInvoices,
  getPaymentSummary,
  calculateInvoiceTotals,
  getInvoiceNumber,
  roundMoney,
};