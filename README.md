# Li Tahi+ · Plataforma de Observabilidad

**Sistema de observabilidad full-stack para el e-commerce de Li Tahi+.**
Métricas, logs, trazas y alertas en tiempo real sobre una API REST con seguridad de nivel producción.

---

![Node.js](https://img.shields.io/badge/Node.js-18.x-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?style=flat-square&logo=express&logoColor=white)
![Docker](https://img.shields.io/badge/Docker_Compose-2.x-2496ED?style=flat-square&logo=docker&logoColor=white)
![Prometheus](https://img.shields.io/badge/Prometheus-2.x-E6522C?style=flat-square&logo=prometheus&logoColor=white)
![Grafana](https://img.shields.io/badge/Grafana-10.x-F46800?style=flat-square&logo=grafana&logoColor=white)
![Elasticsearch](https://img.shields.io/badge/Elasticsearch-8.12-005571?style=flat-square&logo=elasticsearch&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-Auth-000000?style=flat-square&logo=jsonwebtokens&logoColor=white)

---

## Tabla de contenidos

1. [Sobre Li Tahi+](#1-sobre-li-tahi)
2. [El problema](#2-el-problema)
3. [Arquitectura](#3-arquitectura)
4. [Stack y decisiones técnicas](#4-stack-y-decisiones-técnicas)
5. [Puesta en marcha](#5-puesta-en-marcha)
6. [API REST](#6-api-rest)
7. [Métricas y alertas](#7-métricas-y-alertas)
8. [Seguridad](#8-seguridad)
9. [Estructura del repositorio](#9-estructura-del-repositorio)
10. [Referencias](#10-referencias)

---

## 1. Sobre Li Tahi+

Li Tahi+ es un e-commerce especializado del sector retail. Más contexto de la empresa, su catálogo y modelo de negocio en [`STORE.md`](./STORE.md).

Este repositorio contiene la **plataforma interna de observabilidad** que da soporte operativo a la tienda: monitoriza la salud de la API, detecta incidentes de seguridad y vigila las métricas de negocio que importan al equipo (revenue, conversión, sesiones activas).

---

## 2. El problema

Un fallo de cinco minutos en checkout, un pico de errores 5xx un viernes por la noche o un intento de fuerza bruta a las 3 AM no son situaciones hipotéticas — son el día a día de cualquier e-commerce con tráfico real. Sin observabilidad, el equipo de Li Tahi+ se enteraría de los incidentes por los propios clientes.

La plataforma resuelve tres preguntas operativas en segundos:

| Pregunta | Cómo se responde |
|---|---|
| **¿Qué está fallando?** | Dashboards de Grafana con alertas automáticas sobre latencia, errores y revenue |
| **¿Por qué está fallando?** | Búsqueda en Kibana por `requestId` para reconstruir la traza completa de cualquier petición |
| **¿A quién está afectando?** | Métricas de negocio en tiempo real: pedidos, sesiones por rol, carritos abandonados |

El objetivo es **MTTD bajo** (mean time to detect) y **MTTR rápido** (mean time to recover), aplicando los tres pilares clásicos de la observabilidad: métricas, logs y trazas correlacionadas.

---

## 3. Arquitectura

La plataforma se compone de ocho servicios orquestados con Docker Compose en una red privada (`observability`). La API es la única superficie expuesta al exterior; el resto comunican entre sí por la red interna.

```
                            ┌──────────────────────┐
                            │  Cliente / Tráfico   │
                            └──────────┬───────────┘
                                       │ HTTP :3000
                                       ▼
   ┌───────────────────────────────────────────────────────────────────┐
   │                     API · Node.js + Express                      │
   │                                                                   │
   │   requestId → logger → metricsMiddleware → rateLimiter → router  │
   │                                                                   │
   │   /api/auth      JWT · bcrypt · authLimiter                       │
   │   /api/products  Joi · paginación · filtros                       │
   │   /api/orders    authenticate · writeLimiter · stock              │
   │   /api/users     authenticate · authorize(admin)                  │
   └───────────┬─────────────────────────────────────┬─────────────────┘
               │ Logs JSON (stdout + file)           │ GET /metrics
               ▼                                     ▼
   ┌──────────────────────┐               ┌──────────────────────┐
   │      Filebeat        │               │     Prometheus       │
   │   ingesta de logs    │               │   scrape cada 15s    │
   └──────────┬───────────┘               └──────────┬───────────┘
              ▼                                      │
   ┌──────────────────────┐                          │
   │    Elasticsearch     │                          │
   │      :9200           │                          │
   └──────────┬───────────┘                          │
              ▼                                      ▼
   ┌──────────────────────┐               ┌──────────────────────┐
   │       Kibana         │               │       Grafana        │
   │       :5601          │               │       :3001          │
   │  Discover · trazas   │               │  Dashboards · alerts │
   └──────────────────────┘               └──────────┬───────────┘
                                                     │
                                          ┌──────────▼───────────┐
                                          │      cAdvisor        │
                                          │  métricas Docker     │
                                          └──────────────────────┘
```

**Flujo de una petición**

1. Llega a la API y recibe un `X-Request-Id` (UUID v4).
2. El middleware de logging registra entrada/salida en JSON con ese `requestId`.
3. El middleware de métricas incrementa `http_requests_total` y `http_request_duration_seconds`.
4. El rate limiter aplica el tier correspondiente (`global`, `auth`, `write`).
5. La ruta ejecuta su lógica, registra eventos de negocio (`orders_revenue_total`, etc.).
6. Prometheus recoge las métricas en su próximo scrape; Filebeat envía los logs a Elasticsearch.
7. Grafana evalúa las reglas de alerta cada 15 s sobre las métricas recogidas.

---

## 4. Stack y decisiones técnicas

### 4.1 Capa de aplicación

| Componente | Decisión | Justificación |
|---|---|---|
| **Node.js 18 + Express** | Runtime de la API | I/O no bloqueante sobre un event loop. Para una API REST con alta concurrencia y poca carga de CPU, ofrece mejor throughput por contenedor que alternativas con thread-pool, y el ecosistema de middlewares cubre todo lo que necesitamos (auth, validación, rate limit) sin dependencias pesadas. |
| **bcrypt** | Hash de contraseñas | Hash adaptativo con salt aleatorio y *cost factor* configurable. Resistente por diseño a rainbow tables y ataques de fuerza bruta offline. |
| **jsonwebtoken** | Autenticación | Tokens *stateless*: la API no necesita estado de sesión compartido, lo que permite escalar horizontalmente sin Redis ni sticky sessions. |
| **Joi** | Validación de input | Validación declarativa con errores estructurados campo a campo. Cada error es trazable porque se loguea con `requestId` y ubicación exacta (`body.email`, `params.id`). |
| **express-rate-limit** | Protección por capas | Tres tiers diferenciados para no penalizar el tráfico legítimo (ver §8.2). |
| **Winston** | Logger | Logs estructurados en JSON con campos correlacionables (`requestId`, `userId`, `ip`, `route`). Es lo que hace que Kibana sea útil — un log sin estructura no es buscable. |

### 4.2 Capa de observabilidad

| Componente | Rol | Por qué este y no otro |
|---|---|---|
| **Prometheus** | Recolección y consulta de métricas | Modelo **pull**: Prometheus scrapea la API, no al revés. Si la API cae, Prometheus lo detecta inmediatamente como *target down*. Frente a SaaS (Datadog, New Relic): coste cero, datos propios, control total. |
| **Grafana** | Visualización y alertas | Estándar de facto para visualizar Prometheus. Las alertas se definen junto a los dashboards, lo que reduce el desfase entre lo que se ve y lo que avisa. |
| **Elasticsearch** | Almacenamiento de logs | Búsqueda full-text en milisegundos sobre millones de documentos. Los archivos de log planos no escalan: un log de 10 GB no se consulta eficientemente con `grep`. |
| **Kibana** | Exploración de logs | Interfaz sobre Elasticsearch. El campo `requestId` convierte logs aislados en **trazas correlacionadas**: una sola búsqueda reconstruye el ciclo de vida completo de una petición. |
| **Filebeat** | Shipper de logs | Lee logs locales y los envía a Elasticsearch con back-pressure y reintentos. Más ligero que Logstash para este caso de uso (no necesitamos transformaciones complejas). |
| **cAdvisor** | Métricas de contenedores | Expone CPU, RAM, red y disco de cada contenedor en formato Prometheus. Permite correlacionar latencia de aplicación con saturación de recursos. |

---

## 5. Puesta en marcha

### 5.1 Requisitos

- Docker Desktop (Docker Engine 24+ y Compose v2)
- Node.js 18+ (solo para ejecutar el generador de tráfico de pruebas)
- Git

Recursos recomendados para Docker Desktop: 6 GB de RAM y 4 CPUs (Elasticsearch es el componente más exigente).

### 5.2 Levantar el stack

```bash
git clone https://github.com/Galder001/observability-ecommerce
cd observability-ecommerce
docker compose up -d
```

### 5.3 Verificación

```bash
docker compose ps
```

Los ocho servicios (`api`, `prometheus`, `grafana`, `elasticsearch`, `kibana`, `filebeat`, `cadvisor`, `node-exporter`) deben aparecer como `Up`. El primer arranque de Elasticsearch tarda 30–60 s en estar `healthy`.

### 5.4 URLs de los servicios

| Servicio | URL | Credenciales |
|---|---|---|
| API REST | http://localhost:3000 | — |
| Grafana | http://localhost:3001 | `admin` / `admin123` |
| Prometheus | http://localhost:9090 | — |
| Kibana | http://localhost:5601 | — |
| cAdvisor | http://localhost:8080 | — |

### 5.5 Usuario administrador por defecto

El seed inicial crea un usuario admin:

```
username: alice
password: Admin1234
role:     admin
```

> Este usuario es exclusivamente para el entorno de desarrollo. En cualquier despliegue real debe rotarse antes de exponer la API.

### 5.6 Generador de tráfico (opcional)

Para poblar dashboards y validar alertas existe `load-test.js`:

```bash
node load-test.js sustained   # tráfico continuo de baseline
node load-test.js demo        # secuencia mixta (registro, login, compras)
node load-test.js attack      # simula fuerza bruta sobre /api/auth/login
```

---

## 6. API REST

Base URL: `http://localhost:3000`. Todas las respuestas son JSON e incluyen la cabecera `X-Request-Id`.

### 6.1 Autenticación — `/api/auth`

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/register` | — | Alta de usuario. Devuelve perfil sin tokens. |
| `POST` | `/login` | — | Devuelve `accessToken` (15 min) y `refreshToken` (7 días). |
| `POST` | `/refresh` | — | Renueva el access token a partir de un refresh válido. |
| `POST` | `/logout` | — | Revoca el refresh token (denylist en memoria). |
| `GET` | `/me` | ✅ | Perfil del usuario autenticado. |

### 6.2 Productos — `/api/products`

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/` | — | Listado con `?page`, `?limit`, `?q`, `?category`, `?sort`. |
| `GET` | `/:id` | — | Detalle de un producto. |
| `POST` | `/` | ✅ admin | Crear producto. |
| `PATCH` | `/:id` | ✅ admin | Actualización parcial. |
| `DELETE` | `/:id` | ✅ admin | Baja del catálogo. |

### 6.3 Pedidos — `/api/orders`

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/` | ✅ | Pedidos del usuario actual (admin ve todos). |
| `POST` | `/` | ✅ | Crea pedido; `userId` se toma del JWT, no del body. |
| `GET` | `/stats` | ✅ | Estadísticas agregadas de ventas. |
| `PATCH` | `/:id/status` | ✅ admin | Cambio de estado (`pending` → `paid` → `shipped` → `delivered`). |

### 6.4 Usuarios — `/api/users`

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/` | ✅ admin | Listado de usuarios. |
| `PATCH` | `/:id` | ✅ admin | Cambio de rol o estado. |
| `DELETE` | `/:id` | ✅ admin | Baja de usuario. |

### 6.5 Endpoints operativos

| Ruta | Descripción |
|---|---|
| `GET /health` | Health check para liveness probe. |
| `GET /metrics` | Endpoint Prometheus en formato OpenMetrics. |

---

## 7. Métricas y alertas

### 7.1 Métricas de negocio

| Métrica | Tipo | Significado |
|---|---|---|
| `orders_revenue_total` | Counter | Revenue acumulado en euros desde el arranque. |
| `orders_total{status}` | Counter | Pedidos creados, agrupados por estado. |
| `active_sessions{role}` | Gauge | Sesiones activas por rol (`user`, `admin`). |
| `registrations_total{role}` | Counter | Nuevos registros. |
| `cart_abandonment_total` | Counter | Carritos creados sin checkout. |

### 7.2 Métricas de seguridad

| Métrica | Tipo | Significado |
|---|---|---|
| `auth_failures_total{reason}` | Counter | Intentos de login fallidos, etiquetados por motivo. |
| `rate_limit_hits_total{tier}` | Counter | Peticiones bloqueadas por tier. |
| `validation_errors_total{location,route}` | Counter | Errores Joi por ubicación (`body`, `params`, `query`) y ruta. |

### 7.3 Métricas HTTP estándar

| Métrica | Tipo | Significado |
|---|---|---|
| `http_requests_total{method,route,status}` | Counter | Volumen de peticiones desglosado. |
| `http_request_duration_seconds{method,route}` | Histogram | Latencia con buckets para calcular p50/p95/p99. |

### 7.4 Reglas de alerta

Definidas en `prometheus/alerts.yml`:

| Alerta | Condición | Severidad | Lo que indica |
|---|---|---|---|
| `BruteForceDetectado` | `rate(auth_failures_total[1m]) > 0.08` durante 30 s | 🔴 critical | Intento de fuerza bruta sobre login. |
| `RateLimitActivado` | `rate(rate_limit_hits_total[1m]) > 0.05` durante 15 s | 🟡 warning | Cliente abusivo o pico de tráfico anómalo. |
| `LatenciaAltaP95` | `histogram_quantile(0.95, ...) > 0.5` durante 1 min | 🟡 warning | Degradación de rendimiento. |
| `RevenueSinCrecer` | `rate(orders_revenue_total[5m]) == 0` durante 5 min | 🟡 warning | Posible caída del flujo de checkout. |

---

## 8. Seguridad

### 8.1 Autenticación JWT

- **Access token**: 15 minutos. Vida corta para minimizar el impacto de un token comprometido.
- **Refresh token**: 7 días. Permite renovar sin re-autenticación frecuente.
- **Revocación**: denylist en memoria para logout inmediato del refresh token.
- **Anti-enumeración**: `/login` devuelve el mismo mensaje y código para "usuario inexistente" y "contraseña incorrecta", impidiendo descubrir usuarios válidos por respuesta diferencial.

### 8.2 Rate limiting por tiers

Un único umbral global no distingue entre un usuario activo y un atacante. Tres tiers permiten políticas diferenciadas:

```
GLOBAL    300 req / 15 min · IP     → protección contra DoS genérico
AUTH      500 req / 15 min · IP     → endpoints de autenticación
WRITE      60 req /  1 min · IP     → operaciones de escritura (POST/PUT/PATCH/DELETE)
```

Cada bloqueo genera un log estructurado y un incremento en `rate_limit_hits_total{tier}`, lo que alimenta tanto Kibana como las alertas.

### 8.3 Validación de entrada con Joi

- Esquemas declarativos por ruta en `src/schemas/`.
- `stripUnknown: true` — los campos no contemplados se descartan, no se procesan.
- Redacción de campos sensibles (`password`, `token`) antes de cualquier log.
- Errores devueltos campo a campo con la ubicación exacta del fallo.

### 8.4 Trazabilidad mediante `requestId`

Cada petición recibe un UUID v4 al entrar, que:

- viaja en el header de respuesta `X-Request-Id`,
- aparece en **todos** los logs generados durante esa petición,
- se incluye en cualquier error devuelto al cliente.

Esto convierte una incidencia reportada por un usuario ("me ha dado un error a las 14:23") en una traza reconstruible: un único filtro en Kibana muestra todo lo que pasó.

---

## 9. Estructura del repositorio

```
observability-ecommerce/
├── api/
│   └── src/
│       ├── middleware/
│       │   ├── auth.js            # verifyToken + authorize(roles)
│       │   ├── logger.js          # Winston + transport a archivo
│       │   ├── metrics.js         # registro prom-client + middleware
│       │   ├── rateLimiter.js     # tres tiers: global, auth, write
│       │   └── validate.js        # wrapper Joi para rutas
│       ├── routes/
│       │   ├── auth.js
│       │   ├── products.js
│       │   ├── orders.js
│       │   └── users.js
│       ├── schemas/
│       │   ├── auth.schema.js
│       │   ├── products.schema.js
│       │   └── orders.schema.js
│       ├── data/
│       │   └── store.js           # store en memoria con seed
│       └── app.js                 # composición de la app Express
├── prometheus/
│   ├── prometheus.yml             # configuración de scrape
│   └── alerts.yml                 # cuatro reglas de alerta
├── grafana/
│   └── provisioning/              # datasources y dashboards
├── filebeat/
│   └── filebeat.yml               # ingesta de logs a Elasticsearch
├── docker-compose.yml             # ocho servicios
├── load-test.js                   # generador de tráfico
├── inject-history.js              # backfill de 30 días de historial
├── STORE.md                       # contexto de negocio de Li Tahi+
└── README.md
```

---

## 10. Referencias

- Sridharan, C. *Distributed Systems Observability* — O'Reilly (the three pillars).
- Beyer, B. et al. *Site Reliability Engineering* — Google (capítulos sobre monitoring y alerting).
- [Documentación de Prometheus](https://prometheus.io/docs/)
- [Documentación de Grafana](https://grafana.com/docs/)
- [Elasticsearch Reference](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)
- [OWASP API Security Top 10](https://owasp.org/API-Security/)

---

<sub>Li Tahi+ · Plataforma de Observabilidad · Sistemas Web</sub>