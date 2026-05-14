const express = require('express');
const bcrypt  = require('bcrypt');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');

const { logger }                                          = require('../middleware/logger');
const { authAttempts, activeSessions, registrations }    = require('../middleware/metrics');
const { authenticate, signAccessToken, signRefreshToken, verifyRefreshToken } = require('../middleware/auth');
const { authLimiter }                                     = require('../middleware/rateLimiter');
const validate                                            = require('../middleware/validate');
const { registerSchema, loginSchema, refreshSchema }      = require('../schemas/auth.schema');
const { users, findByEmail, findByUsername }              = require('../data/store');

const BCRYPT_ROUNDS = 10;
const revokedTokens = new Set();

// REGISTER
router.post('/register', authLimiter, validate({ body: registerSchema }), async (req, res) => {
  const { username, email, password } = req.body;
  const duplicate = findByEmail(email) || findByUsername(username);
  if (duplicate) {
    authAttempts.inc({ result: 'failure', reason: 'duplicate_user' });
    logger.warn('auth.register.duplicate', { requestId: req.requestId, username, email, ip: req.ip });
    return res.status(409).json({ error: 'conflict', message: 'Username or email already in use', requestId: req.requestId });
  }
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const newUser = {
    id: 'usr_' + uuidv4().slice(0,8),
    name: username, username, email, passwordHash,
    role: 'customer', createdAt: new Date(), address: {},
  };
  users.push(newUser);
  registrations.inc({ role: 'customer' });
  logger.info('auth.register.success', { requestId: req.requestId, userId: newUser.id, username, ip: req.ip });
  return res.status(201).json({ id: newUser.id, username, email, role: newUser.role, createdAt: newUser.createdAt });
});

// LOGIN
router.post('/login', authLimiter, validate({ body: loginSchema }), async (req, res) => {
  const { username, password } = req.body;
  const user = findByUsername(username);
  if (!user) {
    authAttempts.inc({ result: 'failure', reason: 'user_not_found' });
    logger.warn('auth.login.user_not_found', { requestId: req.requestId, username, ip: req.ip });
    return res.status(401).json({ error: 'unauthorized', message: 'Invalid credentials', requestId: req.requestId });
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    authAttempts.inc({ result: 'failure', reason: 'bad_password' });
    logger.warn('auth.login.bad_password', { requestId: req.requestId, userId: user.id, ip: req.ip });
    return res.status(401).json({ error: 'unauthorized', message: 'Invalid credentials', requestId: req.requestId });
  }
  const payload      = { sub: user.id, username: user.username, role: user.role };
  const accessToken  = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  authAttempts.inc({ result: 'success', reason: 'login' });
  activeSessions.inc({ role: user.role });
  logger.info('auth.login.success', { requestId: req.requestId, userId: user.id, username: user.username, role: user.role, ip: req.ip });
  return res.json({ accessToken, refreshToken, tokenType: 'Bearer', expiresIn: 900,
    user: { id: user.id, username: user.username, name: user.name, role: user.role } });
});

// REFRESH
router.post('/refresh', authLimiter, validate({ body: refreshSchema }), (req, res) => {
  const { refreshToken } = req.body;
  if (revokedTokens.has(refreshToken)) {
    authAttempts.inc({ result: 'failure', reason: 'revoked_refresh' });
    return res.status(401).json({ error: 'unauthorized', message: 'Token revocado', requestId: req.requestId });
  }
  try {
    const decoded     = verifyRefreshToken(refreshToken);
    const accessToken = signAccessToken({ sub: decoded.sub, username: decoded.username, role: decoded.role });
    authAttempts.inc({ result: 'success', reason: 'refresh' });
    logger.info('auth.refresh.success', { requestId: req.requestId, userId: decoded.sub });
    return res.json({ accessToken, tokenType: 'Bearer', expiresIn: 900 });
  } catch (err) {
    authAttempts.inc({ result: 'failure', reason: 'invalid_refresh' });
    logger.warn('auth.refresh.invalid', { requestId: req.requestId, error: err.message });
    return res.status(401).json({ error: 'unauthorized', message: 'Refresh token invalido', requestId: req.requestId });
  }
});

// LOGOUT
router.post('/logout', validate({ body: refreshSchema }), (req, res) => {
  const { refreshToken } = req.body;
  revokedTokens.add(refreshToken);
  try {
    const decoded = verifyRefreshToken(refreshToken);
    activeSessions.dec({ role: decoded.role });
    logger.info('auth.logout', { requestId: req.requestId, userId: decoded.sub });
  } catch (_) {}
  return res.status(204).end();
});

// ME
router.get('/me', authenticate, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'not_found', requestId: req.requestId });
  const { passwordHash, ...safe } = user;
  return res.json({ ...safe, requestId: req.requestId });
});

module.exports = router;