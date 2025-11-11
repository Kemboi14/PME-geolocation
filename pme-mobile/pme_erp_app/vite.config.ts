import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'www',
    minify: false,
    emptyOutDir: true,
  },
  server: {
    host: true,
    port: 3000,
    open: true,
    // Proxy /api requests to the real backend during development to avoid CORS
    proxy: {
      // forward /api/* to the backend root; this prevents browser CORS/preflight issues
      '/api': {
        target: 'https://ke.erpproject.online',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
        // follow redirects from target (do not expose redirects to browser preflight)
        configure: (proxy, options) => {
          // disable proxy's websockets handling
          proxy.on('proxyReq', (proxyReq) => {
            // ensure header forwarded
            proxyReq.setHeader('origin', 'https://ke.erpproject.online');
          });
        }
      }
    }
  },
});
