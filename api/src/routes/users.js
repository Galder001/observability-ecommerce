// users.js
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// Importación de dependencias y módulos locales
const { users, orders, findByEmail } = require('../data/store');
const { metrics } = require('../middleware/metrics');
const { logger } = require('../middleware/logger');

/**
 * GET /api/users
 * Devuelve la lista de usuarios. Permite filtrar por rol.
 * Actualiza la métrica de usuarios activos.
 */
router.get('/', async (req, res) => {
    try {
        const { role } = req.query;
        let filteredUsers = [...users];

        if (role) {
            filteredUsers = filteredUsers.filter(u => u.role === role);
        }

        // Mapeamos para excluir datos sensibles (ej. passwords si existieran)
        const publicUsers = filteredUsers.map(({ password, ...userProfile }) => userProfile);

        // Actualizar métrica de usuarios totales en el sistema
        metrics.active_users_total.set(users.length);

        res.json(publicUsers);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * GET /api/users/:id
 * Devuelve un usuario específico junto con su historial de pedidos.
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const user = users.find(u => u.id === id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Obtener pedidos asociados al usuario
        const userOrders = orders.filter(o => o.userId === id);

        // Excluir password de la respuesta
        const { password, ...userProfile } = user;

        res.json({
            ...userProfile,
            orders: userOrders
        });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * POST /api/users
 * Registra un nuevo usuario con validación de email único.
 */
router.post('/', async (req, res) => {
    try {
        const { name, email, role, address } = req.body;

        // Validación de campos obligatorios
        if (!name || !email) {
            return res.status(400).json({ error: 'Name and email are required' });
        }

        // Validar si el email ya existe
        const existingUser = findByEmail(email);
        if (existingUser) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        const newUser = {
            id: uuidv4(),
            name,
            email,
            role: role || 'customer',
            address: address || '',
            createdAt: new Date()
        };

        users.push(newUser);

        // Actualizar métricas y registrar log
        metrics.active_users_total.set(users.length);
        logger.info('New user created', { userId: newUser.id, email: newUser.email });

        res.status(201).json(newUser);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * PATCH /api/users/:id
 * Actualiza información de perfil. No permite modificar el email.
 */
router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, address, role } = req.body;
        
        const userIndex = users.findIndex(u => u.id === id);
        if (userIndex === -1) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Actualizar solo campos permitidos
        if (name) users[userIndex].name = name;
        if (address) users[userIndex].address = address;
        if (role) users[userIndex].role = role;

        const { password, ...updatedUser } = users[userIndex];
        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * DELETE /api/users/:id
 * Elimina un usuario si no tiene pedidos pendientes de procesar.
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userIndex = users.findIndex(u => u.id === id);

        if (userIndex === -1) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Regla de negocio: No borrar si hay pedidos pendientes
        const hasPendingOrders = orders.some(o => o.userId === id && o.status === 'pending');
        if (hasPendingOrders) {
            return res.status(400).json({ error: 'User has pending orders' });
        }

        // Eliminar usuario
        users.splice(userIndex, 1);

        // Actualizar métricas tras eliminación
        metrics.active_users_total.set(users.length);

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;