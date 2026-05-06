/** @module match-cockpit — Guided match entry cockpit dialog */

import '../styles/components/match-cockpit.css'
import { loadSeason } from '../data.js'

const FAVORITE_TEAM = 'la-rochelle'
const DRAFT_STORAGE_KEY = 'w-match-cockpit-drafts'
const FINAL_STORAGE_KEY = 'w-match-cockpit-final'

let dialog = null
let currentSession = null
let finalValidationPending = false

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function teamName(season, teamId) {
  const team = season?.teams?.find((item) => item.id === teamId)
  return team ? team.name : teamId
}

function getInitials(teamNameValue) {
  return teamNameValue
    .split(/[\s-]+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function getMatchKey(match) {
  return `${match.matchday}-${match.home}-${match.away}`
}

function isPastMatch(match, now = new Date()) {
  if (typeof match?.date !== 'string' || match.date.trim() === '') return true

  const matchDate = new Date(match.date)
  if (Number.isNaN(matchDate.getTime())) return true

  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const matchDayUtc = Date.UTC(matchDate.getUTCFullYear(), matchDate.getUTCMonth(), matchDate.getUTCDate())

  return matchDayUtc < todayUtc
}

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch (_error) {
    return fallback
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

function readDrafts() {
  return readJSON(DRAFT_STORAGE_KEY, {})
}

function writeDrafts(drafts) {
  writeJSON(DRAFT_STORAGE_KEY, drafts)
}

function toInt(value) {
  if (value === '' || value == null) return null
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null
}

function isCompleteDraft(draft) {
  return [draft?.homeScore, draft?.awayScore, draft?.homeTries, draft?.awayTries]
    .every((value) => Number.isInteger(value) && value >= 0)
}

function calculateBonusFlags(draft) {
  const homeOffensive = draft.homeTries >= draft.awayTries + 3
  const awayOffensive = draft.awayTries >= draft.homeTries + 3

  const homeDefensive = draft.homeScore < draft.awayScore && draft.awayScore - draft.homeScore <= 7
  const awayDefensive = draft.awayScore < draft.homeScore && draft.homeScore - draft.awayScore <= 7

  return {
    home: { offensive: homeOffensive, defensive: homeDefensive },
    away: { offensive: awayOffensive, defensive: awayDefensive },
  }
}

function normalizeMatchEntry(match, season, draft) {
  const bonus = calculateBonusFlags(draft)

  return {
    seasonId: season?.season ?? season?.id ?? null,
    matchKey: getMatchKey(match),
    matchday: match.matchday,
    date: match.date,
    home: match.home,
    away: match.away,
    score: { home: draft.homeScore, away: draft.awayScore },
    tries: { home: draft.homeTries, away: draft.awayTries },
    bonus,
    validatedAt: new Date().toISOString(),
  }
}

function normalizeAdminDate(date) {
  if (typeof date !== 'string') return date
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return `${date}T00:00:00Z`

  return date
}

function getCompletedEntries() {
  const drafts = readDrafts()
  return Object.entries(drafts)
    .filter(([, draft]) => draft?.validated === true && isCompleteDraft(draft))
    .reduce((acc, [key, draft]) => {
      acc[key] = draft
      return acc
    }, {})
}

function getRemainingMatches(season) {
  const calendar = Array.isArray(season?.calendar) ? season.calendar.filter((match) => isPastMatch(match)) : []
  const drafts = readDrafts()
  const completed = new Set(Object.keys(getCompletedEntries()))

  return calendar.filter((match) => !completed.has(getMatchKey(match)))
}

function getCockpitSession(season) {
  const calendar = Array.isArray(season?.calendar) ? season.calendar.filter((match) => isPastMatch(match)) : []
  const drafts = readDrafts()
  const remainingMatches = getRemainingMatches(season)
  const currentMatch = remainingMatches[0] ?? null

  return {
    season,
    matches: calendar,
    remainingMatches,
    currentMatch,
    totalCount: calendar.length,
    remainingCount: remainingMatches.length,
    currentIndex: currentMatch ? calendar.findIndex((match) => getMatchKey(match) === getMatchKey(currentMatch)) + 1 : 0,
    draft: currentMatch ? drafts[getMatchKey(currentMatch)] ?? {} : {},
  }
}

function ensureDialog(container) {
  if (dialog?.isConnected) return dialog
  if (dialog && !dialog.isConnected) {
    container.appendChild(dialog)
    return dialog
  }

  dialog = document.createElement('dialog')
  dialog.className = 'w-match-cockpit'
  dialog.setAttribute('aria-modal', 'true')
  dialog.setAttribute('role', 'dialog')
  container.appendChild(dialog)

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) handleClose()
  })

  dialog.addEventListener('cancel', (event) => {
    event.preventDefault()
    handleClose()
  })

  return dialog
}

