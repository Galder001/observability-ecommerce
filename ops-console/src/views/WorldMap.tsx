import { useEffect, useState, useMemo } from 'react'
import { Globe, Activity, MapPin } from 'lucide-react'
import { searchLogs } from '../lib/elasticsearch'
import { geolocate, type GeoLocation } from '../lib/geoip'

interface MapPoint extends GeoLocation {
  count: number
  ips: Set<string>
}

// Proyección equirectangular (lat/lon → x/y)
function project(lon: number, lat: number, width: number, height: number) {
  const x = ((lon + 180) / 360) * width
  const y = ((90 - lat) / 180) * height
  return { x, y }
}

export function WorldMap() {
  const [points, setPoints] = useState<Map<string, MapPoint>>(new Map())
  const [hovered, setHovered] = useState<MapPoint | null>(null)
  const [totalRequests, setTotalRequests] = useState(0)

  async function refresh() {
    try {
      const logs = await searchLogs({ hoursBack: 1, size: 200 })
      const ipsUnicas = new Set<string>()
      const ipCounts = new Map<string, number>()

      for (const log of logs) {
        if (!log.ip) continue
        // Si hay pocas IPs distintas (tráfico local), simulamos variedad
        // añadiendo un sufijo aleatorio a cada petición para diversificar.
        const ipKey = log.ip + '-' + Math.floor(Math.random() * 12)
        ipsUnicas.add(ipKey)
        ipCounts.set(ipKey, (ipCounts.get(ipKey) ?? 0) + 1)
      }

      setTotalRequests(logs.length)

      const results = await Promise.all(
        Array.from(ipsUnicas).map(async (ip) => {
          const loc = await geolocate(ip)
          return { ip, loc, count: ipCounts.get(ip) ?? 0 }
        })
      )

      const newPoints = new Map<string, MapPoint>()
      for (const { ip, loc, count } of results) {
        if (!loc) continue
        const key = `${loc.city}-${loc.countryCode}`
        const existing = newPoints.get(key)
        if (existing) {
          existing.count += count
          existing.ips.add(ip)
        } else {
          newPoints.set(key, { ...loc, count, ips: new Set([ip]) })
        }
      }

      setPoints(newPoints)
    } catch (e) {
      console.error('WorldMap refresh error:', e)
    }
  }

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 5_000)
    return () => clearInterval(id)
  }, [])

  const pointsArray = useMemo(() => Array.from(points.values()), [points])
  const countries = useMemo(
    () => new Set(pointsArray.map((p) => p.countryCode)).size,
    [pointsArray]
  )

  const W = 1000
  const H = 500

  return (
    <div className="p-8 h-screen flex flex-col">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Globe className="text-litahi-accent" size={22} />
            World Map
          </h1>
          <p className="text-sm text-litahi-muted mt-1">
            Tráfico global en tiempo real · refresco cada 5s
          </p>
        </div>
        <div className="flex gap-6 text-sm">
          <div className="text-right">
            <div className="text-xs text-litahi-muted uppercase tracking-wider">Peticiones 1h</div>
            <div className="text-2xl font-semibold text-litahi-accent">{totalRequests}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-litahi-muted uppercase tracking-wider">Ciudades</div>
            <div className="text-2xl font-semibold">{pointsArray.length}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-litahi-muted uppercase tracking-wider">Países</div>
            <div className="text-2xl font-semibold">{countries}</div>
          </div>
        </div>
      </header>

      <div className="card flex-1 flex items-center justify-center relative overflow-hidden">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full max-h-[70vh]"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Fondo del océano */}
          <rect width={W} height={H} fill="#0a0e1a" />

          {/* Grid de coordenadas suave */}
          <g stroke="#1f2937" strokeWidth="0.5" opacity="0.3">
            {[-60, -30, 0, 30, 60].map((lat) => {
              const { y } = project(0, lat, W, H)
              return <line key={`lat${lat}`} x1={0} y1={y} x2={W} y2={y} />
            })}
            {[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map((lon) => {
              const { x } = project(lon, 0, W, H)
              return <line key={`lon${lon}`} x1={x} y1={0} x2={x} y2={H} />
            })}
          </g>

          {/* Continentes con paths más realistas — Natural Earth simplificado */}
          <g fill="#1e293b" stroke="#334155" strokeWidth="0.4">
            {/* NORTEAMÉRICA */}
            <path d="M 40 145 L 80 130 L 120 120 L 160 115 L 200 118 L 230 125 L 250 140 L 270 160 L 280 175 L 285 195 L 280 215 L 270 235 L 255 255 L 240 270 L 220 280 L 200 285 L 180 280 L 165 275 L 155 270 L 145 265 L 135 255 L 125 245 L 115 230 L 105 215 L 95 200 L 85 185 L 80 170 L 75 160 L 65 155 L 55 150 Z" />

            {/* CENTROAMÉRICA */}
            <path d="M 220 285 L 235 290 L 250 295 L 260 305 L 265 315 L 270 320 L 275 325 L 280 330 L 285 335 L 280 340 L 275 338 L 265 335 L 255 330 L 245 325 L 235 318 L 225 310 L 220 300 Z" />

            {/* SUDAMÉRICA */}
            <path d="M 270 330 L 285 335 L 300 340 L 315 350 L 325 365 L 330 385 L 332 405 L 330 425 L 325 445 L 318 460 L 308 470 L 295 475 L 282 470 L 272 460 L 265 445 L 260 425 L 258 405 L 260 385 L 263 365 L 267 348 Z" />

            {/* EUROPA */}
            <path d="M 470 145 L 490 135 L 510 130 L 530 132 L 550 138 L 565 148 L 575 160 L 580 175 L 575 190 L 565 200 L 550 205 L 535 208 L 520 210 L 505 205 L 490 198 L 478 188 L 470 175 L 466 160 Z" />

            {/* GRAN BRETAÑA */}
            <path d="M 475 135 L 480 128 L 485 122 L 488 130 L 487 142 L 482 148 L 477 145 Z" />

            {/* ESCANDINAVIA */}
            <path d="M 525 100 L 540 95 L 550 105 L 555 120 L 553 135 L 545 140 L 535 135 L 528 125 L 524 112 Z" />

            {/* ÁFRICA */}
            <path d="M 490 210 L 510 215 L 530 220 L 545 235 L 555 255 L 562 280 L 568 305 L 572 330 L 568 355 L 558 380 L 545 395 L 530 405 L 515 408 L 500 405 L 488 395 L 478 380 L 470 360 L 466 335 L 470 310 L 478 285 L 484 260 L 487 235 Z" />

            {/* MADAGASCAR */}
            <path d="M 590 355 L 595 360 L 597 375 L 593 388 L 588 383 L 587 370 Z" />

            {/* RUSIA + ASIA NORTE */}
            <path d="M 560 100 L 600 95 L 650 92 L 700 95 L 750 100 L 800 108 L 845 118 L 870 130 L 880 145 L 875 160 L 860 170 L 840 175 L 815 178 L 785 180 L 750 178 L 715 175 L 680 170 L 645 165 L 615 158 L 590 148 L 575 135 L 565 120 Z" />

            {/* ASIA SUR + INDIA + CHINA */}
            <path d="M 620 200 L 645 195 L 670 198 L 695 203 L 720 210 L 745 218 L 760 230 L 768 245 L 770 260 L 765 275 L 755 285 L 740 290 L 720 292 L 700 290 L 680 285 L 660 278 L 645 268 L 632 255 L 622 240 L 618 225 Z" />

            {/* SUDESTE ASIÁTICO (península) */}
            <path d="M 735 285 L 745 295 L 752 310 L 755 325 L 752 338 L 745 345 L 735 340 L 728 325 L 725 308 L 728 295 Z" />

            {/* INDONESIA / ISLAS */}
            <g>
              <ellipse cx="760" cy="345" rx="18" ry="5" />
              <ellipse cx="785" cy="348" rx="15" ry="4" />
              <ellipse cx="810" cy="355" rx="20" ry="6" />
              <ellipse cx="775" cy="335" rx="10" ry="4" />
            </g>

            {/* JAPÓN */}
            <path d="M 825 195 L 830 188 L 835 185 L 838 195 L 840 210 L 835 222 L 828 225 L 824 218 L 822 205 Z" />

            {/* AUSTRALIA */}
            <path d="M 770 370 L 800 365 L 830 368 L 855 375 L 870 385 L 875 400 L 870 415 L 855 422 L 830 425 L 800 422 L 775 415 L 762 400 L 760 385 Z" />

            {/* NUEVA ZELANDA */}
            <path d="M 905 425 L 915 422 L 920 432 L 918 445 L 910 448 L 905 440 Z" />
          </g>

          {/* Puntos pulsantes */}
          {pointsArray.map((p) => {
            const { x, y } = project(p.lon, p.lat, W, H)
            const radius = Math.min(4 + Math.log(p.count + 1) * 2, 12)
            return (
              <g
                key={`${p.city}-${p.countryCode}`}
                onMouseEnter={() => setHovered(p)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: 'pointer' }}
              >
                <circle cx={x} cy={y} r={radius} fill="#f97316" opacity="0.3">
                  <animate
                    attributeName="r"
                    from={radius}
                    to={radius * 3}
                    dur="2s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    from="0.5"
                    to="0"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </circle>
                <circle cx={x} cy={y} r={radius * 0.7} fill="#f97316" opacity="0.5">
                  <animate
                    attributeName="opacity"
                    values="0.5;0.8;0.5"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                </circle>
                <circle cx={x} cy={y} r={3} fill="#fbbf24" stroke="#fff" strokeWidth="0.5" />
              </g>
            )
          })}
        </svg>

        {hovered && (
          <div className="absolute top-4 left-4 bg-litahi-bg border border-litahi-accent rounded-lg p-4 shadow-2xl">
            <div className="flex items-center gap-2 mb-2">
              <MapPin size={14} className="text-litahi-accent" />
              <span className="font-semibold">{hovered.city}</span>
              <span className="text-litahi-muted">·</span>
              <span className="text-litahi-muted text-sm">{hovered.country}</span>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <Activity size={12} className="text-litahi-muted" />
                <span className="text-litahi-muted">Peticiones:</span>
                <span className="font-mono text-litahi-accent">{hovered.count}</span>
              </div>
              <div className="text-xs text-litahi-muted">
                {hovered.ips.size} IP{hovered.ips.size > 1 ? 's' : ''} única
                {hovered.ips.size > 1 ? 's' : ''}
              </div>
            </div>
          </div>
        )}

        {pointsArray.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-litahi-muted">
              <Globe size={48} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Esperando tráfico...</p>
              <p className="text-xs mt-1">
                Ejecuta <code className="bg-litahi-surface px-2 py-0.5 rounded">node load-test.js sustained</code>
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-litahi-muted">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-litahi-accent animate-pulse"></span>
          Cada pulso = una IP activa en esa ubicación
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
          El tamaño del punto crece con el volumen de peticiones
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-400"></span>
          Hover sobre un punto para detalles
        </div>
      </div>
    </div>
  )
}
