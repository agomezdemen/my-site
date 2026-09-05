import { externalLink } from '../lib/html.ts'

export function renderContactPage(): string {
  return `
    <section class="stack stack--narrow">
      <p class="eyebrow">Contact</p>
      <h1>Reach me for systems, networking, and performance-focused engineering work.</h1>
      <p class="lede">The best way to reach me is by email. I also keep project work and professional updates on GitHub and LinkedIn.</p>
      <address class="contact-list">
        <a href="mailto:contact@agomezdemen.com">contact@agomezdemen.com</a>
        ${externalLink('https://github.com/agomezdemen', 'GitHub')}
        ${externalLink('https://www.linkedin.com/in/alejandro-gomez-de-mendieta/', 'LinkedIn')}
      </address>
    </section>
  `
}
