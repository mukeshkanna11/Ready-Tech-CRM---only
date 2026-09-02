const z = require('zod');

const item = z.object({
  product: z.string().optional(),
  description: z.string().max(500).optional(),
  quantity: z.coerce.number().min(1),
  unitPrice: z.coerce.number().min(0),
  taxRate: z.coerce.number().min(0).max(100).optional(),
  discountRate: z.coerce.number().min(0).max(100).optional(),
});

const invoiceSchema = z.object({
  quotation: z.string().optional(),
  company: z.string().optional(),
  contact: z.string().optional(),
  owner: z.string().optional(),
  issueDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  currency: z.string().length(3).optional(),
  items: z.array(item).min(1),
  amountPaid: z.coerce.number().min(0).optional(),
  status: z.enum(['DRAFT','SENT','PARTIALLY_PAID','PAID','OVERDUE','CANCELLED']).optional(),
  notes: z.string().max(5000).optional(),
});

module.exports = { invoiceSchema };
