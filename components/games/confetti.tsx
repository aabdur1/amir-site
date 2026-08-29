"use client"

import { useEffect, useRef, useState } from "react"

// One-shot celebration burst shared by the games' solved panels — hand-rolled
// canvas confetti, no deps. Fires once on mount, so callers gate mounting on
// a LIVE solve (never on resuming an already-solved save) and unmount it when
// a new puzzle starts. Skipped entirely under prefers-reduced-motion: the
// solved panel's static SparkRule stays the celebratory flourish there.

// Catppuccin accents hardcoded per theme (learn-artifact pattern): mauve,
// peach, sapphire, lavender, rosewater.
const LATTE = ["#8839ef", "#fe640b", "#209fb5", "#7287fd", "#dc8a78"]
const MOCHA = ["#cba6f7", "#fab387", "#74c7ec", "#b4befe", "#f5e0dc"]

const COUNT = 120
const GRAVITY = 0.14 // px/frame² at 60fps scale
const DRAG = 0.992
const LIFE_MS = 2600
const FADE_MS = 600

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  w: number
  h: number
  rot: number
  vr: number
  phase: number
  color: string
}

export function ConfettiBurst() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  // useState initializer, not an effect: only mounted from ssr:false trees
  // (python.tsx precedent), so window is safe during first render
  const [active] = useState(
    () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    const colors = document.documentElement.classList.contains("dark") ? MOCHA : LATTE
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = window.innerWidth
    const h = window.innerHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.scale(dpr, dpr)

    // fountain from the lower middle: up, out, and back down under gravity
    const particles: Particle[] = Array.from({ length: COUNT }, (_, i) => {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.9
      const speed = 7 + Math.random() * 9
      return {
        x: w / 2 + (Math.random() - 0.5) * 40,
        y: h * 0.72,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        w: 5 + Math.random() * 5,
        h: 8 + Math.random() * 6,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.3,
        phase: Math.random() * Math.PI * 2,
        color: colors[i % colors.length],
      }
    })

    let raf = 0
    let start = 0
    let last = 0
    const tick = (now: number) => {
      if (!start) start = last = now
      // dt in 60fps-frame units so the burst runs at one speed on 120Hz
      // phones and stalls gracefully after a background-tab gap (clamp)
      const dt = Math.min((now - last) / (1000 / 60), 3)
      last = now
      const age = now - start
      const fade = age > LIFE_MS - FADE_MS ? Math.max(0, (LIFE_MS - age) / FADE_MS) : 1
      ctx.clearRect(0, 0, w, h)
      let alive = false
      for (const p of particles) {
        p.vy += GRAVITY * dt
        p.vx *= DRAG ** dt
        p.vy *= DRAG ** dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.rot += p.vr * dt
        if (p.y > h + 24 || fade === 0) continue
        alive = true
        ctx.save()
        ctx.globalAlpha = fade
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        // squash height on a moving phase for a paper-flutter tumble
        const squash = 0.35 + 0.65 * Math.abs(Math.sin(p.phase + now / 180))
        ctx.fillStyle = p.color
        ctx.fillRect(-p.w / 2, (-p.h * squash) / 2, p.w, p.h * squash)
        ctx.restore()
      }
      if (alive) raf = requestAnimationFrame(tick)
      else ctx.clearRect(0, 0, w, h)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active])

  if (!active) return null
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 h-full w-full"
    />
  )
}
