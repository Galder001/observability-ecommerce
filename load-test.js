/**
 * load-test.js — Simulador de tráfico para demo en vivo
 * USO:
 *   node load-test.js normal     <- flujo limpio con pedido real
 *   node load-test.js attack     <- brute force (dispara alerta)
 *   node load-test.js sustained  <- tráfico continuo 5 minutos
 *   node load-test.js demo       <- secuencia completa presentación
 */

const http = require('http');

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

const SEED_USERS = [
  { username: 'bob',     password: 'Admin1234' },
  { username: 'carlos',  password: 'Admin1234' },
  { username: 'diana',   password: 'Admin1234' },
  { username: 'eduardo', password: 'Admin1234' },
];

const DELAY = (ms) => new Promise((r) => setTimeout(r, ms));
const rand  = (arr) => arr[Math.floor(Math.random() * arr.length)];
const log   = (e, m) => console.log(`${new Date().toISOString().slice(11,19)} ${e} ${m}`);

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
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(data), requestId: res.headers['x-request-id'] }); }
          catch { resolve({ status: res.statusCode, body: data, requestId: res.headers['x-request-id'] }); }
        });
      }
    );
    req.on('error', (e) => resolve({ status: 0, body: { error: e.message } }));
    if (payload) req.write(payload);
    req.end();
  });
}

// ─── FLUJO NORMAL CON USUARIO SEED ───────────────────────────────────────────
async function scenarioNormal(tag) {
  const user = rand(SEED_USERS);

  // 1. Browse productos
  await request('GET', '/api/products');
  await DELAY(200 + Math.random() * 300);

  // 2. Login con usuario seed existente
  const login = await request('POST', '/api/auth/login', {
    username: user.username,
    password: user.password,
  });
  if (login.status !== 200) {
    log('⚠️', `[${tag}] Login fallido para ${user.username}: ${login.status}`);
    return;
  }
  const token = login.body.accessToken;
  log('🔑', `[${tag}] Login OK → ${user.username}`);
  await DELAY(300);

  // 3. Pedido con 2 productos aleatorios
  const p1  = rand(PRODUCTS);
  const p2  = rand(PRODUCTS);
  const q1  = Math.ceil(Math.random() * 2);
  const q2  = Math.ceil(Math.random() * 2);

  const order = await request('POST', '/api/orders', {
    items: [
      { productId: p1.id, quantity: q1 },
      { productId: p2.id, quantity: q2 },
    ],
    shippingAddress: {
      street: 'Calle Gran Vía 28',
      city: 'Madrid',
      postalCode: '28013',
      country: 'ES',
    },
    paymentMethod: 'card',
  }, token);

  if (order.status === 201) {
    const revenue = (p1.price * q1) + (p2.price * q2);
    log('📦', `[${tag}] Pedido OK — ${p1.name} + ${p2.name} = €${revenue.toFixed(2)}`);
  } else {
    log('❌', `[${tag}] Pedido fallido: ${JSON.stringify(order.body).slice(0, 80)}`);
  }
  await DELAY(200);

  // 4. Logout
  await request('POST', '/api/auth/logout', { refreshToken: login.body.refreshToken });
  log('👋', `[${tag}] Logout ${user.username}`);
}

// ─── ATAQUE BRUTE FORCE ───────────────────────────────────────────────────────
async function scenarioAttack() {
  log('🚨', '=== ATAQUE BRUTE FORCE — dispara alerta en Grafana ===');
  let lastRequestId = null;

  for (let i = 1; i <= 12; i++) {
    const res = await request('POST', '/api/auth/login', {
      username: 'alice',
      password: `wrong_${i}`,
    });
    lastRequestId = res.requestId;
    if (res.status === 429) {
      log('🛑', `Intento ${i}/12 BLOQUEADO por rate limiter`);
    } else {
      log('❌', `Intento ${i}/12 credenciales inválidas`);
    }
    await DELAY(600);
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log('  COPIA ESTE requestId para Kibana:');
  console.log(`  ${lastRequestId}`);
  console.log(`  Kibana: fields.requestId : "${lastRequestId}"`);
  console.log('═══════════════════════════════════════════════════\n');
}

// ─── TRÁFICO SOSTENIDO ────────────────────────────────────────────────────────
async function scenarioSustained(durationMs = 5 * 60 * 1000) {
  log('🔄', `Tráfico sostenido ${durationMs / 1000}s — Ctrl+C para parar`);
  const end = Date.now() + durationMs;
  let cycle = 0;

  while (Date.now() < end) {
    cycle++;
    await Promise.allSettled([
      scenarioNormal(`C${cycle}_A`),
      scenarioNormal(`C${cycle}_B`),
      scenarioNormal(`C${cycle}_C`),
      request('GET', '/api/products'),
      request('GET', '/health'),
      request('GET', '/api/orders/stats'),
    ]);
    log('⏱️', `Ciclo ${cycle} — ${Math.round((end - Date.now()) / 1000)}s restantes`);
    await DELAY(3000);
  }
  log('✅', 'Tráfico sostenido completado');
}

// ─── DEMO COMPLETA ────────────────────────────────────────────────────────────
async function scenarioDemo() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   MODO DEMO — SECUENCIA PRESENTACIÓN   ║');
  console.log('╚════════════════════════════════════════╝\n');

  log('📖', 'FASE 1: 5 usuarios hacen pedidos reales');
  await Promise.allSettled([
    scenarioNormal('demo_1'),
    scenarioNormal('demo_2'),
    scenarioNormal('demo_3'),
    scenarioNormal('demo_4'),
    scenarioNormal('demo_5'),
  ]);
  await DELAY(2000);

  log('⚔️', 'FASE 2: Ataque brute force — mira Grafana');
  await scenarioAttack();
  await DELAY(3000);

  log('🔄', 'FASE 3: Sistema se recupera');
  await Promise.allSettled([
    scenarioNormal('recovery_1'),
    scenarioNormal('recovery_2'),
    scenarioNormal('recovery_3'),
  ]);

  console.log('\n╔════════════════════════════════════════╗');
  console.log('║        DEMO COMPLETADA ✅               ║');
  console.log('║  Revisa Grafana y Kibana ahora         ║');
  console.log('╚════════════════════════════════════════╝\n');
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
const scenario = process.argv[2] || 'demo';
(async () => {
  console.log(`\n🚀 Escenario: ${scenario.toUpperCase()}\n`);
  switch (scenario) {
    case 'normal':    await scenarioNormal('manual'); break;
    case 'attack':    await scenarioAttack(); break;
    case 'sustained': await scenarioSustained(5 * 60 * 1000); break;
    case 'demo':      await scenarioDemo(); break;
    default: console.log('Uso: node load-test.js [normal|attack|sustained|demo]');
  }
})();