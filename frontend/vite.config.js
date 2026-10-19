import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/auth': 'http://127.0.0.1:8000',
      '/services': 'http://127.0.0.1:8000',
      '/offices': 'http://127.0.0.1:8000',
      '/requests': 'http://127.0.0.1:8000',
      '/track': 'http://127.0.0.1:8000',
      '/appointments': 'http://127.0.0.1:8000',
      '/reports': 'http://127.0.0.1:8000',
      '/alerts': 'http://127.0.0.1:8000',
      '/staff': 'http://127.0.0.1:8000',
      '/health': 'http://127.0.0.1:8000',
    }
  }
})
