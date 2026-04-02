# Audit Budget Performance — Whistle

**Date :** 2026-03-29 (retro Epic 3, preparation Epic 4)
**Owner :** Winston (Architect)
**Vite :** v7.3.1
**vite-plugin-pwa :** v1.0.3

---

## Build Production

| Asset | Brut | Gzippe |
|---|---|---|
| `index.html` | 0.88 KB | 0.46 KB |
| `assets/index-*.css` | 31.36 KB | 7.02 KB |
| `assets/index-*.js` | 42.37 KB | 13.65 KB |
| `registerSW.js` | 0.13 KB | ~0.1 KB |
| `manifest.webmanifest` | 0.34 KB | ~0.2 KB |
| **Total bundle app** | **~75 KB** | **~21.4 KB** |

## Service Worker (genere par Workbox)

| Asset | Brut |
|---|---|
| `sw.js` | genere |
| `workbox-*.js` | runtime Workbox |
| **Precache total** | **72.99 KB** (5 entries) |

## Assets externes (non dans le bundle)

| Asset | Taille estimee |
|---|---|
| Google Fonts Nunito (variable, latin) | ~38 KB |
| JSON saison (data/) | < 50 KB par fichier |

## Bilan Budget

| Metrique | Valeur | Budget | Marge |
|---|---|---|---|
| Bundle gzippe (JS + CSS + HTML) | ~21.4 KB | 200 KB | **89%** |
| Bundle + fonts | ~59 KB | 200 KB | **70%** |
| Bundle + fonts + JSON estimé | ~109 KB | 200 KB | **45%** |
| Build time | 643ms | — | — |
| Modules transformes | 311 | — | — |

## Conclusion

Le budget est tres confortable. L'ajout du Service Worker, des icones PWA (192px + 512px), et du manifest n'impactera pas significativement le budget. Marge de ~90 KB disponible pour l'Epic 4.

Aucun risque de depassement du budget de 200 KB gzippe.
