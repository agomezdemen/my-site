import { getBlogPostsNewestFirst } from '../lib/blog.ts'
import { escapeHtml } from '../lib/html.ts'

export function renderBlogIndexPage(): { title: string; html: string } {
  const posts = getBlogPostsNewestFirst()

  return {
    title: 'Blog',
    html: `
      <section class="stack">
        <p class="eyebrow">Blog</p>
        <h1>Projects, things I’m learning, and ideas I’m thinking about.</h1>
        ${renderPostList(posts)}
      </section>
    `,
  }
}

function renderPostList(posts: ReturnType<typeof getBlogPostsNewestFirst>): string {
  if (posts.length === 0) {
    return '<p class="empty-state">No posts published yet.</p>'
  }

  return `
    <div class="post-list">
      ${posts
        .map(
          (post) => `
            <article class="post-card">
              <h2><a href="/blog/${post.slug}" data-link>${escapeHtml(post.title)}</a></h2>
              <time datetime="${post.date}">${formatDate(post.date)}</time>
              <p>${escapeHtml(post.description)}</p>
            </article>
          `,
        )
        .join('')}
    </div>
  `
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value))
}
