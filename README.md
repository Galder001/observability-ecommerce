# 🔭 Observability Ecommerce

<div align="center">

### Plataforma de Observabilidad Full-Stack para APIs de E-Commerce

*Monitoreo en tiempo real · Logs estructurados · Métricas avanzadas · Dashboards interactivos*

---

![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Prometheus](https://img.shields.io/badge/Prometheus-2.x-E6522C?style=for-the-badge&logo=prometheus&logoColor=white)
![Grafana](https://img.shields.io/badge/Grafana-10.x-F46800?style=for-the-badge&logo=grafana&logoColor=white)
![Elasticsearch](https://img.shields.io/badge/Elasticsearch-8.x-005571?style=for-the-badge&logo=elasticsearch&logoColor=white)
![Kibana](https://img.shields.io/badge/Kibana-8.x-005571?style=for-the-badge&logo=kibana&logoColor=white)

---

> **Proyecto universitario** que implementa los tres pilares de la observabilidad moderna —  
> **Logs · Métricas · Trazas** — sobre una API REST de e-commerce completamente contenedorizada.

</div>

---

## 📋 Tabla de Contenidos

- [¿Qué es la Observabilidad?](#-qué-es-la-observabilidad)
- [Arquitectura del Sistema](#-arquitectura-del-sistema)
- [Stack Tecnológico](#-stack-tecnológico)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Requisitos Previos](#-requisitos-previos)
- [Instalación y Puesta en Marcha](#-instalación-y-puesta-en-marcha)
- [Servicios y URLs](#-servicios-y-urls)
- [API REST — Endpoints](#-api-rest--endpoints)
- [Métricas de Prometheus](#-métricas-de-prometheus)
- [Dashboards de Grafana](#-dashboards-de-grafana)
- [Búsqueda de Logs en Kibana](#-búsqueda-de-logs-en-kibana)
- [Load Testing](#-load-testing)
- [Decisiones Técnicas](#-decisiones-técnicas)
- [Conceptos Clave](#-conceptos-clave)
- [Contribuir](#-contribuir)

---

## 🔍 ¿Qué es la Observabilidad?

La **observabilidad** es la capacidad de comprender el estado interno de un sistema a partir de los datos que genera externamente. A diferencia del simple monitoreo (que responde a *"¿está funcionando?"*), la observabilidad responde a *"¿por qué no está funcionando?"*.

Se sustenta sobre **tres pilares fundamentales**:

| Pilar | Descripción | Herramienta en este proyecto |
|-------|-------------|------------------------------|
| 📄 **Logs** | Registro cronológico de eventos del sistema | Winston + Elasticsearch + Kibana |
| 📊 **Métricas** | Mediciones numéricas en el tiempo (latencia, throughput, errores) | prom-client + Prometheus + Grafana |
| 🔗 **Trazas** | Seguimiento del flujo de una petición a través de los servicios | Correlation IDs en headers HTTP |

> *"You can't improve what you can't measure"* — Peter Drucker

---

## 🏗️ Arquitectura del Sistema

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                     OBSERVABILITY ECOMMERCE — ARQUITECTURA                   ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║   ┌─────────────┐    HTTP     ┌─────────────────────────────────────────┐   ║
║   │   Cliente   │ ─────────▶ │         API REST (Node.js + Express)     │   ║
║   │  (curl /    │            │                                           │   ║
║   │  k6 / app)  │ ◀───────── │  ┌──────────┐  ┌────────┐  ┌─────────┐  │   ║
║   └─────────────┘   JSON     │  │  Routes  │  │Middlew.│  │Services │  │   ║
║                              │  │/products │  │ auth   │  │business │  │   ║
║                              │  │/orders   │  │ logger │  │ logic   │  │   ║
║                              │  │/users    │  │metrics │  │         │  │   ║
║                              │  └──────────┘  └────────┘  └─────────┘  │   ║
║                              │         │              │                  │   ║
║                              └─────────┼──────────────┼──────────────────┘  ║
║                                        │              │                      ║
║          ┌─────────────────────────────┼──────────────┼──────────────┐       ║
║          │           CAPA DE OBSERVABILIDAD            │              │       ║
║          │                             │              │              │       ║
║          │    LOGS                     ▼              ▼   MÉTRICAS   │       ║
║          │  ┌──────────┐        ┌──────────┐   ┌──────────────────┐  │       ║
║          │  │ Winston  │        │  Winston │   │   prom-client    │  │       ║
║          │  │ (stdout) │        │  Elastic │   │  /metrics HTTP   │  │       ║
║          │  │  logger  │        │Transport │   │  endpoint        │  │       ║
║          │  └────┬─────┘        └────┬─────┘   └────────┬─────────┘  │       ║
║          │       │                   │                   │            │       ║
║          └───────┼───────────────────┼───────────────────┼────────────┘       ║
║                  │                   │                   │                    ║
║         ┌────────▼──────┐   ┌────────▼──────┐   ┌────────▼──────┐           ║
║         │   Docker      │   │Elasticsearch  │   │  Prometheus   │           ║
║         │   Logs        │   │   :9200       │   │    :9090      │           ║
║         │ (JSON format) │   │               │   │  (scraping    │           ║
║         └───────────────┘   └───────┬───────┘   │  cada 15s)    │           ║
║                                     │           └───────┬───────┘           ║
║                                     │                   │                    ║
║                              ┌──────▼──────┐   ┌────────▼──────┐           ║
║                              │   Kibana    │   │   Grafana     │           ║
║                              │    :5601    │   │    :3001      │           ║
║                              │ (búsqueda,  │   │ (dashboards,  │           ║
║                              │  alertas,   │   │  alertas,     │           ║
║                              │  discover)  │   │  alerting)    │           ║
║                              └─────────────┘   └───────────────┘           ║
║                                                                              ║
║   ┌──────────────────────────────────────────────────────────────────────┐   ║
║   │                      INFRAESTRUCTURA DOCKER                          │   ║
║   │                                                                      │   ║
║   │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────────┐    │   ║
║   │  │ ecommerce │  │  elastic  │  │ prometheus│  │    grafana    │    │   ║
║   │  │   _api    │  │  search   │  │           │  │               │    │   ║
║   │  │           │  │           │  │           │  │               │    │   ║
║   │  │ Port:3000 │  │ Port:9200 │  │ Port:9090 │  │  Port: 3001   │    │   ║
║   │  └───────────┘  └───────────┘  └───────────┘  └───────────────┘    │   ║
║   │                                                                      │   ║
║   │  ┌───────────┐  ┌───────────┐                                       │   ║
║   │  │  kibana   │  │ cAdvisor  │   ← Monitorea recursos de contenedores │   ║
║   │  │           │  │           │                                       │   ║
║   │  │ Port:5601 │  │ Port:8080 │                                       │   ║
║   │  └───────────┘  └───────────┘                                       │   ║
║   │                                                                      │   ║
║   │              Red Docker: observability_network                       │   ║
║   └──────────────────────────────────────────────────────────────────────┘   ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### Flujo de datos

```
Petición HTTP
     │
     ▼
[Middleware: requestLogger]  ──────────▶  Log estructurado (Winston)
     │                                         │
     ▼                                         ▼
[Middleware: metricsMiddleware]          Elasticsearch
     │                                   (índice: ecommerce-logs-*)
     ▼
[Route Handler]
     │
     ├──▶ Incrementa counter http_requests_total
     ├──▶ Observa histogram http_request_duration_seconds
     └──▶ Respuesta JSON al cliente
                                    Prometheus scrapes /metrics cada 15s
                                         │
                                         ▼
                                      Grafana
                                  (visualización)
```

---

## 🛠️ Stack Tecnológico

### Backend — API REST

| Tecnología | Versión | Rol |
|------------|---------|-----|
| **Node.js** | 22.x LTS | Runtime de JavaScript del servidor |
| **Express** | 4.x | Framework web minimalista y flexible |
| **Winston** | 3.x | Librería de logging estructurado (JSON) |
| **winston-elasticsearch** | 0.x | Transport de Winston hacia Elasticsearch |
| **prom-client** | 15.x | Cliente oficial de Prometheus para Node.js |
| **uuid** | 9.x | Generación de correlation IDs únicos |
| **express-validator** | 7.x | Validación de entradas en endpoints |

### Observabilidad e Infraestructura

| Tecnología | Versión | Rol |
|------------|---------|-----|
| **Prometheus** | 2.x | Base de datos de series temporales para métricas |
| **Grafana** | 10.x | Visualización de métricas con dashboards |
| **Elasticsearch** | 8.x | Motor de búsqueda y almacén de logs |
| **Kibana** | 8.x | Visualización y análisis de logs |
| **cAdvisor** | latest | Métricas de contenedores Docker |
| **Docker** | 24.x | Contenedorización de servicios |
| **Docker Compose** | v2 | Orquestación del stack completo |

---

## 📁 Estructura del Proyecto

```
observability-ecommerce/
│
├── 📄 docker-compose.yml          # Orquestación completa del stack
├── 📄 README.md                   # Este archivo
│
├── 📂 api/                        # API REST de e-commerce
│   ├── 📄 Dockerfile
│   ├── 📄 package.json
│   ├── 📄 package-lock.json
│   │
│   └── 📂 src/
│       ├── 📄 app.js              # Punto de entrada de Express
│       │
│       ├── 📂 config/
│       │   ├── 📄 logger.js       # Configuración de Winston
│       │   └── 📄 metrics.js      # Registro de métricas Prometheus
│       │
│       ├── 📂 middleware/
│       │   ├── 📄 requestLogger.js    # Log de cada petición HTTP
│       │   ├── 📄 metricsMiddleware.js # Captura de métricas HTTP
│       │   └── 📄 errorHandler.js     # Manejo centralizado de errores
│       │
│       ├── 📂 routes/
│       │   ├── 📄 products.js     # CRUD de productos
│       │   ├── 📄 orders.js       # Gestión de pedidos
│       │   ├── 📄 users.js        # Gestión de usuarios
│       │   └── 📄 health.js       # Health checks
│       │
│       └── 📂 services/
│           ├── 📄 productService.js
│           ├── 📄 orderService.js
│           └── 📄 userService.js
│
├── 📂 prometheus/
│   └── 📄 prometheus.yml          # Configuración de scraping
│
├── 📂 grafana/
│   ├── 📂 provisioning/
│   │   ├── 📂 datasources/
│   │   │   └── 📄 prometheus.yml  # Datasource auto-provisionado
│   │   └── 📂 dashboards/
│   │       └── 📄 dashboards.yml  # Config de carga de dashboards
│   └── 📂 dashboards/
│       ├── 📄 api-overview.json   # Dashboard principal de la API
│       ├── 📄 business-kpis.json  # KPIs de negocio (ventas, pedidos)
│       └── 📄 infrastructure.json # Métricas de infraestructura
│
├── 📂 elasticsearch/
│   └── 📄 elasticsearch.yml       # Configuración del cluster
│
├── 📂 kibana/
│   └── 📄 kibana.yml              # Configuración de Kibana
│
└── 📂 load-test/
    ├── 📄 k6-script.js            # Script de carga con k6
    └── 📄 run-test.sh             # Shell script de ejecución
```

---

## ✅ Requisitos Previos

Asegúrate de tener instaladas las siguientes herramientas antes de continuar:

| Herramienta | Versión mínima | Verificación |
|-------------|---------------|--------------|
| **Docker** | 24.0+ | `docker --version` |
| **Docker Compose** | v2.20+ | `docker compose version` |
| **Git** | 2.x | `git --version` |
| **curl** | cualquiera | `curl --version` |
| **k6** *(opcional)* | 0.50+ | `k6 version` |

> ⚠️ **Memoria RAM mínima recomendada: 8 GB**  
> Elasticsearch requiere al menos 2 GB de heap. Con menos de 4 GB disponibles para Docker, el stack puede no levantarse correctamente.

### Configuración de memoria para Elasticsearch (Linux/WSL2)

```bash
# Aumentar el límite de memoria virtual (requerido por Elasticsearch)
sudo sysctl -w vm.max_map_count=262144

# Para que persista entre reinicios:
echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf
```

---

## 🚀 Instalación y Puesta en Marcha

### Paso 1 — Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/observability-ecommerce.git
cd observability-ecommerce
```

### Paso 2 — Revisar variables de entorno

```bash
# El proyecto usa valores por defecto que funcionan out-of-the-box
# Para personalizarlos, copia el archivo de ejemplo:
cp .env.example .env

# Edita según necesidad (opcional para desarrollo local):
nano .env
```

```env
# .env.example
NODE_ENV=development
API_PORT=3000
LOG_LEVEL=info

ELASTICSEARCH_URL=http://elasticsearch:9200
ELASTICSEARCH_INDEX=ecommerce-logs

PROMETHEUS_PORT=9090
GRAFANA_PORT=3001
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=admin123

KIBANA_PORT=5601
```

### Paso 3 — Levantar el stack completo

```bash
# Construir imágenes y levantar todos los servicios en segundo plano
docker compose up --build -d

# Verificar que todos los contenedores están corriendo
docker compose ps
```

**Salida esperada:**

```
NAME                          STATUS          PORTS
ecommerce-api                 Up 30s          0.0.0.0:3000->3000/tcp
elasticsearch                 Up 25s          0.0.0.0:9200->9200/tcp
kibana                        Up 20s          0.0.0.0:5601->5601/tcp
prometheus                    Up 30s          0.0.0.0:9090->9090/tcp
grafana                       Up 30s          0.0.0.0:3001->3001/tcp
cadvisor                      Up 30s          0.0.0.0:8080->8080/tcp
```

### Paso 4 — Verificar el health del sistema

```bash
# Comprobar la API
curl http://localhost:3000/health

# Comprobar Elasticsearch
curl http://localhost:9200/_cluster/health?pretty

# Comprobar que Prometheus recibe métricas
curl http://localhost:3000/metrics | head -20
```

### Paso 5 — Esperar inicialización de Elasticsearch y Kibana

```bash
# Elasticsearch tarda ~60s en estar listo. Monitorea los logs:
docker compose logs -f elasticsearch

# Espera hasta ver: "Cluster health status changed from [RED] to [GREEN]"
# O simplemente:
until curl -s http://localhost:9200/_cluster/health | grep -q '"status":"green"'; do
  echo "Esperando Elasticsearch..." && sleep 5
done
echo "✅ Elasticsearch listo"
```

### Paso 6 — Generar tráfico de prueba

```bash
# Genera algunas peticiones para ver logs y métricas:
bash load-test/run-test.sh basic

# O manualmente:
for i in {1..20}; do
  curl -s http://localhost:3000/api/products > /dev/null
  curl -s http://localhost:3000/api/orders > /dev/null
  echo "Petición $i enviada"
done
```

---

## 🌐 Servicios y URLs

Una vez levantado el stack, todos los servicios están disponibles en:

| Servicio | URL | Usuario | Contraseña | Descripción |
|----------|-----|---------|------------|-------------|
| 🟢 **API REST** | http://localhost:3000 | — | — | API de e-commerce |
| 📊 **Grafana** | http://localhost:3001 | `admin` | `admin123` | Dashboards de métricas |
| 🔥 **Prometheus** | http://localhost:9090 | — | — | UI de consultas PromQL |
| 📋 **Kibana** | http://localhost:5601 | `elastic` | `changeme` | Exploración de logs |
| 🔍 **Elasticsearch** | http://localhost:9200 | `elastic` | `changeme` | API del motor de búsqueda |
| 🐳 **cAdvisor** | http://localhost:8080 | — | — | Métricas de contenedores |

> 💡 **Tip:** En un primer acceso a Kibana, el sistema te pedirá crear un index pattern. Usa `ecommerce-logs-*` y selecciona `@timestamp` como campo de tiempo.

---

## 🔌 API REST — Endpoints

### Base URL: `http://localhost:3000`

---

### 🏥 Health & Métricas

#### `GET /health`
Estado de salud de la aplicación y sus dependencias.

```bash
curl -X GET http://localhost:3000/health
```

```json
{
  "status": "healthy",
  "timestamp": "2024-11-15T10:30:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "dependencies": {
    "elasticsearch": "connected",
    "memory": {
      "used": "45MB",
      "total": "512MB"
    }
  }
}
```

#### `GET /metrics`
Endpoint de métricas en formato Prometheus (Scraped por Prometheus automáticamente).

```bash
curl http://localhost:3000/metrics
```

```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/api/products",status_code="200"} 142
http_requests_total{method="POST",route="/api/orders",status_code="201"} 28
...
```

---

### 📦 Productos

#### `GET /api/products`
Obtener todos los productos con soporte de paginación.

```bash
curl "http://localhost:3000/api/products?page=1&limit=10&category=electronics"
```

```json
{
  "data": [
    {
      "id": "prod-001",
      "name": "Laptop Pro 15",
      "category": "electronics",
      "price": 1299.99,
      "stock": 42,
      "createdAt": "2024-01-15T09:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "pages": 15
  }
}
```

#### `GET /api/products/:id`
Obtener un producto específico por ID.

```bash
curl http://localhost:3000/api/products/prod-001
```

#### `POST /api/products`
Crear un nuevo producto.

```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Wireless Headphones",
    "category": "electronics",
    "price": 89.99,
    "stock": 100,
    "description": "Premium noise-cancelling headphones"
  }'
```

#### `PUT /api/products/:id`
Actualizar un producto existente.

```bash
curl -X PUT http://localhost:3000/api/products/prod-001 \
  -H "Content-Type: application/json" \
  -d '{"price": 1199.99, "stock": 38}'
```

#### `DELETE /api/products/:id`
Eliminar un producto.

```bash
curl -X DELETE http://localhost:3000/api/products/prod-001
```

---

### 🛒 Pedidos

#### `GET /api/orders`
Listar todos los pedidos con filtros opcionales.

```bash
curl "http://localhost:3000/api/orders?status=pending&from=2024-01-01&to=2024-12-31"
```

```json
{
  "data": [
    {
      "id": "ord-00123",
      "userId": "usr-456",
      "status": "pending",
      "items": [
        { "productId": "prod-001", "quantity": 2, "unitPrice": 1299.99 }
      ],
      "total": 2599.98,
      "createdAt": "2024-11-14T14:22:00.000Z"
    }
  ],
  "summary": {
    "total": 47,
    "pending": 12,
    "completed": 30,
    "cancelled": 5
  }
}
```

#### `POST /api/orders`
Crear un nuevo pedido.

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "usr-456",
    "items": [
      { "productId": "prod-001", "quantity": 1 },
      { "productId": "prod-007", "quantity": 3 }
    ],
    "shippingAddress": {
      "street": "Calle Gran Vía 28",
      "city": "Madrid",
      "postalCode": "28013",
      "country": "ES"
    }
  }'
```

#### `PATCH /api/orders/:id/status`
Actualizar el estado de un pedido.

```bash
# Estados válidos: pending | processing | shipped | delivered | cancelled
curl -X PATCH http://localhost:3000/api/orders/ord-00123/status \
  -H "Content-Type: application/json" \
  -d '{"status": "shipped", "trackingNumber": "ES123456789ES"}'
```

---

### 👤 Usuarios

#### `GET /api/users/:id`
Obtener información de un usuario.

```bash
curl http://localhost:3000/api/users/usr-456
```

#### `POST /api/users`
Registrar un nuevo usuario.

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "maria.garcia@example.com",
    "name": "María García",
    "role": "customer"
  }'
```

---

### Códigos de Respuesta HTTP

| Código | Significado | Cuándo ocurre |
|--------|-------------|---------------|
| `200` | OK | Lectura exitosa |
| `201` | Created | Recurso creado correctamente |
| `400` | Bad Request | Validación fallida / datos inválidos |
| `404` | Not Found | Recurso no encontrado |
| `409` | Conflict | Recurso ya existe / stock insuficiente |
| `500` | Internal Server Error | Error no controlado del servidor |

---

## 📈 Métricas de Prometheus

Todas las métricas son expuestas en `GET /metrics` y recogidas por Prometheus cada 15 segundos.

### Métricas HTTP (Instrumentación personalizada)

#### `http_requests_total` — Counter

Cuenta el número total de peticiones HTTP procesadas.

**Labels:** `method`, `route`, `status_code`

```promql
# Tasa de peticiones por segundo (últimos 5 min)
rate(http_requests_total[5m])

# Porcentaje de errores 5xx
sum(rate(http_requests_total{status_code=~"5.."}[5m])) /
sum(rate(http_requests_total[5m])) * 100

# Top 5 endpoints más llamados
topk(5, sum by(route) (rate(http_requests_total[5m])))
```

---

#### `http_request_duration_seconds` — Histogram

Distribución de latencias de respuesta agrupadas en buckets.

**Buckets:** 0.005s, 0.01s, 0.025s, 0.05s, 0.1s, 0.25s, 0.5s, 1s, 2.5s, 5s, 10s  
**Labels:** `method`, `route`

```promql
# Percentil 99 de latencia (últimos 5 min)
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))

# Percentil 95 por endpoint
histogram_quantile(0.95,
  sum by (route, le) (rate(http_request_duration_seconds_bucket[5m]))
)

# Latencia media
rate(http_request_duration_seconds_sum[5m]) /
rate(http_request_duration_seconds_count[5m])
```

---

#### `active_connections` — Gauge

Número de conexiones HTTP activas en un instante dado.

```promql
# Valor actual de conexiones activas
active_connections

# Evolución en el tiempo
active_connections[30m]
```

---

### Métricas de Negocio

#### `orders_created_total` — Counter

Total de pedidos creados, desglosado por estado inicial.

```promql
# Pedidos creados por minuto
rate(orders_created_total[1m]) * 60

# Total de pedidos agrupados por estado
sum by(status) (orders_created_total)
```

#### `order_value_euros` — Histogram

Distribución del valor monetario de los pedidos.

```promql
# Valor medio de pedido
rate(order_value_euros_sum[1h]) / rate(order_value_euros_count[1h])

# Percentil 90 del valor de pedido
histogram_quantile(0.9, rate(order_value_euros_bucket[1h]))
```

#### `products_out_of_stock` — Gauge

Número de productos con stock igual a cero.

```promql
# Alerta si más de 5 productos sin stock
products_out_of_stock > 5
```

---

### Métricas del Runtime de Node.js (automáticas vía prom-client)

| Métrica | Tipo | Descripción |
|---------|------|-------------|
| `nodejs_heap_size_used_bytes` | Gauge | Memoria heap usada por el proceso |
| `nodejs_heap_size_total_bytes` | Gauge | Memoria heap total asignada |
| `nodejs_external_memory_bytes` | Gauge | Memoria externa (buffers, C++) |
| `nodejs_gc_duration_seconds` | Histogram | Duración de ciclos de Garbage Collection |
| `nodejs_eventloop_lag_seconds` | Gauge | Lag del event loop (indica bloqueos) |
| `process_cpu_seconds_total` | Counter | CPU consumida por el proceso |
| `process_open_fds` | Gauge | Descriptores de archivo abiertos |

---

## 📊 Dashboards de Grafana

Accede a Grafana en **http://localhost:3001** con `admin / admin123`.

Los dashboards están auto-provisionados al iniciar el stack. No es necesaria configuración manual.

---

### Dashboard 1 — API Overview

**Ruta:** Dashboards → Observability → API Overview

Paneles incluidos:

| Panel | Tipo | Consulta PromQL |
|-------|------|-----------------|
| **Requests per Second** | Graph | `rate(http_requests_total[1m])` |
| **Error Rate (%)** | Stat | `(sum(rate(http_requests_total{status_code=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))) * 100` |
| **P99 Latency** | Graph | `histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))` |
| **Active Connections** | Gauge | `active_connections` |
| **Status Code Distribution** | Pie chart | `sum by(status_code) (increase(http_requests_total[1h]))` |
| **Top Endpoints** | Bar chart | `topk(10, sum by(route) (rate(http_requests_total[5m])))` |

**Cómo usarlo:**

1. Abre el dropdown de tiempo (esquina superior derecha) y selecciona **Last 15 minutes**
2. Activa **Auto-refresh: 10s** para monitoreo en tiempo real
3. Haz clic en cualquier gráfico para ver el detalle de la consulta PromQL

---

### Dashboard 2 — Business KPIs

**Ruta:** Dashboards → Observability → Business KPIs

| Panel | Descripción |
|-------|-------------|
| **Orders / hour** | Pedidos procesados en la última hora |
| **Revenue (estimated)** | Valor total de pedidos del día |
| **Average Order Value** | Ticket medio de compra |
| **Conversion Funnel** | Visualización del embudo de conversión |
| **Products Out of Stock** | Alertas de inventario |

---

### Dashboard 3 — Infrastructure

**Ruta:** Dashboards → Observability → Infrastructure

Datos proporcionados por **cAdvisor**:

| Panel | Descripción |
|-------|-------------|
| **CPU Usage per Container** | % de CPU por cada servicio |
| **Memory Usage** | RAM consumida vs límite |
| **Network I/O** | Bytes entrantes y salientes por red |
| **Node.js Heap** | Evolución del heap de JavaScript |
| **GC Duration** | Tiempo empleado en Garbage Collection |
| **Event Loop Lag** | Latencia del event loop de Node.js |

---

### Configurar Alertas en Grafana

```
1. Abre cualquier panel y haz clic en Edit
2. Ve a la pestaña "Alert"
3. Crea una nueva Alert Rule:
   - Condition: WHEN last() OF query(A) IS ABOVE 0.05
   - Evaluate every: 1m, For: 5m
4. En "Notifications", añade un canal (email, Slack, webhook)
5. Guarda el dashboard
```

---

## 🪵 Búsqueda de Logs en Kibana

Accede a Kibana en **http://localhost:5601** con `elastic / changeme`.

### Primer acceso — Crear Index Pattern

```
1. Menú lateral → Stack Management → Index Patterns
2. Clic en "Create index pattern"
3. Name: ecommerce-logs-*
4. Timestamp field: @timestamp
5. Clic en "Create index pattern"
```

### Explorar logs en Discover

```
1. Menú lateral → Analytics → Discover
2. Selecciona el index pattern: ecommerce-logs-*
3. Ajusta el rango de tiempo (arriba a la derecha)
4. Usa KQL (Kibana Query Language) para filtrar
```

### Consultas KQL de ejemplo

```kql
# Todos los errores
level: "error"

# Errores 500 en los últimos 10 minutos
level: "error" AND http.statusCode: 500

# Peticiones lentas (más de 1 segundo)
http.responseTime > 1000

# Peticiones a un endpoint específico
http.url: "/api/orders" AND http.method: "POST"

# Correlation ID específico (trazar una petición completa)
correlationId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"

# Búsqueda de texto libre en el mensaje
message: "stock insuficiente" OR message: "out of stock"

# Combinando múltiples condiciones
level: "error" AND NOT http.statusCode: 404 AND @timestamp >= "2024-11-01"
```

### Estructura de un Log Estructurado

Cada evento generado por Winston tiene el siguiente formato JSON:

```json
{
  "@timestamp": "2024-11-15T10:35:42.123Z",
  "level": "info",
  "message": "HTTP Request completed",
  "correlationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "service": "ecommerce-api",
  "environment": "development",
  "version": "1.0.0",
  "http": {
    "method": "POST",
    "url": "/api/orders",
    "statusCode": 201,
    "responseTime": 145,
    "userAgent": "Mozilla/5.0...",
    "ip": "172.18.0.1"
  },
  "business": {
    "resource": "order",
    "action": "create",
    "orderId": "ord-00124",
    "userId": "usr-456",
    "orderValue": 259.98
  }
}
```

### Crear una visualización en Kibana

```
1. Menú lateral → Analytics → Visualize Library
2. Clic en "Create visualization"
3. Tipo: "Bar vertical stacked"
4. Data source: ecommerce-logs-*
5. Metrics: Count
6. Buckets: X-axis → Date Histogram → @timestamp → Auto
7. Split series: Terms → level (para ver errores vs info vs warn)
8. Clic en "Save"
```

---

## 🔥 Load Testing

El proyecto incluye scripts de carga para estresar la API y observar el comportamiento del sistema bajo presión.

### Opción A — Script básico con curl

```bash
# Ejecutar test de carga básico (incluido en el repositorio)
bash load-test/run-test.sh basic

# Opciones disponibles:
bash load-test/run-test.sh basic    # 50 req concurrentes durante 30s
bash load-test/run-test.sh heavy    # 200 req concurrentes durante 2 min
bash load-test/run-test.sh stress   # Rampa progresiva hasta 500 req
```

### Opción B — k6 (recomendado)

```bash
# Instalar k6 (si no está instalado)
# macOS: brew install k6
# Ubuntu: sudo apt install k6
# Windows: choco install k6

# Ejecutar el script completo
k6 run load-test/k6-script.js
```

```javascript
// load-test/k6-script.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },   // Ramp-up: 0 → 20 usuarios
    { duration: '1m',  target: 50 },   // Carga sostenida: 50 usuarios
    { duration: '30s', target: 100 },  // Pico: 100 usuarios
    { duration: '1m',  target: 50 },   // Reducción: 50 usuarios
    { duration: '30s', target: 0 },    // Ramp-down: 0 usuarios
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],   // 95% de peticiones bajo 500ms
    http_req_failed:   ['rate<0.05'],   // Menos del 5% de errores
  },
};

const BASE_URL = 'http://localhost:3000';

export default function () {
  // GET products (60% del tráfico)
  const productsRes = http.get(`${BASE_URL}/api/products`);
  check(productsRes, { 'products 200': (r) => r.status === 200 });

  // POST order (20% del tráfico)
  if (Math.random() < 0.2) {
    const orderPayload = JSON.stringify({
      userId: `usr-${Math.floor(Math.random() * 1000)}`,
      items: [{ productId: 'prod-001', quantity: 1 }],
    });
    const orderRes = http.post(`${BASE_URL}/api/orders`, orderPayload, {
      headers: { 'Content-Type': 'application/json' },
    });
    check(orderRes, { 'order created': (r) => r.status === 201 });
  }

  sleep(1);
}
```

### Observar el impacto en tiempo real

Durante el load test, observa en **Grafana** cómo:

1. 📈 `http_requests_total` sube exponencialmente
2. ⏱️ La latencia P99 se degrada con la carga
3. 💾 El heap de Node.js crece y se compacta con GC
4. 🔗 `active_connections` refleja el número de usuarios virtuales k6

---

## 🧠 Decisiones Técnicas

### ¿Por qué Node.js + Express?

**Node.js** es ideal para APIs con alta concurrencia I/O-bound gracias a su modelo asíncrono. Express añade el mínimo de abstracción necesario, lo que facilita instrumentar cada capa con logging y métricas sin capas ocultas que dificulten la observabilidad.

### ¿Por qué Winston para logs?

Winston es el estándar de facto para logging en Node.js. Soporta **múltiples transportes simultáneos** (consola, fichero, Elasticsearch), **log levels configurables**, y salida en **JSON estructurado**. Los logs JSON son fundamentales para que Elasticsearch pueda indexarlos y Kibana pueda filtrarlos eficientemente.

Alternativas consideradas:
- **Pino**: Más rápido, pero su ecosistema de transportes es más limitado
- **Morgan**: Solo para HTTP access logs; no sirve para logs de aplicación

### ¿Por qué prom-client?

Es la librería oficial recomendada por el equipo de Prometheus para Node.js. Implementa correctamente los cuatro tipos de métricas (Counter, Gauge, Histogram, Summary) y recoge automáticamente métricas del runtime de Node.js (heap, GC, event loop).

### ¿Por qué Prometheus + Grafana?

El modelo **pull** de Prometheus (scraping) es superior al modelo push para entornos de contenedores porque:
- Prometheus controla qué servicios monitorear (service discovery)
- Si un servicio cae, Prometheus detecta la caída por ausencia de scraping
- No requiere configuración en los servicios para saber dónde enviar métricas

Grafana complementa a Prometheus con dashboards, alertas y soporte de múltiples datasources.

### ¿Por qué Elasticsearch + Kibana?

Elasticsearch es la solución más madura para **búsqueda full-text sobre logs**. Su capacidad de indexar automáticamente campos JSON lo hace perfecto para logs estructurados. Kibana proporciona una UI potente con KQL para búsquedas ad-hoc, histogramas de tiempo, y alertas basadas en patrones de log.

Alternativas consideradas:
- **Loki + Grafana**: Más ligero, pero sin indexación de campos, solo búsqueda de texto
- **Fluentd + S3**: Óptimo para archivado, no para búsqueda en tiempo real

### ¿Por qué cAdvisor?

cAdvisor (Container Advisor) es la herramienta oficial de Google para exportar métricas de contenedores Docker a Prometheus. Proporciona CPU, memoria, red y disco por contenedor sin ninguna configuración en la aplicación.

### ¿Por qué Docker Compose?

Docker Compose permite definir y lanzar el stack completo (6 servicios) con un solo comando, garantizando reproducibilidad entre entornos. Para un proyecto universitario, elimina la fricción de instalación y asegura que todos los miembros trabajen con las mismas versiones.

---

## 💡 Conceptos Clave

### 🔍 Observabilidad vs Monitoreo

| Monitoreo | Observabilidad |
|-----------|----------------|
| Responde: *¿está caído?* | Responde: *¿por qué falló?* |
| Dashboard predefinido | Exploración ad-hoc |
| Alertas binarias (up/down) | Análisis de causa raíz |
| Conoces las preguntas de antemano | Puedes hacerte preguntas nuevas |

### 📄 Logging Estructurado

Los logs en texto plano (`ERROR: failed to process order`) son útiles para humanos pero imposibles de analizar a escala. Los **logs estructurados** en JSON permiten:

- Filtrar por cualquier campo: `level:error AND orderId:ord-123`
- Calcular métricas: contar errores por tipo, latencia media
- Correlacionar eventos: seguir un `correlationId` a través de múltiples servicios

### 📊 Los cuatro tipos de métricas Prometheus

| Tipo | Descripción | Ejemplo de uso |
|------|-------------|----------------|
| **Counter** | Solo sube, nunca baja, se resetea al reiniciar | Total de peticiones HTTP |
| **Gauge** | Sube y baja libremente | Conexiones activas, uso de memoria |
| **Histogram** | Muestras distribuidas en buckets predefinidos | Latencia de respuesta |
| **Summary** | Percentiles calculados en el cliente | Percentil 99 de duración |

> Los **Histograms** son preferibles a los Summaries porque permiten agregarlos entre múltiples instancias en PromQL, algo imposible con los Summaries.

### 🔗 Trazabilidad con Correlation IDs

Cuando un cliente hace una petición a la API, el middleware genera un **UUID único** (`correlationId`) y lo adjunta a:

1. Todos los logs de esa petición
2. La respuesta HTTP como header `X-Correlation-ID`

Esto permite buscar en Kibana `correlationId: "abc-123"` y ver el rastro completo de esa petición.

### 🚨 Las cuatro señales doradas (Google SRE)

| Señal | Métrica en este proyecto |
|-------|--------------------------|
| **Latencia** | `histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))` |
| **Tráfico** | `rate(http_requests_total[1m])` |
| **Errores** | `rate(http_requests_total{status_code=~"5.."}[5m])` |
| **Saturación** | `nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes` |

---

## 🛑 Detener el Stack

```bash
# Parar todos los servicios (preserva los datos)
docker compose stop

# Parar y eliminar contenedores (preserva volúmenes)
docker compose down

# Eliminar todo incluyendo volúmenes (reset completo)
docker compose down -v

# Ver logs de un servicio específico
docker compose logs -f ecommerce-api
docker compose logs -f elasticsearch
```

---

## 🤝 Contribuir

Este proyecto es de carácter universitario. Para proponer mejoras:

1. Haz un fork del repositorio
2. Crea una rama: `git checkout -b feature/nueva-metrica`
3. Realiza tus cambios y documéntalos
4. Abre un Pull Request describiendo los cambios

### Guías de estilo

- Los logs deben ser siempre **JSON estructurado**
- Cada endpoint nuevo debe tener **al menos una métrica** asociada
- Documenta las consultas PromQL en los comentarios del código

---

## 📚 Referencias y Recursos

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Elasticsearch Guide](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)
- [Winston Logger](https://github.com/winstonjs/winston)
- [Google SRE Book — Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/)
- [OpenTelemetry](https://opentelemetry.io/) *(siguiente paso en observabilidad)*
- [k6 Load Testing](https://k6.io/docs/)

---

<div align="center">

**Observability Ecommerce** · Proyecto de Sistemas Web

*Hecho con 🔭 para entender mejor los sistemas en producción*

</div>