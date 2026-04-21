# Story 11.2 : Retrait de GitHub Actions du flux metier

Status: ready-for-dev

## Story

En tant que dev,
Je veux retirer le workflow GitHub Actions du chemin de production,
Afin que Vercel devienne le seul runtime.

## Acceptance Criteria

1. **Given** la migration est terminee
   **When** on regarde le deploiement
   **Then** le flux metier ne depend plus de GitHub Actions

2. **Given** un ancien workflow existe encore
   **When** on relit la configuration
   **Then** il n'est plus reference par les operations courantes

3. **Given** un dev ouvre le projet
   **When** il cherche le point de publication
   **Then** il voit Vercel et non un cron GitHub Actions

## Tasks / Subtasks

- [ ] Supprimer le workflow de production legacy (AC: 1, 2)
  - [ ] Retirer le cron et les actions de generation
  - [ ] Verifier qu'aucune doc ne le presente comme runtime actif
- [ ] Rebrancher la publication sur Vercel (AC: 1, 3)
  - [ ] Laisser Vercel etre la seule plateforme active
  - [ ] Garder GitHub comme repo de code uniquement

## Dev Notes

- GitHub Actions peut rester en archive si necessaire, mais pas dans le chemin de production.
- La difference entre code source et runtime doit etre explicite.
- Cette story doit aider un lecteur debutant a comprendre ce qui a change.

### Project Structure Notes

- Touche les workflows, la doc de deploiement et les references runtime.
- Aucun changement fonctionnel attendu cote UI.

### References

- [Source: _bmad-output/planning-artifacts/epics.md - Migration Plan]
- [Source: _bmad-output/planning-artifacts/architecture.md - Migration Target: Vercel-only Runtime]

## Dev Agent Record

### Agent Model Used

TBD

### Debug Log References

### Completion Notes List

### File List
