import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    strictPort: true,  // Force port 3000, fail if unavailable
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '192.168.8.114',
      'f139ff85db6a.ngrok-free.app',  // Your ngrok host
      '.ngrok-free.app',              // Allow any ngrok subdomain
      '.ngrok.io',                    // Allow ngrok.io domains too
      '.ngrok.app'                    // Allow ngrok.app domains
    ]
  }
})