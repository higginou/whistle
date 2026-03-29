/** @module engine — Motion-based reveal animation orchestration */

import { animate } from 'motion/mini'
import { spring } from 'motion'

const LA_ROCHELLE_ID = 'la-rochelle'
const STAGGER_MS = 30
const LA_ROCHELLE_EXTRA_MS = 100

/**
 * Determine spring config based on absolute rank delta.
 * @param {number} absDelta
 * @returns {{ stiffness: number, damping: number, glow: boolean }}
 */
export function getSpringConfig(absDelta) {
  if (absDelta >= 3) {
    return { stiffness: 120, damping: 12, glow: true }
  }
  if (absDelta === 2) {
    return { stiffness: 200, damping: 12, glow: false }
  }
  // absDelta === 1
  return { stiffness: 200, damping: 20, glow: false }
}

/**
 * Check if reduced motion is preferred.
 * @returns {boolean}
 */
function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * Build an ordered list of animation tasks from rank-row elements and team data.
 * La Rochelle is always placed last with extra delay.
 * @param {Element[]} rankRowElements — .w-rank-row elements in DOM order
 * @param {object[]} teams — team objects with id, currentRank, projectedRank
 * @returns {{ element: Element, team: object, delta: number, delay: number }[]}
 */
function buildAnimationPlan(rankRowElements, teams) {
  // Build a map from team id to team data
  const teamMap = new Map(teams.map((t) => [t.id, t]))

  // Pair each element with its team data via data-team-id attribute
  const pairs = []
  for (const el of rankRowElements) {
    const teamId = el.dataset.teamId
    if (!teamId) continue
    const team = teamMap.get(teamId)
    if (!team) continue
    const delta = team.projectedRank - team.currentRank
    pairs.push({ element: el, team, delta })
  }

  // Separate La Rochelle from the rest
  const laRochelle = pairs.filter((p) => p.team.id === LA_ROCHELLE_ID)
  const others = pairs.filter((p) => p.team.id !== LA_ROCHELLE_ID)

  // Assign stagger delays
  let delayIndex = 0
  const plan = []
  for (const p of others) {
    plan.push({ ...p, delay: delayIndex * STAGGER_MS })
    delayIndex++
  }
  // La Rochelle gets the last regular delay + extra
  const laRochelleDelay = delayIndex * STAGGER_MS + LA_ROCHELLE_EXTRA_MS
  for (const p of laRochelle) {
    plan.push({ ...p, delay: laRochelleDelay })
  }

  return plan
}

/**
 * Calculate the pixel offset to move a rank-row from its current position
 * to the position of another rank at projectedRank.
 * Uses absolute page positions to handle cross-zone movement.
 * @param {Element} element — the rank-row to move
 * @param {number} delta — projectedRank - currentRank
 * @param {Element[]} allElements — all rank-row elements in DOM order (by currentRank)
 * @param {object[]} teams — all team objects sorted by currentRank
 * @returns {number} translateY in pixels
 */
function calculateTranslateY(element, delta, allElements, teams) {
  if (delta === 0) return 0

  const team = teams.find(
    (t) => t.id === element.dataset.teamId,
  )
  if (!team) return 0

  const targetRank = team.projectedRank
  // Find the element currently at the target rank position
  const targetElement = allElements.find((el) => {
    const tid = el.dataset.teamId
    const t = teams.find((tm) => tm.id === tid)
    return t && t.currentRank === targetRank
  })

  if (!targetElement) {
    // Fallback: estimate based on row height
    const rowHeight = element.getBoundingClientRect().height
    return delta * rowHeight
  }

  const currentTop = element.getBoundingClientRect().top
  const targetTop = targetElement.getBoundingClientRect().top
  return targetTop - currentTop
}

/**
 * Reveal projected standings by animating rank-rows to their projected positions.
 * @param {Element[]|NodeList} rankRowElements — .w-rank-row elements
 * @param {object[]} teams — team data with id, currentRank, projectedRank
 * @returns {Promise<void>} resolves when all animations complete
 */
export async function revealProjection(rankRowElements, teams) {
  const elements = Array.from(rankRowElements)
  const plan = buildAnimationPlan(elements, teams)
  const reduced = prefersReducedMotion()

  const promises = []

  for (const task of plan) {
    const { element, delta, delay } = task
    if (delta === 0) continue

    const absDelta = Math.abs(delta)
    const translateY = calculateTranslateY(element, delta, elements, teams)

    if (reduced) {
      // Reduced motion: instant position with opacity flash
      element.style.transform = `translateY(${translateY}px)`
      element.style.opacity = '1'
      // Update displayed position
      const posEl = element.querySelector('.w-rank-row__position')
      if (posEl) posEl.textContent = String(task.team.projectedRank)
      continue
    }

    const config = getSpringConfig(absDelta)

    // Add will-change for GPU compositing
    element.style.willChange = 'transform, opacity'

    // Add glow class for big movers
    if (config.glow) {
      element.classList.add('w-rank-row--glow')
    }

    // Create the delayed animation promise
    const animPromise = new Promise((resolve) => {
      setTimeout(async () => {
        const anim = animate(
          element,
          { transform: `translateY(${translateY}px)` },
          { type: spring, stiffness: config.stiffness, damping: config.damping },
        )

        await anim.finished

        // Update displayed rank
        const posEl = element.querySelector('.w-rank-row__position')
        if (posEl) posEl.textContent = String(task.team.projectedRank)

        // Cleanup
        element.style.willChange = ''
        if (config.glow) {
          element.classList.remove('w-rank-row--glow')
        }

        resolve()
      }, delay)
    })

    promises.push(animPromise)
  }

  await Promise.all(promises)
}

/**
 * Reset rank-rows to their original (currentRank) positions.
 * @param {Element[]|NodeList} rankRowElements — .w-rank-row elements
 * @param {object[]} teams — team data
 * @returns {Promise<void>}
 */
export async function resetProjection(rankRowElements, teams) {
  const elements = Array.from(rankRowElements)
  const teamMap = new Map(teams.map((t) => [t.id, t]))

  for (const el of elements) {
    const teamId = el.dataset.teamId
    const team = teamMap.get(teamId)

    // Reset transform
    el.style.transform = ''
    el.style.willChange = ''
    el.classList.remove('w-rank-row--glow')

    // Restore original rank display
    if (team) {
      const posEl = el.querySelector('.w-rank-row__position')
      if (posEl) posEl.textContent = String(team.currentRank)
    }
  }
}
