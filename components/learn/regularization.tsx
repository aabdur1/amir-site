'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useScrollReveal } from '@/lib/hooks'
import { SectionDivider } from '@/components/section-divider'

// --- Constants ---
const FEATURES = ['income', 'age', 'debt', 'tenure', 'score', 'history']
const TRUE_COEFF = [2.8, 1.9, -1.5, 0.8, 0.3, 0.05]
const MAX_ABS = Math.max(...TRUE_COEFF.map(Math.abs))

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

// --- Math helpers ---
function shrink(b: number, lam: number, type: 'ridge' | 'lasso'): number {
  if (type === 'ridge') {
    return b / (1 + lam)
  } else {
    const sign = b >= 0 ? 1 : -1
    const abs = Math.abs(b)
    return sign * Math.max(0, abs - lam * 0.5)
  }
}

function computeErrors(lam: number) {
  const bias = 0.12 + 0.88 * (1 - Math.exp(-lam * 0.8))
  const variance = 0.9 * Math.exp(-lam * 0.6) + 0.05
  const trainErr = bias
  const testErr = bias + variance * 0.5
  return { trainErr, testErr, bias, variance }
}

// --- Shared sub-components ---
function MetricCard({ label, value, colorClass }: { label: string; value: string; colorClass?: string }) {
  return (
    <div className="flex-1 min-w-[80px] rounded-lg bg-cream-dark/60 dark:bg-night-card/60 px-3 py-2">
      <div className="text-[10px] text-ink-subtle dark:text-night-muted">{label}</div>
      <div
        className={`font-[family-name:var(--font-mono)] text-[15px] font-medium mt-0.5 ${colorClass ?? 'text-ink dark:text-night-text'}`}
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
    <div className="mt-3 rounded-lg bg-sapphire/10 dark:bg-sapphire-dark/10 px-3 py-2.5 text-[12px] leading-relaxed text-sapphire dark:text-sapphire-dark">
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
// SECTION 1: Coefficient Shrinkage
// ======================================================================
function Section1() {
  const [sectionRef, visible] = useScrollReveal()
  const [penaltyType, setPenaltyType] = useState<'ridge' | 'lasso'>('ridge')
  const [lambdaRaw, setLambdaRaw] = useState(10)

  const lambda = (lambdaRaw / 100) * 3.0
  const coeffs = TRUE_COEFF.map(b => shrink(b, lambda, penaltyType))
  const zeroCount = coeffs.filter(c => Math.abs(c) < 0.001).length
  const activeCount = coeffs.filter(c => Math.abs(c) >= 0.001).length

  // Insight text
  let insight: React.ReactNode
  if (lambda < 0.05) {
    insight = (
      <>
        <strong>{'\u03BB'} {'\u2248'} 0:</strong> No regularization. Coefficients at their full OLS/MLE values.
        Low bias, high variance — the model memorizes training noise.
      </>
    )
  } else if (lambda < 0.6) {
    insight = (
      <>
        <strong>Mild regularization:</strong> Coefficients are slightly shrunk.
        {penaltyType === 'lasso'
          ? ' Lasso is beginning to zero out the weakest predictors.'
          : ' Ridge dampens all coefficients proportionally.'
        }
        {' '}This is the sweet spot zone — variance drops faster than bias increases.
      </>
    )
  } else if (lambda < 1.5) {
    insight = (
      <>
        <strong>Moderate regularization:</strong> Coefficients noticeably smaller.{' '}
        {penaltyType === 'lasso'
          ? 'Lasso has zeroed out weak predictors (score, history) — automatic feature selection.'
          : 'Ridge keeps all variables but they are dampened.'
        }
        {' '}Train and test error are closer together (less overfitting) but both are rising.
      </>
    )
  } else {
    insight = (
      <>
        <strong>Heavy regularization:</strong>{' '}
        {penaltyType === 'lasso'
          ? 'Most coefficients are zero — only the strongest survive.'
          : 'All coefficients are tiny.'
        }
        {' '}High bias, low variance. The model is too constrained — it is underfitting.
      </>
    )
  }

  // Zero note text
  let zeroNote: string | null = null
  if (penaltyType === 'lasso' && zeroCount > 0) {
    zeroNote = `${zeroCount} coefficient${zeroCount > 1 ? 's' : ''} driven to exactly zero — Lasso performed feature selection`
  } else if (penaltyType === 'ridge' && lambda > 0.5) {
    zeroNote = 'Ridge shrinks toward zero but never reaches it — all variables remain'
  }

  return (
    <section
      ref={sectionRef as React.RefObject<HTMLElement>}
      aria-labelledby="reg-shrinkage"
      className={`transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <h2
        id="reg-shrinkage"
        className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl text-ink dark:text-night-text mb-2"
      >
        Coefficient Shrinkage
      </h2>
      <p className="text-[13px] text-ink-subtle dark:text-night-muted mb-4">
        Toggle Ridge vs Lasso and drag {'\u03BB'} to see how each penalty shrinks coefficients differently.
      </p>

      {/* Ridge / Lasso toggle */}
      <div className="flex gap-1.5 mb-4">
        <button
          type="button"
          onClick={() => setPenaltyType('ridge')}
          className={`px-3.5 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150
            border ${penaltyType === 'ridge'
              ? 'bg-sapphire/10 dark:bg-sapphire-dark/10 text-sapphire dark:text-sapphire-dark border-sapphire/25 dark:border-sapphire-dark/25'
              : 'bg-white dark:bg-night-card/60 text-ink-subtle dark:text-night-muted border-ink/[0.08] dark:border-white/[0.08] hover:bg-cream-dark/60 dark:hover:bg-night-card/80'
            }`}
        >
          Ridge (L2)
        </button>
        <button
          type="button"
          onClick={() => setPenaltyType('lasso')}
          className={`px-3.5 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150
            border ${penaltyType === 'lasso'
              ? 'bg-sapphire/10 dark:bg-sapphire-dark/10 text-sapphire dark:text-sapphire-dark border-sapphire/25 dark:border-sapphire-dark/25'
              : 'bg-white dark:bg-night-card/60 text-ink-subtle dark:text-night-muted border-ink/[0.08] dark:border-white/[0.08] hover:bg-cream-dark/60 dark:hover:bg-night-card/80'
            }`}
        >
          Lasso (L1)
        </button>
      </div>

      {/* Lambda slider */}
      <div className="flex items-center gap-3 mt-2 mb-1">
        <label
          htmlFor="lambda-slider"
          className="text-[13px] text-ink-subtle dark:text-night-muted min-w-[20px]"
        >
          {'\u03BB'}
        </label>
        <input
          id="lambda-slider"
          type="range"
          min={0}
          max={100}
          step={1}
          value={lambdaRaw}
          onChange={(e) => setLambdaRaw(parseInt(e.target.value))}
          aria-valuetext={`lambda = ${lambda.toFixed(2)}`}
          className="flex-1"
        />
        <span className="font-[family-name:var(--font-mono)] text-[13px] font-medium min-w-[44px] text-right text-ink dark:text-night-text">
          {lambda.toFixed(2)}
        </span>
      </div>
      <div className="flex justify-between text-[11px] text-ink-faint dark:text-night-muted/60 px-[23px] pr-[56px] mb-4">
        <span>0 (no penalty)</span>
        <span>heavy penalty</span>
      </div>

      {/* Coefficient bars */}
      <p className="text-[12px] font-medium text-ink-subtle dark:text-night-muted mb-2">
        Coefficient magnitudes
      </p>
      <div className="flex gap-2 flex-wrap mb-1">
        {FEATURES.map((feat, i) => {
          const c = coeffs[i]
          const orig = TRUE_COEFF[i]
          const hPct = (Math.abs(c) / MAX_ABS) * 100
          const origHPct = (Math.abs(orig) / MAX_ABS) * 100
          const isZero = Math.abs(c) < 0.001
          const barColor = isZero
            ? 'var(--color-ink-faint, #8888aa)'
            : c > 0
              ? 'var(--color-sapphire, #209fb5)'
              : 'var(--color-red, #d20f39)'
          return (
            <div key={feat} className="flex-1 min-w-[70px] max-w-[120px]">
              <div className="text-[11px] text-ink-subtle dark:text-night-muted text-center mb-1">
                {feat}
              </div>
              <div className="h-[120px] bg-cream-dark/60 dark:bg-night-card/60 rounded-lg relative overflow-hidden flex items-end justify-center">
                {/* Original coefficient ghost */}
                <div
                  className="absolute bottom-0 w-[60%] left-[20%] rounded-t border border-dashed border-ink/[0.12] dark:border-white/[0.1] opacity-40"
                  style={{ height: `${origHPct}%` }}
                />
                {/* Current coefficient bar */}
                <div
                  className="w-[60%] rounded-t transition-all duration-300"
                  style={{
                    height: `${Math.max(hPct, 0.5)}%`,
                    background: barColor,
                    opacity: isZero ? 0.3 : 1,
                  }}
                />
              </div>
              <div
                className={`font-[family-name:var(--font-mono)] text-[11px] text-center mt-1 ${
                  isZero
                    ? 'text-amber-600 dark:text-amber-300 font-medium'
                    : 'text-ink-subtle dark:text-night-muted'
                }`}
              >
                {isZero ? '0' : c.toFixed(2)}
              </div>
            </div>
          )
        })}
      </div>

      {/* Zero note */}
      {zeroNote && (
        <p className="text-[11px] text-amber-600 dark:text-amber-300 mt-1">
          {zeroNote}
        </p>
      )}

      {/* Metrics */}
      <div className="flex gap-2.5 flex-wrap my-3">
        <MetricCard label="Penalty type" value={penaltyType === 'ridge' ? 'Ridge (L2)' : 'Lasso (L1)'} colorClass={METRIC_COLORS.purple} />
        <MetricCard label={'\u03BB value'} value={lambda.toFixed(2)} />
        <MetricCard label="Active features" value={`${activeCount}/${FEATURES.length}`} colorClass={activeCount === FEATURES.length ? METRIC_COLORS.green : METRIC_COLORS.amber} />
      </div>

      <InsightBox>{insight}</InsightBox>
    </section>
  )
}

// ======================================================================
// SECTION 2: Bias-Variance Tradeoff
// ======================================================================
function Section2() {
  const [sectionRef, visible] = useScrollReveal()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [lambdaRaw, setLambdaRaw] = useState(10)

  const lambda = (lambdaRaw / 100) * 3.0
  const { trainErr, testErr } = computeErrors(lambda)
  const gap = testErr - trainErr
  const coeffs = TRUE_COEFF.map(b => shrink(b, lambda, 'ridge'))
  const activeCount = coeffs.filter(c => Math.abs(c) >= 0.001).length

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const result = setupCanvas(canvas, 220)
    if (!result) return
    const { ctx, W, H } = result
    const c = getThemeColors()

    const pad = { l: 40, r: 16, t: 12, b: 28 }
    const pw = W - pad.l - pad.r
    const ph = H - pad.t - pad.b
    const maxLam = 3.0
    const maxErr = 1.2

    function xPos(lam: number) { return pad.l + (lam / maxLam) * pw }
    function yPos(err: number) { return pad.t + (1 - err / maxErr) * ph }

    // Axes
    ctx.strokeStyle = c.axis
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(pad.l, pad.t)
    ctx.lineTo(pad.l, H - pad.b)
    ctx.lineTo(W - pad.r, H - pad.b)
    ctx.stroke()

    // Axis labels
    ctx.font = '11px sans-serif'
    ctx.fillStyle = c.subtext
    ctx.textAlign = 'center'
    ctx.fillText('\u03BB \u2192', W / 2, H - 4)
    ctx.save()
    ctx.translate(12, H / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText('Error', 0, 0)
    ctx.restore()

    // Grid lines
    ctx.strokeStyle = c.grid
    ctx.lineWidth = 0.5
    for (let v = 0; v <= maxErr; v += 0.2) {
      ctx.beginPath()
      ctx.moveTo(pad.l, yPos(v))
      ctx.lineTo(W - pad.r, yPos(v))
      ctx.stroke()
    }

    // Compute points
    const N = 100
    const trainPts: Array<{ x: number; y: number }> = []
    const testPts: Array<{ x: number; y: number }> = []
    for (let i = 0; i <= N; i++) {
      const l = (i / N) * maxLam
      const { trainErr: te, testErr: tse } = computeErrors(l)
      trainPts.push({ x: xPos(l), y: yPos(te) })
      testPts.push({ x: xPos(l), y: yPos(tse) })
    }

    // Gap shading between curves
    ctx.fillStyle = c.green
    ctx.globalAlpha = 0.06
    ctx.beginPath()
    ctx.moveTo(trainPts[0].x, trainPts[0].y)
    for (let i = 1; i <= N; i++) ctx.lineTo(trainPts[i].x, trainPts[i].y)
    for (let i = N; i >= 0; i--) ctx.lineTo(testPts[i].x, testPts[i].y)
    ctx.closePath()
    ctx.fill()
    ctx.globalAlpha = 1

    // Draw curves
    function drawCurve(pts: Array<{ x: number; y: number }>, color: string) {
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
      ctx.stroke()
    }
    drawCurve(trainPts, c.blue)
    drawCurve(testPts, c.red)

    // Current lambda marker
    const { trainErr: curTrain, testErr: curTest } = computeErrors(lambda)
    const cx = xPos(lambda)

    // Dashed vertical line at current lambda
    ctx.setLineDash([4, 4])
    ctx.strokeStyle = c.axis
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(cx, pad.t)
    ctx.lineTo(cx, H - pad.b)
    ctx.stroke()
    ctx.setLineDash([])

    // Dots on curves
    ctx.fillStyle = c.blue
    ctx.beginPath()
    ctx.arc(cx, yPos(curTrain), 5, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = c.red
    ctx.beginPath()
    ctx.arc(cx, yPos(curTest), 5, 0, Math.PI * 2)
    ctx.fill()

    // Gap indicator bar
    ctx.fillStyle = c.green
    ctx.globalAlpha = 0.15
    ctx.beginPath()
    ctx.rect(cx, yPos(curTest), 8, yPos(curTrain) - yPos(curTest))
    ctx.fill()
    ctx.globalAlpha = 1

    // Gap label
    const gapMid = yPos((curTrain + curTest) / 2)
    ctx.fillStyle = c.green
    ctx.font = '500 11px sans-serif'
    ctx.textAlign = 'left'
    const gapVal = curTest - curTrain
    ctx.fillText('gap=' + gapVal.toFixed(2), cx + 12, gapMid + 3)

    // Optimal lambda (min test error)
    let optLam = 0
    let optErr = 999
    for (let i = 0; i <= 300; i++) {
      const l = (i / 300) * maxLam
      const e = computeErrors(l).testErr
      if (e < optErr) { optErr = e; optLam = l }
    }
    const optX = xPos(optLam)

    // Zone labels
    ctx.font = '11px sans-serif'
    ctx.fillStyle = c.subtext
    ctx.globalAlpha = 0.7
    ctx.textAlign = 'center'
    if (optX - pad.l > 50) ctx.fillText('overfit zone', pad.l + (optX - pad.l) / 2, pad.t + 16)
    if (W - pad.r - optX > 50) ctx.fillText('underfit zone', optX + (W - pad.r - optX) / 2, pad.t + 16)
    ctx.globalAlpha = 1
  }, [lambda])

  useEffect(() => { draw() }, [draw])
  useDarkModeObserver(draw)
  useCanvasResize(canvasRef, draw)

  // Insight text
  let insight: React.ReactNode
  if (lambda < 0.05) {
    insight = (
      <>
        <strong>{'\u03BB'} {'\u2248'} 0:</strong> No regularization. Low bias, high variance — the gap between
        train and test error is large (overfitting). The model fits training noise.
      </>
    )
  } else if (lambda < 0.6) {
    insight = (
      <>
        <strong>Sweet spot:</strong> Variance reduction outweighs the bias increase. Test error is at or near its minimum.
        The curves are converging — the model generalizes well.
      </>
    )
  } else if (lambda < 1.5) {
    insight = (
      <>
        <strong>Moderate {'\u03BB'}:</strong> Train and test error are close (low variance) but both are rising.
        Bias is increasing — the model is too constrained to capture the true pattern.
      </>
    )
  } else {
    insight = (
      <>
        <strong>Heavy {'\u03BB'}:</strong> Both errors are high and nearly equal. Very low variance but very high bias.
        The model essentially predicts a constant — it is underfitting.
      </>
    )
  }

  return (
    <section
      ref={sectionRef as React.RefObject<HTMLElement>}
      aria-labelledby="reg-bias-variance"
      className={`py-8 transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <h2
        id="reg-bias-variance"
        className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl text-ink dark:text-night-text mb-2"
      >
        Bias-Variance Tradeoff
      </h2>
      <p className="text-[13px] text-ink-subtle dark:text-night-muted mb-4">
        As {'\u03BB'} increases, bias rises and variance falls. The test error curve reveals the optimal balance.
      </p>

      {/* Canvas chart */}
      <div className="rounded-lg border border-ink/[0.08] dark:border-white/[0.08] bg-white dark:bg-night-card/40 p-3">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Bias-variance tradeoff chart showing train error and test error curves against lambda"
          className="w-full rounded"
          style={{ height: 220 }}
        />
      </div>

      {/* Legend */}
      <div className="flex gap-4 justify-center mt-2 text-[12px] text-ink-subtle dark:text-night-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-[3px] rounded-sm bg-sapphire dark:bg-sapphire-dark" />
          Train error (bias)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-[3px] rounded-sm bg-red-500 dark:bg-red-400" />
          Test error
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500 dark:bg-green-400 opacity-70" />
          Current {'\u03BB'}
        </span>
      </div>

      {/* Lambda slider */}
      <div className="flex items-center gap-3 mt-4 mb-1">
        <label
          htmlFor="bv-lambda-slider"
          className="text-[13px] text-ink-subtle dark:text-night-muted min-w-[20px]"
        >
          {'\u03BB'}
        </label>
        <input
          id="bv-lambda-slider"
          type="range"
          min={0}
          max={100}
          step={1}
          value={lambdaRaw}
          onChange={(e) => setLambdaRaw(parseInt(e.target.value))}
          aria-valuetext={`lambda = ${lambda.toFixed(2)}`}
          className="flex-1"
        />
        <span className="font-[family-name:var(--font-mono)] text-[13px] font-medium min-w-[44px] text-right text-ink dark:text-night-text">
          {lambda.toFixed(2)}
        </span>
      </div>
      <div className="flex justify-between text-[11px] text-ink-faint dark:text-night-muted/60 px-[23px] pr-[56px] mb-3">
        <span>0 (no penalty)</span>
        <span>heavy penalty</span>
      </div>

      {/* Metrics */}
      <div className="flex gap-2.5 flex-wrap my-2.5">
        <MetricCard label="Train error" value={trainErr.toFixed(3)} colorClass={METRIC_COLORS.blue} />
        <MetricCard label="Test error" value={testErr.toFixed(3)} colorClass={METRIC_COLORS.red} />
        <MetricCard label="Gap (variance)" value={gap.toFixed(3)} colorClass={METRIC_COLORS.green} />
        <MetricCard label="Active features" value={`${activeCount}/${FEATURES.length}`} />
      </div>

      <InsightBox>{insight}</InsightBox>
    </section>
  )
}

// ======================================================================
// EXPORT: Regularization
// ======================================================================
export function Regularization() {
  return (
    <div>
      {/* Title */}
      <div className="text-center mb-12">
        <p className="font-[family-name:var(--font-mono)] text-[13px] tracking-[0.3em] uppercase mb-4 text-peach dark:text-peach-dark">
          04/
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl text-ink dark:text-night-text mb-4">
          Regularization / Bias-Variance
        </h1>
        <p className="text-[15px] text-ink-subtle dark:text-night-muted">
          2 concepts {'\u00B7'} Toggle Ridge vs Lasso and drag {'\u03BB'}
        </p>
        <div className="mt-4 h-px w-16 mx-auto bg-mauve dark:bg-mauve-dark" />
      </div>

      {/* Section 1 */}
      <Section1 />

      <div className="relative py-8">
        <SectionDivider absolute={false} />
      </div>

      {/* Section 2 — alternating bg */}
      <div className="rounded-xl bg-cream-dark/50 dark:bg-night-card/40 px-4 sm:px-6 -mx-4 sm:-mx-6">
        <Section2 />
      </div>
    </div>
  )
}
