import { renderBlogPostNav } from '../components/blog-post-nav.ts'
import { getBlogPost, getBlogPosts } from '../lib/blog.ts'
import { escapeHtml } from '../lib/html.ts'
import { projects } from '../lib/projects.ts'

export function renderBlogPostPage(slug: string): { title: string; html: string } {
  const posts = getBlogPosts()
  const post = getBlogPost(slug)

  if (!post) {
    return {
      title: 'Post not found',
      html: `
        <section class="stack stack--narrow">
          <p class="eyebrow">Blog</p>
          <h1>Post not found</h1>
          <p>This blog post does not exist.</p>
          <p><a href="/blog" data-link>Back to Blog</a></p>
        </section>
      `,
    }
  }

  return {
    title: post.title,
    html: `
      ${renderBlogPostNav(posts, post.slug)}
      <article class="markdown-article">
        <header class="article-header">
          <p class="eyebrow">Blog</p>
          <h1>${escapeHtml(post.title)}</h1>
          <time datetime="${post.date}">${formatDate(post.date)}</time>
          <p>${escapeHtml(post.description)}</p>
        </header>
        <div class="markdown-body">
          ${post.html}
        </div>
        ${renderRelatedProjects(post.relatedProjects)}
      </article>
    `,
  }
}

function renderRelatedProjects(projectSlugs: string[]): string {
  const relatedProjects = projectSlugs
    .map((slug) => projects.find((project) => project.slug === slug))
    .filter((project) => project !== undefined)

  if (relatedProjects.length === 0) {
    return ''
  }

  return `
    <aside class="related-panel related-panel--article" aria-labelledby="related-projects-heading">
      <p class="eyebrow">Related Project</p>
      <h2 id="related-projects-heading">Project referenced by this post</h2>
      <div class="related-list">
        ${relatedProjects
          .map(
            (project) => `
              <article class="related-item">
                <h3><a href="/projects/${project.slug}" data-link>${escapeHtml(project.title)}</a></h3>
                <p>${escapeHtml(project.summary)}</p>
              </article>
            `,
          )
          .join('')}
      </div>
    </aside>
  `
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(value))
}
