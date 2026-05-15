# Li Tahi+ Ops Console

**Panel de control operacional y copiloto IA para la plataforma Li Tahi+.**
Construido encima del stack de observabilidad existente (Prometheus + Elasticsearch).

---

## ¿Qué es esto y por qué existe?

Grafana es excelente para ingenieros — paneles densos, PromQL, alertas técnicas.
Pero el equipo de negocio de Li Tahi+ no necesita PromQL: necesita responder preguntas como *"¿cuánto hemos vendido hoy?"* o *"¿pasa algo raro?"* sin abrir cinco pestañas.

La Ops Console es **la capa de presentación pensada para humanos no técnicos**, con tres piezas:

1. **Overview** — KPIs de negocio en una sola pantalla.
2. **Activity** — stream de peticiones en vivo, con un click para trazar cualquier `requestId` completo.
3. **Copilot** — asistente IA que responde preguntas en lenguaje natural consultando Prometheus y Elasticsearch en tiempo real.

---

## Arquitectura del copiloto IA

El copiloto sigue un pipeline de tres etapas diseñado para ser **fiable con modelos open-source pequeños**:

```
Pregunta del usuario
        │
        ▼
┌─────────────────────────────┐
│  1. CLASIFICADOR (Ollama)   │  ← decide intent: revenue/errors/latency...
│     temperature: 0          │
│     format: JSON            │
└─────────────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│  2. EJECUTOR (código TS)    │  ← lanza queries reales a Prom/ES
│     queries precompiladas   │     (sin depender del modelo)
└─────────────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│  3. REDACTOR (Ollama)       │  ← redacta respuesta natural en español
│     temperature: 0.4        │
└─────────────────────────────┘
```

**¿Por qué este diseño y no tool use directo?**
Los modelos pequeños (Llama 3.1 8B, Qwen 2.5 7B) tienen tool use frágil — a veces inventan parámetros, otras llaman a la herramienta equivocada. Separando *decisión* y *ejecución*, el código garantiza que las consultas son siempre correctas. El modelo solo hace lo que sabe hacer bien: clasificar y redactar.

Es el mismo patrón que usan plataformas reales de AIOps cuando no quieren depender de APIs externas como Claude o GPT-4.

---

## Stack

| Tecnología | Rol | Por qué |
|---|---|---|
| **Vite + React 18 + TypeScript** | Frontend | Build instantáneo, tipado fuerte, sin SSR innecesario (herramienta interna). |
| **Tailwind CSS** | Estilos | Diseño rápido sin abandonar la consistencia visual. |
| **Recharts** | Gráficas | Library de charts declarativa sobre React; suficiente para los charts operacionales. |
| **Ollama + Llama 3.1 8B** | LLM local | Sin coste, sin tarjeta, sin dependencias externas. Privacidad total. |
| **nginx (producción)** | Proxy + estáticos | Sirve la SPA y hace proxy interno a Prometheus / Elasticsearch / Ollama. |

---

## Cómo arranca

### Requisitos previos

1. El stack principal `observability-ecommerce` debe estar corriendo (ver README principal).
2. [Ollama](https://ollama.com/download) instalado en el host con el modelo descargado:
   ```powershell
   ollama pull llama3.1:8b
   ```

### Desarrollo local

```bash
cd ops-console
npm install
npm run dev
```

Abre http://localhost:5173.

### Producción (integrado con Docker)

Añadir al `docker-compose.yml` principal del proyecto:

```yaml
  ops-console:
    build: ./ops-console
    container_name: ops-console
    ports:
      - "5173:80"
    extra_hosts:
      - "host.docker.internal:host-gateway"
    depends_on:
      - prometheus
      - elasticsearch
      - ecommerce-api
    networks:
      - observability
```

Y arrancar:

```bash
docker compose up -d --build ops-console
```

---

## Variables de entorno

| Variable | Por defecto | Para qué |
|---|---|---|
| `VITE_OLLAMA_MODEL` | `llama3.1:8b` | Modelo de Ollama. Alternativas más ligeras: `qwen2.5:7b`, `llama3.2:3b`. |

---

## Estructura

```
ops-console/
├── src/
│   ├── components/        # Layout, KPI cards
│   ├── views/             # Overview, Activity, Assistant
│   ├── lib/
│   │   ├── prometheus.ts  # cliente + PROMQL precompiladas
│   │   ├── elasticsearch.ts
│   │   ├── ollama.ts      # clasificador + redactor
│   │   └── copilot.ts     # orquestador del pipeline
│   ├── types/
│   └── App.tsx
├── Dockerfile             # build + nginx
├── nginx.conf             # proxy interno a Prom/ES/Ollama
├── vite.config.ts         # proxy de desarrollo
└── package.json
```

---

## Ejemplos de preguntas que entiende el copiloto

- *"¿Cuánto hemos vendido hoy?"* → consulta `increase(orders_revenue_total[24h])`
- *"¿Hay algún error preocupante?"* → cruza tasa de 5xx con últimos logs de error
- *"¿Cómo está la latencia?"* → p95 y p99 de `http_request_duration_seconds`
- *"¿Sufrimos algún ataque?"* → rate de `auth_failures_total` y `rate_limit_hits_total`
- *"Traza la petición a1b2c3d4-..."* → busca en Elasticsearch todos los logs con ese `requestId`

Cada respuesta del copiloto muestra (desplegando "Consultas PromQL ejecutadas") **qué se ha consultado exactamente**, lo que mantiene la trazabilidad y permite verificar que la IA no inventa.
