import '../styles/components/achievement-card.css'

const FAVORITE_TEAM = 'la-rochelle'
const SURPRISE_THRESHOLD = 3
const CORRECT_TOLERANCE = 1

export const ACHIEVEMENT_PREDICTION = 'prediction'
export const ACHIEVEMENT_EXPLANATION = 'explanation'
export const ACHIEVEMENT_SURPRISE = 'surprise'

/**
 * Escape HTML special characters to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
function esc(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * French ordinal suffix.
 * @param {number} n
 * @returns {string}
 */
function ordinal(n) {
  return n === 1 ? 'er' : 'e'
}

/**
 * Compute which achievement cards to display from season data.
 * Pure function — no DOM, no side effects.
 * @param {object} season
 * @returns {object[]} array of card descriptors
 */
export function computeAchievements(season) {
  if (!season || !Array.isArray(season.teams)) return []

  const cards = []
  const hasPreviousPrediction =
    Array.isArray(season.predictions) && season.predictions.length >= 2

  // --- Prediction card (only if we have a previous prediction to verify) ---
  if (hasPreviousPrediction) {
    const prev = season.predictions[season.predictions.length - 2]
    if (Array.isArray(prev.projections) && prev.projections.length > 0) {
      let correct = 0
      let total = 0
      const surprises = []

      for (const proj of prev.projections) {
        const team = season.teams.find((t) => t.id === proj.teamId)
        if (!team) continue
        total++
        const gap = Math.abs(proj.projectedRank - team.currentRank)
        if (gap <= CORRECT_TOLERANCE) correct++
        if (gap >= SURPRISE_THRESHOLD) {
          surprises.push({
            name: team.name,
            delta: team.currentRank - proj.projectedRank,
          })
        }
      }

      if (total > 0) {
        cards.push({
          type: ACHIEVEMENT_PREDICTION,
          cssClass: 'w-achievement--prediction',
          icon: '\u{1F3C6}', // 🏆
          title: 'Le modele a vu juste',
          description: `${correct}/${total} predictions correctes`,
          ariaLabel: `Le modele a vu juste — ${correct} sur ${total} predictions correctes`,
          ratio: { correct, total },
        })
      }

      // --- Surprise card ---
      if (surprises.length > 0) {
        // Pick the biggest surprise
        const biggest = surprises.reduce((a, b) =>
          Math.abs(b.delta) > Math.abs(a.delta) ? b : a,
        )
        const places = Math.abs(biggest.delta)
        // delta < 0 → team rose (better than projected), delta > 0 → team fell
        const direction = biggest.delta < 0 ? `+${places}` : `\u2212${places}`
        cards.push({
          type: ACHIEVEMENT_SURPRISE,
          cssClass: 'w-achievement--surprise',
          icon: '\u2753', // ❓
          title: "Le modele s'est trompe",
          description: `Surprise : ${biggest.name} a dejoue les pronostics (${direction} places)`,
          ariaLabel: `Le modele s'est trompe — ${biggest.name} a dejoue les pronostics de ${places} places`,
        })
      }
    }
  }

  // --- Explanation card (always shown) ---
  const lr = season.teams.find((t) => t.id === FAVORITE_TEAM)
  if (lr) {
    let title
    let description
    const rank = lr.currentRank
    const proj = lr.projectedRank

    if (lr.trend === 'up') {
      title = 'La Rochelle grimpe'
      description = `Projection : ${rank}${ordinal(rank)} \u2192 ${proj}${ordinal(proj)}. Le modele voit une progression.`
    } else if (lr.trend === 'down') {
      title = 'La Rochelle recule'
      description = `Projection : ${rank}${ordinal(rank)} \u2192 ${proj}${ordinal(proj)}. Le calendrier se complique.`
    } else {
      title = 'La Rochelle se maintient'
      description = `Projection stable a la ${proj}${ordinal(proj)} place.`
    }

    cards.push({
      type: ACHIEVEMENT_EXPLANATION,
      cssClass: 'w-achievement--explication',
      icon: '\u{1F4A1}', // 💡
      title,
      description,
      ariaLabel: `${title} — ${description}`,
    })
  }

  return cards
}

/**
 * Build a single achievement card DOM element.
 * @param {object} card — descriptor from computeAchievements
 * @returns {HTMLElement}
 */
function buildCard(card) {
  const article = document.createElement('article')
  article.className = `w-achievement ${card.cssClass}`
  article.setAttribute('role', 'article')
  article.setAttribute('aria-label', card.ariaLabel)
  article.setAttribute('tabindex', '0')

  article.innerHTML = `
    <div class="w-achievement__icon" aria-hidden="true">${esc(card.icon)}</div>
    <div class="w-achievement__content">
      <div class="w-achievement__title">${esc(card.title)}</div>
      <div class="w-achievement__description">${esc(card.description)}</div>
    </div>
    <div class="w-achievement__chevron" aria-hidden="true">\u203A</div>
  `

  // Tactile feedback
  article.addEventListener('pointerdown', () => article.classList.add('is-pressed'))
  article.addEventListener('pointerup', () => article.classList.remove('is-pressed'))
  article.addEventListener('pointerleave', () => article.classList.remove('is-pressed'))
  article.addEventListener('pointercancel', () => article.classList.remove('is-pressed'))

  return article
}

/**
 * Render achievement cards into the given container.
 * @param {HTMLElement} container — the w-achievements-section element
 * @param {object} season — full season data
 */
export function render(container, season) {
  container.innerHTML = ''
  const cards = computeAchievements(season)
  for (const card of cards) {
    container.appendChild(buildCard(card))
  }
}
