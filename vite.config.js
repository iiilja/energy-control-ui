import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiHost = env.API_HOST || 'http://localhost:8080'

  return {
    plugins: [react()],
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: apiHost,
          changeOrigin: true,
        },
        '/modbus-api': {
          target: apiHost,
          changeOrigin: true,
        }
      }
    }
  }
})
