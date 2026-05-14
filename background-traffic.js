/**
 * background-traffic.js — Tráfico de fondo realista para dejar corriendo toda la noche
 *
 * Simula una tienda real con patrones humanos:
 * - Usuarios que navegan, compran y se van
 * - Picos cada cierto tiempo (simulando horas punta)
 * - Algún error ocasional (realismo)
 * - Carritos abandonados
 * - Sin agotar el rate limit
 *
 * USO: node background-traffic.js
 * Ctrl+C para parar. Diseñado para correr 8+ horas sin intervención.
 */

const http = require('http');

const SEED_USERS = [
  { username: 'bob',     password: 'Admin1234' },
  { username: 'carlos',  password: 'Admin1234' },
  { username: 'diana',   password: 'Admin1234' },
  { username: 'eduardo', password: 'Admin1234' },
];

const PRODUCTS = [
  { id: 'prod-001', price: 1299.99, name: 'Laptop Pro 15' },
  { id: 'prod-002', price: 29.99,   name: 'Wireless Mouse' },
  { id: 'prod-003', price: 89.99,   name: 'Mechanical Keyboard' },
  { id: 'prod-004', price: 49.99,   name: 'USB-C Hub' },
  { id: 'prod-005', price: 399.99,  name: 'Monitor 4K' },
  { id: 'prod-006', price: 69.99,   name: 'Webcam HD' },
  { id: 'prod-007', price: 34.99,   name: 'Laptop Stand' },
  { id: 'prod-008', price: 249.99,  name: 'Headphones' },
  { id: 'prod-009', price: 119.99,  name: 'External SSD' },
  { id: 'prod-010', price: 899.99,  name: 'Smartphone Pro' },
];

const DELAY  = ms  => new Promise(r => setTimeout(r, ms));
const rand   = arr => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

let totalOrders   = 0;
let totalRevenue  = 0;
let totalSessions = 0;
let totalAbandons = 0;
let cycle         = 0;
const startTime   = Date.now();

function log(emoji, msg) {
  const elapsed = Math.floor((Date.now() - startTime) / 60000);
  console.log(`[+${String(elapsed).padStart(3,'0')}min] ${emoji}  ${msg}`);
}

function request(method, path, body = null, token = null) {
  return new Promise(resolve => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token)   headers['Authorization']  = `Bearer ${token}`;
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);
    const req = http.request(
      { hostname: 'localhost', port: 3000, path, method, headers },
      res => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
          catch { resolve({ status: res.statusCode, body: {} }); }
        });
      }
    );
    req.on('error', () => resolve({ status: 0, body: {} }));
    if (payload) req.write(payload);
    req.end();
  });
}

// Usuario que compra — el flujo más común
async function userBuys() {
  const user  = rand(SEED_USERS);
  const login = await request('POST', '/api/auth/login', { username: user.username, password: user.password });
  if (login.status !== 200) return;

  const token = login.body.accessToken;
  totalSessions++;

  // Navega un poco antes de comprar
  await request('GET', '/api/products');
  await DELAY(randInt(500, 1500));
  await request('GET', '/api/products?category=electronics');
  await DELAY(randInt(300, 800));

  // Compra 1 o 2 productos
  const p1 = rand(PRODUCTS);
  const p2 = rand(PRODUCTS);
  const items = Math.random() > 0.4
    ? [{ productId: p1.id, quantity: 1 }, { productId: p2.id, quantity: 1 }]
    : [{ productId: p1.id, quantity: randInt(1,2) }];

  const order = await request('POST', '/api/orders', {
    items,
    shippingAddress: {
      street: rand(['Calle Gran Vía 28', 'Av. Diagonal 100', 'Calle Serrano 45', 'Paseo de Gracia 10']),
      city:       rand(['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Bilbao']),
      postalCode: rand(['28013', '08001', '46001', '41001', '48001']),
      country: 'ES',
    },
    paymentMethod: rand(['card', 'paypal', 'transfer']),
  }, token);

  if (order.status === 201) {
    const rev = items.reduce((s, i) => {
      const p = PRODUCTS.find(x => x.id === i.productId);
      return s + (p ? p.price * i.quantity : 0);
    }, 0);
    totalOrders++;
    totalRevenue += rev;
  }

  await DELAY(randInt(200, 600));
  await request('POST', '/api/auth/logout', { refreshToken: login.body.refreshToken });
}

