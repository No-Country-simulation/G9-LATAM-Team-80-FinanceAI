import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5174,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:8080',
      // Equivalente en desarrollo a la pasarela /oven-api/ de nginx: permite probar el modo
      // sin CORS ejecutando `npm run dev` con VITE_OVEN_API_URL=/oven-api.
      '/oven-api': {
        target: 'https://oven-dandia-nwlcfzg7s-dandia-source.vercel.app',
        changeOrigin: true,
        secure: true,
        rewrite: (ruta) => ruta.replace(/^\/oven-api/, '')
      }
    }
  }
});
