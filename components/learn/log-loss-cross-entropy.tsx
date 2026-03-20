'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useScrollReveal } from '@/lib/hooks'
import { SectionDivider } from '@/components/section-divider'

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
    // Accent colors mapped to Catppuccin
    blue: isDark ? '#74c7ec' : '#209fb5',    // sapphire
    red: isDark ? '#f38ba8' : '#d20f39',     // red
    green: isDark ? '#a6e3a1' : '#40a02b',   // green
    amber: isDark ? '#f9e2af' : '#df8e1d',   // yellow
    purple: isDark ? '#cba6f7' : '#8839ef',  // mauve
  }
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

function WarnBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-lg bg-amber-100/60 dark:bg-amber-900/20 px-4 py-3 text-sm leading-relaxed text-amber-700 dark:text-amber-300">
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

// --- Statistical helpers ---

// Normal inverse CDF (rational approximation, Abramowitz & Stegun)
function normInv(p: number): number {
  if (p <= 0) return -4
  if (p >= 1) return 4
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.383577518672690e2, -3.066479806614716e1, 2.506628277459239e0]
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1]
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0, -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0]
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0, 3.754408661907416e0]
  const pLow = 0.02425
  const pHigh = 1 - pLow
  let q: number, r: number
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p))
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  }
  if (p <= pHigh) {
    q = p - 0.5
    r = q * q
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
  }
  q = Math.sqrt(-2 * Math.log(1 - p))
  return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
}

