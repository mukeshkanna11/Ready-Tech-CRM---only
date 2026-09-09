const z = require('zod');

const objectId = z
  .string()
  .regex(
    /^[0-9a-fA-F]{24}$/,
    'Must be a valid ID'
  );

const INVOICE_STATUSES = [
  'DRAFT',
  'SENT',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE',
  'CANCELLED',
];

const item = z.object({
  product: objectId.nullish(),
  description: z.string().max(500).optional(),
  hsnSac: z.string().max(20).optional(),
  quantity: z.coerce.number().positive(),
  unit: z.string().max(20).optional(),
  unitPrice: z.coerce.number().min(0),
  taxRate: z.coerce.number().min(0).max(100).optional(),
  discountRate: z.coerce.number().min(0).max(100).optional(),
  discountAmount: z.coerce.number().min(0).optional(),
});

// ======================================================
// CREATE
// ======================================================
//
// Calculated fields (totals, tax, balance) are
// intentionally NOT accepted here - the backend
// always recalculates them.
//
// ======================================================

const invoiceSchema = z.object({
  invoiceNumber: z.string().max(16).optional(),

  quotation: objectId.nullish(),
  salesOrder: objectId.nullish(),
  company: objectId.nullish(),
  contact: objectId.nullish(),
  owner: objectId.nullish(),

  issueDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),

  currency: z.string().length(3).optional(),

  placeOfSupply: z.string().max(120).optional(),
  reverseCharge: z.coerce.boolean().optional(),
  taxMode: z.enum(['CGST_SGST', 'IGST']).optional(),

  items: z.array(item).min(1, 'At least one item is required'),

  amountPaid: z.coerce.number().min(0).optional(),

  status: z.enum(INVOICE_STATUSES).optional(),

  notes: z.string().max(5000).optional(),
  termsAndConditions: z.string().max(5000).optional(),
});

// ======================================================
// UPDATE
// ======================================================
//
// Same shape, every field optional, but when items are
// supplied the array must still be valid.
//
// ======================================================

const invoiceUpdateSchema = invoiceSchema
  .partial()
  .extend({
    items: z.array(item).min(1).optional(),
  });

// ======================================================
// SUB-RESOURCE SCHEMAS
// ======================================================

const invoiceStatusSchema = z.object({
  status: z.enum(INVOICE_STATUSES),
});

const invoicePaymentSchema = z.object({
  amountPaid: z.coerce.number().min(0),
});

const invoiceCancelSchema = z.object({
  cancellationReason: z.string().max(2000).optional(),
});

const invoiceFromSalesOrderSchema = z.object({
  issueDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  taxMode: z.enum(['CGST_SGST', 'IGST']).optional(),
  owner: objectId.nullish(),
});

module.exports = {
  invoiceSchema,
  invoiceUpdateSchema,
  invoiceStatusSchema,
  invoicePaymentSchema,
  invoiceCancelSchema,
  invoiceFromSalesOrderSchema,
};
