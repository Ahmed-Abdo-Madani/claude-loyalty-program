import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  publicDir: 'public', // Ensure public folder (including _redirects) is copied to dist
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
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          utils: ['axios', 'crypto-js']
        }
      }
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
  }
})