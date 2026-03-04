import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => {
  const isServe = command === 'serve';
  return {
    // './' makes asset paths relative so Electron file:// works
    base: isServe ? '/' : './',
    server: {
      port: 3000,
    },
    plugins: [react()],
    envPrefix: 'VITE_',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
  };
});
