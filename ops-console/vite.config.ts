import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// El proxy resuelve CORS sin tocar Prometheus/Elasticsearch/Ollama.
// En dev (vite dev) y en build estático servido por nginx (ver Dockerfile),
// el frontend hace fetch a /prom, /es, /ollama y nginx/vite reenvían a cada servicio.
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/prom': {
        target: 'http://localhost:9090',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/prom/, ''),
      },
      '/es': {
        target: 'http://localhost:9200',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/es/, ''),
      },
      '/ollama': {
        target: 'http://localhost:11434',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ollama/, ''),
      },
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
