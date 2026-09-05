import { createSideTabs, type PrimarySection } from '../components/side-tabs.ts'
import { initializeRelatedCarousels } from '../lib/related-carousel.ts'
import { renderAboutPage } from '../pages/about.ts'
import { renderBlogIndexPage } from '../pages/blog.ts'
import { renderBlogPostPage } from '../pages/blog-post.ts'
import { renderContactPage } from '../pages/contact.ts'
import { renderProjectDetailPage } from '../pages/project-detail.ts'
import { renderProjectsPage } from '../pages/projects.ts'

export type Route =
  | { kind: 'about'; section: 'about'; title: string }
  | { kind: 'projects'; section: 'projects'; title: string }
  | { kind: 'project-detail'; section: 'projects'; title: string; slug: string }
  | { kind: 'blog'; section: 'blog'; title: string }
  | { kind: 'blog-post'; section: 'blog'; title: string; slug: string }
  | { kind: 'contact'; section: 'contact'; title: string }
  | { kind: 'not-found'; section: PrimarySection; title: string }

type RouterParts = {
  content: HTMLElement
  tabsHost: HTMLElement
  binder: HTMLElement
}

const pageTitles: Record<Route['kind'], string> = {
  about: 'About',
  projects: 'Projects',
  'project-detail': 'Project',
  blog: 'Blog',
  'blog-post': 'Blog',
  contact: 'Contact',
  'not-found': 'Page not found',
}

export function resolveRoute(pathname: string): Route {
  const path = normalizePath(pathname)

  if (path === '/' || path === '/about') {
    return { kind: 'about', section: 'about', title: 'About' }
  }

  if (path === '/projects') {
    return { kind: 'projects', section: 'projects', title: 'Projects' }
  }

  if (path.startsWith('/projects/')) {
    return {
      kind: 'project-detail',
      section: 'projects',
      title: 'Project',
      slug: decodeURIComponent(path.replace('/projects/', '')),
    }
  }

  if (path === '/blog') {
    return { kind: 'blog', section: 'blog', title: 'Blog' }
  }

  if (path.startsWith('/blog/')) {
    return {
      kind: 'blog-post',
      section: 'blog',
      title: 'Blog',
      slug: decodeURIComponent(path.replace('/blog/', '')),
    }
  }

  if (path === '/contact') {
    return { kind: 'contact', section: 'contact', title: 'Contact' }
  }

  return { kind: 'not-found', section: 'about', title: 'Page not found' }
}

export function navigateTo(pathname: string): void {
  const normalized = normalizePath(pathname)
  if (normalized === normalizePath(window.location.pathname)) {
    return
  }

  window.history.pushState({}, '', normalized)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function startRouter(parts: RouterParts): void {
  const render = () => {
    const route = resolveRoute(window.location.pathname)
    renderRoute(route, parts)
  }

  document.addEventListener('click', (event) => {
    const target = event.target
    if (!(target instanceof Element)) {
      return
    }

    const link = target.closest<HTMLAnchorElement>('a[data-link]')
    if (!link || link.target || link.origin !== window.location.origin) {
      return
    }

    event.preventDefault()
    navigateTo(link.pathname)
  })

  window.addEventListener('popstate', render)
  render()
}

async function renderRoute(route: Route, { content, tabsHost, binder }: RouterParts): Promise<void> {
  replacePrimaryTabs(tabsHost, route.section)
  binder.dataset.activeSection = route.section
  content.classList.remove('page-content--entered')
  content.setAttribute('aria-busy', 'true')
  content.innerHTML = '<p class="loading-note">Loading page...</p>'

  const rendered = await loadRoute(route)
  document.title = `${rendered.title} | Alejandro Gomez de Mendieta`
  content.innerHTML = rendered.html
  content.setAttribute('aria-busy', 'false')
  initializeRelatedCarousels(content)
  content.focus({ preventScroll: true })

  requestAnimationFrame(() => {
    content.classList.add('page-content--entered')
  })
}

function replacePrimaryTabs(tabsHost: HTMLElement, section: PrimarySection): void {
  const background = tabsHost.querySelector<HTMLCanvasElement>('.rail-field')
  const tabs = createSideTabs(section)

  if (background) {
    tabsHost.replaceChildren(background, tabs)
    return
  }

  tabsHost.replaceChildren(tabs)
}

async function loadRoute(route: Route): Promise<{ title: string; html: string }> {
  switch (route.kind) {
    case 'about':
      return { title: pageTitles.about, html: renderAboutPage() }
    case 'projects':
      return { title: pageTitles.projects, html: renderProjectsPage() }
    case 'project-detail':
      return renderProjectDetailPage(route.slug)
    case 'blog':
      return renderBlogIndexPage()
    case 'blog-post':
      return renderBlogPostPage(route.slug)
    case 'contact':
      return { title: pageTitles.contact, html: renderContactPage() }
    case 'not-found':
      return {
        title: pageTitles['not-found'],
        html: `
          <section class="stack stack--narrow">
            <p class="eyebrow">404</p>
            <h1>Page not found</h1>
            <p>The route you requested does not exist yet.</p>
            <p><a href="/about" data-link>Return to About</a></p>
          </section>
        `,
      }
  }
}

function normalizePath(pathname: string): string {
  const withoutTrailingSlash = pathname.replace(/\/+$/, '')
  return withoutTrailingSlash || '/'
}
