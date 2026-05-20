import '../styles/components/admin-access.css'

const SESSION_URL = '/api/admin/session'
const LOGIN_URL = '/api/admin/login'
const RECOMPUTE_URL = '/api/admin/recompute'
const SEASON_ID = '2025-2026'
const PUBLIC_SEASON_URL = `/api/public/season?season=${SEASON_ID}`

let root = null
let passwordInput = null
let submitButton = null
let messageEl = null
let recomputeButton = null
let recomputeResultEl = null
let diagnosticEl = null
let diagnosticRequestId = 0

function safeFetch(url, options) {
  if (typeof fetch !== 'function') return Promise.reject(new Error('fetch-unavailable'))
  return fetch(url, options)
}

function setMessage(message, role = 'status') {
  if (!messageEl) return
  messageEl.setAttribute('role', role)
  messageEl.textContent = message
  messageEl.hidden = message === ''
}

function messageForStatus(status) {
  if (status === 401) return 'Mot de passe incorrect.'
  if (status === 429) return 'Trop de tentatives. Reessaye dans une minute.'
  if (status === 503) return 'Configuration admin indisponible cote serveur.'
  return 'Connexion admin impossible pour le moment.'
}

function recomputeMessageFor(status, error) {
  if (status === 401) return 'Session admin expiree. Reconnecte-toi puis relance.'
  if (status === 400 || error === 'invalid-json' || error === 'invalid-season') {
    return 'Donnees de saison manquantes ou invalides. Verifie l initialisation DB.'
  }
  if (status === 422 || error === 'recalculation-failed') return 'Recalcul impossible. Verifie les matchs importes puis relance.'
  if (status === 503) return 'Base de donnees indisponible. Reessaye apres retablissement Vercel.'
  return 'Recalcul impossible pour le moment. Verifie le runtime puis relance.'
}

function publicDiagnosticMessageFor(status, error) {
  if (status === 404 && error === 'projection-not-found') {
    return 'Snapshot public absent. Lance un recalcul pour creer le premier JSON public.'
  }
  if (status === 404 && error === 'season-not-found') return 'Saison absente. Verifie le seed de la base Vercel.'
  if (status === 409 && error === 'projection-stale') return 'Snapshot public en retard. Lance un recalcul apres avoir saisi les derniers matchs.'
  if (status === 409 && error === 'projection-incomplete') return 'Snapshot public incomplet. Verifie les journees avec moins de 7 matchs joues avant de recalculer.'
  if (status === 503 || error === 'storage-unavailable') return 'Stockage public indisponible. Verifie Vercel Postgres.'
  return 'Diagnostic public indisponible. Relance apres verification du runtime.'
}

function hasPublicFreshness(data) {
  return typeof data?.lastUpdated === 'string' && data.lastUpdated.trim() !== '' && Number.isInteger(data?.matchday)
}

async function readJson(response) {
  try {
    return await response.json()
  } catch (_error) {
    return {}
  }
}

function setRecomputeResult(message, role = 'status') {
  if (!recomputeResultEl) return
  recomputeResultEl.setAttribute('role', role)
  recomputeResultEl.textContent = message
  recomputeResultEl.hidden = message === ''
}

function setDiagnostic(message) {
  if (!diagnosticEl) return
  diagnosticEl.textContent = message
  diagnosticEl.hidden = message === ''
}

async function refreshPublicDiagnostic() {
  const requestId = ++diagnosticRequestId
  setDiagnostic('Session admin valide. Verification du JSON public...')

  try {
    const response = await safeFetch(PUBLIC_SEASON_URL, { cache: 'no-store' })
    const data = await readJson(response)
    if (requestId !== diagnosticRequestId) return

    if (response.ok && hasPublicFreshness(data)) {
      setDiagnostic(`Session admin valide. JSON public disponible. Fraicheur : ${data.lastUpdated}. Matchday : journee ${data.matchday}.`)
      return
    }

    if (response.ok) {
      setDiagnostic('Session admin valide. Diagnostic public indisponible. Relance apres verification du runtime.')
      return
    }

    setDiagnostic(`Session admin valide. ${publicDiagnosticMessageFor(response.status, data.error)}`)
  } catch (_error) {
    if (requestId !== diagnosticRequestId) return
    setDiagnostic('Session admin valide. Stockage public indisponible. Verifie Vercel Postgres.')
  }
}

function setRecomputePending(isPending) {
  if (!recomputeButton) return
  recomputeButton.disabled = isPending
  recomputeButton.textContent = isPending ? 'Recalcul en cours...' : 'Recalculer la saison'
}

async function recomputeSeason() {
  setRecomputePending(true)
  setRecomputeResult('Recalcul en cours...')

  try {
    const response = await safeFetch(RECOMPUTE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seasonId: SEASON_ID }),
    })
    const data = await readJson(response)

    if (response.ok && data.recalculated === true) {
      setRecomputeResult(`Snapshot cree : ${data.snapshotId}. Matchday : journee ${data.matchday}.`)
      await refreshPublicDiagnostic()
      return
    }

    setRecomputeResult(recomputeMessageFor(response.status, data.error), 'alert')
  } catch (_error) {
    setRecomputeResult('Base de donnees indisponible. Reessaye apres retablissement Vercel.', 'alert')
  } finally {
    setRecomputePending(false)
  }
}

