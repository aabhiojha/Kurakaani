import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const backendTarget = process.env.VITE_BACKEND_PROXY_TARGET ?? 'http://localhost:8080'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    global: 'globalThis',
  },
  server: {
    host: true, // allow external access
    port: 5173,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      'kurakaani.me',
      'www.kurakaani.me',
      'unalimentary-emilie-flamboyantly.ngrok-free.dev'
    ],
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true,
      },
      '/oauth2': {
        target: backendTarget,
        changeOrigin: true,
      },
      '/ws': {
        target: backendTarget,
        changeOrigin: true,
        ws: true,
      },
      '/storage': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/storage/, ''),
      },
    },
  },
})
