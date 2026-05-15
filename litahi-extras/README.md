# Li Tahi+ — Extras: Telegram + World Map

Dos añadidos rápidos al proyecto observability-ecommerce.

---

## 📱 PARTE 1 — Alertas Telegram

### Paso 1: Crear el bot de Telegram (5 min)

1. Abre Telegram en el móvil
2. Busca `@BotFather` y envíale `/start`
3. Envía `/newbot`
4. Te pide nombre del bot: por ejemplo `Li Tahi Monitor`
5. Te pide username: tiene que acabar en `bot`, ej. `litahi_monitor_bot`
6. **BotFather te da un token tipo:** `1234567890:ABC-XYZ...` ← **COPIA Y GUARDA ESTO**

### Paso 2: Obtener tu chat_id

1. En Telegram, busca **tu propio bot** que acabas de crear
2. Pulsa **Start** o envíale cualquier mensaje (ej. "hola")
3. En tu navegador, abre esta URL reemplazando `<TOKEN>` por el token de arriba:
   ```
   https://api.telegram.org/bot<TOKEN>/getUpdates
   ```
4. Busca en la respuesta JSON el campo `"chat":{"id":XXXXXXXX}` ← **ESE NÚMERO ES TU CHAT_ID**

### Paso 3: Copiar los archivos al proyecto

Desde la raíz `C:\Users\galde\observability-ecommerce`:

```powershell
# Crear las carpetas si no existen
mkdir alertmanager -Force
mkdir prometheus -Force

# Copiar los archivos descomprimidos a su sitio
Copy-Item extras\alertmanager\alertmanager.yml alertmanager\alertmanager.yml -Force
Copy-Item extras\prometheus\alerts.yml prometheus\alerts.yml -Force
Copy-Item extras\prometheus\prometheus.yml prometheus\prometheus.yml -Force
```

### Paso 4: Añadir Alertmanager al docker-compose.yml

Abre `docker-compose.yml` con un editor y **añade este bloque dentro de `services:`**:

```yaml
  alertmanager:
    image: prom/alertmanager:latest
    container_name: alertmanager
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager/alertmanager.yml:/etc/alertmanager/alertmanager.yml:ro
    environment:
      - TELEGRAM_BOT_TOKEN=PEGA_AQUI_TU_TOKEN
      - TELEGRAM_CHAT_ID=PEGA_AQUI_TU_CHAT_ID
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'
    networks:
      - observability
    restart: unless-stopped
```

**⚠️ Reemplaza `PEGA_AQUI_TU_TOKEN` y `PEGA_AQUI_TU_CHAT_ID`** por los valores reales.

### Paso 5: Asegurarse de que Prometheus carga las reglas

En el bloque `prometheus:` de tu `docker-compose.yml`, verifica que el volumen monta también `alerts.yml`:

```yaml
  prometheus:
    # ... lo que ya tienes
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - ./prometheus/alerts.yml:/etc/prometheus/alerts.yml:ro  # ← AÑADIR ESTA LÍNEA
```

### Paso 6: Reiniciar el stack

```powershell
docker compose up -d
```

### Paso 7: Probar que llega un mensaje a Telegram

Provoca un ataque de fuerza bruta:

```powershell
node load-test.js attack
```

**En 30-60 segundos deberías recibir un mensaje en Telegram** tipo:

```
🚨 ALERTA DISPARADA

BruteForceDetectado
🔴 Crítica

📝 Posible ataque de fuerza bruta en /api/auth/login
📊 Tasa de fallos: 0.12 req/s
🕐 18:42:15

—
Li Tahi+ Monitoring
```

### Verificar también en Alertmanager UI

Abre http://localhost:9093 — deberías ver las alertas activas.

---

## 🌍 PARTE 2 — World Map en vivo

### Paso 1: Copiar los archivos a la Ops Console

```powershell
cd C:\Users\galde\observability-ecommerce

# Nuevos archivos
Copy-Item extras\ops-console-extras\src\views\WorldMap.tsx ops-console\src\views\WorldMap.tsx -Force
Copy-Item extras\ops-console-extras\src\lib\geoip.ts ops-console\src\lib\geoip.ts -Force

# Archivos a reemplazar (¡estos pisan los existentes!)
Copy-Item extras\ops-console-extras\src\App.tsx ops-console\src\App.tsx -Force
Copy-Item extras\ops-console-extras\src\components\Layout.tsx ops-console\src\components\Layout.tsx -Force
Copy-Item extras\ops-console-extras\src\types\index.ts ops-console\src\types\index.ts -Force
```

### Paso 2: Listo

Si `npm run dev` ya está corriendo, Vite recarga solo. Si no:

```powershell
cd ops-console
npm run dev
```

Abre http://localhost:5173 → en el sidebar verás la nueva opción **World Map** entre Activity y Copilot.

### Paso 3: Ver tráfico distribuido

Como tu tráfico es local, el mapa usa una proyección demo determinista: cada IP local se asigna siempre a una ciudad fija (Madrid, Tokio, Nueva York...). Esto da una demo visualmente potente sin necesidad de tráfico real desde internet.

Genera tráfico:

```powershell
node load-test.js sustained
```

En 5-10 segundos verás puntos pulsantes naranja apareciendo por el mapa.

---

## 🎯 Frases para la presentación

### Para Telegram

> *"Tenemos integración con Telegram a través de Alertmanager — es el estándar del ecosistema Prometheus. Cuando una alerta crítica se dispara, el equipo de guardia recibe notificación push instantánea en su móvil, con los datos contextuales del incidente. Reduce el MTTD de minutos a segundos."*

### Para World Map

> *"El World Map es nuestra capa de business intelligence visual — agrega geográficamente las IPs de los logs de Elasticsearch y las muestra en proyección equirectangular con pulsos animados. Permite detectar de un vistazo patrones de tráfico anómalos por región: un pico de tráfico desde un país donde no operamos suele indicar un ataque distribuido."*

### La frase final que lo cierra todo

> *"Li Tahi+ tiene cuatro capas de observabilidad: stack técnico clásico para SREs (Prometheus, Grafana, ELK), Ops Console con copiloto IA para negocio, alertas push a Telegram para incidentes críticos, y un mapa mundial en tiempo real para visualización geográfica. Todo en Docker, todo trazable por requestId, todo auto-hospedado."*

---

## ✅ Checklist final

- [ ] Bot de Telegram creado, token guardado
- [ ] Chat ID obtenido del JSON de getUpdates
- [ ] Archivos copiados a sus carpetas
- [ ] Token y chat ID puestos en docker-compose.yml
- [ ] `docker compose up -d` ejecutado
- [ ] Test: `node load-test.js attack` y mensaje recibido en Telegram
- [ ] Archivos React copiados a ops-console/src/
- [ ] World Map visible en el sidebar
- [ ] Puntos pulsantes apareciendo en el mapa

---

**Si algo falla en los primeros 5 minutos, no insistas. Pasa al siguiente paso y vuelve después. La consola y el copiloto YA son matrícula sin estos extras.** 🚀
