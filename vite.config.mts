import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    tailwindcss(),
    react({
      babel: {
        plugins: process.env.CYPRESS_COVERAGE ? ['istanbul'] : [],
      },
    }),
  ],
  server: {
    port: 3000,
  },
  build: {
    outDir: 'build',
  },
});
