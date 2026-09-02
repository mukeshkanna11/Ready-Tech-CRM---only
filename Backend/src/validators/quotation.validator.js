const z = require('zod');

const item = z.object({
  product: z.string().optional(),
  description: z.string().max(500).optional(),
  quantity: z.coerce.number().min(1),
  unitPrice: z.coerce.number().min(0),
  taxRate: z.coerce.number().min(0).max(100).optional(),
  discountRate: z.coerce.number().min(0).max(100).optional(),
});

const quotationSchema = z.object({
  company: z.string().optional(),
  contact: z.string().optional(),
  opportunity: z.string().optional(),
  owner: z.string().optional(),
  issueDate: z.coerce.date().optional(),
  validUntil: z.coerce.date().optional(),
  currency: z.string().length(3).optional(),
  items: z.array(item).min(1),
  status: z.enum(['DRAFT','SENT','VIEWED','ACCEPTED','REJECTED','EXPIRED']).optional(),
  notes: z.string().max(5000).optional(),
});

module.exports = { quotationSchema };
