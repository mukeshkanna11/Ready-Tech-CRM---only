const z = require('zod');

const contactSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().max(100).optional(),
  designation: z.string().max(120).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
  alternatePhone: z.string().max(30).optional(),
  company: z.string().optional(),
  owner: z.string().optional(),
  source: z.string().max(100).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().max(5000).optional(),
});

module.exports = { contactSchema };
