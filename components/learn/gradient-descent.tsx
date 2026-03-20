'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useScrollReveal } from '@/lib/hooks'
import { SectionDivider } from '@/components/section-divider'

// --- Math helpers ---
function loss(w: number) { return 0.5 * (w - 3) * (w - 3) + 0.5 }
function grad(w: number) { return w - 3 }
function grad2d(w1: number, w2: number): [number, number] { return [w1 - 3, 4 * (w2 - 2)] }
function loss2d(w1: number, w2: number) { return 0.5 * (w1 - 3) ** 2 + 2 * (w2 - 2) ** 2 + 1 }

// --- Theme helper ---
function getThemeColors() {
  const root = document.documentElement
  const isDark = root.classList.contains('dark')
  return {
    text: isDark ? '#cdd6f4' : '#4c4f69',
    subtext: isDark ? '#a6adc8' : '#5c5f77',
    surface: isDark ? '#313244' : '#ccd0da',
    mauve: isDark ? '#cba6f7' : '#8839ef',
    peach: isDark ? '#fab387' : '#fe640b',
    sapphire: isDark ? '#74c7ec' : '#209fb5',
    lavender: isDark ? '#b4befe' : '#7287fd',
    base: isDark ? '#1e1e2e' : '#eff1f5',
    mantle: isDark ? '#181825' : '#e6e9ef',
    grid: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    axis: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
    barActual: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
    // Accent colors mapped from the original
    blue: isDark ? '#74c7ec' : '#209fb5',    // sapphire
    red: isDark ? '#f38ba8' : '#d20f39',     // red (Catppuccin)
    green: isDark ? '#a6e3a1' : '#40a02b',   // green (Catppuccin)
    amber: isDark ? '#f9e2af' : '#df8e1d',   // yellow
    purple: isDark ? '#cba6f7' : '#8839ef',  // mauve
  }
}

function drawArrowhead(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, color: string, size: number) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(x + Math.cos(angle) * size, y + Math.sin(angle) * size)
  ctx.lineTo(x + Math.cos(angle + 2.5) * size * 0.5, y + Math.sin(angle + 2.5) * size * 0.5)
  ctx.lineTo(x + Math.cos(angle - 2.5) * size * 0.5, y + Math.sin(angle - 2.5) * size * 0.5)
  ctx.closePath()
  ctx.fill()
}

// --- Canvas setup helper ---
function setupCanvas(canvas: HTMLCanvasElement, height: number): { ctx: CanvasRenderingContext2D; W: number; H: number } | null {
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  const W = rect.width
  const H = height
  canvas.width = W * dpr
  canvas.height = H * dpr
  ctx.scale(dpr, dpr)
  canvas.style.width = W + 'px'
  canvas.style.height = H + 'px'
  ctx.clearRect(0, 0, W, H)
  return { ctx, W, H }
}

// --- Shared sub-components ---
function MetricCard({ label, value, colorClass }: { label: string; value: string; colorClass?: string }) {
  return (
    <div className="flex-1 min-w-[90px] rounded-lg bg-cream-dark/60 dark:bg-night-card/60 px-4 py-2.5">
      <div className="text-[13px] text-ink-subtle dark:text-night-muted">{label}</div>
      <div
        className={`font-[family-name:var(--font-mono)] text-base font-medium mt-0.5 ${colorClass ?? 'text-ink dark:text-night-text'}`}
      >
        {value}
      </div>
    </div>
  )
}

// Tailwind color classes for metric cards (avoids runtime document access)
const METRIC_COLORS = {
  red: 'text-red-600 dark:text-red-400',
  green: 'text-green-600 dark:text-green-400',
  blue: 'text-sapphire dark:text-sapphire-dark',
  amber: 'text-amber-600 dark:text-amber-300',
  purple: 'text-mauve dark:text-mauve-dark',
} as const

function InsightBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-lg bg-sapphire/10 dark:bg-sapphire-dark/10 px-4 py-3 text-sm leading-relaxed text-sapphire dark:text-sapphire-dark">
      {children}
    </div>
  )
}

// === Hook: observe dark mode class changes ===
function useDarkModeObserver(callback: () => void) {
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes' && m.attributeName === 'class') {
          const cl = (m.target as HTMLElement).classList
          if (!cl.contains('theme-transitioning')) {
            callback()
          }
        }
      }
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [callback])
}

// === Hook: ResizeObserver for canvas ===
function useCanvasResize(canvasRef: React.RefObject<HTMLCanvasElement | null>, draw: () => void) {
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ro = new ResizeObserver(() => draw())
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [canvasRef, draw])
}