function renderPanel() {
  if (!root) return
  root.classList.add('w-admin-access--authenticated')
  root.querySelector('.w-admin-access__body').replaceChildren(buildPanel())
}

function buildPanel() {
  const panel = document.createElement('section')
  panel.className = 'w-admin-access__panel'
  panel.setAttribute('aria-label', 'Session admin valide')
  panel.innerHTML = `
    <p class="w-admin-access__eyebrow">Session valide</p>
    <h2>Actions admin</h2>
    <p class="w-admin-access__copy">La session admin est active. Declenche le recalcul serveur pour creer ou rafraichir le snapshot public.</p>
    <p class="w-admin-access__diagnostic" aria-live="polite">Session admin valide. Diagnostic public en attente.</p>
    <div class="w-admin-access__actions" aria-label="Actions admin">
      <button class="w-admin-access__button" type="button" data-admin-action="recompute">Recalculer la saison</button>
      <p class="w-admin-access__result" aria-live="polite" hidden></p>
      <span class="w-admin-access__hint">Saison cible : 2025-2026</span>
    </div>
  `
  recomputeButton = panel.querySelector('[data-admin-action="recompute"]')
  recomputeResultEl = panel.querySelector('.w-admin-access__result')
  diagnosticEl = panel.querySelector('.w-admin-access__diagnostic')
  recomputeButton.addEventListener('click', recomputeSeason)
  refreshPublicDiagnostic()
  return panel
}

function setPending(isPending) {
  if (submitButton) submitButton.disabled = isPending
  if (passwordInput) passwordInput.disabled = isPending
}

async function submitLogin(event) {
  event.preventDefault()
  if (!passwordInput) return

  const password = passwordInput.value
  setPending(true)
  setMessage('Connexion en cours...')

  try {
    const response = await safeFetch(LOGIN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (!response.ok) {
      passwordInput.value = ''
      setMessage(messageForStatus(response.status), 'alert')
      return
    }

    const data = await response.json()
    passwordInput.value = ''

    if (data.authenticated === true) {
      renderPanel()
      return
    }

    setMessage(messageForStatus(response.status), 'alert')
  } catch (_error) {
    passwordInput.value = ''
    setMessage('Connexion admin impossible pour le moment.', 'alert')
  } finally {
    setPending(false)
  }
}

function buildForm() {
  const wrapper = document.createElement('section')
  wrapper.className = 'w-admin-access__login'
  wrapper.innerHTML = `
    <p class="w-admin-access__eyebrow">Acces protege</p>
    <h1>Admin Whistle</h1>
    <p class="w-admin-access__copy">Connecte la session admin Vercel pour piloter l'initialisation sans console navigateur.</p>
    <form class="w-admin-access__form">
      <label class="w-admin-access__label" for="admin-password">Mot de passe admin</label>
      <input class="w-admin-access__input" id="admin-password" name="password" type="password" autocomplete="current-password" required />
      <button class="w-admin-access__button" type="submit">Ouvrir la session</button>
    </form>
    <p class="w-admin-access__message" aria-live="polite" hidden></p>
  `

  const form = wrapper.querySelector('form')
  passwordInput = wrapper.querySelector('[name="password"]')
  submitButton = wrapper.querySelector('button')
  messageEl = wrapper.querySelector('.w-admin-access__message')
  form.addEventListener('submit', submitLogin)

  return wrapper
}

async function checkSession() {
  try {
    const response = await safeFetch(SESSION_URL, { cache: 'no-store' })
    const data = await response.json()
    if (data.authenticated === true) renderPanel()
  } catch (_error) {
    setMessage('Verification session indisponible. Connexion manuelle possible.', 'alert')
  }
}

export function render(container) {
  root = document.createElement('main')
  root.className = 'w-admin-access'
  root.setAttribute('aria-labelledby', 'admin-access-title')
  root.innerHTML = `
    <div class="w-admin-access__shell">
      <header class="w-admin-access__header">
        <span class="w-admin-access__brand" aria-label="Whistle">Whistle</span>
        <span class="w-admin-access__badge">Vercel admin</span>
      </header>
      <div class="w-admin-access__body"></div>
      <aside class="w-admin-access__note" aria-label="Regles de securite">
        Lecture publique sans auth. Secrets jamais affiches. Session courte cote serveur.
      </aside>
    </div>
  `

  const title = document.createElement('span')
  title.id = 'admin-access-title'
  title.className = 'w-admin-access__sr-only'
  title.textContent = 'Acces admin protege Whistle'
  root.prepend(title)
  root.querySelector('.w-admin-access__body').appendChild(buildForm())
  container.replaceChildren(root)
  checkSession()
}
