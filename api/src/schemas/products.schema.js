/**
 * schemas/products.schema.js — Joi validation for /products/* routes
 */

const Joi = require('joi');

const createProductSchema = Joi.object({
  name: Joi.string().min(2).max(120).required(),
  description: Joi.string().max(2000).allow('').optional(),
  price: Joi.number().positive().precision(2).required(),
  stock: Joi.number().integer().min(0).required(),
  category: Joi.string().max(60).required(),
  sku: Joi.string().pattern(/^[A-Z0-9-]{3,30}$/).required().messages({
    'string.pattern.base': 'SKU must be 3-30 uppercase alphanumerics/dashes',
  }),
});

// Partial update — every field optional but at least one required
const updateProductSchema = createProductSchema.fork(
  Object.keys(createProductSchema.describe().keys),
  (s) => s.optional()
).min(1);

const listProductsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  category: Joi.string().max(60).optional(),
  minPrice: Joi.number().min(0).optional(),
  maxPrice: Joi.number().min(0).optional(),
  search: Joi.string().max(100).optional(),
  sort: Joi.string().valid('price_asc', 'price_desc', 'name_asc', 'name_desc').optional(),
});

const productIdParamSchema = Joi.object({
  id: Joi.string().required(),
});

module.exports = {
  createProductSchema,
  updateProductSchema,
  listProductsQuerySchema,
  productIdParamSchema,
};