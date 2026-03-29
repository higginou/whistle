import '../styles/components/page-layout.css'

/** @returns {HTMLElement} */
export function render() {
  const main = document.createElement('main')
  main.className = 'w-page-layout'

  main.innerHTML = `
    <section class="w-hero-section" aria-label="Equipe favorite"></section>
    <section class="w-achievements-section" aria-label="Performances du modele"></section>
    <section class="w-reveal-section"></section>
    <section class="w-standings-section" aria-label="Classement">
      <h2 class="w-standings-title">Classement</h2>
    </section>
    <section class="w-schedule-section" aria-label="Prochains matchs">
      <h2 class="w-schedule-title">Prochains matchs</h2>
    </section>
  `

  return main
}