// ======================================================================
// SECTION 1: Why Gradients Point Downhill
// ======================================================================
function Section1() {
  const [sectionRef, visible] = useScrollReveal()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [wPos, setWPos] = useState(7)
  const draggingRef = useRef(false)
  // Store layout for pointer→w conversion without recalculating
  const layoutRef = useRef<{ pL: number; pw: number } | null>(null)

  const g = grad(wPos)
  const lv = loss(wPos)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const result = setupCanvas(canvas, 280)
    if (!result) return
    const { ctx, W, H } = result
    const c = getThemeColors()

    const p = { l: 40, r: 20, t: 20, b: 36 }
    const pw = W - p.l - p.r
    const ph = H - p.t - p.b
    const xOf = (v: number) => p.l + (v + 2) / 10 * pw
    const yOf = (v: number) => p.t + (1 - v / 14) * ph

    // Cache layout for pointer events
    layoutRef.current = { pL: p.l, pw }

    // Grid
    ctx.strokeStyle = c.grid
    ctx.lineWidth = 0.5
    for (let v = 0; v <= 14; v += 2) {
      ctx.beginPath()
      ctx.moveTo(p.l, yOf(v))
      ctx.lineTo(W - p.r, yOf(v))
      ctx.stroke()
    }

    // Axes
    ctx.strokeStyle = c.axis
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(p.l, p.t)
    ctx.lineTo(p.l, H - p.b)
    ctx.lineTo(W - p.r, H - p.b)
    ctx.stroke()

    // Axis labels
    ctx.fillStyle = c.subtext
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('w (parameter value)', W / 2, H - 4)
    ctx.save()
    ctx.translate(12, H / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText('Loss (error)', 0, 0)
    ctx.restore()

    // Loss curve
    ctx.beginPath()
    ctx.strokeStyle = c.subtext
    ctx.lineWidth = 2
    for (let px = 0; px <= pw; px++) {
      const wv = -2 + px / pw * 10
      const x = p.l + px
      const y = yOf(loss(wv))
      if (px === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
    }
    ctx.stroke()

    // Minimum marker
    ctx.fillStyle = c.green
    ctx.globalAlpha = 0.3
    ctx.beginPath()
    ctx.arc(xOf(3), yOf(0.5), 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.fillStyle = c.subtext
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('minimum', xOf(3), yOf(0.5) + 18)

    // --- Tangent line at current position ---
    const cx = xOf(wPos)
    const cy = yOf(lv)
    const tangentLen = pw * 0.18
    const slope = g // gradient IS the slope
    // Convert slope from data space to pixel space
    const dxData = 1
    const dxPx = dxData / 10 * pw
    const dyPx = -(slope * dxData) / 14 * ph // negative because y-axis is flipped
    const mag = Math.sqrt(dxPx * dxPx + dyPx * dyPx)
    const ux = dxPx / mag
    const uy = dyPx / mag
    ctx.strokeStyle = c.amber
    ctx.lineWidth = 1.5
    ctx.setLineDash([5, 4])
    ctx.globalAlpha = 0.7
    ctx.beginPath()
    ctx.moveTo(cx - ux * tangentLen, cy - uy * tangentLen)
    ctx.lineTo(cx + ux * tangentLen, cy + uy * tangentLen)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.globalAlpha = 1
    // Tangent label
    ctx.fillStyle = c.amber
    ctx.font = '500 10px sans-serif'
    ctx.textAlign = g >= 0 ? 'left' : 'right'
    ctx.fillText(`slope = ${g.toFixed(1)}`, cx + ux * tangentLen + (g >= 0 ? 4 : -4), cy + uy * tangentLen - 4)

    // Current position (drawn on top of tangent)
    ctx.fillStyle = c.blue
    ctx.beginPath()
    ctx.arc(cx, cy, 7, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.font = '500 9px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('you', cx, cy + 3)

    // Gradient arrow
    const al = Math.min(Math.abs(g) * 18, pw * 0.3)
    const gd = g > 0 ? 1 : -1
    const gx = cx + gd * al
    ctx.strokeStyle = c.red
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(cx, cy - 18)
    ctx.lineTo(gx, cy - 18)
    ctx.stroke()
    drawArrowhead(ctx, gx, cy - 18, gd > 0 ? 0 : Math.PI, c.red, 8)
    ctx.fillStyle = c.red
    ctx.font = '500 11px sans-serif'
    ctx.textAlign = gd > 0 ? 'left' : 'right'
    ctx.fillText('gradient (uphill)', (cx + gx) / 2, cy - 28)

    // Negative gradient arrow
    const nx = cx - gd * al
    ctx.strokeStyle = c.green
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(cx, cy + 18)
    ctx.lineTo(nx, cy + 18)
    ctx.stroke()
    drawArrowhead(ctx, nx, cy + 18, gd > 0 ? Math.PI : 0, c.green, 8)
    ctx.fillStyle = c.green
    ctx.font = '500 11px sans-serif'
    ctx.textAlign = gd > 0 ? 'right' : 'left'
    ctx.fillText('\u2212gradient (downhill)', (cx + nx) / 2, cy + 32)
  }, [wPos, g, lv])

  useEffect(() => { draw() }, [draw])
  useDarkModeObserver(draw)
  useCanvasResize(canvasRef, draw)

  // --- Direct canvas dragging ---
  const pxToW = useCallback((clientX: number) => {
    const canvas = canvasRef.current
    const layout = layoutRef.current
    if (!canvas || !layout) return null
    const rect = canvas.getBoundingClientRect()
    const px = clientX - rect.left - layout.pL
    const w = -2 + (px / layout.pw) * 10
    return Math.max(-2, Math.min(8, Math.round(w * 10) / 10))
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const w = pxToW(e.clientX)
    if (w !== null) {
      draggingRef.current = true
      setWPos(w)
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    }
  }, [pxToW])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current) return
    const w = pxToW(e.clientX)
    if (w !== null) setWPos(w)
  }, [pxToW])

  const handlePointerUp = useCallback(() => {
    draggingRef.current = false
  }, [])

  // Insight text
  let insight: React.ReactNode
  if (Math.abs(g) < 0.3) {
    insight = <><strong>Nearly flat!</strong> Gradient {'\u2248'} 0 — you are near the minimum. Gradient descent would stop here.</>
  } else if (g > 0) {
    insight = (
      <>
        <strong>Gradient = +{g.toFixed(1)}</strong> — the tangent line tilts uphill to the right (slope = +{g.toFixed(1)}). Negative gradient points LEFT.{' '}
        <code className="font-[family-name:var(--font-mono)] text-[13px]">
          w_new = {wPos.toFixed(1)} {'\u2212'} {'\u03B7'}{'\u00D7'}{g.toFixed(1)}
        </code>{' '}
        moves w left. That{"'"}s downhill.
      </>
    )
  } else {
    insight = (
      <>
        <strong>Gradient = {g.toFixed(1)}</strong> — the tangent line tilts uphill to the left (slope = {g.toFixed(1)}). Negative gradient points RIGHT.{' '}
        <code className="font-[family-name:var(--font-mono)] text-[13px]">
          w_new = {wPos.toFixed(1)} {'\u2212'} {'\u03B7'}{'\u00D7'}({g.toFixed(1)})
        </code>{' '}
        moves w right. Subtracting a negative = adding. That{"'"}s downhill.
      </>
    )
  }

  return (
    <section
      ref={sectionRef as React.RefObject<HTMLElement>}
      aria-labelledby="gd-why-gradients"
      className={`py-8 transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <h2
        id="gd-why-gradients"
        className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl text-ink dark:text-night-text mb-3"
      >
        Why Gradients Point Downhill
      </h2>
      <p className="text-sm text-ink-subtle dark:text-night-muted mb-5 leading-relaxed">
        Drag the dot on the curve (or use the slider). The dashed yellow line is the <strong>tangent</strong> — its slope IS the gradient. Watch how the gradient arrow always points uphill, and the negative gradient points downhill.
      </p>

      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Interactive loss curve — drag the dot to move along the curve and see gradient, tangent line, and negative gradient"
        className="w-full rounded-lg cursor-grab active:cursor-grabbing"
        style={{ height: 280, touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />

      <div className="flex items-center gap-3 mt-2 mb-2">
        <label
          htmlFor="w-slider"
          className="text-sm text-ink-subtle dark:text-night-muted min-w-[90px]"
        >
          Your position (w)
        </label>
        <input
          id="w-slider"
          type="range"
          min={-2}
          max={8}
          step={0.1}
          value={wPos}
          onChange={(e) => setWPos(parseFloat(e.target.value))}
          aria-valuetext={`w = ${wPos.toFixed(1)}`}
          className="flex-1"
        />
        <span className="font-[family-name:var(--font-mono)] text-sm font-medium min-w-[44px] text-right text-ink dark:text-night-text">
          {wPos.toFixed(1)}
        </span>
      </div>

      <div className="flex gap-2.5 flex-wrap my-2.5">
        <MetricCard label="Position (w)" value={wPos.toFixed(1)} />
        <MetricCard label="Loss" value={lv.toFixed(2)} />
        <MetricCard label="Gradient (slope)" value={`${g >= 0 ? '+' : ''}${g.toFixed(1)}`} colorClass={METRIC_COLORS.red} />
        <MetricCard label={'\u2212Gradient'} value={`${-g >= 0 ? '+' : ''}${(-g).toFixed(1)}`} colorClass={METRIC_COLORS.green} />
      </div>

      <InsightBox>{insight}</InsightBox>
    </section>
  )
}

// ======================================================================
// SECTION 2: Learning Rate
// ======================================================================
// Helper: run GD for N steps at a given eta, starting from w=7
function runGD(etaVal: number, steps: number): number[] {
  const losses = [loss(7)]
  let w = 7
  for (let i = 0; i < steps; i++) {
    w = w - etaVal * grad(w)
    if (w < -4) w = -4
    if (w > 10) w = 10
    losses.push(loss(w))
  }
  return losses
}

const COMPARE_PRESETS = [
  { eta: 0.02, label: 'Slow', colorKey: 'green' as const },
  { eta: 0.30, label: 'Good', colorKey: 'blue' as const },
  { eta: 1.00, label: 'Fast', colorKey: 'red' as const },
] as const

function Section2() {
  const [sectionRef, visible] = useScrollReveal()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sparkRef = useRef<HTMLCanvasElement>(null)
  const [eta, setEta] = useState(0.3)
  const [wVal, setWVal] = useState(7)
  const [history, setHistory] = useState<Array<{ w: number; l: number }>>([])
  const [compareMode, setCompareMode] = useState(false)

  const currentLoss = loss(wVal)
  const currentGrad = grad(wVal)

  const step = useCallback(() => {
    setHistory(prev => [...prev, { w: wVal, l: loss(wVal) }])
    setWVal(prev => {
      let next = prev - eta * grad(prev)
      if (next < -4) next = -4
      if (next > 10) next = 10
      return next
    })
  }, [wVal, eta])

  const stepN = useCallback((n: number) => {
    let w = wVal
    const newHist: Array<{ w: number; l: number }> = []
    for (let i = 0; i < n; i++) {
      newHist.push({ w, l: loss(w) })
      w = w - eta * grad(w)
      if (w < -4) w = -4
      if (w > 10) w = 10
    }
    setHistory(prev => [...prev, ...newHist])
    setWVal(w)
  }, [wVal, eta])

  const reset = useCallback(() => {
    setHistory([])
    setWVal(7)
    setCompareMode(false)
  }, [])

  // --- Main canvas ---
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const result = setupCanvas(canvas, 280)
    if (!result) return
    const { ctx, W, H } = result
    const c = getThemeColors()

    const p = { l: 40, r: 20, t: 20, b: 36 }
    const pw = W - p.l - p.r
    const ph = H - p.t - p.b
    const xOf = (v: number) => p.l + (v + 3) / 13 * pw
    const yOf = (v: number) => p.t + (1 - v / 26) * ph

    // Grid
    ctx.strokeStyle = c.grid
    ctx.lineWidth = 0.5
    for (let v = 0; v <= 26; v += 5) {
      ctx.beginPath()
      ctx.moveTo(p.l, yOf(v))
      ctx.lineTo(W - p.r, yOf(v))
      ctx.stroke()
    }

    // Axes
    ctx.strokeStyle = c.axis
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(p.l, p.t)
    ctx.lineTo(p.l, H - p.b)
    ctx.lineTo(W - p.r, H - p.b)
    ctx.stroke()
    ctx.fillStyle = c.subtext
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('w', W / 2, H - 4)

    // Loss curve
    ctx.beginPath()
    ctx.strokeStyle = c.subtext
    ctx.lineWidth = 2
    for (let px = 0; px <= pw; px++) {
      const wv = -3 + px / pw * 13
      const x = p.l + px
      const y = yOf(loss(wv))
      if (px === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
    }
    ctx.stroke()

    // Minimum
    ctx.fillStyle = c.green
    ctx.globalAlpha = 0.25
    ctx.beginPath()
    ctx.arc(xOf(3), yOf(0.5), 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1

    // GD path
    const all = [...history, { w: wVal, l: loss(wVal) }]
    if (all.length > 1) {
      for (let i = 0; i < all.length - 1; i++) {
        ctx.strokeStyle = c.blue
        ctx.lineWidth = 1.5
        ctx.globalAlpha = 0.4
        ctx.beginPath()
        ctx.moveTo(xOf(all[i].w), yOf(all[i].l))
        ctx.lineTo(xOf(all[i + 1].w), yOf(all[i + 1].l))
        ctx.stroke()
        ctx.globalAlpha = 1
        ctx.fillStyle = c.blue
        ctx.globalAlpha = 0.3
        ctx.beginPath()
        ctx.arc(xOf(all[i].w), yOf(all[i].l), 3, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
      }
    }

    // Current GD position
    ctx.fillStyle = c.blue
    ctx.beginPath()
    ctx.arc(xOf(wVal), yOf(loss(wVal)), 7, 0, Math.PI * 2)
    ctx.fill()

    // Step labels
    ctx.font = '500 9px sans-serif'
    ctx.fillStyle = c.subtext
    ctx.textAlign = 'center'
    for (let i = 0; i < Math.min(all.length, 8); i++) {
      ctx.fillText(String(i), xOf(all[i].w), yOf(all[i].l) - 12)
    }
  }, [history, wVal])

  // --- Sparkline canvas ---
  const drawSparkline = useCallback(() => {
    const canvas = sparkRef.current
    if (!canvas) return
    const result = setupCanvas(canvas, 100)
    if (!result) return
    const { ctx, W, H } = result
    const c = getThemeColors()

    const p = { l: 36, r: 12, t: 12, b: 22 }
    const pw = W - p.l - p.r
    const ph = H - p.t - p.b

    // In compare mode, show 3 preset curves
    if (compareMode) {
      const STEPS = 20
      const presetData = COMPARE_PRESETS.map(pr => runGD(pr.eta, STEPS))
      const allVals = presetData.flat()
      const maxL = Math.max(...allVals, 1)

      // Axis
      ctx.strokeStyle = c.axis
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.moveTo(p.l, p.t)
      ctx.lineTo(p.l, H - p.b)
      ctx.lineTo(W - p.r, H - p.b)
      ctx.stroke()

      ctx.fillStyle = c.subtext
      ctx.font = '10px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('step', W / 2, H - 4)
      ctx.textAlign = 'right'
      ctx.fillText('loss', p.l - 4, p.t + 10)

      // Draw each preset line
      const colorMap = { green: c.green, blue: c.blue, red: c.red }
      for (let pi = 0; pi < presetData.length; pi++) {
        const data = presetData[pi]
        const preset = COMPARE_PRESETS[pi]
        const color = colorMap[preset.colorKey]

        ctx.beginPath()
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        for (let i = 0; i < data.length; i++) {
          const x = p.l + (i / STEPS) * pw
          const y = p.t + (1 - data[i] / maxL) * ph
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
        }
        ctx.stroke()

        // End dot
        const lastX = p.l + pw
        const lastY = p.t + (1 - data[data.length - 1] / maxL) * ph
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(lastX, lastY, 3, 0, Math.PI * 2)
        ctx.fill()
      }

      // Legend
      let lx = W - 10
      ctx.font = '10px sans-serif'
      ctx.textAlign = 'right'
      for (let i = COMPARE_PRESETS.length - 1; i >= 0; i--) {
        const preset = COMPARE_PRESETS[i]
        const color = colorMap[preset.colorKey]
        const label = `${preset.label} (${preset.eta})`
        const tw = ctx.measureText(label).width
        ctx.fillStyle = c.subtext
        ctx.fillText(label, lx, p.t + 10)
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(lx - tw - 6, p.t + 6, 3, 0, Math.PI * 2)
        ctx.fill()
        lx -= tw + 18
      }
      return
    }

    // Normal mode: show current GD loss over steps
    const all = [...history.map(h => h.l), loss(wVal)]
    if (all.length < 2) {
      ctx.fillStyle = c.subtext
      ctx.globalAlpha = 0.4
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Loss over steps will appear here', W / 2, H / 2 + 4)
      ctx.globalAlpha = 1
      return
    }

    const maxL = Math.max(...all, 1)

    // Axis
    ctx.strokeStyle = c.axis
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(p.l, p.t)
    ctx.lineTo(p.l, H - p.b)
    ctx.lineTo(W - p.r, H - p.b)
    ctx.stroke()

    ctx.fillStyle = c.subtext
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('step', W / 2, H - 4)
    ctx.textAlign = 'right'
    ctx.fillText('loss', p.l - 4, p.t + 10)

    // Loss line
    ctx.beginPath()
    ctx.strokeStyle = c.blue
    ctx.lineWidth = 2
    for (let i = 0; i < all.length; i++) {
      const x = p.l + (i / (all.length - 1)) * pw
      const y = p.t + (1 - all[i] / maxL) * ph
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
    }
    ctx.stroke()

    // Dots
    for (let i = 0; i < all.length; i++) {
      const x = p.l + (i / (all.length - 1)) * pw
      const y = p.t + (1 - all[i] / maxL) * ph
      ctx.fillStyle = c.blue
      ctx.beginPath()
      ctx.arc(x, y, 2.5, 0, Math.PI * 2)
      ctx.fill()
    }

    // η label
    ctx.fillStyle = c.subtext
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(`\u03B7 = ${eta.toFixed(2)}`, W - p.r, p.t + 10)
  }, [history, wVal, compareMode, eta])

  useEffect(() => { draw(); drawSparkline() }, [draw, drawSparkline])
  useDarkModeObserver(() => { draw(); drawSparkline() })
  useCanvasResize(canvasRef, draw)
  useCanvasResize(sparkRef, drawSparkline)

  // Insight text
  let insight: React.ReactNode
  if (compareMode) {
    insight = <><strong>Comparison:</strong> Green ({'\u03B7'}=0.02) barely moves in 20 steps. Blue ({'\u03B7'}=0.30) converges smoothly. Red ({'\u03B7'}=1.00) overshoots and zigzags — the loss spikes before settling. The {'\u201C'}right{'\u201D'} learning rate balances speed and stability.</>
  } else if (history.length === 0) {
    insight = <>Hit {'\u201C'}1 step{'\u201D'} to start. Try {'\u03B7'}=0.30 first, then 0.02 (slow) and 1.00 (overshoots). Or hit {'\u201C'}Compare All 3{'\u201D'} to see them side by side.</>
  } else if (eta >= 0.9) {
    insight = <><strong>Overshooting!</strong> {'\u03B7'} is too large — steps jump past the minimum and bounce back. Watch the sparkline zigzag.</>
  } else if (eta <= 0.05) {
    insight = <><strong>Very slow.</strong> Each step is tiny — the sparkline shows a gradual descent that needs many more iterations.</>
  } else if (Math.abs(currentGrad) < 0.05) {
    insight = <><strong>Converged!</strong> After {history.length} steps, w {'\u2248'} {wVal.toFixed(2)}. The sparkline has flattened — loss isn{"'"}t decreasing anymore.</>
  } else {
    insight = <>After {history.length} steps: w moved 7.0 {'\u2192'} {wVal.toFixed(2)}. Loss: {loss(7).toFixed(2)} {'\u2192'} {currentLoss.toFixed(2)}.</>
  }

  return (
    <section
      ref={sectionRef as React.RefObject<HTMLElement>}
      aria-labelledby="gd-learning-rate"
      className={`py-8 transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <h2
        id="gd-learning-rate"
        className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl text-ink dark:text-night-text mb-3"
      >
        Learning Rate
      </h2>
      <p className="text-sm text-ink-subtle dark:text-night-muted mb-5 leading-relaxed">
        Watch gradient descent step by step. Adjust {'\u03B7'} to see overshooting vs slow convergence, or compare all three at once.
      </p>

      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Loss curve showing gradient descent steps with adjustable learning rate"
        className="w-full rounded-lg"
        style={{ height: 280 }}
      />

      <div className="flex items-center gap-3 mt-2 mb-2">
        <label
          htmlFor="eta-slider"
          className="text-sm text-ink-subtle dark:text-night-muted min-w-[90px]"
        >
          Learning rate ({'\u03B7'})
        </label>
        <input
          id="eta-slider"
          type="range"
          min={0.02}
          max={1.1}
          step={0.02}
          value={eta}
          onChange={(e) => { setEta(parseFloat(e.target.value)); setCompareMode(false) }}
          aria-valuetext={`eta = ${eta.toFixed(2)}`}
          className="flex-1"
        />
        <span className="font-[family-name:var(--font-mono)] text-sm font-medium min-w-[44px] text-right text-ink dark:text-night-text">
          {eta.toFixed(2)}
        </span>
      </div>

      <div className="flex gap-1.5 flex-wrap my-2">
        <button
          type="button"
          onClick={step}
          className="px-4 py-1.5 rounded-lg text-[13px] font-medium border border-sapphire/30 dark:border-sapphire-dark/30
            bg-sapphire/10 dark:bg-sapphire-dark/10 text-sapphire dark:text-sapphire-dark
            hover:bg-sapphire/20 dark:hover:bg-sapphire-dark/20 transition-colors"
        >
          1 step
        </button>
        <button
          type="button"
          onClick={() => stepN(5)}
          className="px-4 py-1.5 rounded-lg text-[13px] font-medium border border-sapphire/30 dark:border-sapphire-dark/30
            bg-sapphire/10 dark:bg-sapphire-dark/10 text-sapphire dark:text-sapphire-dark
            hover:bg-sapphire/20 dark:hover:bg-sapphire-dark/20 transition-colors"
        >
          5 steps
        </button>
        <button
          type="button"
          onClick={() => stepN(20)}
          className="px-4 py-1.5 rounded-lg text-[13px] font-medium border border-sapphire/30 dark:border-sapphire-dark/30
            bg-sapphire/10 dark:bg-sapphire-dark/10 text-sapphire dark:text-sapphire-dark
            hover:bg-sapphire/20 dark:hover:bg-sapphire-dark/20 transition-colors"
        >
          20 steps
        </button>
        <button
          type="button"
          onClick={() => setCompareMode(true)}
          className={`px-4 py-1.5 rounded-lg text-[13px] font-medium border transition-colors ${
            compareMode
              ? 'border-mauve/30 dark:border-mauve-dark/30 bg-mauve/10 dark:bg-mauve-dark/10 text-mauve dark:text-mauve-dark'
              : 'border-mauve/30 dark:border-mauve-dark/30 text-mauve dark:text-mauve-dark hover:bg-mauve/10 dark:hover:bg-mauve-dark/10'
          }`}
        >
          Compare All 3
        </button>
        <button
          type="button"
          onClick={reset}
          className="px-4 py-1.5 rounded-lg text-[13px] font-medium border border-cream-border dark:border-night-border
            text-ink-subtle dark:text-night-muted hover:bg-cream-dark/60 dark:hover:bg-night-card/60 transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Loss sparkline */}
      <div className="mt-4 mb-2 rounded-lg border border-cream-border dark:border-night-border overflow-hidden">
        <canvas
          ref={sparkRef}
          role="img"
          aria-label="Chart showing loss over steps — compare slow, good, and fast learning rates"
          className="w-full"
          style={{ height: 100 }}
        />
      </div>

      <div className="flex gap-2.5 flex-wrap my-2.5">
        <MetricCard label="Step" value={String(history.length)} />
        <MetricCard label="w" value={wVal.toFixed(3)} />
        <MetricCard label="Loss" value={currentLoss.toFixed(3)} />
        <MetricCard label="Gradient" value={`${currentGrad >= 0 ? '+' : ''}${currentGrad.toFixed(3)}`} colorClass={METRIC_COLORS.red} />
      </div>

      <InsightBox>{insight}</InsightBox>
    </section>
  )
}

