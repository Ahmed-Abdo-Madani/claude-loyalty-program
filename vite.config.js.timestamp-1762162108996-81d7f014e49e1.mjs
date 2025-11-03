// vite.config.js
import { defineConfig } from "file:///C:/Users/Design_Bench_12/Documents/claude-loyalty-program/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/Design_Bench_12/Documents/claude-loyalty-program/node_modules/@vitejs/plugin-react/dist/index.mjs";
var vite_config_default = defineConfig({
  plugins: [react()],
  publicDir: "public",
  // Ensure public folder (including _redirects) is copied to dist
  server: {
    port: 3e3,
    host: true,
    strictPort: true,
    // Force port 3000, fail if unavailable
    allowedHosts: [
      "localhost",
      "127.0.0.1",
      "192.168.8.114",
      "f139ff85db6a.ngrok-free.app",
      // Your ngrok host
      ".ngrok-free.app",
      // Allow any ngrok subdomain
      ".ngrok.io",
      // Allow ngrok.io domains too
      ".ngrok.app"
      // Allow ngrok.app domains
    ]
  },
  build: {
    target: "esnext",
    minify: "esbuild",
    // Use esbuild for faster builds (terser requires separate install)
    sourcemap: false,
    chunkSizeWarningLimit: 500,
    // Warn if chunks exceed 500KB
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React libraries - loaded on every page
          "vendor-react": ["react", "react-dom"],
          "vendor-router": ["react-router-dom"],
          // UI libraries - icons can be quite large
          "vendor-icons": ["@heroicons/react"],
          // Utility libraries
          "vendor-utils": ["axios", "crypto-js", "date-fns"],
          // QR functionality - only needed on specific pages
          "qr-features": ["qrcode", "qr-scanner"]
        },
        // Optimize chunk naming for better caching
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]"
      }
    }
  },
  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom", "qrcode"],
    // Include qrcode for CommonJS → ESM conversion
    exclude: ["qr-scanner"]
    // Exclude qr-scanner only
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV)
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxEZXNpZ25fQmVuY2hfMTJcXFxcRG9jdW1lbnRzXFxcXGNsYXVkZS1sb3lhbHR5LXByb2dyYW1cIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXERlc2lnbl9CZW5jaF8xMlxcXFxEb2N1bWVudHNcXFxcY2xhdWRlLWxveWFsdHktcHJvZ3JhbVxcXFx2aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvRGVzaWduX0JlbmNoXzEyL0RvY3VtZW50cy9jbGF1ZGUtbG95YWx0eS1wcm9ncmFtL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCdcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW3JlYWN0KCldLFxuICBwdWJsaWNEaXI6ICdwdWJsaWMnLCAvLyBFbnN1cmUgcHVibGljIGZvbGRlciAoaW5jbHVkaW5nIF9yZWRpcmVjdHMpIGlzIGNvcGllZCB0byBkaXN0XG4gIHNlcnZlcjoge1xuICAgIHBvcnQ6IDMwMDAsXG4gICAgaG9zdDogdHJ1ZSxcbiAgICBzdHJpY3RQb3J0OiB0cnVlLCAgLy8gRm9yY2UgcG9ydCAzMDAwLCBmYWlsIGlmIHVuYXZhaWxhYmxlXG4gICAgYWxsb3dlZEhvc3RzOiBbXG4gICAgICAnbG9jYWxob3N0JyxcbiAgICAgICcxMjcuMC4wLjEnLFxuICAgICAgJzE5Mi4xNjguOC4xMTQnLFxuICAgICAgJ2YxMzlmZjg1ZGI2YS5uZ3Jvay1mcmVlLmFwcCcsICAvLyBZb3VyIG5ncm9rIGhvc3RcbiAgICAgICcubmdyb2stZnJlZS5hcHAnLCAgICAgICAgICAgICAgLy8gQWxsb3cgYW55IG5ncm9rIHN1YmRvbWFpblxuICAgICAgJy5uZ3Jvay5pbycsICAgICAgICAgICAgICAgICAgICAvLyBBbGxvdyBuZ3Jvay5pbyBkb21haW5zIHRvb1xuICAgICAgJy5uZ3Jvay5hcHAnICAgICAgICAgICAgICAgICAgICAvLyBBbGxvdyBuZ3Jvay5hcHAgZG9tYWluc1xuICAgIF1cbiAgfSxcbiAgYnVpbGQ6IHtcbiAgICB0YXJnZXQ6ICdlc25leHQnLFxuICAgIG1pbmlmeTogJ2VzYnVpbGQnLCAvLyBVc2UgZXNidWlsZCBmb3IgZmFzdGVyIGJ1aWxkcyAodGVyc2VyIHJlcXVpcmVzIHNlcGFyYXRlIGluc3RhbGwpXG4gICAgc291cmNlbWFwOiBmYWxzZSxcbiAgICBjaHVua1NpemVXYXJuaW5nTGltaXQ6IDUwMCwgLy8gV2FybiBpZiBjaHVua3MgZXhjZWVkIDUwMEtCXG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgb3V0cHV0OiB7XG4gICAgICAgIG1hbnVhbENodW5rczoge1xuICAgICAgICAgIC8vIENvcmUgUmVhY3QgbGlicmFyaWVzIC0gbG9hZGVkIG9uIGV2ZXJ5IHBhZ2VcbiAgICAgICAgICAndmVuZG9yLXJlYWN0JzogWydyZWFjdCcsICdyZWFjdC1kb20nXSxcbiAgICAgICAgICAndmVuZG9yLXJvdXRlcic6IFsncmVhY3Qtcm91dGVyLWRvbSddLFxuXG4gICAgICAgICAgLy8gVUkgbGlicmFyaWVzIC0gaWNvbnMgY2FuIGJlIHF1aXRlIGxhcmdlXG4gICAgICAgICAgJ3ZlbmRvci1pY29ucyc6IFsnQGhlcm9pY29ucy9yZWFjdCddLFxuXG4gICAgICAgICAgLy8gVXRpbGl0eSBsaWJyYXJpZXNcbiAgICAgICAgICAndmVuZG9yLXV0aWxzJzogWydheGlvcycsICdjcnlwdG8tanMnLCAnZGF0ZS1mbnMnXSxcblxuICAgICAgICAgIC8vIFFSIGZ1bmN0aW9uYWxpdHkgLSBvbmx5IG5lZWRlZCBvbiBzcGVjaWZpYyBwYWdlc1xuICAgICAgICAgICdxci1mZWF0dXJlcyc6IFsncXJjb2RlJywgJ3FyLXNjYW5uZXInXSxcbiAgICAgICAgfSxcbiAgICAgICAgLy8gT3B0aW1pemUgY2h1bmsgbmFtaW5nIGZvciBiZXR0ZXIgY2FjaGluZ1xuICAgICAgICBjaHVua0ZpbGVOYW1lczogJ2Fzc2V0cy9bbmFtZV0tW2hhc2hdLmpzJyxcbiAgICAgICAgZW50cnlGaWxlTmFtZXM6ICdhc3NldHMvW25hbWVdLVtoYXNoXS5qcycsXG4gICAgICAgIGFzc2V0RmlsZU5hbWVzOiAnYXNzZXRzL1tuYW1lXS1baGFzaF0uW2V4dF0nXG4gICAgICB9XG4gICAgfVxuICB9LFxuICAvLyBPcHRpbWl6ZSBkZXBlbmRlbmN5IHByZS1idW5kbGluZ1xuICBvcHRpbWl6ZURlcHM6IHtcbiAgICBpbmNsdWRlOiBbJ3JlYWN0JywgJ3JlYWN0LWRvbScsICdyZWFjdC1yb3V0ZXItZG9tJywgJ3FyY29kZSddLCAvLyBJbmNsdWRlIHFyY29kZSBmb3IgQ29tbW9uSlMgXHUyMTkyIEVTTSBjb252ZXJzaW9uXG4gICAgZXhjbHVkZTogWydxci1zY2FubmVyJ10gLy8gRXhjbHVkZSBxci1zY2FubmVyIG9ubHlcbiAgfSxcbiAgZGVmaW5lOiB7XG4gICAgJ3Byb2Nlc3MuZW52Lk5PREVfRU5WJzogSlNPTi5zdHJpbmdpZnkocHJvY2Vzcy5lbnYuTk9ERV9FTlYpXG4gIH1cbn0pIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF1VyxTQUFTLG9CQUFvQjtBQUNwWSxPQUFPLFdBQVc7QUFFbEIsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUyxDQUFDLE1BQU0sQ0FBQztBQUFBLEVBQ2pCLFdBQVc7QUFBQTtBQUFBLEVBQ1gsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sWUFBWTtBQUFBO0FBQUEsSUFDWixjQUFjO0FBQUEsTUFDWjtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBO0FBQUEsTUFDQTtBQUFBO0FBQUEsTUFDQTtBQUFBO0FBQUEsTUFDQTtBQUFBO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLE9BQU87QUFBQSxJQUNMLFFBQVE7QUFBQSxJQUNSLFFBQVE7QUFBQTtBQUFBLElBQ1IsV0FBVztBQUFBLElBQ1gsdUJBQXVCO0FBQUE7QUFBQSxJQUN2QixlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUEsUUFDTixjQUFjO0FBQUE7QUFBQSxVQUVaLGdCQUFnQixDQUFDLFNBQVMsV0FBVztBQUFBLFVBQ3JDLGlCQUFpQixDQUFDLGtCQUFrQjtBQUFBO0FBQUEsVUFHcEMsZ0JBQWdCLENBQUMsa0JBQWtCO0FBQUE7QUFBQSxVQUduQyxnQkFBZ0IsQ0FBQyxTQUFTLGFBQWEsVUFBVTtBQUFBO0FBQUEsVUFHakQsZUFBZSxDQUFDLFVBQVUsWUFBWTtBQUFBLFFBQ3hDO0FBQUE7QUFBQSxRQUVBLGdCQUFnQjtBQUFBLFFBQ2hCLGdCQUFnQjtBQUFBLFFBQ2hCLGdCQUFnQjtBQUFBLE1BQ2xCO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQTtBQUFBLEVBRUEsY0FBYztBQUFBLElBQ1osU0FBUyxDQUFDLFNBQVMsYUFBYSxvQkFBb0IsUUFBUTtBQUFBO0FBQUEsSUFDNUQsU0FBUyxDQUFDLFlBQVk7QUFBQTtBQUFBLEVBQ3hCO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTix3QkFBd0IsS0FBSyxVQUFVLFFBQVEsSUFBSSxRQUFRO0FBQUEsRUFDN0Q7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
