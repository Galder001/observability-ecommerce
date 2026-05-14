/**
 * schemas/auth.schema.js — Joi validation schemas for /auth/* routes
 */

const Joi = require('joi');

// Password policy: 8-72 chars (bcrypt limit), at least one letter and one number.
// Kept intentionally lenient for a demo while still rejecting obvious weak inputs.
const passwordRule = Joi.string()
  .min(8)
  .max(72)
  .pattern(/[A-Za-z]/, 'letter')
  .pattern(/[0-9]/, 'number')
  .required()
  .messages({
    'string.min': 'Password must be at least 8 characters',
    'string.max': 'Password is too long (max 72)',
    'string.pattern.name': 'Password must contain at least one {#name}',
  });

const usernameRule = Joi.string()
  .alphanum()
  .min(3)
  .max(30)
  .required();

const registerSchema = Joi.object({
  username: usernameRule,
  email: Joi.string().email().required(),
  password: passwordRule,
});

const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required(),
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

module.exports = { registerSchema, loginSchema, refreshSchema };