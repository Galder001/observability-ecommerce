const http = require('http');

const BASE_URL = 'localhost';
const PORT = 3000;

const endpoints = [
  '/api/products',
  '/api/users',
  '/api/orders',
  '/health',
  '/api/products?category=electronics',
  '/api/products?sortBy=price_asc',
  '/api/products?sortBy=rating',
  '/api/products?search=laptop',
  '/api/products?minPrice=50&maxPrice=500',
  '/api/users?role=customer',
  '/api/products/id-invalido-404',
  '/ruta-que-no-existe',
  '/api/products/slow',
];

function makeRequest(path) {
  return new Promise((resolve) => {
    const req = http.get({ host: BASE_URL, port: PORT, path }, (res) => {
      res.resume();
      res.on('end', () => resolve(res.statusCode));
    });
    req.on('error', () => resolve(0));
  });
}

async function runLoadTest() {
  console.log('🚀 Iniciando load test avanzado...');
  let count = 0;
  let errors = 0;

  while (true) {
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    const status = await makeRequest(endpoint);
    count++;
    if (status >= 400) errors++;
    if (count % 20 === 0) {
      console.log(`✅ ${count} peticiones | Errores: ${errors} | Último: ${endpoint} → ${status}`);
    }
    await new Promise(r => setTimeout(r, 300));
  }
}

runLoadTest();