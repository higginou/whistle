# Story 13.1 : Acces admin protege

Status: done

ui-structural: true

Cette story ajoute une vue admin protegee et un formulaire de connexion. Elle cree un nouveau parcours UI ; aucun code UI ne doit etre ecrit tant que le GO maquettes n'est pas enregistre.

## Maquettes

Les maquettes sont produites dans `_bmad-output/mockups/epic-13/` :

- [x] [`admin-access-variant-a.html`](_bmad-output/mockups/epic-13/admin-access-variant-a.html) - acces securise centre, login prioritaire, apercu actions admin
- [x] [`admin-access-variant-b.html`](_bmad-output/mockups/epic-13/admin-access-variant-b.html) - console operations/runtime, diagnostic plus visible
- [x] [`admin-access-variant-c.html`](_bmad-output/mockups/epic-13/admin-access-variant-c.html) - panneau compact mobile-first

Variante recommandee par l'agent mockups : variante A.

**GO higgin: oui** - variante A validee le 2026-05-05.

> **GATE BLOQUANT** : cette story ne peut PAS passer en `in-progress` tant que `GO higgin: oui` n'est pas enregistre. Aucun code UI ne doit etre ecrit avant ce GO.

## Story

En tant qu'administrateur,
Je veux ouvrir une vue admin protegee et me connecter avec le mot de passe configure dans Vercel,
Afin d'obtenir une session admin sans passer par la console navigateur.

## Acceptance Criteria

1. **Given** l'utilisateur ouvre la vue admin  
   **When** aucune session valide n'existe  
   **Then** un formulaire de connexion admin est affiche  
   **And** le formulaire poste le mot de passe vers `POST /api/admin/login`  
   **And** les erreurs de mot de passe, rate-limit ou configuration sont affichees sans exposer de secret

2. **Given** une session admin valide existe  
   **When** la vue admin charge  
   **Then** `GET /api/admin/session` confirme l'etat authentifie  
   **And** le panneau d'actions admin est affiche  
   **And** aucune route publique ne requiert cette session

## Tasks / Subtasks

- [x] Respecter le gate maquettes avant implementation (AC: 1, 2)
  - [x] Obtenir validation explicite `GO higgin: oui` dans cette story
  - [x] Suivre la variante retenue sans transformer cette story en console complete des stories 13.2/13.3
- [x] Ajouter une vue admin protegee (AC: 1, 2)
  - [x] Detecter `/admin` sans casser les routes publiques ni les onglets existants
  - [x] Rendre une vue admin dediee hors bottom nav publique
  - [x] Verifier la session au chargement via `GET /api/admin/session`
- [x] Implementer le formulaire de connexion (AC: 1)
  - [x] Champ mot de passe avec label accessible et autocompletion appropriee
  - [x] `POST /api/admin/login` avec JSON `{ password }` et cookies inclus par defaut same-origin
  - [x] Desactiver le bouton pendant la requete et vider le secret apres succes ou erreur
- [x] Afficher les etats authentifie/non authentifie (AC: 1, 2)
  - [x] Message `mot de passe incorrect` pour `401`
  - [x] Message `trop de tentatives, reessayer dans une minute` pour `429`
  - [x] Message `configuration admin indisponible` pour `503`
  - [x] Panneau d'actions admin placeholder lorsque `authenticated: true`
- [x] Couvrir l'accessibilite UI structurelle (AC: 1, 2)
  - [x] `main`, `h1`, labels explicites, `aria-live` pour erreurs et etat session
  - [x] Focus visible WCAG AA et cibles tactiles au moins 44px
  - [x] Support clavier Enter/Space sur controles custom si ajoutes
  - [x] Respect `prefers-reduced-motion` si une transition est ajoutee
- [x] Ajouter les tests pertinents (AC: 1, 2)
  - [x] Test route `/admin` et non-regression route publique
  - [x] Test affichage formulaire sans session
  - [x] Test succes login puis panneau admin
  - [x] Test mapping erreurs `401`, `429`, `503`

## Dev Notes