function setStatus(message, tone = 'info') {
  const status = dialog?.querySelector('[data-cockpit-status]')
  if (!status) return
  status.textContent = message
  status.dataset.tone = tone
}

function refreshPreview(session, draft) {
  if (!dialog || !session.currentMatch) return

  const bonus = calculateBonusFlags(draft)
  const remainingLabel = dialog.querySelector('[data-cockpit-remaining]')
  const progressLabel = dialog.querySelector('[data-cockpit-progress]')
  const bonusHome = dialog.querySelector('[data-bonus-home]')
  const bonusAway = dialog.querySelector('[data-bonus-away]')
  const submitBtn = dialog.querySelector('[data-cockpit-submit]')

  if (remainingLabel) {
    remainingLabel.textContent = `${session.remainingCount} match${session.remainingCount > 1 ? 's' : ''} restant${session.remainingCount > 1 ? 's' : ''}`
  }

  if (progressLabel) {
    progressLabel.textContent = `Match ${session.currentIndex} sur ${session.totalCount}`
  }

  if (bonusHome) {
    bonusHome.textContent = `${bonus.home.offensive ? 'OFF +' : 'OFF -'} ${bonus.home.defensive ? 'DEF +' : 'DEF -'}`
  }

  if (bonusAway) {
    bonusAway.textContent = `${bonus.away.offensive ? 'OFF +' : 'OFF -'} ${bonus.away.defensive ? 'DEF +' : 'DEF -'}`
  }

  if (submitBtn) {
    submitBtn.textContent = session.remainingCount > 1 ? 'Enregistrer et continuer' : 'Valider la saisie'
    submitBtn.disabled = !isCompleteDraft(draft) && session.remainingCount > 0
  }
}

function renderEmptyState() {
  return `
    <div class="w-match-cockpit__handle" aria-hidden="true"></div>
    <button class="w-match-cockpit__close" type="button" aria-label="Fermer">×</button>
    <div class="w-match-cockpit__content">
      <div class="w-match-cockpit__empty">
        <p class="w-match-cockpit__eyebrow">Saisie guidée</p>
        <h2 class="w-match-cockpit__title">Tout est déjà saisi</h2>
        <p class="w-match-cockpit__subtitle">Aucun match n’attend de validation pour le moment.</p>
      </div>
    </div>`
}

function readFinalValidationPayload() {
  const payload = readJSON(FINAL_STORAGE_KEY, null)
  if (!payload || !Array.isArray(payload.entries) || payload.entries.length === 0) return null

  return payload
}

function backendErrorMessage(error) {
  if (error?.message === 'admin-validation-401') return 'Session admin expirée. Reconnectez-vous dans /admin, puis relancez la validation.'
  if (error?.message === 'admin-validation-400') return 'Données refusées par le backend. La saisie locale est conservée.'
  if (error?.message === 'admin-validation-503') return 'Stockage Vercel indisponible. La saisie locale est conservée.'

  return 'Validation backend indisponible. La saisie locale est conservée.'
}

