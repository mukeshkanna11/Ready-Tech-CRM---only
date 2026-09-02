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
// USERS
// ======================================================

app.use(
  `${api}/users`,
  userRoutes
);

// ======================================================
// ROLES
// ======================================================

app.use(
  `${api}/roles`,
  roleRoutes
);

// ======================================================
// COMPANIES
// ======================================================

app.use(
  `${api}/companies`,
  companyRoutes
);

// ======================================================
// CONTACTS
// ======================================================

app.use(
  `${api}/contacts`,
  contactRoutes
);

// ======================================================
// LEADS
// ======================================================

app.use(
  `${api}/leads`,
  leadRoutes
);

// ======================================================
// OPPORTUNITIES
// ======================================================

app.use(
  `${api}/opportunities`,
  opportunityRoutes
);

// ======================================================
// ACTIVITIES
// ======================================================

app.use(
  `${api}/activities`,
  activityRoutes
);

// ======================================================
// TASKS
// ======================================================

app.use(
  `${api}/tasks`,
  taskRoutes
);

// ======================================================
// NOTES
// ======================================================

app.use(
  `${api}/notes`,
  noteRoutes
);

// ======================================================
// PRODUCTS
// ======================================================

app.use(
  `${api}/products`,
  productRoutes
);

// ======================================================
// QUOTATIONS
// ======================================================

app.use(
  `${api}/quotations`,
  quotationRoutes
);

// ======================================================
// INVOICES
// ======================================================

app.use(
  `${api}/invoices`,
  invoiceRoutes
);

// ======================================================
// NOTIFICATIONS
// ======================================================

app.use(
  `${api}/notifications`,
  notificationRoutes
);

// ======================================================
// DASHBOARD
// ======================================================

app.use(
  `${api}/dashboard`,
  dashboardRoutes
);

// ======================================================
// REPORTS
// ======================================================

app.use(
  `${api}/reports`,
  reportRoutes
);

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