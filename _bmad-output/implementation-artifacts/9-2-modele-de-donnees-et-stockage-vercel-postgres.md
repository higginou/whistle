# Story 9.2 : Modele de donnees et stockage Vercel Postgres

Status: ready-for-dev

## Story

En tant que dev,
Je veux definir le modele de donnees de la migration sur Vercel Postgres,
Afin de stocker les matchs, les snapshots et les logs proprement.

## Acceptance Criteria

1. **Given** la migration Vercel commence
   **When** le schema est defini
   **Then** on sait ou stocker les saisons, matchs, snapshots et logs

2. **Given** une saisie de match est enregistree
   **When** elle est persistee
   **Then** la structure permet de retrouver les donnees sans JSON bricolage

3. **Given** le recalcul genere des snapshots
   **When** une nouvelle projection est produite
   **Then** l'historique reste append-only

4. **Given** le lecteur doit comprendre Vercel
   **When** la story est lue
   **Then** il est clair que Vercel Postgres est une base relationnelle geree par Vercel

## Tasks / Subtasks

- [ ] Definir les tables minimales (AC: 1, 2, 3)
  - [ ] seasons
  - [ ] matches
  - [ ] projections ou snapshots
  - [ ] audit_log
- [ ] Brancher la connexion a Vercel Postgres (AC: 2, 4)
  - [ ] Expliquer les secrets d'acces via env vars
  - [ ] Garder un schema simple et lisible
- [ ] Prevoir les migrations et les seeds (AC: 1, 2)
  - [ ] Ajouter des donnees initiales
  - [ ] Verifier que le schema supporte la saison courante

## Dev Notes

- La base doit etre simple, pas un modele surdimensionne.
- Vercel Postgres = service gere, accessible depuis l'app Vercel via variables d'environnement.
- Garder la source de verite cote base, pas dans des JSON statiques.

### Project Structure Notes

- Touche le schema et la couche d'acces aux donnees.
- Ne pas melanger la logique de calcul avec la couche de persistence.

### References

- [Source: _bmad-output/planning-artifacts/architecture.md - Migration Target: Vercel-only Runtime]
- [Source: _bmad-output/planning-artifacts/epics.md - Epic 9]

## Dev Agent Record

### Agent Model Used

TBD

### Debug Log References

### Completion Notes List

### File List
