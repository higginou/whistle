# Deferred Work

- **Synchroniser les bonus stochastiques dans le frontend Monte Carlo** — `src/simulator-engine.js:simulateMatch()` utilise encore des scores fixes (25-15) sans bonus. Le pipeline `scripts/elo.js` modélise maintenant des marges variables + bonus défensif/offensif probabiliste. Le simulateur what-if produit donc des projections différentes du pipeline pour les matchs non simulés. Porter la logique de bonus stochastique du pipeline vers le frontend.
