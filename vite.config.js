import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/my_dental_care/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
        ],
      },
      manifest: {
        name: 'My Dental Care',
        short_name: 'DentalCare',
        description: 'B2B & B2C dental supply management — inventory, orders, sales & analytics',
        theme_color: '#0ea5e9',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/my_dental_care/',
        start_url: '/my_dental_care/',
        icons: [
          {
            src: 'pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Catalog',
            short_name: 'Catalog',
            description: 'Browse dental products',
            url: '/my_dental_care/',
            icons: [{ src: 'pwa-192.png', sizes: '192x192' }],
          },
          {
            name: 'Sales',
            short_name: 'Sales',
            description: 'Manage B2B orders',
            url: '/my_dental_care/',
            icons: [{ src: 'pwa-192.png', sizes: '192x192' }],
          },
        ],
        categories: ['medical', 'business', 'productivity'],
      },
    }),
  ],
})
