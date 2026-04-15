'use client'

import { useState, useRef, useEffect, useMemo, type PointerEvent as ReactPointerEvent } from 'react'
import Link from 'next/link'
import { SectionDivider } from '@/components/section-divider'
import { useScrollReveal } from '@/lib/hooks'

// --- Theme helper ---
function getThemeColors() {
  const root = document.documentElement
  const isDark = root.classList.contains('dark')
  return {
    text:     isDark ? '#cdd6f4' : '#4c4f69',
    subtext:  isDark ? '#a6adc8' : '#5c5f77',
    surface:  isDark ? '#313244' : '#ccd0da',
    base:     isDark ? '#1e1e2e' : '#eff1f5',
    mantle:   isDark ? '#181825' : '#e6e9ef',
    grid:     isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    axis:     isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.10)',
    teal:     isDark ? '#94e2d5' : '#179299',
    mauve:    isDark ? '#cba6f7' : '#8839ef',
    peach:    isDark ? '#fab387' : '#fe640b',
    sapphire: isDark ? '#74c7ec' : '#209fb5',
    lavender: isDark ? '#b4befe' : '#7287fd',
    red:      isDark ? '#f38ba8' : '#d20f39',
    green:    isDark ? '#a6e3a1' : '#40a02b',
    amber:    isDark ? '#f9e2af' : '#df8e1d',
  }
}

