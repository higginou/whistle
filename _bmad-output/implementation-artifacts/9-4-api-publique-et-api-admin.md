# Story 9.4 : API publique et API admin

Status: done

## Story

En tant que front,
Je veux lire les donnees publiques et ecrire les saisies via des endpoints distincts,
Afin de garder un flux clair entre consultation et modification.

## Acceptance Criteria

1. **Given** l'app a besoin des donnees publiques
   **When** elle appelle l'API publique
   **Then** elle recoit classement, Elo, projections et etats utiles

2. **Given** l'admin saisit un match
   **When** il envoie les donnees
   **Then** l'API admin les enregistre avec auth validee

3. **Given** l'API est structuree
   **When** on lit le code
   **Then** la lecture et l'ecriture sont clairement separees

4. **Given** le front et l'API vivent sur le meme projet Vercel
   **When** les appels sont executes
   **Then** il n'y a pas de probleme de CORS inutile

## Tasks / Subtasks

- [x] Creer les endpoints de lecture (AC: 1, 3, 4)
  - [x] Retourner les donnees publiques en JSON
  - [x] Garder les reponses simples et stables
- [x] Creer les endpoints d'ecriture admin (AC: 2, 3, 4)
  - [x] Verifier la session avant ecriture
  - [x] Enregistrer les matchs saisis
- [x] Definir le contrat de payload (AC: 1, 2)
  - [x] Normaliser les noms des champs
  - [x] Garder un format partage avec le front

## Dev Notes

- Sur Vercel, ces endpoints peuvent etre des route handlers ou des fonctions serverless dans `api/`.
- Le lecteur debutant doit comprendre que le front appelle ces endpoints comme une URL normale.
- Separer strictement lecture et ecriture.

### Project Structure Notes

- Touche le dossier `api/` et les modules partages de donnees.
- Le front public ne doit jamais parler directement a la base.

### References

- [Source: _bmad-output/planning-artifacts/architecture.md - Migration Target: Vercel-only Runtime]
- [Source: _bmad-output/planning-artifacts/epics.md - Epic 9]

## Dev Agent Record

### Agent Model Used

openai/gpt-5.5

### Debug Log References

- 2026-04-24 : `npx vitest run tests/api-contract.test.js` (10 tests passes)
- 2026-04-24 : `npx vitest run` (922 tests passes)
- 2026-04-24 : `npx biome check .` (0 erreur)
- 2026-04-24 : `npm run build` (build Vite OK)
- 2026-04-24 : `cargo test` non applicable, aucun `src-tauri/Cargo.toml`

### Completion Notes List

- Endpoint public `api/public/season.js` ajoute pour exposer les donnees publiques de saison en JSON sans auth ni configuration CORS inutile.
- Endpoint admin `api/admin/matches.js` ajoute pour enregistrer les matchs uniquement apres verification de session admin signee.
- Contrat payload partage ajoute via `normalizeAdminMatchPayload()` avec champs camelCase et persistence relationnelle dans `matches`.
- Revue automatique approuvee apres corrections : lecture publique depuis le dernier snapshot Postgres, erreurs stockage controlees, date ISO stricte, score borne et tests d'erreurs API.

### File List

- api/admin/matches.js
- api/public/season.js
- src/server/api/admin-matches.js
- src/server/api/public-season.js
- tests/api-contract.test.js
- _bmad-output/implementation-artifacts/9-4-api-publique-et-api-admin.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/epic-9-retro-2026-04-24.md

### Change Log

- 2026-04-24 : Ajout des endpoints public/admin Vercel pour la story 9.4, corrections post-review et passage en done.

## Senior Developer Review (AI)

Review Date: 2026-04-24

Outcome: Approve

### Summary

- Revue automatique executee sur les endpoints public/admin, les modules serveur partages, les tests et les artefacts de story.
- Les findings initiaux ont ete corriges avant approbation : lecture publique Postgres, erreurs de stockage controlees, validation stricte du payload admin.

### Action Items

- [x] Lire l'API publique depuis le dernier snapshot Postgres plutot que depuis le JSON statique.
- [x] Retourner des erreurs controlees pour saison/projection/stockage indisponibles.
- [x] Retourner une erreur controlee si l'ecriture admin ne peut pas persister.
- [x] Valider strictement les dates ISO UTC et les bornes de score avant SQL.
- [x] Ajouter les tests de contrat pour les chemins d'erreur critiques.

### Residual Risks

- Le tie-break des snapshots publics utilise `generated_at DESC`; si deux snapshots ont exactement le meme timestamp, le choix reste non deterministe.
- Les tests injectent un client SQL fake ; l'execution contre une vraie base Postgres reste a couvrir lors de l'integration/deploiement.
