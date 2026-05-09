const winston = require('winston');
const { ElasticsearchTransport } = require('winston-elasticsearch');
const { v4: uuidv4 } = require('uuid');

const esTransportOpts = {
  level: 'info',
  clientOpts: {
    node: process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200',
  },
  index: 'ecommerce-logs',
  transformer: (logData) => {
    return {
      '@timestamp': new Date().toISOString(),
      severity: logData.level,
      message: logData.message,
      fields: logData.meta,
      service: 'ecommerce-api',
    };
  },
};

const transports = [
  new winston.transports.Console(),
  new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
  new winston.transports.File({ filename: 'logs/combined.log' }),
];

if (process.env.NODE_ENV === 'production') {
  transports.push(new ElasticsearchTransport(esTransportOpts));
}

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'ecommerce-api' },
  transports,
});

const requestLogger = (req, res, next) => {
  const start = Date.now();
  const requestId = req.headers['x-request-id'] || uuidv4();

  req.requestId = requestId;
  req.logger = logger.child({ requestId });

  res.on('finish', () => {
    const duration = Date.now() - start;
    req.logger.info('HTTP Request', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration_ms: duration,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
  });

  next();
};

module.exports = { logger, requestLogger };