// Box-Muller normal RNG
function boxMuller(): number {
  let u = 0, v = 0
  while (!u) u = Math.random()
  while (!v) v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

type DistributionType = 'normal' | 'right_skew' | 'heavy_tail'

function genData(type: DistributionType, n: number): number[] {
  const data: number[] = []
  for (let i = 0; i < n; i++) {
    if (type === 'normal') {
      data.push(boxMuller() * 2 + 10)
    } else if (type === 'right_skew') {
      data.push(Math.exp(boxMuller() * 0.8 + 1.5))
    } else if (type === 'heavy_tail') {
      let v = boxMuller() * 2 + 10
      if (Math.random() < 0.1) v += (Math.random() > 0.5 ? 1 : -1) * boxMuller() * 8
      data.push(v)
    }
  }
  return data.sort((a, b) => a - b)
}

// ======================================================================
// SECTION 1: QQ Plots for Normality
// ======================================================================
function Section1() {
  const [sectionRef, visible] = useScrollReveal()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [distType, setDistType] = useState<DistributionType>('normal')
  const [data, setData] = useState<number[]>(() => genData('normal', 80))

  const switchDist = useCallback((type: DistributionType) => {
    setDistType(type)
    setData(genData(type, 80))
  }, [])

  const resample = useCallback(() => {
    setData(genData(distType, 80))
  }, [distType])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const result = setupCanvas(canvas, 320)
    if (!result) return
    const { ctx, W, H } = result
    const c = getThemeColors()

    const p = { l: 50, r: 20, t: 20, b: 40 }
    const pw = W - p.l - p.r
    const ph = H - p.t - p.b
    const n = data.length

    const theorQ: number[] = []
    const dataQ: number[] = []
    for (let i = 0; i < n; i++) {
      theorQ.push(normInv((i + 0.5) / n))
      dataQ.push(data[i])
    }

    const tMin = Math.min(...theorQ), tMax = Math.max(...theorQ)
    const dMin = Math.min(...dataQ), dMax = Math.max(...dataQ)
    const xOf = (v: number) => p.l + (v - tMin) / (tMax - tMin) * pw
    const yOf = (v: number) => p.t + (1 - (v - dMin) / (dMax - dMin)) * ph

    // Grid
    ctx.strokeStyle = c.grid
    ctx.lineWidth = 0.5
    for (let i = 0; i <= 4; i++) {
      const v = dMin + i / 4 * (dMax - dMin)
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
    ctx.fillText('Theoretical quantiles (normal)', W / 2, H - 6)
    ctx.save()
    ctx.translate(14, H / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText('Sample quantiles', 0, 0)
    ctx.restore()

    // Reference line (fit through Q1 and Q3)
    const q1i = Math.floor(n * 0.25)
    const q3i = Math.floor(n * 0.75)
    const slope = (dataQ[q3i] - dataQ[q1i]) / (theorQ[q3i] - theorQ[q1i])
    const intercept = dataQ[q1i] - slope * theorQ[q1i]
    ctx.strokeStyle = c.red
    ctx.lineWidth = 1.5
    ctx.globalAlpha = 0.5
    ctx.setLineDash([6, 4])
    ctx.beginPath()
    ctx.moveTo(xOf(tMin), yOf(slope * tMin + intercept))
    ctx.lineTo(xOf(tMax), yOf(slope * tMax + intercept))
    ctx.stroke()
    ctx.setLineDash([])
    ctx.globalAlpha = 1

    // Data points
    ctx.fillStyle = c.blue
    for (let i = 0; i < n; i++) {
      ctx.globalAlpha = 0.7
      ctx.beginPath()
      ctx.arc(xOf(theorQ[i]), yOf(dataQ[i]), 3.5, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }, [data])

  useEffect(() => { draw() }, [draw])
  useDarkModeObserver(draw)
  useCanvasResize(canvasRef, draw)

  // Insight text
  let insight: React.ReactNode
  if (distType === 'normal') {
    insight = (
      <>
        <strong>Normal data:</strong> dots hug the red reference line closely. Minor scatter is expected with finite samples
        {' '}{'\u2014'} perfection would require infinite data. This is what a healthy QQ plot looks like.
      </>
    )
  } else if (distType === 'right_skew') {
    insight = (
      <>
        <strong>Right skew:</strong> dots curve UPWARD at the right end {'\u2014'} the upper tail extends much further
        than a normal distribution would. Income, medical costs, and house prices often look like this.
        Fix with Box-Cox (if data {'>'} 0) or Yeo-Johnson (any data).
      </>
    )
  } else {
    insight = (
      <>
        <strong>Heavy tails:</strong> dots form an S-shape {'\u2014'} both tails extend beyond what a normal distribution
        predicts. The left end dips below the line, the right end rises above it. Common with financial returns and
        measurement data with outliers.
      </>
    )
  }

  const distButtons: Array<{ key: DistributionType; label: string; desc: string }> = [
    { key: 'normal', label: 'Normal', desc: 'should be on the line' },
    { key: 'right_skew', label: 'Right skewed', desc: 'curves up at right' },
    { key: 'heavy_tail', label: 'Heavy tails', desc: 'S-shaped' },
  ]

  return (
    <section
      ref={sectionRef as React.RefObject<HTMLElement>}
      aria-labelledby="ll-qq-plots"
      className={`py-8 transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <h2
        id="ll-qq-plots"
        className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl text-ink dark:text-night-text mb-3"
      >
        QQ Plots for Normality
      </h2>
      <p className="text-sm text-ink-subtle dark:text-night-muted mb-5 leading-relaxed">
        A QQ plot compares your data against a theoretical normal distribution. If data is normal, dots lie on the
        diagonal. Select different distributions to see what departures look like.
      </p>

      {/* Distribution buttons */}
      <div className="flex gap-1.5 flex-wrap mb-3">
        {distButtons.map(v => (
          <button
            key={v.key}
            type="button"
            onClick={() => switchDist(v.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium border transition-colors ${
              distType === v.key
                ? 'border-sapphire/30 dark:border-sapphire-dark/30 bg-sapphire/10 dark:bg-sapphire-dark/10 text-sapphire dark:text-sapphire-dark font-semibold'
                : 'border-cream-border dark:border-night-border text-ink-subtle dark:text-night-muted hover:bg-cream-dark/60 dark:hover:bg-night-card/60'
            }`}
          >
            {v.label}
            <span className="text-[12px] text-ink-faint dark:text-night-muted">{v.desc}</span>
          </button>
        ))}
      </div>

      <canvas
        ref={canvasRef}
        role="img"
        aria-label="QQ plot comparing sample quantiles against theoretical normal quantiles with a reference line"
        className="w-full rounded-lg"
        style={{ height: 320 }}
      />

      <div className="flex gap-1.5 flex-wrap my-2">
        <button
          type="button"
          onClick={resample}
          className="px-4 py-1.5 rounded-lg text-[13px] font-medium border border-sapphire/30 dark:border-sapphire-dark/30
            bg-sapphire/10 dark:bg-sapphire-dark/10 text-sapphire dark:text-sapphire-dark
            hover:bg-sapphire/20 dark:hover:bg-sapphire-dark/20 transition-colors"
        >
          Resample
        </button>
      </div>

      <InsightBox>{insight}</InsightBox>
    </section>
  )
}

