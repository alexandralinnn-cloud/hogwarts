import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

// The site lives at https://alexandralinnn-cloud.github.io/hogwarts/
export default defineConfig({
  base: '/hogwarts/',
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'favicon.png'],
      manifest: {
        name: 'Hogwarts',
        short_name: 'Hogwarts',
        description: '我的游戏化待办小镇',
        lang: 'zh-CN',
        start_url: '/hogwarts/',
        scope: '/hogwarts/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#2e1d12',
        theme_color: '#5a3a22',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,webp}'],
        globIgnores: ['fonts/**'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/fonts/'),
            handler: 'CacheFirst',
            options: { cacheName: 'fonts', expiration: { maxEntries: 400 } },
          },
        ],
      },
    }),
  ],
  build: { chunkSizeWarningLimit: 1500 },
});