// ======================================================================
// SECTION 3: Batch Variants
// ======================================================================
type VariantKey = 'batch' | 'sgd' | 'mini'
interface PathPoint { w: [number, number] }
interface VariantState {
  path: PathPoint[]
  done: boolean
  frame: number
}

function genPath(type: VariantKey, noiseLevel: number): PathPoint[] {
  const eta = 0.15
  const steps = 50
  const w: [number, number] = [6.5, 5.5]
  const path: PathPoint[] = [{ w: [...w] }]
  for (let i = 0; i < steps; i++) {
    const g = grad2d(w[0], w[1])
    let n1 = 0, n2 = 0
    if (type === 'sgd') {
      n1 = (Math.random() - 0.5) * 2.5 * noiseLevel
      n2 = (Math.random() - 0.5) * 4 * noiseLevel
    } else if (type === 'mini') {
      n1 = (Math.random() - 0.5) * 2.5 * noiseLevel * 0.35
      n2 = (Math.random() - 0.5) * 4 * noiseLevel * 0.35
    }
    // Batch always uses noise=0 regardless of slider
    w[0] -= eta * (g[0] + n1)
    w[1] -= eta * (g[1] + n2)
    path.push({ w: [...w] })
  }
  return path
}

function computePathSmoothness(path: PathPoint[]): number {
  if (path.length < 3) return 0
  const angles: number[] = []
  for (let i = 1; i < path.length - 1; i++) {
    const dx1 = path[i].w[0] - path[i - 1].w[0]
    const dy1 = path[i].w[1] - path[i - 1].w[1]
    const dx2 = path[i + 1].w[0] - path[i].w[0]
    const dy2 = path[i + 1].w[1] - path[i].w[1]
    const a1 = Math.atan2(dy1, dx1)
    const a2 = Math.atan2(dy2, dx2)
    let diff = a2 - a1
    // Normalize to [-pi, pi]
    while (diff > Math.PI) diff -= 2 * Math.PI
    while (diff < -Math.PI) diff += 2 * Math.PI
    angles.push(diff)
  }
  if (angles.length === 0) return 0
  const mean = angles.reduce((s, a) => s + a, 0) / angles.length
  const variance = angles.reduce((s, a) => s + (a - mean) ** 2, 0) / angles.length
  return variance
}

