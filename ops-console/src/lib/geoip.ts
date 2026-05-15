// Geolocalización de IPs con caché en memoria.
// En desarrollo distribuimos las IPs por el mundo de forma determinista
// para tener una demo visualmente potente sin tráfico real desde internet.

interface GeoLocation {
  lat: number
  lon: number
  city: string
  country: string
  countryCode: string
}

const cache = new Map<string, GeoLocation | null>()

// Pool ampliado de ciudades en los 6 continentes
const DEMO_LOCATIONS: GeoLocation[] = [
  // Europa
  { lat: 40.4168, lon: -3.7038, city: 'Madrid', country: 'España', countryCode: 'ES' },
  { lat: 41.3851, lon: 2.1734, city: 'Barcelona', country: 'España', countryCode: 'ES' },
  { lat: 43.2630, lon: -2.9350, city: 'Bilbao', country: 'España', countryCode: 'ES' },
  { lat: 48.8566, lon: 2.3522, city: 'París', country: 'Francia', countryCode: 'FR' },
  { lat: 51.5074, lon: -0.1278, city: 'Londres', country: 'Reino Unido', countryCode: 'GB' },
  { lat: 52.52, lon: 13.405, city: 'Berlín', country: 'Alemania', countryCode: 'DE' },
  { lat: 41.9028, lon: 12.4964, city: 'Roma', country: 'Italia', countryCode: 'IT' },
  { lat: 52.3676, lon: 4.9041, city: 'Ámsterdam', country: 'Países Bajos', countryCode: 'NL' },
  { lat: 38.7223, lon: -9.1393, city: 'Lisboa', country: 'Portugal', countryCode: 'PT' },
  { lat: 59.3293, lon: 18.0686, city: 'Estocolmo', country: 'Suecia', countryCode: 'SE' },
  { lat: 55.7558, lon: 37.6173, city: 'Moscú', country: 'Rusia', countryCode: 'RU' },
  { lat: 50.0755, lon: 14.4378, city: 'Praga', country: 'República Checa', countryCode: 'CZ' },

  // Norteamérica
  { lat: 40.7128, lon: -74.006, city: 'Nueva York', country: 'EE.UU.', countryCode: 'US' },
  { lat: 34.0522, lon: -118.2437, city: 'Los Ángeles', country: 'EE.UU.', countryCode: 'US' },
  { lat: 41.8781, lon: -87.6298, city: 'Chicago', country: 'EE.UU.', countryCode: 'US' },
  { lat: 37.7749, lon: -122.4194, city: 'San Francisco', country: 'EE.UU.', countryCode: 'US' },
  { lat: 25.7617, lon: -80.1918, city: 'Miami', country: 'EE.UU.', countryCode: 'US' },
  { lat: 43.6532, lon: -79.3832, city: 'Toronto', country: 'Canadá', countryCode: 'CA' },
  { lat: 19.4326, lon: -99.1332, city: 'CDMX', country: 'México', countryCode: 'MX' },

  // Sudamérica
  { lat: -23.5505, lon: -46.6333, city: 'São Paulo', country: 'Brasil', countryCode: 'BR' },
  { lat: -34.6037, lon: -58.3816, city: 'Buenos Aires', country: 'Argentina', countryCode: 'AR' },
  { lat: 4.7110, lon: -74.0721, city: 'Bogotá', country: 'Colombia', countryCode: 'CO' },
  { lat: -12.0464, lon: -77.0428, city: 'Lima', country: 'Perú', countryCode: 'PE' },
  { lat: -33.4489, lon: -70.6693, city: 'Santiago', country: 'Chile', countryCode: 'CL' },

  // Asia
  { lat: 35.6762, lon: 139.6503, city: 'Tokio', country: 'Japón', countryCode: 'JP' },
  { lat: 39.9042, lon: 116.4074, city: 'Pekín', country: 'China', countryCode: 'CN' },
  { lat: 31.2304, lon: 121.4737, city: 'Shanghái', country: 'China', countryCode: 'CN' },
  { lat: 22.3193, lon: 114.1694, city: 'Hong Kong', country: 'China', countryCode: 'HK' },
  { lat: 1.3521, lon: 103.8198, city: 'Singapur', country: 'Singapur', countryCode: 'SG' },
  { lat: 19.0760, lon: 72.8777, city: 'Bombay', country: 'India', countryCode: 'IN' },
  { lat: 28.6139, lon: 77.2090, city: 'Nueva Delhi', country: 'India', countryCode: 'IN' },
  { lat: 37.5665, lon: 126.9780, city: 'Seúl', country: 'Corea del Sur', countryCode: 'KR' },
  { lat: 25.2048, lon: 55.2708, city: 'Dubái', country: 'Emiratos Árabes', countryCode: 'AE' },
  { lat: 13.7563, lon: 100.5018, city: 'Bangkok', country: 'Tailandia', countryCode: 'TH' },

  // África
  { lat: 30.0444, lon: 31.2357, city: 'El Cairo', country: 'Egipto', countryCode: 'EG' },
  { lat: -33.9249, lon: 18.4241, city: 'Ciudad del Cabo', country: 'Sudáfrica', countryCode: 'ZA' },
  { lat: -1.2921, lon: 36.8219, city: 'Nairobi', country: 'Kenia', countryCode: 'KE' },
  { lat: 6.5244, lon: 3.3792, city: 'Lagos', country: 'Nigeria', countryCode: 'NG' },
  { lat: 33.5731, lon: -7.5898, city: 'Casablanca', country: 'Marruecos', countryCode: 'MA' },

  // Oceanía
  { lat: -33.8688, lon: 151.2093, city: 'Sídney', country: 'Australia', countryCode: 'AU' },
  { lat: -37.8136, lon: 144.9631, city: 'Melbourne', country: 'Australia', countryCode: 'AU' },
  { lat: -36.8485, lon: 174.7633, city: 'Auckland', country: 'Nueva Zelanda', countryCode: 'NZ' },
]

function isLocalIP(ip: string): boolean {
  return (
    ip.startsWith('127.') ||
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    ip.startsWith('172.') ||
    ip === '::1' ||
    ip === 'localhost' ||
    ip.includes('::ffff:')
  )
}

// Hash determinista: misma IP siempre da misma ciudad
function hashToLocation(ip: string): GeoLocation {
  let hash = 0
  for (let i = 0; i < ip.length; i++) {
    hash = (hash << 5) - hash + ip.charCodeAt(i)
    hash |= 0
  }
  const idx = Math.abs(hash) % DEMO_LOCATIONS.length
  return DEMO_LOCATIONS[idx]
}

export async function geolocate(ip: string): Promise<GeoLocation | null> {
  if (!ip) return null
  if (cache.has(ip)) return cache.get(ip) ?? null

  if (isLocalIP(ip) || ip.includes('-')) {
    // Las IPs con "-" son nuestras IPs sintéticas para distribución demo
    const loc = hashToLocation(ip)
    cache.set(ip, loc)
    return loc
  }

  try {
    const res = await fetch(
      `https://ip-api.com/json/${ip}?fields=status,country,countryCode,city,lat,lon`
    )
    const data = await res.json()
    if (data.status !== 'success') {
      cache.set(ip, null)
      return null
    }
    const loc: GeoLocation = {
      lat: data.lat,
      lon: data.lon,
      city: data.city,
      country: data.country,
      countryCode: data.countryCode,
    }
    cache.set(ip, loc)
    return loc
  } catch {
    cache.set(ip, null)
    return null
  }
}

export type { GeoLocation }
