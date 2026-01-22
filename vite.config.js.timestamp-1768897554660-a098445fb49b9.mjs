// vite.config.js
import { defineConfig } from "file:///C:/Users/Design_Bench_12/Documents/claude-loyalty-program/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/Design_Bench_12/Documents/claude-loyalty-program/node_modules/@vitejs/plugin-react/dist/index.mjs";
import path from "path";
var __vite_injected_original_dirname = "C:\\Users\\Design_Bench_12\\Documents\\claude-loyalty-program";
var vite_config_default = defineConfig({
  plugins: [react()],
  publicDir: "public",
  // Ensure public folder (including _redirects) is copied to dist
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
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
          "qr-features": ["qrcode", "barcode-detector"]
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
    include: ["react", "react-dom", "react-router-dom", "qrcode", "barcode-detector"],
    // Include for CommonJS → ESM conversion
    exclude: []
    // No exclusions needed
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV)
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxEZXNpZ25fQmVuY2hfMTJcXFxcRG9jdW1lbnRzXFxcXGNsYXVkZS1sb3lhbHR5LXByb2dyYW1cIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXERlc2lnbl9CZW5jaF8xMlxcXFxEb2N1bWVudHNcXFxcY2xhdWRlLWxveWFsdHktcHJvZ3JhbVxcXFx2aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvRGVzaWduX0JlbmNoXzEyL0RvY3VtZW50cy9jbGF1ZGUtbG95YWx0eS1wcm9ncmFtL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcclxuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xyXG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJ1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcclxuICBwbHVnaW5zOiBbcmVhY3QoKV0sXHJcbiAgcHVibGljRGlyOiAncHVibGljJywgLy8gRW5zdXJlIHB1YmxpYyBmb2xkZXIgKGluY2x1ZGluZyBfcmVkaXJlY3RzKSBpcyBjb3BpZWQgdG8gZGlzdFxyXG4gIHJlc29sdmU6IHtcclxuICAgIGFsaWFzOiB7XHJcbiAgICAgICdAJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjJylcclxuICAgIH1cclxuICB9LFxyXG4gIHNlcnZlcjoge1xyXG4gICAgcG9ydDogMzAwMCxcclxuICAgIGhvc3Q6IHRydWUsXHJcbiAgICBzdHJpY3RQb3J0OiB0cnVlLCAgLy8gRm9yY2UgcG9ydCAzMDAwLCBmYWlsIGlmIHVuYXZhaWxhYmxlXHJcbiAgICBhbGxvd2VkSG9zdHM6IFtcclxuICAgICAgJ2xvY2FsaG9zdCcsXHJcbiAgICAgICcxMjcuMC4wLjEnLFxyXG4gICAgICAnMTkyLjE2OC44LjExNCcsXHJcbiAgICAgICdmMTM5ZmY4NWRiNmEubmdyb2stZnJlZS5hcHAnLCAgLy8gWW91ciBuZ3JvayBob3N0XHJcbiAgICAgICcubmdyb2stZnJlZS5hcHAnLCAgICAgICAgICAgICAgLy8gQWxsb3cgYW55IG5ncm9rIHN1YmRvbWFpblxyXG4gICAgICAnLm5ncm9rLmlvJywgICAgICAgICAgICAgICAgICAgIC8vIEFsbG93IG5ncm9rLmlvIGRvbWFpbnMgdG9vXHJcbiAgICAgICcubmdyb2suYXBwJyAgICAgICAgICAgICAgICAgICAgLy8gQWxsb3cgbmdyb2suYXBwIGRvbWFpbnNcclxuICAgIF1cclxuICB9LFxyXG4gIGJ1aWxkOiB7XHJcbiAgICB0YXJnZXQ6ICdlc25leHQnLFxyXG4gICAgbWluaWZ5OiAnZXNidWlsZCcsIC8vIFVzZSBlc2J1aWxkIGZvciBmYXN0ZXIgYnVpbGRzICh0ZXJzZXIgcmVxdWlyZXMgc2VwYXJhdGUgaW5zdGFsbClcclxuICAgIHNvdXJjZW1hcDogZmFsc2UsXHJcbiAgICBjaHVua1NpemVXYXJuaW5nTGltaXQ6IDUwMCwgLy8gV2FybiBpZiBjaHVua3MgZXhjZWVkIDUwMEtCXHJcbiAgICByb2xsdXBPcHRpb25zOiB7XHJcbiAgICAgIG91dHB1dDoge1xyXG4gICAgICAgIG1hbnVhbENodW5rczoge1xyXG4gICAgICAgICAgLy8gQ29yZSBSZWFjdCBsaWJyYXJpZXMgLSBsb2FkZWQgb24gZXZlcnkgcGFnZVxyXG4gICAgICAgICAgJ3ZlbmRvci1yZWFjdCc6IFsncmVhY3QnLCAncmVhY3QtZG9tJ10sXHJcbiAgICAgICAgICAndmVuZG9yLXJvdXRlcic6IFsncmVhY3Qtcm91dGVyLWRvbSddLFxyXG5cclxuICAgICAgICAgIC8vIFVJIGxpYnJhcmllcyAtIGljb25zIGNhbiBiZSBxdWl0ZSBsYXJnZVxyXG4gICAgICAgICAgJ3ZlbmRvci1pY29ucyc6IFsnQGhlcm9pY29ucy9yZWFjdCddLFxyXG5cclxuICAgICAgICAgIC8vIFV0aWxpdHkgbGlicmFyaWVzXHJcbiAgICAgICAgICAndmVuZG9yLXV0aWxzJzogWydheGlvcycsICdjcnlwdG8tanMnLCAnZGF0ZS1mbnMnXSxcclxuXHJcbiAgICAgICAgICAvLyBRUiBmdW5jdGlvbmFsaXR5IC0gb25seSBuZWVkZWQgb24gc3BlY2lmaWMgcGFnZXNcclxuICAgICAgICAgICdxci1mZWF0dXJlcyc6IFsncXJjb2RlJywgJ2JhcmNvZGUtZGV0ZWN0b3InXSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIC8vIE9wdGltaXplIGNodW5rIG5hbWluZyBmb3IgYmV0dGVyIGNhY2hpbmdcclxuICAgICAgICBjaHVua0ZpbGVOYW1lczogJ2Fzc2V0cy9bbmFtZV0tW2hhc2hdLmpzJyxcclxuICAgICAgICBlbnRyeUZpbGVOYW1lczogJ2Fzc2V0cy9bbmFtZV0tW2hhc2hdLmpzJyxcclxuICAgICAgICBhc3NldEZpbGVOYW1lczogJ2Fzc2V0cy9bbmFtZV0tW2hhc2hdLltleHRdJ1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSxcclxuICAvLyBPcHRpbWl6ZSBkZXBlbmRlbmN5IHByZS1idW5kbGluZ1xyXG4gIG9wdGltaXplRGVwczoge1xyXG4gICAgaW5jbHVkZTogWydyZWFjdCcsICdyZWFjdC1kb20nLCAncmVhY3Qtcm91dGVyLWRvbScsICdxcmNvZGUnLCAnYmFyY29kZS1kZXRlY3RvciddLCAvLyBJbmNsdWRlIGZvciBDb21tb25KUyBcdTIxOTIgRVNNIGNvbnZlcnNpb25cclxuICAgIGV4Y2x1ZGU6IFtdIC8vIE5vIGV4Y2x1c2lvbnMgbmVlZGVkXHJcbiAgfSxcclxuICBkZWZpbmU6IHtcclxuICAgICdwcm9jZXNzLmVudi5OT0RFX0VOVic6IEpTT04uc3RyaW5naWZ5KHByb2Nlc3MuZW52Lk5PREVfRU5WKVxyXG4gIH1cclxufSkiXSwKICAibWFwcGluZ3MiOiAiO0FBQXVXLFNBQVMsb0JBQW9CO0FBQ3BZLE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7QUFGakIsSUFBTSxtQ0FBbUM7QUFJekMsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUyxDQUFDLE1BQU0sQ0FBQztBQUFBLEVBQ2pCLFdBQVc7QUFBQTtBQUFBLEVBQ1gsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsT0FBTztBQUFBLElBQ3RDO0FBQUEsRUFDRjtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sWUFBWTtBQUFBO0FBQUEsSUFDWixjQUFjO0FBQUEsTUFDWjtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBO0FBQUEsTUFDQTtBQUFBO0FBQUEsTUFDQTtBQUFBO0FBQUEsTUFDQTtBQUFBO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLE9BQU87QUFBQSxJQUNMLFFBQVE7QUFBQSxJQUNSLFFBQVE7QUFBQTtBQUFBLElBQ1IsV0FBVztBQUFBLElBQ1gsdUJBQXVCO0FBQUE7QUFBQSxJQUN2QixlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUEsUUFDTixjQUFjO0FBQUE7QUFBQSxVQUVaLGdCQUFnQixDQUFDLFNBQVMsV0FBVztBQUFBLFVBQ3JDLGlCQUFpQixDQUFDLGtCQUFrQjtBQUFBO0FBQUEsVUFHcEMsZ0JBQWdCLENBQUMsa0JBQWtCO0FBQUE7QUFBQSxVQUduQyxnQkFBZ0IsQ0FBQyxTQUFTLGFBQWEsVUFBVTtBQUFBO0FBQUEsVUFHakQsZUFBZSxDQUFDLFVBQVUsa0JBQWtCO0FBQUEsUUFDOUM7QUFBQTtBQUFBLFFBRUEsZ0JBQWdCO0FBQUEsUUFDaEIsZ0JBQWdCO0FBQUEsUUFDaEIsZ0JBQWdCO0FBQUEsTUFDbEI7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBO0FBQUEsRUFFQSxjQUFjO0FBQUEsSUFDWixTQUFTLENBQUMsU0FBUyxhQUFhLG9CQUFvQixVQUFVLGtCQUFrQjtBQUFBO0FBQUEsSUFDaEYsU0FBUyxDQUFDO0FBQUE7QUFBQSxFQUNaO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTix3QkFBd0IsS0FBSyxVQUFVLFFBQVEsSUFBSSxRQUFRO0FBQUEsRUFDN0Q7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
