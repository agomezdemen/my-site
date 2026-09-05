import { getBlogPostsForProject, type BlogPost } from '../lib/blog.ts'
import { escapeHtml } from '../lib/html.ts'
import { projects } from '../lib/projects.ts'

export function renderProjectDetailPage(slug: string): { title: string; html: string } {
  const project = projects.find((candidate) => candidate.slug === slug)

  if (!project) {
    return {
      title: 'Project not found',
      html: `
        <section class="stack stack--narrow">
          <p class="eyebrow">Projects</p>
          <h1>Project not found</h1>
          <p>This project route is not registered yet.</p>
          <p><a href="/projects" data-link>Back to Projects</a></p>
        </section>
      `,
    }
  }

  const relatedPosts = getBlogPostsForProject(project.slug)

  return {
    title: project.title,
    html: `
      <article class="stack">
        <p class="eyebrow">Project Detail</p>
        <h1>${escapeHtml(project.title)}</h1>
        <p class="lede">${escapeHtml(project.summary)}</p>
        <ul class="tech-list tech-list--large" aria-label="${escapeHtml(project.title)} technologies">
          ${project.technologies.map((tech) => `<li>${escapeHtml(tech)}</li>`).join('')}
        </ul>
        <div class="project-sections">
          ${project.sections
            .map(
              (section) => `
                <section>
                  <h2>${escapeHtml(section.title)}</h2>
                  ${renderSectionBody(section.body)}
                  ${renderSectionBullets(section.bullets)}
                </section>
              `,
            )
            .join('')}
        </div>
        ${renderRelatedPosts(relatedPosts)}
      </article>
    `,
  }
}

function renderSectionBody(body: string | string[]): string {
  const paragraphs = Array.isArray(body) ? body : [body]

  return paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')
}

function renderSectionBullets(bullets: string[] | undefined): string {
  if (!bullets || bullets.length === 0) {
    return ''
  }

  return `
    <ul class="project-detail-list">
      ${bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join('')}
    </ul>
  `
}

function renderRelatedPosts(posts: BlogPost[]): string {
  if (posts.length === 0) {
    return ''
  }

  return `
    <section class="related-panel related-panel--carousel" aria-labelledby="related-posts-heading" data-related-carousel>
      <div class="related-panel__header">
        <div>
          <p class="eyebrow">Related Writing</p>
          <h2 id="related-posts-heading">Blog posts about this project</h2>
        </div>
        <div class="related-controls" aria-label="Related post controls">
          <button type="button" data-related-previous aria-label="Show previous related posts">←</button>
          <button type="button" data-related-next aria-label="Show next related posts">→</button>
        </div>
      </div>
      <div class="related-list related-list--horizontal" data-related-track tabindex="0" aria-label="Related blog posts">
        ${posts
          .map(
            (post) => `
              <article class="related-item">
                <time datetime="${post.date}">${formatDate(post.date)}</time>
                <h3><a href="/blog/${post.slug}" data-link>${escapeHtml(post.title)}</a></h3>
                <p>${escapeHtml(post.description)}</p>
              </article>
            `,
          )
          .join('')}
      </div>
    </section>
  `
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value))
}