function renderFinalRetryState(message = 'Validation backend indisponible. La saisie locale est conservée.') {
  return `
    <div class="w-match-cockpit__handle" aria-hidden="true"></div>
    <button class="w-match-cockpit__close" type="button" aria-label="Fermer">×</button>
    <div class="w-match-cockpit__content">
      <div class="w-match-cockpit__empty w-match-cockpit__empty--done">
        <p class="w-match-cockpit__eyebrow">Validation finale</p>
        <h2 class="w-match-cockpit__title">Saisie locale conservée</h2>
        <p class="w-match-cockpit__subtitle">Reconnectez-vous si besoin, puis relancez l’envoi au backend.</p>
        <div class="w-match-cockpit__hint" data-cockpit-status role="status" aria-live="polite" data-tone="danger">${esc(message)}</div>
        <footer class="w-match-cockpit__actions" aria-label="Actions de validation finale">
          <button class="w-match-cockpit__action w-match-cockpit__action--secondary" type="button" data-cockpit-close>Fermer</button>
          <button class="w-match-cockpit__action w-match-cockpit__action--primary" type="button" data-cockpit-final-retry>Relancer la validation</button>
        </footer>
      </div>
    </div>`
}

function buildContent(session) {
  const season = session?.season
  const match = session?.currentMatch
  if (!match) return renderEmptyState()

  const homeName = teamName(season, match.home)
  const awayName = teamName(season, match.away)
  const homeInitials = getInitials(homeName)
  const awayInitials = getInitials(awayName)
  const homeIsFav = match.home === FAVORITE_TEAM
  const awayIsFav = match.away === FAVORITE_TEAM
  const draft = session.draft ?? {}
  const bonus = calculateBonusFlags({
    homeScore: toInt(draft.homeScore) ?? 0,
    awayScore: toInt(draft.awayScore) ?? 0,
    homeTries: toInt(draft.homeTries) ?? 0,
    awayTries: toInt(draft.awayTries) ?? 0,
  })
  const remainingLabel = `${session.remainingCount} match${session.remainingCount > 1 ? 's' : ''} restant${session.remainingCount > 1 ? 's' : ''}`
  const primaryLabel = session.remainingCount > 1 ? 'Enregistrer et continuer' : 'Valider la saisie'
  const complete = isCompleteDraft(draft)

  return `
    <div class="w-match-cockpit__handle" aria-hidden="true"></div>
    <button class="w-match-cockpit__close" type="button" aria-label="Fermer">×</button>
    <div class="w-match-cockpit__content">
      <header class="w-match-cockpit__hero">
        <div class="w-match-cockpit__kicker">Saisie guidée</div>
        <h2 class="w-match-cockpit__title">Cockpit de match</h2>
        <p class="w-match-cockpit__subtitle">Complétez le week-end sans perdre le fil.</p>
      </header>

      <section class="w-match-cockpit__status" aria-label="Progression de la saisie">
        <div class="w-match-cockpit__status-copy">
          <p class="w-match-cockpit__status-label">À faire maintenant</p>
          <strong data-cockpit-remaining>${esc(remainingLabel)}</strong>
          <span data-cockpit-progress>Match ${session.currentIndex} sur ${session.totalCount}</span>
        </div>
        <div class="w-match-cockpit__progress" style="--w-match-cockpit-progress:${Math.round((session.currentIndex / Math.max(1, session.totalCount)) * 100) * 3.6}deg">
          <strong>${Math.round((session.currentIndex / Math.max(1, session.totalCount)) * 100)}%</strong>
          <span>progression</span>
        </div>
      </section>

      <form class="w-match-cockpit__panel" aria-label="Match courant">
        <div class="w-match-cockpit__panel-head">
          <div>
            <p class="w-match-cockpit__panel-kicker">Match courant</p>
            <h3 class="w-match-cockpit__panel-title">Journée ${match.matchday}</h3>
          </div>
          <div class="w-match-cockpit__panel-meta">${session.currentIndex}/${session.totalCount}</div>
        </div>

        <div class="w-match-cockpit__match-tag">
          <strong>${esc(remainingLabel)}</strong>
          <span>Le cockpit reste bloquant tant que tout n’est pas validé.</span>
        </div>

        <div class="w-match-cockpit__duel">
          <div class="w-match-cockpit__team">
            <div class="w-match-cockpit__badge">${esc(homeInitials)}</div>
            <div class="w-match-cockpit__team-name${homeIsFav ? ' is-favorite' : ''}">${esc(homeName)}</div>
            <div class="w-match-cockpit__team-meta">Domicile</div>
          </div>
          <div class="w-match-cockpit__vs">VS</div>
          <div class="w-match-cockpit__team">
            <div class="w-match-cockpit__badge">${esc(awayInitials)}</div>
            <div class="w-match-cockpit__team-name${awayIsFav ? ' is-favorite' : ''}">${esc(awayName)}</div>
            <div class="w-match-cockpit__team-meta">Extérieur</div>
          </div>
        </div>

        <div class="w-match-cockpit__fields" aria-label="Champs de saisie">
          <label class="w-match-cockpit__field">
            <span>Score domicile</span>
            <input name="homeScore" type="number" inputmode="numeric" min="0" placeholder="0" value="${esc(draft.homeScore ?? '')}" aria-label="Score domicile">
          </label>
          <label class="w-match-cockpit__field">
            <span>Score extérieur</span>
            <input name="awayScore" type="number" inputmode="numeric" min="0" placeholder="0" value="${esc(draft.awayScore ?? '')}" aria-label="Score extérieur">
          </label>
          <label class="w-match-cockpit__field">
            <span>Essais domicile</span>
            <input name="homeTries" type="number" inputmode="numeric" min="0" placeholder="0" value="${esc(draft.homeTries ?? '')}" aria-label="Essais domicile">
          </label>
          <label class="w-match-cockpit__field">
            <span>Essais extérieur</span>
            <input name="awayTries" type="number" inputmode="numeric" min="0" placeholder="0" value="${esc(draft.awayTries ?? '')}" aria-label="Essais extérieur">
          </label>
        </div>

        <div class="w-match-cockpit__bonus" aria-live="polite">
          <span class="w-match-cockpit__bonus-chip" data-bonus-home>${bonus.home.offensive ? 'OFF +' : 'OFF -'} ${bonus.home.defensive ? 'DEF +' : 'DEF -'}</span>
          <span class="w-match-cockpit__bonus-chip" data-bonus-away>${bonus.away.offensive ? 'OFF +' : 'OFF -'} ${bonus.away.defensive ? 'DEF +' : 'DEF -'}</span>
        </div>

        <div class="w-match-cockpit__hint" data-cockpit-status role="status" aria-live="polite">
          ${complete ? 'Les bonus sont calculés automatiquement. Vous pouvez valider.' : 'Renseignez les 4 champs pour débloquer la validation.'}
        </div>

        <footer class="w-match-cockpit__actions" aria-label="Actions de saisie">
          <button class="w-match-cockpit__action w-match-cockpit__action--secondary" type="button" data-cockpit-close>Fermer</button>
          <button class="w-match-cockpit__action w-match-cockpit__action--primary" type="submit" data-cockpit-submit${complete ? '' : ' disabled'}>${primaryLabel}</button>
        </footer>
      </form>
    </div>`
}