// ======================================================================
// SECTION 2: Log Loss Explorer
// ======================================================================
function Section2() {
  const [sectionRef, visible] = useScrollReveal()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [actualY, setActualY] = useState(1)
  const [predP, setPredP] = useState(0.8)

  const curLoss = actualY === 1 ? -Math.log(predP) : -Math.log(1 - predP)
  const rightWrong = (actualY === 1 && predP >= 0.5) || (actualY === 0 && predP < 0.5)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const result = setupCanvas(canvas, 280)
    if (!result) return
    const { ctx, W, H } = result
    const c = getThemeColors()

    const pad = { l: 50, r: 20, t: 20, b: 40 }
    const pw = W - pad.l - pad.r
    const ph = H - pad.t - pad.b
    const maxLoss = 5
    const xOf = (v: number) => pad.l + v * pw
    const yOf = (v: number) => pad.t + (1 - v / maxLoss) * ph

    // Grid
    ctx.strokeStyle = c.grid
    ctx.lineWidth = 0.5
    for (let v = 0; v <= maxLoss; v++) {
      ctx.beginPath()
      ctx.moveTo(pad.l, yOf(v))
      ctx.lineTo(W - pad.r, yOf(v))
      ctx.stroke()
      ctx.fillStyle = c.subtext
      ctx.font = '11px sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText(String(v), pad.l - 6, yOf(v) + 4)
    }

    // Axes
    ctx.strokeStyle = c.axis
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(pad.l, pad.t)
    ctx.lineTo(pad.l, H - pad.b)
    ctx.lineTo(W - pad.r, H - pad.b)
    ctx.stroke()
    ctx.fillStyle = c.subtext
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Predicted probability (p)', W / 2, H - 6)
    ctx.save()
    ctx.translate(14, H / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText('Loss', 0, 0)
    ctx.restore()

    // Draw both loss curves (active one bold, other faint)
    function drawLossCurve(forY: number, color: string, bold: boolean) {
      ctx.strokeStyle = color
      ctx.lineWidth = bold ? 2.5 : 1
      ctx.globalAlpha = bold ? 1 : 0.2
      ctx.beginPath()
      for (let px = 0; px <= pw; px++) {
        const pv = Math.max(0.005, Math.min(0.995, px / pw))
        const lv = forY === 1 ? -Math.log(pv) : -Math.log(1 - pv)
        const clamp = Math.min(lv, maxLoss)
        if (px === 0) ctx.moveTo(pad.l + px, yOf(clamp))
        else ctx.lineTo(pad.l + px, yOf(clamp))
      }
      ctx.stroke()
      ctx.globalAlpha = 1
      // Label
      if (bold) {
        ctx.fillStyle = color
        ctx.font = '500 11px sans-serif'
        ctx.textAlign = forY === 1 ? 'right' : 'left'
        const lx = forY === 1 ? pad.l + pw * 0.15 : pad.l + pw * 0.85
        ctx.fillText(forY === 1 ? '\u2212log(p)  [y=1]' : '\u2212log(1\u2212p)  [y=0]', lx, pad.t + 16)
      }
    }
    drawLossCurve(1, c.blue, actualY === 1)
    drawLossCurve(0, c.amber, actualY === 0)

    // Current point
    const clampLoss = Math.min(curLoss, maxLoss)
    const cx = xOf(predP)
    const cy = yOf(clampLoss)
    const col = actualY === 1 ? c.blue : c.amber

    // Vertical dashed line
    ctx.setLineDash([4, 4])
    ctx.strokeStyle = col
    ctx.lineWidth = 1
    ctx.globalAlpha = 0.4
    ctx.beginPath()
    ctx.moveTo(cx, yOf(0))
    ctx.lineTo(cx, cy)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.globalAlpha = 1

    // Dot
    ctx.fillStyle = col
    ctx.beginPath()
    ctx.arc(cx, cy, 7, 0, Math.PI * 2)
    ctx.fill()

    // Loss value label
    ctx.fillStyle = c.text
    ctx.font = '500 12px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(curLoss.toFixed(3), cx + 12, cy + 4)

    // p axis labels
    ctx.fillStyle = c.subtext
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'center'
    for (const v of [0, 0.25, 0.5, 0.75, 1]) {
      ctx.fillText(v.toFixed(2), xOf(v), H - pad.b + 14)
    }
  }, [actualY, predP, curLoss])

  useEffect(() => { draw() }, [draw])
  useDarkModeObserver(draw)
  useCanvasResize(canvasRef, draw)

  // Insight text
  let insight: React.ReactNode
  if (actualY === 1) {
    if (predP >= 0.9) {
      insight = (
        <>
          <strong>Good prediction.</strong> Model says p={predP.toFixed(2)} for a true positive {'\u2014'} loss is
          only {curLoss.toFixed(3)}. The {'\u2212'}log curve barely penalizes confident correct answers.
        </>
      )
    } else if (predP >= 0.5) {
      insight = (
        <>
          <strong>Tepid prediction.</strong> Model says p={predP.toFixed(2)} for a true positive {'\u2014'} correct
          side of 0.5, but not confident. Loss = {curLoss.toFixed(3)}. More confidence would help.
        </>
      )
    } else if (predP >= 0.2) {
      insight = (
        <>
          <strong>Wrong and somewhat confident.</strong> Model says p={predP.toFixed(2)} for a true positive {'\u2014'} it
          thinks this is probably negative. Loss = {curLoss.toFixed(3)}.
        </>
      )
    } else {
      insight = (
        <>
          <strong>Catastrophically wrong!</strong> Model says p={predP.toFixed(2)} for a true positive {'\u2014'} extremely
          confident in the wrong answer. Loss = {curLoss.toFixed(3)}. This is why {'\u2212'}log explodes near 0: confident
          wrong predictions are severely punished. Drag p toward 0.01 to see it approach infinity.
        </>
      )
    }
  } else {
    if (predP <= 0.1) {
      insight = (
        <>
          <strong>Good prediction.</strong> Model says p={predP.toFixed(2)} for a true negative {'\u2014'} loss is
          only {curLoss.toFixed(3)}.
        </>
      )
    } else if (predP <= 0.5) {
      insight = (
        <>
          <strong>Correct but not confident.</strong> Loss = {curLoss.toFixed(3)}.
        </>
      )
    } else if (predP <= 0.8) {
      insight = (
        <>
          <strong>Wrong.</strong> Model says p={predP.toFixed(2)} for a true negative. Loss = {curLoss.toFixed(3)}.
        </>
      )
    } else {
      insight = (
        <>
          <strong>Catastrophically wrong!</strong> Model says p={predP.toFixed(2)} for a true negative.
          Loss = {curLoss.toFixed(3)}. The {'\u2212'}log(1{'\u2212'}p) curve explodes as p{'\u2192'}1.
        </>
      )
    }
  }

  // Loss color class
  const lossColorClass = curLoss > 1 ? METRIC_COLORS.red : curLoss > 0.3 ? METRIC_COLORS.amber : METRIC_COLORS.green

  return (
    <section
      ref={sectionRef as React.RefObject<HTMLElement>}
      aria-labelledby="ll-log-loss"
      className={`py-8 transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <h2
        id="ll-log-loss"
        className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl text-ink dark:text-night-text mb-3"
      >
        Log Loss
      </h2>
      <p className="text-sm text-ink-subtle dark:text-night-muted mb-5 leading-relaxed">
        Log loss = {'\u2212'}log(p) when actual = 1, or {'\u2212'}log(1{'\u2212'}p) when actual = 0. Drag the predicted
        probability to see how the penalty grows {'\u2014'} confident wrong predictions are CATASTROPHICALLY expensive.
      </p>

      {/* y toggle */}
      <div className="flex gap-1.5 mb-3">
        <button
          type="button"
          onClick={() => setActualY(1)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium border transition-colors ${
            actualY === 1
              ? 'border-sapphire/30 dark:border-sapphire-dark/30 bg-sapphire/10 dark:bg-sapphire-dark/10 text-sapphire dark:text-sapphire-dark font-semibold'
              : 'border-cream-border dark:border-night-border text-ink-subtle dark:text-night-muted hover:bg-cream-dark/60 dark:hover:bg-night-card/60'
          }`}
        >
          Actual = 1 (positive)
        </button>
        <button
          type="button"
          onClick={() => setActualY(0)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium border transition-colors ${
            actualY === 0
              ? 'border-sapphire/30 dark:border-sapphire-dark/30 bg-sapphire/10 dark:bg-sapphire-dark/10 text-sapphire dark:text-sapphire-dark font-semibold'
              : 'border-cream-border dark:border-night-border text-ink-subtle dark:text-night-muted hover:bg-cream-dark/60 dark:hover:bg-night-card/60'
          }`}
        >
          Actual = 0 (negative)
        </button>
      </div>

      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Log loss curve showing penalty for predicted probability with current position highlighted"
        className="w-full rounded-lg"
        style={{ height: 280 }}
      />

      <div className="flex items-center gap-3 mt-2 mb-2">
        <label
          htmlFor="ll-p-slider"
          className="text-sm text-ink-subtle dark:text-night-muted min-w-[90px]"
        >
          Predicted p
        </label>
        <input
          id="ll-p-slider"
          type="range"
          min={0.01}
          max={0.99}
          step={0.01}
          value={predP}
          onChange={(e) => setPredP(parseFloat(e.target.value))}
          aria-valuetext={`p = ${predP.toFixed(2)}`}
          className="flex-1"
        />
        <span className="font-[family-name:var(--font-mono)] text-sm font-medium min-w-[44px] text-right text-ink dark:text-night-text">
          {predP.toFixed(2)}
        </span>
      </div>

      <div className="flex gap-2.5 flex-wrap my-2.5">
        <MetricCard label="Actual label" value={String(actualY)} />
        <MetricCard label="Predicted p" value={predP.toFixed(2)} colorClass={actualY === 1 ? METRIC_COLORS.blue : METRIC_COLORS.amber} />
        <MetricCard label="Log loss" value={curLoss.toFixed(3)} colorClass={lossColorClass} />
        <MetricCard label="Verdict" value={rightWrong ? 'Correct' : 'Wrong'} colorClass={rightWrong ? METRIC_COLORS.green : METRIC_COLORS.red} />
      </div>

      <InsightBox>{insight}</InsightBox>
    </section>
  )
}

// ======================================================================
// SECTION 3: Entropy & Gini
// ======================================================================
function Section3() {
  const [sectionRef, visible] = useScrollReveal()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [pClass1, setPClass1] = useState(0.5)

  const entropy = pClass1 > 0.001 && pClass1 < 0.999
    ? -pClass1 * Math.log2(pClass1) - (1 - pClass1) * Math.log2(1 - pClass1)
    : 0
  const gini = 1 - pClass1 * pClass1 - (1 - pClass1) * (1 - pClass1)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const result = setupCanvas(canvas, 260)
    if (!result) return
    const { ctx, W, H } = result
    const c = getThemeColors()

    const pad = { l: 50, r: 20, t: 20, b: 40 }
    const pw = W - pad.l - pad.r
    const ph = H - pad.t - pad.b
    const xOf = (v: number) => pad.l + v * pw
    const yOf = (v: number) => pad.t + (1 - v / 1.1) * ph

    // Grid
    ctx.strokeStyle = c.grid
    ctx.lineWidth = 0.5
    for (let v = 0; v <= 1; v += 0.25) {
      ctx.beginPath()
      ctx.moveTo(pad.l, yOf(v))
      ctx.lineTo(W - pad.r, yOf(v))
      ctx.stroke()
      ctx.fillStyle = c.subtext
      ctx.font = '11px sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText(v.toFixed(2), pad.l - 6, yOf(v) + 4)
    }

    // Axes
    ctx.strokeStyle = c.axis
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(pad.l, pad.t)
    ctx.lineTo(pad.l, H - pad.b)
    ctx.lineTo(W - pad.r, H - pad.b)
    ctx.stroke()
    ctx.fillStyle = c.subtext
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('P(class 1)', W / 2, H - 6)
    ctx.save()
    ctx.translate(14, H / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText('Entropy / Gini', 0, 0)
    ctx.restore()

    // Entropy curve
    ctx.strokeStyle = c.purple
    ctx.lineWidth = 2.5
    ctx.beginPath()
    for (let px = 0; px <= pw; px++) {
      const pv = Math.max(0.005, Math.min(0.995, px / pw))
      const ent = -pv * Math.log2(pv) - (1 - pv) * Math.log2(1 - pv)
      if (px === 0) ctx.moveTo(pad.l + px, yOf(ent))
      else ctx.lineTo(pad.l + px, yOf(ent))
    }
    ctx.stroke()

    // Gini curve
    ctx.strokeStyle = c.amber
    ctx.lineWidth = 2
    ctx.setLineDash([6, 4])
    ctx.beginPath()
    for (let px = 0; px <= pw; px++) {
      const pv = px / pw
      const g = 1 - pv * pv - (1 - pv) * (1 - pv)
      if (px === 0) ctx.moveTo(pad.l + px, yOf(g))
      else ctx.lineTo(pad.l + px, yOf(g))
    }
    ctx.stroke()
    ctx.setLineDash([])

    // Labels
    ctx.font = '500 11px sans-serif'
    ctx.fillStyle = c.purple
    ctx.textAlign = 'left'
    ctx.fillText('Entropy (log\u2082)', pad.l + pw * 0.55, yOf(0.98) + 14)
    ctx.fillStyle = c.amber
    ctx.fillText('Gini index', pad.l + pw * 0.55, yOf(0.98) + 28)

    // Current position vertical line
    const cx = xOf(pClass1)
    ctx.setLineDash([4, 4])
    ctx.strokeStyle = c.subtext
    ctx.lineWidth = 1
    ctx.globalAlpha = 0.4
    ctx.beginPath()
    ctx.moveTo(cx, pad.t)
    ctx.lineTo(cx, H - pad.b)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.globalAlpha = 1

    // Current dots
    ctx.fillStyle = c.purple
    ctx.beginPath()
    ctx.arc(cx, yOf(entropy), 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = c.amber
    ctx.beginPath()
    ctx.arc(cx, yOf(gini), 5, 0, Math.PI * 2)
    ctx.fill()

    // p axis labels
    ctx.fillStyle = c.subtext
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'center'
    for (const v of [0, 0.25, 0.5, 0.75, 1]) {
      ctx.fillText(v.toFixed(2), xOf(v), H - pad.b + 14)
    }
  }, [pClass1, entropy, gini])

  useEffect(() => { draw() }, [draw])
  useDarkModeObserver(draw)
  useCanvasResize(canvasRef, draw)

  // Insight text
  let insight: React.ReactNode
  if (Math.abs(pClass1 - 0.5) < 0.05) {
    insight = (
      <>
        <strong>Maximum uncertainty.</strong> Near 50/50 {'\u2014'} both entropy ({entropy.toFixed(2)}) and
        Gini ({gini.toFixed(2)}) are at their peaks. A decision tree split here would try to create purer children
        to reduce this impurity.
      </>
    )
  } else if (pClass1 < 0.15 || pClass1 > 0.85) {
    insight = (
      <>
        <strong>Low uncertainty.</strong> One class dominates ({(Math.max(pClass1, 1 - pClass1) * 100).toFixed(0)}%).
        Entropy = {entropy.toFixed(3)}, Gini = {gini.toFixed(3)} {'\u2014'} both near zero. This is what a
        {'\u201C'}pure{'\u201D'} node looks like in a decision tree.
      </>
    )
  } else {
    insight = (
      <>
        Entropy = {entropy.toFixed(3)}, Gini = {gini.toFixed(3)}. Both measure impurity but on different scales {'\u2014'}
        {' '}entropy maxes at 1.0, Gini maxes at 0.5 for binary. They always agree on which split is better, just with
        different numbers.
      </>
    )
  }

  return (
    <section
      ref={sectionRef as React.RefObject<HTMLElement>}
      aria-labelledby="ll-entropy-gini"
      className={`py-8 transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <h2
        id="ll-entropy-gini"
        className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl text-ink dark:text-night-text mb-3"
      >
        Entropy {'&'} Gini
      </h2>
      <p className="text-sm text-ink-subtle dark:text-night-muted mb-5 leading-relaxed">
        Binary entropy measures uncertainty. A 50/50 split = maximum uncertainty. As one class dominates, uncertainty drops.
        You already know this from decision trees {'\u2014'} entropy is the impurity measure!
      </p>

      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Dual curves showing binary entropy and Gini index as a function of class probability"
        className="w-full rounded-lg"
        style={{ height: 260 }}
      />

      <div className="flex items-center gap-3 mt-2 mb-2">
        <label
          htmlFor="ll-pclass-slider"
          className="text-sm text-ink-subtle dark:text-night-muted min-w-[90px]"
        >
          P(class 1)
        </label>
        <input
          id="ll-pclass-slider"
          type="range"
          min={0.01}
          max={0.99}
          step={0.01}
          value={pClass1}
          onChange={(e) => setPClass1(parseFloat(e.target.value))}
          aria-valuetext={`P(class 1) = ${pClass1.toFixed(2)}`}
          className="flex-1"
        />
        <span className="font-[family-name:var(--font-mono)] text-sm font-medium min-w-[44px] text-right text-ink dark:text-night-text">
          {pClass1.toFixed(2)}
        </span>
      </div>

      <div className="flex gap-2.5 flex-wrap my-2.5">
        <MetricCard label="P(class 1)" value={pClass1.toFixed(2)} />
        <MetricCard label="P(class 0)" value={(1 - pClass1).toFixed(2)} />
        <MetricCard label="Entropy" value={entropy.toFixed(3)} colorClass={METRIC_COLORS.purple} />
        <MetricCard label="Gini" value={gini.toFixed(3)} colorClass={METRIC_COLORS.amber} />
      </div>

      <InsightBox>{insight}</InsightBox>
    </section>
  )
}

