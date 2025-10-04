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
    minify: 'esbuild', // Use esbuild for faster builds (terser requires separate install)
    sourcemap: false,
    chunkSizeWarningLimit: 500, // Warn if chunks exceed 500KB
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React libraries - loaded on every page
          'vendor-react': ['react', 'react-dom'],
          'vendor-router': ['react-router-dom'],

          // UI libraries - icons can be quite large
          'vendor-icons': ['@heroicons/react'],

          // Utility libraries
          'vendor-utils': ['axios', 'crypto-js', 'date-fns'],

          // QR functionality - only needed on specific pages
          'qr-features': ['qrcode', 'qr-scanner'],
        },
        // Optimize chunk naming for better caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  },
  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
    exclude: ['qrcode', 'qr-scanner'] // Don't pre-bundle large QR libs
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
  }
})