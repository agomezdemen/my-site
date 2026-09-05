import { externalLink } from '../lib/html.ts'

export function renderAboutPage(): string {
  return `
    <section class="stack">
      <p class="eyebrow">About</p>
      <h1>Software engineer focused on high-performance systems.</h1>
      <p>
        I’m Alejandro, a computer science student focused on modern C++, systems programming, and performance-driven software. My interest in software performance started with trying to squeeze a few extra frames per second out of games on my home computer, and today I’m exploring that same interest through projects in networking, Unix systems, and low-level software.
      </p>
      <div class="rule-grid">
        <section>
          <h2>Education</h2>
          <div class="education-summary">
            <p>B.S. in Computer Science, minor in Statistics</p>
            <p>The University of Texas at Dallas · Expected graduation: December 2027
            </p>
          </div>
          <p class="list-label">Relevant coursework:</p>
          <ul class="compact-list">
            <li>Computer Architecture (UC3M)</li>
            <li>Microprocessors &amp; Microcontrollers (UC3M)</li>
            <li>Advanced Algorithm Analysis</li>
            <li>Systems Programming in Unix</li>
          </ul>
        </section>
        <section>
          <h2>Research Interests</h2>
          <ul class="compact-list">
            <li>High-performance computing</li>
            <li>Low-latency systems</li>
            <li>Distributed systems</li>
            <li>Inference kernels and ML workload performance</li>
            <li>Audio tools for analysis, processing, and creative workflows</li>
          </ul>
        </section>
        <section>
          <h2>Engineering Interests</h2>
          <ul class="compact-list">
            <li>Modern C++</li>
            <li>Linux and systems programming</li>
            <li>Low-latency and high-performance software</li>
            <li>Networking and distributed systems</li>
            <li>Performance engineering</li>
          </ul>
        </section>
      </div>
      <section class="link-strip" aria-label="Profile links">
        <a href="/resume.pdf" target="_blank" rel="noreferrer">Resume</a>
        ${externalLink('https://github.com/agomezdemen', 'GitHub')}
        ${externalLink('https://www.linkedin.com/in/alejandro-gomez-de-mendieta/', 'LinkedIn')}
      </section>
    </section>
  `
}