- Les endpoints serveur existent deja : `api/admin/login.js`, `api/admin/session.js`, `api/admin/matches.js`, `api/admin/recompute.js`. Ne pas recreer d'auth cote client.
- `POST /api/admin/login` retourne `{ authenticated: true }` et pose le cookie HttpOnly `w_admin_session` en cas de succes. Le front ne doit jamais lire ce cookie.
- `GET /api/admin/session` retourne toujours `200` avec `{ authenticated: boolean }`; une session invalide doit afficher le formulaire, pas une erreur bloquante.
- `POST /api/admin/login` peut retourner `401`, `429`, `503` avec `{ authenticated: false }`. Les messages UI doivent rester generiques et ne jamais exposer `ADMIN_PASSWORD` ou `ADMIN_AUTH_SECRET`.
- L'auth admin protege uniquement les ecritures/admin. La lecture publique `GET /api/public/season?season=2025-2026` doit rester sans authentification.
- Limiter le scope de cette story a l'acces admin. Le bouton de recalcul complet appartient a 13.2 ; le diagnostic public appartient a 13.3. Un placeholder ou une zone d'actions desactivee suffit ici.
- Reutiliser les conventions existantes : composants dans `src/components/`, styles dans `src/styles/components/`, classes `w-*`, custom properties `--w-*`, pas de fichier `utils.js` generique.
- Si la vue admin utilise `innerHTML`, echapper toute chaine dynamique avec un helper `esc()` local avant injection.

### Project Structure Notes

- Candidats probables a toucher apres GO : `src/app.js`, `src/router.js`, `src/components/admin-access.js`, `src/styles/components/admin-access.css`, tests sous `src/__tests__/`.
- Le shell public actuel est monte dans `renderFullLayout()` apres chargement saison. La vue admin ne doit pas dependre d'un snapshot public existant, car Epic 13 sert justement a creer le premier snapshot.
- Eviter de monter `match-cockpit` ou la bottom nav publique sur `/admin` sauf decision explicite de design.

### References

- [Source: _bmad-output/planning-artifacts/epics.md - Epic 13, Story 13.1]
- [Source: _bmad-output/planning-artifacts/architecture.md - Runtime Vercel, auth admin, API admin]
- [Source: _bmad-output/implementation-artifacts/vercel-deployment-todo.md - bloquant courant et reste a faire]
- [Source: api/admin/login.js]
- [Source: api/admin/session.js]
- [Source: src/server/auth/admin-session.js]
- [Source: src/app.js]
- [Source: src/router.js]
- [Source: _bmad-output/mockups/epic-13/admin-access-variant-a.html]
- [Source: _bmad-output/mockups/epic-13/admin-access-variant-b.html]
- [Source: _bmad-output/mockups/epic-13/admin-access-variant-c.html]

## Dev Agent Record

### Agent Model Used

openai/gpt-5.5

### Debug Log References

- `npx vitest run src/__tests__/admin-access.test.js src/__tests__/app.test.js src/__tests__/router.test.js` - pass, 22 tests
- `npx biome check .` - pass
- `npm run build` - pass
- `npx vitest run` - pass, 906 tests
- `npx biome check .` - pass
- `npm run build` - pass
- `npx vitest run` - pass apres corrections review, 908 tests
- `npx biome check .` - pass apres corrections review
- `npm run build` - pass apres corrections review
- `src-tauri/Cargo.toml` absent, no `cargo test` target in this workspace

### Completion Notes List

- Variante A approuvee et enregistree avant implementation.
- Vue `/admin` rendue independamment du snapshot public et sans bottom nav publique.
- Verification de session via `GET /api/admin/session` ; session valide affiche le panneau admin.
- Formulaire de login connecte a `POST /api/admin/login`, avec secret efface apres tentative et messages controles pour `401`, `429`, `503`.
- Blocage DoD leve : scripts legacy importables par Vitest et fixture `data/2025-2026.json` alignee avec le schema teste.
- Review approuvee apres correction des 3 findings : coherence fixture tiebreaker/headToHead, mapping erreur non-JSON, route `/admin/`.

### File List

- `_bmad-output/implementation-artifacts/13-1-acces-admin-protege.md`
- `_bmad-output/mockups/epic-13/admin-access-variant-a.html`
- `_bmad-output/mockups/epic-13/admin-access-variant-b.html`
- `_bmad-output/mockups/epic-13/admin-access-variant-c.html`
- `src/app.js`
- `src/router.js`
- `src/components/admin-access.js`
- `src/styles/components/admin-access.css`
- `src/__tests__/admin-access.test.js`
- `src/__tests__/app.test.js`
- `scripts/elo.js`
- `scripts/generate.js`
- `scripts/validate.js`
- `data/2025-2026.json`

## Senior Developer Review (AI)

### Review Date

2026-05-05

### Review Outcome

Approved

### Action Items

- [x] Corriger la fixture `data/2025-2026.json` : retirer les flags `tiebreaker` orphelins lorsque `headToHead` est absent.
- [x] Mapper les erreurs login connues avant parsing JSON pour couvrir les reponses non-JSON.
- [x] Normaliser `/admin/` comme route admin valide.

### Change Log

- 2026-05-05: Story created with UI gate and delegated mockups.
- 2026-05-05: GO Variant A recorded; admin access view implemented and tested.
- 2026-05-05: Full validation suite restored; story moved to review.
- 2026-05-05: Code review approved after follow-up fixes; story marked done.
