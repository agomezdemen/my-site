import { escapeHtml } from './html.ts'

export function renderMarkdown(markdown: string): string {
  const blocks = splitBlocks(markdown)
  return blocks.map(renderBlock).join('\n')
}

function splitBlocks(markdown: string): string[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const blocks: string[] = []
  let current: string[] = []
  let inFence = false

  for (const line of lines) {
    if (line.startsWith('```')) {
      inFence = !inFence
      current.push(line)
      continue
    }

    if (!inFence && line.trim() === '') {
      if (current.length > 0) {
        blocks.push(current.join('\n'))
        current = []
      }
      continue
    }

    current.push(line)
  }

  if (current.length > 0) {
    blocks.push(current.join('\n'))
  }

  return blocks
}

function renderBlock(block: string): string {
  const trimmed = block.trim()

  if (trimmed.startsWith('```')) {
    const lines = trimmed.split('\n')
    const language = lines[0].replace('```', '').trim()
    const code = lines.slice(1, lines.at(-1)?.startsWith('```') ? -1 : undefined).join('\n')
    return `<pre><code class="${language ? `language-${escapeHtml(language)}` : ''}">${escapeHtml(code)}</code></pre>`
  }

  const heading = /^(#{1,6})\s+(.+)$/.exec(trimmed)
  if (heading) {
    const level = heading[1].length
    return `<h${level}>${renderInline(heading[2])}</h${level}>`
  }

  if (trimmed.startsWith('>')) {
    const quote = trimmed
      .split('\n')
      .map((line) => line.replace(/^>\s?/, ''))
      .join(' ')
    return `<blockquote><p>${renderInline(quote)}</p></blockquote>`
  }

  if (isTable(trimmed)) {
    return renderTable(trimmed)
  }

  if (/^[-*]\s+/m.test(trimmed)) {
    const items = trimmed
      .split('\n')
      .filter((line) => /^[-*]\s+/.test(line))
      .map((line) => `<li>${renderInline(line.replace(/^[-*]\s+/, ''))}</li>`)
      .join('')
    return `<ul>${items}</ul>`
  }

  if (/^\d+\.\s+/m.test(trimmed)) {
    const items = trimmed
      .split('\n')
      .filter((line) => /^\d+\.\s+/.test(line))
      .map((line) => `<li>${renderInline(line.replace(/^\d+\.\s+/, ''))}</li>`)
      .join('')
    return `<ol>${items}</ol>`
  }

  return `<p>${renderInline(trimmed.replace(/\n/g, ' '))}</p>`
}

function renderInline(value: string): string {
  const tokens = /`([^`]+)`|!\[([^\]]*)\]\(([^\s)]+)(?:\s+"([^"]*)")?\)|\*\*([^*]+)\*\*|\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]+)\)|(?<!\*)\*(?!\s|\*)([^*]*?\S)\*(?!\*)/g
  let html = ''
  let cursor = 0

  for (const match of value.matchAll(tokens)) {
    html += escapeHtml(value.slice(cursor, match.index))
    const [source, code, alt, imageUrl, title, strong, label, linkUrl, emphasis] = match

    if (code !== undefined) {
      html += `<code>${escapeHtml(code)}</code>`
    } else if (imageUrl !== undefined) {
      // Accept web and relative image paths without allowing other URL schemes.
      if (/^(?:https?:\/\/|(?!(?:[a-z][a-z\d+.-]*:|\/\/))\S)/i.test(imageUrl)) {
        html += `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(alt)}"${title !== undefined ? ` title="${escapeHtml(title)}"` : ''} loading="lazy" decoding="async">`
      } else {
        html += escapeHtml(source)
      }
    } else if (strong !== undefined) {
      html += `<strong>${renderInline(strong)}</strong>`
    } else if (emphasis !== undefined) {
      html += `<em>${renderInline(emphasis)}</em>`
    } else {
      const attributes = linkUrl.startsWith('/') ? 'data-link' : 'target="_blank" rel="noreferrer"'
      html += `<a href="${escapeHtml(linkUrl)}" ${attributes}>${renderInline(label)}</a>`
    }

    cursor = match.index + source.length
  }

  return html + escapeHtml(value.slice(cursor))
}

function isTable(block: string): boolean {
  const lines = block.split('\n')
  return lines.length >= 2 && lines[0].includes('|') && /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[1])
}

function renderTable(block: string): string {
  const lines = block.split('\n')
  const headers = parseTableRow(lines[0])
  const rows = lines.slice(2).map(parseTableRow)

  return `
    <table>
      <thead><tr>${headers.map((cell) => `<th>${renderInline(cell)}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${renderInline(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>
  `
}

function parseTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())
}
