'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
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
    pink: isDark ? '#f5c2e7' : '#ea76cb',
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

// --- Loan model constants ---
const FEATURES = ['income', 'credit_score', 'debt_ratio', 'employment_years', 'loan_amount'] as const
const FEAT_SHORT = ['Income', 'Credit', 'Debt ratio', 'Emp years', 'Loan amt'] as const
const BASELINE = 0.35

interface Instance {
  vals: number[]
  shap: number[]
  pred: number
}

// Box-Muller normal random
function rng(): number {
  let u = 0, v = 0
  while (!u) u = Math.random()
  while (!v) v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

function genInstances(n: number): Instance[] {
  const insts: Instance[] = []
  for (let i = 0; i < n; i++) {
    const income = 30 + Math.random() * 120   // 30k-150k
    const credit = 500 + Math.random() * 350   // 500-850
    const debt = Math.random()                   // 0-1
    const emp = Math.random() * 25
    const loan = 5 + Math.random() * 95         // 5k-100k
    const vals = [income, credit, debt, emp, loan]
    // Simulated SHAP: high income/credit/emp push prediction down, high debt/loan push up
    const shap = [
      -(income - 80) / 80 * 0.15 + rng() * 0.02,
      -(credit - 675) / 175 * 0.12 + rng() * 0.02,
      (debt - 0.5) * 0.25 + rng() * 0.02,
      -(emp - 12) / 12 * 0.08 + rng() * 0.015,
      (loan - 50) / 50 * 0.1 + rng() * 0.015,
    ]
    const pred = BASELINE + shap.reduce((s, v2) => s + v2, 0)
    insts.push({ vals, shap, pred: Math.max(0.01, Math.min(0.99, pred)) })
  }
  return insts
}

// ======================================================================
// SECTION 1: Waterfall Chart (Efficiency)
// ======================================================================
function Section1({ instances, regenerate }: { instances: Instance[]; regenerate: () => void }) {
  const [sectionRef, visible] = useScrollReveal()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [selInst, setSelInst] = useState(0)

  // Prevent stale index after regeneration
  const inst = instances[Math.min(selInst, instances.length - 1)]

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const result = setupCanvas(canvas, 320)
    if (!result) return
    const { ctx, W, H } = result
    const c = getThemeColors()

    const pad = { l: 100, r: 40, t: 30, b: 20 }
    const pw = W - pad.l - pad.r
    const ph = H - pad.t - pad.b
    const n = FEATURES.length
    const rowH = Math.min(38, ph / (n + 2))

    // Sort by absolute SHAP descending
    const sorted = inst.shap.map((s, i) => ({ s, i, name: FEAT_SHORT[i], val: inst.vals[i] }))
      .sort((a, b) => Math.abs(b.s) - Math.abs(a.s))

    // Compute range for x axis
    const allVals = [BASELINE, inst.pred]
    let running = BASELINE
    sorted.forEach(f => { allVals.push(running); running += f.s; allVals.push(running) })
    const xMin = Math.min(...allVals) - 0.05
    const xMax = Math.max(...allVals) + 0.05
    const xOf = (v: number) => pad.l + ((v - xMin) / (xMax - xMin)) * pw

    // Baseline row
    const y0 = pad.t
    ctx.fillStyle = c.subtext; ctx.font = '500 12px sans-serif'; ctx.textAlign = 'right'
    ctx.fillText('Baseline (E[f(x)])', pad.l - 8, y0 + rowH / 2 + 4)
    ctx.fillStyle = c.surface
    ctx.beginPath(); ctx.arc(xOf(BASELINE), y0 + rowH / 2, 4, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = c.text; ctx.font = '500 11px monospace'; ctx.textAlign = 'left'
    ctx.fillText(BASELINE.toFixed(3), xOf(BASELINE) + 8, y0 + rowH / 2 + 4)

    // SHAP bars
    running = BASELINE
    sorted.forEach((f, idx) => {
      const y = pad.t + (idx + 1) * rowH
      const start = running
      const end = running + f.s
      const isPos = f.s >= 0
      const barL = xOf(Math.min(start, end))
      const barR = xOf(Math.max(start, end))
      const barW2 = Math.max(barR - barL, 2)

      // Bar
      ctx.fillStyle = isPos ? c.red + 'cc' : c.blue + 'cc'
      ctx.fillRect(barL, y + 4, barW2, rowH - 8)
      ctx.strokeStyle = isPos ? c.red : c.blue; ctx.lineWidth = 0.5
      ctx.strokeRect(barL, y + 4, barW2, rowH - 8)

      // Connector from previous
      ctx.strokeStyle = c.surface + '66'; ctx.lineWidth = 0.5; ctx.setLineDash([3, 3])
      ctx.beginPath(); ctx.moveTo(xOf(start), y); ctx.lineTo(xOf(start), y + 4); ctx.stroke()
      ctx.setLineDash([])

      // Feature name
      ctx.fillStyle = c.subtext; ctx.font = '12px sans-serif'; ctx.textAlign = 'right'
      ctx.fillText(f.name, pad.l - 8, y + rowH / 2 + 4)

      // SHAP value label
      ctx.fillStyle = isPos ? c.red : c.blue; ctx.font = '500 11px monospace'
      ctx.textAlign = isPos ? 'left' : 'right'
      const labelX = isPos ? barR + 4 : barL - 4
      ctx.fillText((isPos ? '+' : '') + f.s.toFixed(3), labelX, y + rowH / 2 + 4)

      running = end
    })

    // Final prediction row
    const yF = pad.t + (n + 1) * rowH
    ctx.fillStyle = c.subtext; ctx.font = '500 12px sans-serif'; ctx.textAlign = 'right'
    ctx.fillText('Prediction f(x)', pad.l - 8, yF + rowH / 2 + 4)

    ctx.strokeStyle = c.surface + '66'; ctx.lineWidth = 0.5; ctx.setLineDash([3, 3])
    ctx.beginPath(); ctx.moveTo(xOf(running), yF); ctx.lineTo(xOf(running), yF + 4); ctx.stroke()
    ctx.setLineDash([])

    ctx.fillStyle = c.purple
    ctx.beginPath(); ctx.arc(xOf(inst.pred), yF + rowH / 2, 5, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = c.text; ctx.font = '500 12px monospace'; ctx.textAlign = 'left'
    ctx.fillText(inst.pred.toFixed(3), xOf(inst.pred) + 10, yF + rowH / 2 + 4)

    // Axis at bottom
    ctx.strokeStyle = c.axis; ctx.lineWidth = 0.5
    const axisY = pad.t + (n + 2) * rowH
    ctx.beginPath(); ctx.moveTo(pad.l, axisY); ctx.lineTo(W - pad.r, axisY); ctx.stroke()
    ctx.fillStyle = c.surface; ctx.font = '11px sans-serif'; ctx.textAlign = 'center'
    const step2 = Math.max(0.05, Math.round((xMax - xMin) / 5 * 20) / 20)
    for (let v = Math.ceil(xMin / step2) * step2; v <= xMax; v += step2) {
      ctx.fillText(v.toFixed(2), xOf(v), axisY + 14)
    }
  }, [inst])

  useEffect(() => { draw() }, [draw])
  useDarkModeObserver(draw)
  useCanvasResize(canvasRef, draw)

  const shapSum = inst.shap.reduce((s, v) => s + v, 0)
  const sorted = inst.shap.map((s, i) => ({ s, i, name: FEAT_SHORT[i] }))
    .sort((a, b) => Math.abs(b.s) - Math.abs(a.s))
  const topPush = sorted[0]

  // Suppress unused var lint
  void regenerate

  return (
    <section
      ref={sectionRef as React.RefObject<HTMLElement>}
      aria-labelledby="shap-waterfall"
      className={`py-8 transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <h2
        id="shap-waterfall"
        className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl text-ink dark:text-night-text mb-3"
      >
        Waterfall Chart (Efficiency)
      </h2>
      <p className="text-sm text-ink-subtle dark:text-night-muted mb-5 leading-relaxed">
        The waterfall shows how one prediction builds from the baseline. Each bar = one feature{'\u2019'}s SHAP value
        pushing the prediction up or down. They always sum to exactly (prediction {'\u2212'} baseline). That{'\u2019'}s
        the efficiency property.
      </p>

      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Waterfall chart showing SHAP value contributions from baseline to prediction"
        className="w-full rounded-lg"
        style={{ height: 320 }}
      />

      <div className="flex items-center gap-3 mt-2 mb-2">
        <label
          htmlFor="shap-inst-slider"
          className="text-sm text-ink-subtle dark:text-night-muted min-w-[90px]"
        >
          Instance #
        </label>
        <input
          id="shap-inst-slider"
          type="range"
          min={0}
          max={199}
          step={1}
          value={selInst}
          onChange={(e) => setSelInst(parseInt(e.target.value))}
          aria-valuetext={`Instance ${selInst}`}
          className="flex-1"
        />
        <span className="font-[family-name:var(--font-mono)] text-sm font-medium min-w-[44px] text-right text-ink dark:text-night-text">
          {selInst}
        </span>
      </div>

      <div className="flex gap-2.5 flex-wrap my-2.5">
        <MetricCard label="Baseline" value={BASELINE.toFixed(3)} />
        <MetricCard
          label={'\u03A3 SHAP'}
          value={`${shapSum >= 0 ? '+' : ''}${shapSum.toFixed(3)}`}
          colorClass={METRIC_COLORS.amber}
        />
        <MetricCard
          label={'Base + \u03A3 SHAP'}
          value={(BASELINE + shapSum).toFixed(3)}
          colorClass={METRIC_COLORS.purple}
        />
        <MetricCard
          label="Prediction"
          value={inst.pred.toFixed(3)}
          colorClass={METRIC_COLORS.purple}
        />
      </div>

      <InsightBox>
        <strong>Efficiency property:</strong> baseline ({BASELINE.toFixed(3)}) + {'\u03A3'} SHAP values (
        {shapSum >= 0 ? '+' : ''}{shapSum.toFixed(3)}) = {(BASELINE + shapSum).toFixed(3)} {'\u2248'} prediction (
        {inst.pred.toFixed(3)}). The biggest driver is <strong>{topPush.name}</strong> (
        {topPush.s >= 0 ? '+' : ''}{topPush.s.toFixed(3)}).{' '}
        <span className="text-red-600 dark:text-red-400">Red bars push the prediction UP</span> (toward default).{' '}
        <span className="text-sapphire dark:text-sapphire-dark">Blue bars push it DOWN</span> (away from default).
        Scrub through instances to see how different feature values produce different SHAP patterns.
      </InsightBox>
    </section>
  )
}

// ======================================================================
// SECTION 2: Beeswarm Plot
// ======================================================================
function Section2({ instances, regenerate }: { instances: Instance[]; regenerate: () => void }) {
  const [sectionRef, visible] = useScrollReveal()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // Track a key to force redraws when "New data" is clicked
  const [drawKey, setDrawKey] = useState(0)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const result = setupCanvas(canvas, 320)
    if (!result) return
    const { ctx, W, H } = result
    const c = getThemeColors()

    const pad = { l: 90, r: 20, t: 20, b: 30 }
    const pw = W - pad.l - pad.r
    const n = FEATURES.length
    const rowH = (H - pad.t - pad.b) / n

    // Compute global SHAP range
    let shapMin = 0, shapMax = 0
    instances.forEach(inst => {
      inst.shap.forEach(s => { if (s < shapMin) shapMin = s; if (s > shapMax) shapMax = s })
    })
    const shapRange = Math.max(Math.abs(shapMin), Math.abs(shapMax)) * 1.15
    const xOf = (v: number) => pad.l + ((v + shapRange) / (2 * shapRange)) * pw

    // Zero line
    ctx.strokeStyle = c.axis; ctx.lineWidth = 0.5
    ctx.beginPath(); ctx.moveTo(xOf(0), pad.t); ctx.lineTo(xOf(0), H - pad.b); ctx.stroke()

    // Sort features by mean |SHAP| descending
    const meanAbs = FEATURES.map((_, fi) =>
      instances.reduce((s, inst) => s + Math.abs(inst.shap[fi]), 0) / instances.length)
    const order = [...Array(n).keys()].sort((a, b) => meanAbs[b] - meanAbs[a])

    // For each feature, normalize its values to [0,1] for coloring
    const fMins = FEATURES.map((_, fi) => Math.min(...instances.map(inst => inst.vals[fi])))
    const fMaxs = FEATURES.map((_, fi) => Math.max(...instances.map(inst => inst.vals[fi])))

    order.forEach((fi, row) => {
      const y = pad.t + row * rowH + rowH / 2

      // Feature label
      ctx.fillStyle = c.subtext; ctx.font = '12px sans-serif'; ctx.textAlign = 'right'
      ctx.fillText(FEAT_SHORT[fi], pad.l - 8, y + 4)

      // Row background
      if (row % 2 === 0) {
        ctx.fillStyle = c.grid
        ctx.fillRect(pad.l, pad.t + row * rowH, pw, rowH)
      }

      // Dots -- jitter vertically to prevent overlap
      const dots = instances.map(inst => {
        const range = fMaxs[fi] - fMins[fi]
        const normVal = range > 0 ? (inst.vals[fi] - fMins[fi]) / range : 0.5
        return { shap: inst.shap[fi], normVal }
      })
      dots.sort((a, b) => a.shap - b.shap)

      dots.forEach((d) => {
        const jitter = (Math.random() - 0.5) * rowH * 0.6
        const px = xOf(d.shap)
        const py = y + jitter
        // Color interpolation: blue (low) -> gray -> red (high)
        const t = d.normVal
        let r2: number, g2: number, b2: number
        if (t < 0.5) {
          const t2 = t * 2
          r2 = Math.round(59 + t2 * (138 - 59))
          g2 = Math.round(139 + t2 * (138 - 139))
          b2 = Math.round(212 + t2 * (138 - 212))
        } else {
          const t2 = (t - 0.5) * 2
          r2 = Math.round(138 + t2 * (226 - 138))
          g2 = Math.round(138 + t2 * (74 - 138))
          b2 = Math.round(138 + t2 * (74 - 138))
        }
        ctx.fillStyle = `rgba(${r2},${g2},${b2},0.65)`
        ctx.beginPath(); ctx.arc(px, py, 2.5, 0, Math.PI * 2); ctx.fill()
      })
    })

    // X axis
    ctx.strokeStyle = c.axis; ctx.lineWidth = 0.5
    ctx.beginPath(); ctx.moveTo(pad.l, H - pad.b); ctx.lineTo(W - pad.r, H - pad.b); ctx.stroke()
    ctx.fillStyle = c.surface; ctx.font = '11px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText('SHAP value (impact on prediction)', W / 2 + pad.l / 2, H - 4)
    const step3 = Math.round(shapRange * 2 / 4 * 100) / 100
    for (let v = -shapRange; v <= shapRange; v += Math.max(0.05, step3)) {
      ctx.fillText(v.toFixed(2), xOf(v), H - pad.b + 14)
    }
  }, [instances, drawKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { draw() }, [draw])
  useDarkModeObserver(draw)
  useCanvasResize(canvasRef, draw)

  return (
    <section
      ref={sectionRef as React.RefObject<HTMLElement>}
      aria-labelledby="shap-beeswarm"
      className={`py-8 transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <h2
        id="shap-beeswarm"
        className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl text-ink dark:text-night-text mb-3"
      >
        Beeswarm Plot
      </h2>
      <p className="text-sm text-ink-subtle dark:text-night-muted mb-5 leading-relaxed">
        Each dot = one instance. X-axis = SHAP value (how much that feature pushed the prediction). Color = the
        feature{'\u2019'}s actual value (red = high, blue = low). If red dots cluster at positive SHAP, high feature
        value increases the prediction.
      </p>

      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Beeswarm plot showing SHAP value distributions for each feature colored by feature value"
        className="w-full rounded-lg"
        style={{ height: 320 }}
      />

      {/* Gradient legend */}
      <div className="flex items-center gap-2 justify-center my-2">
        <span className="text-[13px] text-sapphire dark:text-sapphire-dark">Low feature value</span>
        <div
          className="w-[120px] h-2.5 rounded-full"
          style={{ background: 'linear-gradient(90deg, #3B8BD4, #8a8a8a, #E24B4A)' }}
        />
        <span className="text-[13px] text-red-600 dark:text-red-400">High feature value</span>
      </div>

      <div className="flex gap-1.5 flex-wrap my-2">
        <button
          type="button"
          onClick={() => { regenerate(); setDrawKey(k => k + 1) }}
          className="px-4 py-1.5 rounded-lg text-[13px] font-medium border border-cream-border dark:border-night-border
            text-ink-subtle dark:text-night-muted hover:bg-cream-dark/60 dark:hover:bg-night-card/60 transition-colors"
        >
          New data
        </button>
      </div>

      <InsightBox>
        <strong>How to read this:</strong> Look at <strong>debt ratio</strong> {'\u2014'} red dots (high debt) cluster on the RIGHT
        (positive SHAP = pushes prediction toward default). Blue dots (low debt) cluster on the LEFT (negative SHAP =
        pushes away from default). For <strong>income</strong>, it{'\u2019'}s reversed: red (high income) clusters LEFT
        (protective). Features are sorted by importance (top = most impactful).
      </InsightBox>
    </section>
  )
}

// ======================================================================
// SECTION 3: Global Importance
// ======================================================================
function Section3({ instances, regenerate }: { instances: Instance[]; regenerate: () => void }) {
  const [sectionRef, visible] = useScrollReveal()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawKey, setDrawKey] = useState(0)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const result = setupCanvas(canvas, 240)
    if (!result) return
    const { ctx, W, H } = result
    const c = getThemeColors()

    const pad = { l: 90, r: 40, t: 16, b: 30 }
    const pw = W - pad.l - pad.r
    const ph = H - pad.t - pad.b
    const n = FEATURES.length

    const meanAbs = FEATURES.map((_, fi) =>
      instances.reduce((s, inst) => s + Math.abs(inst.shap[fi]), 0) / instances.length)
    const order = [...Array(n).keys()].sort((a, b) => meanAbs[b] - meanAbs[a])
    const maxMA = Math.max(...meanAbs) * 1.15
    const rowH = ph / n
    const barH = rowH * 0.55
    const cols = [c.red, c.blue, c.amber, c.green, c.purple]

    order.forEach((fi, row) => {
      const y = pad.t + row * rowH
      const bw = (meanAbs[fi] / maxMA) * pw

      ctx.fillStyle = cols[row % cols.length] + '88'
      ctx.fillRect(pad.l, y + (rowH - barH) / 2, bw, barH)
      ctx.strokeStyle = cols[row % cols.length]; ctx.lineWidth = 0.5
      ctx.strokeRect(pad.l, y + (rowH - barH) / 2, bw, barH)

      ctx.fillStyle = c.subtext; ctx.font = '12px sans-serif'; ctx.textAlign = 'right'
      ctx.fillText(FEAT_SHORT[fi], pad.l - 8, y + rowH / 2 + 4)

      ctx.fillStyle = c.text; ctx.font = '500 12px monospace'; ctx.textAlign = 'left'
      ctx.fillText(meanAbs[fi].toFixed(4), pad.l + bw + 6, y + rowH / 2 + 4)
    })

    // X axis
    ctx.strokeStyle = c.axis; ctx.lineWidth = 0.5
    ctx.beginPath(); ctx.moveTo(pad.l, H - pad.b); ctx.lineTo(W - pad.r, H - pad.b); ctx.stroke()
    ctx.fillStyle = c.surface; ctx.font = '11px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText('Mean |SHAP value|', W / 2 + pad.l / 2, H - 4)
  }, [instances, drawKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { draw() }, [draw])
  useDarkModeObserver(draw)
  useCanvasResize(canvasRef, draw)

  const meanAbs = FEATURES.map((_, fi) =>
    instances.reduce((s, inst) => s + Math.abs(inst.shap[fi]), 0) / instances.length)
  const order = [...Array(FEATURES.length).keys()].sort((a, b) => meanAbs[b] - meanAbs[a])
  const topF = FEAT_SHORT[order[0]]
  const botF = FEAT_SHORT[order[FEATURES.length - 1]]

  return (
    <section
      ref={sectionRef as React.RefObject<HTMLElement>}
      aria-labelledby="shap-global"
      className={`py-8 transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <h2
        id="shap-global"
        className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl text-ink dark:text-night-text mb-3"
      >
        Global Importance
      </h2>
      <p className="text-sm text-ink-subtle dark:text-night-muted mb-5 leading-relaxed">
        Mean |SHAP| averages the absolute SHAP values across all instances. This gives a global measure of feature
        importance {'\u2014'} how much each feature matters on average, regardless of direction.
      </p>

      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Horizontal bar chart showing mean absolute SHAP values per feature, sorted by importance"
        className="w-full rounded-lg"
        style={{ height: 240 }}
      />

      <div className="flex gap-1.5 flex-wrap my-2">
        <button
          type="button"
          onClick={() => { regenerate(); setDrawKey(k => k + 1) }}
          className="px-4 py-1.5 rounded-lg text-[13px] font-medium border border-cream-border dark:border-night-border
            text-ink-subtle dark:text-night-muted hover:bg-cream-dark/60 dark:hover:bg-night-card/60 transition-colors"
        >
          New data
        </button>
      </div>

      <InsightBox>
        <strong>{topF}</strong> has the highest mean |SHAP| {'\u2014'} on average, it moves the prediction the most.{' '}
        <strong>{botF}</strong> has the least impact. Unlike permutation importance (which can be biased by correlated
        features), SHAP importance fairly distributes credit across all features. This is the {'\u201C'}global{'\u201D'}{' '}
        view {'\u2014'} the beeswarm shows direction, this shows magnitude only.
      </InsightBox>
    </section>
  )
}

// ======================================================================
// SECTION 4: Shapley Value Math
// ======================================================================
interface ToyValues {
  [key: string]: number
}

interface MargRow {
  sub: string
  with_: string
  marg: number
}

function generateToyValues(): ToyValues {
  const base = 0.35
  const fA = 0.12, fB = -0.08, fC = 0.05
  const fAB = fA + fB + 0.02, fAC = fA + fC - 0.01, fBC = fB + fC + 0.01
  const fABC = fA + fB + fC + 0.03
  return {
    '{}': base,
    '{A}': base + fA, '{B}': base + fB, '{C}': base + fC,
    '{A,B}': base + fAB, '{A,C}': base + fAC, '{B,C}': base + fBC,
    '{A,B,C}': base + fABC,
  }
}

function computeShapley(v: ToyValues) {
  const margA: MargRow[] = [
    { sub: '{}', with_: '{A}', marg: v['{A}'] - v['{}'] },
    { sub: '{B}', with_: '{A,B}', marg: v['{A,B}'] - v['{B}'] },
    { sub: '{C}', with_: '{A,C}', marg: v['{A,C}'] - v['{C}'] },
    { sub: '{B,C}', with_: '{A,B,C}', marg: v['{A,B,C}'] - v['{B,C}'] },
  ]
  const shapA = margA.reduce((s, m) => s + m.marg, 0) / margA.length

  const margB: MargRow[] = [
    { sub: '{}', with_: '{B}', marg: v['{B}'] - v['{}'] },
    { sub: '{A}', with_: '{A,B}', marg: v['{A,B}'] - v['{A}'] },
    { sub: '{C}', with_: '{B,C}', marg: v['{B,C}'] - v['{C}'] },
    { sub: '{A,C}', with_: '{A,B,C}', marg: v['{A,B,C}'] - v['{A,C}'] },
  ]
  const shapB = margB.reduce((s, m) => s + m.marg, 0) / margB.length

  const margC: MargRow[] = [
    { sub: '{}', with_: '{C}', marg: v['{C}'] - v['{}'] },
    { sub: '{A}', with_: '{A,C}', marg: v['{A,C}'] - v['{A}'] },
    { sub: '{B}', with_: '{B,C}', marg: v['{B,C}'] - v['{B}'] },
    { sub: '{A,B}', with_: '{A,B,C}', marg: v['{A,B,C}'] - v['{A,B}'] },
  ]
  const shapC = margC.reduce((s, m) => s + m.marg, 0) / margC.length

  return { margA, margB, margC, shapA, shapB, shapC }
}

function fmtShap(x: number) { return (x >= 0 ? '+' : '') + x.toFixed(4) }

function MargTable({ name, margs, shapVal, colorClass, toyVals }: {
  name: string; margs: MargRow[]; shapVal: number; colorClass: string; toyVals: ToyValues
}) {
  return (
    <div className="flex-1 min-w-[180px] rounded-lg bg-cream-dark/60 dark:bg-night-card/60 p-3">
      <p className={`text-[12px] font-medium mb-1.5 ${colorClass}`}>
        SHAP({name}) = {fmtShap(shapVal)}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              <th className="text-left px-2 py-1 font-medium text-[13px] text-ink-subtle dark:text-night-muted border-b border-cream-border dark:border-night-border">
                Without {name}
              </th>
              <th className="text-left px-2 py-1 font-medium text-[13px] text-ink-subtle dark:text-night-muted border-b border-cream-border dark:border-night-border">
                With {name}
              </th>
              <th className="text-left px-2 py-1 font-medium text-[13px] text-ink-subtle dark:text-night-muted border-b border-cream-border dark:border-night-border">
                Marginal
              </th>
            </tr>
          </thead>
          <tbody>
            {margs.map((m, i) => (
              <tr key={i}>
                <td className="px-2 py-1 font-[family-name:var(--font-mono)] text-[12px] border-b border-cream-border/50 dark:border-night-border/50 text-ink dark:text-night-text">
                  f({m.sub}) = {toyVals[m.sub].toFixed(3)}
                </td>
                <td className="px-2 py-1 font-[family-name:var(--font-mono)] text-[12px] border-b border-cream-border/50 dark:border-night-border/50 text-ink dark:text-night-text">
                  f({m.with_}) = {toyVals[m.with_].toFixed(3)}
                </td>
                <td className={`px-2 py-1 font-[family-name:var(--font-mono)] text-[12px] font-medium border-b border-cream-border/50 dark:border-night-border/50 ${m.marg >= 0 ? 'text-red-600 dark:text-red-400' : 'text-sapphire dark:text-sapphire-dark'}`}>
                  {fmtShap(m.marg)}
                </td>
              </tr>
            ))}
            <tr>
              <td colSpan={2} className="px-2 py-1 font-medium text-[12px] border-t-2 border-cream-border dark:border-night-border text-ink dark:text-night-text">
                Average marginal
              </td>
              <td className={`px-2 py-1 font-[family-name:var(--font-mono)] text-[12px] font-medium border-t-2 border-cream-border dark:border-night-border ${colorClass}`}>
                {fmtShap(shapVal)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Section4() {
  const [sectionRef, visible] = useScrollReveal()
  const [toyVals, setToyVals] = useState<ToyValues>(generateToyValues)

  const { margA, margB, margC, shapA, shapB, shapC } = useMemo(
    () => computeShapley(toyVals), [toyVals]
  )

  const base = toyVals['{}']
  const shapSum = shapA + shapB + shapC

  return (
    <section
      ref={sectionRef as React.RefObject<HTMLElement>}
      aria-labelledby="shap-math"
      className={`py-8 transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <h2
        id="shap-math"
        className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl text-ink dark:text-night-text mb-3"
      >
        Shapley Value Math
      </h2>
      <p className="text-sm text-ink-subtle dark:text-night-muted mb-5 leading-relaxed">
        A Shapley value is computed by checking each feature{'\u2019'}s marginal contribution across ALL possible subsets
        of other features. This toy example with 3 features shows how it works.
      </p>

      <div className="flex gap-2.5 flex-wrap my-3">
        <MargTable name="A" margs={margA} shapVal={shapA} colorClass="text-red-600 dark:text-red-400" toyVals={toyVals} />
        <MargTable name="B" margs={margB} shapVal={shapB} colorClass="text-sapphire dark:text-sapphire-dark" toyVals={toyVals} />
        <MargTable name="C" margs={margC} shapVal={shapC} colorClass="text-green-600 dark:text-green-400" toyVals={toyVals} />
      </div>

      <div className="flex gap-2.5 flex-wrap my-2.5">
        <MetricCard label={'Baseline f({})'} value={base.toFixed(3)} />
        <MetricCard
          label={'\u03A3 SHAP'}
          value={fmtShap(shapSum)}
          colorClass={METRIC_COLORS.amber}
        />
        <MetricCard
          label="f({A,B,C})"
          value={toyVals['{A,B,C}'].toFixed(3)}
          colorClass={METRIC_COLORS.purple}
        />
        <MetricCard
          label={'Base + \u03A3 SHAP'}
          value={(base + shapSum).toFixed(3)}
          colorClass={METRIC_COLORS.purple}
        />
      </div>

      <div className="flex gap-1.5 flex-wrap my-2">
        <button
          type="button"
          onClick={() => setToyVals(generateToyValues())}
          className="px-4 py-1.5 rounded-lg text-[13px] font-medium border border-cream-border dark:border-night-border
            text-ink-subtle dark:text-night-muted hover:bg-cream-dark/60 dark:hover:bg-night-card/60 transition-colors"
        >
          New values
        </button>
      </div>

      <InsightBox>
        <strong>How it works:</strong> For feature A, we check all 4 subsets that DON{'\u2019'}T contain A, add A to each,
        and measure how much the prediction changes. Average those 4 marginal contributions = SHAP(A). Do the same for B
        and C. <strong>Efficiency check:</strong> baseline ({base.toFixed(3)}) + SHAP(A) + SHAP(B) + SHAP(C) ={' '}
        {(base + shapSum).toFixed(3)} = f({'{'}A,B,C{'}'}) ({toyVals['{A,B,C}'].toFixed(3)}). With 3 features, there are
        2{'\u00B3'} = 8 subsets to evaluate. With p features, 2^p {'\u2014'} that{'\u2019'}s why TreeSHAP (polynomial time
        for trees) and KernelSHAP (approximate for any model) exist.
      </InsightBox>
    </section>
  )
}

// ======================================================================
// MAIN EXPORT
// ======================================================================
export function SHAP() {
  const [instances, setInstances] = useState<Instance[]>(() => genInstances(200))

  const regenerate = useCallback(() => {
    setInstances(genInstances(200))
  }, [])

  return (
    <div className="mx-auto max-w-5xl px-6 sm:px-10 lg:px-12">
      {/* Title */}
      <div className="text-center mb-16">
        <p className="font-[family-name:var(--font-mono)] text-[13px] tracking-[0.3em] uppercase mb-4 text-peach dark:text-peach-dark">
          06/
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl text-ink dark:text-night-text mb-4">
          SHAP / Interpretability
        </h1>
        <p className="text-[15px] text-ink-subtle dark:text-night-muted">
          4 concepts {'\u00B7'} Explore how features push predictions
        </p>
        <div className="mt-4 h-px w-16 mx-auto bg-mauve dark:bg-mauve-dark" />
      </div>

      {/* Section 1 */}
      <Section1 instances={instances} regenerate={regenerate} />

      <div className="py-12 [&>div]:mb-0">
        <SectionDivider absolute={false} />
      </div>

      {/* Section 2 */}
      <Section2 instances={instances} regenerate={regenerate} />

      <div className="py-12 [&>div]:mb-0">
        <SectionDivider absolute={false} />
      </div>

      {/* Section 3 */}
      <Section3 instances={instances} regenerate={regenerate} />

      <div className="py-12 [&>div]:mb-0">
        <SectionDivider absolute={false} />
      </div>

      {/* Section 4 */}
      <Section4 />
    </div>
  )
}
