const express = require('express');
const { randomUUID } = require('crypto');
const { requestLogger, logger } = require('./middleware/logger');
const { metricsMiddleware }     = require('./middleware/metrics');
const { globalLimiter }         = require('./middleware/rateLimiter');

const productRoutes = require('./routes/products');
const orderRoutes   = require('./routes/orders');
const userRoutes    = require('./routes/users');
const authRoutes    = require('./routes/auth');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use((req, res, next) => {
  const incoming = req.headers['x-request-id'];
  const isSafe = typeof incoming === 'string' && /^[A-Za-z0-9-]{1,128}$/.test(incoming);
  req.requestId = isSafe ? incoming : randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
});

app.use(requestLogger);
app.use(metricsMiddleware);
app.use(globalLimiter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString(), service: 'ecommerce-api', version: '2.0.0', requestId: req.requestId });
});

app.use('/api/auth',     authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders',   orderRoutes);
app.use('/api/users',    userRoutes);

app.post('/api/cart/abandon', (req, res) => {
  const { metrics } = require('./middleware/metrics');
  metrics.cart_abandonment_total.inc();
  res.json({ ok: true, requestId: req.requestId });
});

app.use((req, res) => {
  logger.warn('Route not found', { method: req.method, url: req.originalUrl, requestId: req.requestId });
  res.status(404).json({ error: 'Route not found', path: req.originalUrl, requestId: req.requestId });
});

app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack, method: req.method, url: req.originalUrl, requestId: req.requestId });
  res.status(500).json({ error: 'Internal server error', requestId: req.requestId, message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong' });
});

app.listen(PORT, () => {
  logger.info('Server started', { port: PORT, environment: process.env.NODE_ENV || 'development' });
});

module.exports = app;