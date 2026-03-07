import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  css: {
    modules: {
      generateScopedName: (name: string, filename: string) => {
        const base = filename.split('/').pop()!.replace(/\.module\.\w+$/, '');
        return `${base}_${name}`;
      },
    },
  },
  server: {
    port: 3000,
  },
});
