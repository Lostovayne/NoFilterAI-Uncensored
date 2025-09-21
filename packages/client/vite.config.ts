import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

import path from 'path';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
   plugins: [react(), tailwindcss()],
   resolve: {
      alias: {
         '@': path.resolve(__dirname, './src'),
      },
   },
   build: {
      outDir: 'dist',
   },
   server: {
      proxy: {
         '/api': {
            target: 'http://localhost:3000',
            changeOrigin: true,
         },
         '/generated-images': {
            target: 'http://localhost:3000',
            changeOrigin: true,
         },
         '/generated-audio': {
            target: 'http://localhost:3000',
            changeOrigin: true,
         },
         '/generated-videos': {
            target: 'http://localhost:3000',
            changeOrigin: true,
         },
      },
   },
});
