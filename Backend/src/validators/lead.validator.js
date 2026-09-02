const z = require('zod');

const leadSchema = z.object({
  name: z.string().trim().min(2).max(150),
  designation: z.string().max(120).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
  alternatePhone: z.string().max(30).optional(),
  companyName: z.string().max(200).optional(),
  company: z.string().optional(),
  contact: z.string().optional(),
  source: z.enum(['WEBSITE','REFERRAL','SOCIAL_MEDIA','ADVERTISEMENT','EMAIL','PHONE','WALK_IN','IMPORT','OTHER']).optional(),
  status: z.enum(['NEW','CONTACTED','QUALIFIED','PROPOSAL','NEGOTIATION','WON','LOST']).optional(),
  assignedTo: z.string().optional(),
  value: z.coerce.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  expectedCloseDate: z.coerce.date().optional(),
  tags: z.array(z.string()).optional(),
  lostReason: z.string().max(500).optional(),
  notes: z.string().max(5000).optional(),
});

const statusSchema = z.object({
  status: z.enum(['NEW','CONTACTED','QUALIFIED','PROPOSAL','NEGOTIATION','WON','LOST']),
  lostReason: z.string().max(500).optional(),
});

const assignSchema = z.object({
  userId: z.string().min(1),
});

module.exports = { leadSchema, statusSchema, assignSchema };
