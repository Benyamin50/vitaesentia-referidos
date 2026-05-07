import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/VitaesentiaRef/',  // ← IMPORTANTE para subcarpeta
  server: {
    proxy: {
      '/api': {
        target: 'https://igrafic360.net/referidos-api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})