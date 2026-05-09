// orders.js
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// Importación de módulos y datos
const { orders, products, users, findById, getOrdersByStatus, getOrdersByUser } = require('../data/store');
const { metrics } = require('../middleware/metrics');
const { logger } = require('../middleware/logger');

/**
 * GET /api/orders
 * Obtiene lista de pedidos con filtros por estado, usuario y paginación.
 */
router.get('/', async (req, res) => {
    try {
        let { status, userId, page = 1, limit = 10 } = req.query;
        page = parseInt(page);
        limit = parseInt(limit);

        let filteredOrders = [...orders];

        if (status) {
            filteredOrders = filteredOrders.filter(o => o.status === status);
        }
        if (userId) {
            filteredOrders = filteredOrders.filter(o => o.userId === userId);
        }

        const total = filteredOrders.length;
        const totalPages = Math.ceil(total / limit);
        const data = filteredOrders.slice((page - 1) * limit, page * limit);

        res.json({ data, total, page, totalPages });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * GET /api/orders/stats
 * Calcula estadísticas de ventas, estados y productos.
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = {
            totalOrders: orders.length,
            byStatus: {
                pending: orders.filter(o => o.status === 'pending').length,
                completed: orders.filter(o => o.status === 'completed').length,
                cancelled: orders.filter(o => o.status === 'cancelled').length,
                failed: orders.filter(o => o.status === 'failed').length
            },
            totalRevenue: 0,
            averageTicket: 0,
            topProduct: null
        };

        const completedOrders = orders.filter(o => o.status === 'completed');
        stats.totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0);
        stats.averageTicket = completedOrders.length > 0 ? stats.totalRevenue / completedOrders.length : 0;

        // Cálculo del producto más vendido
        const productSales = {};
        orders.forEach(o => o.items.forEach(item => {
            productSales[item.productId] = (productSales[item.productId] || 0) + item.quantity;
        }));
        
        const topProductId = Object.keys(productSales).reduce((a, b) => productSales[a] > productSales[b] ? a : b, null);
        stats.topProduct = topProductId ? { id: topProductId, quantity: productSales[topProductId] } : null;

        res.json(stats);
    } catch (error) {
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
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * POST /api/orders
 * Crea un pedido, valida stock, resta inventario e incrementa métricas.
 */
router.post('/', async (req, res) => {
    try {
        const { userId, items } = req.body;

        if (!userId || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'User ID and items are required' });
        }

        let total = 0;
        const processedItems = [];

        // Validar existencia de productos y stock
        for (const item of items) {
            const product = products.find(p => p.id === item.productId);
            if (!product) return res.status(404).json({ error: `Product ${item.productId} not found` });
            if (product.stock < item.quantity) {
                return res.status(400).json({ error: `Insufficient stock for product: ${product.name}` });
            }
            
            total += product.price * item.quantity;
            processedItems.push({ ...item, price: product.price });
        }

        // Reducir stock de los productos
        items.forEach(item => {
            const product = products.find(p => p.id === item.productId);
            product.stock -= item.quantity;
        });

        const newOrder = {
            id: uuidv4(),
            userId,
            items: processedItems,
            total,
            status: 'pending',
            createdAt: new Date()
        };

        orders.push(newOrder);
        
        // Métrica: Incrementar contador de pedidos pendientes
        metrics.orders_total.inc({ status: 'pending' });

        res.status(201).json(newOrder);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * PATCH /api/orders/:id/status
 * Cambia el estado, registra logs y actualiza métricas de negocio.
 */
router.patch('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['completed', 'cancelled', 'failed'];
        
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const order = orders.find(o => o.id === req.params.id);
        if (!order) return res.status(404).json({ error: 'Order not found' });

        order.status = status;

        // Registro de actividad
        logger.info(`Order status changed`, { orderId: order.id, status });

        // Actualización de métricas según el nuevo estado
        metrics.orders_total.inc({ status });

        if (status === 'completed') {
            metrics.orders_revenue_total.inc(order.total);
        }

        res.json(order);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * DELETE /api/orders/:id
 * Solo permite eliminar si el estado es 'cancelled'.
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
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;