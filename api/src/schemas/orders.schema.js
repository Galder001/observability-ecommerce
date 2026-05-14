/**
 * schemas/orders.schema.js — Joi validation for /orders/* routes
 */

const Joi = require('joi');

const orderItemSchema = Joi.object({
  productId: Joi.string().required(),
  quantity: Joi.number().integer().min(1).max(100).required(),
});

const createOrderSchema = Joi.object({
  items: Joi.array().items(orderItemSchema).min(1).max(50).required(),
  shippingAddress: Joi.object({
    street: Joi.string().min(3).max(200).required(),
    city: Joi.string().min(2).max(100).required(),
    postalCode: Joi.string().min(3).max(20).required(),
    country: Joi.string().length(2).uppercase().required(),
  }).required(),
  paymentMethod: Joi.string().valid('card', 'paypal', 'transfer').required(),
});

const listOrdersQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid('pending', 'paid', 'shipped', 'delivered', 'cancelled').optional(),
});

const updateOrderStatusSchema = Joi.object({
  status: Joi.string().valid('pending', 'paid', 'shipped', 'delivered', 'cancelled').required(),
});

module.exports = {
  createOrderSchema,
  listOrdersQuerySchema,
  updateOrderStatusSchema,
};