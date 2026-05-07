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

  const cardSlot = document.createElement('div')
  cardSlot.className = 'w-tribune-arrival__card'

  const title = document.createElement('p')
  title.id = 'tribune-arrival-title'
  title.className = 'w-tribune-arrival__kicker'
  title.textContent = 'Billet du lundi'

  const note = document.createElement('p')
  note.className = 'w-tribune-arrival__note'
  note.textContent = 'Le classement et la projection attendent la fermeture de la Tribune.'

  const closeZone = document.createElement('div')
  closeZone.className = 'w-tribune-arrival__close-zone'

  const button = document.createElement('button')
  button.className = 'w-tribune-arrival__close'
  button.type = 'button'
  button.textContent = 'Fermer'
  button.setAttribute('aria-label', 'Fermer la Tribune et afficher le classement')
  button.addEventListener('click', closeForSession)

  closeZone.append(button)
  section.append(title, cardSlot, note, closeZone)
  container.appendChild(section)
  renderScoreCard(cardSlot, { forceDetaille: true })
}
