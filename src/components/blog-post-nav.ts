import type { BlogPost } from '../lib/blog.ts'
import { escapeHtml } from '../lib/html.ts'

export function renderBlogPostNav(postsOldestFirst: BlogPost[], currentSlug: string): string {
  const index = postsOldestFirst.findIndex((post) => post.slug === currentSlug)
  if (index === -1) {
    return ''
  }

  const current = postsOldestFirst[index]
  const older = postsOldestFirst[index - 1]
  const newer = postsOldestFirst[index + 1]
  const windowed = postsOldestFirst
    .map((post, postIndex) => ({ post, postIndex, distance: Math.abs(postIndex - index) }))
    .filter(({ distance }) => distance <= 2)

  return `
    <nav class="post-nav" aria-label="Blog post navigation">
      <a
        class="post-nav__step ${older ? '' : 'post-nav__step--disabled'}"
        ${older ? `href="/blog/${older.slug}" data-link aria-label="Older post: ${escapeAttr(older.title)}"` : 'aria-disabled="true" tabindex="-1"'}
      >←</a>
      <div class="post-nav__track" aria-label="Chronological posts">
        ${windowed
          .map(({ post, postIndex, distance }) => {
            const isCurrent = post.slug === currentSlug
            return `
              <a
                class="post-nav__item ${isCurrent ? 'post-nav__item--current' : ''}"
                style="--distance: ${distance};"
                href="/blog/${post.slug}"
                data-link
                ${isCurrent ? 'aria-current="page"' : ''}
                data-offset="${postIndex - index}"
              >${escapeHtml(post.title)}</a>
            `
          })
          .join('')}
      </div>
      <a
        class="post-nav__step ${newer ? '' : 'post-nav__step--disabled'}"
        ${newer ? `href="/blog/${newer.slug}" data-link aria-label="Newer post: ${escapeAttr(newer.title)}"` : 'aria-disabled="true" tabindex="-1"'}
      >→</a>
      <div class="post-nav__mobile-current" aria-hidden="true">
        <span>${escapeHtml(current.title)}</span>
        <small>${index + 1} / ${postsOldestFirst.length}</small>
      </div>
    </nav>
  `
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}
