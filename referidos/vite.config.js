import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => {
  const isDev = command === 'serve'  // En local = true, en build = false

  return {
    plugins: [react()],
    base: isDev ? '/' : '/vitaesentiaref/',
    server: {
      proxy: {
        '/api': {
          target: 'https://igrafic360.net/referidos-api',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    }
  }
})