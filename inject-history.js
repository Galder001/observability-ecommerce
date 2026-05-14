/**
 * inject-history.js — 30 días de historial orgánico realista
 *
 * Patrón real de una web que crece:
 * - Días a 0 (servidor caído, festivo, sin tráfico)
 * - Rachas de actividad irregular
 * - Crecimiento no lineal con altibajos
 * - Picos por campañas/ofertas
 * - Nuevos usuarios registrándose gradualmente
 * - Carritos abandonados realistas
 *
 * USO: node inject-history.js
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

// ─── PATRÓN ORGÁNICO DE 30 DÍAS ───────────────────────────────────────────────
// Cada número = pedidos ese día. 0 = sin actividad.
// Semana 1: arranque lento, días muertos
// Semana 2: empieza a coger ritmo
// Semana 3: campaña el día 18, pico fuerte
// Semana 4: consolidación con altibajos
// Últimos días: actividad alta sostenida
const DAILY_ORDERS = [
  // día 1-7: arranque tímido
  2, 0, 1, 3, 0, 1, 0,
  // día 8-14: coge algo de ritmo
  4, 2, 0, 3, 5, 1, 2,
  // día 15-21: campaña el 18, pico real
  3, 4, 1, 14, 8, 2, 0,
  // día 22-28: consolidación irregular
  5, 3, 7, 2, 6, 4, 1,
  // día 29-30: últimos dos días fuertes
  9, 11,
];

// Nuevos usuarios por día (algunos días nadie se registra)
const DAILY_REGISTRATIONS = [
  1, 0, 0, 1, 0, 0, 0,
  2, 0, 1, 0, 1, 0, 1,
  1, 1, 0, 3, 2, 0, 0,
  1, 2, 1, 0, 2, 1, 0,
  2, 3,
];

// Carritos abandonados por día
const DAILY_ABANDONS = [
  1, 0, 1, 2, 0, 1, 0,
  2, 1, 0, 1, 3, 0, 1,
  2, 1, 1, 5, 3, 1, 0,
  2, 1, 3, 1, 2, 2, 1,
  4, 5,
];

const DELAY = (ms) => new Promise(r => setTimeout(r, ms));
const rand  = (arr) => arr[Math.floor(Math.random() * arr.length)];

function request(method, path, body = null, token = null) {
  return new Promise((resolve) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);
    const req = http.request(
      { hostname: 'localhost', port: 3000, path, method, headers },
      (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
          catch { resolve({ status: res.statusCode, body: data }); }
        });
      }
    );
    req.on('error', () => resolve({ status: 0, body: {} }));
    if (payload) req.write(payload);
    req.end();
  });
}

function log(emoji, msg) {
  console.log(`${new Date().toISOString().slice(11,19)} ${emoji}  ${msg}`);
}

// Hace un pedido real con usuario seed
async function makeOrder() {
  const user = rand(SEED_USERS);
  const login = await request('POST', '/api/auth/login', {
    username: user.username,
    password: user.password,
  });
  if (login.status !== 200) return 0;

  const token = login.body.accessToken;
  const p1 = rand(PRODUCTS);
  const p2 = rand(PRODUCTS);

  const order = await request('POST', '/api/orders', {
    items: [
      { productId: p1.id, quantity: 1 },
      { productId: p2.id, quantity: 1 },
    ],
    shippingAddress: {
      street: rand(['Calle Gran Vía 28', 'Av. Diagonal 100', 'Calle Serrano 45']),
      city: rand(['Madrid', 'Barcelona', 'Valencia', 'Sevilla']),
      postalCode: rand(['28013', '08001', '46001', '41001']),
      country: 'ES',
    },
    paymentMethod: rand(['card', 'paypal', 'transfer']),
  }, token);

  await request('POST', '/api/auth/logout', { refreshToken: login.body.refreshToken });

  if (order.status === 201) {
    return p1.price + p2.price;
  }
  return 0;
}

// Registra un usuario nuevo
async function makeRegistration(dayIndex, userIndex) {
  const username = `user_d${dayIndex}_${userIndex}_${Date.now()}`;
  await request('POST', '/api/auth/register', {
    username,
    email: `${username}@demo.com`,
    password: 'Demo1234',
  });
}

// Simula carrito abandonado (browse sin comprar)
async function makeAbandonment() {
  await request('GET', '/api/products');
  await DELAY(100);
  await request('GET', '/api/products?category=electronics');
  // No hace pedido — abandona
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║     INYECTANDO 30 DÍAS DE HISTORIAL ORGÁNICO         ║');
  console.log('║     Patrón real: altibajos, ceros, picos, crecer     ║');
  console.log('║     Tarda ~4 minutos — no cierres el terminal        ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  let totalRevenue = 0;
  let totalOrders  = 0;
  let totalUsers   = 0;
  let totalAbandons = 0;

  for (let i = 0; i < 30; i++) {
    const dayNum     = i + 1;
    const orders     = DAILY_ORDERS[i];
    const regs       = DAILY_REGISTRATIONS[i];
    const abandons   = DAILY_ABANDONS[i];
    const daysAgo    = 30 - i;

    // Día sin actividad
    if (orders === 0 && regs === 0) {
      log('💤', `Día ${dayNum} (hace ${daysAgo}d) — sin actividad`);
      await DELAY(100);
      continue;
    }

    let dayRevenue = 0;

    // Pedidos del día
    for (let j = 0; j < orders; j++) {
      const rev = await makeOrder();
      dayRevenue += rev;
      totalOrders++;
      await DELAY(80);
    }

    // Registros del día
    for (let j = 0; j < regs; j++) {
      await makeRegistration(dayNum, j);
      totalUsers++;
      await DELAY(50);
    }

    // Carritos abandonados
    for (let j = 0; j < abandons; j++) {
      await makeAbandonment();
      totalAbandons++;
      await DELAY(30);
    }

    totalRevenue += dayRevenue;

    const bar = '█'.repeat(Math.min(orders, 15));
    const tag  = orders >= 10 ? ' 🔥' : orders === 0 ? '' : '';
    log(
      orders > 8 ? '🚀' : orders > 4 ? '📈' : orders > 0 ? '📦' : '💤',
      `Día ${String(dayNum).padStart(2,'0')} (hace ${String(daysAgo).padStart(2,'0')}d) — ${String(orders).padStart(2,' ')} pedidos ${bar}${tag}  +${regs} usuarios  €${dayRevenue.toFixed(0)}`
    );

    await DELAY(150);
  }

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║                HISTORIAL COMPLETADO ✅               ║');
  console.log(`║  📦 ${totalOrders} pedidos totales`);
  console.log(`║  💰 €${Math.round(totalRevenue).toLocaleString()} revenue acumulado`);
  console.log(`║  👤 ${totalUsers} nuevos usuarios registrados`);
  console.log(`║  🛒 ${totalAbandons} carritos abandonados`);
  console.log('║                                                      ║');
  console.log('║  Ahora en Grafana:                                   ║');
  console.log('║  → Cambia "Last 1 hour" a "Last 30 days"             ║');
  console.log('║  → Verás el patrón orgánico real de crecimiento      ║');
  console.log('║  → Pico visible el día 18 (campaña)                  ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');
}

main().catch(console.error);