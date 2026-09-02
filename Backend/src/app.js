const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const env = require('./config/env');
const { apiLimiter } = require('./middleware/rateLimit.middleware');
const { notFound, errorHandler } = require('./middleware/error.middleware');

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

app.use(helmet());
app.use(cors({
  origin: env.clientUrl.split(',').map((item) => item.trim()),
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use('/api', apiLimiter);

app.get('/', (_req, res) => {
  res.json({
    success: true,
    name: 'Standalone CRM API',
    version: 'v1',
    status: 'running',
  });
});

app.get('/health', (_req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

const api = '/api/v1';

app.use(`${api}/auth`, authRoutes);
app.use(`${api}/users`, userRoutes);
app.use(`${api}/roles`, roleRoutes);
app.use(`${api}/companies`, companyRoutes);
app.use(`${api}/contacts`, contactRoutes);
app.use(`${api}/leads`, leadRoutes);
app.use(`${api}/opportunities`, opportunityRoutes);
app.use(`${api}/activities`, activityRoutes);
app.use(`${api}/tasks`, taskRoutes);
app.use(`${api}/notes`, noteRoutes);
app.use(`${api}/products`, productRoutes);
app.use(`${api}/quotations`, quotationRoutes);
app.use(`${api}/invoices`, invoiceRoutes);
app.use(`${api}/notifications`, notificationRoutes);
app.use(`${api}/dashboard`, dashboardRoutes);
app.use(`${api}/reports`, reportRoutes);


app.use(notFound);
app.use(errorHandler);

module.exports = app;
