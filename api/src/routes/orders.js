const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

const { orders, products, users } = require('../data/store');
const { metrics } = require('../middleware/metrics');
const { logger } = require('../middleware/logger');
const { authenticate } = require('../middleware/auth');

/**
 * GET /api/orders
 */
router.get('/', async (req, res) => {
  try {
    let { status, page = 1, limit = 10 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    let filtered = [...orders];
    if (status) filtered = filtered.filter(o => o.status === status);
    const total = filtered.length;
    const data = filtered.slice((page - 1) * limit, page * limit);
    res.json({ data, total, page, totalPages: Math.ceil(total / limit) });
  } catch (e) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * GET /api/orders/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = {
      totalOrders: orders.length,
      byStatus: {
        pending:   orders.filter(o => o.status === 'pending').length,
        completed: orders.filter(o => o.status === 'completed').length,
        cancelled: orders.filter(o => o.status === 'cancelled').length,
        failed:    orders.filter(o => o.status === 'failed').length,
      },
      totalRevenue: 0,
      averageTicket: 0,
    };
    const completed = orders.filter(o => o.status === 'completed');
    stats.totalRevenue = completed.reduce((s, o) => s + o.total, 0);
    stats.averageTicket = completed.length > 0 ? stats.totalRevenue / completed.length : 0;
    res.json(stats);
  } catch (e) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * GET /api/orders/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const order = orders.find(o => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (e) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * POST /api/orders
 * Acepta userId del JWT (req.user) O del body para compatibilidad con load test
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { items } = req.body;
    // userId viene del JWT — no del body
    const userId = req.user.id;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items are required', requestId: req.requestId });
    }

    let total = 0;
    const processedItems = [];

    for (const item of items) {
      const product = products.find(p => p.id === item.productId);
      if (!product) {
        return res.status(404).json({ error: `Product ${item.productId} not found`, requestId: req.requestId });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for: ${product.name}`, requestId: req.requestId });
      }
      total += product.price * item.quantity;
      processedItems.push({ ...item, price: product.price, name: product.name });
    }

    // Restar stock
    items.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      if (product) product.stock -= item.quantity;
    });

    const newOrder = {
      id: uuidv4(),
      userId,
      items: processedItems,
      total,
      status: 'completed', // completed directo para que el revenue suba inmediatamente
      createdAt: new Date(),
    };

    orders.push(newOrder);

    // Métricas
    metrics.orders_total.inc({ status: 'completed' });
    metrics.orders_revenue_total.inc(total);

    logger.info('order.created', {
      requestId: req.requestId,
      orderId: newOrder.id,
      userId,
      total,
      items: processedItems.length,
    });

    res.status(201).json(newOrder);
  } catch (e) {
    logger.error('order.error', { requestId: req.requestId, error: e.message });
    res.status(500).json({ error: 'Internal Server Error', requestId: req.requestId });
  }
});

/**
 * PATCH /api/orders/:id/status
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['completed', 'cancelled', 'failed', 'pending'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const order = orders.find(o => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    order.status = status;
    logger.info('order.status_changed', { requestId: req.requestId, orderId: order.id, status });
    metrics.orders_total.inc({ status });
    if (status === 'completed') metrics.orders_revenue_total.inc(order.total);
    res.json(order);
  } catch (e) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * DELETE /api/orders/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const index = orders.findIndex(o => o.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Order not found' });
    if (orders[index].status !== 'cancelled') {
      return res.status(400).json({ error: 'Only cancelled orders can be deleted' });
    }
    orders.splice(index, 1);
    res.json({ message: 'Order deleted' });
  } catch (e) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;