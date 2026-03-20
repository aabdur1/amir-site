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
    blue: isDark ? '#74c7ec' : '#209fb5',
    red: isDark ? '#f38ba8' : '#d20f39',
    green: isDark ? '#a6e3a1' : '#40a02b',
    amber: isDark ? '#f9e2af' : '#df8e1d',
    purple: isDark ? '#cba6f7' : '#8839ef',
    isDark,
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
    <div className="rounded-lg bg-amber-100/60 dark:bg-amber-900/20 px-4 py-3 text-sm leading-relaxed text-amber-700 dark:text-amber-300">
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

// --- Math helpers ---

// Box-Muller transform for Gaussian random numbers
function rng(): number {
  let u = 0, v = 0
  while (!u) u = Math.random()
  while (!v) v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

// Generate correlated 2D data
function genCorr(n: number, corr: number): [number, number][] {
  const pts: [number, number][] = []
  for (let i = 0; i < n; i++) {
    const x = rng()
    const y = corr * x + Math.sqrt(1 - corr * corr) * rng()
    pts.push([x, y])
  }
  return pts
}

// Analytical 2D PCA (2x2 symmetric matrix eigendecomposition)
function pca2d(pts: [number, number][]) {
  const n = pts.length
  const mx = pts.reduce((s, p) => s + p[0], 0) / n
  const my = pts.reduce((s, p) => s + p[1], 0) / n
  let cxx = 0, cyy = 0, cxy = 0
  pts.forEach(p => {
    const dx = p[0] - mx, dy = p[1] - my
    cxx += dx * dx
    cyy += dy * dy
    cxy += dx * dy
  })
  cxx /= n
  cyy /= n
  cxy /= n

  // Eigenvalues of 2x2 symmetric matrix [[cxx, cxy], [cxy, cyy]]
  const trace = cxx + cyy
  const det = cxx * cyy - cxy * cxy
  const disc = Math.sqrt(Math.max(0, trace * trace / 4 - det))
  const e1 = trace / 2 + disc
  const e2 = trace / 2 - disc

  // Eigenvectors
  let v1: [number, number], v2: [number, number]
  if (Math.abs(cxy) > 1e-10) {
    v1 = [cxy, e1 - cxx]
    v2 = [cxy, e2 - cxx]
  } else {
    v1 = cxx >= cyy ? [1, 0] : [0, 1]
    v2 = cxx >= cyy ? [0, 1] : [1, 0]
  }

  // Normalize
  const norm1 = Math.sqrt(v1[0] ** 2 + v1[1] ** 2)
  const norm2 = Math.sqrt(v2[0] ** 2 + v2[1] ** 2)
  v1 = [v1[0] / norm1, v1[1] / norm1]
  v2 = [v2[0] / norm2, v2[1] / norm2]

  return {
    mean: [mx, my] as [number, number],
    eigenvalues: [e1, e2] as [number, number],
    eigenvectors: [v1, v2] as [[number, number], [number, number]],
    totalVar: cxx + cyy,
  }
}

// Generate synthetic eigenvalue percentages for scree plot
function genEigenvalues(d: number): number[] {
  const vals: number[] = []
  let total = 0
  for (let i = 0; i < d; i++) {
    const v = Math.exp(-i * 0.5) * (1 + Math.random() * 0.3)
    vals.push(v)
    total += v
  }
  return vals.map(v => v / total * 100)
}


// ======================================================================
// SECTION 1: What PCA Finds
// ======================================================================
function Section1() {
  const [sectionRef, visible] = useScrollReveal()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [corr, setCorr] = useState(0.85)
  const [pts, setPts] = useState<[number, number][]>(() => genCorr(120, 0.85))
  const [showPC, setShowPC] = useState(true)

  const resample = useCallback(() => {
    setPts(genCorr(120, corr))
  }, [corr])

  const pca = pca2d(pts)
  const varExplained1 = pca.eigenvalues[0] / pca.totalVar * 100
  const varExplained2 = pca.eigenvalues[1] / pca.totalVar * 100

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const result = setupCanvas(canvas, 360)
    if (!result) return
    const { ctx, W, H } = result
    const c = getThemeColors()

    const pad = { l: 40, r: 20, t: 20, b: 36 }
    const pw = W - pad.l - pad.r
    const ph = H - pad.t - pad.b

    // Compute data range
    const allX = pts.map(p => p[0])
    const allY = pts.map(p => p[1])
    const xMin = Math.min(...allX) - 0.3
    const xMax = Math.max(...allX) + 0.3
    const yMin = Math.min(...allY) - 0.3
    const yMax = Math.max(...allY) + 0.3
    const range = Math.max(xMax - xMin, yMax - yMin)
    const xMid = (xMin + xMax) / 2
    const yMid = (yMin + yMax) / 2
    const xOf = (v: number) => pad.l + ((v - (xMid - range / 2)) / range) * pw
    const yOf = (v: number) => pad.t + (1 - ((v - (yMid - range / 2)) / range)) * ph

    // Grid lines at origin
    ctx.strokeStyle = c.grid
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(xOf(xMid - range / 2), yOf(0))
    ctx.lineTo(xOf(xMid + range / 2), yOf(0))
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(xOf(0), yOf(yMid - range / 2))
    ctx.lineTo(xOf(0), yOf(yMid + range / 2))
    ctx.stroke()

    // Axes
    ctx.strokeStyle = c.axis
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(pad.l, pad.t)
    ctx.lineTo(pad.l, H - pad.b)
    ctx.lineTo(W - pad.r, H - pad.b)
    ctx.stroke()

    // Axis labels
    ctx.fillStyle = c.subtext
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Variable 1', W / 2, H - 6)
    ctx.save()
    ctx.translate(14, H / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText('Variable 2', 0, 0)
    ctx.restore()

    // Points
    pts.forEach(p => {
      ctx.fillStyle = c.isDark ? 'rgba(133,183,235,0.5)' : 'rgba(59,139,212,0.4)'
      ctx.beginPath()
      ctx.arc(xOf(p[0]), yOf(p[1]), 3.5, 0, Math.PI * 2)
      ctx.fill()
    })

    // PCA overlay
    if (showPC) {
      const scale = range * 0.45

      // PC1 arrow
      const pc1x = pca.eigenvectors[0][0] * scale
      const pc1y = pca.eigenvectors[0][1] * scale
      ctx.strokeStyle = c.red
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(xOf(pca.mean[0] - pc1x), yOf(pca.mean[1] - pc1y))
      ctx.lineTo(xOf(pca.mean[0] + pc1x), yOf(pca.mean[1] + pc1y))
      ctx.stroke()
      ctx.fillStyle = c.red
      ctx.font = '500 13px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(
        `PC1 (${varExplained1.toFixed(1)}%)`,
        xOf(pca.mean[0] + pc1x) + 6,
        yOf(pca.mean[1] + pc1y) - 4
      )

      // PC2 arrow
      const pc2x = pca.eigenvectors[1][0] * scale * 0.5
      const pc2y = pca.eigenvectors[1][1] * scale * 0.5
      ctx.strokeStyle = c.green
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(xOf(pca.mean[0] - pc2x), yOf(pca.mean[1] - pc2y))
      ctx.lineTo(xOf(pca.mean[0] + pc2x), yOf(pca.mean[1] + pc2y))
      ctx.stroke()
      ctx.fillStyle = c.green
      ctx.font = '500 12px sans-serif'
      ctx.fillText(
        `PC2 (${varExplained2.toFixed(1)}%)`,
        xOf(pca.mean[0] + pc2x) + 6,
        yOf(pca.mean[1] + pc2y) + 12
      )

      // Projection dashes onto PC1 for first 20 points
      ctx.globalAlpha = 0.2
      ctx.strokeStyle = c.red
      ctx.lineWidth = 0.5
      ctx.setLineDash([3, 3])
      for (let i = 0; i < Math.min(20, pts.length); i++) {
        const p = pts[i]
        const dx = p[0] - pca.mean[0]
        const dy = p[1] - pca.mean[1]
        const proj = dx * pca.eigenvectors[0][0] + dy * pca.eigenvectors[0][1]
        const px = pca.mean[0] + proj * pca.eigenvectors[0][0]
        const py = pca.mean[1] + proj * pca.eigenvectors[0][1]
        ctx.beginPath()
        ctx.moveTo(xOf(p[0]), yOf(p[1]))
        ctx.lineTo(xOf(px), yOf(py))
        ctx.stroke()
      }
      ctx.setLineDash([])
      ctx.globalAlpha = 1
    }
  }, [pts, showPC, pca, varExplained1, varExplained2])

  useEffect(() => { draw() }, [draw])
  useDarkModeObserver(draw)
  useCanvasResize(canvasRef, draw)

  // Insight text
  let insight: React.ReactNode
  if (corr > 0.8) {
    insight = (
      <>
        <strong>High correlation ({corr.toFixed(2)}):</strong> The cloud is very elongated.
        PC1 captures {varExplained1.toFixed(0)}% of variance — you could drop PC2 and barely lose information.
        This is when PCA compression works best. The dashed lines show how each point projects onto PC1.
      </>
    )
  } else if (corr > 0.4) {
    insight = (
      <>
        <strong>Moderate correlation ({corr.toFixed(2)}):</strong> The cloud is somewhat elongated.
        PC1 captures {varExplained1.toFixed(0)}%. You{"'"}d lose more by dropping PC2, but PC1 still dominates.
      </>
    )
  } else {
    insight = (
      <>
        <strong>Low correlation ({corr.toFixed(2)}):</strong> The cloud is nearly circular.
        PC1 and PC2 capture similar amounts ({varExplained1.toFixed(0)}% vs {varExplained2.toFixed(0)}%).
        Dropping either would lose substantial information — PCA doesn{"'"}t help much when variables are independent.
      </>
    )
  }

  return (
    <section
      ref={sectionRef as React.RefObject<HTMLElement>}
      aria-labelledby="pca-what-finds"
      className={`py-8 transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <h2
        id="pca-what-finds"
        className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl text-ink dark:text-night-text mb-3"
      >
        What PCA Finds
      </h2>
      <p className="text-sm text-ink-subtle dark:text-night-muted mb-5 leading-relaxed">
        Drag the correlation slider to change how elongated the data cloud is. PCA finds the axes of this ellipse.
        When correlation is high, PC1 captures almost everything — that{"'"}s when dimensionality reduction works best.
      </p>

      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Interactive scatter plot showing correlated 2D data with principal component axes overlay"
        className="w-full rounded-lg"
        style={{ height: 360 }}
      />

      <div className="flex items-center gap-3 mt-2 mb-2">
        <label
          htmlFor="pca-corr-slider"
          className="text-sm text-ink-subtle dark:text-night-muted min-w-[90px]"
        >
          Correlation
        </label>
        <input
          id="pca-corr-slider"
          type="range"
          min={0}
          max={0.98}
          step={0.02}
          value={corr}
          onChange={(e) => {
            const v = parseFloat(e.target.value)
            setCorr(v)
            setPts(genCorr(120, v))
          }}
          aria-valuetext={`correlation = ${corr.toFixed(2)}`}
          className="flex-1"
        />
        <span className="font-[family-name:var(--font-mono)] text-sm font-medium min-w-[44px] text-right text-ink dark:text-night-text">
          {corr.toFixed(2)}
        </span>
      </div>

      <div className="flex gap-1.5 flex-wrap my-2">
        <button
          type="button"
          onClick={() => setShowPC(prev => !prev)}
          className="px-4 py-1.5 rounded-lg text-[13px] font-medium border border-sapphire/30 dark:border-sapphire-dark/30
            bg-sapphire/10 dark:bg-sapphire-dark/10 text-sapphire dark:text-sapphire-dark
            hover:bg-sapphire/20 dark:hover:bg-sapphire-dark/20 transition-colors"
        >
          {showPC ? 'Hide' : 'Show'} PC axes
        </button>
        <button
          type="button"
          onClick={resample}
          className="px-4 py-1.5 rounded-lg text-[13px] font-medium border border-cream-border dark:border-night-border
            text-ink-subtle dark:text-night-muted hover:bg-cream-dark/60 dark:hover:bg-night-card/60 transition-colors"
        >
          Resample
        </button>
      </div>

      <div className="flex gap-2.5 flex-wrap my-2.5">
        <MetricCard label="Correlation" value={corr.toFixed(2)} />
        <MetricCard label="PC1 variance" value={`${varExplained1.toFixed(1)}%`} colorClass={METRIC_COLORS.red} />
        <MetricCard label="PC2 variance" value={`${varExplained2.toFixed(1)}%`} colorClass={METRIC_COLORS.green} />
        <MetricCard label="Total" value="100%" />
      </div>

      <InsightBox>{insight}</InsightBox>
    </section>
  )
}


// ======================================================================
// SECTION 2: How Many Components?
// ======================================================================
function Section2() {
  const [sectionRef, visible] = useScrollReveal()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dims, setDims] = useState(6)
  const [eigenvalues, setEigenvalues] = useState<number[]>(() => genEigenvalues(6))
  const [keep, setKeep] = useState(2)

  const retained = eigenvalues.slice(0, keep).reduce((s, v) => s + v, 0)
  const dropped = 100 - retained

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const result = setupCanvas(canvas, 280)
    if (!result) return
    const { ctx, W, H } = result
    const c = getThemeColors()

    const p = { l: 50, r: 50, t: 20, b: 36 }
    const pw = W - p.l - p.r
    const ph = H - p.t - p.b
    const d = eigenvalues.length
    const maxV = Math.max(...eigenvalues) * 1.15
    const xOf = (i: number) => p.l + (i + 0.5) / d * pw
    const yOf = (v: number) => p.t + (1 - v / maxV) * ph
    const yOfCum = (v: number) => p.t + (1 - v / 105) * ph

    // Left axis
    ctx.strokeStyle = c.axis
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(p.l, p.t)
    ctx.lineTo(p.l, H - p.b)
    ctx.lineTo(W - p.r, H - p.b)
    ctx.stroke()
    // Right axis for cumulative
    ctx.beginPath()
    ctx.moveTo(W - p.r, p.t)
    ctx.lineTo(W - p.r, H - p.b)
    ctx.stroke()

    // Axis labels
    ctx.fillStyle = c.subtext
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'center'
    for (let i = 0; i < d; i++) ctx.fillText(`PC${i + 1}`, xOf(i), H - p.b + 14)
    ctx.save()
    ctx.translate(14, H / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText('Variance %', 0, 0)
    ctx.restore()
    ctx.save()
    ctx.translate(W - 8, H / 2)
    ctx.rotate(Math.PI / 2)
    ctx.fillStyle = c.amber
    ctx.fillText('Cumulative %', 0, 0)
    ctx.restore()

    // 80% threshold line
    ctx.setLineDash([6, 4])
    ctx.strokeStyle = c.amber + '55'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(p.l, yOfCum(80))
    ctx.lineTo(W - p.r, yOfCum(80))
    ctx.stroke()
    ctx.fillStyle = c.amber
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('80% threshold', p.l + 4, yOfCum(80) - 4)
    ctx.setLineDash([])

    // Bars
    const barW = pw / d * 0.6
    eigenvalues.forEach((v, i) => {
      const x = xOf(i) - barW / 2
      const kept = i < keep
      const col = kept ? c.blue : c.subtext
      ctx.fillStyle = col
      ctx.globalAlpha = kept ? 0.7 : 0.25
      ctx.fillRect(x, yOf(v), barW, yOf(0) - yOf(v))
      ctx.globalAlpha = 1
      // Value label
      ctx.fillStyle = kept ? c.text : c.subtext
      ctx.font = '500 10px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(v.toFixed(1) + '%', xOf(i), yOf(v) - 6)
    })

    // Cumulative line
    let cumul = 0
    ctx.strokeStyle = c.amber
    ctx.lineWidth = 2
    ctx.beginPath()
    eigenvalues.forEach((v, i) => {
      cumul += v
      const y = yOfCum(cumul)
      if (i === 0) ctx.moveTo(xOf(i), y)
      else ctx.lineTo(xOf(i), y)
    })
    ctx.stroke()

    // Cumulative dots + labels
    cumul = 0
    eigenvalues.forEach((v, i) => {
      cumul += v
      ctx.fillStyle = i < keep ? c.amber : c.subtext
      ctx.globalAlpha = i < keep ? 1 : 0.4
      ctx.beginPath()
      ctx.arc(xOf(i), yOfCum(cumul), 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.font = '500 10px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(cumul.toFixed(1) + '%', xOf(i), yOfCum(cumul) - 8)
      ctx.globalAlpha = 1
    })

    // Keep boundary
    if (keep < d) {
      const bx = xOf(keep - 1) + barW / 2 + pw / d * 0.2
      ctx.setLineDash([4, 4])
      ctx.strokeStyle = c.red
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(bx, p.t)
      ctx.lineTo(bx, H - p.b)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = c.red
      ctx.font = '500 11px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText('keep \u2190', bx + 4, p.t + 14)
      ctx.fillStyle = c.subtext
      ctx.textAlign = 'right'
      ctx.fillText('\u2192 drop', bx - 4, p.t + 14)
    }
  }, [eigenvalues, keep])

  useEffect(() => { draw() }, [draw])
  useDarkModeObserver(draw)
  useCanvasResize(canvasRef, draw)

  // Insight text
  let insight: React.ReactNode
  if (retained > 90) {
    insight = (
      <>
        <strong>Excellent compression.</strong> Keeping {keep} of {dims} PCs retains {retained.toFixed(1)}% of variance.
        You compressed {dims} variables into {keep} and lost almost nothing.
      </>
    )
  } else if (retained > 75) {
    insight = (
      <>
        <strong>Good compression.</strong> {retained.toFixed(1)}% retained with {keep} PCs.
        The elbow in the scree plot (where bars level off) suggests this is near the sweet spot.
      </>
    )
  } else {
    insight = (
      <>
        <strong>Significant information loss.</strong> Only {retained.toFixed(1)}% retained.
        Consider keeping more PCs — you{"'"}re dropping {dropped.toFixed(1)}% of the variance.
        The 80% threshold line is a common minimum.
      </>
    )
  }

  return (
    <section
      ref={sectionRef as React.RefObject<HTMLElement>}
      aria-labelledby="pca-how-many"
      className={`py-8 transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <h2
        id="pca-how-many"
        className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl text-ink dark:text-night-text mb-3"
      >
        How Many Components?
      </h2>
      <p className="text-sm text-ink-subtle dark:text-night-muted mb-5 leading-relaxed">
        The scree plot shows how much variance each PC captures. The cumulative line shows the running total.
        Drag {'\u201C'}keep{'\u201D'} to see how much information you retain vs discard.
      </p>

      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Scree plot with bars for individual PC variance and cumulative variance line with 80% threshold"
        className="w-full rounded-lg"
        style={{ height: 280 }}
      />

      <div className="flex items-center gap-3 mt-2 mb-1">
        <label
          htmlFor="pca-dims-slider"
          className="text-sm text-ink-subtle dark:text-night-muted min-w-[90px]"
        >
          Dimensions
        </label>
        <input
          id="pca-dims-slider"
          type="range"
          min={4}
          max={10}
          step={1}
          value={dims}
          onChange={(e) => {
            const d = parseInt(e.target.value)
            setDims(d)
            const newEig = genEigenvalues(d)
            setEigenvalues(newEig)
            if (keep > d) setKeep(d)
          }}
          aria-valuetext={`${dims} dimensions`}
          className="flex-1"
        />
        <span className="font-[family-name:var(--font-mono)] text-sm font-medium min-w-[44px] text-right text-ink dark:text-night-text">
          {dims}
        </span>
      </div>

      <div className="flex items-center gap-3 mt-1 mb-2">
        <label
          htmlFor="pca-keep-slider"
          className="text-sm text-ink-subtle dark:text-night-muted min-w-[90px]"
        >
          Keep top k PCs
        </label>
        <input
          id="pca-keep-slider"
          type="range"
          min={1}
          max={dims}
          step={1}
          value={keep}
          onChange={(e) => setKeep(parseInt(e.target.value))}
          aria-valuetext={`keep ${keep} of ${dims} PCs`}
          className="flex-1"
        />
        <span className="font-[family-name:var(--font-mono)] text-sm font-medium min-w-[44px] text-right text-ink dark:text-night-text">
          {keep}
        </span>
      </div>

      <div className="flex gap-1.5 flex-wrap my-2">
        <button
          type="button"
          onClick={() => setEigenvalues(genEigenvalues(dims))}
          className="px-4 py-1.5 rounded-lg text-[13px] font-medium border border-cream-border dark:border-night-border
            text-ink-subtle dark:text-night-muted hover:bg-cream-dark/60 dark:hover:bg-night-card/60 transition-colors"
        >
          New eigenvalues
        </button>
      </div>

      <div className="flex gap-2.5 flex-wrap my-2.5">
        <MetricCard label="PCs kept" value={`${keep} of ${dims}`} colorClass={METRIC_COLORS.blue} />
        <MetricCard label="Variance retained" value={`${retained.toFixed(1)}%`} colorClass={METRIC_COLORS.green} />
        <MetricCard label="Variance dropped" value={`${dropped.toFixed(1)}%`} colorClass={METRIC_COLORS.red} />
        <MetricCard label="Compression" value={`${dims}\u2192${keep}`} />
      </div>

      <InsightBox>{insight}</InsightBox>
    </section>
  )
}


