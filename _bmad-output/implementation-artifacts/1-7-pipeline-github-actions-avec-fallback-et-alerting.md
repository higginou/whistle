# Story 1.7 : Pipeline GitHub Actions avec fallback et alerting

Status: done

## Informations

- **Epic :** Epic 1 — Fondation & Pipeline de Donnees
- **Statut :** done
- **Priorite :** Haute (derniere story de l'Epic 1 — finalise le pipeline complet)
- **Estimation :** Moyenne (4-6h)
- **ui-structural :** false
- **Dependances :** Stories 1.1 a 1.6 (toutes done — les 4 scripts pipeline existent et fonctionnent)

## Story

En tant qu'utilisateur,
Je veux que le pipeline s'execute automatiquement chaque semaine avec retry, fallback et alerting,
Afin que les donnees soient mises a jour sans intervention manuelle toute la saison.

## Criteres d'acceptation

### AC1 : Execution sequentielle des scripts par cron

**Given** le workflow `.github/workflows/pipeline.yml` est configure
**When** le cron se declenche (lundi, mardi, mercredi)
**Then** les scripts s'executent en sequence : `scrape.js` -> `validate.js` -> `elo.js` -> `generate.js`
**And** chaque etape utilise `node scripts/<script>.js`
**And** si une etape echoue (exit code non-zero), les etapes suivantes ne s'executent pas

### AC2 : Idempotence du pipeline

**Given** le pipeline s'est deja execute avec succes pour la journee courante
**When** le cron se redeclenche (mardi ou mercredi)
**Then** le pipeline detecte que les donnees sont deja a jour et skip l'execution
**And** aucun commit inutile n'est cree

### AC3 : Fallback LNR vers API-Sports (FR4, NFR8)

**Given** le scraping LNR echoue (HTTP error, parsing error, donnees invalides)
**When** le workflow detecte l'echec de `scrape.js`
**Then** le systeme bascule automatiquement sur une source alternative (API-Sports ou autre)
**And** le passage au fallback ne modifie que le module de scraping — `validate.js`, `elo.js`, `generate.js` ne changent pas
**And** les donnees produites par le fallback respectent le meme format intermediaire (`data/scraped.json`)

### AC4 : Alerting apres 3 echecs consecutifs (FR5)

**Given** le pipeline echoue 3 fois consecutives (lundi + mardi + mercredi)
**When** le 3eme echec est detecte
**Then** une issue GitHub est creee automatiquement avec un titre descriptif et les logs d'erreur
**And** la notification email native de GitHub alerte l'utilisateur

### AC5 : Commit et deploiement du JSON genere

**Given** le pipeline s'execute avec succes
**When** `generate.js` a produit les fichiers JSON mis a jour
**Then** les fichiers `data/2025-2026.json` et `data/seasons.json` sont commites automatiquement
**And** le commit est pousse sur la branche principale
**And** le delai entre fin de journee et mise a jour est < 24h (NFR10)

### AC6 : Declenchement manuel possible

**Given** le workflow est configure
**When** un utilisateur declenche le workflow manuellement (`workflow_dispatch`)
**Then** le pipeline s'execute normalement (meme sequence de scripts)

## Taches techniques

- [x] T1 : Creer `.github/workflows/pipeline.yml` (AC: 1, 6)
  - [x] T1.1 : Configurer le declenchement cron (schedule) pour lundi/mardi/mercredi — utiliser un horaire matinal UTC (ex: `0 6 * * 1,2,3`)
  - [x] T1.2 : Ajouter `workflow_dispatch` pour declenchement manuel
  - [x] T1.3 : Configurer l'environnement Node.js (version LTS, `npm ci`)
  - [x] T1.4 : Definir les steps sequentiels : scrape -> validate -> elo -> generate
  - [x] T1.5 : S'assurer que chaque step echoue proprement si le script retourne un exit code non-zero

- [x] T2 : Implementer la detection d'idempotence (AC: 2)
  - [x] T2.1 : Avant de lancer les scripts, comparer la date du dernier commit sur `data/` avec la date courante (ou lire `lastUpdated` depuis `data/2025-2026.json`)
  - [x] T2.2 : Si les donnees sont deja a jour pour cette semaine, skip et sortir avec succes (exit 0)
  - [x] T2.3 : Logguer clairement le skip ("Donnees deja a jour, skip")

- [x] T3 : Implementer le fallback scraping (AC: 3)
  - [x] T3.1 : Si `scrape.js` echoue (exit code non-zero), executer un script de fallback ou relancer `scrape.js` avec un flag/variable d'environnement (ex: `SCRAPE_SOURCE=api-sports`)
  - [x] T3.2 : Le fallback doit produire le meme format de sortie (`data/scraped.json`) que le scraping LNR
  - [x] T3.3 : Si le fallback echoue aussi, marquer l'execution comme echec

- [x] T4 : Implementer l'alerting par issue GitHub (AC: 4)
  - [x] T4.1 : Compter les echecs consecutifs (lire un fichier de tracking dans le repo, ou utiliser les artifacts/cache GitHub Actions, ou verifier les 3 derniers runs du workflow via l'API)
  - [x] T4.2 : Apres 3 echecs consecutifs, creer une issue GitHub via `gh` CLI ou l'API REST (`GITHUB_TOKEN` est disponible nativement dans Actions)
  - [x] T4.3 : L'issue doit contenir : titre descriptif ("Pipeline TOP 14 : 3 echecs consecutifs"), date, resume des erreurs
  - [x] T4.4 : Eviter la creation de doublons (verifier si une issue ouverte avec le meme label existe deja)

- [x] T5 : Implementer le commit et push automatique (AC: 5)
  - [x] T5.1 : Apres `generate.js`, verifier si des fichiers dans `data/` ont change (`git diff --quiet data/`)
  - [x] T5.2 : Si changements : `git add data/`, commit avec message descriptif ("chore: mise a jour donnees journee XX"), push
  - [x] T5.3 : Configurer le git user dans le workflow (`github-actions[bot]`)
  - [x] T5.4 : Si aucun changement : skip le commit (idempotence)

- [x] T6 : Ecrire des tests (AC: 1-6)
  - [x] T6.1 : Tester la syntaxe et la structure du fichier `pipeline.yml` (YAML valide, jobs et steps presents)
  - [x] T6.2 : Tester la logique d'idempotence si extraite dans un module
  - [x] T6.3 : Tester la logique de comptage d'echecs si extraite dans un module

## Dev Notes

### Architecture du workflow

Le workflow `.github/workflows/pipeline.yml` est l'orchestrateur unique du pipeline. Il appelle les 4 scripts existants en sequence. Chaque script est deja testable en local et gere ses propres erreurs (exit code non-zero en cas d'echec).

```
.github/workflows/pipeline.yml
  |
  +-- Step 1: node scripts/scrape.js
  |     (echec? -> fallback API-Sports)
  +-- Step 2: node scripts/validate.js
  +-- Step 3: node scripts/elo.js
  +-- Step 4: node scripts/generate.js
  +-- Step 5: git commit + push data/
  +-- Step 6: alerting si echec (issue GitHub)
```

### Scripts existants et leur contrat

| Script | Entree | Sortie | Exit 0 | Exit 1 |
|--------|--------|--------|--------|--------|
| `scrape.js` | Web (LNR) | `data/scraped.json` | Succes | Echec HTTP/parsing |
| `validate.js` | `data/scraped.json` | (validation en place) | Donnees valides | Donnees invalides |
| `elo.js` | `data/scraped.json` | `data/elo-output.json` | Succes | Erreur calcul |
| `generate.js` | `data/elo-output.json` + `data/2025-2026.json` | `data/2025-2026.json` + `data/seasons.json` | Succes | Fichier manquant |

**Tous les scripts sont des modules ESM** (`"type": "module"` dans `package.json`). Ils s'executent avec `node scripts/<script>.js` sans flag supplementaire.

### Dependance : cheerio

`scrape.js` importe `cheerio` qui est dans `devDependencies`. Le workflow doit faire `npm ci` avant d'executer les scripts pour installer les dependances.

### Cron GitHub Actions

Le cron GitHub Actions utilise la syntaxe POSIX cron en UTC. Pour lundi/mardi/mercredi a 6h UTC (8h heure francaise) :

```yaml
on:
  schedule:
    - cron: '0 6 * * 1,2,3'
  workflow_dispatch:
```

**Note :** GitHub Actions ne garantit pas une execution exacte a l'heure — il peut y avoir un delai de quelques minutes. C'est acceptable pour ce projet.

### Strategie d'idempotence

Deux approches possibles :
1. **Lire `lastUpdated` dans `data/2025-2026.json`** et comparer avec la date courante — si meme semaine, skip
2. **Lire le `matchday`** dans `data/2025-2026.json` et le comparer avec le matchday actuel depuis le scraping

L'approche 1 est plus simple. L'approche 2 est plus precise mais necessite de scraper d'abord. Privilegier l'approche pragmatique : laisser `generate.js` gerer l'idempotence (il n'ajoute pas de doublon dans `predictions[]` si le matchday existe deja — c'est deja implemente en Story 1.6). Donc le workflow peut executer les scripts a chaque run, et `generate.js` sera naturellement idempotent.

**Decision recommandee :** executer tous les scripts a chaque run. L'idempotence est deja geree par `generate.js` (pas de doublon predictions). Le `git diff --quiet data/` avant le commit evite les commits inutiles.

### Strategie de fallback LNR -> API-Sports

L'architecture precise que "le passage LNR -> API-Sports ne modifie que le module de scraping". Deux approches :

1. **Variable d'environnement** : `scrape.js` verifie `SCRAPE_SOURCE` et utilise la source appropriee. Le workflow relance `scrape.js` avec `SCRAPE_SOURCE=api-sports` si le premier run echoue.
2. **Script de fallback separe** : `scripts/scrape-api-sports.js` qui produit le meme `data/scraped.json`.

L'approche 1 est plus propre (un seul script, meme contrat de sortie). Mais `scrape.js` n'a actuellement pas ce mecanisme. L'approche 2 est plus simple a implementer pour cette story (creer un stub `scrape-api-sports.js` qui sera etoffe plus tard).

**Decision recommandee :** Approche 1 avec variable d'environnement. Si `SCRAPE_SOURCE=api-sports`, `scrape.js` utilise une branche alternative. Pour cette story, la branche API-Sports peut etre un stub qui echoue avec un message clair ("API-Sports not yet implemented") — l'important est que le mecanisme de fallback dans le workflow soit en place et fonctionnel.

**Alternative acceptable :** Un step `continue-on-error: true` pour le scraping LNR, suivi d'un step conditionnel qui execute le fallback si le premier a echoue.

### Strategie d'alerting (issue GitHub)

L'utilisation de `gh` CLI est la plus simple dans GitHub Actions (pre-installe). Pour compter les echecs consecutifs :

**Approche recommandee :** Utiliser l'API GitHub Actions pour verifier les N derniers runs du workflow. Si les 3 derniers sont en echec, creer l'issue. Cela evite de maintenir un fichier de tracking dans le repo.

```yaml
- name: Check consecutive failures
  if: failure()
  env:
    GH_TOKEN: ${{ github.token }}
  run: |
    # Compter les echecs consecutifs via gh CLI
    FAILURES=$(gh run list --workflow=pipeline.yml --limit=3 --json conclusion -q '[.[].conclusion] | map(select(. == "failure")) | length')
    if [ "$FAILURES" -ge 3 ]; then
      # Verifier si une issue ouverte existe deja
      EXISTING=$(gh issue list --label "pipeline-failure" --state open --json number -q 'length')
      if [ "$EXISTING" -eq 0 ]; then
        gh issue create --title "Pipeline TOP 14 : 3 echecs consecutifs" --body "..." --label "pipeline-failure"
      fi
    fi
```

**Pre-requis :** Le label `pipeline-failure` doit exister dans le repo. Le workflow peut le creer s'il n'existe pas, ou le dev peut le creer manuellement.

### Commit automatique dans GitHub Actions

Pattern standard pour commiter depuis un workflow :

```yaml
- name: Commit and push data
  run: |
    git config user.name "github-actions[bot]"
    git config user.email "github-actions[bot]@users.noreply.github.com"
    git add data/
    git diff --staged --quiet && echo "No changes to commit" && exit 0
    git commit -m "chore: mise a jour donnees journee $MATCHDAY"
    git push
```

**Permissions :** Le workflow a besoin de `contents: write` pour pouvoir push. Ajouter dans le YAML :

```yaml
permissions:
  contents: write
  issues: write
```

### Fichiers intermediaires a ne PAS commiter

Les fichiers `data/scraped.json` et `data/elo-output.json` sont des fichiers intermediaires du pipeline. Ils ne doivent PAS etre commites. Seuls `data/2025-2026.json` et `data/seasons.json` sont les fichiers finaux a commiter.

**Deux options :**
1. Ajouter `data/scraped.json` et `data/elo-output.json` au `.gitignore`
2. Ne commiter que les fichiers specifiques : `git add data/2025-2026.json data/seasons.json`

**Decision recommandee :** Option 2 (commit specifique) ET option 1 (gitignore pour la proprete). Verifier le `.gitignore` actuel et ajouter les fichiers intermediaires si absents.

### Tests existants

242 tests existants (40 scrape + 46 schema + 57 validate + 62 elo + 37 generate) — ne PAS les casser.

Le workflow pipeline.yml lui-meme est difficile a tester unitairement. Les tests possibles :
- Valider la syntaxe YAML du fichier workflow
- Valider que les scripts references existent
- Tester la logique d'idempotence/fallback si extraite dans un module JS

### Learnings des stories precedentes

**De Story 1.6 (code review) :**
- Les millisecondes dans `new Date().toISOString()` cassent les tests schema — `generate.js` a ete corrige pour tronquer (pattern : `.replace(/\.\d{3}Z$/, 'Z')`)
- `brierScore: null` cassait les tests schema — corrige
- Le mapping `team-mapping.js` contient `TEAM_NAME_TO_ID` (pas l'inverse) — ne pas confondre

**Pattern git etabli par les stories precedentes :**
- Commits messages : `feat: story X-Y — description courte`
- Tests : `tests/<script>.test.js`, executables via `npx vitest run`
- Linter : `npx biome check .`

### Anti-patterns a eviter

- Ne PAS creer de fichier `utils.js` ou `helpers.js`
- Ne PAS commiter les fichiers intermediaires (`scraped.json`, `elo-output.json`)
- Ne PAS utiliser de try/catch generique dans le workflow steps (les scripts gerent leurs propres erreurs)
- Ne PAS hardcoder les tokens/secrets — utiliser `${{ github.token }}` (disponible nativement)
- Ne PAS creer une issue a chaque echec — seulement apres 3 echecs consecutifs
- Ne PAS forcer le push (`git push --force`)

### Project Structure Notes

- Fichier a creer : `.github/workflows/pipeline.yml`
- Repertoire `.github/workflows/` n'existe pas encore — le creer
- Fichier a modifier potentiellement : `.gitignore` (ajouter `data/scraped.json` et `data/elo-output.json`)
- Fichier a modifier potentiellement : `scripts/scrape.js` (ajouter support variable `SCRAPE_SOURCE` pour le fallback)
- Tests a creer : `tests/pipeline.test.js` (validation YAML, verification structure)
- Aucun fichier `src/` n'est concerne (frontiere pipeline/front-end respectee)

### References

- [Source: epics.md#Story 1.7] — criteres d'acceptation BDD
- [Source: architecture.md#Pipeline] — workflow unique + scripts modulaires en sequence
- [Source: architecture.md#Fallback & Alerting] — LNR -> API-Sports -> Issue GitHub
- [Source: architecture.md#Infrastructure & Deployment] — GitHub Pages, cron lundi/mardi/mercredi
- [Source: architecture.md#Error Handling] — `console.error()` + exit code non-zero
- [Source: prd.md#FR4] — bascule sur API-Sports si LNR echoue
- [Source: prd.md#FR5] — alerte apres 3 tentatives echouees
- [Source: Story 1.6] — 242 tests existants, idempotence de `generate.js`, pattern de commit

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

### Completion Notes List

- Cree `.github/workflows/pipeline.yml` avec cron lundi/mardi/mercredi 6h UTC, workflow_dispatch, execution sequentielle des 4 scripts pipeline
- Idempotence : approche pragmatique recommandee par les Dev Notes — `generate.js` gere deja l'idempotence (pas de doublon predictions), et `git diff --staged --quiet` evite les commits inutiles
- Fallback : `scrape.js` modifie pour supporter `SCRAPE_SOURCE=api-sports` via variable d'environnement. Le step LNR utilise `continue-on-error: true`, le step fallback se declenche conditionnellement
- Alerting : step `if: failure()` qui utilise `gh run list` pour compter les echecs consecutifs, `gh issue list` pour eviter les doublons, `gh issue create` avec label `pipeline-failure`
- Commit auto : configure `github-actions[bot]`, commit uniquement `data/2025-2026.json` et `data/seasons.json` (pas les intermediaires), skip si aucun changement
- 31 tests ajoutees dans `tests/pipeline.test.js` couvrant : syntaxe YAML, structure workflow, execution sequentielle, fallback, commit/push, alerting, scripts references
- Dependance ajoutee : `yaml` (devDependency) pour parser le YAML dans les tests
- `.gitignore` avait deja `data/scraped.json` et `data/elo-output.json`
- 273 tests au total (242 existants + 31 nouveaux), tous verts. Biome check : 0 erreur.

### Change Log

- 2026-03-29 : Story 1.7 implementee — workflow GitHub Actions pipeline complet

### File List

- `.github/workflows/pipeline.yml` (nouveau)
- `scripts/scrape.js` (modifie — ajout support SCRAPE_SOURCE et export getScrapeSources)
- `tests/pipeline.test.js` (nouveau)
- `package.json` (modifie — ajout yaml devDependency)
- `package-lock.json` (modifie — ajout yaml)

## Code Review

**Date :** 2026-03-29
**Reviewer :** Claude Opus 4.6 (bmad-code-review skill)
**Review mode :** full (avec spec story 1.7)
**Verdict : Approve**

### Layers executees

| Layer | Statut | Findings |
|-------|--------|----------|
| Blind Hunter (adversarial general) | Complete | 0 |
| Edge Case Hunter | Complete | 0 |
| Acceptance Auditor (AC1-AC6) | Complete | 0 |

### Resume

Review clean — les trois layers n'ont detecte aucun bug, vulnerabilite de securite, violation d'architecture ou probleme de correctness.

**Points verifies :**
- Logique `continue-on-error` + conditions sur `outcome` : correcte (LNR failure -> fallback -> check -> fail si les deux echouent)
- Seuil d'alerting : `gh run list --limit=3` avec `>= 2` failures + current = 3 consecutifs, logique correcte
- Idempotence : `git diff --staged --quiet` evite les commits inutiles, `generate.js` gere les doublons (story 1.6)
- Commit cible : seuls `data/2025-2026.json` et `data/seasons.json` sont stages (pas les fichiers intermediaires)
- Permissions : `contents: write` et `issues: write` correctement declares
- Detection de doublons d'issues : verification via `gh issue list --label pipeline-failure --state open`
- Guard d'entree ESM dans `scrape.js` : pattern standard correct
- Variable inline `SCRAPE_SOURCE=api-sports` : fonctionne sur ubuntu-latest

**Statistiques :**
- decision-needed : 0
- patch : 0
- defer : 0
- dismissed : 0

### Tests

- 273 tests (242 existants + 31 nouveaux) : tous verts
- `npx biome check .` : 0 erreur
