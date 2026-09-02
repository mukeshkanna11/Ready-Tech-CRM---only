const z = require('zod');

const companySchema = z.object({
  name: z.string().trim().min(2).max(200),
  industry: z.string().trim().max(100).optional(),
  website: z.string().trim().max(300).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    postalCode: z.string().optional(),
  }).optional(),
  taxNumber: z.string().max(100).optional(),
  owner: z.string().optional(),
  source: z.string().max(100).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().max(5000).optional(),
});

module.exports = { companySchema };
