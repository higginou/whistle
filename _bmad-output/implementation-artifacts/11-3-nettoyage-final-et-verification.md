# Story 11.3 : Nettoyage final et verification

Status: ready-for-dev

## Story

En tant que dev,
Je veux nettoyer les docs, scripts et references obsoletes,
Afin que le projet soit lisible et coherent apres migration.

## Acceptance Criteria

1. **Given** la migration est terminee
   **When** on lit les docs
   **Then** il n'y a plus de reference confuse a GitHub Pages, au scraping ou au pipeline legacy

2. **Given** les fichiers de code sont revus
   **When** on inspecte les imports et les scripts
   **Then** seuls les chemins Vercel actifs restent visibles

3. **Given** le projet est teste apres nettoyage
   **When** le front se lance
   **Then** il reste fonctionnel sans regression visible

## Tasks / Subtasks

- [ ] Nettoyer les documents de reference (AC: 1)
  - [ ] Mettre a jour les epics, l'architecture et les notes de migration
  - [ ] Supprimer les references trompeuses
- [ ] Verifier les chemins actifs (AC: 2, 3)
  - [ ] Confirmer les imports utiles
  - [ ] S'assurer que le build passe
- [ ] Faire la checklist finale de migration (AC: 1, 2, 3)
  - [ ] Confirmer le front public
  - [ ] Confirmer l'admin gere la saisie
  - [ ] Confirmer le recalcul serveur

## Dev Notes

- Cette story est la derniere et doit laisser le projet propre.
- Penser comme un debutant Vercel : si une reference n'explique pas le flux actuel, elle doit etre corrigee.
- Le but est la lisibilite, pas l'ajout de nouvelles fonctions.

### Project Structure Notes

- Touche la documentation, les scripts de maintenance et les references runtime.
- Peut inclure une verification du build final.

### References

- [Source: _bmad-output/planning-artifacts/epics.md - Migration Plan]
- [Source: _bmad-output/planning-artifacts/architecture.md - Migration Target: Vercel-only Runtime]

## Dev Agent Record

### Agent Model Used

TBD

### Debug Log References

### Completion Notes List

### File List
