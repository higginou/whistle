# Story 9.3 : Auth admin pour la saisie

Status: done

## Story

En tant qu'utilisateur admin,
Je veux une authentification courte uniquement pour ouvrir la saisie,
Afin de proteger l'ecriture sans bloquer la consultation publique.

## Acceptance Criteria

1. **Given** un visiteur ouvre l'app
   **When** il consulte le classement
   **Then** aucune connexion n'est requise

2. **Given** l'utilisateur veut saisir les matchs
   **When** il ouvre le flux admin
   **Then** une auth courte est demandee

3. **Given** l'auth est validée
   **When** la session est creee
   **Then** elle est signee cote serveur et expire rapidement

4. **Given** une variable sensible existe
   **When** le code est relu
   **Then** aucun secret n'est present dans le front

## Tasks / Subtasks

- [x] Definir le flux de login admin (AC: 2, 3)
  - [x] Choisir un secret simple ou une session signee
  - [x] Limiter la duree de la session
- [x] Separar public et admin (AC: 1, 4)
  - [x] Lecture publique sans auth
  - [x] Ecriture admin seulement
- [x] Expliquer le fonctionnement Vercel pour l'auth (AC: 3, 4)
  - [x] Env vars cote serveur
  - [x] Route serveur pour verifier la session

## Dev Notes

- Garder l'auth extremement simple : on protege l'ecriture, pas la lecture.
- Vercel ne doit pas etre traite comme un backend mystique : ici, l'auth vit dans un endpoint serveur et une session signee.
- Ne pas exposer de token dans le navigateur.

### Project Structure Notes

- Touche les routes serveur et la gestion des cookies/session.
- Cette story ne doit pas impacter le front public autrement que le bouton d'entree admin.

### References

- [Source: _bmad-output/planning-artifacts/architecture.md - Migration Target: Vercel-only Runtime]
- [Source: _bmad-output/planning-artifacts/epics.md - Epic 9]

## Dev Agent Record

### Agent Model Used

openai/gpt-5.5

### Debug Log References

- 2026-04-24 : `npx vitest run tests/admin-auth.test.js` (14 tests passes)
- 2026-04-24 : `npx vitest run` (912 tests passes)
- 2026-04-24 : `npx biome check .` (0 erreur)
- 2026-04-24 : `npm run build` (build Vite OK)
- 2026-04-24 : `cargo test` non applicable, aucun `src-tauri/Cargo.toml`

### Completion Notes List

- Flux login admin ajoute via `api/admin/login.js`, protege par `ADMIN_PASSWORD` cote serveur et session signee par `ADMIN_AUTH_SECRET`.
- Session admin courte ajoutee avec cookie `HttpOnly`, `Secure`, `SameSite=Strict` et expiration 15 minutes.
- Route `api/admin/session.js` et guard `verifyAdminRequest()` ajoutes pour verifier la session cote serveur avant les futures routes d'ecriture admin.
- Aucun secret n'est injecte dans le front public ; la lecture publique n'a pas ete modifiee.
- Revue automatique approuvee apres corrections : JSON malforme, token strict, mot de passe minimal, fail-closed sans secret, throttling local et documentation du besoin WAF/rate-limit partage.

### File List

- api/admin/login.js
- api/admin/session.js
- src/server/auth/README.md
- src/server/auth/admin-session.js
- tests/admin-auth.test.js
- _bmad-output/implementation-artifacts/9-3-auth-admin-pour-la-saisie.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

### Change Log

- 2026-04-24 : Ajout du socle d'auth admin Vercel pour la saisie, corrections post-review et passage en done.

## Senior Developer Review (AI)

Review Date: 2026-04-24

Outcome: Approve

### Summary

- Revue automatique executee sur les routes `api/admin/*`, la session signee, les tests et les artefacts de story.
- Les findings initiaux ont ete corriges avant approbation : throttling local, parsing JSON controle, token strict, mot de passe minimal, fail-closed sans `ADMIN_AUTH_SECRET`.

### Action Items

- [x] Ajouter un garde-fou contre les tentatives de brute-force.
- [x] Rejeter les tokens avec segments supplementaires.
- [x] Retourner une reponse controlee sur JSON malforme.
- [x] Exiger une longueur minimale pour `ADMIN_PASSWORD`.
- [x] Echouer proprement si `ADMIN_AUTH_SECRET` manque pendant le login ou la verification de session.

### Residual Risks

- Le throttling est local a l'instance serverless ; avant exposition publique, completer par Vercel Firewall/WAF ou un rate-limit partage.
