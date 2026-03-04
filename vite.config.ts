import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ command, mode }) => {
  const isServe = command === 'serve';
  const isElectron = mode === 'electron';

  return {
    // './' for Electron file://, '/' for web deployment
    base: isElectron ? './' : '/',
    server: {
      port: 3000,
      host: isServe && isElectron ? false : true, // LAN apenas para web, localhost para Electron dev
    },
    plugins: [
      react(),
      // PWA apenas no build web (não no Electron)
      ...(!isElectron
        ? [
            VitePWA({
              registerType: 'autoUpdate',
              includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
              manifest: {
                name: 'FrotaGestor Pro',
                short_name: 'FrotaGestor',
                description: 'Sistema de Gestão de Frotas — SARTINFO',
                theme_color: '#1e293b',
                background_color: '#f8fafc',
                display: 'standalone',
                orientation: 'any',
                start_url: '/',
                scope: '/',
                icons: [
                  { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
                  { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
                  { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
                ],
              },
              workbox: {
                globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
                runtimeCaching: [
                  {
                    urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
                    handler: 'CacheFirst',
                    options: {
                      cacheName: 'google-fonts',
                      expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
                    },
                  },
                ],
              },
            }),
          ]
        : []),
    ],
    define: {
      __IS_ELECTRON__: JSON.stringify(isElectron),
    },
    envPrefix: 'VITE_',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      outDir: isElectron ? 'dist' : 'dist-web',
      sourcemap: false,
    },
  };
});
