import { projects } from '../lib/projects.ts'

export function renderProjectsPage(): string {
  return `
    <section class="stack">
      <p class="eyebrow">Projects</p>
      <h1>Systems projects with explicit constraints and measurable behavior.</h1>
      <div class="project-list">
        ${projects
          .map(
            (project) => `
              <article class="project-card">
                <div>
                  <p class="project-card__status">${project.status}</p>
                  <h2><a href="/projects/${project.slug}" data-link>${project.title}</a></h2>
                  <p>${project.summary}</p>
                </div>
                <ul class="tech-list" aria-label="${project.title} technologies">
                  ${project.technologies.map((tech) => `<li>${tech}</li>`).join('')}
                </ul>
              </article>
            `,
          )
          .join('')}
      </div>
    </section>
  `
}