// ======================================================================
// SECTION 4: The Unified Connection
// ======================================================================
function Section4() {
  const [sectionRef, visible] = useScrollReveal()

  const chain: Array<{ title: string; sub: string; colorClass: string }> = [
    { title: 'Logistic regression MLE', sub: 'Maximizes P(data | coefficients)', colorClass: 'border-sapphire dark:border-sapphire-dark text-sapphire dark:text-sapphire-dark' },
    { title: 'Minimizing log loss', sub: '\u2212(1/N) \u03A3[ y\u00B7log(p) + (1\u2212y)\u00B7log(1\u2212p) ]', colorClass: 'border-green-600 dark:border-green-400 text-green-600 dark:text-green-400' },
    { title: 'Binary cross-entropy', sub: 'H(q,p) = \u2212\u03A3 q(y)\u00B7log(p(y))', colorClass: 'border-mauve dark:border-mauve-dark text-mauve dark:text-mauve-dark' },
    { title: "XGBoost's default classification loss", sub: 'objective = "binary:logistic"', colorClass: 'border-amber-600 dark:border-amber-300 text-amber-600 dark:text-amber-300' },
    { title: 'Pseudo-residuals', sub: 'y \u2212 p (actual minus predicted probability)', colorClass: 'border-red-600 dark:border-red-400 text-red-600 dark:text-red-400' },
    { title: 'Each tree = one gradient descent step', sub: 'In function space, minimizing the same loss', colorClass: 'border-ink-subtle dark:border-night-muted text-ink-subtle dark:text-night-muted' },
  ]

  const arrows = [
    'is equivalent to',
    'which IS',
    'which is also',
    'whose gradients are the',
    'which gradient boosting fits trees to',
  ]

  const tableRows: Array<{ name: string; context: string; formula: string; colorClass: string }> = [
    { name: 'Log loss', context: 'Logistic regression evaluation metric', formula: '\u2212(1/N) \u03A3[ y\u00B7log(p) + (1\u2212y)\u00B7log(1\u2212p) ]', colorClass: 'text-green-600 dark:text-green-400' },
    { name: 'Binary cross-entropy', context: 'Information theory name', formula: 'Same formula', colorClass: 'text-mauve dark:text-mauve-dark' },
    { name: 'Negative log-likelihood', context: 'MLE objective (what logistic regression maximizes)', formula: 'Same formula (with sign flip)', colorClass: 'text-sapphire dark:text-sapphire-dark' },
  ]

  return (
    <section
      ref={sectionRef as React.RefObject<HTMLElement>}
      aria-labelledby="ll-unified-connection"
      className={`py-8 transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <h2
        id="ll-unified-connection"
        className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl text-ink dark:text-night-text mb-3"
      >
        The Unified Connection
      </h2>
      <p className="text-[15px] text-ink-subtle dark:text-night-muted leading-relaxed mb-4">
        One formula runs through the entire course. Every connection below is something you{'\u2019'}ve already seen {'\u2014'}{' '}
        this just makes the chain explicit.
      </p>

      {/* Chain visualization */}
      <div className="relative py-4 mb-6">
        {chain.map((node, idx) => (
          <div key={idx}>
            <div className={`border-l-[3px] ${node.colorClass} rounded-r-lg bg-cream-dark/60 dark:bg-night-card/60 px-3.5 py-2.5 mb-1`}>
              <div className={`text-[13px] font-medium ${node.colorClass}`}>
                {node.title}
              </div>
              <div className="text-[12px] text-ink-subtle dark:text-night-muted font-[family-name:var(--font-mono)] mt-0.5">
                {node.sub}
              </div>
            </div>
            {idx < arrows.length && (
              <div className="pl-5 py-0.5 text-[13px] text-ink-faint dark:text-night-muted">
                {'\u2193'} {arrows[idx]}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Three names, one formula */}
      <div className="rounded-xl bg-cream-dark/60 dark:bg-night-card/60 border border-cream-border dark:border-night-border px-4 py-4 mb-4">
        <p className="text-[13px] font-medium text-ink dark:text-night-text mb-3">
          Three names, one formula
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr>
                <th className="text-left py-1.5 px-2 text-[12px] font-medium text-ink-subtle dark:text-night-muted border-b border-cream-border dark:border-night-border">
                  Name
                </th>
                <th className="text-left py-1.5 px-2 text-[12px] font-medium text-ink-subtle dark:text-night-muted border-b border-cream-border dark:border-night-border">
                  Context
                </th>
                <th className="text-left py-1.5 px-2 text-[12px] font-medium text-ink-subtle dark:text-night-muted border-b border-cream-border dark:border-night-border">
                  Formula
                </th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, idx) => (
                <tr key={idx}>
                  <td className={`py-1.5 px-2 font-medium border-b border-cream-border/50 dark:border-night-border/50 ${row.colorClass}`}>
                    {row.name}
                  </td>
                  <td className="py-1.5 px-2 text-[12px] text-ink-subtle dark:text-night-muted border-b border-cream-border/50 dark:border-night-border/50">
                    {row.context}
                  </td>
                  <td className="py-1.5 px-2 font-[family-name:var(--font-mono)] text-[12px] border-b border-cream-border/50 dark:border-night-border/50">
                    {row.formula}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* KL Divergence insight */}
      <InsightBox>
        <strong>KL divergence</strong> = cross-entropy {'\u2212'} entropy. Since the true label entropy is constant,
        minimizing cross-entropy = minimizing KL divergence. KL is always {'\u2265'} 0, equals 0 only when p = q, and
        is NOT symmetric (KL(q,p) {'\u2260'} KL(p,q)).
      </InsightBox>

      {/* Entropy connects decision trees */}
      <WarnBox>
        <strong>Entropy connects decision trees to logistic regression.</strong> In decision trees, entropy measures
        node <strong>impurity</strong> {'\u2014'} how mixed the classes are. In logistic regression, cross-entropy
        measures prediction <strong>quality</strong> {'\u2014'} how well your probabilities match reality. Same math,
        different applications. Both are minimized when predictions are pure/correct.
      </WarnBox>
    </section>
  )
}

// ======================================================================
// MAIN EXPORT
// ======================================================================
export function LogLossCrossEntropy() {
  return (
    <div className="mx-auto max-w-5xl px-6 sm:px-10 lg:px-12">
      {/* Title */}
      <div className="text-center mb-16">
        <p className="font-[family-name:var(--font-mono)] text-[13px] tracking-[0.3em] uppercase mb-4 text-peach dark:text-peach-dark">
          02/
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl text-ink dark:text-night-text mb-4">
          Log Loss {'&'} Cross-Entropy
        </h1>
        <p className="text-[15px] text-ink-subtle dark:text-night-muted">
          4 concepts {'\u00B7'} Drag sliders and explore the unified connection
        </p>
        <div className="mt-4 h-px w-16 mx-auto bg-mauve dark:bg-mauve-dark" />
      </div>

      {/* Section 1 */}
      <Section1 />

      <div className="py-12 [&>div]:mb-0">
        <SectionDivider absolute={false} />
      </div>

      {/* Section 2 */}
      <Section2 />

      <div className="py-12 [&>div]:mb-0">
        <SectionDivider absolute={false} />
      </div>

      {/* Section 3 */}
      <Section3 />

      <div className="py-12 [&>div]:mb-0">
        <SectionDivider absolute={false} />
      </div>

      {/* Section 4 */}
      <Section4 />
    </div>
  )
}
