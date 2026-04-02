# Spike: vite-plugin-pwa v1.0 Configuration for Whistle

**Date:** 2026-03-29
**Context:** Epic 4 — PWA capabilities (Service Worker, offline caching, manifest)
**Stack:** Vite 7.3, vite-plugin-pwa 1.0, vanilla JS, Motion v12, Open Props v1.7
**Source:** Context7 docs for `/vite-pwa/vite-plugin-pwa` + `/websites/vite-pwa-org_netlify_app`

---

## 1. vite-plugin-pwa v1.0 Configuration (Vanilla JS)

### Current State

The project already has `vite-plugin-pwa` v1.0 installed and a working `vite.config.js` with basic manifest and two Google Fonts runtime caching rules. This spike recommends the complete target configuration.

### Strategy Choice: `generateSW` (default) vs `injectManifest`

**Recommendation: `generateSW` (default)**

- `generateSW` lets Workbox auto-generate the service worker from declarative config. No custom SW file needed.
- `injectManifest` is for complex SW logic (push notifications, background sync, custom routing). Whistle needs none of that.
- With `generateSW`, all caching rules live in `vite.config.js` — single source of truth, zero boilerplate.

### registerType: `'autoUpdate'` vs `'prompt'`

**Recommendation: `'autoUpdate'`** (already configured)

Rationale:
- Single-user app — no need to prompt for updates. The user (higgin) always wants the latest data.
- `autoUpdate` forces `workbox.clientsClaim: true` and `workbox.skipWaiting: true` automatically.
- New SW activates immediately on next visit. The app reloads transparently.
- For data freshness, `data.js` already handles network-first fetching and fires `data-fresh` via the store. The SW update is orthogonal to data updates.

### Recommended vite.config.js

```js
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Precache: app shell (JS, CSS, HTML, icons, fonts)
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,

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
                maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
              },
              networkTimeoutSeconds: 5,
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // Google Fonts stylesheets
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: {
                maxEntries: 4,
                maxAgeSeconds: 60 * 60 * 24 * 365
              }
            }
          },
          // Google Fonts webfont files
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      manifest: {
        name: 'Whistle — Projections TOP 14',
        short_name: 'Whistle',
        description: 'Projections du classement TOP 14 avec modele Elo',
        theme_color: '#6d28d9',
        background_color: '#0f0a1a',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ]
})
```

---

## 2. Workbox Strategies

### Precaching (App Shell)

The `globPatterns` setting tells Workbox which build outputs to precache:

```js
globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
```

This covers:
- `index.html` (entry point / navigation fallback)
- Vite-bundled JS and CSS (hashed filenames = automatic cache busting)
- Icons, images, and font files in the build output

**Important:** `globPatterns` matches files in the `dist/` folder after build. The default `**/*.{js,css,html}` is too narrow — it misses icons and fonts. Always include image and font extensions.

`cleanupOutdatedCaches: true` removes stale precache entries from previous SW versions.

### Runtime Caching: JSON Data Files

```js
{
  urlPattern: /\/data\/.*\.json$/i,
  handler: 'NetworkFirst',
  options: {
    cacheName: 'whistle-data',
    networkTimeoutSeconds: 5,
    expiration: {
      maxEntries: 10,
      maxAgeSeconds: 30 * 24 * 60 * 60
    }
  }
}
```

Why `NetworkFirst` for data:
- The pipeline pushes new JSON weekly (after each matchday). Users should always see the freshest projection.
- If offline or slow, the SW falls back to the last cached JSON — matching `data.js`'s existing localStorage fallback behavior.
- `networkTimeoutSeconds: 5` prevents hanging on poor connections; falls back to cache after 5s.

Why NOT `StaleWhileRevalidate`:
- SWR would show stale data first and update in the background. For a weekly-update app, this means the user might see last week's projections and only get the new ones on the next visit. `NetworkFirst` is better because it shows fresh data immediately when online.

### Runtime Caching: Static External Assets

Google Fonts use `CacheFirst` — these assets are versioned and immutable. Once cached, they never need re-fetching.

### Strategy Summary

| Asset Type | Strategy | Cache Name | Rationale |
|---|---|---|---|
| App shell (JS/CSS/HTML) | Precache | `workbox-precache-v2-*` | Versioned by build hash |
| JSON data (`data/*.json`) | NetworkFirst | `whistle-data` | Fresh data when online, cached fallback offline |
| Google Fonts CSS | CacheFirst | `google-fonts-stylesheets` | Immutable, versioned by Google |
| Google Fonts files | CacheFirst | `google-fonts-webfonts` | Immutable binary assets |

