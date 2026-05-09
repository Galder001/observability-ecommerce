const express = require('express');
const { requestLogger, logger } = require('./middleware/logger');
const { metricsMiddleware } = require('./middleware/metrics');

const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const userRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── MIDDLEWARES GLOBALES ─────────────────────────────────────────────────────
app.use(express.json());
app.use(requestLogger);
app.use(metricsMiddleware);

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'ecommerce-api',
    version: '1.0.0',
  });
});

// ─── RUTAS ────────────────────────────────────────────────────────────────────
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  logger.warn('Route not found', { method: req.method, url: req.originalUrl });
  res.status(404).json({ error: 'Route not found', path: req.originalUrl });
});

// ─── ERROR HANDLER GLOBAL ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    requestId: req.requestId,
  });
  res.status(500).json({
    error: 'Internal server error',
    requestId: req.requestId,
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
});

// ─── ARRANQUE ─────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info('Server started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    endpoints: ['/health', '/metrics', '/api/products', '/api/orders', '/api/users'],
  });
});

module.exports = app;