# Story 9.3 : Auth admin pour la saisie

Status: ready-for-dev

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

- [ ] Definir le flux de login admin (AC: 2, 3)
  - [ ] Choisir un secret simple ou une session signee
  - [ ] Limiter la duree de la session
- [ ] Separar public et admin (AC: 1, 4)
  - [ ] Lecture publique sans auth
  - [ ] Ecriture admin seulement
- [ ] Expliquer le fonctionnement Vercel pour l'auth (AC: 3, 4)
  - [ ] Env vars cote serveur
  - [ ] Route serveur pour verifier la session

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

TBD

### Debug Log References

### Completion Notes List

### File List
