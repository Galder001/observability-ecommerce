/**
 * validate.js — Joi-based request validation middleware
 *
 * Usage:
 *   router.post('/products',
 *     authenticate,
 *     authorize('admin'),
 *     validate({ body: createProductSchema }),
 *     handler);
 *
 * Validates any combination of { body, query, params }.
 * On failure: 400 JSON with field-level error details.
 * Observability:
 *   - Logs structured warn with requestId, failing fields, values redacted
 *   - Increments validationErrors metric with label { location, route }
 */

const logger = require('./logger');
const { validationErrors } = require('./metrics');

function redactValue(key, value) {
  const sensitive = /password|token|secret|authorization|cardNumber|cvv/i;
  if (sensitive.test(key)) return '[REDACTED]';
  return value;
}

function validate(schemas) {
  return (req, res, next) => {
    const errors = [];

    for (const location of ['body', 'query', 'params']) {
      const schema = schemas[location];
      if (!schema) continue;

      const { error, value } = schema.validate(req[location], {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
      });

      if (error) {
        for (const detail of error.details) {
          errors.push({
            location,
            field: detail.path.join('.'),
            message: detail.message,
            value: redactValue(detail.path.join('.'), detail.context?.value),
          });
        }
      } else {
        // Use sanitized + coerced value going forward
        req[location] = value;
      }
    }

    if (errors.length > 0) {
      const routeLabel = req.route?.path || req.originalUrl;
      // One metric increment per failing location, not per field, to keep cardinality sane
      const locationsAffected = [...new Set(errors.map((e) => e.location))];
      for (const loc of locationsAffected) {
        validationErrors.inc({ location: loc, route: routeLabel });
      }

      logger.warn('validation.failed', {
        requestId: req.requestId,
        method: req.method,
        path: req.originalUrl,
        userId: req.user?.id || null,
        errorCount: errors.length,
        errors,
      });

      return res.status(400).json({
        error: 'validation_error',
        message: 'Request validation failed',
        details: errors,
        requestId: req.requestId,
      });
    }

    return next();
  };
}

module.exports = validate;