const z = require('zod');

const opportunitySchema = z.object({
  name: z.string().trim().min(2).max(200),
  company: z.string().optional(),
  contact: z.string().optional(),
  lead: z.string().optional(),
  owner: z.string().optional(),
  value: z.coerce.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  stage: z.enum(['QUALIFICATION','DISCOVERY','PROPOSAL','NEGOTIATION','CLOSED_WON','CLOSED_LOST']).optional(),
  probability: z.coerce.number().min(0).max(100).optional(),
  expectedCloseDate: z.coerce.date().optional(),
  source: z.string().max(100).optional(),
  products: z.array(z.object({
    product: z.string(),
    quantity: z.coerce.number().min(1),
    price: z.coerce.number().min(0),
  })).optional(),
  notes: z.string().max(5000).optional(),
});

module.exports = { opportunitySchema };
