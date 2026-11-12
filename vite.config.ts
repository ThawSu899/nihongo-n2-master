import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

import fs from 'fs';

function copyCurriculumContentPlugin(): import('vite').Plugin {
  return {
    name: 'copy-curriculum-content',
    generateBundle() {
      const contentDir = path.resolve(import.meta.dirname, 'content');
      const addFiles = (dir: string, baseDir: string) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
          if (entry.isDirectory()) {
            addFiles(fullPath, baseDir);
          } else if (entry.isFile() && entry.name.endsWith('.json')) {
            const content = fs.readFileSync(fullPath, 'utf-8');
            this.emitFile({
              type: 'asset',
              fileName: `content/${relPath}`,
              source: content,
            });
          }
        }
      };
      if (fs.existsSync(contentDir)) {
        addFiles(contentDir, contentDir);
      }
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      copyCurriculumContentPlugin(),
      VitePWA({
        registerType: 'prompt',
        injectRegister: 'script',
        manifest: false,
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg', 'manifest.webmanifest'],
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,json,mp3,wav,ogg,m4a}'],
          maximumFileSizeToCacheInBytes: 15 * 1024 * 1024, // 15 MiB to cache all bundles and lesson packs
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: false,
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            // 1. Google Fonts stylesheets (Cache-First)
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-stylesheets',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            // 2. Google Fonts webfonts (Cache-First)
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-webfonts',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            // 3. Audio files - Choukai, Vocab & Kana sound files (Cache-First)
            {
              urlPattern: /\.(?:mp3|wav|ogg|m4a|aac)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'nihongo-audio-cache',
                expiration: {
                  maxEntries: 300,
                  maxAgeSeconds: 60 * 60 * 24 * 90, // 90 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
                rangeRequests: true,
              },
            },
            // 4. Curriculum JSON Packs & Chunks (N5, N4, N3, N2) (Cache-First)
            {
              urlPattern: ({ url }) =>
                url.pathname.includes('/content/') ||
                url.pathname.endsWith('.json') ||
                url.pathname.match(/\/assets\/n[2345]\.l\d+/),
              handler: 'CacheFirst',
              options: {
                cacheName: 'nihongo-curriculum-cache',
                expiration: {
                  maxEntries: 400,
                  maxAgeSeconds: 60 * 60 * 24 * 90, // 90 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            // 5. App UI Assets - Scripts, Stylesheets, Workers (Cache-First)
            {
              urlPattern: ({ request }) =>
                request.destination === 'script' ||
                request.destination === 'style' ||
                request.destination === 'worker',
              handler: 'CacheFirst',
              options: {
                cacheName: 'nihongo-assets-cache',
                expiration: {
                  maxEntries: 400,
                  maxAgeSeconds: 60 * 60 * 24 * 60, // 60 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            // 6. Static UI Images and Icons (Cache-First)
            {
              urlPattern: ({ request, url }) =>
                request.destination === 'image' ||
                url.pathname.match(/\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i),
              handler: 'CacheFirst',
              options: {
                cacheName: 'nihongo-images-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 60, // 60 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
