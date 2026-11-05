import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base relativa: funciona en GitHub Pages (/x-ray-test/) y en local sin cambios
export default defineConfig({
  plugins: [react()],
  base: './',
  build: { chunkSizeWarningLimit: 1200 },
});
