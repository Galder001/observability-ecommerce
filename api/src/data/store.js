const { v4: uuidv4 } = require('uuid');

// ─── PRODUCTOS ───────────────────────────────────────────────────────────────
const products = [
  { id: uuidv4(), name: 'Laptop Pro 15', slug: 'laptop-pro-15', price: 1299.99, stock: 25, category: 'electronics', brand: 'TechCorp', rating: 4.8, reviews: 312, tags: ['laptop', 'pro', 'work'] },
  { id: uuidv4(), name: 'Wireless Mouse', slug: 'wireless-mouse', price: 29.99, stock: 150, category: 'electronics', brand: 'ClickMaster', rating: 4.5, reviews: 89, tags: ['mouse', 'wireless'] },
  { id: uuidv4(), name: 'Mechanical Keyboard', slug: 'mechanical-keyboard', price: 89.99, stock: 60, category: 'electronics', brand: 'TypePro', rating: 4.7, reviews: 204, tags: ['keyboard', 'mechanical'] },
  { id: uuidv4(), name: 'USB-C Hub 7-in-1', slug: 'usb-c-hub', price: 49.99, stock: 80, category: 'accessories', brand: 'ConnectAll', rating: 4.3, reviews: 56, tags: ['usb', 'hub', 'dongle'] },
  { id: uuidv4(), name: 'Monitor 27" 4K', slug: 'monitor-27-4k', price: 399.99, stock: 15, category: 'electronics', brand: 'ViewMax', rating: 4.9, reviews: 178, tags: ['monitor', '4k', 'display'] },
  { id: uuidv4(), name: 'Webcam HD 1080p', slug: 'webcam-hd-1080p', price: 69.99, stock: 45, category: 'electronics', brand: 'ClearVision', rating: 4.2, reviews: 93, tags: ['webcam', 'hd', 'streaming'] },
  { id: uuidv4(), name: 'Laptop Stand', slug: 'laptop-stand', price: 34.99, stock: 200, category: 'accessories', brand: 'ErgoPro', rating: 4.6, reviews: 441, tags: ['stand', 'ergonomic'] },
  { id: uuidv4(), name: 'Noise Cancelling Headphones', slug: 'noise-cancelling-headphones', price: 249.99, stock: 30, category: 'audio', brand: 'SoundZen', rating: 4.8, reviews: 567, tags: ['headphones', 'noise-cancelling', 'audio'] },
  { id: uuidv4(), name: 'External SSD 1TB', slug: 'external-ssd-1tb', price: 119.99, stock: 55, category: 'storage', brand: 'SpeedDrive', rating: 4.7, reviews: 289, tags: ['ssd', 'storage', 'portable'] },
  { id: uuidv4(), name: 'Smartphone 12 Pro', slug: 'smartphone-12-pro', price: 899.99, stock: 8, category: 'electronics', brand: 'PhoneX', rating: 4.9, reviews: 1023, tags: ['smartphone', 'pro', '5g'] },
];

// ─── USUARIOS ─────────────────────────────────────────────────────────────────
const users = [
  { id: uuidv4(), name: 'Alice García', email: 'alice@example.com', role: 'admin', createdAt: new Date('2024-01-15'), address: { city: 'Madrid', country: 'ES', zip: '28001' } },
  { id: uuidv4(), name: 'Bob Martínez', email: 'bob@example.com', role: 'customer', createdAt: new Date('2024-03-22'), address: { city: 'Barcelona', country: 'ES', zip: '08001' } },
  { id: uuidv4(), name: 'Carlos López', email: 'carlos@example.com', role: 'customer', createdAt: new Date('2024-06-10'), address: { city: 'Valencia', country: 'ES', zip: '46001' } },
  { id: uuidv4(), name: 'Diana Ruiz', email: 'diana@example.com', role: 'customer', createdAt: new Date('2024-08-05'), address: { city: 'Sevilla', country: 'ES', zip: '41001' } },
  { id: uuidv4(), name: 'Eduardo Sanz', email: 'eduardo@example.com', role: 'customer', createdAt: new Date('2024-11-30'), address: { city: 'Bilbao', country: 'ES', zip: '48001' } },
];

// ─── PEDIDOS ──────────────────────────────────────────────────────────────────
const orders = [];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const findById = (id) => products.find(item => item.id === id);
const findByEmail = (email) => users.find(u => u.email === email);
const getLowStockProducts = (threshold = 20) => products.filter(p => p.stock <= threshold);
const getOrdersByStatus = (status) => orders.filter(o => o.status === status);
const getOrdersByUser = (userId) => orders.filter(o => o.userId === userId);

module.exports = {
  products,
  orders,
  users,
  findById,
  findByEmail,
  getLowStockProducts,
  getOrdersByStatus,
  getOrdersByUser,
};