const express = require('express');
const { rateLimit } = require('express-rate-limit');
const controller = require('../controllers/ai.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Mounted at /ai (see app.js). Permissions are checked per
// endpoint against the CRM module each feature reads.
const router = express.Router();
router.use(authenticate);

router.get('/status', controller.status);

// Per-user cap on AI calls (cost control). Status is not counted.
router.use(
  rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: Number(process.env.AI_RATE_LIMIT || 40),
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (req) => String(req.user?._id),
    handler: (_req, res) =>
      res.status(429).json({
        success: false,
        message: 'AI request limit reached. Please try again in a few minutes.',
        code: 'AI_RATE_LIMIT_EXCEEDED',
      }),
  }),
);

router.post('/assistant', controller.assistant);
router.post('/forecast', controller.forecast);
router.post('/workflow', controller.workflow);
router.post('/leads/:id/qualify', controller.qualifyLead);
router.post('/leads/:id/score', controller.scoreLead);
router.post('/records/:type/:id/insights', controller.insights);
router.post('/records/:type/:id/follow-ups', controller.followUps);
router.post('/records/:type/:id/draft', controller.draft);
router.post('/records/:type/:id/summarize', controller.summarize);
router.post('/records/:type/:id/send', controller.send);

module.exports = router;
