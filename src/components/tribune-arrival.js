import '../styles/components/tribune-arrival.css'
import { set } from '../store.js'
import { render as renderScoreCard } from './score-card.js'

export const TRIBUNE_ARRIVAL_SESSION_KEY = 'w-tribune-arrival-closed'

export function isClosedForSession() {
  return sessionStorage.getItem(TRIBUNE_ARRIVAL_SESSION_KEY) === '1'
}

export function closeForSession() {
  sessionStorage.setItem(TRIBUNE_ARRIVAL_SESSION_KEY, '1')
  set('tribuneArrivalClosed', true)
}

export function render(container) {
  const section = document.createElement('section')
  section.className = 'w-tribune-arrival'
  section.setAttribute('aria-labelledby', 'tribune-arrival-title')

  const ticket = document.createElement('article')
  ticket.className = 'w-tribune-arrival__ticket'
  ticket.setAttribute('aria-label', 'Billet Tribune La Rochelle seul')

  const head = document.createElement('div')
  head.className = 'w-tribune-arrival__ticket-head'
  head.innerHTML = '<span>Whistle Tribune</span><span class="w-tribune-arrival__seat">Bloc SR</span>'

  const body = document.createElement('div')
  body.className = 'w-tribune-arrival__ticket-body'

  const title = document.createElement('h1')
  title.id = 'tribune-arrival-title'
  title.className = 'w-tribune-arrival__title'
  title.textContent = 'Ton billet du lundi.'

  const copy = document.createElement('p')
  copy.className = 'w-tribune-arrival__copy'
  copy.textContent = "D'abord toute la Tribune rochelaise. Le championnat attend le coup de sifflet."

  const cardSlot = document.createElement('div')
  cardSlot.className = 'w-tribune-arrival__card'

  const note = document.createElement('p')
  note.className = 'w-tribune-arrival__note'
  note.textContent = 'Pre-fermeture : aucun classement, aucun bouton de projection.'

  const closeZone = document.createElement('div')
  closeZone.className = 'w-tribune-arrival__close-zone'

  const button = document.createElement('button')
  button.className = 'w-tribune-arrival__close'
  button.type = 'button'
  button.textContent = 'Fermer'
  button.setAttribute('aria-label', 'Fermer la Tribune et afficher le classement')
  button.addEventListener('click', closeForSession)

  body.append(title, copy, cardSlot)
  ticket.append(head, body)
  closeZone.append(button)
  section.append(ticket, note, closeZone)
  container.appendChild(section)
  renderScoreCard(cardSlot, { forceDetaille: true })
}
