export function initializeRelatedCarousels(root: HTMLElement): void {
  const carousels = root.querySelectorAll<HTMLElement>('[data-related-carousel]')

  for (const carousel of carousels) {
    const track = carousel.querySelector<HTMLElement>('[data-related-track]')
    const previous = carousel.querySelector<HTMLButtonElement>('[data-related-previous]')
    const next = carousel.querySelector<HTMLButtonElement>('[data-related-next]')

    if (!track || !previous || !next) {
      continue
    }

    const updateControls = () => {
      previous.disabled = track.scrollLeft <= 1
      next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 1
    }

    const scrollByCard = (direction: -1 | 1) => {
      const firstCard = track.querySelector<HTMLElement>('.related-item')
      const distance = firstCard ? firstCard.offsetWidth + 16 : track.clientWidth * 0.8
      track.scrollBy({ left: distance * direction, behavior: 'smooth' })
    }

    previous.addEventListener('click', () => scrollByCard(-1))
    next.addEventListener('click', () => scrollByCard(1))
    track.addEventListener('scroll', updateControls, { passive: true })
    updateControls()
  }
}
