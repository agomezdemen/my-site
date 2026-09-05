type Theme = 'light' | 'dark'

const storageKey = 'portfolio-theme'

export function initializeTheme(toggle: HTMLButtonElement): void {
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const stored = readStoredTheme()
  const initialTheme = stored ?? (media.matches ? 'dark' : 'light')

  applyTheme(initialTheme, toggle)

  toggle.addEventListener('click', () => {
    const nextTheme: Theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem(storageKey, nextTheme)
    applyTheme(nextTheme, toggle)
  })

  media.addEventListener('change', (event) => {
    if (readStoredTheme()) {
      return
    }

    applyTheme(event.matches ? 'dark' : 'light', toggle)
  })
}

function readStoredTheme(): Theme | null {
  const value = localStorage.getItem(storageKey)
  return value === 'light' || value === 'dark' ? value : null
}

function applyTheme(theme: Theme, toggle: HTMLButtonElement): void {
  document.documentElement.dataset.theme = theme
  toggle.setAttribute('aria-pressed', String(theme === 'dark'))
  toggle.textContent = theme === 'dark' ? '☀' : '☾'
  toggle.title = `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`
  toggle.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`)
}
