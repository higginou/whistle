# Runbook de deploiement admin Vercel

Date: 2026-05-06

Ce runbook documente le chemin actif de production Whistle : front Vercel, fonctions Vercel, Postgres gere, interface `/admin`, recalcul serveur et API publique `GET /api/public/season`.

## Objectif

Permettre a un mainteneur de refaire l'initialisation Vercel ou de diagnostiquer une panne sans dependance a une conversation passee.

Le flux cible est : configurer Vercel, initialiser Postgres, importer la saison, se connecter a `/admin`, lancer `Recalculer la saison`, verifier que le public consomme le dernier snapshot.

## Prerequis

- Projet Vercel connecte a la branche `develop`.
- Node installe localement pour executer les validations projet.
- Acces au dashboard Vercel du projet.
- Acces a la base Postgres Vercel ou Marketplace associee au projet.
- Domaine de production connu. Exemple courant : `https://whistle-chi.vercel.app`.

## Variables Vercel

Configurer ces variables dans l'environnement Vercel de production avant d'utiliser l'admin.

| Variable | Requise | Usage | Contrainte |
|---|---:|---|---|
| `POSTGRES_URL` | Oui si disponible | URL de connexion Postgres prioritaire | Doit etre une URL `postgres:` ou `postgresql:` valide |
| `DATABASE_URL` | Fallback | URL de connexion Postgres si `POSTGRES_URL` n'existe pas | Doit etre une URL `postgres:` ou `postgresql:` valide |
| `ADMIN_PASSWORD` | Oui | Mot de passe saisi dans `/admin` | 12 caracteres minimum |
| `ADMIN_AUTH_SECRET` | Oui | Secret HMAC des sessions admin HttpOnly | 32 caracteres minimum |

Notes :

- Le runtime accepte `POSTGRES_URL` en priorite, puis `DATABASE_URL`.
- Le front ne lit jamais les secrets admin. La session est portee par le cookie HttpOnly `w_admin_session`.
- Apres modification des variables, redeployer le projet Vercel pour garantir que les fonctions lisent le nouvel environnement.

## Initialisation DB

Executer les scripts SQL dans cet ordre sur la base Postgres de production.

1. Schema initial : `src/server/db/migrations/001_initial_schema.sql`.
2. Migration essais : `src/server/db/migrations/002_match_tries.sql`.
3. Seed saison courante : `src/server/db/seeds/001_current_season.sql`.
4. Import matchs : `_bmad-output/implementation-artifacts/vercel-matches-import.sql`.
5. Recalcul admin depuis `/admin` avec `Recalculer la saison`.

Le schema cree les tables `seasons`, `matches`, `projection_snapshots` et `audit_log`. La table `projection_snapshots` est append-only : ne pas utiliser `UPDATE` ou `DELETE` comme procedure normale de production.

## Verification SQL

Apres le seed et l'import, verifier les volumes minimaux attendus.

```sql
SELECT id, is_current FROM seasons WHERE id = '2025-2026';
SELECT status, COUNT(*) FROM matches WHERE season_id = '2025-2026' GROUP BY status ORDER BY status;
SELECT COUNT(*) FROM projection_snapshots WHERE season_id = '2025-2026';
```

Attendus avant premier recalcul :

- `seasons` contient `2025-2026` avec `is_current = true`.
- `matches` contient les matchs importes de la saison.
- `projection_snapshots` peut etre vide.

Attendu apres recalcul :

- `projection_snapshots` contient au moins une ligne pour `2025-2026`.

## Parcours Admin

1. Ouvrir `/admin` sur le domaine Vercel.
2. Saisir `ADMIN_PASSWORD`.
3. Verifier que la vue indique `Session admin valide`.
4. Lire le diagnostic public affiche dans le panneau admin.
5. Cliquer `Recalculer la saison`.
6. Attendre le succes avec `snapshotId` et `matchday`.
7. Verifier que le diagnostic public passe a `JSON public disponible`.

Contrats API utilises par la vue :

- `POST /api/admin/login` avec `{ "password": "..." }`.
- `GET /api/admin/session` retourne `{ "authenticated": true | false }`.
- `POST /api/admin/recompute` avec `{ "seasonId": "2025-2026" }`.
- `GET /api/public/season?season=2025-2026` retourne le payload public.

## Verification Publique

Verifier directement l'API publique apres le recalcul.

```text
GET https://whistle-chi.vercel.app/api/public/season?season=2025-2026
```

