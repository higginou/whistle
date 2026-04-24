# Stockage Postgres Vercel

Vercel Postgres designe ici une base Postgres relationnelle geree depuis Vercel, aujourd'hui fournie via les integrations Marketplace comme Neon. L'application ne gere pas de serveur de base elle-meme : Vercel injecte les secrets de connexion dans l'environnement du runtime.

Variables attendues :

- `POSTGRES_URL` en priorite, quand l'integration l'expose.
- `DATABASE_URL` en fallback, courant avec les providers Postgres Marketplace.

La couche `connection.js` utilise le client `postgres` (Postgres.js). Le client est cree paresseusement : aucune connexion reseau n'est ouverte avant la premiere requete.

Le schema garde les matchs dans des colonnes relationnelles (`home_team_id`, `away_team_id`, `home_score`, `away_score`) pour eviter de persister la saisie sous forme de JSON opaque. Les projections sont stockees dans `projection_snapshots` comme historique append-only : chaque recalcul ajoute une ligne horodatee au lieu de modifier la precedente.
