# Story 9.4 : API publique et API admin

Status: ready-for-dev

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

- [ ] Creer les endpoints de lecture (AC: 1, 3, 4)
  - [ ] Retourner les donnees publiques en JSON
  - [ ] Garder les reponses simples et stables
- [ ] Creer les endpoints d'ecriture admin (AC: 2, 3, 4)
  - [ ] Verifier la session avant ecriture
  - [ ] Enregistrer les matchs saisis
- [ ] Definir le contrat de payload (AC: 1, 2)
  - [ ] Normaliser les noms des champs
  - [ ] Garder un format partage avec le front

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

TBD

### Debug Log References

### Completion Notes List

### File List
