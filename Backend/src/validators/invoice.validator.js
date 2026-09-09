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

// ======================================================
// AD-HOC (NON-CRM) CLIENT SNAPSHOT
// ======================================================
//
// Used when an invoice is raised for a brand-new client
// that does not exist in the CRM yet. Ignored when a
// company/contact reference is supplied.
//
// ======================================================

const billTo = z.object({
  name: z.string().max(200),
  email: z.string().email().max(200).optional().or(z.literal('')),
  phone: z.string().max(30).optional(),
  gstin: z.string().max(20).optional(),
  billingAddress: z.string().max(500).optional(),
  shippingAddress: z.string().max(500).optional(),
  city: z.string().max(120).optional(),
  state: z.string().max(120).optional(),
  country: z.string().max(120).optional(),
  postalCode: z.string().max(20).optional(),
});

const invoiceSchema = z.object({
  invoiceNumber: z.string().max(16).optional(),

  billTo: billTo.nullish(),

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
