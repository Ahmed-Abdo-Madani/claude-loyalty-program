// vite.config.js
import { defineConfig } from "file:///home/doni/Documents/claude-loyalty-program/node_modules/vite/dist/node/index.js";
import react from "file:///home/doni/Documents/claude-loyalty-program/node_modules/@vitejs/plugin-react/dist/index.mjs";
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9kb25pL0RvY3VtZW50cy9jbGF1ZGUtbG95YWx0eS1wcm9ncmFtXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9kb25pL0RvY3VtZW50cy9jbGF1ZGUtbG95YWx0eS1wcm9ncmFtL3ZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL2RvbmkvRG9jdW1lbnRzL2NsYXVkZS1sb3lhbHR5LXByb2dyYW0vdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbcmVhY3QoKV0sXG4gIHB1YmxpY0RpcjogJ3B1YmxpYycsIC8vIEVuc3VyZSBwdWJsaWMgZm9sZGVyIChpbmNsdWRpbmcgX3JlZGlyZWN0cykgaXMgY29waWVkIHRvIGRpc3RcbiAgc2VydmVyOiB7XG4gICAgcG9ydDogMzAwMCxcbiAgICBob3N0OiB0cnVlLFxuICAgIHN0cmljdFBvcnQ6IHRydWUsICAvLyBGb3JjZSBwb3J0IDMwMDAsIGZhaWwgaWYgdW5hdmFpbGFibGVcbiAgICBhbGxvd2VkSG9zdHM6IFtcbiAgICAgICdsb2NhbGhvc3QnLFxuICAgICAgJzEyNy4wLjAuMScsXG4gICAgICAnMTkyLjE2OC44LjExNCcsXG4gICAgICAnZjEzOWZmODVkYjZhLm5ncm9rLWZyZWUuYXBwJywgIC8vIFlvdXIgbmdyb2sgaG9zdFxuICAgICAgJy5uZ3Jvay1mcmVlLmFwcCcsICAgICAgICAgICAgICAvLyBBbGxvdyBhbnkgbmdyb2sgc3ViZG9tYWluXG4gICAgICAnLm5ncm9rLmlvJywgICAgICAgICAgICAgICAgICAgIC8vIEFsbG93IG5ncm9rLmlvIGRvbWFpbnMgdG9vXG4gICAgICAnLm5ncm9rLmFwcCcgICAgICAgICAgICAgICAgICAgIC8vIEFsbG93IG5ncm9rLmFwcCBkb21haW5zXG4gICAgXVxuICB9LFxuICBidWlsZDoge1xuICAgIHRhcmdldDogJ2VzbmV4dCcsXG4gICAgbWluaWZ5OiAnZXNidWlsZCcsIC8vIFVzZSBlc2J1aWxkIGZvciBmYXN0ZXIgYnVpbGRzICh0ZXJzZXIgcmVxdWlyZXMgc2VwYXJhdGUgaW5zdGFsbClcbiAgICBzb3VyY2VtYXA6IGZhbHNlLFxuICAgIGNodW5rU2l6ZVdhcm5pbmdMaW1pdDogNTAwLCAvLyBXYXJuIGlmIGNodW5rcyBleGNlZWQgNTAwS0JcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICBvdXRwdXQ6IHtcbiAgICAgICAgbWFudWFsQ2h1bmtzOiB7XG4gICAgICAgICAgLy8gQ29yZSBSZWFjdCBsaWJyYXJpZXMgLSBsb2FkZWQgb24gZXZlcnkgcGFnZVxuICAgICAgICAgICd2ZW5kb3ItcmVhY3QnOiBbJ3JlYWN0JywgJ3JlYWN0LWRvbSddLFxuICAgICAgICAgICd2ZW5kb3Itcm91dGVyJzogWydyZWFjdC1yb3V0ZXItZG9tJ10sXG5cbiAgICAgICAgICAvLyBVSSBsaWJyYXJpZXMgLSBpY29ucyBjYW4gYmUgcXVpdGUgbGFyZ2VcbiAgICAgICAgICAndmVuZG9yLWljb25zJzogWydAaGVyb2ljb25zL3JlYWN0J10sXG5cbiAgICAgICAgICAvLyBVdGlsaXR5IGxpYnJhcmllc1xuICAgICAgICAgICd2ZW5kb3ItdXRpbHMnOiBbJ2F4aW9zJywgJ2NyeXB0by1qcycsICdkYXRlLWZucyddLFxuXG4gICAgICAgICAgLy8gUVIgZnVuY3Rpb25hbGl0eSAtIG9ubHkgbmVlZGVkIG9uIHNwZWNpZmljIHBhZ2VzXG4gICAgICAgICAgJ3FyLWZlYXR1cmVzJzogWydxcmNvZGUnLCAncXItc2Nhbm5lciddLFxuICAgICAgICB9LFxuICAgICAgICAvLyBPcHRpbWl6ZSBjaHVuayBuYW1pbmcgZm9yIGJldHRlciBjYWNoaW5nXG4gICAgICAgIGNodW5rRmlsZU5hbWVzOiAnYXNzZXRzL1tuYW1lXS1baGFzaF0uanMnLFxuICAgICAgICBlbnRyeUZpbGVOYW1lczogJ2Fzc2V0cy9bbmFtZV0tW2hhc2hdLmpzJyxcbiAgICAgICAgYXNzZXRGaWxlTmFtZXM6ICdhc3NldHMvW25hbWVdLVtoYXNoXS5bZXh0XSdcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIC8vIE9wdGltaXplIGRlcGVuZGVuY3kgcHJlLWJ1bmRsaW5nXG4gIG9wdGltaXplRGVwczoge1xuICAgIGluY2x1ZGU6IFsncmVhY3QnLCAncmVhY3QtZG9tJywgJ3JlYWN0LXJvdXRlci1kb20nLCAncXJjb2RlJ10sIC8vIEluY2x1ZGUgcXJjb2RlIGZvciBDb21tb25KUyBcdTIxOTIgRVNNIGNvbnZlcnNpb25cbiAgICBleGNsdWRlOiBbJ3FyLXNjYW5uZXInXSAvLyBFeGNsdWRlIHFyLXNjYW5uZXIgb25seVxuICB9LFxuICBkZWZpbmU6IHtcbiAgICAncHJvY2Vzcy5lbnYuTk9ERV9FTlYnOiBKU09OLnN0cmluZ2lmeShwcm9jZXNzLmVudi5OT0RFX0VOVilcbiAgfVxufSkiXSwKICAibWFwcGluZ3MiOiAiO0FBQW1ULFNBQVMsb0JBQW9CO0FBQ2hWLE9BQU8sV0FBVztBQUVsQixJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsTUFBTSxDQUFDO0FBQUEsRUFDakIsV0FBVztBQUFBO0FBQUEsRUFDWCxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixZQUFZO0FBQUE7QUFBQSxJQUNaLGNBQWM7QUFBQSxNQUNaO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUE7QUFBQSxNQUNBO0FBQUE7QUFBQSxNQUNBO0FBQUE7QUFBQSxNQUNBO0FBQUE7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ0wsUUFBUTtBQUFBLElBQ1IsUUFBUTtBQUFBO0FBQUEsSUFDUixXQUFXO0FBQUEsSUFDWCx1QkFBdUI7QUFBQTtBQUFBLElBQ3ZCLGVBQWU7QUFBQSxNQUNiLFFBQVE7QUFBQSxRQUNOLGNBQWM7QUFBQTtBQUFBLFVBRVosZ0JBQWdCLENBQUMsU0FBUyxXQUFXO0FBQUEsVUFDckMsaUJBQWlCLENBQUMsa0JBQWtCO0FBQUE7QUFBQSxVQUdwQyxnQkFBZ0IsQ0FBQyxrQkFBa0I7QUFBQTtBQUFBLFVBR25DLGdCQUFnQixDQUFDLFNBQVMsYUFBYSxVQUFVO0FBQUE7QUFBQSxVQUdqRCxlQUFlLENBQUMsVUFBVSxZQUFZO0FBQUEsUUFDeEM7QUFBQTtBQUFBLFFBRUEsZ0JBQWdCO0FBQUEsUUFDaEIsZ0JBQWdCO0FBQUEsUUFDaEIsZ0JBQWdCO0FBQUEsTUFDbEI7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBO0FBQUEsRUFFQSxjQUFjO0FBQUEsSUFDWixTQUFTLENBQUMsU0FBUyxhQUFhLG9CQUFvQixRQUFRO0FBQUE7QUFBQSxJQUM1RCxTQUFTLENBQUMsWUFBWTtBQUFBO0FBQUEsRUFDeEI7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNOLHdCQUF3QixLQUFLLFVBQVUsUUFBUSxJQUFJLFFBQVE7QUFBQSxFQUM3RDtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
