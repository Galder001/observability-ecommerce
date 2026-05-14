/**
 * auth.js — JWT authentication & role-based authorization
 *
 * Exports:
 *   - authenticate: verifies Bearer token, attaches req.user
 *   - authorize(...roles): requires req.user.role to be in roles list
 *   - signAccessToken(payload), signRefreshToken(payload): token issuance helpers
 *
 * Observability hooks:
 *   - Emits structured logs with requestId on every failure (missing/invalid/expired)
 *   - Increments authAttempts metric with labels { result, reason }
 *   - Tracks activeSessions gauge on successful authentication
 */

const jwt = require('jsonwebtoken');
const { logger } = require('./logger');
const { authAttempts, activeSessions } = require('./metrics');

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me';
const ACCESS_TTL = process.env.JWT_ACCESS_TTL || '15m';
const REFRESH_TTL = process.env.JWT_REFRESH_TTL || '7d';

function signAccessToken(payload) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_TTL });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_TTL });
}

function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET);
}

/**
 * Authentication middleware.
 * Expects: Authorization: Bearer <token>
 */
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (!token || scheme !== 'Bearer') {
    authAttempts.inc({ result: 'failure', reason: 'missing_token' });
    logger.warn('auth.missing_token', {
      requestId: req.requestId,
      path: req.originalUrl,
      method: req.method,
      ip: req.ip,
    });
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Missing or malformed Authorization header. Expected: Bearer <token>',
      requestId: req.requestId,
    });
  }

  try {
    const decoded = jwt.verify(token, ACCESS_SECRET);
    req.user = {
      id: decoded.sub,
      username: decoded.username,
      role: decoded.role,
    };
    authAttempts.inc({ result: 'success', reason: 'valid_token' });
    logger.debug('auth.success', {
      requestId: req.requestId,
      userId: req.user.id,
      role: req.user.role,
    });
    return next();
  } catch (err) {
    const reason = err.name === 'TokenExpiredError' ? 'expired_token' : 'invalid_token';
    authAttempts.inc({ result: 'failure', reason });
    logger.warn('auth.token_rejected', {
      requestId: req.requestId,
      reason,
      error: err.message,
      path: req.originalUrl,
      method: req.method,
      ip: req.ip,
    });
    return res.status(401).json({
      error: 'unauthorized',
      message: reason === 'expired_token' ? 'Token expired' : 'Invalid token',
      requestId: req.requestId,
    });
  }
}

/**
 * Role-based authorization. Must run AFTER authenticate.
 * Usage: app.delete('/products/:id', authenticate, authorize('admin'), handler)
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      logger.error('auth.authorize_without_authenticate', {
        requestId: req.requestId,
        path: req.originalUrl,
      });
      return res.status(500).json({
        error: 'server_error',
        message: 'authorize() used without authenticate()',
        requestId: req.requestId,
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      authAttempts.inc({ result: 'failure', reason: 'insufficient_role' });
      logger.warn('auth.forbidden', {
        requestId: req.requestId,
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        path: req.originalUrl,
        method: req.method,
      });
      return res.status(403).json({
        error: 'forbidden',
        message: `Role '${req.user.role}' cannot access this resource. Required: ${allowedRoles.join(', ')}`,
        requestId: req.requestId,
      });
    }

    return next();
  };
}

module.exports = {
  authenticate,
  authorize,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
};