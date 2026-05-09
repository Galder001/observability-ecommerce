const client = require('prom-client');

client.collectDefaultMetrics();

const http_requests_total = new client.Counter({
  name: 'http_requests_total',
  help: 'Número total de peticiones HTTP recibidas',
  labelNames: ['method', 'route', 'status_code']
});

const http_request_duration_seconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duración de las peticiones HTTP en segundos',
  labelNames: ['method', 'route'],
  buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5]
});

const orders_total = new client.Counter({
  name: 'orders_total',
  help: 'Número total de pedidos procesados por estado',
  labelNames: ['status']
});

const orders_revenue_total = new client.Counter({
  name: 'orders_revenue_total',
  help: 'Dinero total acumulado de pedidos completados'
});

const products_low_stock = new client.Gauge({
  name: 'products_low_stock',
  help: 'Unidades restantes de productos con stock bajo',
  labelNames: ['product_name']
});

const active_users_total = new client.Gauge({
  name: 'active_users_total',
  help: 'Número de usuarios actualmente activos en el sistema'
});

const cart_abandonment_total = new client.Counter({
  name: 'cart_abandonment_total',
  help: 'Número total de carritos de compra abandonados'
});

const api_errors_total = new client.Counter({
  name: 'api_errors_total',
  help: 'Número total de errores registrados en la API',
  labelNames: ['route', 'error_type']
});

const metrics = {
  http_requests_total,
  http_request_duration_seconds,
  orders_total,
  orders_revenue_total,
  products_low_stock,
  active_users_total,
  cart_abandonment_total,
  api_errors_total
};

const metricsMiddleware = async (req, res, next) => {
  if (req.path === '/metrics') {
    try {
      res.set('Content-Type', client.register.contentType);
      const metricsData = await client.register.metrics();
      return res.status(200).send(metricsData);
    } catch (error) {
      return res.status(500).send('Error generando las métricas');
    }
  }

  const endTimer = http_request_duration_seconds.startTimer();

  res.on('finish', () => {
    const route = req.route ? req.route.path : req.path;
    const method = req.method;
    const statusCode = res.statusCode;
    http_requests_total.inc({ method, route, status_code: statusCode });
    endTimer({ method, route });
  });

  next();
};

module.exports = {
  metrics,
  metricsMiddleware
};