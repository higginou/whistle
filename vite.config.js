import { defineConfig } from 'vite'

export default defineConfig(async () => {
  const plugins = []

  // VitePWA uses createRequire('.') which is incompatible with Node 24.
  // Only load it for build/serve, skip during tests.
  if (!process.env.VITEST) {
    const { VitePWA } = await import('vite-plugin-pwa')
    plugins.push(
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          // Precache: app shell (JS, CSS, HTML, icons, fonts)
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          cleanupOutdatedCaches: true,

          // SPA navigation fallback
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/^\/whistle\/data\//],

          // Runtime caching rules
          runtimeCaching: [
            // JSON data files — network-first with cache fallback
            {
              urlPattern: /\/data\/.*\.json$/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'whistle-data',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
                },
                networkTimeoutSeconds: 5,
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            // Google Fonts stylesheets
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-stylesheets',
                expiration: {
                  maxEntries: 4,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
              },
            },
            // Google Fonts webfont files
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
          ],
        },
        manifest: {
          name: 'Whistle — Projections TOP 14',
          short_name: 'Whistle',
          description: 'Projections du classement TOP 14 avec modele Elo',
          theme_color: '#6d28d9',
          background_color: '#0f0a1a',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/whistle/',
          start_url: '/whistle/',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'pwa-512x512-maskable.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
      }),
    )
  }

  return {
    base: '/whistle/',
    plugins,
    test: {
      alias: {
        'virtual:pwa-register': new URL('./__mocks__/virtual-pwa-register.js', import.meta.url).pathname,
      },
    },
  }
})
