# Portfolio

A personal portfolio built with Vite, vanilla TypeScript, semantic HTML, and CSS. The interface uses a physical page stack with primary tabs attached to the left side on desktop, adapting to compact tabs on small screens.

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

Vite will print the local development URL.

## Production Build

```bash
npm run build
```

The build runs `tsc` first, then creates the production assets in `dist/`.

## Resume

Place your real resume at:

```text
public/resume.pdf
```

The persistent Resume action opens `/resume.pdf` in a new tab. A placeholder PDF is included so the link is valid during development.

## Personal Placeholders

Replace placeholder profile/contact values in:

- `src/main.ts` for persistent GitHub, LinkedIn, and Resume header actions
- `src/pages/about.ts` for About copy, education, interests, and profile links
- `src/pages/contact.ts` for email, GitHub, and LinkedIn

Current placeholders include:

- `https://github.com/your-github`
- `https://www.linkedin.com/in/your-linkedin`
- `you@example.com`

## Blog Posts

Blog posts live in:

```text
src/content/blog/
```

Add a file such as:

```text
src/content/blog/my-new-post.md
```

Use this frontmatter:

```markdown
---
title: "Optimizing My C++ HTTP Parser"
date: "2026-09-12"
description: "How profiling exposed an unexpected memory-copying bottleneck."
relatedProjects: ["http-server"]
---

# Optimizing My C++ HTTP Parser

Content...
```

Required frontmatter:

- `title`
- `date`
- `description`

Optional frontmatter:

- `slug`
- `relatedProjects`, an array of project slugs such as `["http-server"]`

If `slug` is omitted, the route slug is generated from the filename. Blog discovery uses Vite's `import.meta.glob('../content/blog/*.md', { query: '?raw', import: 'default', eager: true })`, so new Markdown files in that folder are automatically included without registering them in code.

The blog index displays posts newest-first. Individual blog post navigation sorts posts oldest-to-newest so older posts appear to the left and newer posts appear to the right.

## Routing

Routing is handled in `src/router/router.ts` with the browser History API and same-origin links marked with `data-link`.

Supported routes include:

- `/` and `/about`
- `/projects`
- `/projects/http-server`
- `/blog`
- `/blog/<slug>`
- `/contact`

Browser back/forward works through `popstate`. Document titles are updated on every route.

## Static Hosting

This is a single-page app. Static hosts must serve `index.html` for unknown client routes so refreshes like `/blog/memmove-optimization` work.

Examples:

- Netlify: add `/* /index.html 200` to `_redirects`
- Vercel: rewrite all unmatched paths to `/index.html`
- Nginx: use `try_files $uri $uri/ /index.html;`
- GitHub Pages: use a 404 fallback strategy or host behind a router that rewrites to `index.html`

## Adding Projects

Project data is defined in:

```text
src/lib/projects.ts
```

Add another object to the `projects` array with:

- `slug`
- `title`
- `summary`
- `status`
- `technologies`
- `sections`

The project index and detail route will render from that data automatically.

To connect a project to blog posts, add the project's `slug` to a post's `relatedProjects` frontmatter. The project detail page automatically lists those posts, and each related blog post links back to the project.

For the Modern C++ HTTP Server, use `relatedProjects: ["http-server"]`. This one field controls links in both directions; `description` is display text and does not connect posts to projects. Use the inline array format shown above, with slugs matching `src/lib/projects.ts`.

For an italic tagline, put `*Your tagline here*` in the Markdown body after the closing `---`. Inline code also works inside italics, such as `` *Optimizing a parser with `perf`* ``. Frontmatter titles and descriptions are displayed as plain text.

## Implementation Notes

- Primary navigation is `src/components/side-tabs.ts`
- Blog post navigation is `src/components/blog-post-nav.ts`
- Blog loading/frontmatter parsing is `src/lib/blog.ts`
- Markdown rendering is `src/lib/markdown.ts`
- Layout variables are centralized in `src/styles/global.css`
- Sticky blog navigation uses `position: sticky; top: 0;` inside the page content area, while the primary site tabs remain on the side
