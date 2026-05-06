# Vercel Deployment Todo

Date: 2026-05-05

## Etat actuel

- [x] `develop` pousse sur GitHub.
- [x] Projet Vercel cree et deploye depuis `develop`.
- [x] Variables `POSTGRES_URL` et `DATABASE_URL` presentes dans Vercel.
- [x] Variables admin configurees dans Vercel: `ADMIN_PASSWORD`, `ADMIN_AUTH_SECRET`.
- [x] Schema Postgres initialise.
- [x] Saison `2025-2026` seedee dans `seasons`.
- [x] Import initial `matches` execute.
- [x] Volumes DB verifies: matchs presents jusqu'a la journee 26.
- [x] API publique ne retourne plus `503`; elle atteint la DB.
- [ ] API publique retourne un JSON public complet apres premier recalcul de production.
- [x] Interface admin minimale ajoutee dans l'app.
- [x] Runbook de deploiement admin documente : `_bmad-output/implementation-artifacts/admin-deployment-runbook.md`.

## Bloquant courant

- `GET /api/public/season?season=2025-2026` retourne encore `404` car aucun snapshot n'existe dans `projection_snapshots`.
- Il faut declencher un premier recalcul depuis `/admin` pour creer ce snapshot.
- Le parcours UI admin existe maintenant : login, verification session, recalcul manuel et diagnostic public.

## Travail produit pendant le deploiement

- Fichier d'import genere: `_bmad-output/implementation-artifacts/vercel-matches-import.sql`.
- Ce fichier importe `175` matchs:
  - `133` joues.
  - `42` programmes.
- `7` lignes historiques incoherentes ont ete ignorees car elles violent la contrainte DB `une equipe = un match par journee`.

## Reste a faire

1. Interface admin minimale dans l'app. **Fait.**
   - Route dediee: `/admin`.
   - Formulaire mot de passe appelant `POST /api/admin/login`.
   - Verification session via `GET /api/admin/session`.
   - Bouton `Recalculer la saison` appelant `POST /api/admin/recompute` avec `seasonId: '2025-2026'`.
   - Diagnostic public et erreurs actionnables: non authentifie, DB indisponible, recalcul echoue, snapshot absent.

2. Declencher le premier recalcul depuis l'interface admin.
   - Resultat attendu: reponse `201` avec `recalculated: true`, `snapshotId`, `matchday`.

3. Verifier l'API publique.
   - URL: `https://whistle-chi.vercel.app/api/public/season?season=2025-2026`.
   - Resultat attendu: JSON public complet avec `teams`, `calendar`, `predictions`, `results`.

4. Verifier l'application publique.
   - Accueil charge sans ecran vide.
   - Classement affiche.
   - Donjon lit les resultats Vercel.
   - Simulateur fonctionne avec les matchs programmes.

5. Verifier le flux admin futur.
   - Login admin.
   - Saisie d'un match depuis le cockpit.
   - Sauvegarde via `/api/admin/matches`.
   - Validation finale / recalcul.
   - Rafraichissement du public.

6. Documenter les commandes et etapes definitives. **Fait dans** `_bmad-output/implementation-artifacts/admin-deployment-runbook.md`.
   - Variables Vercel requises.
   - SQL d'initialisation.
   - Import initial.
   - Procedure de recalcul.

## Notes de decision

- Ne pas utiliser la console navigateur comme procedure normale de production.
- La console navigateur peut depanner, mais le flux cible doit passer par une UI admin protegee.
- `public/data/*` ne doit pas redevenir une source active: le runtime public doit rester Vercel API + Postgres.
