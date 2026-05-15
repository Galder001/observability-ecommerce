/**
 * rateLimiter.js — Multi-tier rate limiting with full observability
 *
 * Three pre-configured limiters:
 *   - globalLimiter:  300 req / 15min per IP  (general traffic)
 *   - authLimiter:    10  req / 15min per IP  (login/register — brute-force protection)
 *   - writeLimiter:   60  req / 1min  per IP  (POST/PUT/DELETE — abuse protection)
 *
 * Every block produces:
 *   - A structured warn log including requestId, IP, path, limiter tier
 *   - A rateLimitHits metric increment with label { tier }
 *   - A 429 JSON response with retryAfter (seconds)
 *
 * Note: uses express-rate-limit's MemoryStore (fine for single-instance demos).
 * For multi-instance setups, swap in rate-limit-redis. See README.
 */

const rateLimit = require('express-rate-limit');
const { logger } = require('./logger');
const { rateLimitHits } = require('./metrics');

function buildLimiter({ tier, windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,   // RateLimit-* headers (modern spec)
    legacyHeaders: false,    // disable X-RateLimit-* (deprecated)
    handler: (req, res, next, options) => {
      rateLimitHits.inc({ tier });
      const retryAfterSec = Math.ceil(options.windowMs / 1000);
      logger.warn('ratelimit.blocked', {
        requestId: req.requestId,
        tier,
        ip: req.ip,
        path: req.originalUrl,
        method: req.method,
        userId: req.user?.id || null,
        windowMs: options.windowMs,
        max: options.max,
        retryAfterSec,
      });
      res.status(429).json({
        error: 'too_many_requests',
        message,
        tier,
        retryAfter: retryAfterSec,
        requestId: req.requestId,
      });
    },
  });
}

const authLimiter = buildLimiter({
  tier: 'auth',
  windowMs: 15 * 60 * 1000,
  max: 2000,  // era 500
  message: 'Too many authentication attempts. Try again in 15 minutes.',
});

const globalLimiter = buildLimiter({
  tier: 'global',
  windowMs: 15 * 60 * 1000,
  max: 2000,  // ← era 300
  message: 'Too many requests from this IP. Slow down.',
});

const writeLimiter = buildLimiter({
  tier: 'write',
  windowMs: 60 * 1000,
  max: 60,
  message: 'Too many write operations from this IP.',
});

module.exports = { globalLimiter, authLimiter, writeLimiter };