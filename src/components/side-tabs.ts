export type PrimarySection = 'about' | 'projects' | 'blog' | 'contact'

type Tab = {
  section: PrimarySection
  label: string
  path: string
}

const tabs: Tab[] = [
  { section: 'about', label: 'About', path: '/about' },
  { section: 'projects', label: 'Projects', path: '/projects' },
  { section: 'blog', label: 'Blog', path: '/blog' },
  { section: 'contact', label: 'Contact', path: '/contact' },
]

export function createSideTabs(activeSection: PrimarySection): HTMLElement {
  const nav = document.createElement('nav')
  nav.className = 'side-tabs'
  nav.id = 'primary-navigation'
  nav.setAttribute('aria-label', 'Primary sections')

  const list = document.createElement('ul')
  list.className = 'side-tabs__list'

  for (const tab of tabs) {
    const item = document.createElement('li')
    const link = document.createElement('a')
    link.className = 'side-tab'
    link.href = tab.path
    link.dataset.link = ''
    link.dataset.section = tab.section
    link.textContent = tab.label

    if (tab.section === activeSection) {
      link.classList.add('side-tab--active')
      link.setAttribute('aria-current', 'page')
    }

    item.append(link)
    list.append(item)
  }

  nav.append(list)
  return nav
}
