# Publication des donnees publiques

Le runtime Vercel publie les donnees par l'API et la base, pas par un nouveau deploy GitHub Pages.

Flux courant :

1. Le cockpit admin enregistre les matchs valides via `POST /api/admin/matches`.
2. La validation finale appelle `POST /api/admin/recompute`.
3. Le backend relit `matches`, recalcule tout et ajoute un snapshot append-only dans `projection_snapshots`.
4. Le front public lit la derniere version via `GET /api/public/season?season=2025-2026` avec `cache: no-store`.
5. Si le reseau echoue, `src/data.js` garde le dernier payload lisible depuis `localStorage`.

Cette publication ne modifie pas les JSON statiques de `data/` et ne depend pas d'un redeploiement GitHub Pages.
