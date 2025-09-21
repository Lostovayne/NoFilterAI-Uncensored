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
         '/api': 'http://localhost:3000',
         '/generated-images': 'http://localhost:3000',
      },
   },
});
