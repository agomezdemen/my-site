import assert from 'node:assert/strict'
import { renderMarkdown } from '../src/lib/markdown.ts'

for (const path of [
  '/blog/epoll/blocking_wrk/summary.csv',
  '/blog/epoll/epoll_wrk/environment.txt',
  '/blog/epoll/epoll_wrk/connections_10000_run_1.txt',
  '/blog/epoll/wrk-results.zip',
  '/blog/epoll/run_wrk.sh',
  '/blog/benchmarking_profiling_iterating/results.json?download=1#data',
]) {
  const html = renderMarkdown(`[Results](${path})`)
  assert.ok(html.includes(`href="${path}"`))
  assert.ok(!html.includes('data-link'), `${path} must use browser navigation`)
}

assert.match(renderMarkdown('[Post](/blog/from-blocking-io-to-epoll)'), /data-link/)
assert.match(renderMarkdown('[Source](https://example.com/data.csv)'), /target="_blank"/)
assert.ok(!renderMarkdown('[Source](//example.com/post)').includes('data-link'))
console.log('Markdown file and page links passed.')