// ======================================================================
// SECTION 3: Why Standardize?
// ======================================================================
function Section3() {
  const [sectionRef, visible] = useScrollReveal()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [standardized, setStandardized] = useState(false)

  const rawVar = [55.5, 22.3, 14.8, 7.4]
  const stdVar = [27.7, 26.1, 24.5, 21.7]
  const vals = standardized ? stdVar : rawVar

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const result = setupCanvas(canvas, 200)
    if (!result) return
    const { ctx, W, H } = result
    const c = getThemeColors()

    const labels = ['Sodium (mg)', 'Fiber (g)', 'Sugar (g)', 'Protein (g)']
    const p = { l: 50, r: 20, t: 20, b: 40 }
    const pw = W - p.l - p.r
    const ph = H - p.t - p.b
    const maxV = 60
    const barW = pw / 4 * 0.6
    const xOf = (i: number) => p.l + (i + 0.5) / 4 * pw
    const yOf = (v: number) => p.t + (1 - v / maxV) * ph

    // Axes
    ctx.strokeStyle = c.axis
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(p.l, H - p.b)
    ctx.lineTo(W - p.r, H - p.b)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(p.l, p.t)
    ctx.lineTo(p.l, H - p.b)
    ctx.stroke()

    // Y-axis label
    ctx.fillStyle = c.subtext
    ctx.font = '11px sans-serif'
    ctx.save()
    ctx.translate(14, H / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.textAlign = 'center'
    ctx.fillText('PC1 loading %', 0, 0)
    ctx.restore()

    // Bars
    const colors = [c.red, c.green, c.amber, c.purple]
    vals.forEach((v, i) => {
      const x = xOf(i) - barW / 2
      ctx.fillStyle = colors[i]
      ctx.globalAlpha = 0.7
      ctx.fillRect(x, yOf(v), barW, yOf(0) - yOf(v))
      ctx.globalAlpha = 1
      // Value label
      ctx.fillStyle = c.text
      ctx.font = '500 11px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(v.toFixed(1) + '%', xOf(i), yOf(v) - 6)
      // X-axis label
      ctx.fillStyle = c.subtext
      ctx.font = '11px sans-serif'
      ctx.fillText(labels[i], xOf(i), H - p.b + 14)
    })
  }, [vals])

  useEffect(() => { draw() }, [draw])
  useDarkModeObserver(draw)
  useCanvasResize(canvasRef, draw)

  const insight: React.ReactNode = standardized ? (
    <>
      <strong>Standardized (cor=TRUE / scale=TRUE):</strong> All four variables contribute roughly equally to PC1.
      Now PCA captures the actual correlation structure, not scale differences.{' '}
      <strong>Always use scale=TRUE in prcomp()</strong> unless your variables are already on the same scale.
    </>
  ) : (
    <>
      <strong>Unstandardized (cor=FALSE):</strong> Sodium dominates PC1 at 55.5% — purely because it{"'"}s measured
      in milligrams (range 0{'\u2013'}2000) while others are in grams (range 0{'\u2013'}15). PC1 is basically
      just {'\u201C'}how much sodium.{'\u201D'} This is the trap — scale, not importance, drives the result.
    </>
  )

  return (
    <section
      ref={sectionRef as React.RefObject<HTMLElement>}
      aria-labelledby="pca-standardize"
      className={`py-8 transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <h2
        id="pca-standardize"
        className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl text-ink dark:text-night-text mb-3"
      >
        Why Standardize?
      </h2>
      <p className="text-sm text-ink-subtle dark:text-night-muted mb-5 leading-relaxed">
        Without standardization, the variable with the largest scale dominates PC1.
        Toggle to see how standardization fixes this.
      </p>

      <div className="flex gap-1.5 flex-wrap mb-3">
        <button
          type="button"
          onClick={() => setStandardized(false)}
          className={`px-4 py-1.5 rounded-lg text-[13px] font-medium border transition-colors ${
            !standardized
              ? 'border-sapphire/30 dark:border-sapphire-dark/30 bg-sapphire/10 dark:bg-sapphire-dark/10 text-sapphire dark:text-sapphire-dark font-semibold'
              : 'border-cream-border dark:border-night-border text-ink-subtle dark:text-night-muted hover:bg-cream-dark/60 dark:hover:bg-night-card/60'
          }`}
        >
          Raw (unstandardized)
        </button>
        <button
          type="button"
          onClick={() => setStandardized(true)}
          className={`px-4 py-1.5 rounded-lg text-[13px] font-medium border transition-colors ${
            standardized
              ? 'border-sapphire/30 dark:border-sapphire-dark/30 bg-sapphire/10 dark:bg-sapphire-dark/10 text-sapphire dark:text-sapphire-dark font-semibold'
              : 'border-cream-border dark:border-night-border text-ink-subtle dark:text-night-muted hover:bg-cream-dark/60 dark:hover:bg-night-card/60'
          }`}
        >
          Standardized (scale=TRUE)
        </button>
      </div>

      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`Bar chart showing PC1 loadings ${standardized ? 'after standardization — balanced across all variables' : 'without standardization — sodium dominates'}`}
        className="w-full rounded-lg"
        style={{ height: 200 }}
      />

      <div className="flex gap-2.5 flex-wrap my-2.5">
        <MetricCard label="Mode" value={standardized ? 'cor=TRUE' : 'cor=FALSE'} />
        <MetricCard
          label="PC1 = mostly"
          value={standardized ? 'All variables' : 'Sodium!'}
          colorClass={standardized ? METRIC_COLORS.blue : METRIC_COLORS.red}
        />
      </div>

      <InsightBox>{insight}</InsightBox>
    </section>
  )
}


// ======================================================================
// SECTION 4: PC Score Calculator
// ======================================================================
function Section4() {
  const [sectionRef, visible] = useScrollReveal()
  const [w1, setW1] = useState(-0.847)
  const [w2, setW2] = useState(0.532)
  const [x1, setX1] = useState(70)
  const [x2, setX2] = useState(68)

  const t1 = w1 * x1
  const t2 = w2 * x2
  const z = t1 + t2

  return (
    <section
      ref={sectionRef as React.RefObject<HTMLElement>}
      aria-labelledby="pca-score-calc"
      className={`py-8 transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <h2
        id="pca-score-calc"
        className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl text-ink dark:text-night-text mb-3"
      >
        PC Score Calculator
      </h2>
      <p className="text-sm text-ink-subtle dark:text-night-muted mb-5 leading-relaxed">
        A PC score is a weighted sum of original variables. The weights come from the eigenvector.
        Enter values to see the computation step by step.
      </p>

      {/* Eigenvector weights */}
      <div className="rounded-lg bg-cream-dark/60 dark:bg-night-card/60 p-3 mb-3">
        <p className="text-[12px] font-medium text-ink dark:text-night-text mb-2">
          Eigenvector weights for PC1:
        </p>
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-[100px]">
            <label className="text-[13px] text-ink-subtle dark:text-night-muted" htmlFor="pca-w1">
              w{'\u2081'} (calories)
            </label>
            <input
              id="pca-w1"
              type="number"
              step={0.01}
              value={w1}
              onChange={(e) => setW1(parseFloat(e.target.value) || 0)}
              className="w-full mt-1 px-2 py-1 rounded border border-cream-border dark:border-night-border
                bg-cream dark:bg-night-base text-ink dark:text-night-text
                font-[family-name:var(--font-mono)] text-[13px]"
            />
          </div>
          <div className="flex-1 min-w-[100px]">
            <label className="text-[13px] text-ink-subtle dark:text-night-muted" htmlFor="pca-w2">
              w{'\u2082'} (rating)
            </label>
            <input
              id="pca-w2"
              type="number"
              step={0.01}
              value={w2}
              onChange={(e) => setW2(parseFloat(e.target.value) || 0)}
              className="w-full mt-1 px-2 py-1 rounded border border-cream-border dark:border-night-border
                bg-cream dark:bg-night-base text-ink dark:text-night-text
                font-[family-name:var(--font-mono)] text-[13px]"
            />
          </div>
        </div>
      </div>

      {/* Data point values */}
      <div className="rounded-lg bg-cream-dark/60 dark:bg-night-card/60 p-3 mb-3">
        <p className="text-[12px] font-medium text-ink dark:text-night-text mb-2">
          Data point values:
        </p>
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-[100px]">
            <label className="text-[13px] text-ink-subtle dark:text-night-muted" htmlFor="pca-x1">
              x{'\u2081'} (calories)
            </label>
            <input
              id="pca-x1"
              type="number"
              step={1}
              value={x1}
              onChange={(e) => setX1(parseFloat(e.target.value) || 0)}
              className="w-full mt-1 px-2 py-1 rounded border border-cream-border dark:border-night-border
                bg-cream dark:bg-night-base text-ink dark:text-night-text
                font-[family-name:var(--font-mono)] text-[13px]"
            />
          </div>
          <div className="flex-1 min-w-[100px]">
            <label className="text-[13px] text-ink-subtle dark:text-night-muted" htmlFor="pca-x2">
              x{'\u2082'} (rating)
            </label>
            <input
              id="pca-x2"
              type="number"
              step={1}
              value={x2}
              onChange={(e) => setX2(parseFloat(e.target.value) || 0)}
              className="w-full mt-1 px-2 py-1 rounded border border-cream-border dark:border-night-border
                bg-cream dark:bg-night-base text-ink dark:text-night-text
                font-[family-name:var(--font-mono)] text-[13px]"
            />
          </div>
        </div>
      </div>

      {/* Step-by-step computation */}
      <div className="rounded-xl border border-cream-border dark:border-night-border bg-cream dark:bg-night-base p-4">
        <p className="text-[12px] font-medium text-ink dark:text-night-text mb-2">
          Step-by-step computation:
        </p>
        <div className="font-[family-name:var(--font-mono)] text-[13px] leading-[2.2] text-ink-subtle dark:text-night-muted">
          z{'\u2081'} = w{'\u2081'}{'\u00B7'}x{'\u2081'} + w{'\u2082'}{'\u00B7'}x{'\u2082'}
          <br />
          z{'\u2081'} ={' '}
          <span className="text-red-600 dark:text-red-400">({w1})</span>
          {' \u00D7 '}
          <span className="text-sapphire dark:text-sapphire-dark">{x1}</span>
          {' + '}
          <span className="text-red-600 dark:text-red-400">({w2})</span>
          {' \u00D7 '}
          <span className="text-sapphire dark:text-sapphire-dark">{x2}</span>
          <br />
          z{'\u2081'} ={' '}
          <span className="text-amber-600 dark:text-amber-300">{t1.toFixed(2)}</span>
          {' + '}
          <span className="text-amber-600 dark:text-amber-300">{t2.toFixed(2)}</span>
          <br />
          <strong className="text-ink dark:text-night-text text-[16px]">
            z{'\u2081'} = {z.toFixed(2)}
          </strong>
        </div>
        <p className="text-[12px] text-ink-subtle dark:text-night-muted mt-2">
          This score ({z.toFixed(2)}) is the data point{"'"}s position along PC1.{' '}
          {Math.abs(t1) > Math.abs(t2)
            ? 'Calories contributes more to this score because |w\u2081\u00B7x\u2081| > |w\u2082\u00B7x\u2082|.'
            : 'Rating contributes more to this score.'}
        </p>
      </div>

      <InsightBox>
        PC scores are used as input to downstream models (KNN, logistic regression).
        PCA removes multicollinearity because PCs are uncorrelated by construction.
      </InsightBox>
    </section>
  )
}