function bindDialogEvents() {
  const form = dialog?.querySelector('.w-match-cockpit__panel')
  const closeBtn = dialog?.querySelector('.w-match-cockpit__close')
  const footerClose = dialog?.querySelector('[data-cockpit-close]')
  const finalRetryBtn = dialog?.querySelector('[data-cockpit-final-retry]')

  if (closeBtn) closeBtn.addEventListener('click', handleClose)
  if (footerClose) footerClose.addEventListener('click', handleClose)
  if (finalRetryBtn) finalRetryBtn.addEventListener('click', handleFinalRetry)
  if (form) {
    form.addEventListener('input', handleInput)
    form.addEventListener('submit', handleSubmit)
  }
}

function updateDraftFromForm() {
  if (!currentSession?.currentMatch || !dialog) return null

  const form = dialog.querySelector('.w-match-cockpit__panel')
  if (!(form instanceof HTMLFormElement)) return null

  const draft = {
    homeScore: toInt(form.elements.homeScore?.value),
    awayScore: toInt(form.elements.awayScore?.value),
    homeTries: toInt(form.elements.homeTries?.value),
    awayTries: toInt(form.elements.awayTries?.value),
  }

  return draft
}

function persistDraft(match, draft, validated = false) {
  const drafts = readDrafts()
  drafts[getMatchKey(match)] = {
    ...draft,
    validated,
    updatedAt: new Date().toISOString(),
  }
  writeDrafts(drafts)
  return drafts[getMatchKey(match)]
}