// --- Canvas setup helper (DPR scaling) ---
function setupCanvas(canvas: HTMLCanvasElement, height: number) {
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

// --- Activation functions ---
type Activation = 'sigmoid' | 'tanh' | 'relu' | 'linear'

function activate(net: number, act: Activation): number {
  switch (act) {
    case 'sigmoid': return 1 / (1 + Math.exp(-net))
    case 'tanh':    return Math.tanh(net)
    case 'relu':    return Math.max(0, net)
    case 'linear':  return net
  }
}

function activationDerivative(net: number, act: Activation): number {
  switch (act) {
    case 'sigmoid': { const s = activate(net, 'sigmoid'); return s * (1 - s) }
    case 'tanh':    { const t = Math.tanh(net); return 1 - t * t }
    case 'relu':    return net > 0 ? 1 : 0
    case 'linear':  return 1
  }
}

// --- Reusable slider row (used across sections) ---
function SliderRow({ label, min, max, step, value, onChange }: {
  label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void
}) {
  return (
    <label className="flex items-center gap-3 mb-2">
      <span className="w-8 text-[12px] font-[family-name:var(--font-mono)] text-ink-subtle dark:text-night-muted">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="flex-1 accent-teal dark:accent-teal-dark"
      />
      <span className="w-12 text-right text-[12px] font-[family-name:var(--font-mono)] text-ink dark:text-night-text">{value.toFixed(2)}</span>
    </label>
  )
}

// --- Drawing helpers for Section 1 ---
function drawActivationInset(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
  act: Activation, currentNet: number, c: ReturnType<typeof getThemeColors>,
) {
  ctx.save()
  ctx.translate(x, y)
  ctx.strokeStyle = c.axis; ctx.lineWidth = 1
  ctx.strokeRect(0, 0, w, h)
  ctx.strokeStyle = c.teal; ctx.lineWidth = 1.5
  ctx.beginPath()
  for (let i = 0; i <= 60; i++) {
    const u = -3 + (6 * i) / 60
    const v = activate(u, act)
    const px = (i / 60) * w
    const yMin = act === 'sigmoid' || act === 'relu' ? 0 : -1.2
    const yMax = act === 'sigmoid' ? 1 : (act === 'relu' ? 3 : 1.2)
    const py = h - ((v - yMin) / (yMax - yMin)) * h
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
  }
  ctx.stroke()
  const clamped = Math.max(-3, Math.min(3, currentNet))
  const mx = ((clamped + 3) / 6) * w
  ctx.fillStyle = c.peach
  ctx.beginPath(); ctx.arc(mx, h - 4, 3, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
}

function drawOutputBar(
  ctx: CanvasRenderingContext2D, cx: number, cy: number, halfH: number,
  value: number, act: Activation, c: ReturnType<typeof getThemeColors>,
) {
  const min = act === 'sigmoid' || act === 'relu' ? 0 : -1
  const max = act === 'sigmoid' ? 1 : (act === 'relu' ? 3 : 1)
  const norm = (value - min) / (max - min)
  const barH = halfH * 2
  ctx.fillStyle = c.surface
  ctx.fillRect(cx - 8, cy - halfH, 16, barH)
  const baselineY = act === 'tanh' || act === 'linear' ? cy : cy + halfH
  const fillY = cy + halfH - norm * barH
  ctx.fillStyle = c.teal
  ctx.fillRect(cx - 8, Math.min(baselineY, fillY), 16, Math.abs(fillY - baselineY))
  ctx.strokeStyle = c.axis; ctx.lineWidth = 1
  ctx.strokeRect(cx - 8, cy - halfH, 16, barH)
}

// --- Drawing helpers for Section 3 ---
function drawCurves(
  canvas: HTMLCanvasElement | null,
  fn: (u: number, a: Activation) => number,
  yRange: [number, number],
  highlighted: Activation,
  c: ReturnType<typeof getThemeColors>,
) {
  if (!canvas) return
  const setup = setupCanvas(canvas, 180); if (!setup) return
  const { ctx, W, H } = setup
  ctx.strokeStyle = c.axis; ctx.lineWidth = 1
  const yZero = H * (yRange[1] / (yRange[1] - yRange[0]))
  ctx.beginPath(); ctx.moveTo(0, yZero); ctx.lineTo(W, yZero); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke()

  const series: Array<{ a: Activation; color: string }> = [
    { a: 'sigmoid', color: c.mauve },
    { a: 'tanh',    color: c.sapphire },
    { a: 'relu',    color: c.teal },
  ]
  series.forEach(({ a, color }) => {
    ctx.strokeStyle = color
    ctx.globalAlpha = a === highlighted ? 1 : 0.35
    ctx.lineWidth = a === highlighted ? 2.5 : 1.5
    ctx.beginPath()
    for (let i = 0; i <= 200; i++) {
      const u = -4 + (8 * i) / 200
      const v = fn(u, a)
      const px = (i / 200) * W
      const py = H - ((v - yRange[0]) / (yRange[1] - yRange[0])) * H
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
    }
    ctx.stroke()
  })
  ctx.globalAlpha = 1
}

function maxDeriv(a: Activation): number {
  if (a === 'sigmoid') return 0.25
  if (a === 'tanh')    return 1.0
  if (a === 'relu')    return 1.0
  return 1.0 // linear
}

function drawStack(
  canvas: HTMLCanvasElement | null, depth: number, act: Activation, c: ReturnType<typeof getThemeColors>,
) {
  if (!canvas) return
  const setup = setupCanvas(canvas, 120); if (!setup) return
  const { ctx, W, H } = setup
  const m = maxDeriv(act)
  const barW = (W - 40) / depth
  const baseY = H - 30
  const maxBarH = baseY - 10
  let g = 1
  for (let i = 0; i < depth; i++) {
    g *= m
    const h = Math.max(2, g * maxBarH)
    const x = 20 + i * barW
    ctx.fillStyle = c.teal
    ctx.globalAlpha = 0.8
    ctx.fillRect(x, baseY - h, barW * 0.7, h)
    ctx.globalAlpha = 1
    ctx.fillStyle = c.subtext
    ctx.font = '10px var(--font-mono), monospace'
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'
    ctx.fillText(`L${i+1}`, x + barW * 0.35, baseY + 4)
  }
  ctx.fillStyle = c.text
  ctx.font = '13px var(--font-mono), monospace'
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle'
  ctx.fillText(`gradient ≈ ${g.toExponential(2)}`, W - 10, 14)
}

// --- Section placeholders (filled in subsequent tasks) ---
function Section1() {
  const [sectionRef, visible] = useScrollReveal()
  const [inputs, setInputs] = useState<[number, number, number]>([0.5, -0.3, 0.8])
  const [weights, setWeights] = useState<[number, number, number]>([0.7, -0.4, 0.5])
  const [bias, setBias] = useState(0.1)
  const [activation, setActivation] = useState<Activation>('sigmoid')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [themeTick, setThemeTick] = useState(0)

  // Re-draw on theme toggle
  useEffect(() => {
    const obs = new MutationObserver(() => setThemeTick(t => t + 1))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  const net = inputs[0] * weights[0] + inputs[1] * weights[1] + inputs[2] * weights[2] + bias
  const out = activate(net, activation)

  // Drawing
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const setup = setupCanvas(canvas, 320)
    if (!setup) return
    const { ctx, W, H } = setup
    const c = getThemeColors()

    // Layout
    const inputXs = 60
    const neuronX = W * 0.5
    const outputX = W - 80
    const inputYs = [H * 0.25, H * 0.5, H * 0.75]
    const neuronY = H * 0.5
    const nodeR = 18

    // Draw edges (width = |w*x|, color = sign of w*x)
    inputs.forEach((x, i) => {
      const contrib = x * weights[i]
      const w = Math.max(1, Math.min(8, Math.abs(contrib) * 6))
      ctx.strokeStyle = contrib >= 0 ? c.teal : c.red
      ctx.globalAlpha = 0.7
      ctx.lineWidth = w
      ctx.beginPath()
      ctx.moveTo(inputXs + nodeR, inputYs[i])
      ctx.lineTo(neuronX - nodeR, neuronY)
      ctx.stroke()
    })
    ctx.globalAlpha = 1

    // Input nodes
    inputs.forEach((x, i) => {
      ctx.fillStyle = c.surface
      ctx.beginPath(); ctx.arc(inputXs, inputYs[i], nodeR, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = c.axis; ctx.lineWidth = 1; ctx.stroke()
      ctx.fillStyle = c.text
      ctx.font = '13px var(--font-mono), monospace'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(x.toFixed(2), inputXs, inputYs[i])
      ctx.fillStyle = c.subtext
      ctx.font = '11px var(--font-mono), monospace'
      const midX = (inputXs + neuronX) / 2
      const midY = (inputYs[i] + neuronY) / 2 - 8
      ctx.fillText(`w=${weights[i].toFixed(2)}`, midX, midY)
    })

    // Neuron node
    ctx.fillStyle = c.mantle
    ctx.beginPath(); ctx.arc(neuronX, neuronY, nodeR + 6, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = c.teal; ctx.lineWidth = 2; ctx.stroke()
    ctx.fillStyle = c.text
    ctx.font = '14px var(--font-display), serif'
    ctx.fillText('Σ', neuronX, neuronY - 2)
    ctx.fillStyle = c.peach
    ctx.font = '11px var(--font-mono), monospace'
    ctx.fillText(`b=${bias.toFixed(2)}`, neuronX, neuronY + nodeR + 18)
    ctx.fillStyle = c.subtext
    ctx.fillText(`net=${net.toFixed(2)}`, neuronX, neuronY - nodeR - 14)

    // Inset + output bar
    drawActivationInset(ctx, neuronX + 50, neuronY - 70, 90, 50, activation, net, c)
    drawOutputBar(ctx, outputX, neuronY, 50, out, activation, c)

    // Output value text
    ctx.fillStyle = c.text
    ctx.font = '14px var(--font-mono), monospace'
    ctx.textAlign = 'left'
    ctx.fillText(`y=${out.toFixed(3)}`, outputX - 18, neuronY + 50)
  }, [inputs, weights, bias, activation, net, out, themeTick])

  return (
    <section ref={sectionRef} aria-labelledby="nn-section-1" className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="text-center mb-8">
        <p className="font-[family-name:var(--font-mono)] text-[12px] tracking-[0.3em] uppercase text-teal dark:text-teal-dark">01/</p>
        <h2 id="nn-section-1" className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl text-ink dark:text-night-text mt-2">Anatomy of a neuron</h2>
        <p className="mt-3 text-[14px] text-ink-subtle dark:text-night-muted max-w-xl mx-auto">
          Inputs are weighted, summed with a bias, then squashed by an activation function. Drag the sliders to feel how each piece contributes.
        </p>
      </div>

      <canvas ref={canvasRef} className="w-full bg-cream-dark/30 dark:bg-night-card/40 rounded-lg" style={{ height: 320 }} />

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <p className="text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-ink-subtle dark:text-night-muted mb-3">Inputs</p>
          {[0,1,2].map(i => (
            <SliderRow key={i} label={`x${i+1}`} min={-1} max={1} step={0.01} value={inputs[i]}
              onChange={(v) => setInputs(prev => { const next = [...prev] as [number,number,number]; next[i] = v; return next })} />
          ))}
        </div>
        <div>
          <p className="text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-ink-subtle dark:text-night-muted mb-3">Weights</p>
          {[0,1,2].map(i => (
            <SliderRow key={i} label={`w${i+1}`} min={-2} max={2} step={0.01} value={weights[i]}
              onChange={(v) => setWeights(prev => { const next = [...prev] as [number,number,number]; next[i] = v; return next })} />
          ))}
        </div>
        <div>
          <p className="text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-ink-subtle dark:text-night-muted mb-3">Bias & activation</p>
          <SliderRow label="b" min={-2} max={2} step={0.01} value={bias} onChange={setBias} />
          <label className="block mt-4">
            <span className="text-[12px] text-ink-subtle dark:text-night-muted">Activation</span>
            <select
              value={activation}
              onChange={e => setActivation(e.target.value as Activation)}
              className="mt-1 w-full bg-cream dark:bg-night-card border border-cream-border dark:border-night-border rounded px-3 py-2 text-[13px] font-[family-name:var(--font-mono)]"
            >
              <option value="sigmoid">Sigmoid</option>
              <option value="tanh">Tanh</option>
              <option value="relu">ReLU</option>
              <option value="linear">Linear</option>
            </select>
          </label>
        </div>
      </div>

      <p className="sr-only">Current neuron output: {out.toFixed(3)} using {activation} activation, with pre-activation net {net.toFixed(3)}.</p>
    </section>
  )
}
function Section2() {
  const [sectionRef, visible] = useScrollReveal()
  const [hidden, setHidden] = useState(false)
  const [line1, setLine1] = useState({ a: { x: 0.05, y: 0.5 }, b: { x: 0.95, y: 0.5 } })
  const [line2, setLine2] = useState({ a: { x: 0.5, y: 0.05 }, b: { x: 0.5, y: 0.95 } })
  const [dragging, setDragging] = useState<{ which: 1 | 2; end: 'a' | 'b' } | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [themeTick, setThemeTick] = useState(0)

  useEffect(() => {
    const obs = new MutationObserver(() => setThemeTick(t => t + 1))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  // 4 XOR points (canvas y grows downward — top corners = label "1", bottom = label "0")
  // Class A = (0,0), (1,1); Class B = (0,1), (1,0)
  const points = useMemo(() => [
    { x: 0.15, y: 0.85, cls: 'A' as const }, // (0,0)
    { x: 0.85, y: 0.15, cls: 'A' as const }, // (1,1)
    { x: 0.15, y: 0.15, cls: 'B' as const }, // (0,1)
    { x: 0.85, y: 0.85, cls: 'B' as const }, // (1,0)
  ], [])

  function sideOf(line: typeof line1, p: { x: number; y: number }) {
    const dx = line.b.x - line.a.x
    const dy = line.b.y - line.a.y
    return Math.sign((p.x - line.a.x) * dy - (p.y - line.a.y) * dx)
  }

  function classifyPoint(p: { x: number; y: number }) {
    if (!hidden) {
      return sideOf(line1, p) >= 0 ? 'A' : 'B'
    }
    const s1 = sideOf(line1, p) >= 0
    const s2 = sideOf(line2, p) >= 0
    // Two-layer XOR-style combinator: predict A when both lines agree on sign,
    // B when they disagree. This is the canonical 2-layer-network solution to XOR
    // (one hidden neuron per line, output layer composes them as XNOR).
    return (s1 === s2) ? 'A' : 'B'
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const setup = setupCanvas(canvas, 380); if (!setup) return
    const { ctx, W, H } = setup
    const c = getThemeColors()

    // 1. Region tinting (low-resolution sampled grid)
    const cells = 60
    for (let i = 0; i < cells; i++) {
      for (let j = 0; j < cells; j++) {
        const px = (i + 0.5) / cells
        const py = (j + 0.5) / cells
        const pred = classifyPoint({ x: px, y: py })
        ctx.fillStyle = pred === 'A' ? `${c.teal}22` : `${c.peach}22`
        ctx.fillRect(i * (W / cells), j * (H / cells), W / cells + 1, H / cells + 1)
      }
    }

    // 2. Points
    points.forEach(p => {
      const cx = p.x * W, cy = p.y * H
      const pred = classifyPoint(p)
      const correct = pred === p.cls
      ctx.fillStyle = p.cls === 'A' ? c.teal : c.peach
      ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI * 2); ctx.fill()
      if (!correct) {
        ctx.strokeStyle = c.red; ctx.lineWidth = 3
        ctx.beginPath(); ctx.arc(cx, cy, 16, 0, Math.PI * 2); ctx.stroke()
      }
      ctx.fillStyle = c.text
      ctx.font = '11px var(--font-mono), monospace'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(p.cls, cx, cy)
    })

    // 3. Line(s)
    function drawLine(line: typeof line1, color: string) {
      ctx.strokeStyle = color; ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(line.a.x * W, line.a.y * H)
      ctx.lineTo(line.b.x * W, line.b.y * H)
      ctx.stroke()
      ;[line.a, line.b].forEach(end => {
        ctx.fillStyle = c.mantle
        ctx.beginPath(); ctx.arc(end.x * W, end.y * H, 7, 0, Math.PI * 2); ctx.fill()
        ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke()
      })
    }
    drawLine(line1, c.mauve)
    if (hidden) drawLine(line2, c.sapphire)

    // 4. Corner labels
    ctx.fillStyle = c.subtext
    ctx.font = '11px var(--font-mono), monospace'
    ctx.textAlign = 'left'; ctx.textBaseline = 'top'
    ctx.fillText('(0,1)', 6, 6)
    ctx.textAlign = 'right'; ctx.fillText('(1,1)', W - 6, 6)
    ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'
    ctx.fillText('(0,0)', 6, H - 6)
    ctx.textAlign = 'right'; ctx.fillText('(1,0)', W - 6, H - 6)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hidden, line1, line2, points, themeTick])

  function pointerToFraction(e: ReactPointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height }
  }

  function onPointerDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    const p = pointerToFraction(e)
    const lines: Array<{ k: 1 | 2; l: typeof line1 }> = [{ k: 1, l: line1 }]
    if (hidden) lines.push({ k: 2, l: line2 })
    for (const { k, l } of lines) {
      for (const end of ['a', 'b'] as const) {
        const dx = (l[end].x - p.x); const dy = (l[end].y - p.y)
        const rect = e.currentTarget.getBoundingClientRect()
        if (Math.hypot(dx * rect.width, dy * rect.height) < 16) {
          setDragging({ which: k, end })
          e.currentTarget.setPointerCapture(e.pointerId)
          return
        }
      }
    }
  }

  function onPointerMove(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!dragging) return
    const p = pointerToFraction(e)
    const clamp = (v: number) => Math.max(0.02, Math.min(0.98, v))
    if (dragging.which === 1) {
      setLine1(prev => ({ ...prev, [dragging.end]: { x: clamp(p.x), y: clamp(p.y) } }))
    } else {
      setLine2(prev => ({ ...prev, [dragging.end]: { x: clamp(p.x), y: clamp(p.y) } }))
    }
  }

  function onPointerUp(e: ReactPointerEvent<HTMLCanvasElement>) {
    setDragging(null)
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  const misclassified = points.filter(p => classifyPoint(p) !== p.cls).length

  return (
    <section ref={sectionRef} aria-labelledby="nn-section-2" className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="text-center mb-8">
        <p className="font-[family-name:var(--font-mono)] text-[12px] tracking-[0.3em] uppercase text-teal dark:text-teal-dark">02/</p>
        <h2 id="nn-section-2" className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl text-ink dark:text-night-text mt-2">XOR & linear separability</h2>
        <p className="mt-3 text-[14px] text-ink-subtle dark:text-night-muted max-w-xl mx-auto">
          A single perceptron can only draw one straight line. XOR needs two — that&apos;s why hidden layers exist.
        </p>
      </div>

      <canvas ref={canvasRef}
        className="w-full bg-cream-dark/30 dark:bg-night-card/40 rounded-lg cursor-grab active:cursor-grabbing touch-none"
        style={{ height: 380 }}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove}
        onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
      />

      <div className="mt-4 flex items-center justify-between gap-4 flex-wrap">
        <p className="text-[13px] text-ink-subtle dark:text-night-muted">
          {hidden ? 'Two-layer network: drag both lines.' : `Misclassified: ${misclassified} / 4`}
        </p>
        <button
          onClick={() => setHidden(h => !h)}
          className="px-4 py-2 rounded-full border border-teal/40 dark:border-teal-dark/40 bg-teal/10 dark:bg-teal-dark/10 text-teal dark:text-teal-dark text-[13px] font-[family-name:var(--font-mono)] hover:bg-teal/20 dark:hover:bg-teal-dark/20 transition-colors"
        >
          {hidden ? 'Remove hidden layer' : 'Add hidden layer'}
        </button>
      </div>

      <p className="sr-only">XOR scatter with {misclassified} misclassified points using {hidden ? 'two' : 'one'} linear boundary.</p>
    </section>
  )
}
function Section3() {
  const [sectionRef, visible] = useScrollReveal()
  const [depth, setDepth] = useState(4)
  const [highlighted, setHighlighted] = useState<Activation>('sigmoid')
  const curveCanvas = useRef<HTMLCanvasElement>(null)
  const derivCanvas = useRef<HTMLCanvasElement>(null)
  const stackCanvas = useRef<HTMLCanvasElement>(null)
  const [themeTick, setThemeTick] = useState(0)
  useEffect(() => {
    const obs = new MutationObserver(() => setThemeTick(t => t + 1))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const c = getThemeColors()
    drawCurves(curveCanvas.current, activate,             [-1.2, 1.2],  highlighted, c)
    drawCurves(derivCanvas.current, activationDerivative, [-0.1, 1.1],  highlighted, c)
    drawStack(stackCanvas.current,  depth, highlighted, c)
  }, [highlighted, depth, themeTick])

  return (
    <section ref={sectionRef} aria-labelledby="nn-section-3" className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="text-center mb-8">
        <p className="font-[family-name:var(--font-mono)] text-[12px] tracking-[0.3em] uppercase text-teal dark:text-teal-dark">03/</p>
        <h2 id="nn-section-3" className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl text-ink dark:text-night-text mt-2">Activation functions & vanishing gradients</h2>
        <p className="mt-3 text-[14px] text-ink-subtle dark:text-night-muted max-w-xl mx-auto">
          Activations decide what the neuron&apos;s output looks like. Their derivatives decide whether the network can learn — multiply small derivatives across many layers and the gradient vanishes.
        </p>
      </div>

      <div className="flex gap-2 justify-center mb-4">
        {(['sigmoid','tanh','relu'] as Activation[]).map(a => (
          <button key={a} onClick={() => setHighlighted(a)}
            className={`px-3 py-1.5 rounded-full text-[12px] font-[family-name:var(--font-mono)] border transition-colors ${
              highlighted === a
                ? 'bg-teal/15 dark:bg-teal-dark/15 border-teal/40 dark:border-teal-dark/40 text-teal dark:text-teal-dark'
                : 'border-cream-border dark:border-night-border text-ink-subtle dark:text-night-muted hover:border-teal/40'
            }`}
          >{a}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-ink-subtle dark:text-night-muted mb-2 font-[family-name:var(--font-mono)]">Activation f(x)</p>
          <canvas ref={curveCanvas} className="w-full bg-cream-dark/30 dark:bg-night-card/40 rounded" style={{ height: 180 }} />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-ink-subtle dark:text-night-muted mb-2 font-[family-name:var(--font-mono)]">Derivative f&apos;(x)</p>
          <canvas ref={derivCanvas} className="w-full bg-cream-dark/30 dark:bg-night-card/40 rounded" style={{ height: 180 }} />
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-[11px] uppercase tracking-wider text-ink-subtle dark:text-night-muted font-[family-name:var(--font-mono)]">Stacked through {depth} layers</span>
          <input type="range" min={1} max={8} step={1} value={depth} onChange={e => setDepth(parseInt(e.target.value))} className="flex-1 max-w-xs accent-teal dark:accent-teal-dark" />
        </div>
        <canvas ref={stackCanvas} className="w-full bg-cream-dark/30 dark:bg-night-card/40 rounded" style={{ height: 120 }} />
        <p className="mt-3 text-[13px] text-ink-subtle dark:text-night-muted">
          {highlighted === 'sigmoid' && 'Sigmoid\'s derivative caps at 0.25 — five layers in, the gradient is ≈ 0.001. This is why early layers in deep sigmoid nets barely learn.'}
          {highlighted === 'tanh'    && 'Tanh peaks at 1.0 — better than sigmoid, but typical inputs sit in the saturating tails where the derivative is small.'}
          {highlighted === 'relu'    && 'ReLU\'s derivative is 1 wherever the neuron is active, so gradients pass through unchanged. This unlocked truly deep networks.'}
        </p>
      </div>
    </section>
  )
}
// --- Backprop helpers (Section 4) ---
type BackpropState = {
  h1Net: number; h1Out: number
  h2Net: number; h2Out: number
  outNet: number; outOut: number
  error: number
  dOut: number
  dH1: number; dH2: number
  dW: { wh1x1: number; wh1x2: number; wh2x1: number; wh2x2: number; wo1: number; wo2: number; b1: number; b2: number; bo: number }
}

function computeBackprop(x1: number, x2: number, target: number, w: {
  wh1x1: number; wh1x2: number; wh2x1: number; wh2x2: number;
  wo1: number; wo2: number; b1: number; b2: number; bo: number;
}, eta: number): BackpropState {
  const h1Net = x1 * w.wh1x1 + x2 * w.wh1x2 + w.b1
  const h1Out = activate(h1Net, 'sigmoid')
  const h2Net = x1 * w.wh2x1 + x2 * w.wh2x2 + w.b2
  const h2Out = activate(h2Net, 'sigmoid')
  const outNet = h1Out * w.wo1 + h2Out * w.wo2 + w.bo
  const outOut = activate(outNet, 'sigmoid')
  const error = 0.5 * (target - outOut) ** 2

  const dOut = (target - outOut) * outOut * (1 - outOut)
  const dH1  = h1Out * (1 - h1Out) * dOut * w.wo1
  const dH2  = h2Out * (1 - h2Out) * dOut * w.wo2

  return {
    h1Net, h1Out, h2Net, h2Out, outNet, outOut, error,
    dOut, dH1, dH2,
    dW: {
      wh1x1: eta * dH1 * x1, wh1x2: eta * dH1 * x2,
      wh2x1: eta * dH2 * x1, wh2x2: eta * dH2 * x2,
      wo1: eta * dOut * h1Out, wo2: eta * dOut * h2Out,
      b1: eta * dH1, b2: eta * dH2, bo: eta * dOut,
    },
  }
}

function Section4() {
  const [sectionRef, visible] = useScrollReveal()
  const [stage, setStage] = useState(0) // 0=initial, 1=forward, 2=error, 3=backward, 4=updated
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [themeTick, setThemeTick] = useState(0)
  useEffect(() => {
    const obs = new MutationObserver(() => setThemeTick(t => t + 1))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  const x1 = 0.5, x2 = 0.8, target = 1.0, eta = 0.5
  const initialW = useMemo(() => ({
    wh1x1: 0.3, wh1x2: 0.3, wh2x1: 0.3, wh2x2: 0.3,
    wo1: 0.3, wo2: 0.3, b1: 0.0, b2: 0.0, bo: 0.0,
  }), [])
  const bp = useMemo(() => computeBackprop(x1, x2, target, initialW, eta), [initialW])
  const updatedW = useMemo(() => ({
    wh1x1: initialW.wh1x1 + bp.dW.wh1x1, wh1x2: initialW.wh1x2 + bp.dW.wh1x2,
    wh2x1: initialW.wh2x1 + bp.dW.wh2x1, wh2x2: initialW.wh2x2 + bp.dW.wh2x2,
    wo1:   initialW.wo1   + bp.dW.wo1,   wo2:   initialW.wo2   + bp.dW.wo2,
    b1: initialW.b1 + bp.dW.b1, b2: initialW.b2 + bp.dW.b2, bo: initialW.bo + bp.dW.bo,
  }), [bp, initialW])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const setup = setupCanvas(canvas, 360); if (!setup) return
    const { ctx, W, H } = setup
    const c = getThemeColors()

    const inputXs = 80
    const hiddenX = W * 0.45
    const outX    = W - 100
    const ys = { i1: H * 0.3, i2: H * 0.7, h1: H * 0.3, h2: H * 0.7, o: H * 0.5 }
    const r = 22

    const w = stage === 4 ? updatedW : initialW

    const edges: Array<{ from: [number, number]; to: [number, number]; label: string; lit: boolean; back: boolean; gradLabel?: string }> = [
      { from: [inputXs, ys.i1], to: [hiddenX, ys.h1], label: w.wh1x1.toFixed(2), lit: stage >= 1, back: stage >= 3, gradLabel: stage >= 3 ? `Δ${bp.dW.wh1x1.toFixed(3)}` : undefined },
      { from: [inputXs, ys.i2], to: [hiddenX, ys.h1], label: w.wh1x2.toFixed(2), lit: stage >= 1, back: stage >= 3, gradLabel: stage >= 3 ? `Δ${bp.dW.wh1x2.toFixed(3)}` : undefined },
      { from: [inputXs, ys.i1], to: [hiddenX, ys.h2], label: w.wh2x1.toFixed(2), lit: stage >= 1, back: stage >= 3, gradLabel: stage >= 3 ? `Δ${bp.dW.wh2x1.toFixed(3)}` : undefined },
      { from: [inputXs, ys.i2], to: [hiddenX, ys.h2], label: w.wh2x2.toFixed(2), lit: stage >= 1, back: stage >= 3, gradLabel: stage >= 3 ? `Δ${bp.dW.wh2x2.toFixed(3)}` : undefined },
      { from: [hiddenX, ys.h1], to: [outX, ys.o],    label: w.wo1.toFixed(2),   lit: stage >= 1, back: stage >= 3, gradLabel: stage >= 3 ? `Δ${bp.dW.wo1.toFixed(3)}`   : undefined },
      { from: [hiddenX, ys.h2], to: [outX, ys.o],    label: w.wo2.toFixed(2),   lit: stage >= 1, back: stage >= 3, gradLabel: stage >= 3 ? `Δ${bp.dW.wo2.toFixed(3)}`   : undefined },
    ]

    edges.forEach(e => {
      ctx.strokeStyle = e.back ? c.amber : (e.lit ? c.teal : c.axis)
      ctx.globalAlpha = e.lit ? 1 : 0.4
      ctx.lineWidth = e.lit ? 2 : 1
      ctx.beginPath(); ctx.moveTo(e.from[0], e.from[1]); ctx.lineTo(e.to[0], e.to[1]); ctx.stroke()
      ctx.globalAlpha = 1
      ctx.fillStyle = c.subtext
      ctx.font = '11px var(--font-mono), monospace'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(e.label, (e.from[0] + e.to[0]) / 2, (e.from[1] + e.to[1]) / 2 - 8)
      if (e.gradLabel) {
        ctx.fillStyle = c.amber
        ctx.fillText(e.gradLabel, (e.from[0] + e.to[0]) / 2, (e.from[1] + e.to[1]) / 2 + 8)
      }
    })

    function node(cx: number, cy: number, label: string, value: string | null, lit: boolean, color: string) {
      ctx.fillStyle = lit ? color : c.surface
      ctx.globalAlpha = lit ? 0.8 : 1
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill()
      ctx.globalAlpha = 1
      ctx.strokeStyle = c.axis; ctx.lineWidth = 1; ctx.stroke()
      ctx.fillStyle = c.text
      ctx.font = '12px var(--font-mono), monospace'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(label, cx, cy - 4)
      if (value !== null) {
        ctx.fillStyle = lit ? color : c.subtext
        ctx.fillText(value, cx, cy + 10)
      }
    }

    node(inputXs, ys.i1, 'x₁', x1.toFixed(2), true, c.sapphire)
    node(inputXs, ys.i2, 'x₂', x2.toFixed(2), true, c.sapphire)
    node(hiddenX, ys.h1, 'h₁', stage >= 1 ? bp.h1Out.toFixed(3) : '?', stage >= 1, c.teal)
    node(hiddenX, ys.h2, 'h₂', stage >= 1 ? bp.h2Out.toFixed(3) : '?', stage >= 1, c.teal)
    const outColor = stage >= 2 ? c.red : c.mauve
    node(outX, ys.o, 'y', stage >= 1 ? bp.outOut.toFixed(3) : '?', stage >= 1, outColor)

    ctx.fillStyle = c.subtext
    ctx.font = '12px var(--font-mono), monospace'
    ctx.textAlign = 'left'; ctx.textBaseline = 'top'
    const captions = [
      'Stage 0: initial weights all 0.3, target = 1.0',
      'Stage 1: forward pass — each node multiplies and applies sigmoid',
      `Stage 2: error = ½(t − y)² = ${bp.error.toFixed(4)}`,
      'Stage 3: backward pass — δ values propagate (amber)',
      'Stage 4: weights updated by w ← w + η·δ·input',
    ]
    ctx.fillText(captions[stage], 12, 12)
  }, [stage, themeTick, bp, initialW, updatedW, x1, x2])

  return (
    <section ref={sectionRef} aria-labelledby="nn-section-4" className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="text-center mb-8">
        <p className="font-[family-name:var(--font-mono)] text-[12px] tracking-[0.3em] uppercase text-teal dark:text-teal-dark">04/</p>
        <h2 id="nn-section-4" className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl text-ink dark:text-night-text mt-2">Backpropagation walkthrough</h2>
        <p className="mt-3 text-[14px] text-ink-subtle dark:text-night-muted max-w-xl mx-auto">
          One training example, one weight update. Step through the forward pass, the error, the gradient flowing backward, and finally the new weights.
        </p>
      </div>

      <canvas ref={canvasRef} className="w-full bg-cream-dark/30 dark:bg-night-card/40 rounded-lg" style={{ height: 360 }} />

      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="flex gap-2">
          <button onClick={() => setStage(0)}
            className="px-3 py-1.5 rounded-full border border-cream-border dark:border-night-border text-[12px] text-ink-subtle dark:text-night-muted hover:border-teal/40">
            Reset
          </button>
          <button onClick={() => setStage(s => Math.min(4, s + 1))}
            disabled={stage >= 4}
            className="px-4 py-1.5 rounded-full border border-teal/40 dark:border-teal-dark/40 bg-teal/10 dark:bg-teal-dark/10 text-teal dark:text-teal-dark text-[13px] font-[family-name:var(--font-mono)] hover:bg-teal/20 disabled:opacity-40 disabled:cursor-not-allowed">
            Step →
          </button>
        </div>
        <span className="text-[12px] text-ink-subtle dark:text-night-muted font-[family-name:var(--font-mono)]">stage {stage} / 4</span>
      </div>
    </section>
  )
}
// --- Section 5: Momentum vs vanilla GD ---
type Landscape = 'ravine' | 'saddle' | 'bumpy'

function lossAt(x: number, y: number, landscape: Landscape): number {
  switch (landscape) {
    case 'ravine': return 10 * x * x + 0.5 * y * y
    case 'saddle': return x * x - y * y + 0.05 * (x * x + y * y) ** 2
    case 'bumpy':  return x * x + y * y + 1.5 * Math.sin(3 * x) * Math.sin(3 * y)
  }
}

function gradAt(x: number, y: number, landscape: Landscape): [number, number] {
  switch (landscape) {
    case 'ravine': return [20 * x, y]
    case 'saddle': return [2*x + 0.2*x*(x*x+y*y), -2*y + 0.2*y*(x*x+y*y)]
    case 'bumpy':  return [2*x + 4.5*Math.cos(3*x)*Math.sin(3*y), 2*y + 4.5*Math.sin(3*x)*Math.cos(3*y)]
  }
}

function drawLandscape(
  canvas: HTMLCanvasElement | null,
  landscape: Landscape,
  ball: { x: number; y: number },
  trail: Array<[number, number]>,
  trailColor: string,
  c: ReturnType<typeof getThemeColors>,
) {
  if (!canvas) return
  const setup = setupCanvas(canvas, 280); if (!setup) return
  const { ctx, W, H } = setup
  const X0 = -3, X1 = 3, Y0 = -3, Y1 = 3
  const toPx = (x: number, y: number) => [
    ((x - X0) / (X1 - X0)) * W,
    H - ((y - Y0) / (Y1 - Y0)) * H,
  ] as [number, number]

  const cells = 50
  let lossMin = Infinity, lossMax = -Infinity
  const samples: number[] = []
  for (let j = 0; j < cells; j++) {
    for (let i = 0; i < cells; i++) {
      const x = X0 + ((i + 0.5) / cells) * (X1 - X0)
      const y = Y0 + ((j + 0.5) / cells) * (Y1 - Y0)
      const v = lossAt(x, y, landscape)
      samples.push(v)
      if (v < lossMin) lossMin = v
      if (v > lossMax) lossMax = v
    }
  }
  // Topographic shading: mauve at low alpha — harmonizes with the structural accent
  // used throughout the site and leaves the teal/mauve ball trails as the visual focus.
  const range = lossMax - lossMin
  // Log compression makes the saddle landscape (which spans huge values) readable
  for (let j = 0; j < cells; j++) {
    for (let i = 0; i < cells; i++) {
      const v = samples[j * cells + i]
      const t = Math.min(1, Math.log1p(Math.max(0, v - lossMin)) / Math.max(Math.log1p(range), 1e-6))
      const alpha = 0.05 + 0.22 * t
      ctx.fillStyle = `${c.mauve}${Math.round(alpha * 255).toString(16).padStart(2,'0')}`
      const x0 = (i / cells) * W
      const y0 = (j / cells) * H
      ctx.fillRect(x0, y0, W / cells + 1, H / cells + 1)
    }
  }

  ctx.strokeStyle = trailColor; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.7
  ctx.beginPath()
  trail.forEach(([tx, ty], i) => {
    const [px, py] = toPx(tx, ty)
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
  })
  ctx.stroke()
  ctx.globalAlpha = 1

  // Clamp the visible ball to the world bounds so divergence is visible as a pinned
  // marker at the edge rather than the ball silently leaving the canvas.
  const clamp = (v: number, lo: number, hi: number) => !Number.isFinite(v) ? hi : Math.max(lo, Math.min(hi, v))
  const escaped = !Number.isFinite(ball.x) || !Number.isFinite(ball.y) ||
    ball.x < X0 || ball.x > X1 || ball.y < Y0 || ball.y > Y1
  const [bx, by] = toPx(clamp(ball.x, X0, X1), clamp(ball.y, Y0, Y1))
  ctx.fillStyle = trailColor
  ctx.beginPath(); ctx.arc(bx, by, 6, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = c.base; ctx.lineWidth = 2; ctx.stroke()
  if (escaped) {
    // Dashed outer ring marks "diverged past this point"
    ctx.strokeStyle = trailColor
    ctx.lineWidth = 1.5
    ctx.setLineDash([3, 3])
    ctx.beginPath(); ctx.arc(bx, by, 11, 0, Math.PI * 2); ctx.stroke()
    ctx.setLineDash([])
  }

  const [ox, oy] = toPx(0, 0)
  ctx.strokeStyle = c.axis; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(ox - 6, oy); ctx.lineTo(ox + 6, oy); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(ox, oy - 6); ctx.lineTo(ox, oy + 6); ctx.stroke()
}

// Saddle and bumpy landscapes can drive the optimizer to infinity with poor hyperparameters —
// this threshold detects "the ball left the visible world" and auto-pauses.
const DIVERGE_LIMIT = 5

function isDiverged(p: { x: number; y: number }) {
  return !Number.isFinite(p.x) || !Number.isFinite(p.y) || Math.abs(p.x) > DIVERGE_LIMIT || Math.abs(p.y) > DIVERGE_LIMIT
}

function Section5() {
  const [sectionRef, visible] = useScrollReveal()
  const [landscape, setLandscape] = useState<Landscape>('ravine')
  const [lr, setLr] = useState(0.05)
  const [beta, setBeta] = useState(0.9)
  const [playing, setPlaying] = useState(false)
  const [tick, setTick] = useState(0)
  const [diverged, setDiverged] = useState<'none' | 'vanilla' | 'momentum' | 'both'>('none')
  const ballV = useRef({ x: -2, y: 1.5 })
  const ballM = useRef({ x: -2, y: 1.5, vx: 0, vy: 0 })
  const trailV = useRef<Array<[number, number]>>([])
  const trailM = useRef<Array<[number, number]>>([])
  const canvasV = useRef<HTMLCanvasElement>(null)
  const canvasM = useRef<HTMLCanvasElement>(null)
  const [themeTick, setThemeTick] = useState(0)
  const reduced = useMemo(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])

  useEffect(() => {
    const obs = new MutationObserver(() => setThemeTick(t => t + 1))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  // Reset on landscape change
  useEffect(() => {
    ballV.current = { x: -2, y: 1.5 }
    ballM.current = { x: -2, y: 1.5, vx: 0, vy: 0 }
    trailV.current = []
    trailM.current = []
    queueMicrotask(() => setDiverged('none'))
    // Drawing effect re-runs because `landscape` is in its deps — no need to bump tick.
  }, [landscape])

  // Animation loop
  useEffect(() => {
    if (!playing) return

    // Advances both balls by one step; returns which (if any) diverged this frame.
    const integrate = (): 'vanilla' | 'momentum' | 'both' | 'none' => {
      let vDiverged = isDiverged(ballV.current)
      let mDiverged = isDiverged(ballM.current)
      if (!vDiverged) {
        const [gxV, gyV] = gradAt(ballV.current.x, ballV.current.y, landscape)
        ballV.current.x -= lr * gxV
        ballV.current.y -= lr * gyV
        trailV.current.push([ballV.current.x, ballV.current.y])
        if (trailV.current.length > 200) trailV.current.shift()
        vDiverged = isDiverged(ballV.current)
      }
      if (!mDiverged) {
        const [gxM, gyM] = gradAt(ballM.current.x, ballM.current.y, landscape)
        ballM.current.vx = beta * ballM.current.vx - lr * gxM
        ballM.current.vy = beta * ballM.current.vy - lr * gyM
        ballM.current.x += ballM.current.vx
        ballM.current.y += ballM.current.vy
        trailM.current.push([ballM.current.x, ballM.current.y])
        if (trailM.current.length > 200) trailM.current.shift()
        mDiverged = isDiverged(ballM.current)
      }
      if (vDiverged && mDiverged) return 'both'
      if (vDiverged) return 'vanilla'
      if (mDiverged) return 'momentum'
      return 'none'
    }

    if (reduced) {
      let finalState: 'none' | 'vanilla' | 'momentum' | 'both' = 'none'
      for (let i = 0; i < 200; i++) {
        const state = integrate()
        if (state === 'both') { finalState = 'both'; break }
        if (state !== 'none') finalState = state
      }
      queueMicrotask(() => {
        setTick(t => t + 1)
        setDiverged(finalState)
        setPlaying(false)
      })
      return
    }

    let raf = 0
    const step = () => {
      const state = integrate()
      setTick(t => t + 1)
      if (state === 'both') {
        // Both diverged — stop animating.
        setDiverged('both')
        setPlaying(false)
        return
      }
      if (state !== 'none') {
        // One diverged but the other is still converging — keep animating
        // the survivor and mark the failure.
        setDiverged(state)
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [playing, landscape, lr, beta, reduced])

  // Drawing
  useEffect(() => {
    const c = getThemeColors()
    drawLandscape(canvasV.current, landscape, ballV.current, trailV.current, c.mauve, c)
    drawLandscape(canvasM.current, landscape, ballM.current, trailM.current, c.teal, c)
  }, [tick, landscape, themeTick])

  return (
    <section ref={sectionRef} aria-labelledby="nn-section-5" className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="text-center mb-8">
        <p className="font-[family-name:var(--font-mono)] text-[12px] tracking-[0.3em] uppercase text-teal dark:text-teal-dark">05/</p>
        <h2 id="nn-section-5" className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl text-ink dark:text-night-text mt-2">Momentum vs vanilla GD</h2>
        <p className="mt-3 text-[14px] text-ink-subtle dark:text-night-muted max-w-xl mx-auto">
          Same learning rate, same starting point, same landscape. Vanilla zig-zags across the ravine; momentum builds velocity along the long axis and glides down.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-mauve dark:text-mauve-dark mb-2 font-[family-name:var(--font-mono)]">Vanilla GD</p>
          <canvas ref={canvasV} className="w-full bg-cream-dark/30 dark:bg-night-card/40 rounded" style={{ height: 280 }} />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-teal dark:text-teal-dark mb-2 font-[family-name:var(--font-mono)]">Momentum</p>
          <canvas ref={canvasM} className="w-full bg-cream-dark/30 dark:bg-night-card/40 rounded" style={{ height: 280 }} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="text-[11px] uppercase tracking-wider text-ink-subtle dark:text-night-muted font-[family-name:var(--font-mono)]">Landscape</label>
          <select value={landscape} onChange={e => setLandscape(e.target.value as Landscape)}
            className="mt-1 w-full bg-cream dark:bg-night-card border border-cream-border dark:border-night-border rounded px-3 py-2 text-[13px] font-[family-name:var(--font-mono)]">
            <option value="ravine">Ravine</option>
            <option value="saddle">Saddle</option>
            <option value="bumpy">Bumpy</option>
          </select>
        </div>
        <SliderRow label="η" min={0.005} max={0.15} step={0.005} value={lr} onChange={setLr} />
        <SliderRow label="β" min={0} max={0.99} step={0.01} value={beta} onChange={setBeta} />
      </div>

      <div className="mt-4 flex items-center gap-2 flex-wrap">
        <button onClick={() => setPlaying(p => !p)}
          className="px-4 py-1.5 rounded-full border border-teal/40 dark:border-teal-dark/40 bg-teal/10 dark:bg-teal-dark/10 text-teal dark:text-teal-dark text-[13px] font-[family-name:var(--font-mono)] hover:bg-teal/20">
          {playing ? 'Pause' : 'Play'}
        </button>
        <button onClick={() => {
          ballV.current = { x: -2, y: 1.5 }
          ballM.current = { x: -2, y: 1.5, vx: 0, vy: 0 }
          trailV.current = []; trailM.current = []
          setDiverged('none')
          setTick(t => t + 1)
        }} className="px-3 py-1.5 rounded-full border border-cream-border dark:border-night-border text-[12px] text-ink-subtle dark:text-night-muted hover:border-teal/40">
          Reset
        </button>
        {diverged !== 'none' && (
          <span className="ml-auto text-[12px] font-[family-name:var(--font-mono)] text-peach dark:text-peach-dark">
            {diverged === 'both'
              ? 'Both diverged — try a smaller η'
              : diverged === 'vanilla'
                ? 'Vanilla diverged — try a smaller η'
                : 'Momentum diverged — try a smaller η or β'}
          </span>
        )}
      </div>
    </section>
  )
}
// --- Section 6: Dataset generators ---
type DatasetKind = 'blobs' | 'moons' | 'circles'

function genDataset(kind: DatasetKind, n: number = 120): Array<{ x: number; y: number; label: 0 | 1 }> {
  const pts: Array<{ x: number; y: number; label: 0 | 1 }> = []
  const noise = () => (Math.random() - 0.5) * 0.06
  if (kind === 'blobs') {
    for (let i = 0; i < n / 2; i++) pts.push({ x: 0.3 + noise(), y: 0.3 + noise(), label: 0 })
    for (let i = 0; i < n / 2; i++) pts.push({ x: 0.7 + noise(), y: 0.7 + noise(), label: 1 })
  } else if (kind === 'moons') {
    for (let i = 0; i < n / 2; i++) {
      const a = Math.PI * (i / (n / 2))
      pts.push({ x: 0.35 + 0.25 * Math.cos(a) + noise(), y: 0.55 + 0.2 * Math.sin(a) + noise(), label: 0 })
    }
    for (let i = 0; i < n / 2; i++) {
      const a = Math.PI * (i / (n / 2))
      pts.push({ x: 0.65 - 0.25 * Math.cos(a) + noise(), y: 0.45 - 0.2 * Math.sin(a) + noise(), label: 1 })
    }
  } else { // circles
    for (let i = 0; i < n / 2; i++) {
      const a = 2 * Math.PI * (i / (n / 2))
      pts.push({ x: 0.5 + 0.12 * Math.cos(a) + noise() * 0.3, y: 0.5 + 0.12 * Math.sin(a) + noise() * 0.3, label: 0 })
    }
    for (let i = 0; i < n / 2; i++) {
      const a = 2 * Math.PI * (i / (n / 2))
      pts.push({ x: 0.5 + 0.30 * Math.cos(a) + noise() * 0.5, y: 0.5 + 0.30 * Math.sin(a) + noise() * 0.5, label: 1 })
    }
  }
  return pts
}

// --- Section 6: Tiny MLP ---
type MLP = {
  W1: number[][]; b1: number[]   // [H][2], [H]
  W2: number[];   b2: number     // [H], scalar
  act: Activation
}

function initMLP(hidden: number, act: Activation): MLP {
  const rand = () => (Math.random() - 0.5) * 0.6
  return {
    W1: Array.from({ length: hidden }, () => [rand(), rand()]),
    b1: Array.from({ length: hidden }, () => rand()),
    W2: Array.from({ length: hidden }, () => rand()),
    b2: rand(),
    act,
  }
}

function forwardMLP(m: MLP, x: number, y: number): { hOut: number[]; out: number } {
  const hNet = m.W1.map(([w0, w1], i) => w0 * x + w1 * y + m.b1[i])
  const hOut = hNet.map(n => activate(n, m.act))
  const oNet = hOut.reduce((s, h, i) => s + h * m.W2[i], m.b2)
  const out = activate(oNet, 'sigmoid')
  return { hOut, out }
}

function trainEpoch(m: MLP, data: ReturnType<typeof genDataset>, lr: number): number {
  let totalLoss = 0
  const order = data.map((_, i) => i).sort(() => Math.random() - 0.5)
  for (const idx of order) {
    const { x, y, label } = data[idx]
    const { hOut, out } = forwardMLP(m, x, y)
    const error = label - out
    totalLoss += 0.5 * error * error

    const dOut = error * out * (1 - out)
    for (let i = 0; i < m.W2.length; i++) {
      const dW2i = dOut * hOut[i]
      const hNet = m.W1[i][0] * x + m.W1[i][1] * y + m.b1[i]
      const dH = activationDerivative(hNet, m.act) * dOut * m.W2[i]
      m.W2[i] += lr * dW2i
      m.W1[i][0] += lr * dH * x
      m.W1[i][1] += lr * dH * y
      m.b1[i]    += lr * dH
    }
    m.b2 += lr * dOut
  }
  return totalLoss / data.length
}

// --- Section 6: Drawing helpers ---
function drawTraining(
  canvas: HTMLCanvasElement | null,
  data: ReturnType<typeof genDataset>,
  model: MLP,
  c: ReturnType<typeof getThemeColors>,
) {
  if (!canvas) return
  const setup = setupCanvas(canvas, 360); if (!setup) return
  const { ctx, W, H } = setup

  const cells = 50
  for (let j = 0; j < cells; j++) {
    for (let i = 0; i < cells; i++) {
      const x = (i + 0.5) / cells
      const y = (j + 0.5) / cells
      const { out } = forwardMLP(model, x, y)
      const alpha = Math.abs(out - 0.5) * 1.1 + 0.05
      ctx.fillStyle = out > 0.5
        ? `${c.teal}${Math.round(Math.min(0.6, alpha) * 255).toString(16).padStart(2, '0')}`
        : `${c.peach}${Math.round(Math.min(0.6, alpha) * 255).toString(16).padStart(2, '0')}`
      ctx.fillRect((i / cells) * W, (j / cells) * H, W / cells + 1, H / cells + 1)
    }
  }

  data.forEach(({ x, y, label }) => {
    ctx.fillStyle = label === 1 ? c.teal : c.peach
    ctx.beginPath(); ctx.arc(x * W, y * H, 4, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = c.base; ctx.lineWidth = 1.5; ctx.stroke()
  })
}

function drawLossSparkline(
  canvas: HTMLCanvasElement | null,
  losses: number[],
  c: ReturnType<typeof getThemeColors>,
) {
  if (!canvas) return
  const setup = setupCanvas(canvas, 80); if (!setup) return
  const { ctx, W, H } = setup
  if (losses.length < 2) return
  const max = Math.max(...losses, 0.01)
  ctx.strokeStyle = c.teal; ctx.lineWidth = 1.5
  ctx.beginPath()
  losses.forEach((l, i) => {
    const px = (i / (losses.length - 1)) * W
    const py = H - (l / max) * (H - 4) - 2
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
  })
  ctx.stroke()
}

function Section6() {
  const [sectionRef, visible] = useScrollReveal()
  const [kind, setKind] = useState<DatasetKind>('moons')
  const [hidden, setHidden] = useState(8)
  const [lr, setLr] = useState(0.5)
  const [act, setAct] = useState<Activation>('relu')
  const [playing, setPlaying] = useState(false)
  const [epoch, setEpoch] = useState(0)
  const [losses, setLosses] = useState<number[]>([])
  const dataRef = useRef(genDataset(kind))
  const modelRef = useRef<MLP>(initMLP(hidden, act))
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const lossCanvasRef = useRef<HTMLCanvasElement>(null)
  const [themeTick, setThemeTick] = useState(0)
  const reduced = useMemo(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])

  useEffect(() => {
    const obs = new MutationObserver(() => setThemeTick(t => t + 1))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  // Reset on hyperparameter change
  useEffect(() => {
    dataRef.current = genDataset(kind)
    modelRef.current = initMLP(hidden, act)
    queueMicrotask(() => {
      setEpoch(0); setLosses([])
    })
  }, [kind, hidden, act])

  // Training loop — capped to ~30 epochs/sec
  useEffect(() => {
    if (!playing) return
    if (reduced) {
      const newLosses: number[] = []
      for (let i = 0; i < 200; i++) {
        newLosses.push(trainEpoch(modelRef.current, dataRef.current, lr))
      }
      queueMicrotask(() => {
        setEpoch(200); setLosses(newLosses); setPlaying(false)
      })
      return
    }
    let raf = 0
    let last = performance.now()
    const loop = () => {
      const now = performance.now()
      if (now - last >= 30) {
        const loss = trainEpoch(modelRef.current, dataRef.current, lr)
        setEpoch(e => e + 1)
        setLosses(prev => [...prev.slice(-199), loss])
        last = now
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [playing, lr, reduced])

  const [accuracy, setAccuracy] = useState(0)

  useEffect(() => {
    const c = getThemeColors()
    drawTraining(canvasRef.current, dataRef.current, modelRef.current, c)
    drawLossSparkline(lossCanvasRef.current, losses, c)
    let correct = 0
    for (const { x, y, label } of dataRef.current) {
      const { out } = forwardMLP(modelRef.current, x, y)
      if ((out > 0.5 ? 1 : 0) === label) correct++
    }
    const acc = correct / dataRef.current.length
    queueMicrotask(() => setAccuracy(acc))
  }, [epoch, losses, themeTick, kind, hidden, act])

  return (
    <section ref={sectionRef} aria-labelledby="nn-section-6" className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="text-center mb-8">
        <p className="font-[family-name:var(--font-mono)] text-[12px] tracking-[0.3em] uppercase text-teal dark:text-teal-dark">06/</p>
        <h2 id="nn-section-6" className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl text-ink dark:text-night-text mt-2">Training a tiny network</h2>
        <p className="mt-3 text-[14px] text-ink-subtle dark:text-night-muted max-w-xl mx-auto">
          All five prior ideas in motion. Press play; watch the decision boundary carve up the plane.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <canvas ref={canvasRef} className="w-full bg-cream-dark/30 dark:bg-night-card/40 rounded" style={{ height: 360 }} />
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-ink-subtle dark:text-night-muted font-[family-name:var(--font-mono)]">Dataset</label>
            <select value={kind} onChange={e => setKind(e.target.value as DatasetKind)}
              className="mt-1 w-full bg-cream dark:bg-night-card border border-cream-border dark:border-night-border rounded px-3 py-2 text-[13px] font-[family-name:var(--font-mono)]">
              <option value="blobs">Blobs</option>
              <option value="moons">Moons</option>
              <option value="circles">Circles</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-ink-subtle dark:text-night-muted font-[family-name:var(--font-mono)]">Activation</label>
            <select value={act} onChange={e => setAct(e.target.value as Activation)}
              className="mt-1 w-full bg-cream dark:bg-night-card border border-cream-border dark:border-night-border rounded px-3 py-2 text-[13px] font-[family-name:var(--font-mono)]">
              <option value="relu">ReLU</option>
              <option value="sigmoid">Sigmoid</option>
              <option value="tanh">Tanh</option>
            </select>
          </div>
          <SliderRow label="H" min={2} max={16} step={1} value={hidden} onChange={(v) => setHidden(Math.round(v))} />
          <SliderRow label="η" min={0.05} max={3} step={0.05} value={lr} onChange={setLr} />
          <div className="flex gap-2">
            <button onClick={() => setPlaying(p => !p)}
              className="flex-1 px-4 py-1.5 rounded-full border border-teal/40 dark:border-teal-dark/40 bg-teal/10 dark:bg-teal-dark/10 text-teal dark:text-teal-dark text-[13px] font-[family-name:var(--font-mono)]">
              {playing ? 'Pause' : 'Play'}
            </button>
            <button onClick={() => {
              modelRef.current = initMLP(hidden, act)
              queueMicrotask(() => { setEpoch(0); setLosses([]) })
            }} className="px-3 py-1.5 rounded-full border border-cream-border dark:border-night-border text-[12px] text-ink-subtle dark:text-night-muted">
              Reset
            </button>
          </div>
          <div className="text-[12px] text-ink-subtle dark:text-night-muted font-[family-name:var(--font-mono)]">
            epoch {epoch} {'\u00B7'} acc {(accuracy * 100).toFixed(0)}% {'\u00B7'} loss {losses.at(-1)?.toFixed(3) ?? '—'}
          </div>
          <canvas ref={lossCanvasRef} className="w-full bg-cream-dark/30 dark:bg-night-card/40 rounded" style={{ height: 80 }} />
        </div>
      </div>

      <p className="sr-only">MLP training section. Currently at epoch {epoch} with accuracy {(accuracy * 100).toFixed(0)}%.</p>
    </section>
  )
}

// --- Section 7 helpers: Autoencoder vs PCA ---
type AEDataset = 'linear' | 'curve'

function genAEDataset(kind: AEDataset, n: number = 120): Array<[number, number]> {
  const pts: Array<[number, number]> = []
  const noise = () => (Math.random() - 0.5) * 0.04
  if (kind === 'linear') {
    for (let i = 0; i < n; i++) {
      const t = (Math.random() - 0.5) * 0.8
      pts.push([0.5 + t + noise(), 0.5 + t + noise()])
    }
  } else {
    for (let i = 0; i < n; i++) {
      const a = Math.PI * Math.random()
      pts.push([0.5 + 0.32 * Math.cos(a) + noise(), 0.3 + 0.32 * Math.sin(a) + noise()])
    }
  }
  return pts
}

function pcaReconstruct(pts: Array<[number, number]>): Array<[number, number]> {
  const n = pts.length
  const mx = pts.reduce((s, p) => s + p[0], 0) / n
  const my = pts.reduce((s, p) => s + p[1], 0) / n
  let cxx = 0, cxy = 0, cyy = 0
  for (const [x, y] of pts) {
    cxx += (x - mx) ** 2; cyy += (y - my) ** 2; cxy += (x - mx) * (y - my)
  }
  cxx /= n; cyy /= n; cxy /= n
  const trace = cxx + cyy
  const det = cxx * cyy - cxy * cxy
  const lam = trace / 2 + Math.sqrt(Math.max(0, trace * trace / 4 - det))
  let ex = cxy, ey = lam - cxx
  if (Math.abs(ex) < 1e-9 && Math.abs(ey) < 1e-9) { ex = 1; ey = 0 }
  const norm = Math.hypot(ex, ey); ex /= norm; ey /= norm
  return pts.map(([x, y]) => {
    const dx = x - mx, dy = y - my
    const t = dx * ex + dy * ey
    return [mx + t * ex, my + t * ey] as [number, number]
  })
}

// Architecture: 2 → 1 (tanh encoder, the bottleneck) → H (tanh decoder hidden) → 2 (linear output).
// A linear decoder from a 1D bottleneck is mathematically restricted to line reconstructions —
// the decoder hidden layer lets the AE curve through non-linear 1D manifolds (the whole point
// of comparing to PCA, which is linear by construction).
const AE_HIDDEN = 4

type AEModel = {
  W1: [number, number]; b1: number              // 2→1 encoder
  W2a: number[]; b2a: number[]                  // 1→H decoder hidden (tanh)
  W2b: [number[], number[]]                     // H→2 decoder output weights (row 0: rx, row 1: ry)
  b2b: [number, number]                         // H→2 decoder output biases
}

function initAE(): AEModel {
  const r = () => (Math.random() - 0.5) * 0.6
  return {
    W1: [r(), r()],
    b1: r(),
    W2a: Array.from({ length: AE_HIDDEN }, r),
    b2a: Array.from({ length: AE_HIDDEN }, r),
    W2b: [Array.from({ length: AE_HIDDEN }, r), Array.from({ length: AE_HIDDEN }, r)],
    b2b: [r(), r()],
  }
}

function aeForward(m: AEModel, x: number, y: number): { z: number; h: number[]; rx: number; ry: number } {
  const z = Math.tanh(m.W1[0] * x + m.W1[1] * y + m.b1)
  const h = m.W2a.map((w, i) => Math.tanh(w * z + m.b2a[i]))
  const rx = h.reduce((s, hi, i) => s + hi * m.W2b[0][i], m.b2b[0])
  const ry = h.reduce((s, hi, i) => s + hi * m.W2b[1][i], m.b2b[1])
  return { z, h, rx, ry }
}

function trainAE(m: AEModel, data: Array<[number, number]>, lr: number, epochs: number) {
  for (let e = 0; e < epochs; e++) {
    for (const [x, y] of data) {
      const { z, h, rx, ry } = aeForward(m, x, y)
      const ex = rx - x
      const ey = ry - y
      // Output layer gradients
      for (let i = 0; i < AE_HIDDEN; i++) {
        const dW2bx = ex * h[i]
        const dW2by = ey * h[i]
        // Hidden layer gradient: dL/dh[i] = ex * W2b[0][i] + ey * W2b[1][i]
        const dh = ex * m.W2b[0][i] + ey * m.W2b[1][i]
        // Through tanh: dL/d(h_pre) = dh * (1 - h[i]^2)
        const dhPre = dh * (1 - h[i] * h[i])
        const dW2a = dhPre * z
        const db2a = dhPre
        m.W2b[0][i] -= lr * dW2bx
        m.W2b[1][i] -= lr * dW2by
        m.W2a[i]    -= lr * dW2a
        m.b2a[i]    -= lr * db2a
      }
      m.b2b[0] -= lr * ex
      m.b2b[1] -= lr * ey
      // Encoder gradient: dL/dz = Σ_i dhPre[i] * W2a[i], propagated through encoder tanh
      let dz = 0
      for (let i = 0; i < AE_HIDDEN; i++) {
        const dh = ex * m.W2b[0][i] + ey * m.W2b[1][i]
        const dhPre = dh * (1 - h[i] * h[i])
        dz += dhPre * m.W2a[i]
      }
      const dzPre = dz * (1 - z * z)
      m.W1[0] -= lr * dzPre * x
      m.W1[1] -= lr * dzPre * y
      m.b1    -= lr * dzPre
    }
  }
}

function aeReconstruct(pts: Array<[number, number]>, model: AEModel): Array<[number, number]> {
  return pts.map(([x, y]) => {
    const { rx, ry } = aeForward(model, x, y)
    return [rx, ry] as [number, number]
  })
}

function mseAE(a: Array<[number, number]>, b: Array<[number, number]>): number {
  let s = 0
  for (let i = 0; i < a.length; i++) {
    s += (a[i][0] - b[i][0]) ** 2 + (a[i][1] - b[i][1]) ** 2
  }
  return s / a.length
}

function Section7() {
  const [sectionRef, visible] = useScrollReveal()
  const [kind, setKind] = useState<AEDataset>('linear')
  const [data, setData] = useState<Array<[number, number]>>([])
  const [aeModel, setAeModel] = useState<AEModel | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [themeTick, setThemeTick] = useState(0)

  useEffect(() => {
    const obs = new MutationObserver(() => setThemeTick(t => t + 1))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  // Generate + train when dataset changes
  useEffect(() => {
    const pts = genAEDataset(kind)
    const m = initAE()
    trainAE(m, pts, 0.05, 800)
    queueMicrotask(() => {
      setData(pts)
      setAeModel(m)
    })
  }, [kind])

  const pcaPts = useMemo(() => data.length ? pcaReconstruct(data) : [], [data])
  const aePts  = useMemo(() => data.length && aeModel ? aeReconstruct(data, aeModel) : [], [data, aeModel])
  const pcaErr = useMemo(() => data.length ? mseAE(data, pcaPts) : 0, [data, pcaPts])
  const aeErr  = useMemo(() => data.length && aeModel ? mseAE(data, aePts) : 0, [data, aePts, aeModel])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !data.length) return
    const setup = setupCanvas(canvas, 280); if (!setup) return
    const { ctx, W, H } = setup
    const c = getThemeColors()

    const panelW = W / 3
    const drawPanel = (offsetX: number, title: string, recon: Array<[number, number]> | null, color: string) => {
      ctx.fillStyle = c.subtext
      ctx.font = '11px var(--font-mono), monospace'
      ctx.textAlign = 'center'; ctx.textBaseline = 'top'
      ctx.fillText(title, offsetX + panelW / 2, 6)
      data.forEach(([x, y]) => {
        ctx.fillStyle = c.subtext
        ctx.globalAlpha = 0.4
        ctx.beginPath(); ctx.arc(offsetX + x * panelW, y * H, 2.5, 0, Math.PI * 2); ctx.fill()
      })
      ctx.globalAlpha = 1
      if (!recon) return
      data.forEach(([x, y], i) => {
        const [rx, ry] = recon[i]
        ctx.strokeStyle = color; ctx.globalAlpha = 0.4; ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(offsetX + x * panelW, y * H)
        ctx.lineTo(offsetX + rx * panelW, ry * H)
        ctx.stroke()
        ctx.globalAlpha = 1
        ctx.fillStyle = color
        ctx.beginPath(); ctx.arc(offsetX + rx * panelW, ry * H, 3, 0, Math.PI * 2); ctx.fill()
      })
    }

    drawPanel(0,            'Original',                              null,    c.text)
    drawPanel(panelW,       `PCA (MSE ${pcaErr.toFixed(4)})`,        pcaPts,  c.mauve)
    drawPanel(2 * panelW,   `Autoencoder (MSE ${aeErr.toFixed(4)})`, aePts,   c.teal)
  }, [data, pcaPts, aePts, pcaErr, aeErr, themeTick])

  return (
    <section ref={sectionRef} aria-labelledby="nn-section-7" className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="text-center mb-8">
        <p className="font-[family-name:var(--font-mono)] text-[12px] tracking-[0.3em] uppercase text-teal dark:text-teal-dark">07/</p>
        <h2 id="nn-section-7" className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl text-ink dark:text-night-text mt-2">Autoencoder vs PCA</h2>
        <p className="mt-3 text-[14px] text-ink-subtle dark:text-night-muted max-w-xl mx-auto">
          Both compress 2D points down to a single number, then reconstruct. PCA is restricted to a straight axis. An autoencoder with a nonlinear hidden unit can curve.
        </p>
      </div>

      <div className="flex gap-2 justify-center mb-4">
        {(['linear','curve'] as AEDataset[]).map(k => (
          <button key={k} onClick={() => setKind(k)}
            className={`px-3 py-1.5 rounded-full text-[12px] font-[family-name:var(--font-mono)] border transition-colors ${
              kind === k
                ? 'bg-teal/15 dark:bg-teal-dark/15 border-teal/40 dark:border-teal-dark/40 text-teal dark:text-teal-dark'
                : 'border-cream-border dark:border-night-border text-ink-subtle dark:text-night-muted hover:border-teal/40'
            }`}>
            {k === 'linear' ? 'Linear blob' : 'Curved ring'}
          </button>
        ))}
      </div>

      <canvas ref={canvasRef} className="w-full bg-cream-dark/30 dark:bg-night-card/40 rounded-lg" style={{ height: 280 }} />

      <p className="mt-4 text-[13px] text-ink-subtle dark:text-night-muted text-center">
        {kind === 'linear'
          ? 'On linear data, both reconstructions sit on the same axis — the AE has effectively rediscovered PCA.'
          : 'On the curved ring, PCA collapses to a straight line through the middle. The AE bends through the data.'}
      </p>

      <p className="mt-2 text-center text-[12px] text-ink-subtle dark:text-night-muted">
        The linear story in depth →{' '}
        <Link href="/learn/pca" className="text-mauve dark:text-mauve-dark hover:underline">/learn/pca</Link>
      </p>
    </section>
  )
}

export function NeuralNetworks() {
  return (
    <div className="mx-auto max-w-5xl px-6 sm:px-10 lg:px-12">
      <div className="text-center mb-16">
        <p className="font-[family-name:var(--font-mono)] text-[13px] tracking-[0.3em] uppercase mb-4 text-peach dark:text-peach-dark">
          07/
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl text-ink dark:text-night-text mb-4">
          Neural Networks
        </h1>
        <p className="text-[15px] text-ink-subtle dark:text-night-muted">
          From a single neuron to a trained MLP
        </p>
        <div className="mt-4 h-px w-16 mx-auto bg-mauve dark:bg-mauve-dark" />
      </div>

      <Section1 />
      <div className="py-12 [&>div]:mb-0"><SectionDivider absolute={false} /></div>
      <Section2 />
      <div className="py-12 [&>div]:mb-0"><SectionDivider absolute={false} /></div>
      <Section3 />
      <div className="py-12 [&>div]:mb-0"><SectionDivider absolute={false} /></div>
      <Section4 />
      <div className="py-12 [&>div]:mb-0"><SectionDivider absolute={false} /></div>
      <Section5 />
      <div className="py-12 [&>div]:mb-0"><SectionDivider absolute={false} /></div>
      <Section6 />
      <div className="py-12 [&>div]:mb-0"><SectionDivider absolute={false} /></div>
      <Section7 />
    </div>
  )
}
