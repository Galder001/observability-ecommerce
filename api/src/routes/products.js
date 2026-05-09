// products.js
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Importación de módulos locales
const { products, findById, getLowStockProducts } = require('../data/store');
const { metrics } = require('../middleware/metrics');

/**
 * GET /api/products
 * Lista productos con filtrado, ordenamiento y paginación.
 */
router.get('/', async (req, res) => {
    try {
        let { category, search, minPrice, maxPrice, sortBy, page = 1, limit = 10 } = req.query;
        
        page = parseInt(page);
        limit = parseInt(limit);
        
        let filteredProducts = [...products];

        // 1. Filtrado
        if (category) {
            filteredProducts = filteredProducts.filter(p => p.category === category);
        }
        if (search) {
            const query = search.toLowerCase();
            filteredProducts = filteredProducts.filter(p => 
                p.name.toLowerCase().includes(query) || 
                p.tags.some(tag => tag.toLowerCase().includes(query))
            );
        }
        if (minPrice) {
            filteredProducts = filteredProducts.filter(p => p.price >= parseFloat(minPrice));
        }
        if (maxPrice) {
            filteredProducts = filteredProducts.filter(p => p.price <= parseFloat(maxPrice));
        }

        // 2. Ordenamiento
        switch (sortBy) {
            case 'price_asc':
                filteredProducts.sort((a, b) => a.price - b.price);
                break;
            case 'price_desc':
                filteredProducts.sort((a, b) => b.price - a.price);
                break;
            case 'rating':
                filteredProducts.sort((a, b) => b.rating - a.rating);
                break;
            case 'reviews':
                filteredProducts.sort((a, b) => b.reviews - a.reviews);
                break;
        }

        // 3. Paginación
        const total = filteredProducts.length;
        const totalPages = Math.ceil(total / limit);
        const startIndex = (page - 1) * limit;
        const paginatedData = filteredProducts.slice(startIndex, startIndex + limit);

        res.json({
            data: paginatedData,
            total,
            page,
            limit,
            totalPages
        });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * GET /api/products/low-stock
 * Devuelve productos con stock bajo y actualiza las métricas de Prometheus.
 */
router.get('/low-stock', async (req, res) => {
    try {
        const lowStockItems = getLowStockProducts();
        
        // Actualizar métricas para cada producto con stock bajo
        lowStockItems.forEach(p => {
            metrics.products_low_stock.set({ product_name: p.name }, p.stock);
        });

        res.json(lowStockItems);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * GET /api/products/:id
 * Busca un producto específico por su ID.
 */
router.get('/:id', async (req, res) => {
    try {
        const product = findById(req.params.id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * POST /api/products
 * Crea un nuevo producto y lo añade al almacén de datos.
 */
router.post('/', async (req, res) => {
    try {
        const { name, price, stock, category, brand } = req.body;

        // Validación de campos obligatorios
        if (!name || !price || stock === undefined || !category || !brand) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const newProduct = {
            id: uuidv4(),
            name,
            price: parseFloat(price),
            stock: parseInt(stock),
            category,
            brand,
            slug: name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''),
            rating: 0,
            reviews: 0,
            tags: [],
            createdAt: new Date()
        };

        products.push(newProduct);
        res.status(201).json(newProduct);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * PATCH /api/products/:id/stock
 * Incrementa o decrementa el stock de un producto.
 */
router.patch('/:id/stock', async (req, res) => {
    try {
        const { quantity, operation } = req.body;
        const product = findById(req.params.id);

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        let newStock = product.stock;
        if (operation === 'add') {
            newStock += quantity;
        } else if (operation === 'subtract') {
            newStock -= quantity;
        }

        if (newStock < 0) {
            return res.status(400).json({ error: 'Insufficient stock' });
        }

        product.stock = newStock;

        // Si el stock es bajo, actualizamos la métrica
        if (product.stock <= 20) {
            metrics.products_low_stock.set({ product_name: product.name }, product.stock);
        }

        res.json(product);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * DELETE /api/products/:id
 * Elimina un producto del array por su ID.
 */
router.delete('/:id', async (req, res) => {
    try {
        const index = products.findIndex(p => p.id === req.params.id);
        if (index === -1) {
            return res.status(404).json({ error: 'Product not found' });
        }

        products.splice(index, 1);
        res.json({ message: 'Product deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Endpoint que simula operación lenta para demo de latencia
router.get('/slow', async (req, res) => {
  const delay = Math.floor(Math.random() * 2000) + 500;
  await new Promise(r => setTimeout(r, delay));
  res.json({ 
    message: 'Slow endpoint response',
    delay_ms: delay,
    products: products.slice(0, 3)
  });
});

module.exports = router;