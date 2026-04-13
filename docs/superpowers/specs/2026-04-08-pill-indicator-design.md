# Pill Indicator — Indicateurs de tendance et mouvement à droite

## Résumé

Remplacer les deux indicateurs actuels (flèche tendance `↑/↓/=` + badge numérique `+2/-1`) par une **pill combinée unique** positionnée à droite de chaque rank-row, après les points.

## Contexte

Actuellement :
- La **flèche de tendance** (`w-rank-row__delta`) est à droite après les points — présente sur toutes les rows
- Le **badge numérique** (`w-rank-delta`) est à gauche après la position — présent uniquement dans l'onglet Projection

Problème : l'indicateur de mouvement numérique est à gauche, ce qui n'est pas naturel. L'utilisateur veut tout regrouper à droite dans une pill compacte.

## Design

### Pill combinée — deux variantes selon le contexte

**Onglet Projection** (delta numérique disponible) :
- Pill avec flèche + delta : `↑+2`, `↓-3`, `=`
- Couleurs : vert (`rgba(22,163,74,0.15)` / `#16a34a`) pour up, rouge (`rgba(220,38,38,0.15)` / `#dc2626`) pour down, gris (`rgba(138,143,152,0.1)` / `#8a8f98`) pour stable

**Autres onglets** (Oracle, Duels, etc. — pas de delta numérique) :
- Pill avec flèche seule : `↑`, `↓`, `=`
- Mêmes couleurs que ci-dessus

### Styles CSS

```css
.w-rank-row__pill {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}

.w-rank-row__pill--up {
  background: rgba(22, 163, 74, 0.15);
  color: var(--w-color-success);
}

.w-rank-row__pill--down {
  background: rgba(220, 38, 38, 0.15);
  color: var(--w-color-danger);
}

.w-rank-row__pill--stable {
  background: rgba(138, 143, 152, 0.1);
  color: var(--w-color-text-secondary);
}

.w-rank-row__pill-arrow {
  font-size: 10px;
}
```

### Ordre des éléments dans la row (mode détaillé)

`position → logo → info (name + elo) → points → pill → confidence-bar`

La pill se place avant la confidence bar (qui n'apparaît qu'en mode détaillé).

### Composants impactés

1. **`rank-row.js`** — Remplacer le `deltaSpan` (flèche `↑/↓/=`) par la nouvelle pill via `document.createElement`. La pill contient un `<span class="w-rank-row__pill-arrow">` pour la flèche et optionnellement un text node pour le delta numérique. Toute construction DOM se fait par `createElement`/`textContent` (pas d'innerHTML).
2. **`rank-row.css`** — Supprimer les classes `.w-rank-row__delta` et `.w-rank-row__delta--*`. Ajouter `.w-rank-row__pill` et ses variantes.
3. **`tab-projection.js`** — Modifier `renderMovementBadges()` :
   - Retirer le guard `team.rankDelta === 0 → continue` : toutes les rows doivent être traitées, y compris les stables
   - Pour chaque row, trouver la pill existante via `row.querySelector('.w-rank-row__pill')`
   - Si `rankDelta !== 0` : ajouter un text node avec le delta (`+2`, `-1`) dans la pill, et mettre à jour le modifier CSS (`--up`/`--down`) si le delta et le trend divergent
   - Si `rankDelta === 0` : ne rien ajouter (la pill stable `=` créée par `rank-row.js` suffit)
   - Ne plus créer de badge `w-rank-delta` séparé
4. **`tab-projection.css`** — Supprimer les classes `.w-rank-delta` et `.w-rank-delta--*`.

### Accessibilité

- La pill porte un `aria-label` descriptif (ex: "2 places en hausse", "3 places en baisse", "stable")
- `aria-hidden="true"` sur la flèche visuelle (le label porte l'information)
- Pas de changement sur le support clavier ou `prefers-reduced-motion` (pas d'animation ajoutée)

### Cas limites

- **Delta = 0 dans Projection** : afficher la pill stable `=` (pas de chiffre)
- **Pas de donnée trend** : ne pas afficher de pill
