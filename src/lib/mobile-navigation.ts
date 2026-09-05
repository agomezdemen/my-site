type MobileNavigationParts = {
  binder: HTMLElement
  tabsHost: HTMLElement
  toggle: HTMLButtonElement
}

export function initializeMobileNavigation({ binder, tabsHost, toggle }: MobileNavigationParts): void {
  const setOpen = (open: boolean) => {
    binder.dataset.navOpen = String(open)
    toggle.setAttribute('aria-expanded', String(open))
    toggle.querySelector('.visually-hidden')?.replaceChildren(open ? 'Close navigation' : 'Open navigation')
  }

  toggle.addEventListener('click', () => {
    setOpen(binder.dataset.navOpen !== 'true')
  })

  tabsHost.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('a')) {
      setOpen(false)
    }
  })

  binder.addEventListener('click', (event) => {
    if (event.target instanceof HTMLElement && event.target.matches('[data-nav-scrim]')) {
      setOpen(false)
    }
  })

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setOpen(false)
    }
  })

  setOpen(false)
}