// Usuario que abandona el carrito
async function userAbandons() {
  const user  = rand(SEED_USERS);
  const login = await request('POST', '/api/auth/login', { username: user.username, password: user.password });
  if (login.status !== 200) return;

  await request('GET', '/api/products');
  await DELAY(randInt(800, 2000));
  await request('GET', '/api/products?category=audio');
  await DELAY(randInt(500, 1000));
  // Se va sin comprar
  await request('POST', '/api/cart/abandon');
  await request('POST', '/api/auth/logout', { refreshToken: login.body.refreshToken });
  totalAbandons++;
}

// Visita pública sin login
async function userBrowses() {
  await request('GET', '/api/products');
  await DELAY(randInt(200, 500));
  await request('GET', '/api/products?sort=price_asc');
  await DELAY(randInt(100, 300));
  await request('GET', '/health');
}

// Error de validación ocasional (realismo)
async function generateValidationError() {
  await request('POST', '/api/auth/login', { username: '', password: '' });
}

// Ciclo normal — pocos usuarios, ritmo tranquilo
async function quietCycle() {
  const tasks = [];
  const n = randInt(1, 3);
  for (let i = 0; i < n; i++) {
    const r = Math.random();
    if (r < 0.6)      tasks.push(userBuys());
    else if (r < 0.8) tasks.push(userAbandons());
    else               tasks.push(userBrowses());
  }
  if (Math.random() < 0.2) tasks.push(generateValidationError());
  await Promise.allSettled(tasks);
}

// Ciclo pico — más usuarios, más actividad
async function peakCycle() {
  const tasks = [];
  const n = randInt(4, 7);
  for (let i = 0; i < n; i++) {
    const r = Math.random();
    if (r < 0.7)      tasks.push(userBuys());
    else if (r < 0.85) tasks.push(userAbandons());
    else               tasks.push(userBrowses());
  }
  tasks.push(generateValidationError());
  await Promise.allSettled(tasks);
}

// Imprimir stats cada 10 ciclos
function printStats() {
  const elapsed = Math.floor((Date.now() - startTime) / 60000);
  console.log('\n' + '─'.repeat(55));
  console.log(`  ⏱️  Tiempo corriendo: ${elapsed} minutos`);
  console.log(`  📦  Pedidos totales:  ${totalOrders}`);
  console.log(`  💰  Revenue total:    €${totalRevenue.toFixed(2)}`);
  console.log(`  👥  Sesiones totales: ${totalSessions}`);
  console.log(`  🛒  Carritos abandon: ${totalAbandons}`);
  console.log('─'.repeat(55) + '\n');
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║     BACKGROUND TRAFFIC — Li Tahi+ Ecommerce         ║');
  console.log('║     Tráfico realista de fondo — toda la noche       ║');
  console.log('║     Ctrl+C para parar                               ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  while (true) {
    cycle++;

    // Cada 8 ciclos hay un pico de actividad (simula hora punta)
    const isPeak = cycle % 8 === 0;

    if (isPeak) {
      log('🔥', `CICLO ${cycle} — PICO DE ACTIVIDAD`);
      await peakCycle();
    } else {
      log('🔄', `Ciclo ${cycle} — tráfico normal`);
      await quietCycle();
    }

    // Stats cada 10 ciclos
    if (cycle % 10 === 0) printStats();

    // Delay entre ciclos — varía para que no sea robótico
    // Ciclo normal: 8-15 segundos
    // Tras un pico: 20-30 segundos (se calma)
    const delay = isPeak
      ? randInt(20000, 30000)
      : randInt(8000, 15000);

    await DELAY(delay);
  }
}

main().catch(console.error);