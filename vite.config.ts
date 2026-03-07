import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import istanbul from 'vite-plugin-istanbul';

export default defineConfig({
  plugins: [
    react(),
    istanbul({
      include: 'src/**/*',
      exclude: ['node_modules', 'cypress/'],
      extension: ['.ts', '.tsx'],
      requireEnv: false,
    }),
  ],
  server: {
    port: 3000,
  },
});
