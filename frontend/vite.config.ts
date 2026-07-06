import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const backendTarget = process.env.VITE_BACKEND_PROXY_TARGET ?? 'http://localhost:8080'
const storageTarget = process.env.VITE_STORAGE_PROXY_TARGET ?? 'http://localhost:8000'

const allowedHosts = [
  'localhost',
  '127.0.0.1',
  'kurakaani.me',
  'www.kurakaani.me',
  'unalimentary-emilie-flamboyantly.ngrok-free.dev',
]

// Shared by both the dev server and `vite preview` (the Docker image runs preview).
const proxy = {
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
    target: storageTarget,
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/storage/, ''),
  },
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    global: 'globalThis',
  },
  server: {
    host: true, // allow external access
    port: 5173,
    allowedHosts,
    proxy,
  },
  preview: {
    host: true,
    port: 5173,
    allowedHosts,
    proxy,
  },
})