function handleInput() {
  if (!currentSession?.currentMatch) return
  const draft = updateDraftFromForm()
  if (!draft) return

  persistDraft(currentSession.currentMatch, draft, false)
  refreshPreview(currentSession, draft)
  setStatus('Les bonus se recalculent automatiquement.', 'info')
}

function focusFirstMissingInput(form) {
  const inputs = [...form.querySelectorAll('input')]
  const missing = inputs.find((input) => !Number.isInteger(Number(input.value)) || Number(input.value) < 0 || input.value === '')
  if (missing) missing.focus()
}

async function moveToNextMatch() {
  if (!currentSession?.season) return false
  currentSession = getCockpitSession(currentSession.season)

  if (currentSession.remainingCount === 0) {
    const payload = buildValidationPayload(currentSession.season)
    writeJSON(FINAL_STORAGE_KEY, payload)
    try {
      await submitFinalValidation(payload)
    } catch (error) {
      finalValidationPending = false
      dialog.innerHTML = renderFinalRetryState(backendErrorMessage(error))
      bindDialogEvents()
      return false
    }
    localStorage.removeItem(FINAL_STORAGE_KEY)
    dialog.innerHTML = `
      <div class="w-match-cockpit__handle" aria-hidden="true"></div>
      <button class="w-match-cockpit__close" type="button" aria-label="Fermer">×</button>
      <div class="w-match-cockpit__content">
        <div class="w-match-cockpit__empty w-match-cockpit__empty--done">
          <p class="w-match-cockpit__eyebrow">Validation finale</p>
          <h2 class="w-match-cockpit__title">Tous les matchs sont complets</h2>
          <p class="w-match-cockpit__subtitle">Le payload normalisé est prêt pour l’envoi au backend.</p>
          <div class="w-match-cockpit__hint" data-cockpit-status role="status" aria-live="polite">Validation finale prête.</div>
        </div>
      </div>`
    bindDialogEvents()
    setStatus('Validation finale prête.', 'success')
    return true
  }

  dialog.innerHTML = buildContent(currentSession)
  bindDialogEvents()
  focusFirstInput()
  return true
}

function buildValidationPayload(season) {
  const drafts = readDrafts()
  const entries = (Array.isArray(season?.calendar) ? season.calendar : [])
    .filter((match) => isPastMatch(match))
    .map((match) => {
      const draft = drafts[getMatchKey(match)]
      if (!draft || !isCompleteDraft(draft)) return null
      return normalizeMatchEntry(match, season, draft)
    })
    .filter(Boolean)

  return {
    seasonId: season?.season ?? season?.id ?? null,
    updatedAt: new Date().toISOString(),
    entries,
  }
}

async function postJSON(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(payload),
  })

  if (!response.ok) throw new Error(`admin-validation-${response.status}`)

  return response
}

async function handleFinalRetry() {
  if (finalValidationPending) return
  const payload = readFinalValidationPayload()
  if (!payload) return

  finalValidationPending = true
  const retryBtn = dialog?.querySelector('[data-cockpit-final-retry]')
  if (retryBtn) retryBtn.disabled = true
  setStatus('Validation backend en cours.', 'info')

  try {
    await submitFinalValidation(payload)
  } catch (error) {
    finalValidationPending = false
    dialog.innerHTML = renderFinalRetryState(backendErrorMessage(error))
    bindDialogEvents()
    return
  }

  localStorage.removeItem(FINAL_STORAGE_KEY)
  finalValidationPending = false
  dialog.innerHTML = `
    <div class="w-match-cockpit__handle" aria-hidden="true"></div>
    <button class="w-match-cockpit__close" type="button" aria-label="Fermer">×</button>
    <div class="w-match-cockpit__content">
      <div class="w-match-cockpit__empty w-match-cockpit__empty--done">
        <p class="w-match-cockpit__eyebrow">Validation finale</p>
        <h2 class="w-match-cockpit__title">Tous les matchs sont complets</h2>
        <p class="w-match-cockpit__subtitle">Le payload normalisé est prêt pour l’envoi au backend.</p>
        <div class="w-match-cockpit__hint" data-cockpit-status role="status" aria-live="polite">Validation finale prête.</div>
      </div>
    </div>`
  bindDialogEvents()
  setStatus('Validation finale prête.', 'success')
}

