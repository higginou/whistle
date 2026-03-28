# Story 1.1 : Initialisation du projet Vite + PWA + dependances

## Informations

- **Epic :** Epic 1 — Fondation & Pipeline de Donnees
- **Statut :** done
- **Priorite :** Haute (bloque toutes les autres stories)
- **Estimation :** Petite (< 2h)

## Description

En tant que developpeur,
Je veux initialiser le projet avec Vite, vite-plugin-pwa et les dependances (Motion, Open Props),
Afin de disposer d'un socle de build et developpement fonctionnel.

Cette story pose les fondations techniques du projet Whistle. Elle cree la structure de fichiers conforme a l'architecture definie, installe les dependances front-end (Motion v12.x, Open Props v1.7.x), et configure Vite 7 avec vite-plugin-pwa v1.0. A l'issue de cette story, le dev server tourne avec HMR et le projet est pret pour les stories suivantes.

## Criteres d'acceptation

### AC1 : Projet Vite fonctionnel

**Given** aucun projet n'existe
**When** les commandes d'init et d'installation sont executees
**Then** le projet Vite vanilla demarre avec `npm run dev`
**And** le dev server sert la page par defaut avec HMR

### AC2 : Dependances installees

**Given** le projet est initialise
**When** on verifie `package.json`
**Then** `motion` (v12.x) est present dans les dependencies
**And** `open-props` (v1.7.x) est present dans les dependencies
**And** `vite` (v7.x) est present dans les devDependencies
**And** `vite-plugin-pwa` (v1.0.x) est present dans les devDependencies

### AC3 : Structure de dossiers conforme

**Given** le projet est initialise
**When** on verifie l'arborescence
**Then** les dossiers suivants existent :
- `src/` — code front-end
- `src/components/` — modules UI
- `src/animation/` — moteur d'animation
- `src/styles/` — CSS
- `src/styles/components/` — CSS par composant
- `scripts/` — pipeline Node.js
- `data/` — JSON generes
- `public/` — assets statiques (icones, manifest)

### AC4 : Fichiers de configuration

**Given** le projet est initialise
**When** on verifie les fichiers de config
**Then** `vite.config.js` existe avec la configuration vite-plugin-pwa de base
**And** `.gitignore` exclut `node_modules/` et `dist/`
**And** `index.html` existe a la racine du projet

### AC5 : Build de production

**Given** le projet est initialise
**When** `npm run build` est execute
**Then** le build reussit sans erreur
**And** les fichiers sont generes dans `dist/`

## Taches techniques

### T1 : Initialisation du projet Vite PWA

```bash
npm create @vite-pwa/pwa@latest whistle -- --template vanilla
```

Note : Le projet existant dans le repo, il faudra adapter — soit initialiser dans un sous-dossier temporaire et deplacer les fichiers, soit initialiser directement a la racine. Verifier que les fichiers existants (`_bmad-output/`, `CLAUDE.md`, `.claude/`) ne sont pas ecrases.

### T2 : Installation des dependances

```bash
npm install motion open-props
```

### T3 : Creation de la structure de dossiers

Creer les dossiers vides requis par l'architecture :

```
src/components/
src/animation/
src/styles/components/
scripts/
data/
```

Ajouter un fichier `.gitkeep` dans chaque dossier vide pour que Git les suive.

### T4 : Configuration de vite.config.js

Configurer vite-plugin-pwa avec les options de base :

- `registerType: 'autoUpdate'` — mise a jour automatique du Service Worker
- `manifest` minimal (nom, short_name, theme_color)
- Les strategies de cache detaillees (Workbox) seront configurees dans l'Epic 4

### T5 : Nettoyage des fichiers template

Supprimer ou vider les fichiers de demo generes par le template Vite (styles par defaut, counter JS, etc.) pour partir d'une base propre.

### T6 : Verification du `.gitignore`

S'assurer que `.gitignore` inclut au minimum :

```
node_modules/
dist/
```

### T7 : Validation

- Verifier que `npm run dev` lance le serveur avec HMR
- Verifier que `npm run build` produit un build dans `dist/`
- Verifier que `npm run preview` sert le build de production

## Notes techniques

### Versions cibles