function computeConvergenceSpeed(path: PathPoint[]): string {
  for (let i = 0; i < path.length; i++) {
    const dist = Math.sqrt((path[i].w[0] - 3) ** 2 + (path[i].w[1] - 2) ** 2)
    if (dist < 0.5) return String(i)
  }
  return '>50'
}

function Section3() {
  const [sectionRef, visible] = useScrollReveal()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [active, setActive] = useState<VariantKey>('batch')
  const [noiseLevel, setNoiseLevel] = useState(0.7)
  const [variants, setVariants] = useState<Record<VariantKey, VariantState>>({
    batch: { path: [], done: false, frame: 999 },
    sgd: { path: [], done: false, frame: 999 },
    mini: { path: [], done: false, frame: 999 },
  })
  const animRef = useRef<number>(0)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const result = setupCanvas(canvas, 360)
    if (!result) return
    const { ctx, W, H } = result
    const c = getThemeColors()

    const p = { l: 20, r: 20, t: 20, b: 20 }
    const pw = W - p.l - p.r
    const ph = H - p.t - p.b
    const xOf = (v: number) => p.l + (v + 1) / 9 * pw
    const yOf = (v: number) => p.t + (1 - (v + 1) / 8) * ph

    // Contour lines
    const levels = [1.5, 3, 5, 8, 12, 18, 26, 36]
    levels.forEach(lev => {
      ctx.strokeStyle = c.grid
      ctx.lineWidth = 1
      ctx.beginPath()
      let first = true
      for (let a = 0; a < Math.PI * 2; a += 0.05) {
        const d = lev - 1
        const r1 = Math.sqrt(d / 0.5)
        const r2 = Math.sqrt(d / 2)
        const w1 = 3 + r1 * Math.cos(a)
        const w2 = 2 + r2 * Math.sin(a)
        if (w1 < -1 || w1 > 8 || w2 < -1 || w2 > 7) {
          first = true
          continue
        }
        if (first) {
          ctx.moveTo(xOf(w1), yOf(w2))
          first = false
        } else {
          ctx.lineTo(xOf(w1), yOf(w2))
        }
      }
      ctx.stroke()
    })

    // Minimum
    ctx.fillStyle = c.green
    ctx.globalAlpha = 0.4
    ctx.beginPath()
    ctx.arc(xOf(3), yOf(2), 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.fillStyle = c.subtext
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('min', xOf(3), yOf(2) + 16)
    ctx.fillStyle = c.subtext
    ctx.fillText('start', xOf(6.5), yOf(5.5) - 10)

    const cols: Record<VariantKey, string> = { batch: c.blue, sgd: c.red, mini: c.purple }
    const order: VariantKey[] = (['batch', 'sgd', 'mini'] as VariantKey[]).filter(k => k !== active)
    order.push(active)

    order.forEach(key => {
      const d = variants[key]
      if (!d.path.length) return
      const n = Math.min(d.path.length, d.frame + 1)
      if (n < 2) return
      const sel = key === active
      ctx.strokeStyle = cols[key]
      ctx.lineWidth = sel ? 2.5 : 1.5
      ctx.globalAlpha = sel ? 0.85 : 0.25
      ctx.beginPath()
      ctx.moveTo(xOf(d.path[0].w[0]), yOf(d.path[0].w[1]))
      for (let i = 1; i < n; i++) {
        ctx.lineTo(xOf(d.path[i].w[0]), yOf(d.path[i].w[1]))
      }
      ctx.stroke()
      ctx.globalAlpha = 1
      const last = d.path[n - 1]
      ctx.fillStyle = cols[key]
      ctx.globalAlpha = sel ? 1 : 0.4
      ctx.beginPath()
      ctx.arc(xOf(last.w[0]), yOf(last.w[1]), sel ? 5 : 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    })

    // Start point
    ctx.fillStyle = c.text
    ctx.beginPath()
    ctx.arc(xOf(6.5), yOf(5.5), 5, 0, Math.PI * 2)
    ctx.fill()

    // Axis labels
    ctx.fillStyle = c.subtext
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('w\u2081', W / 2, H - 2)
    ctx.save()
    ctx.translate(10, H / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText('w\u2082', 0, 0)
    ctx.restore()
  }, [variants, active])

  useEffect(() => { draw() }, [draw])
  useDarkModeObserver(draw)
  useCanvasResize(canvasRef, draw)

  const animateVariant = useCallback((key: VariantKey, path: PathPoint[]) => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) {
      setVariants(prev => ({
        ...prev,
        [key]: { path, done: true, frame: path.length - 1 },
      }))
      return
    }
    let frame = 0
    function tick() {
      setVariants(prev => ({
        ...prev,
        [key]: { ...prev[key], path, frame },
      }))
      if (frame < path.length - 1) {
        frame++
        animRef.current = requestAnimationFrame(tick)
      } else {
        setVariants(prev => ({
          ...prev,
          [key]: { ...prev[key], done: true },
        }))
      }
    }
    tick()
  }, [])

  const animateAll = useCallback((paths: Record<VariantKey, PathPoint[]>) => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const maxLen = Math.max(...Object.values(paths).map(p => p.length))
    if (reducedMotion) {
      setVariants({
        batch: { path: paths.batch, done: true, frame: paths.batch.length - 1 },
        sgd: { path: paths.sgd, done: true, frame: paths.sgd.length - 1 },
        mini: { path: paths.mini, done: true, frame: paths.mini.length - 1 },
      })
      return
    }
    let frame = 0
    function tick() {
      setVariants(prev => {
        const next = { ...prev }
        for (const k of ['batch', 'sgd', 'mini'] as VariantKey[]) {
          next[k] = { ...prev[k], path: paths[k], frame: Math.min(frame, paths[k].length - 1) }
        }
        return next
      })
      if (frame < maxLen - 1) {
        frame++
        animRef.current = requestAnimationFrame(tick)
      } else {
        setVariants(prev => {
          const next = { ...prev }
          for (const k of ['batch', 'sgd', 'mini'] as VariantKey[]) {
            next[k] = { ...prev[k], done: true }
          }
          return next
        })
      }
    }
    tick()
  }, [])

  useEffect(() => {
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [])

  const runSelected = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current)
    const path = genPath(active, noiseLevel)
    setVariants(prev => ({ ...prev, [active]: { path, done: false, frame: 0 } }))
    animateVariant(active, path)
  }, [active, animateVariant, noiseLevel])

  const runAll = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current)
    const paths: Record<VariantKey, PathPoint[]> = {
      batch: genPath('batch', noiseLevel),
      sgd: genPath('sgd', noiseLevel),
      mini: genPath('mini', noiseLevel),
    }
    animateAll(paths)
  }, [animateAll, noiseLevel])

  const clearAll = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current)
    setVariants({
      batch: { path: [], done: false, frame: 999 },
      sgd: { path: [], done: false, frame: 999 },
      mini: { path: [], done: false, frame: 999 },
    })
  }, [])

  // Compute metrics for active variant
  const d = variants[active]
  const lastPt = d.path.length > 0 ? d.path[d.path.length - 1].w : null
  const dist = lastPt ? Math.sqrt((lastPt[0] - 3) ** 2 + (lastPt[1] - 2) ** 2) : null
  const fl = lastPt ? loss2d(lastPt[0], lastPt[1]) : null
  const nm: Record<VariantKey, string> = { batch: 'Batch', sgd: 'SGD', mini: 'Mini-batch' }

  // Insight
  const allDone = (['batch', 'sgd', 'mini'] as VariantKey[]).every(k => variants[k].done)
  let insight: React.ReactNode
  if (!d.path.length) {
    insight = <>Select a variant and hit {'\u201C'}Run selected.{'\u201D'}</>
  } else if (allDone && (['batch', 'sgd', 'mini'] as VariantKey[]).every(k => variants[k].path.length > 0)) {
    const ds: Record<string, number> = {}
    for (const k of ['batch', 'sgd', 'mini'] as VariantKey[]) {
      const l = variants[k].path[variants[k].path.length - 1].w
      ds[k] = Math.sqrt((l[0] - 3) ** 2 + (l[1] - 2) ** 2)
    }
    insight = (
      <>
        All three finished. <strong>Batch</strong> (blue): dist={ds.batch.toFixed(2)} — smoothest path.{' '}
        <strong>SGD</strong> (red): dist={ds.sgd.toFixed(2)} — noisiest.{' '}
        <strong>Mini-batch</strong> (purple): dist={ds.mini.toFixed(2)} — practical middle ground.
        Click variant buttons to see each one{"'"}s metrics.
      </>
    )
  } else if (active === 'batch' && d.done) {
    insight = <><strong>Batch</strong> uses the exact gradient from ALL data — smooth, direct path. Accurate but expensive per step.</>
  } else if (active === 'sgd' && d.done) {
    insight = <><strong>SGD</strong> estimates gradient from ONE random point — fast per step but noisy. Path zigzags because each estimate is imprecise.</>
  } else if (active === 'mini' && d.done) {
    insight = <><strong>Mini-batch</strong> averages gradient over a small group (~32 points). Less noise than SGD, cheaper than batch. The practical choice.</>
  } else {
    insight = <>Running simulation...</>
  }

  const variantInfo: Array<{ key: VariantKey; label: string; desc: string }> = [
    { key: 'batch', label: 'Batch', desc: 'all data, smooth path' },
    { key: 'sgd', label: 'SGD', desc: '1 point, noisy zigzag' },
    { key: 'mini', label: 'Mini-batch', desc: 'small group, moderate' },
  ]

  // Compute smoothness and convergence for active variant
  const activePath = variants[active].path
  const smoothness = activePath.length > 0 ? computePathSmoothness(activePath) : null
  const convergence = activePath.length > 0 ? computeConvergenceSpeed(activePath) : null

  return (
    <section
      ref={sectionRef as React.RefObject<HTMLElement>}
      aria-labelledby="gd-batch-variants"
      className={`py-8 transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <h2
        id="gd-batch-variants"
        className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl text-ink dark:text-night-text mb-3"
      >
        Batch vs SGD vs Mini-batch
      </h2>
      <p className="text-sm text-ink-subtle dark:text-night-muted mb-5 leading-relaxed">
        Select a variant and run it. Each starts from the same point (top-right) heading to the minimum (center).
        Adjust the noise slider to see the full spectrum from clean to chaotic.
      </p>

      {/* Variant buttons */}
      <div className="flex gap-1.5 flex-wrap mb-3">
        {variantInfo.map(v => {
          const isActive = active === v.key
          const hasPath = variants[v.key].path.length > 0
          const colorMap: Record<VariantKey, string> = {
            batch: 'bg-sapphire dark:bg-sapphire-dark',
            sgd: 'bg-red-500 dark:bg-red-400',
            mini: 'bg-mauve dark:bg-mauve-dark',
          }
          return (
            <button
              key={v.key}
              type="button"
              onClick={() => setActive(v.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium border transition-colors ${
                isActive
                  ? 'border-sapphire/30 dark:border-sapphire-dark/30 bg-sapphire/10 dark:bg-sapphire-dark/10 text-sapphire dark:text-sapphire-dark font-semibold'
                  : 'border-cream-border dark:border-night-border text-ink-subtle dark:text-night-muted hover:bg-cream-dark/60 dark:hover:bg-night-card/60'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${colorMap[v.key]} ${hasPath ? 'opacity-100' : 'opacity-30'}`} />
              {v.label}
              <span className="text-[13px] text-ink-faint dark:text-night-muted">{v.desc}</span>
            </button>
          )
        })}
      </div>

      {/* Noise level slider */}
      <div className="flex items-center gap-3 mt-2 mb-3">
        <label
          htmlFor="noise-slider"
          className="text-sm text-ink-subtle dark:text-night-muted min-w-[90px]"
        >
          Noise level
        </label>
        <input
          id="noise-slider"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={noiseLevel}
          onChange={(e) => setNoiseLevel(parseFloat(e.target.value))}
          aria-valuetext={`noise = ${noiseLevel.toFixed(2)}`}
          className="flex-1"
        />
        <span className="font-[family-name:var(--font-mono)] text-sm font-medium min-w-[44px] text-right text-ink dark:text-night-text">
          {noiseLevel.toFixed(2)}
        </span>
      </div>

      <canvas
        ref={canvasRef}
        role="img"
        aria-label="2D loss landscape showing optimization paths for batch gradient descent, SGD, and mini-batch"
        className="w-full rounded-lg"
        style={{ height: 360 }}
      />

      <div className="flex gap-1.5 flex-wrap my-2">
        <button
          type="button"
          onClick={runSelected}
          className="px-4 py-1.5 rounded-lg text-[13px] font-medium border border-sapphire/30 dark:border-sapphire-dark/30
            bg-sapphire/10 dark:bg-sapphire-dark/10 text-sapphire dark:text-sapphire-dark
            hover:bg-sapphire/20 dark:hover:bg-sapphire-dark/20 transition-colors"
        >
          Run selected
        </button>
        <button
          type="button"
          onClick={runAll}
          className="px-4 py-1.5 rounded-lg text-[13px] font-medium border border-sapphire/30 dark:border-sapphire-dark/30
            bg-sapphire/10 dark:bg-sapphire-dark/10 text-sapphire dark:text-sapphire-dark
            hover:bg-sapphire/20 dark:hover:bg-sapphire-dark/20 transition-colors"
        >
          Run all three
        </button>
        <button
          type="button"
          onClick={clearAll}
          className="px-4 py-1.5 rounded-lg text-[13px] font-medium border border-cream-border dark:border-night-border
            text-ink-subtle dark:text-night-muted hover:bg-cream-dark/60 dark:hover:bg-night-card/60 transition-colors"
        >
          Clear all
        </button>
      </div>

      {lastPt && (
        <div className="flex gap-2.5 flex-wrap my-2.5">
          <MetricCard label={`${nm[active]} final w\u2081`} value={lastPt[0].toFixed(2)} colorClass={METRIC_COLORS.blue} />
          <MetricCard label={`${nm[active]} final w\u2082`} value={lastPt[1].toFixed(2)} colorClass={METRIC_COLORS.blue} />
          <MetricCard label="Distance to min" value={dist!.toFixed(3)} />
          <MetricCard label="Final loss" value={fl!.toFixed(3)} />
          {smoothness !== null && (
            <MetricCard label="Path smoothness" value={smoothness.toFixed(3)} colorClass={METRIC_COLORS.amber} />
          )}
          {convergence !== null && (
            <MetricCard label="Converge speed" value={convergence} colorClass={METRIC_COLORS.green} />
          )}
        </div>
      )}

      <InsightBox>{insight}</InsightBox>
    </section>
  )
}

