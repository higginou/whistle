# Story 7.1 : Refonte visuelle rochelaise

Status: done

ui-structural: true

Cette story introduit une nouvelle direction visuelle transverse. Elle modifie l'identite des ecrans existants et doit passer par validation design avant implementation.

## Maquettes

Les maquettes sont produites dans `_bmad-output/mockups/epic-7/` :

- [x] [`identity-variant-a.html`](_bmad-output/mockups/epic-7/identity-variant-a.html) — theme sombre premium, accent or, cartes profondes
- [x] [`identity-variant-b.html`](_bmad-output/mockups/epic-7/identity-variant-b.html) — theme marine plus lumineux, contrastes forts
- [x] [`identity-variant-c.html`](_bmad-output/mockups/epic-7/identity-variant-c.html) — theme collector/sportif avec badges plus visibles

Chaque variante doit montrer au minimum : score card, bottom nav, empty state et achievement card dans la nouvelle direction visuelle.

**GO higgin: oui** — variante A validée.

> **GATE BLOQUANT** : cette story ne peut PAS passer en `in-progress` tant que `GO higgin: oui` n'est pas enregistre.

## Story

En tant que supporter unique du Stade Rochelais,
Je veux une interface visuellement plus forte, plus premium et plus rochelaise,
Afin de ressentir immediatement que l'app m'est personnelle.

## Dependencies

- **2-1** (done) : Design tokens et fondation visuelle — base `--w-*`, typographie Nunito, grille 8px
- **2-3** (done) : Layout page principale et structure HTML semantique — shell, sections, navigation
- **2-4** (done) : Score card hero La Rochelle — composant central deja en place
- **3-3** (done) : Cards achievement modele — style gamifie reutilisable comme reference de tonalite

## References

- **UX-DR1** : palette Whistle (couleurs fonctionnelles + zones)
- **UX-DR2** : typographie Nunito et chiffres tabulaires
- **UX-DR3** : grille d'espacement 8px
- **UX-DR15** : structure HTML semantique
- **UX-DR16** : contrastes WCAG AA
- **UX-DR21** : direction visuelle Game UI enrichie
- **Architecture** : `src/styles/tokens.css`, `src/styles/base.css`, `src/styles/components/*.css`
- **Architecture** : 1 composant = 1 JS + 1 CSS, classes prefixees `w-`, custom properties `--w-`
- [Source: planning-artifacts/architecture.md — sections Design Tokens, Naming Conventions, Project Structure]
- [Source: planning-artifacts/ux-design-specification.md — sections Game UI, Direction Visuelle]
- [Source: planning-artifacts/epics.md — Epic 2 et UX-DR1/2/3/15/16/21]

## Acceptance Criteria (BDD)

1. **Given** l'app est ouverte
   **When** la page principale se charge
   **Then** l'interface ne ressemble plus a un dashboard neutre
   **And** la palette, les surfaces et les contrastes expriment une identite rochelaise forte

2. **Given** les composants principaux sont affiches
   **When** on inspecte l'ecran
   **Then** la score card, le bottom nav, les achievements et l'empty state partagent la meme direction visuelle

3. **Given** la page est consultee sur mobile
   **When** les contenus se replient
   **Then** la lisibilite reste bonne et les zones tactiles restent confortables

4. **Given** un utilisateur a `prefers-reduced-motion: reduce`
   **When** les composants s'affichent
   **Then** les animations restent discretes ou instantanees

5. **Given** les textes et chiffres sont affiches
   **When** on compare les contrastes
   **Then** le rendu respecte les seuils AA vises par le design system

6. **Given** les cartes achievement et la bottom nav sont rendues
   **When** on compare leur style au reste de l'app
   **Then** elles semblent appartenir au meme univers premium et sportif

## Tasks / Subtasks

- [x] Revoir les tokens de couleur, surfaces et ombres (AC: 1, 5)
  - [x] Ajuster `tokens.css` pour la palette rochelaise
  - [x] Verifier les contrasts sur fond sombre et clair
- [x] Harmoniser la base typographique et le fond global (AC: 1, 5)
  - [x] Mettre a jour `base.css`
  - [x] Garantir la lisibilite des titres et du body
- [x] Refaire la perception visuelle des composants principaux (AC: 2, 6)
  - [x] `page-layout.css`
  - [x] `score-card.css`
  - [x] `bottom-nav.css`
  - [x] `achievement-card.css`
  - [x] `empty-state.css`
- [x] Valider le comportement mobile et reduced motion (AC: 3, 4)
  - [x] Tester en largeur smartphone
  - [x] Verifier les styles `prefers-reduced-motion`

## Dev Notes

- Ne pas creer de nouvelle architecture UI: cette story doit surtout re-theme les composants existants.
- Conserver les conventions existantes: `w-` pour les classes, `--w-` pour les custom properties.
- Preferer des changements de tokens et de surfaces avant d'ajouter de nouveaux elements HTML.
- Attention au risque principal: trop de decor et perte de lisibilite.

### Project Structure Notes

- Les fichiers a toucher sont deja isoles par composant et par feuille CSS.
- La story doit rester compatible avec le layout existant et avec les tests actuels de rendu.
- Aucun changement de routing ni de store n'est requis pour cette story.

### References

- [Source: src/styles/tokens.css]
- [Source: src/styles/base.css]
- [Source: src/styles/components/page-layout.css]
- [Source: src/styles/components/score-card.css]
- [Source: src/styles/components/bottom-nav.css]
- [Source: src/styles/components/empty-state.css]
- [Source: src/styles/components/achievement-card.css]

## Dev Agent Record

### Agent Model Used

openai/gpt-5.5

### Debug Log References

- 2026-05-04 : Review automatique Epic 7.1, corrections contrastes achievements/empty state/bottom nav.
- 2026-05-04 : `npx vitest run` : 45 fichiers, 911 tests, 0 echec.
- 2026-05-04 : `npx biome check .` : 0 erreur.
- 2026-05-04 : `npm run build` : OK.

### Completion Notes List

- Palette rochelaise sombre/premium appliquee via tokens, fond global et surfaces elevees.
- Score card, bottom nav, achievements et empty state harmonises dans la meme direction visuelle.
- Contrastes post-review corriges sur gradients achievement, message empty state et navigation inactive.
- `prefers-reduced-motion` conserve sur les interactions animees concernees.

### File List

- `src/styles/tokens.css`
- `src/styles/base.css`
- `src/styles/components/page-layout.css`
- `src/styles/components/score-card.css`
- `src/styles/components/bottom-nav.css`
- `src/styles/components/achievement-card.css`
- `src/styles/components/empty-state.css`

### Change Log

- 2026-05-04 : Finalisation story 7.1, validation review et corrections de contraste.

## Senior Developer Review (AI)

Date : 2026-05-04

Outcome : Approve

### Findings

- Aucun finding bloquant restant apres corrections.

### Action Items

- [x] Corriger les contrastes des gradients achievement prediction/surprise.
- [x] Corriger le contraste du message empty state.
- [x] Corriger le contraste des items inactifs de bottom nav.

### Residual Risks / Testing Gaps

- Contraste valide par inspection statique des couleurs, pas par outil navigateur a11y dedie.
- Pas de validation visuelle mobile automatisee.
