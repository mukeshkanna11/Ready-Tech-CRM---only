'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const env = require('./config/env');
const { apiLimiter } = require('./middleware/rateLimit.middleware');
const {
  notFound,
  errorHandler,
} = require('./middleware/error.middleware');

const authRoutes = require('./routes/auth.routes');
const { requirePermission } = require('./middleware/permission.middleware');
const userRoutes = require('./routes/user.routes');
const roleRoutes = require('./routes/role.routes');
const companyRoutes = require('./routes/company.routes');
const contactRoutes = require('./routes/contact.routes');
const leadRoutes = require('./routes/lead.routes');
const opportunityRoutes = require('./routes/opportunity.routes');
const activityRoutes = require('./routes/activity.routes');
const taskRoutes = require('./routes/task.routes');
const noteRoutes = require('./routes/note.routes');
const productRoutes = require('./routes/product.routes');
const quotationRoutes = require('./routes/quotation.routes');
const invoiceRoutes = require('./routes/invoice.routes');
const notificationRoutes = require('./routes/notification.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const reportRoutes = require('./routes/report.routes');
const customReportRoutes = require('./routes/customReport.routes');
const { teamRoutes, territoryRoutes } = require('./routes/team.routes');
const aiRoutes = require('./routes/ai.routes');
const salesOrderRoutes = require('./routes/salesOrder.routes');
const paymentRoutes = require('./routes/payment.routes');
const automationRoutes = require('./routes/automation.routes');
const pipelineStageRoutes = require('./routes/pipelineStage.routes');
const emailWebhookRoutes =
  require('./routes/emailWebhook.routes');
  const emailEnquiryRoutes = require('./routes/emailEnquiry.routes');
const publicLeadRoutes = require('./routes/publicLead.routes');
const dataTransferRoutes = require('./routes/dataTransfer.routes');
const app = express();

app.disable('x-powered-by');



// ======================================================
// CORS CONFIGURATION
// ======================================================

const allowedOrigins = String(env.clientUrl || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const defaultAllowedOrigins = [
  'https://readytech-crm.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
];

const corsOrigins = [
  ...new Set([
    ...defaultAllowedOrigins,
    ...allowedOrigins,
  ]),
];

console.log('==============================================');
console.log('CRM CORS CONFIGURATION');
console.log('==============================================');
console.log('Allowed Origins:', corsOrigins);
console.log('==============================================');

const corsOptions = {
  origin: function (origin, callback) {
    // Postman / curl / server-to-server
    if (!origin) {
      return callback(null, true);
    }

    if (corsOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn(
      `CORS blocked origin: ${origin}`
    );

    return callback(
      new Error(`CORS blocked origin: ${origin}`)
    );
  },

  credentials: true,

  methods: [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS',
  ],

  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Accept',
    'Origin',
    'X-Requested-With',
  ],

  exposedHeaders: [
    'Content-Length',
    'Content-Type',
  ],

  optionsSuccessStatus: 204,
};

// Apply CORS before routes
app.use(cors(corsOptions));

// ======================================================
// SECURITY
// ======================================================

app.use(helmet());

// ======================================================
// COMPRESSION
// ======================================================

app.use(compression());

// ======================================================
// BODY PARSER
// ======================================================

app.use(
  express.json({
    limit: '2mb',
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: '2mb',
  })
);

// ======================================================
// COOKIE PARSER
// ======================================================

app.use(cookieParser());

// ======================================================
// LOGGER
// ======================================================

app.use(
  morgan(
    env.nodeEnv === 'production'
      ? 'combined'
      : 'dev'
  )
);

// ======================================================
// API RATE LIMITER
// ======================================================

app.use('/api', apiLimiter);

// ======================================================
// ROOT
// ======================================================

app.get('/', (_req, res) => {
  res.json({
    success: true,
    name: 'Standalone CRM API',
    version: 'v1',
    status: 'running',
  });
});

// ======================================================
// HEALTH CHECK
// ======================================================

app.get('/health', (_req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// ======================================================
// API VERSION
// ======================================================

const api = '/api/v1';

// ======================================================
// AUTH
// ======================================================

app.use(
  `${api}/auth`,
  authRoutes
);

// ======================================================
// PUBLIC LEAD CAPTURE (no JWT)
// ======================================================

app.use(
  `${api}/public`,
  publicLeadRoutes
);

// ======================================================
// USERS
// ======================================================

app.use(
  `${api}/users`,
  requirePermission('USERS', { openRead: true }),
  userRoutes
);

// ======================================================
// TEAMS / TERRITORIES (lookup reads open, writes need USERS)
// ======================================================

app.use(`${api}/teams`, requirePermission('USERS', { openRead: true }), teamRoutes);
app.use(`${api}/territories`, requirePermission('USERS', { openRead: true }), territoryRoutes);

// ======================================================
// ROLES
// ======================================================

app.use(
  `${api}/roles`,
  requirePermission('ROLES'),
  roleRoutes
);

// ======================================================
// COMPANIES
// ======================================================

app.use(
  `${api}/companies`,
  requirePermission('COMPANIES'),
  companyRoutes
);

// ======================================================
// CONTACTS
// ======================================================

app.use(
  `${api}/contacts`,
  requirePermission('CONTACTS'),
  contactRoutes
);

// ======================================================
// LEADS
// ======================================================

app.use(
  `${api}/leads`,
  requirePermission('LEADS'),
  leadRoutes
);

// ======================================================
// OPPORTUNITIES
// ======================================================

app.use(
  `${api}/opportunities`,
  requirePermission('OPPORTUNITIES'),
  opportunityRoutes
);

app.use(`${api}/pipeline-stages`, requirePermission('OPPORTUNITIES'), pipelineStageRoutes);
app.use(`${api}/sales-orders`, requirePermission('QUOTATIONS'), salesOrderRoutes);

// ======================================================
// ACTIVITIES
// ======================================================

app.use(
  `${api}/activities`,
  requirePermission('ACTIVITIES'),
  activityRoutes
);

// ======================================================
// TASKS
// ======================================================

app.use(
  `${api}/tasks`,
  requirePermission('TASKS'),
  taskRoutes
);

// ======================================================
// NOTES
// ======================================================

app.use(
  `${api}/notes`,
  requirePermission('NOTES'),
  noteRoutes
);

// ======================================================
// DATA IMPORT / EXPORT (permission checked per record type)
// ======================================================

app.use(
  `${api}/data`,
  dataTransferRoutes
);

// ======================================================
// PRODUCTS
// ======================================================

app.use(
  `${api}/products`,
  requirePermission('PRODUCTS'),
  productRoutes
);

// ======================================================
// QUOTATIONS
// ======================================================

app.use(
  `${api}/quotations`,
  requirePermission('QUOTATIONS'),
  quotationRoutes
);

// ======================================================
// INVOICES
// ======================================================

app.use(
  `${api}/invoices`,
  requirePermission('INVOICES'),
  invoiceRoutes
);

// ======================================================
// NOTIFICATIONS
// ======================================================

app.use(
  `${api}/notifications`,
  notificationRoutes
);

app.use(
  '/api/v1/email',
  emailWebhookRoutes
);


app.use(
  '/api/v1/email',
  emailEnquiryRoutes
);

// ======================================================
// DASHBOARD
// ======================================================

app.use(
  `${api}/dashboard`,
  requirePermission('DASHBOARD'),
  dashboardRoutes
);

// ======================================================
// REPORTS
// ======================================================

// Saved custom reports: anyone who can read reports may
// save their own definitions (no REPORTS:CREATE grant exists).
app.use(
  `${api}/reports/custom`,
  requirePermission('REPORTS', { write: 'READ' }),
  customReportRoutes
);

app.use(
  `${api}/reports`,
  requirePermission('REPORTS'),
  reportRoutes
);

// ======================================================
// payment
// ======================================================

app.use(
  '/api/v1/payments',
  requirePermission('INVOICES', { write: 'PAYMENT' }),
  paymentRoutes
);

// ======================================================
// automation
// ======================================================

app.use('/api/v1/automations', requirePermission('AUTOMATIONS'), automationRoutes);

// ======================================================
// AI (permissions checked per endpoint)
// ======================================================

app.use(`${api}/ai`, aiRoutes);


// ======================================================
// 404
// ======================================================

app.use(notFound);

// ======================================================
// GLOBAL ERROR HANDLER
// ======================================================

app.use(errorHandler);

// ======================================================
// EXPORT
// ======================================================

module.exports = app;