// ======================================================================
// SECTION 4: GD vs Gradient Boosting (Side-by-Side)
// ======================================================================
const GB_ACTUAL = [4, 10, 7, 15, 11, 3, 13]
const GB_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G']

function gbMSE(preds: number[]) {
  return GB_ACTUAL.reduce((s, v, i) => s + (v - preds[i]) ** 2, 0) / GB_ACTUAL.length
}

function Section4() {
  const [sectionRef, visible] = useScrollReveal()
  const gdCanvasRef = useRef<HTMLCanvasElement>(null)
  const gbCanvasRef = useRef<HTMLCanvasElement>(null)
  const [eta, setEta] = useState(0.3)

  // GD state
  const [gdW, setGdW] = useState(7)
  const [gdHist, setGdHist] = useState<Array<{ w: number; l: number }>>([])

  // GB state
  const meanVal = GB_ACTUAL.reduce((a, b) => a + b, 0) / GB_ACTUAL.length
  const [gbPreds, setGbPreds] = useState<number[]>(() => GB_ACTUAL.map(() => meanVal))
  const [stepCount, setStepCount] = useState(0)
  const [gbHist, setGbHist] = useState<Array<{ preds: number[]; mse: number }>>(() => [
    { preds: GB_ACTUAL.map(() => meanVal), mse: gbMSE(GB_ACTUAL.map(() => meanVal)) },
  ])

  // Advance both GD and GB simultaneously
  const step = useCallback(() => {
    // GD step
    setGdHist(prev => [...prev, { w: gdW, l: loss(gdW) }])
    setGdW(prev => {
      let next = prev - eta * grad(prev)
      if (next < -4) next = -4
      if (next > 10) next = 10
      return next
    })
    // GB step
    setGbPreds(prev => {
      const resid = GB_ACTUAL.map((v, i) => v - prev[i])
      const treePred = resid.map(r => r * (0.6 + Math.random() * 0.2))
      const newPreds = prev.map((p, i) => p + eta * treePred[i])
      setGbHist(h => [...h, { preds: [...newPreds], mse: gbMSE(newPreds) }])
      return newPreds
    })
    setStepCount(s => s + 1)
  }, [gdW, eta])

  const stepN = useCallback((n: number) => {
    // GD steps
    let w = gdW
    const newGdHist: Array<{ w: number; l: number }> = []
    for (let i = 0; i < n; i++) {
      newGdHist.push({ w, l: loss(w) })
      w = w - eta * grad(w)
      if (w < -4) w = -4
      if (w > 10) w = 10
    }
    setGdHist(prev => [...prev, ...newGdHist])
    setGdW(w)
    // GB steps
    let preds = [...gbPreds]
    const newGbHistEntries: Array<{ preds: number[]; mse: number }> = []
    for (let i = 0; i < n; i++) {
      const resid = GB_ACTUAL.map((v, j) => v - preds[j])
      const treePred = resid.map(r => r * (0.6 + Math.random() * 0.2))
      preds = preds.map((p, j) => p + eta * treePred[j])
      newGbHistEntries.push({ preds: [...preds], mse: gbMSE(preds) })
    }
    setGbPreds(preds)
    setStepCount(s => s + n)
    setGbHist(h => [...h, ...newGbHistEntries])
  }, [gdW, eta, gbPreds])

  const reset = useCallback(() => {
    setGdW(7)
    setGdHist([])
    const m = GB_ACTUAL.reduce((a, b) => a + b, 0) / GB_ACTUAL.length
    setGbPreds(GB_ACTUAL.map(() => m))
    setStepCount(0)
    setGbHist([{ preds: GB_ACTUAL.map(() => m), mse: gbMSE(GB_ACTUAL.map(() => m)) }])
  }, [])

  // --- GD canvas draw ---
  const drawGD = useCallback(() => {
    const canvas = gdCanvasRef.current
    if (!canvas) return
    const result = setupCanvas(canvas, 300)
    if (!result) return
    const { ctx, W, H } = result
    const c = getThemeColors()

    const p = { l: 40, r: 20, t: 20, b: 36 }
    const pw = W - p.l - p.r
    const ph = H - p.t - p.b
    const xOf = (v: number) => p.l + (v + 3) / 13 * pw
    const yOf = (v: number) => p.t + (1 - v / 26) * ph

    // Grid
    ctx.strokeStyle = c.grid; ctx.lineWidth = 0.5
    for (let v = 0; v <= 26; v += 5) {
      ctx.beginPath(); ctx.moveTo(p.l, yOf(v)); ctx.lineTo(W - p.r, yOf(v)); ctx.stroke()
    }
    ctx.strokeStyle = c.axis; ctx.lineWidth = 0.5
    ctx.beginPath(); ctx.moveTo(p.l, p.t); ctx.lineTo(p.l, H - p.b); ctx.lineTo(W - p.r, H - p.b); ctx.stroke()
    ctx.fillStyle = c.subtext; ctx.font = '11px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText('w (parameter)', W / 2, H - 4)
    ctx.save(); ctx.translate(12, H / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('Loss', 0, 0); ctx.restore()

    // Loss curve
    ctx.beginPath(); ctx.strokeStyle = c.subtext; ctx.lineWidth = 2
    for (let px = 0; px <= pw; px++) {
      const wv = -3 + px / pw * 13
      const x = p.l + px, y = yOf(loss(wv))
      if (px === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
    }
    ctx.stroke()

    // Minimum
    ctx.fillStyle = c.green; ctx.globalAlpha = 0.25
    ctx.beginPath(); ctx.arc(xOf(3), yOf(0.5), 6, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1
    ctx.fillStyle = c.subtext; ctx.font = '11px sans-serif'; ctx.fillText('min', xOf(3), yOf(0.5) + 16)

    // Path
    const all = [...gdHist, { w: gdW, l: loss(gdW) }]
    if (all.length > 1) {
      for (let i = 0; i < all.length - 1; i++) {
        ctx.strokeStyle = c.blue; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.4
        ctx.beginPath(); ctx.moveTo(xOf(all[i].w), yOf(all[i].l)); ctx.lineTo(xOf(all[i + 1].w), yOf(all[i + 1].l)); ctx.stroke()
        ctx.globalAlpha = 1; ctx.fillStyle = c.blue; ctx.globalAlpha = 0.3
        ctx.beginPath(); ctx.arc(xOf(all[i].w), yOf(all[i].l), 3, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1
      }
    }
    ctx.fillStyle = c.blue
    ctx.beginPath(); ctx.arc(xOf(gdW), yOf(loss(gdW)), 7, 0, Math.PI * 2); ctx.fill()

    // Step labels
    ctx.font = '500 9px sans-serif'; ctx.fillStyle = c.subtext; ctx.textAlign = 'center'
    for (let i = 0; i < Math.min(all.length, 10); i++) {
      ctx.fillText(String(i), xOf(all[i].w), yOf(all[i].l) - 12)
    }
  }, [gdW, gdHist])

  // --- GB canvas draw ---
  const drawGB = useCallback(() => {
    const canvas = gbCanvasRef.current
    if (!canvas) return
    const result = setupCanvas(canvas, 300)
    if (!result) return
    const { ctx, W, H } = result
    const c = getThemeColors()

    const n = GB_ACTUAL.length
    const p = { l: 50, r: 20, t: 20, b: 40 }
    const pw = W - p.l - p.r
    const ph = H - p.t - p.b
    const maxVal = Math.max(...GB_ACTUAL) + 2
    const barW = pw / (n * 3 + 1)
    const gap = barW
    const groupW = barW * 2 + 4
    const totalW = n * groupW + (n - 1) * gap
    const startX = p.l + (pw - totalW) / 2
    const yOf = (v: number) => p.t + (1 - v / maxVal) * ph

    // Axes
    ctx.strokeStyle = c.axis; ctx.lineWidth = 0.5
    ctx.beginPath(); ctx.moveTo(p.l, p.t); ctx.lineTo(p.l, H - p.b); ctx.lineTo(W - p.r, H - p.b); ctx.stroke()
    ctx.fillStyle = c.subtext; ctx.font = '11px sans-serif'; ctx.textAlign = 'right'
    for (let v = 0; v <= maxVal; v += 5) {
      ctx.fillText(String(v), p.l - 6, yOf(v) + 4)
      ctx.strokeStyle = c.grid; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(p.l, yOf(v)); ctx.lineTo(W - p.r, yOf(v)); ctx.stroke()
    }
    ctx.textAlign = 'center'; ctx.fillText('Value', p.l - 6, p.t - 6)

    // Bars
    for (let i = 0; i < n; i++) {
      const x = startX + i * (groupW + gap)
      const actual = GB_ACTUAL[i]
      const pred = gbPreds[i]

      // Actual bar
      const ah = Math.max(0, (actual / maxVal) * ph)
      ctx.fillStyle = c.barActual
      ctx.fillRect(x, yOf(actual), barW, ah)
      ctx.strokeStyle = c.subtext; ctx.lineWidth = 0.5; ctx.strokeRect(x, yOf(actual), barW, ah)

      // Prediction bar
      const predClamped = Math.max(0, Math.min(pred, maxVal))
      const predH = Math.max(0, (predClamped / maxVal) * ph)
      ctx.fillStyle = c.green + '44'
      ctx.fillRect(x + barW + 4, yOf(predClamped), barW, predH)
      ctx.strokeStyle = c.green; ctx.lineWidth = 1; ctx.strokeRect(x + barW + 4, yOf(predClamped), barW, predH)

      // Residual line
      const actualY = yOf(actual)
      const predY = yOf(predClamped)
      const midX = x + barW + 2
      if (Math.abs(actual - predClamped) > 0.1) {
        ctx.strokeStyle = c.red; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3])
        ctx.beginPath(); ctx.moveTo(midX, actualY); ctx.lineTo(midX, predY); ctx.stroke()
        ctx.setLineDash([])
        const resid = actual - pred
        ctx.fillStyle = c.red; ctx.font = '500 10px sans-serif'; ctx.textAlign = 'center'
        ctx.fillText((resid >= 0 ? '+' : '') + resid.toFixed(1), midX, (actualY + predY) / 2 + (resid > 0 ? -6 : 10))
      }

      // Label
      ctx.fillStyle = c.subtext; ctx.font = '11px sans-serif'; ctx.textAlign = 'center'
      ctx.fillText(GB_LABELS[i], x + groupW / 2, H - p.b + 14)
    }

    // Legend
    ctx.font = '11px sans-serif'; ctx.textAlign = 'left'
    const lgX = p.l + 8, lgY = p.t + 10
    ctx.fillStyle = c.barActual; ctx.fillRect(lgX, lgY, 10, 10)
    ctx.fillStyle = c.subtext; ctx.fillText('Actual', lgX + 14, lgY + 9)
    ctx.fillStyle = c.green + '44'; ctx.fillRect(lgX + 60, lgY, 10, 10)
    ctx.strokeStyle = c.green; ctx.lineWidth = 1; ctx.strokeRect(lgX + 60, lgY, 10, 10)
    ctx.fillStyle = c.subtext; ctx.fillText('Prediction', lgX + 74, lgY + 9)
    ctx.fillStyle = c.red; ctx.fillText('\u2190 residual', lgX + 140, lgY + 9)

    // MSE sparkline
    if (gbHist.length > 1) {
      const spW = 100, spH = 40, spX = W - p.r - spW - 8, spY = p.t + 4
      ctx.fillStyle = c.subtext; ctx.font = '10px sans-serif'; ctx.textAlign = 'right'
      ctx.fillText('MSE', spX - 4, spY + spH / 2 + 3)
      const maxMSE = gbHist[0].mse
      ctx.strokeStyle = c.amber; ctx.lineWidth = 1.5; ctx.beginPath()
      gbHist.forEach((h, i) => {
        const sx = spX + i / (gbHist.length - 1) * spW
        const sy = spY + spH - (h.mse / maxMSE) * spH
        if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy)
      })
      ctx.stroke()
      ctx.fillStyle = c.amber; ctx.beginPath()
      const lastH = gbHist[gbHist.length - 1]
      const lsx = spX + (gbHist.length - 1) / (gbHist.length - 1) * spW
      const lsy = spY + spH - (lastH.mse / maxMSE) * spH
      ctx.arc(lsx, lsy, 3, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = c.subtext; ctx.font = '10px sans-serif'; ctx.textAlign = 'left'
      ctx.fillText(lastH.mse.toFixed(2), lsx + 6, lsy + 3)
    }
  }, [gbPreds, gbHist])

  const drawAll = useCallback(() => { drawGD(); drawGB() }, [drawGD, drawGB])

  useEffect(() => { drawAll() }, [drawAll])
  useDarkModeObserver(drawAll)
  useCanvasResize(gdCanvasRef, drawGD)
  useCanvasResize(gbCanvasRef, drawGB)

  // Metrics
  const gdLoss = loss(gdW)
  const gdGrad = grad(gdW)
  const gbMse = gbMSE(gbPreds)
  const gbResids = GB_ACTUAL.map((v, i) => v - gbPreds[i])
  const gbMaxResid = Math.max(...gbResids.map(Math.abs))

  // Insight text
  let insight: React.ReactNode
  if (stepCount === 0) {
    insight = (
      <>
        <strong>Side-by-side comparison.</strong> Hit {'\u201C'}1 step{'\u201D'} to advance both simultaneously.
        GD adjusts a single parameter w to minimize loss. GB adds a tree to correct prediction errors.
        Same {'\u03B7'}, same number of steps — watch both converge.
      </>
    )
  } else if (Math.abs(gdGrad) < 0.05 && gbMse < 0.1) {
    insight = (
      <>
        <strong>Both converged after {stepCount} steps.</strong> GD: w {'\u2248'} {gdW.toFixed(2)}, loss {'\u2248'} {gdLoss.toFixed(3)}.
        GB: MSE {'\u2248'} {gbMse.toFixed(3)}. Same mechanics — subtract {'\u03B7'} {'\u00D7'} gradient from the current state.
        GD adjusted one parameter, GB added {stepCount} trees.
      </>
    )
  } else {
    insight = (
      <>
        <strong>After {stepCount} step{stepCount !== 1 ? 's' : ''}:</strong> GD loss = {gdLoss.toFixed(3)}, GB MSE = {gbMse.toFixed(3)}.
        Both use the same {'\u03B7'} and same number of steps — GD adjusts one parameter, GB adds trees.
      </>
    )
  }

  return (
    <section
      ref={sectionRef as React.RefObject<HTMLElement>}
      aria-labelledby="gd-vs-boosting"
      className={`py-8 transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <h2
        id="gd-vs-boosting"
        className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl text-ink dark:text-night-text mb-3"
      >
        GD vs Gradient Boosting
      </h2>
      <p className="text-sm text-ink-subtle dark:text-night-muted mb-5 leading-relaxed">
        Same algorithm, different spaces. Shared controls advance both simultaneously — watch how each {'\u201C'}step{'\u201D'} works side by side.
      </p>

      {/* Equation boxes side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div className="rounded-lg bg-cream-dark/60 dark:bg-night-card/60 px-3 py-2">
          <span className="font-[family-name:var(--font-mono)] text-[13px] text-sapphire dark:text-sapphire-dark">
            w<sub>new</sub> = w<sub>old</sub> {'\u2212'} {'\u03B7'} {'\u00D7'} gradient
          </span>
          <span className="block text-[12px] text-ink-faint dark:text-night-muted mt-0.5">
            Moving a parameter downhill
          </span>
        </div>
        <div className="rounded-lg bg-cream-dark/60 dark:bg-night-card/60 px-3 py-2">
          <span className="font-[family-name:var(--font-mono)] text-[13px] text-green-600 dark:text-green-400">
            F<sub>new</sub> = F<sub>old</sub> + {'\u03B7'} {'\u00D7'} tree(residuals)
          </span>
          <span className="block text-[12px] text-ink-faint dark:text-night-muted mt-0.5">
            Adding a tree that corrects errors
          </span>
        </div>
      </div>

      {/* Side-by-side canvases */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <div className="text-[13px] font-medium text-sapphire dark:text-sapphire-dark mb-1.5 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sapphire dark:bg-sapphire-dark" />
            Gradient Descent
          </div>
          <canvas
            ref={gdCanvasRef}
            role="img"
            aria-label="Loss curve showing gradient descent steps in parameter space"
            className="w-full rounded-lg"
            style={{ height: 300 }}
          />
          <div className="flex gap-2.5 flex-wrap my-2">
            <MetricCard label="w" value={gdW.toFixed(3)} colorClass={METRIC_COLORS.blue} />
            <MetricCard label="Loss" value={gdLoss.toFixed(3)} />
            <MetricCard label="Gradient" value={`${gdGrad >= 0 ? '+' : ''}${gdGrad.toFixed(3)}`} colorClass={METRIC_COLORS.red} />
          </div>
        </div>
        <div>
          <div className="text-[13px] font-medium text-green-600 dark:text-green-400 mb-1.5 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 dark:bg-green-400" />
            Gradient Boosting
          </div>
          <canvas
            ref={gbCanvasRef}
            role="img"
            aria-label="Bar chart comparing actual values to gradient boosting predictions with residual lines"
            className="w-full rounded-lg"
            style={{ height: 300 }}
          />
          <div className="flex gap-2.5 flex-wrap my-2">
            <MetricCard label="MSE" value={gbMse.toFixed(3)} colorClass={METRIC_COLORS.amber} />
            <MetricCard label="Max |residual|" value={gbMaxResid.toFixed(2)} colorClass={METRIC_COLORS.red} />
          </div>
        </div>
      </div>

      {/* Shared controls */}
      <div className="flex gap-2.5 flex-wrap my-2.5 justify-center">
        <MetricCard label="Step" value={String(stepCount)} />
      </div>

      {/* Learning rate slider */}
      <div className="flex items-center gap-3 mt-2 mb-2">
        <label
          htmlFor="t4-eta-slider"
          className="text-sm text-ink-subtle dark:text-night-muted min-w-[90px]"
        >
          Learning rate ({'\u03B7'})
        </label>
        <input
          id="t4-eta-slider"
          type="range"
          min={0.05}
          max={1.0}
          step={0.05}
          value={eta}
          onChange={(e) => setEta(parseFloat(e.target.value))}
          aria-valuetext={`eta = ${eta.toFixed(2)}`}
          className="flex-1"
        />
        <span className="font-[family-name:var(--font-mono)] text-sm font-medium min-w-[44px] text-right text-ink dark:text-night-text">
          {eta.toFixed(2)}
        </span>
      </div>

      <div className="flex gap-1.5 flex-wrap my-2 justify-center">
        <button
          type="button"
          onClick={step}
          className="px-4 py-1.5 rounded-lg text-[13px] font-medium border border-sapphire/30 dark:border-sapphire-dark/30
            bg-sapphire/10 dark:bg-sapphire-dark/10 text-sapphire dark:text-sapphire-dark
            hover:bg-sapphire/20 dark:hover:bg-sapphire-dark/20 transition-colors"
        >
          1 step
        </button>
        <button
          type="button"
          onClick={() => stepN(5)}
          className="px-4 py-1.5 rounded-lg text-[13px] font-medium border border-sapphire/30 dark:border-sapphire-dark/30
            bg-sapphire/10 dark:bg-sapphire-dark/10 text-sapphire dark:text-sapphire-dark
            hover:bg-sapphire/20 dark:hover:bg-sapphire-dark/20 transition-colors"
        >
          5 steps
        </button>
        <button
          type="button"
          onClick={() => stepN(15)}
          className="px-4 py-1.5 rounded-lg text-[13px] font-medium border border-sapphire/30 dark:border-sapphire-dark/30
            bg-sapphire/10 dark:bg-sapphire-dark/10 text-sapphire dark:text-sapphire-dark
            hover:bg-sapphire/20 dark:hover:bg-sapphire-dark/20 transition-colors"
        >
          15 steps
        </button>
        <button
          type="button"
          onClick={reset}
          className="px-4 py-1.5 rounded-lg text-[13px] font-medium border border-cream-border dark:border-night-border
            text-ink-subtle dark:text-night-muted hover:bg-cream-dark/60 dark:hover:bg-night-card/60 transition-colors"
        >
          Reset
        </button>
      </div>

      <InsightBox>{insight}</InsightBox>
    </section>
  )
}

// ======================================================================
// MAIN EXPORT
// ======================================================================
export function GradientDescent() {
  return (
    <div className="mx-auto max-w-5xl px-6 sm:px-10 lg:px-12">
      {/* Title */}
      <div className="text-center mb-16">
        <p className="font-[family-name:var(--font-mono)] text-[13px] tracking-[0.3em] uppercase mb-4 text-peach dark:text-peach-dark">
          01/
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl text-ink dark:text-night-text mb-4">
          Gradient Descent
        </h1>
        <p className="text-base text-ink-subtle dark:text-night-muted">
          4 concepts {'\u00B7'} Drag sliders and run simulations
        </p>
        <div className="mt-4 h-px w-16 mx-auto bg-mauve dark:bg-mauve-dark" />
      </div>

      <Section1 />

      <div className="py-12 [&>div]:mb-0">
        <SectionDivider absolute={false} />
      </div>

      <Section2 />

      <div className="py-12 [&>div]:mb-0">
        <SectionDivider absolute={false} />
      </div>

      <Section3 />

      <div className="py-12 [&>div]:mb-0">
        <SectionDivider absolute={false} />
      </div>

      <Section4 />
    </div>
  )
}