---

## 3. Silent Background Update Flow

### Service Worker Updates (App Code)

With `registerType: 'autoUpdate'`, the plugin auto-generates a registration script that:

1. Registers the SW on first load
2. On subsequent visits, the browser checks for a new SW in the background
3. If a new SW is found, it installs, activates immediately (`skipWaiting` + `clientsClaim`), and takes control
4. The page is reloaded automatically (controlled by the plugin's virtual module)

No user prompt is shown. This is ideal for a single-user app.

### Registering the SW in app.js

Use the virtual module provided by vite-plugin-pwa:

```js
// In src/app.js (or a dedicated src/sw-register.js)
import { registerSW } from 'virtual:pwa-register'

const updateSW = registerSW({
  immediate: true,
  onOfflineReady() {
    // App shell is cached — silent, no UI needed
    console.log('[SW] Offline ready')
  },
  onRegisteredSW(swUrl, registration) {
    // Periodic check for new SW (every hour)
    if (registration) {
      setInterval(() => {
        registration.update()
      }, 60 * 60 * 1000)
    }
  },
  onRegisterError(error) {
    console.error('[SW] Registration failed:', error)
  }
})
```

Notes:
- `onNeedRefresh` is not needed with `autoUpdate` — the SW updates silently.
- The hourly `registration.update()` interval proactively checks for new deployments without waiting for navigation.
- No UI for update prompts = no spinners, no banners (matches Whistle's "no loading UI" philosophy).

### Data Freshness Detection

The SW's caching of JSON data and `data.js`'s freshness logic are complementary:

1. **SW layer:** `NetworkFirst` for `data/*.json` ensures the fetch in `data.js` gets fresh data when online, cached data when offline.
2. **App layer:** `data.js` compares `lastUpdated` fields and fires `set('dataFresh', true)` when new data arrives.

No additional "data-refreshed" event from the SW is needed. The existing `data.js` logic handles this correctly because it already does network-first fetching. The SW's NetworkFirst strategy is a transparent enhancement that works below the fetch API.

---

## 4. Manifest Configuration

### Required Fields

```js
manifest: {
  name: 'Whistle — Projections TOP 14',    // Full name (install dialog)
  short_name: 'Whistle',                    // Home screen label
  description: 'Projections du classement TOP 14 avec modele Elo',
  theme_color: '#6d28d9',                   // Violet — matches --w-color-primary
  background_color: '#0f0a1a',              // Dark bg — matches app's dark theme
  display: 'standalone',                    // No browser chrome
  orientation: 'portrait',                  // Rugby leaderboard is portrait-only
  scope: '/',
  start_url: '/',
}
```

### Icons

Three icon files are recommended in `public/`:

| File | Size | Purpose |
|---|---|---|
| `pwa-192x192.png` | 192x192 | Standard icon (Android, desktop) |
| `pwa-512x512.png` | 512x512 | Splash screen, large displays |
| `pwa-512x512-maskable.png` | 512x512 | Android adaptive icon (safe zone padding) |

**Important change from current config:** The current config uses `purpose: 'any maskable'` on a single 512px icon. This is deprecated behavior — Chrome warns against it. Split into two entries: one `any` and one `maskable`. The maskable icon must have sufficient padding (~20% safe zone) so it is not clipped.

### Splash Screen

Android auto-generates the splash screen from:
- `background_color` (the splash background)
- `theme_color` (status bar color)
- `name` (displayed text)
- The largest icon (512x512)

No separate splash screen images are needed. iOS (Safari) does not support web app manifest splash screens — it would require `apple-touch-startup-image` link tags, but since this is a single-user Android/desktop app, this is not a concern.

### Apple Touch Icon

Add to `index.html` for iOS home screen support:

```html
<link rel="apple-touch-icon" href="/pwa-192x192.png">
<meta name="theme-color" content="#6d28d9">
```

---

## 5. Gotchas and Pitfalls

### 5.1 Vite 7 Compatibility

- vite-plugin-pwa v1.0 is designed for Vite 6+. The project uses Vite 7.3.1 — confirmed working (the existing config builds).
- No known breaking changes between Vite 6 and 7 that affect the PWA plugin.

### 5.2 Development vs Production

**The service worker is NOT active during `npm run dev` by default.** This is intentional — the SW would interfere with HMR.

To enable SW in dev (for testing):
```js
devOptions: {
  enabled: true,
  type: 'module'
}
```

**Recommendation:** Do NOT enable `devOptions` permanently. Test PWA behavior with `npm run build && npm run preview`. The preview server serves the production build with the real SW.

### 5.3 Cache Invalidation

- **Precached assets:** Automatically invalidated by Workbox via content hashing. When Vite rebuilds, file hashes change, and the new SW precaches the new versions. `cleanupOutdatedCaches: true` removes old entries.
- **Runtime-cached JSON:** `NetworkFirst` always tries the network first. Stale cache is only served when offline. The `maxAgeSeconds: 30 days` is a safety net to prevent ancient data from persisting forever.
- **Danger zone:** If the manifest/config shape changes dramatically between deploys, old SWs might serve broken pages. Mitigation: `cleanupOutdatedCaches: true` + `skipWaiting` + `clientsClaim` ensure the new SW takes over immediately.

### 5.4 `dvh` Units and Standalone Viewport

In `display: standalone` mode on mobile:
- The browser chrome is removed, changing the viewport height.
- `100vh` can be wrong on iOS Safari (counts the URL bar).
- `100dvh` (dynamic viewport height) is the correct unit and is supported by all modern browsers.
- The project should use `100dvh` for any full-screen layout.

Additional standalone considerations:
- `env(safe-area-inset-top)` / `env(safe-area-inset-bottom)` for notched devices.
- Add `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` to leverage `safe-area-inset-*` values.

### 5.5 navigateFallback

For a SPA, configure the navigation fallback:
```js
workbox: {
  navigateFallback: 'index.html',
  navigateFallbackDenylist: [/^\/data\//]
}
```

This ensures that direct navigation to any route serves `index.html` (the app shell). The denylist prevents JSON data requests from being intercepted as navigation.

### 5.6 `purpose: 'any maskable'` Deprecation

Chrome 128+ (2024) logs a console warning when a single icon has both purposes. The recommendation (already covered in section 4) is to provide separate icon entries.

---

## 6. Bundle Size Impact

### vite-plugin-pwa Overhead

The plugin itself is a **build-time-only dependency** — it adds zero bytes to the client JS bundle.

What it generates:
- **Service Worker file** (`sw.js`): Generated by Workbox at build time. Typically 5-15 KB gzipped depending on caching rules. Loaded separately by the browser, does NOT count toward main bundle.
- **Registration script** (from `virtual:pwa-register`): ~0.5 KB gzipped. Inlined into the app bundle.
- **Web App Manifest** (`manifest.webmanifest`): ~0.3 KB. Loaded separately.

### Total Budget Impact

| Asset | Size (gzipped) | Counts toward 200 KB budget? |
|---|---|---|
| SW registration code | ~0.5 KB | Yes |
| `sw.js` (service worker) | ~5-15 KB | No (separate thread) |
| `manifest.webmanifest` | ~0.3 KB | No (metadata) |
| Icon files (192+512+512 maskable) | ~50-100 KB total | No (lazy loaded) |

**Net impact on main bundle: ~0.5 KB gzipped.** Well within the 200 KB budget.

---

## 7. Recommended Implementation Plan

### Files to Create/Modify

1. **`vite.config.js`** — Update with complete config from section 1
2. **`src/app.js`** — Add `registerSW()` import from `virtual:pwa-register`
3. **`index.html`** — Add `<link rel="apple-touch-icon">` and verify `<meta name="theme-color">`
4. **`public/pwa-192x192.png`** — Icon (to be created)
5. **`public/pwa-512x512.png`** — Icon, purpose `any` (to be created)
6. **`public/pwa-512x512-maskable.png`** — Icon with safe zone padding (to be created)

### Testing Checklist

- [ ] `npm run build && npm run preview` — verify SW registers in DevTools > Application
- [ ] Check precache manifest includes all expected assets
- [ ] Go offline in DevTools — app shell loads from cache
- [ ] Go offline — JSON data serves from SW cache (after at least one online visit)
- [ ] Deploy update — SW silently updates on next visit
- [ ] Check Lighthouse PWA audit score
- [ ] Verify `dvh` layout in standalone mode on Android

---

## 8. Key Decisions Summary

| Decision | Choice | Rationale |
|---|---|---|
| SW strategy | `generateSW` | No custom SW logic needed |
| Register type | `autoUpdate` | Single user, silent updates preferred |
| Data caching | `NetworkFirst` (5s timeout) | Fresh when online, cached when offline |
| Static assets | Precache via `globPatterns` | Versioned by Vite build hashes |
| Icons | Split `any` / `maskable` | Chrome deprecation warning avoidance |
| Dev mode SW | Disabled | Avoid HMR interference; test via `preview` |
| navigateFallback | `index.html` with denylist | SPA routing support |
