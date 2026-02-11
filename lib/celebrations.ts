"use client"

/**
 * Celebration Effects — PaySafer 2026
 * Canvas-based confetti, particle bursts, and number animations
 */

interface ConfettiParticle {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  size: number
  rotation: number
  rotationSpeed: number
  opacity: number
  shape: 'square' | 'circle' | 'strip'
}

const COLORS = [
  '#10b981', // emerald
  '#34d399', // emerald light
  '#059669', // emerald dark
  '#06b6d4', // cyan
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#ffffff', // white
]

/** Fire a confetti burst from a point or the center of the screen */
export function fireConfetti(options?: {
  x?: number
  y?: number
  count?: number
  spread?: number
  duration?: number
}) {
  if (typeof window === 'undefined') return

  const {
    x = window.innerWidth / 2,
    y = window.innerHeight / 2,
    count = 80,
    spread = 360,
    duration = 2500,
  } = options ?? {}

  const canvas = document.createElement('canvas')
  canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:99999;width:100vw;height:100vh;'
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  document.body.appendChild(canvas)

  const ctx = canvas.getContext('2d')!
  const particles: ConfettiParticle[] = []

  for (let i = 0; i < count; i++) {
    const angle = (Math.random() * spread - spread / 2) * (Math.PI / 180) - Math.PI / 2
    const velocity = 4 + Math.random() * 8
    const shapes: ConfettiParticle['shape'][] = ['square', 'circle', 'strip']
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * velocity * (0.5 + Math.random()),
      vy: Math.sin(angle) * velocity * (0.5 + Math.random()),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 4 + Math.random() * 6,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.3,
      opacity: 1,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
    })
  }

  const startTime = performance.now()

  function animate(now: number) {
    const elapsed = now - startTime
    if (elapsed > duration) {
      canvas.remove()
      return
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const progress = elapsed / duration

    for (const p of particles) {
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.15 // gravity
      p.vx *= 0.99 // air resistance
      p.rotation += p.rotationSpeed
      p.opacity = Math.max(0, 1 - progress * 1.2)

      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rotation)
      ctx.globalAlpha = p.opacity
      ctx.fillStyle = p.color

      if (p.shape === 'square') {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size)
      } else if (p.shape === 'circle') {
        ctx.beginPath()
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
        ctx.fill()
      } else {
        ctx.fillRect(-p.size / 2, -1, p.size, 2.5)
      }

      ctx.restore()
    }

    requestAnimationFrame(animate)
  }

  requestAnimationFrame(animate)
}

/** Money rain effect — coins falling from top */
export function moneyRain(duration = 3000) {
  if (typeof window === 'undefined') return

  const canvas = document.createElement('canvas')
  canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:99999;width:100vw;height:100vh;'
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  document.body.appendChild(canvas)

  const ctx = canvas.getContext('2d')!
  const coins: { x: number; y: number; vy: number; size: number; rotation: number; rotSpeed: number; opacity: number }[] = []

  for (let i = 0; i < 40; i++) {
    coins.push({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * 200,
      vy: 2 + Math.random() * 3,
      size: 12 + Math.random() * 10,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.1,
      opacity: 0.6 + Math.random() * 0.4,
    })
  }

  const startTime = performance.now()

  function animate(now: number) {
    const elapsed = now - startTime
    if (elapsed > duration) { canvas.remove(); return }
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    for (const c of coins) {
      c.y += c.vy
      c.rotation += c.rotSpeed
      const fadeProgress = elapsed / duration
      c.opacity = Math.max(0, c.opacity - fadeProgress * 0.5)

      ctx.save()
      ctx.translate(c.x, c.y)
      ctx.rotate(c.rotation)
      ctx.globalAlpha = c.opacity

      // Coin body
      ctx.beginPath()
      ctx.arc(0, 0, c.size, 0, Math.PI * 2)
      ctx.fillStyle = '#f59e0b'
      ctx.fill()
      ctx.strokeStyle = '#d97706'
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Euro symbol
      ctx.fillStyle = '#92400e'
      ctx.font = `bold ${c.size}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('€', 0, 1)

      ctx.restore()
    }

    requestAnimationFrame(animate)
  }

  requestAnimationFrame(animate)
}

/** Sparkle burst — small stars emanating from a point */
export function sparkle(x: number, y: number) {
  if (typeof window === 'undefined') return

  const canvas = document.createElement('canvas')
  canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:99999;width:100vw;height:100vh;'
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  document.body.appendChild(canvas)

  const ctx = canvas.getContext('2d')!
  const stars: { x: number; y: number; vx: number; vy: number; size: number; opacity: number }[] = []

  for (let i = 0; i < 20; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = 2 + Math.random() * 4
    stars.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 2 + Math.random() * 3,
      opacity: 1,
    })
  }

  const start = performance.now()

  function animate(now: number) {
    const elapsed = now - start
    if (elapsed > 800) { canvas.remove(); return }
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    for (const s of stars) {
      s.x += s.vx
      s.y += s.vy
      s.opacity = Math.max(0, 1 - elapsed / 800)

      ctx.save()
      ctx.globalAlpha = s.opacity
      ctx.fillStyle = '#10b981'
      ctx.beginPath()
      // 4-point star
      for (let j = 0; j < 4; j++) {
        const a = (j / 4) * Math.PI * 2 - Math.PI / 2
        const outerX = s.x + Math.cos(a) * s.size
        const outerY = s.y + Math.sin(a) * s.size
        const innerA = a + Math.PI / 4
        const innerX = s.x + Math.cos(innerA) * (s.size * 0.3)
        const innerY = s.y + Math.sin(innerA) * (s.size * 0.3)
        if (j === 0) ctx.moveTo(outerX, outerY)
        else ctx.lineTo(outerX, outerY)
        ctx.lineTo(innerX, innerY)
      }
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }

    requestAnimationFrame(animate)
  }

  requestAnimationFrame(animate)
}