| Dependance | Version | Type |
|---|---|---|
| Vite | 7.x | devDependency |
| vite-plugin-pwa | 1.0.x | devDependency |
| Motion | 12.x | dependency |
| Open Props | 1.7.x | dependency |

### Conventions a respecter des cette story

- Fichiers en `kebab-case`
- `vite.config.js` (pas TypeScript)
- Pas de fichier `utils.js` ou `helpers.js`

### Points d'attention

1. **Fichiers existants :** Le repo contient deja `_bmad-output/`, `CLAUDE.md`, `.claude/`, `.git/`. L'initialisation Vite ne doit pas les ecraser.
2. **Branche de travail :** Travailler sur la branche `develop` (branche courante).
3. **Budget taille :** Meme si cette story ne produit pas d'assets significatifs, garder en tete le budget de 200Ko gzipped pour le projet final.
4. **PostCSS pour Open Props :** Le tree-shaking d'Open Props via PostCSS sera configure dans la Story 2.1 (Design tokens). Pour cette story, il suffit qu'Open Props soit installe.

### Ce qui n'est PAS dans cette story

- Configuration du Service Worker detaillee (Epic 4)
- Design tokens et CSS (Story 2.1)
- Store d'etat (Story 2.2)
- Schema JSON (Story 1.2)
- Scripts pipeline (Stories 1.3 a 1.7)

## References

- **Architecture :** `_bmad-output/planning-artifacts/architecture.md` — sections "Starter Template Evaluation" et "Project Structure"
- **PRD :** `_bmad-output/planning-artifacts/prd.md` — section "Implementation"
- **Epics :** `_bmad-output/planning-artifacts/epics.md` — Story 1.1

---

## Code Review

**Date :** 2026-03-28
**Revieweur :** Claude Opus 4.6
**Verdict : Approve with minor suggestions**

### Verification des criteres d'acceptation

| AC | Statut | Commentaire |
|----|--------|-------------|
| AC1 : Projet Vite fonctionnel | OK | `npm run dev` / `npm run build` / `npm run preview` configures dans package.json, build verifie avec succes |
| AC2 : Dependances installees | OK | motion ^12.38.0, open-props 1.7, vite ^7.3.1, vite-plugin-pwa 1.0 — versions conformes aux cibles |
| AC3 : Structure de dossiers conforme | OK | Tous les dossiers requis presents : `src/`, `src/components/`, `src/animation/`, `src/styles/`, `src/styles/components/`, `scripts/`, `data/`, `public/`. Fichiers `.gitkeep` dans les dossiers vides. |
| AC4 : Fichiers de configuration | OK | `vite.config.js` avec VitePWA + `registerType: 'autoUpdate'` + manifest minimal. `.gitignore` exclut `node_modules/` et `dist/`. `index.html` present a la racine. |
| AC5 : Build de production | OK | `npm run build` reussit, genere `dist/` avec SW et precache (4 entries, 1.37 KiB) |

### Findings

#### F1 — `dist/.gitkeep` ne devrait pas exister (Mineur)

**Fichier :** `dist/.gitkeep`
**Risque :** Le dossier `dist/` est dans `.gitignore` (correctement). Un `.gitkeep` dans `dist/` est donc inutile — il ne sera jamais suivi par Git. De plus, il pourrait creer de la confusion si quelqu'un fait un `git add -f dist/.gitkeep`.
**Correction :** Supprimer `dist/.gitkeep`.

#### F2 — `src/styles/components/` a un `.gitkeep` mais pas `src/styles/` (Observation)

**Fichier :** `src/styles/`
**Risque :** Aucun risque reel — le dossier `src/styles/` contient le sous-dossier `components/` donc Git le suit deja. Pas de correction necessaire. Note pour les stories suivantes (2.1) : les fichiers `tokens.css` et `base.css` mentionnes dans l'architecture n'ont pas encore ete crees, ce qui est conforme au scope de cette story.

### Resume

L'implementation est solide et conforme aux criteres d'acceptation. La structure de dossiers respecte l'architecture definie, les dependances sont aux bonnes versions, la configuration Vite + PWA est minimale mais fonctionnelle, et le build de production fonctionne. Le seul finding actionnable est la suppression du `.gitkeep` dans `dist/` qui est redondant avec le `.gitignore`.
