import { renderMarkdown } from './markdown.ts'

export type BlogFrontmatter = {
  title: string
  date: string
  description: string
  slug?: string
  relatedProjects?: string[]
}

export type BlogPost = Omit<BlogFrontmatter, 'relatedProjects'> & {
  slug: string
  relatedProjects: string[]
  html: string
}

const modules = import.meta.glob('../content/blog/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

export function getBlogPosts(): BlogPost[] {
  return Object.entries(modules)
    .map(([path, raw]) => parsePost(path, String(raw)))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function getBlogPostsNewestFirst(): BlogPost[] {
  return [...getBlogPosts()].reverse()
}

export function getBlogPost(slug: string): BlogPost | undefined {
  return getBlogPosts().find((post) => post.slug === slug)
}

export function getBlogPostsForProject(projectSlug: string): BlogPost[] {
  return getBlogPostsNewestFirst().filter((post) => post.relatedProjects.includes(projectSlug))
}

function parsePost(path: string, raw: string): BlogPost {
  const { frontmatter, body } = parseFrontmatter(raw)
  const fallbackSlug = path.split('/').pop()?.replace(/\.md$/, '') ?? 'post'
  const slug = frontmatter.slug ? slugify(frontmatter.slug) : slugify(fallbackSlug)

  return {
    title: frontmatter.title ?? titleFromSlug(slug),
    date: frontmatter.date ?? '1970-01-01',
    description: frontmatter.description ?? '',
    relatedProjects: frontmatter.relatedProjects ?? [],
    slug,
    html: renderMarkdown(body),
  }
}

function parseFrontmatter(raw: string): { frontmatter: Partial<BlogFrontmatter>; body: string } {
  if (!raw.startsWith('---')) {
    return { frontmatter: {}, body: raw }
  }

  const end = raw.indexOf('\n---', 3)
  if (end === -1) {
    return { frontmatter: {}, body: raw }
  }

  const frontmatter = raw
    .slice(3, end)
    .split('\n')
    .reduce<Partial<BlogFrontmatter>>((acc, line) => {
      const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line.trim())
      if (!match) {
        return acc
      }

      const key = match[1] as keyof BlogFrontmatter
      const rawValue = match[2].trim()
      const value = rawValue.replace(/^["']|["']$/g, '').trim()
      if (key === 'title' || key === 'date' || key === 'description' || key === 'slug') {
        acc[key] = value
      }

      if (key === 'relatedProjects') {
        acc.relatedProjects = parseSlugList(rawValue)
      }

      return acc
    }, {})

  return { frontmatter, body: raw.slice(end + 4).trim() }
}

function parseSlugList(value: string): string[] {
  const normalized = value.trim().replace(/^\[/, '').replace(/\]$/, '')

  return normalized
    .split(',')
    .map((item) => item.replace(/^["']|["']$/g, '').trim())
    .filter(Boolean)
    .map(slugify)
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function titleFromSlug(slug: string): string {
  return slug
    .split('-')
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ')
}