// ======================================================================
// SECTION 5: PCs Are Recipes, Not Variables
// ======================================================================
const T5_PEOPLE = [
  { name: 'Alex', height: 72, weight: 180, desc: 'tall & heavy', emoji: 'A' },
  { name: 'Sam', height: 64, weight: 120, desc: 'short & light', emoji: 'S' },
  { name: 'Jordan', height: 72, weight: 130, desc: 'tall & light', emoji: 'J' },
]

function Section5() {
  const [sectionRef, visible] = useScrollReveal()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [wH, setWH] = useState(0.71)
  const [wW, setWW] = useState(0.71)

  const scores = T5_PEOPLE.map(p => ({
    ...p,
    hT: wH * p.height,
    wT: wW * p.weight,
    score: wH * p.height + wW * p.weight,
  }))
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const result = setupCanvas(canvas, 300)
    if (!result) return
    const { ctx, W, H } = result
    const c = getThemeColors()

    const pad = { l: 50, r: 30, t: 20, b: 40 }
    const pw = W - pad.l - pad.r
    const ph = H - pad.t - pad.b
    const hMin = 58, hMax = 78, wMin2 = 100, wMax2 = 200
    const xOf = (v: number) => pad.l + ((v - hMin) / (hMax - hMin)) * pw
    const yOf = (v: number) => pad.t + (1 - (v - wMin2) / (wMax2 - wMin2)) * ph

    // Grid
    ctx.strokeStyle = c.grid
    ctx.lineWidth = 0.5
    for (let v = 110; v <= 190; v += 20) {
      ctx.beginPath()
      ctx.moveTo(pad.l, yOf(v))
      ctx.lineTo(W - pad.r, yOf(v))
      ctx.stroke()
    }

    // Axes
    ctx.strokeStyle = c.axis
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(pad.l, pad.t)
    ctx.lineTo(pad.l, H - pad.b)
    ctx.lineTo(W - pad.r, H - pad.b)
    ctx.stroke()

    // Axis labels
    ctx.fillStyle = c.subtext
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Height (in)', W / 2, H - 6)
    ctx.save()
    ctx.translate(14, H / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText('Weight (lbs)', 0, 0)
    ctx.restore()

    // Tick labels
    for (let v = 60; v <= 76; v += 4) ctx.fillText(String(v), xOf(v), H - pad.b + 14)
    ctx.textAlign = 'right'
    for (let v = 110; v <= 190; v += 20) ctx.fillText(String(v), pad.l - 6, yOf(v) + 4)

    // Mean point
    const mH = T5_PEOPLE.reduce((s, p) => s + p.height, 0) / 3
    const mW = T5_PEOPLE.reduce((s, p) => s + p.weight, 0) / 3

    // PC direction arrow
    const wN = Math.sqrt(wH * wH + wW * wW) || 1
    const dh = wH / wN, dw = wW / wN
    const aS = 12
    ctx.strokeStyle = c.red
    ctx.lineWidth = 2.5
    ctx.globalAlpha = 0.7
    ctx.beginPath()
    ctx.moveTo(xOf(mH - dh * aS), yOf(mW - dw * aS))
    ctx.lineTo(xOf(mH + dh * aS), yOf(mW + dw * aS))
    ctx.stroke()
    ctx.globalAlpha = 1

    // Arrowhead
    const angle = Math.atan2(
      -(yOf(mW + dw * aS) - yOf(mW - dw * aS)),
      xOf(mH + dh * aS) - xOf(mH - dh * aS)
    )
    ctx.fillStyle = c.red
    ctx.beginPath()
    ctx.moveTo(
      xOf(mH + dh * aS) + Math.cos(angle) * 8,
      yOf(mW + dw * aS) - Math.sin(angle) * 8
    )
    ctx.lineTo(
      xOf(mH + dh * aS) + Math.cos(angle + 2.5) * 4,
      yOf(mW + dw * aS) - Math.sin(angle + 2.5) * 4
    )
    ctx.lineTo(
      xOf(mH + dh * aS) + Math.cos(angle - 2.5) * 4,
      yOf(mW + dw * aS) - Math.sin(angle - 2.5) * 4
    )
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = c.red
    ctx.font = '500 11px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('PC direction', xOf(mH + dh * aS) + 10, yOf(mW + dw * aS))

    // People dots and projections
    const pColors = [c.blue, c.green, c.purple]
    scores.forEach((s, i) => {
      const px = xOf(s.height), py = yOf(s.weight)
      const dx = s.height - mH, dWeight = s.weight - mW
      const proj = dx * dh + dWeight * dw
      const projH = mH + proj * dh, projW = mW + proj * dw

      // Projection dash
      ctx.setLineDash([3, 3])
      ctx.strokeStyle = pColors[i]
      ctx.lineWidth = 1
      ctx.globalAlpha = 0.5
      ctx.beginPath()
      ctx.moveTo(px, py)
      ctx.lineTo(xOf(projH), yOf(projW))
      ctx.stroke()
      ctx.setLineDash([])
      ctx.globalAlpha = 1

      // Projection dot
      ctx.fillStyle = pColors[i]
      ctx.globalAlpha = 0.4
      ctx.beginPath()
      ctx.arc(xOf(projH), yOf(projW), 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1

      // Person dot
      ctx.fillStyle = pColors[i]
      ctx.beginPath()
      ctx.arc(px, py, 7, 0, Math.PI * 2)
      ctx.fill()

      // Label
      ctx.fillStyle = '#fff'
      ctx.font = '500 10px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(s.emoji, px, py + 3.5)
    })
  }, [wH, wW, scores])

  useEffect(() => { draw() }, [draw])
  useDarkModeObserver(draw)
  useCanvasResize(canvasRef, draw)

  // Insight text
  const isPure = Math.abs(wW) < 0.02
  const isEqual = Math.abs(Math.abs(wH) - Math.abs(wW)) < 0.1
  const sameSign = wH * wW > 0

  let insight: React.ReactNode
  if (isPure) {
    insight = (
      <>
        <strong>This is NOT a real PC</strong> — it{"'"}s just the original height variable.
        Alex and Jordan get identical scores (both 72 in). You{"'"}ve lost the ability to distinguish them.
        A real PC mixes multiple variables.
      </>
    )
  } else if (isEqual && sameSign) {
    insight = (
      <>
        <strong>Both variables contribute equally, same direction.</strong> This captures {'\u201C'}overall size.{'\u201D'}{' '}
        Alex (tall+heavy) scores highest, Sam (short+light) lowest.
        Jordan (tall but light) is in the middle — the two contributions partially offset.
      </>
    )
  } else if (isEqual && !sameSign) {
    insight = (
      <>
        <strong>Opposite directions = contrast.</strong> This captures {'\u201C'}tall-but-light vs short-but-heavy.{'\u201D'}{' '}
        Jordan now scores very differently from Alex — height pushes up but weight pulls down.
        This is typically what PC2 looks like.
      </>
    )
  } else if (Math.abs(wH) > Math.abs(wW) * 3) {
    insight = (
      <>
        <strong>Height dominates</strong> — this LOOKS like {'\u201C'}PC1=height{'\u201D'} but the{' '}
        {Math.abs(wW).toFixed(2)} {'\u00D7'} weight still matters.
        With 50 variables, many small contributions add up.
      </>
    )
  } else {
    insight = (
      <>
        <strong>Unequal blend.</strong> {Math.abs(wH) > Math.abs(wW) ? 'Height' : 'Weight'} contributes more,
        but both matter. The ordering of the three people depends on the mix, not any single variable.
      </>
    )
  }

  // Person color classes for text
  const personColorClasses = [
    'text-sapphire dark:text-sapphire-dark',
    'text-green-600 dark:text-green-400',
    'text-mauve dark:text-mauve-dark',
  ]

  return (
    <section
      ref={sectionRef as React.RefObject<HTMLElement>}
      aria-labelledby="pca-recipes"
      className={`py-8 transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <h2
        id="pca-recipes"
        className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl text-ink dark:text-night-text mb-3"
      >
        PCs Are Recipes, Not Variables
      </h2>

      <WarnBox>
        <strong>The misconception:</strong> {'\u201C'}PC1 = height, PC2 = weight{'\u201D'} — treating PCs as renamed variables.{' '}
        <strong>Wrong.</strong> Each PC is a weighted MIX of ALL original variables. It{"'"}s a recipe, not a single ingredient.
      </WarnBox>

      {/* Recipe formula card */}
      <div className="mt-4 rounded-xl border border-cream-border dark:border-night-border bg-cream dark:bg-night-base p-4">
        <p className="text-[14px] font-medium text-ink dark:text-night-text mb-2">
          PCs are recipes that blend all variables
        </p>
        <p className="text-[13px] text-ink-subtle dark:text-night-muted mb-3">
          Adjust the weights to see how different blends create different PCs. Try the presets.
        </p>

        {/* Weight sliders */}
        <div className="flex items-center gap-3 mb-1">
          <label
            htmlFor="pca-wh-slider"
            className="text-sm text-ink-subtle dark:text-night-muted min-w-[90px]"
          >
            w<sub>height</sub>
          </label>
          <input
            id="pca-wh-slider"
            type="range"
            min={-1}
            max={1}
            step={0.01}
            value={wH}
            onChange={(e) => setWH(parseFloat(e.target.value))}
            aria-valuetext={`weight for height = ${wH.toFixed(2)}`}
            className="flex-1"
          />
          <span className="font-[family-name:var(--font-mono)] text-sm font-medium min-w-[44px] text-right text-ink dark:text-night-text">
            {wH.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center gap-3 mb-2">
          <label
            htmlFor="pca-ww-slider"
            className="text-sm text-ink-subtle dark:text-night-muted min-w-[90px]"
          >
            w<sub>weight</sub>
          </label>
          <input
            id="pca-ww-slider"
            type="range"
            min={-1}
            max={1}
            step={0.01}
            value={wW}
            onChange={(e) => setWW(parseFloat(e.target.value))}
            aria-valuetext={`weight for weight = ${wW.toFixed(2)}`}
            className="flex-1"
          />
          <span className="font-[family-name:var(--font-mono)] text-sm font-medium min-w-[44px] text-right text-ink dark:text-night-text">
            {wW.toFixed(2)}
          </span>
        </div>

        {/* Recipe formula display */}
        <div className="flex items-center gap-1.5 font-[family-name:var(--font-mono)] text-[15px] py-2.5 flex-wrap">
          <span className="font-medium text-red-600 dark:text-red-400">PC =</span>
          <span className="px-2.5 py-1 rounded-lg bg-sapphire/10 dark:bg-sapphire-dark/10 text-sapphire dark:text-sapphire-dark text-[13px] font-medium">
            {wH >= 0 ? '+' : ''}{wH.toFixed(2)} {'\u00D7'} height
          </span>
          <span className="text-ink-faint dark:text-night-muted">+</span>
          <span className="px-2.5 py-1 rounded-lg bg-amber-100/60 dark:bg-amber-900/20 text-amber-600 dark:text-amber-300 text-[13px] font-medium">
            {wW >= 0 ? '+' : ''}{wW.toFixed(2)} {'\u00D7'} weight
          </span>
        </div>

        {/* Preset buttons */}
        <div className="flex gap-1.5 flex-wrap mt-2">
          <button
            type="button"
            onClick={() => { setWH(0.71); setWW(0.71) }}
            className="px-3 py-1.5 rounded-lg text-[13px] font-medium border border-sapphire/30 dark:border-sapphire-dark/30
              bg-sapphire/10 dark:bg-sapphire-dark/10 text-sapphire dark:text-sapphire-dark
              hover:bg-sapphire/20 dark:hover:bg-sapphire-dark/20 transition-colors"
          >
            PC1: overall size
          </button>
          <button
            type="button"
            onClick={() => { setWH(0.71); setWW(-0.71) }}
            className="px-3 py-1.5 rounded-lg text-[13px] font-medium border border-cream-border dark:border-night-border
              text-ink-subtle dark:text-night-muted hover:bg-cream-dark/60 dark:hover:bg-night-card/60 transition-colors"
          >
            PC2: tall-light vs short-heavy
          </button>
          <button
            type="button"
            onClick={() => { setWH(0.95); setWW(0.05) }}
            className="px-3 py-1.5 rounded-lg text-[13px] font-medium border border-cream-border dark:border-night-border
              text-ink-subtle dark:text-night-muted hover:bg-cream-dark/60 dark:hover:bg-night-card/60 transition-colors"
          >
            Mostly height
          </button>
          <button
            type="button"
            onClick={() => { setWH(1); setWW(0) }}
            className="px-3 py-1.5 rounded-lg text-[13px] font-medium border border-cream-border dark:border-night-border
              text-ink-subtle dark:text-night-muted hover:bg-cream-dark/60 dark:hover:bg-night-card/60 transition-colors"
          >
            Pure height (NOT a PC)
          </button>
        </div>
      </div>

      {/* People cards */}
      <div className="mt-4 rounded-xl border border-cream-border dark:border-night-border bg-cream dark:bg-night-base p-4">
        <p className="text-[14px] font-medium text-ink dark:text-night-text mb-3">
          Three people, same data, different scores
        </p>
        <div className="flex gap-2 flex-wrap">
          {scores.map((s, i) => (
            <div
              key={s.name}
              className="flex-1 min-w-[140px] rounded-lg bg-cream-dark/60 dark:bg-night-card/60 p-3"
            >
              <div className={`text-[12px] font-medium mb-1.5 ${personColorClasses[i]}`}>
                {s.name}{' '}
                <span className="font-normal text-ink-faint dark:text-night-muted">{s.desc}</span>
              </div>
              <div className="font-[family-name:var(--font-mono)] text-[13px] leading-[1.8] text-ink-subtle dark:text-night-muted">
                Height: {s.height} in<br />
                Weight: {s.weight} lb
                <span className="block mt-1 pt-1 border-t border-cream-border dark:border-night-border">
                  <span className="text-sapphire dark:text-sapphire-dark">
                    {s.hT >= 0 ? '+' : ''}{s.hT.toFixed(1)}
                  </span>
                  <span className="text-ink-faint dark:text-night-muted"> + </span>
                  <span className="text-amber-600 dark:text-amber-300">
                    {s.wT >= 0 ? '+' : ''}{s.wT.toFixed(1)}
                  </span>
                  <span className="text-ink-faint dark:text-night-muted"> = </span>
                  <strong className="text-red-600 dark:text-red-400 text-[15px]">
                    {s.score.toFixed(1)}
                  </strong>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contribution bars */}
      <div className="mt-4 rounded-xl border border-cream-border dark:border-night-border bg-cream dark:bg-night-base p-4">
        <p className="text-[14px] font-medium text-ink dark:text-night-text mb-3">
          What{"'"}s driving each score?
        </p>
        {scores.map((s, i) => {
          const totalAbs = Math.abs(s.hT) + Math.abs(s.wT) || 1
          const hPct = Math.abs(s.hT) / totalAbs * 100
          const wPct = Math.abs(s.wT) / totalAbs * 100
          return (
            <div key={s.name} className="mb-2">
              <div className="flex justify-between text-[13px] text-ink-subtle dark:text-night-muted mb-1">
                <span className={personColorClasses[i]}>{s.name}</span>
                <span>PC = {s.score.toFixed(1)}</span>
              </div>
              <div className="flex gap-0.5 h-3.5">
                <div
                  className="rounded-l bg-sapphire/40 dark:bg-sapphire-dark/40 relative overflow-hidden"
                  style={{ flex: hPct }}
                >
                  {hPct > 15 && (
                    <span className="absolute left-1.5 top-0 text-[12px] font-medium text-sapphire dark:text-sapphire-dark leading-[14px]">
                      height {hPct.toFixed(0)}%
                    </span>
                  )}
                </div>
                <div
                  className="rounded-r bg-amber-200/60 dark:bg-amber-800/40 relative overflow-hidden"
                  style={{ flex: wPct }}
                >
                  {wPct > 15 && (
                    <span className="absolute right-1.5 top-0 text-[12px] font-medium text-amber-600 dark:text-amber-300 leading-[14px]">
                      weight {wPct.toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Scatter plot */}
      <div className="mt-4 rounded-xl border border-cream-border dark:border-night-border bg-cream dark:bg-night-base p-4">
        <p className="text-[14px] font-medium text-ink dark:text-night-text mb-1">
          The PC axis in original variable space
        </p>
        <p className="text-[12px] text-ink-subtle dark:text-night-muted mb-2">
          The arrow = PC direction. Dashed projections = PC scores.
        </p>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Scatter plot of three people by height and weight with PC direction arrow and projection dashes"
          className="w-full rounded-lg"
          style={{ height: 300 }}
        />
      </div>

      <InsightBox>{insight}</InsightBox>
    </section>
  )
}


// ======================================================================
// MAIN EXPORT
// ======================================================================
export function PCA() {
  return (
    <div className="mx-auto max-w-5xl px-6 sm:px-10 lg:px-12">
      {/* Title */}
      <div className="text-center mb-16">
        <p className="font-[family-name:var(--font-mono)] text-[13px] tracking-[0.3em] uppercase mb-4 text-peach dark:text-peach-dark">
          03/
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl text-ink dark:text-night-text mb-4">
          PCA / Dimensionality Reduction
        </h1>
        <p className="text-[15px] text-ink-subtle dark:text-night-muted">
          5 concepts {'\u00B7'} Drag sliders and explore principal components
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

      <div className="py-12 [&>div]:mb-0">
        <SectionDivider absolute={false} />
      </div>

      {/* Section 5 */}
      <Section5 />
    </div>
  )
}
