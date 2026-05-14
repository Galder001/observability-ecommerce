# 🔭 Observability Ecommerce

<div align="center">

### Sistema de Observabilidad Full-Stack para E-Commerce en Producción

*Seguridad · Métricas · Logs · Trazabilidad · Alertas en tiempo real*

---

![Node.js](https://img.shields.io/badge/Node.js-18.x-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Prometheus](https://img.shields.io/badge/Prometheus-2.x-E6522C?style=for-the-badge&logo=prometheus&logoColor=white)
![Grafana](https://img.shields.io/badge/Grafana-10.x-F46800?style=for-the-badge&logo=grafana&logoColor=white)
![Elasticsearch](https://img.shields.io/badge/Elasticsearch-8.12-005571?style=for-the-badge&logo=elasticsearch&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-Auth-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)

---

> Sistema de observabilidad completo construido sobre una API REST de e-commerce real.  
> Implementa los **tres pilares de la observabilidad moderna** con seguridad de nivel producción:  
> autenticación JWT, rate limiting por tiers, validación robusta y trazabilidad end-to-end.

</div>

---

## 📋 Tabla de Contenidos

- [El Problema que Resuelve](#-el-problema-que-resuelve)
- [Arquitectura del Sistema](#-arquitectura-del-sistema)
- [Stack Tecnológico y Decisiones](#-stack-tecnológico-y-decisiones)
- [Seguridad Implementada](#-seguridad-implementada)
- [API REST — Endpoints](#-api-rest--endpoints)
- [Métricas Custom](#-métricas-custom)
- [Sistema de Alertas](#-sistema-de-alertas)
- [Instalación](#-instalación)
- [Demo en Vivo](#-demo-en-vivo)
- [Decisiones Técnicas Argumentadas](#-decisiones-técnicas-argumentadas)

---

## 🎯 El Problema que Resuelve

En un e-commerce real, cuando algo falla a las 3 de la madrugada, el equipo necesita responder tres preguntas en segundos:

1. **¿Qué está fallando?** → Grafana con alertas automáticas
2. **¿Por qué falló?** → Kibana con trazabilidad por `requestId`
3. **¿A quién afecta?** → Métricas de negocio en tiempo real

Este proyecto implementa exactamente eso — no como ejercicio académico, sino como lo haría un equipo de ingeniería en producción.

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENTE / LOAD TEST                          │
└─────────────────────┬───────────────────────────────────────────┘
                      │ HTTP
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│              API REST — Node.js + Express :3000                 │
│                                                                 │
│  requestId ──▶ logger ──▶ metricsMiddleware ──▶ globalLimiter  │
│                                                                 │
│  /api/auth    JWT + bcrypt + authLimiter (10 req/15min)        │
│  /api/products  Validación Joi + paginación + filtros          │
│  /api/orders    authenticate + writeLimiter + métricas         │
│  /api/users     authenticate + authorize(admin)                │
└──────┬──────────────────────────────────┬───────────────────────┘
       │ Logs JSON                        │ /metrics
       ▼                                  ▼
┌──────────────┐                 ┌─────────────────┐
│Elasticsearch │                 │   Prometheus    │
│   :9200      │                 │     :9090       │
│              │                 │  scrape /15s    │
└──────┬───────┘                 └────────┬────────┘
       │                                  │
       ▼                                  ▼
┌──────────────┐                 ┌─────────────────┐
│   Kibana     │                 │    Grafana      │
│   :5601      │                 │     :3001       │
│  Discover    │                 │  16 paneles     │
│  requestId   │                 │  5 filas        │
│  trazabilidad│                 │  alertas live   │
└──────────────┘                 └─────────────────┘
                                          │
                                 ┌────────▼────────┐
                                 │   cAdvisor      │
                                 │    :8080        │
                                 │ CPU/RAM Docker  │
                                 └─────────────────┘
```

### Red Docker
Todos los servicios corren en la red `observability` — comunicación interna sin exponer puertos innecesarios.

---

## 🛠️ Stack Tecnológico y Decisiones

### API
| Tecnología | Por qué |
|---|---|
| **Node.js + Express** | Non-blocking I/O ideal para APIs con alta concurrencia. El event loop de Node permite manejar miles de conexiones simultáneas con un solo hilo |
| **bcrypt** | Hash de contraseñas con salt aleatorio. Resistente a rainbow tables y ataques de fuerza bruta por diseño (cost factor configurable) |
| **jsonwebtoken** | Tokens stateless — la API no necesita mantener estado de sesión. Escalable horizontalmente sin coordinación entre instancias |
| **Joi** | Validación declarativa con mensajes de error estructurados. Cada campo inválido genera un log trazable en Kibana |
| **express-rate-limit** | Protección por tiers: global (300/15min), auth (500/15min), write (60/1min) |

### Observabilidad
| Tecnología | Por qué |
|---|---|
| **Prometheus** | Pull-based — Prometheus scrapeа la API cada 15s. Más robusto que push: si la API cae, Prometheus lo detecta inmediatamente |
| **Grafana** | Visualización con 16 paneles organizados en 5 filas temáticas. Alertas configurables que se disparan en tiempo real |
| **Elasticsearch** | Motor de búsqueda full-text sobre logs JSON. Permite buscar por `requestId`, IP, ruta, usuario o cualquier campo en milisegundos |
| **Kibana** | Interfaz sobre Elasticsearch. El campo `requestId` permite trazar una petición completa desde el rate limiter hasta la respuesta |
| **Winston** | Logger estructurado en JSON. Cada log incluye `requestId`, `userId`, `ip`, `timestamp` — correlacionable en Kibana |
| **cAdvisor** | Métricas de contenedores Docker exportadas a Prometheus. CPU, memoria y red de cada servicio visibles en Grafana |

---

## 🔐 Seguridad Implementada

### Autenticación JWT
- **Access Token**: 15 minutos de vida — minimiza el impacto de un token robado
- **Refresh Token**: 7 días — permite renovar sin re-autenticar
- **Revocación**: denylist en memoria para logout inmediato
- **Anti-enumeración**: mismo mensaje de error para "usuario no existe" y "contraseña incorrecta"

### Rate Limiting por Tiers
```
Tier GLOBAL  → 300 req / 15 min por IP  (todo el tráfico)
Tier AUTH    → 500 req / 15 min por IP  (login/register)  
Tier WRITE   → 60  req / 1  min por IP  (POST/PUT/DELETE)
```
Cada bloqueo genera un log estructurado y un incremento en la métrica `rate_limit_hits_total{tier}`.

### Validación con Joi
- Sanitización automática de campos desconocidos (`stripUnknown: true`)
- Redacción de campos sensibles en logs (passwords, tokens)
- Errores campo a campo con ubicación exacta (`body.email`, `params.id`)

### RequestId Trazable
Cada petición recibe un UUID v4 único propagado en:
- Header de respuesta `X-Request-Id`
- Todos los logs relacionados con esa petición
- Todos los errores devueltos al cliente

---

## 🌐 API REST — Endpoints

### Autenticación (`/api/auth`)
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/register` | ❌ | Registro de usuario |
| POST | `/login` | ❌ | Login → access + refresh token |
| POST | `/refresh` | ❌ | Renovar access token |
| POST | `/logout` | ❌ | Revocar refresh token |
| GET | `/me` | ✅ | Perfil del usuario actual |

### Productos (`/api/products`)
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/` | ❌ | Listar con paginación, filtros, búsqueda y sort |
| GET | `/:id` | ❌ | Detalle de producto |
| POST | `/` | ✅ Admin | Crear producto |
| PATCH | `/:id` | ✅ Admin | Actualizar producto |
| DELETE | `/:id` | ✅ Admin | Eliminar producto |

### Pedidos (`/api/orders`)
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/` | ✅ | Mis pedidos (admin ve todos) |
| POST | `/` | ✅ | Crear pedido (userId del JWT) |
| GET | `/stats` | ✅ | Estadísticas de ventas |
| PATCH | `/:id/status` | ✅ Admin | Cambiar estado |

---

## 📊 Métricas Custom

### Métricas de Negocio
| Métrica | Tipo | Descripción |
|---|---|---|
| `orders_revenue_total` | Counter | Revenue acumulado en euros |
| `orders_total{status}` | Counter | Pedidos por estado |
| `active_sessions{role}` | Gauge | Sesiones activas en tiempo real |
| `registrations_total{role}` | Counter | Nuevos usuarios |
| `cart_abandonment_total` | Counter | Carritos abandonados |

### Métricas de Seguridad
| Métrica | Tipo | Descripción |
|---|---|---|
| `auth_attempts_total{result,reason}` | Counter | Intentos auth con motivo |
| `rate_limit_hits_total{tier}` | Counter | Bloqueos por tier |
| `validation_errors_total{location,route}` | Counter | Errores de validación |

### Métricas HTTP
| Métrica | Tipo | Descripción |
|---|---|---|
| `http_requests_total{method,route,status}` | Counter | Peticiones por ruta |
| `http_request_duration_seconds{method,route}` | Histogram | Latencia con percentiles |

---

## 🚨 Sistema de Alertas

Cuatro reglas configuradas en `prometheus/alerts.yml`:

| Alerta | Condición | Severidad | Para demostrar |
|---|---|---|---|
| `BruteForceDetectado` | >0.08 fallos auth/s durante 30s | 🔴 Critical | Ataque de fuerza bruta en vivo |
| `RateLimitActivado` | >0.05 bloqueos/s durante 15s | 🟡 Warning | Rate limiter activo |
| `LatenciaAltaP95` | p95 > 500ms durante 1min | 🟡 Warning | Degradación de rendimiento |
| `RevenueSinCrecer` | Sin ventas durante 5min | 🟡 Warning | Caída del flujo de checkout |

---

## 🚀 Instalación

### Prerrequisitos
- Docker Desktop
- Node.js 18+
- Git

### Arranque en 3 comandos

```bash
git clone https://github.com/Galder001/observability-ecommerce
cd observability-ecommerce
docker-compose up -d
```

### Verificar que todo está activo

```bash
docker-compose ps
```

Todos los servicios deben aparecer como `Up`.

### URLs de acceso

| Servicio | URL | Credenciales |
|---|---|---|
| API | http://localhost:3000 | — |
| Grafana | http://localhost:3001 | admin / admin123 |
| Kibana | http://localhost:5601 | — |
| Prometheus | http://localhost:9090 | — |
| cAdvisor | http://localhost:8080 | — |

### Usuario admin por defecto

```
Username: alice
Password: Admin1234
Role: admin
```

---

## 🎬 Demo en Vivo

### Generar tráfico realista

```bash
# Tráfico continuo (fondo durante la demo)
node load-test.js sustained

# Secuencia completa de presentación
node load-test.js demo

# Simular ataque de fuerza bruta (dispara alerta en Grafana)
node load-test.js attack
```

### El momento "wow" — trazabilidad en vivo

1. Lanzar `node load-test.js attack`
2. Copiar el `requestId` que aparece en consola
3. Abrir Kibana → Discover
4. Buscar: `fields.requestId : "EL-ID-COPIADO"`
5. Ver la traza completa de ese ataque — IP, timestamp, motivo del bloqueo

### Guión de demo (4 minutos)

**Minuto 1** — Abrir Grafana, señalar el revenue acumulado y las sesiones activas. *"Este dashboard muestra el estado del negocio en tiempo real."*

**Minuto 2** — Señalar los paneles de tráfico HTTP. *"Aquí vemos las peticiones por ruta, la latencia p95 y la tasa de errores diferenciada por código HTTP."*

**Minuto 3** — Lanzar el ataque. *"Voy a simular un atacante intentando fuerza bruta."* Mostrar el panel de seguridad disparándose, la alerta en Prometheus.

**Minuto 4** — Ir a Kibana, pegar el requestId. *"Este es el poder de la trazabilidad — con un ID puedo ver exactamente qué pasó, cuándo y desde qué IP."*

---

## 🧠 Decisiones Técnicas Argumentadas

### ¿Por qué Prometheus y no Datadog o New Relic?

Datadog y New Relic son SaaS de pago — en producción tienen sentido por el soporte y las integraciones. Para este proyecto elegimos Prometheus porque:
- **Open source** y autoalojado — control total sobre los datos
- **Modelo pull** — más resiliente que push: si la API cae, Prometheus lo detecta
- **PromQL** — lenguaje de consulta expresivo que permite calcular percentiles, rates y predicciones
- **Ecosistema Grafana** — integración nativa con dashboards y alertas

### ¿Por qué Elasticsearch y no solo archivos de log?

Los archivos de log son suficientes para debugging local, pero inútiles en producción porque:
- **No son buscables** en tiempo real
- **No escalan** — un archivo de 10GB no se puede consultar eficientemente
- Elasticsearch permite buscar por cualquier campo en **milisegundos** sobre millones de documentos
- El campo `requestId` convierte logs aislados en **trazas correlacionadas**

### ¿Por qué JWT y no sesiones de servidor?

Las sesiones de servidor requieren estado compartido entre instancias (Redis, base de datos). JWT es **stateless**:
- Cada instancia puede verificar un token sin consultar ningún servidor central
- Escala horizontalmente sin coordinación
- El access token corto (15min) limita el impacto de un token comprometido
- El refresh token largo (7 días) mantiene la UX sin re-autenticaciones frecuentes

### ¿Por qué Rate Limiting por tiers?

Un único límite global no distingue entre tráfico legítimo y ataques. Tres tiers permiten:
- **Global**: proteger contra DoS genérico sin penalizar usuarios legítimos
- **Auth**: proteger contra fuerza bruta en login/register específicamente
- **Write**: proteger la integridad de datos contra abusos de escritura

### ¿Por qué RequestId en cada petición?

Sin correlación, los logs son entradas aisladas. Con `requestId`:
- Se puede reconstruir el flujo completo de cualquier petición
- Un error en producción se traza en segundos en Kibana
- El ID se propaga en el header de respuesta — el cliente también puede usarlo para reportar bugs

---

## 📁 Estructura del Proyecto

```
observability-ecommerce/
├── api/
│   └── src/
│       ├── middleware/
│       │   ├── auth.js          # JWT verify + authorize(roles)
│       │   ├── logger.js        # Winston + Elasticsearch transport
│       │   ├── metrics.js       # 13 métricas custom prom-client
│       │   ├── rateLimiter.js   # 3 tiers: global, auth, write
│       │   └── validate.js      # Joi schemas middleware
│       ├── routes/
│       │   ├── auth.js          # register, login, refresh, logout, me
│       │   ├── products.js      # CRUD + paginación + filtros
│       │   ├── orders.js        # pedidos con stock management
│       │   └── users.js         # gestión de usuarios
│       ├── schemas/
│       │   ├── auth.schema.js
│       │   ├── products.schema.js
│       │   └── orders.schema.js
│       ├── data/
│       │   └── store.js         # In-memory store con seed data
│       └── app.js               # Express app + middlewares
├── prometheus/
│   ├── prometheus.yml           # Scrape config + rule_files
│   └── alerts.yml               # 4 reglas de alerta
├── filebeat/
│   └── filebeat.yml             # Ingesta de logs → Elasticsearch
├── docker-compose.yml           # 8 servicios en red observability
├── load-test.js                 # Simulador de tráfico (4 escenarios)
└── inject-history.js            # Generador de historial de 30 días
```

---

## 🔗 Referencias y Recursos

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Elasticsearch Guide](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)
- [Winston Logger](https://github.com/winstonjs/winston)
- [The Three Pillars of Observability — O'Reilly](https://www.oreilly.com/library/view/distributed-systems-observability/9781492033431/ch04.html)
- [Google SRE Book — Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/)

---

<div align="center">

**Observability Ecommerce** · Proyecto de Sistemas Web

*Construido para entender qué pasa en producción antes de que el cliente lo note*

</div>