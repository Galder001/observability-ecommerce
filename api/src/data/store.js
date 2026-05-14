const bcrypt = require('bcrypt');

// ─── PRODUCTOS (IDs fijos — no cambian entre reinicios) ───────────────────────
const products = [
  { id: 'prod-001', name: 'Laptop Pro 15',             slug: 'laptop-pro-15',             price: 1299.99, stock: 25,  category: 'electronics', brand: 'TechCorp',    rating: 4.8, reviews: 312,  tags: ['laptop', 'pro', 'work'] },
  { id: 'prod-002', name: 'Wireless Mouse',             slug: 'wireless-mouse',             price: 29.99,   stock: 150, category: 'electronics', brand: 'ClickMaster', rating: 4.5, reviews: 89,   tags: ['mouse', 'wireless'] },
  { id: 'prod-003', name: 'Mechanical Keyboard',        slug: 'mechanical-keyboard',        price: 89.99,   stock: 60,  category: 'electronics', brand: 'TypePro',     rating: 4.7, reviews: 204,  tags: ['keyboard', 'mechanical'] },
  { id: 'prod-004', name: 'USB-C Hub 7-in-1',           slug: 'usb-c-hub',                  price: 49.99,   stock: 80,  category: 'accessories', brand: 'ConnectAll',  rating: 4.3, reviews: 56,   tags: ['usb', 'hub', 'dongle'] },
  { id: 'prod-005', name: 'Monitor 27" 4K',             slug: 'monitor-27-4k',              price: 399.99,  stock: 15,  category: 'electronics', brand: 'ViewMax',     rating: 4.9, reviews: 178,  tags: ['monitor', '4k', 'display'] },
  { id: 'prod-006', name: 'Webcam HD 1080p',            slug: 'webcam-hd-1080p',            price: 69.99,   stock: 45,  category: 'electronics', brand: 'ClearVision', rating: 4.2, reviews: 93,   tags: ['webcam', 'hd', 'streaming'] },
  { id: 'prod-007', name: 'Laptop Stand',               slug: 'laptop-stand',               price: 34.99,   stock: 200, category: 'accessories', brand: 'ErgoPro',     rating: 4.6, reviews: 441,  tags: ['stand', 'ergonomic'] },
  { id: 'prod-008', name: 'Noise Cancelling Headphones',slug: 'noise-cancelling-headphones',price: 249.99,  stock: 30,  category: 'audio',       brand: 'SoundZen',    rating: 4.8, reviews: 567,  tags: ['headphones', 'noise-cancelling'] },
  { id: 'prod-009', name: 'External SSD 1TB',           slug: 'external-ssd-1tb',           price: 119.99,  stock: 55,  category: 'storage',     brand: 'SpeedDrive',  rating: 4.7, reviews: 289,  tags: ['ssd', 'storage', 'portable'] },
  { id: 'prod-010', name: 'Smartphone 12 Pro',          slug: 'smartphone-12-pro',          price: 899.99,  stock: 8,   category: 'electronics', brand: 'PhoneX',      rating: 4.9, reviews: 1023, tags: ['smartphone', 'pro', '5g'] },
];

// ─── USUARIOS ─────────────────────────────────────────────────────────────────
const users = [
  {
    id: 'usr_alice_seed',
    name: 'Alice García',
    username: 'alice',
    email: 'alice@example.com',
    passwordHash: '$2b$10$qBg0WcIh7VqgV3pWZEnhnOsU0nNzWD2HPsZ3FD8pPlFtk3.TTW8x6',
    role: 'admin',
    createdAt: new Date('2024-01-15'),
    address: { city: 'Madrid', country: 'ES', zip: '28001' }
  },
  {
    id: 'usr_bob_seed',
    name: 'Bob Martínez',
    username: 'bob',
    email: 'bob@example.com',
    passwordHash: '$2b$10$qBg0WcIh7VqgV3pWZEnhnOsU0nNzWD2HPsZ3FD8pPlFtk3.TTW8x6',
    role: 'customer',
    createdAt: new Date('2024-03-22'),
    address: { city: 'Barcelona', country: 'ES', zip: '08001' }
  },
  {
    id: 'usr_carlos_seed',
    name: 'Carlos López',
    username: 'carlos',
    email: 'carlos@example.com',
    passwordHash: '$2b$10$qBg0WcIh7VqgV3pWZEnhnOsU0nNzWD2HPsZ3FD8pPlFtk3.TTW8x6',
    role: 'customer',
    createdAt: new Date('2024-06-10'),
    address: { city: 'Valencia', country: 'ES', zip: '46001' }
  },
  {
    id: 'usr_diana_seed',
    name: 'Diana Ruiz',
    username: 'diana',
    email: 'diana@example.com',
    passwordHash: '$2b$10$qBg0WcIh7VqgV3pWZEnhnOsU0nNzWD2HPsZ3FD8pPlFtk3.TTW8x6',
    role: 'customer',
    createdAt: new Date('2024-08-05'),
    address: { city: 'Sevilla', country: 'ES', zip: '41001' }
  },
  {
    id: 'usr_eduardo_seed',
    name: 'Eduardo Sanz',
    username: 'eduardo',
    email: 'eduardo@example.com',
    passwordHash: '$2b$10$qBg0WcIh7VqgV3pWZEnhnOsU0nNzWD2HPsZ3FD8pPlFtk3.TTW8x6',
    role: 'customer',
    createdAt: new Date('2024-11-30'),
    address: { city: 'Bilbao', country: 'ES', zip: '48001' }
  },
];

// ─── PEDIDOS ──────────────────────────────────────────────────────────────────
const orders = [];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const findById            = (id)     => products.find(item => item.id === id);
const findByEmail         = (email)  => users.find(u => u.email === email);
const findByUsername      = (uname)  => users.find(u => u.username === uname);
const getLowStockProducts = (threshold = 20) => products.filter(p => p.stock <= threshold);
const getOrdersByStatus   = (status) => orders.filter(o => o.status === status);
const getOrdersByUser     = (userId) => orders.filter(o => o.userId === userId);

module.exports = {
  products,
  orders,
  users,
  findById,
  findByEmail,
  findByUsername,
  getLowStockProducts,
  getOrdersByStatus,
  getOrdersByUser,
};