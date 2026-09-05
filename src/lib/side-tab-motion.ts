const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

export function initializeSideTabMotion(tabsHost: HTMLElement): void {
  const canvas = document.createElement('canvas')
  canvas.className = 'rail-field'
  canvas.setAttribute('aria-hidden', 'true')
  tabsHost.prepend(canvas)

  const context = canvas.getContext('2d')
  if (!context) {
    return
  }

  let frame = 0
  let width = 0
  let height = 0
  let pixelRatio = 1

  const resize = () => {
    const rect = tabsHost.getBoundingClientRect()
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
    width = Math.max(1, Math.floor(rect.width))
    height = Math.max(1, Math.floor(rect.height))
    canvas.width = Math.floor(width * pixelRatio)
    canvas.height = Math.floor(height * pixelRatio)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
  }

  const draw = (time: number) => {
    const styles = getComputedStyle(document.documentElement)
    const accent = styles.getPropertyValue('--accent').trim()
    const border = styles.getPropertyValue('--border-strong').trim()
    const phase = reducedMotion.matches ? 0 : time * 0.00018

    context.clearRect(0, 0, width, height)
    context.lineWidth = 1
    context.globalAlpha = 0.34

    for (let line = 0; line < 8; line += 1) {
      const baseX = width * (0.16 + line * 0.105)
      const amplitude = width * (0.035 + (line % 3) * 0.015)
      const frequency = 0.009 + line * 0.0008
      const secondaryFrequency = 0.023 + line * 0.0015

      context.beginPath()
      context.strokeStyle = line % 3 === 0 ? accent : border

      for (let y = -20; y <= height + 20; y += 8) {
        const drift =
          Math.sin(y * frequency + phase + line * 0.75) * amplitude +
          Math.sin(y * secondaryFrequency - phase * 1.7 + line) * amplitude * 0.42
        const taper = Math.sin((y / height) * Math.PI)
        const x = baseX + drift * (0.35 + taper)

        if (y === -20) {
          context.moveTo(x, y)
        } else {
          context.lineTo(x, y)
        }
      }

      context.stroke()
    }

    if (!reducedMotion.matches) {
      frame = window.requestAnimationFrame(draw)
    }
  }

  const observer = new ResizeObserver(() => {
    resize()
    draw(0)
  })

  resize()
  observer.observe(tabsHost)
  frame = window.requestAnimationFrame(draw)

  window.addEventListener('beforeunload', () => {
    window.cancelAnimationFrame(frame)
    observer.disconnect()
  })
}
