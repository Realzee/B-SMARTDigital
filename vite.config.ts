import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ command }) => {
  const isNativeBuild = process.env.VITE_NATIVE_BUILD === 'true';
  const resolvedBase = isNativeBuild
    ? './'
    : process.env.VITE_BASE_PATH || (command === 'build' ? '/app/' : '/');
  const normalizedBase = resolvedBase.endsWith('/') ? resolvedBase : `${resolvedBase}/`;

  const nativePwaStubPlugin = {
    name: 'bsmart-native-pwa-stub',
    resolveId(id: string) {
      if (id === 'virtual:pwa-register') return '\0virtual:pwa-register';
      return null;
    },
    load(id: string) {
      if (id === '\0virtual:pwa-register') {
        return 'export function registerSW() { return () => Promise.resolve(); }';
      }
      return null;
    },
  };

  return {
    base: normalizedBase,
    plugins: [
      react(),
      tailwindcss(),
      ...(isNativeBuild
        ? [nativePwaStubPlugin]
        : [
            VitePWA({
              registerType: 'autoUpdate',
              includeAssets: [
                'favicon.ico',
                'favicon.png',
                'apple-touch-icon.png',
                'pwa-192x192.png',
                'pwa-512x512.png',
                'pwa-maskable-512x512.png',
              ],
        manifest: {
          id: normalizedBase,
          name: 'B-SMART™ Digital Smart Communicator',
          short_name: 'B-SMART™',
          description: 'Official enterprise digital smart business communicator platform for team member cards, templates, schedules, and offline lead capture.',
          theme_color: '#0284c7',
          background_color: '#020617',
          display: 'standalone',
          orientation: 'any',
          start_url: normalizedBase,
          scope: normalizedBase,
          icons: [
            {
              src: `${normalizedBase}pwa-192x192.png`,
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: `${normalizedBase}pwa-512x512.png`,
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: `${normalizedBase}pwa-maskable-512x512.png`,
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,webp,webmanifest}'],
          globIgnores: ['cpanel_app_*', '**/*.zip', '**/*.tar.gz'],
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          navigateFallback: `${normalizedBase}index.html`,
          navigateFallbackDenylist: [
            /^\/api\//,
            /^\/app\/api\//,
            /^\/bundle/,
            /^\/app\/bundle/,
            /^\/presentation/,
            /^\/app\/presentation/,
            /^\/B-SMART-Presentation/,
            /^\/app\/B-SMART-Presentation/,
            /^\/cpanel_app_/,
            /^\/app\/cpanel_app_/,
          ],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-stylesheets',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: ({ url }) =>
                url.pathname.startsWith('/uploads/') ||
                url.pathname.startsWith('/app/uploads/') ||
                url.pathname.startsWith('/assets/'),
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'bsmart-media-cache',
                expiration: {
                  maxEntries: 250,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: ({ url }) =>
                url.pathname.startsWith('/api/') || url.pathname.startsWith('/app/api/'),
              handler: 'NetworkOnly',
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
          ]),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: false,
    },
  };
});
