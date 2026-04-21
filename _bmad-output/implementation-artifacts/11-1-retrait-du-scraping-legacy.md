# Story 11.1 : Retrait du scraping legacy

Status: ready-for-dev

## Story

En tant que dev,
Je veux supprimer le scraping du runtime,
Afin que la migration ne dependa plus de la LNR ni d'un fallback automate.

## Acceptance Criteria

1. **Given** la migration vers Vercel est en place
   **When** on inspecte le runtime
   **Then** aucun flux critique ne depend du scraping LNR

2. **Given** les anciens scripts existent encore
   **When** on les relit
   **Then** ils ne sont plus utilises par le chemin de production

3. **Given** le code est nettoye
   **When** le front se lance
   **Then** il ne tente plus de recuperer des donnees via scraping

## Tasks / Subtasks

- [ ] Isoler puis retirer les appels au scraping du chemin critique (AC: 1, 3)
  - [ ] Supprimer les dependances runtime au script
  - [ ] Verifier qu'aucune page ne les invoque
- [ ] Nettoyer les references au fallback LNR/API-Sports (AC: 1, 2)
  - [ ] Retirer les commentaires et docs trompeurs
  - [ ] Garder seulement l'historique utile

## Dev Notes

- Cette story retire le legacy du runtime, pas l'historique du projet.
- Ne pas laisser des chemins fantomes vers le scraping.
- La version Vercel doit etre la seule source active.

### Project Structure Notes

- Touche les scripts de pipeline et les references associees.
- Ne pas casser les documents de migration deja ecrits.

### References

- [Source: _bmad-output/planning-artifacts/epics.md - Migration Plan]
- [Source: _bmad-output/planning-artifacts/architecture.md - Migration Target: Vercel-only Runtime]

## Dev Agent Record

### Agent Model Used

TBD

### Debug Log References

### Completion Notes List

### File List
