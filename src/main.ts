import './styles/global.css'
import './styles/layout.css'
import './styles/tabs.css'
import './styles/blog.css'
import './styles/projects.css'
import { createSideTabs } from './components/side-tabs.ts'
import { initializeMobileNavigation } from './lib/mobile-navigation.ts'
import { initializeSideTabMotion } from './lib/side-tab-motion.ts'
import { initializeTheme } from './lib/theme.ts'
import { resolveRoute, startRouter } from './router/router.ts'

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('Missing #app root element')
}

app.innerHTML = `
  <div class="site-shell">
    <div class="binder" data-binder>
      <div class="tab-slot" data-tabs></div>
      <button class="nav-scrim" type="button" data-nav-scrim aria-label="Close navigation"></button>
      <section class="page-frame" aria-label="Portfolio page">
        <header class="page-header">
          <button class="menu-toggle" type="button" data-menu-toggle aria-controls="primary-navigation" aria-expanded="false">
            <span aria-hidden="true">☰</span>
            <span class="visually-hidden">Open navigation</span>
          </button>
          <a class="brand-link" href="/about" data-link aria-label="Go to About">
            <span class="brand-mark" aria-hidden="true">~/</span>
            <span>alejandro</span>
          </a>
          <div class="secondary-actions" aria-label="Secondary links">
            <a href="https://github.com/agomezdemen" target="_blank" rel="noreferrer">GitHub</a>
            <a href="https://www.linkedin.com/in/alejandro-gomez-de-mendieta/" target="_blank" rel="noreferrer">LinkedIn</a>
            <a class="resume-action" href="/resume.pdf" target="_blank" rel="noreferrer">Resume</a>
            <button class="theme-toggle" type="button" data-theme-toggle aria-pressed="false">☾</button>
          </div>
        </header>
        <main id="content" class="page-content" tabindex="-1"></main>
      </section>
    </div>
  </div>
`

const tabsHost = app.querySelector<HTMLElement>('[data-tabs]')
const content = app.querySelector<HTMLElement>('#content')
const binder = app.querySelector<HTMLElement>('[data-binder]')
const themeToggle = app.querySelector<HTMLButtonElement>('[data-theme-toggle]')
const menuToggle = app.querySelector<HTMLButtonElement>('[data-menu-toggle]')

if (!tabsHost || !content || !binder || !themeToggle || !menuToggle) {
  throw new Error('Portfolio shell failed to initialize')
}

initializeTheme(themeToggle)
tabsHost.replaceChildren(createSideTabs(resolveRoute(window.location.pathname).section))
initializeSideTabMotion(tabsHost)
initializeMobileNavigation({ binder, tabsHost, toggle: menuToggle })
startRouter({ content, tabsHost, binder })