async function submitFinalValidation(payload) {
  for (const entry of payload.entries) {
    await postJSON('/api/admin/matches', {
      seasonId: payload.seasonId,
      matchday: entry.matchday,
      date: normalizeAdminDate(entry.date),
      homeTeamId: entry.home,
      awayTeamId: entry.away,
      homeScore: entry.score.home,
      awayScore: entry.score.away,
      homeTries: entry.tries.home,
      awayTries: entry.tries.away,
      homeBonus: entry.bonus.home,
      awayBonus: entry.bonus.away,
    })
  }

  await postJSON('/api/admin/recompute', { seasonId: payload.seasonId })
  await loadSeason(payload.seasonId)
}

async function handleSubmit(event) {
  event.preventDefault()
  if (finalValidationPending) return
  if (!currentSession?.currentMatch) return

  const draft = updateDraftFromForm()
  if (!draft || !isCompleteDraft(draft)) {
    setStatus('Complétez les 4 champs avant de valider.', 'danger')
    const form = dialog?.querySelector('.w-match-cockpit__panel')
    if (form) focusFirstMissingInput(form)
    return
  }

  persistDraft(currentSession.currentMatch, draft, true)
  const isFinalMatch = currentSession.remainingCount === 1
  if (isFinalMatch) {
    finalValidationPending = true
    const submitBtn = dialog?.querySelector('[data-cockpit-submit]')
    if (submitBtn) submitBtn.disabled = true
  }
  setStatus('Match validé. Passage au suivant.', 'success')
  const completed = await moveToNextMatch()
  if (isFinalMatch && !completed) finalValidationPending = false
}

function focusFirstInput() {
  const first = dialog?.querySelector('input[name="homeScore"]')
  if (first instanceof HTMLElement) first.focus()
}

function handleClose() {
  if (currentSession?.remainingCount > 0) {
    setStatus('Le cockpit reste ouvert tant qu’il reste des matchs à valider.', 'danger')
    return
  }

  close()
}

function renderSession(session) {
  ensureDialog(document.body)
  currentSession = session ?? currentSession ?? null

  if (!dialog) return
  dialog.innerHTML = buildContent(currentSession)
  dialog.setAttribute('aria-label', 'Cockpit de saisie guidée')
  dialog.classList.remove('w-match-cockpit--closing')
  bindDialogEvents()
  refreshPreview(currentSession, currentSession?.draft ?? {})
}

export function render(container) {
  finalValidationPending = false
  ensureDialog(container)
  return dialog
}

export function open(context = {}) {
  const session = context.season ? getCockpitSession(context.season) : currentSession ?? null
  if (!session) return

  currentSession = {
    ...session,
    ...context,
    currentMatch: context.match ?? session.currentMatch,
    draft: context.draft ?? session.draft ?? {},
  }

  if (!dialog) render(document.body)
  renderSession(currentSession)

  if (!dialog.open) dialog.showModal()
  focusFirstInput()
}

export function maybeOpen(season) {
  const session = getCockpitSession(season)
  if (session.remainingCount > 0) open({ season, match: session.currentMatch, draft: session.draft })
  else if (readFinalValidationPayload()) {
    if (!dialog) render(document.body)
    dialog.innerHTML = renderFinalRetryState()
    bindDialogEvents()
    if (!dialog.open) dialog.showModal()
  }
}

export function close() {
  if (!dialog || !dialog.open) return
  dialog.close()
}

export { buildValidationPayload, calculateBonusFlags, getCockpitSession, getMatchKey, getRemainingMatches, normalizeMatchEntry }