Reponse attendue : `200` avec un JSON contenant au minimum :

- `season: "2025-2026"`
- `matchday`
- `lastUpdated`
- `teams[]`
- `calendar[]`
- `predictions[]`
- `results[]`

Verifier ensuite l'application publique :

- La page d'accueil charge sans ecran vide.
- Le classement s'affiche.
- Le Donjon lit les resultats publics.
- Le simulateur utilise les matchs programmes.

## Diagnostics

### `503 storage-unavailable`

Signification probable : le runtime ne peut pas atteindre Postgres, la configuration DB est absente/invalide, ou le schema attendu n'est pas complet en production. Les endpoints publics et admin mappent aussi les erreurs SQL inattendues vers ce statut.

Verifier :

- `POSTGRES_URL` ou `DATABASE_URL` existe dans Vercel.
- L'URL commence par `postgres:` ou `postgresql:`.
- La base associee au projet est active.
- Le projet a ete redeploye apres changement de variable.
- Les fonctions admin et publiques utilisent le meme environnement Vercel.
- Les migrations `001_initial_schema.sql` et `002_match_tries.sql` ont bien ete executees.
- Les tables et colonnes attendues existent : `seasons`, `matches`, `projection_snapshots`, `audit_log`, `matches.home_tries`, `matches.away_tries`.

Action attendue : corriger la variable, l'association Postgres ou l'initialisation SQL, redeployer si l'environnement a change, puis retester `/api/public/season?season=2025-2026` et `/admin`.

### `404 season-not-found`

Signification probable : la table `seasons` ne contient pas la saison demandee.

Verifier :

```sql
SELECT * FROM seasons WHERE id = '2025-2026';
```

Action attendue : executer `src/server/db/seeds/001_current_season.sql`, puis retester l'API publique.

### `404 projection-not-found`

Signification probable : la saison existe, mais aucun snapshot public n'a encore ete cree dans `projection_snapshots`.

Verifier :

```sql
SELECT id, matchday, generated_at
FROM projection_snapshots
WHERE season_id = '2025-2026'
ORDER BY generated_at DESC;
```

Action attendue : se connecter a `/admin`, cliquer `Recalculer la saison`, puis retester l'API publique.

### Echec de recalcul

Signification probable : les donnees de saison ne permettent pas de produire un snapshot complet, ou le stockage est indisponible.

Verifier :

- Si l'UI indique non authentifie : se reconnecter a `/admin`; la session expire au bout de 15 minutes.
- Si l'UI indique donnees manquantes : verifier que `matches` contient des matchs `played` et le calendrier restant.
- Si l'UI indique DB indisponible : suivre le diagnostic `503 storage-unavailable`.
- Si l'UI indique recalcul impossible : controler les donnees de `matches` pour la saison.

SQL utiles :

```sql
SELECT COUNT(*) FROM matches WHERE season_id = '2025-2026';
SELECT status, COUNT(*) FROM matches WHERE season_id = '2025-2026' GROUP BY status;
SELECT MAX(matchday) FROM matches WHERE season_id = '2025-2026' AND status = 'played';
SELECT matchday, COUNT(*) FROM matches WHERE season_id = '2025-2026' GROUP BY matchday ORDER BY matchday;
```

Action attendue : corriger l'import ou les saisies admin, puis relancer `Recalculer la saison`.

## Verification Locale Avant Deploiement

Executer avant merge/deploiement quand le code change :

```bash
npx vitest run
npx biome check .
npm run build
```

`cargo test` n'est pas applicable tant que `src-tauri/Cargo.toml` est absent.

## Notes De Securite

- Ne jamais consigner `ADMIN_PASSWORD`, `ADMIN_AUTH_SECRET`, `POSTGRES_URL` ou `DATABASE_URL` dans git.
- Ne pas partager le cookie `w_admin_session`.
- Utiliser `/admin` comme procedure normale ; la console navigateur peut depanner mais ne doit pas redevenir le flux de production.
- Les routes publiques ne doivent jamais exiger une session admin.

## Sources

- `src/server/db/connection.js`
- `src/server/auth/admin-session.js`
- `src/server/db/migrations/001_initial_schema.sql`
- `src/server/db/migrations/002_match_tries.sql`
- `src/server/db/seeds/001_current_season.sql`
- `_bmad-output/implementation-artifacts/vercel-matches-import.sql`
- `api/admin/login.js`
- `api/admin/session.js`
- `api/admin/recompute.js`
- `api/public/season.js`
