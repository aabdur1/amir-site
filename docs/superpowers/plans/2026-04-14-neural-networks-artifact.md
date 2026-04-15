# Neural Networks Artifact Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the 7th interactive learn artifact — Neural Networks — covering neuron anatomy, XOR/depth, activations, backprop, momentum, live training, and autoencoder vs PCA.

**Architecture:** Single-file React component (`components/learn/neural-networks.tsx`) following the existing learn-artifact pattern: 7 inner `Section{N}` components wired through one exported `NeuralNetworks` function. Canvas + theme-token reads via `getComputedStyle`, MutationObserver for dark/light re-draws, `useScrollReveal` for entry animations. Loaded with `ssr: false` via `dynamic-artifacts.tsx` because several sections use `Math.random()` in initializers.

**Tech Stack:** Next.js 16, React, TypeScript, Tailwind 4, Catppuccin tokens. No new dependencies — all training math (forward pass, backprop, AE) implemented inline. Accent color: Catppuccin teal `#179299` / `#94e2d5`.

**Spec:** `docs/superpowers/specs/2026-04-14-neural-networks-artifact-design.md`

**Note on TDD:** This repo has no JS test framework configured and existing learn artifacts have no automated tests. Verification per task is: (1) `npm run lint` clean, (2) `npm run dev` and visually confirm in browser at the relevant section, (3) toggle dark/light, (4) test on mobile width via DevTools. Failing to invent test infra here matches the project's established convention. The final task includes a full-build smoke check.

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `components/learn/neural-networks.tsx` | All 7 sections, theme helpers, canvas drawing, training math |
| Modify | `lib/learn/artifacts.ts` | Add `neural-networks` entry as the 7th `ARTIFACTS` element |
| Modify | `components/learn/dynamic-artifacts.tsx` | Add `NeuralNetworks` dynamic export with `ssr: false` |
| Modify | `app/learn/[slug]/page.tsx` | Import `NeuralNetworks`, add to `ARTIFACT_COMPONENTS` map |
| Modify | `CLAUDE.md` | Add `neural-networks.tsx` to file-structure section + key patterns |

No new shared abstractions. The `getThemeColors`, `setupCanvas`, and section-shell patterns are intentionally re-implemented inline (matching `clustering.tsx`, `pca.tsx`, etc.) to keep each artifact self-contained.

---

## Task 1: Scaffolding — register the artifact and create the empty component shell

**Files:**
- Create: `components/learn/neural-networks.tsx`
- Modify: `lib/learn/artifacts.ts`
- Modify: `components/learn/dynamic-artifacts.tsx`
- Modify: `app/learn/[slug]/page.tsx`

- [ ] **Step 1: Create the empty component file**

```tsx
// components/learn/neural-networks.tsx
'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useScrollReveal } from '@/lib/hooks'
import { SectionDivider } from '@/components/section-divider'

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
    teal:     isDark ? '#94e2d5' : '#179299',  // primary accent
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

// --- Section placeholders (filled in subsequent tasks) ---
function Section1() { return <SectionStub n="01" title="Anatomy of a neuron" /> }
function Section2() { return <SectionStub n="02" title="XOR & linear separability" /> }
function Section3() { return <SectionStub n="03" title="Activation functions & vanishing gradients" /> }
function Section4() { return <SectionStub n="04" title="Backpropagation walkthrough" /> }
function Section5() { return <SectionStub n="05" title="Momentum vs vanilla GD" /> }
function Section6() { return <SectionStub n="06" title="Training a tiny network" /> }
function Section7() { return <SectionStub n="07" title="Autoencoder vs PCA" /> }

function SectionStub({ n, title }: { n: string; title: string }) {
  return (
    <section className="my-16 text-center text-ink-subtle dark:text-night-muted">
      <p className="font-[family-name:var(--font-mono)] text-[12px] tracking-[0.3em] uppercase text-teal dark:text-teal-dark">{n}/</p>
      <h2 className="font-[family-name:var(--font-display)] text-2xl mt-2">{title}</h2>
      <p className="mt-2 text-[13px]">Coming next.</p>
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
```

> **Note on `text-teal` / `text-teal-dark`:** these Tailwind utilities may not exist in the current `@theme` block. If `npm run lint` or the dev server complains, swap stub colors to `text-sapphire` for the scaffolding step — section 1's task adds the teal token properly.

- [ ] **Step 2: Add the artifact metadata entry**

Modify `lib/learn/artifacts.ts` — append a 7th entry to `ARTIFACTS`:

```ts
{
  slug: 'neural-networks',
  title: 'Neural Networks',
  shortTitle: 'Neural Networks',
  description: 'From a single neuron to a trained MLP — weights, activations, backpropagation, and why depth matters.',
  number: '07',
  subtopics: ['Neuron anatomy', 'XOR & depth', 'Activations', 'Backprop', 'Momentum', 'Training', 'Autoencoder vs PCA'],
  sectionCount: 7,
},
```

- [ ] **Step 3: Add the dynamic export**

Modify `components/learn/dynamic-artifacts.tsx` — append:

```ts
export const NeuralNetworks = dynamic(
  () => import('./neural-networks').then(m => ({ default: m.NeuralNetworks })),
  { ssr: false }
)
```

- [ ] **Step 4: Wire into the route component map**

Modify `app/learn/[slug]/page.tsx`:

In the import line that already imports `LogLossCrossEntropy, PCA, Clustering, SHAP`, add `NeuralNetworks`:

```ts
import { LogLossCrossEntropy, PCA, Clustering, SHAP, NeuralNetworks } from '@/components/learn/dynamic-artifacts'
```

In the `ARTIFACT_COMPONENTS` map, add:

```ts
'neural-networks': NeuralNetworks,
```

- [ ] **Step 5: Add the teal token to globals.css**

Modify `app/globals.css` — inside the `@theme {}` block (next to existing accent tokens), add:

```css
--color-teal: #179299;
--color-teal-dark: #94e2d5;
```

Find the existing `--color-mauve`, `--color-peach`, etc. tokens and add the two teal lines alongside them. If those colors are also registered via `@property` for smooth interpolation, register teal the same way:

```css
@property --color-teal { syntax: "<color>"; inherits: false; initial-value: #179299; }
@property --color-teal-dark { syntax: "<color>"; inherits: false; initial-value: #94e2d5; }
```

- [ ] **Step 6: Verify scaffolding renders**

```bash
npm run lint
```
Expected: clean (or only the known pre-existing `interactive-headshot.tsx` warning).

```bash
npm run dev
```
Open `http://localhost:3000/learn/neural-networks`. Expected: page renders with title "Neural Networks", section number badge "07/", 7 stub sections each showing their number + title placeholder, prev arrow points to `/learn/shap`, no next arrow.

Toggle dark mode — colors flip without flash.

Open `/learn` — confirm the index now shows a 7th card for Neural Networks.

- [ ] **Step 7: Commit**

```bash
git add components/learn/neural-networks.tsx \
        components/learn/dynamic-artifacts.tsx \
        lib/learn/artifacts.ts \
        app/learn/[slug]/page.tsx \
        app/globals.css
git commit -m "feat: scaffold Neural Networks learn artifact (07/)"
```

---

## Task 2: Section 1 — Anatomy of a neuron

**Files:**
- Modify: `components/learn/neural-networks.tsx` (replace `Section1` stub)

A single neuron diagram with 3 inputs, 3 weights, 1 bias, and an activation dropdown. All values controllable via sliders/dropdown; canvas re-renders on change.

- [ ] **Step 1: Add activation-function helpers at the top of the file**

Below the existing `setupCanvas` helper, add a pure module-level helpers block:

```ts
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
```

- [ ] **Step 2: Implement `Section1`**

Replace the `Section1` stub. The component owns:
- State: `inputs: [number, number, number]` (default `[0.5, -0.3, 0.8]`), `weights: [number, number, number]` (default `[0.7, -0.4, 0.5]`), `bias` (default `0.1`), `activation: Activation` (default `'sigmoid'`).
- One canvas ref for the neuron diagram.
- `useScrollReveal()` for entry animation.
- A `useEffect` that re-draws the diagram whenever any state changes OR theme changes.

```tsx
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

    // Layout: 3 input nodes on left, 1 neuron in middle, output bar on right
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

    // Draw input nodes with values inside
    inputs.forEach((x, i) => {
      ctx.fillStyle = c.surface
      ctx.beginPath(); ctx.arc(inputXs, inputYs[i], nodeR, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = c.axis; ctx.lineWidth = 1; ctx.stroke()
      ctx.fillStyle = c.text
      ctx.font = '13px var(--font-mono), monospace'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(x.toFixed(2), inputXs, inputYs[i])
      // weight label on edge
      ctx.fillStyle = c.subtext
      ctx.font = '11px var(--font-mono), monospace'
      const midX = (inputXs + neuronX) / 2
      const midY = (inputYs[i] + neuronY) / 2 - 8
      ctx.fillText(`w=${weights[i].toFixed(2)}`, midX, midY)
    })

    // Draw neuron node (Σ)
    ctx.fillStyle = c.mantle
    ctx.beginPath(); ctx.arc(neuronX, neuronY, nodeR + 6, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = c.teal; ctx.lineWidth = 2; ctx.stroke()
    ctx.fillStyle = c.text
    ctx.font = '14px var(--font-display), serif'
    ctx.fillText('Σ', neuronX, neuronY - 2)
    // bias label below
    ctx.fillStyle = c.peach
    ctx.font = '11px var(--font-mono), monospace'
    ctx.fillText(`b=${bias.toFixed(2)}`, neuronX, neuronY + nodeR + 18)
    // net value above
    ctx.fillStyle = c.subtext
    ctx.fillText(`net=${net.toFixed(2)}`, neuronX, neuronY - nodeR - 14)

    // Draw activation curve as small inset above output
    drawActivationInset(ctx, neuronX + 50, neuronY - 70, 90, 50, activation, net, c)

    // Output bar (right side)
    drawOutputBar(ctx, outputX, neuronY, 50, out, activation, c)

    // Output value text
    ctx.fillStyle = c.text
    ctx.font = '14px var(--font-mono), monospace'
    ctx.textAlign = 'left'
    ctx.fillText(`y=${out.toFixed(3)}`, outputX - 18, neuronY + 50)
  }, [inputs, weights, bias, activation, net, out, themeTick])

  // ... return JSX (controls + canvas) — see Step 3
}

// Helper: small inset showing activation curve with current net marked
function drawActivationInset(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
  act: Activation, currentNet: number, c: ReturnType<typeof getThemeColors>,
) {
  ctx.save()
  ctx.translate(x, y)
  ctx.strokeStyle = c.axis; ctx.lineWidth = 1
  ctx.strokeRect(0, 0, w, h)
  // Plot activation over [-3, 3]
  ctx.strokeStyle = c.teal; ctx.lineWidth = 1.5
  ctx.beginPath()
  for (let i = 0; i <= 60; i++) {
    const u = -3 + (6 * i) / 60
    const v = activate(u, act)
    // Map u in [-3,3] to x in [0,w], v in [-1,1] (or [0,1] for sigmoid) to y
    const px = (i / 60) * w
    const yMin = act === 'sigmoid' || act === 'relu' ? 0 : -1.2
    const yMax = act === 'sigmoid' ? 1 : (act === 'relu' ? 3 : 1.2)
    const py = h - ((v - yMin) / (yMax - yMin)) * h
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
  }
  ctx.stroke()
  // Marker for current net
  const clamped = Math.max(-3, Math.min(3, currentNet))
  const mx = ((clamped + 3) / 6) * w
  ctx.fillStyle = c.peach
  ctx.beginPath(); ctx.arc(mx, h - 4, 3, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
}

// Helper: vertical bar showing activated output magnitude
function drawOutputBar(
  ctx: CanvasRenderingContext2D, cx: number, cy: number, halfH: number,
  value: number, act: Activation, c: ReturnType<typeof getThemeColors>,
) {
  const min = act === 'sigmoid' || act === 'relu' ? 0 : -1
  const max = act === 'sigmoid' ? 1 : (act === 'relu' ? 3 : 1)
  const norm = (value - min) / (max - min)
  const barH = halfH * 2
  // Track
  ctx.fillStyle = c.surface
  ctx.fillRect(cx - 8, cy - halfH, 16, barH)
  // Fill from baseline (zero for tanh/linear, bottom for sigmoid/relu)
  const baselineY = act === 'tanh' || act === 'linear'
    ? cy
    : cy + halfH
  const fillY = cy + halfH - norm * barH
  ctx.fillStyle = c.teal
  ctx.fillRect(cx - 8, Math.min(baselineY, fillY), 16, Math.abs(fillY - baselineY))
  ctx.strokeStyle = c.axis; ctx.lineWidth = 1
  ctx.strokeRect(cx - 8, cy - halfH, 16, barH)
}
```

- [ ] **Step 3: Add the JSX (controls + canvas + heading)**

Inside `Section1`, return:

```tsx
return (
  <section ref={sectionRef} aria-labelledby="nn-section-1" className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
    {/* Section header */}
    <div className="text-center mb-8">
      <p className="font-[family-name:var(--font-mono)] text-[12px] tracking-[0.3em] uppercase text-teal dark:text-teal-dark">01/</p>
      <h2 id="nn-section-1" className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl text-ink dark:text-night-text mt-2">Anatomy of a neuron</h2>
      <p className="mt-3 text-[14px] text-ink-subtle dark:text-night-muted max-w-xl mx-auto">
        Inputs are weighted, summed with a bias, then squashed by an activation function. Drag the sliders to feel how each piece contributes.
      </p>
    </div>

    {/* Canvas */}
    <canvas ref={canvasRef} className="w-full bg-cream-dark/30 dark:bg-night-card/40 rounded-lg" style={{ height: 320 }} />

    {/* Controls */}
    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Inputs column */}
      <div>
        <p className="text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-ink-subtle dark:text-night-muted mb-3">Inputs</p>
        {[0,1,2].map(i => (
          <SliderRow key={i} label={`x${i+1}`} min={-1} max={1} step={0.01} value={inputs[i]}
            onChange={(v) => setInputs(prev => { const next = [...prev] as [number,number,number]; next[i] = v; return next })} />
        ))}
      </div>
      {/* Weights column */}
      <div>
        <p className="text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-ink-subtle dark:text-night-muted mb-3">Weights</p>
        {[0,1,2].map(i => (
          <SliderRow key={i} label={`w${i+1}`} min={-2} max={2} step={0.01} value={weights[i]}
            onChange={(v) => setWeights(prev => { const next = [...prev] as [number,number,number]; next[i] = v; return next })} />
        ))}
      </div>
      {/* Bias + activation column */}
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

    {/* SR-only summary */}
    <p className="sr-only">Current neuron output: {out.toFixed(3)} using {activation} activation, with pre-activation net {net.toFixed(3)}.</p>
  </section>
)
```

Add a small reusable `SliderRow` helper at module scope (above `Section1`):

```tsx
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
```

- [ ] **Step 4: Verify section renders and reacts**

```bash
npm run lint
npm run dev
```

Open `/learn/neural-networks#`. Confirm:
- 3 input edges visible, widths change as you drag input/weight sliders.
- Edges turn red when their `w*x` product is negative, teal when positive.
- The `Σ` neuron node updates the `net=` text live.
- Activation inset shows the currently-selected curve with a peach dot at the current net position.
- Output bar fills proportionally; sigmoid stays in [0,1], tanh in [-1,1], relu starts at 0.
- Toggling dark mode redraws cleanly.
- Resizing the window doesn't break the canvas (it should rescale — if not, add a `ResizeObserver` re-trigger of `themeTick` increment).

- [ ] **Step 5: Commit**

```bash
git add components/learn/neural-networks.tsx
git commit -m "feat(nn): section 01 — anatomy of a neuron"
```

---

## Task 3: Section 2 — XOR & linear separability

**Files:**
- Modify: `components/learn/neural-networks.tsx` (replace `Section2` stub)

Two-mode canvas: single line (impossible) → toggle on hidden layer → two lines composing the AND region.

- [ ] **Step 1: Implement state and helpers**

```tsx
function Section2() {
  const [sectionRef, visible] = useScrollReveal()
  const [hidden, setHidden] = useState(false)
  // Single-layer line endpoints (canvas coords as fractions 0..1)
  const [line1, setLine1] = useState({ a: { x: 0.05, y: 0.5 }, b: { x: 0.95, y: 0.5 } })
  // Second line shown only when hidden=true
  const [line2, setLine2] = useState({ a: { x: 0.5, y: 0.05 }, b: { x: 0.5, y: 0.95 } })
  const [dragging, setDragging] = useState<{ which: 1 | 2; end: 'a' | 'b' } | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [themeTick, setThemeTick] = useState(0)

  useEffect(() => {
    const obs = new MutationObserver(() => setThemeTick(t => t + 1))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  // 4 XOR points, in unit-square coords. Class A = (0,0), (1,1); Class B = (0,1), (1,0)
  const points = useMemo(() => [
    { x: 0.15, y: 0.85, cls: 'A' as const }, // (0,0) – flipped because canvas y grows downward; we'll show "0" at bottom
    { x: 0.85, y: 0.15, cls: 'A' as const }, // (1,1)
    { x: 0.15, y: 0.15, cls: 'B' as const }, // (0,1)
    { x: 0.85, y: 0.85, cls: 'B' as const }, // (1,0)
  ], [])

  // Side of a line that point p is on (returns sign)
  function sideOf(line: typeof line1, p: { x: number; y: number }) {
    const dx = line.b.x - line.a.x
    const dy = line.b.y - line.a.y
    return Math.sign((p.x - line.a.x) * dy - (p.y - line.a.y) * dx)
  }

  function classifyPoint(p: { x: number; y: number }) {
    if (!hidden) {
      // Single line: side > 0 → predict A, else B
      return sideOf(line1, p) >= 0 ? 'A' : 'B'
    }
    // AND of two half-planes for "A region" — both sides positive => A
    const s1 = sideOf(line1, p) >= 0
    const s2 = sideOf(line2, p) >= 0
    return (s1 && s2) ? 'A' : 'B'
  }
}
```

- [ ] **Step 2: Drawing logic**

Inside `Section2`, add the drawing `useEffect`. Strategy:
1. Fill background classification regions by sampling a low-resolution grid (e.g. 60×60), coloring each cell teal-tinted (predicted A) or peach-tinted (predicted B) at low alpha.
2. Draw the 4 XOR points as filled circles — A class uses `c.teal`, B uses `c.peach`. If a point is misclassified, add a red ring.
3. Draw the line(s) with draggable handle dots at endpoints.
4. Axis labels "0" and "1" on the corners.

```ts
useEffect(() => {
  const canvas = canvasRef.current
  if (!canvas) return
  const setup = setupCanvas(canvas, 380)
  if (!setup) return
  const { ctx, W, H } = setup
  const c = getThemeColors()

  // 1. Region tinting
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
    // Handles
    ;[line.a, line.b].forEach(end => {
      ctx.fillStyle = c.mantle
      ctx.beginPath(); ctx.arc(end.x * W, end.y * H, 7, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke()
    })
  }
  drawLine(line1, c.mauve)
  if (hidden) drawLine(line2, c.sapphire)

  // 4. Axis labels (corners)
  ctx.fillStyle = c.subtext
  ctx.font = '11px var(--font-mono), monospace'
  ctx.textAlign = 'left'; ctx.textBaseline = 'top'
  ctx.fillText('(0,1)', 6, 6)
  ctx.textAlign = 'right'; ctx.fillText('(1,1)', W - 6, 6)
  ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'
  ctx.fillText('(0,0)', 6, H - 6)
  ctx.textAlign = 'right'; ctx.fillText('(1,0)', W - 6, H - 6)
}, [hidden, line1, line2, points, themeTick])
```

- [ ] **Step 3: Pointer handlers for dragging endpoints**

```ts
function pointerToFraction(e: React.PointerEvent<HTMLCanvasElement>) {
  const rect = e.currentTarget.getBoundingClientRect()
  return { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height }
}

function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
  const p = pointerToFraction(e)
  const lines = [{ k: 1 as const, l: line1 }]
  if (hidden) lines.push({ k: 2 as const, l: line2 })
  for (const { k, l } of lines) {
    for (const end of ['a', 'b'] as const) {
      const dx = (l[end].x - p.x); const dy = (l[end].y - p.y)
      if (Math.hypot(dx * 600, dy * 380) < 14) { // pixel-space hit-test
        setDragging({ which: k, end })
        e.currentTarget.setPointerCapture(e.pointerId)
        return
      }
    }
  }
}

function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
  if (!dragging) return
  const p = pointerToFraction(e)
  const clamp = (v: number) => Math.max(0.02, Math.min(0.98, v))
  if (dragging.which === 1) {
    setLine1(prev => ({ ...prev, [dragging.end]: { x: clamp(p.x), y: clamp(p.y) } }))
  } else {
    setLine2(prev => ({ ...prev, [dragging.end]: { x: clamp(p.x), y: clamp(p.y) } }))
  }
}

function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
  setDragging(null)
  e.currentTarget.releasePointerCapture(e.pointerId)
}
```

Wire into the canvas: `<canvas ... onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} />`.

- [ ] **Step 4: Add JSX (header, canvas, toggle, copy)**

```tsx
const misclassified = points.filter(p => classifyPoint(p) !== p.cls).length

return (
  <section ref={sectionRef} aria-labelledby="nn-section-2" className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
    <div className="text-center mb-8">
      <p className="font-[family-name:var(--font-mono)] text-[12px] tracking-[0.3em] uppercase text-teal dark:text-teal-dark">02/</p>
      <h2 id="nn-section-2" className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl text-ink dark:text-night-text mt-2">XOR & linear separability</h2>
      <p className="mt-3 text-[14px] text-ink-subtle dark:text-night-muted max-w-xl mx-auto">
        A single perceptron can only draw one straight line. XOR needs two — that's why hidden layers exist.
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
```

- [ ] **Step 5: Verify**

```bash
npm run lint
npm run dev
```

Confirm:
- Single-line mode: no orientation of one line classifies all 4 points correctly. Misclass count never reaches 0.
- Click "Add hidden layer": second sapphire line appears. With both lines roughly forming an X through the center, the AND region can isolate (0,0) and (1,1) correctly → misclass goes to 0.
- Drag handles work on touch (test in DevTools mobile mode).
- Dark mode works.

- [ ] **Step 6: Commit**

```bash
git add components/learn/neural-networks.tsx
git commit -m "feat(nn): section 02 — XOR & linear separability"
```

---

## Task 4: Section 3 — Activation functions & vanishing gradients

**Files:**
- Modify: `components/learn/neural-networks.tsx` (replace `Section3` stub)

Two stacked canvases: top = activation curves (sigmoid, tanh, ReLU); bottom = their derivatives. Below: a row of "stacked-derivative" bars showing how multiplying derivatives across N layers shrinks the gradient.

- [ ] **Step 1: State and helpers**

```tsx
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
}
```

- [ ] **Step 2: Drawing — activation curves and derivatives (top two canvases)**

A reusable internal helper:

```ts
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
  // Axes
  ctx.strokeStyle = c.axis; ctx.lineWidth = 1
  // x-axis at y=0
  const yZero = H * (yRange[1] / (yRange[1] - yRange[0]))
  ctx.beginPath(); ctx.moveTo(0, yZero); ctx.lineTo(W, yZero); ctx.stroke()
  // y-axis at x=0 (which is centered)
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
```

In a `useEffect`:

```ts
useEffect(() => {
  const c = getThemeColors()
  drawCurves(curveCanvas.current, activate,             [-1.2, 1.2],  highlighted, c)
  drawCurves(derivCanvas.current, activationDerivative, [-0.1, 1.1],  highlighted, c)
  drawStack(stackCanvas.current,  depth, highlighted, c)
}, [highlighted, depth, themeTick])
```

- [ ] **Step 3: Drawing — stacked-derivative bars (bottom canvas)**

The "vanishing gradient" intuition: pick the *max* derivative for the activation (sigmoid: 0.25, tanh: 1.0, ReLU: 1.0) and raise to the depth. Show a row of bars representing the gradient magnitude after each layer, plus a final number.

```ts
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
```

- [ ] **Step 4: JSX**

```tsx
return (
  <section ref={sectionRef} aria-labelledby="nn-section-3" className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
    <div className="text-center mb-8">
      <p className="font-[family-name:var(--font-mono)] text-[12px] tracking-[0.3em] uppercase text-teal dark:text-teal-dark">03/</p>
      <h2 id="nn-section-3" className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl text-ink dark:text-night-text mt-2">Activation functions & vanishing gradients</h2>
      <p className="mt-3 text-[14px] text-ink-subtle dark:text-night-muted max-w-xl mx-auto">
        Activations decide what the neuron's output looks like. Their derivatives decide whether the network can learn — multiply small derivatives across many layers and the gradient vanishes.
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
```

- [ ] **Step 5: Verify**

```bash
npm run dev
```

Confirm:
- Three curves visible; clicking a tag highlights one.
- Derivative panel shows correct shapes (sigmoid bell capped at 0.25, tanh bell at 1.0, ReLU step).
- Sliding depth: sigmoid bars shrink to invisible by L8; ReLU bars stay full height.

- [ ] **Step 6: Commit**

```bash
git add components/learn/neural-networks.tsx
git commit -m "feat(nn): section 03 — activations & vanishing gradients"
```

---

## Task 5: Section 4 — Backpropagation walkthrough

**Files:**
- Modify: `components/learn/neural-networks.tsx` (replace `Section4` stub)

Step-through of one forward + backward pass on a fixed 2-2-1 sigmoid network. Inputs `(0.5, 0.8)`, target `1.0`, η=0.5, all initial weights `0.3`. Step button advances through 5 stages.

- [ ] **Step 1: Define the fixed network and compute pass**

Add module-level helpers above `Section4`:

```ts
type BackpropState = {
  // Forward
  h1Net: number; h1Out: number
  h2Net: number; h2Out: number
  outNet: number; outOut: number
  error: number
  // Backward
  dOut: number          // output-layer error term
  dH1: number; dH2: number
  // Weight deltas
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

  // Output layer δ = (t - o) * o * (1 - o)
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
```

- [ ] **Step 2: State + drawing the network diagram with stage-conditional highlighting**

```tsx
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
  const initialW = { wh1x1: 0.3, wh1x2: 0.3, wh2x1: 0.3, wh2x2: 0.3, wo1: 0.3, wo2: 0.3, b1: 0.0, b2: 0.0, bo: 0.0 }
  const bp = useMemo(() => computeBackprop(x1, x2, target, initialW, eta), [])
  const updatedW = useMemo(() => ({
    wh1x1: initialW.wh1x1 + bp.dW.wh1x1, wh1x2: initialW.wh1x2 + bp.dW.wh1x2,
    wh2x1: initialW.wh2x1 + bp.dW.wh2x1, wh2x2: initialW.wh2x2 + bp.dW.wh2x2,
    wo1:   initialW.wo1   + bp.dW.wo1,   wo2:   initialW.wo2   + bp.dW.wo2,
    b1: initialW.b1 + bp.dW.b1, b2: initialW.b2 + bp.dW.b2, bo: initialW.bo + bp.dW.bo,
  }), [bp])

  // ... drawing useEffect — see Step 3
}
```

- [ ] **Step 3: Draw the 2-2-1 network**

The drawing function takes the current `stage` and lights up the appropriate elements. Layout: 2 input nodes left, 2 hidden middle, 1 output right. Show numerical values below each node, weight labels on each edge.

```ts
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

  // Edges (color shifts based on stage)
  const edges: Array<{ from: [number, number]; to: [number, number]; label: string; lit: boolean; back?: boolean; gradLabel?: string }> = [
    { from: [inputXs, ys.i1], to: [hiddenX, ys.h1], label: `${w.wh1x1.toFixed(2)}`, lit: stage >= 1, back: stage >= 3, gradLabel: stage >= 3 ? `Δ${bp.dW.wh1x1.toFixed(3)}` : undefined },
    { from: [inputXs, ys.i2], to: [hiddenX, ys.h1], label: `${w.wh1x2.toFixed(2)}`, lit: stage >= 1, back: stage >= 3, gradLabel: stage >= 3 ? `Δ${bp.dW.wh1x2.toFixed(3)}` : undefined },
    { from: [inputXs, ys.i1], to: [hiddenX, ys.h2], label: `${w.wh2x1.toFixed(2)}`, lit: stage >= 1, back: stage >= 3, gradLabel: stage >= 3 ? `Δ${bp.dW.wh2x1.toFixed(3)}` : undefined },
    { from: [inputXs, ys.i2], to: [hiddenX, ys.h2], label: `${w.wh2x2.toFixed(2)}`, lit: stage >= 1, back: stage >= 3, gradLabel: stage >= 3 ? `Δ${bp.dW.wh2x2.toFixed(3)}` : undefined },
    { from: [hiddenX, ys.h1], to: [outX, ys.o],    label: `${w.wo1.toFixed(2)}`,   lit: stage >= 1, back: stage >= 3, gradLabel: stage >= 3 ? `Δ${bp.dW.wo1.toFixed(3)}`   : undefined },
    { from: [hiddenX, ys.h2], to: [outX, ys.o],    label: `${w.wo2.toFixed(2)}`,   lit: stage >= 1, back: stage >= 3, gradLabel: stage >= 3 ? `Δ${bp.dW.wo2.toFixed(3)}`   : undefined },
  ]

  edges.forEach(e => {
    ctx.strokeStyle = e.back ? c.amber : (e.lit ? c.teal : c.axis)
    ctx.globalAlpha = e.lit ? 1 : 0.4
    ctx.lineWidth = e.lit ? 2 : 1
    ctx.beginPath(); ctx.moveTo(...e.from); ctx.lineTo(...e.to); ctx.stroke()
    ctx.globalAlpha = 1
    // Weight label
    ctx.fillStyle = c.subtext
    ctx.font = '11px var(--font-mono), monospace'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(e.label, (e.from[0] + e.to[0]) / 2, (e.from[1] + e.to[1]) / 2 - 8)
    if (e.gradLabel) {
      ctx.fillStyle = c.amber
      ctx.fillText(e.gradLabel, (e.from[0] + e.to[0]) / 2, (e.from[1] + e.to[1]) / 2 + 8)
    }
  })

  // Nodes
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

  // Always show inputs lit
  node(inputXs, ys.i1, 'x₁', x1.toFixed(2), true, c.sapphire)
  node(inputXs, ys.i2, 'x₂', x2.toFixed(2), true, c.sapphire)
  // Hidden lit at stage >= 1
  node(hiddenX, ys.h1, 'h₁', stage >= 1 ? bp.h1Out.toFixed(3) : '?', stage >= 1, c.teal)
  node(hiddenX, ys.h2, 'h₂', stage >= 1 ? bp.h2Out.toFixed(3) : '?', stage >= 1, c.teal)
  // Output: teal at stage 1, red at stage 2 (showing error)
  const outColor = stage >= 2 ? c.red : c.mauve
  node(outX, ys.o, 'y', stage >= 1 ? bp.outOut.toFixed(3) : '?', stage >= 1, outColor)

  // Stage caption box
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
```

- [ ] **Step 4: JSX with Step / Reset buttons**

```tsx
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
```

- [ ] **Step 5: Verify**

`npm run dev`. Click Step through 0→4. Confirm node values match: at stage 1 each `h_i = sigmoid(0.5*0.3 + 0.8*0.3) = sigmoid(0.39) ≈ 0.596`. Output `y = sigmoid(0.596*0.3 + 0.596*0.3) = sigmoid(0.358) ≈ 0.589`. Error ≈ 0.0844. After update, `wo1` and `wo2` should each increase by `η · δ_out · h ≈ 0.5 · (1-0.589)·0.589·(1-0.589) · 0.596 ≈ 0.030`, so new weights ≈ 0.330. Cross-check the displayed numbers.

- [ ] **Step 6: Commit**

```bash
git add components/learn/neural-networks.tsx
git commit -m "feat(nn): section 04 — backpropagation walkthrough"
```

---

## Task 6: Section 5 — Momentum vs vanilla GD

**Files:**
- Modify: `components/learn/neural-networks.tsx` (replace `Section5` stub)

Two side-by-side 2D contour plots of the same loss landscape with two balls descending — vanilla on the left, momentum on the right.

- [ ] **Step 1: Loss landscape definitions and gradients**

```ts
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
```

- [ ] **Step 2: Component state + animation loop**

```tsx
function Section5() {
  const [sectionRef, visible] = useScrollReveal()
  const [landscape, setLandscape] = useState<Landscape>('ravine')
  const [lr, setLr] = useState(0.05)
  const [beta, setBeta] = useState(0.9)
  const [playing, setPlaying] = useState(false)
  const [tick, setTick] = useState(0) // forces re-renders
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
    setTick(t => t + 1)
  }, [landscape])

  // Animation loop
  useEffect(() => {
    if (!playing || reduced) return
    let raf = 0
    const step = () => {
      // Vanilla
      const [gxV, gyV] = gradAt(ballV.current.x, ballV.current.y, landscape)
      ballV.current.x -= lr * gxV
      ballV.current.y -= lr * gyV
      trailV.current.push([ballV.current.x, ballV.current.y])
      if (trailV.current.length > 200) trailV.current.shift()
      // Momentum
      const [gxM, gyM] = gradAt(ballM.current.x, ballM.current.y, landscape)
      ballM.current.vx = beta * ballM.current.vx - lr * gxM
      ballM.current.vy = beta * ballM.current.vy - lr * gyM
      ballM.current.x += ballM.current.vx
      ballM.current.y += ballM.current.vy
      trailM.current.push([ballM.current.x, ballM.current.y])
      if (trailM.current.length > 200) trailM.current.shift()
      setTick(t => t + 1)
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [playing, landscape, lr, beta, reduced])
}
```

- [ ] **Step 3: Drawing — contours + ball + trail**

```ts
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
  // World extents: x,y in [-3, 3]
  const X0 = -3, X1 = 3, Y0 = -3, Y1 = 3
  const toPx = (x: number, y: number) => [
    ((x - X0) / (X1 - X0)) * W,
    H - ((y - Y0) / (Y1 - Y0)) * H,
  ] as [number, number]

  // Sample loss to build contour fill (cheap heatmap via colored grid)
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
  // Clamp range to make small variations visible
  const range = lossMax - lossMin
  for (let j = 0; j < cells; j++) {
    for (let i = 0; i < cells; i++) {
      const v = samples[j * cells + i]
      const t = Math.min(1, (v - lossMin) / Math.max(range, 1e-6))
      // Teal at low loss, peach at high
      const alpha = 0.18 + 0.5 * t
      ctx.fillStyle = `${c.peach}${Math.round(alpha * 255).toString(16).padStart(2,'0')}`
      const x0 = (i / cells) * W
      const y0 = (j / cells) * H
      ctx.fillRect(x0, y0, W / cells + 1, H / cells + 1)
    }
  }

  // Trail
  ctx.strokeStyle = trailColor; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.7
  ctx.beginPath()
  trail.forEach(([tx, ty], i) => {
    const [px, py] = toPx(tx, ty)
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
  })
  ctx.stroke()
  ctx.globalAlpha = 1

  // Ball
  const [bx, by] = toPx(ball.x, ball.y)
  ctx.fillStyle = trailColor
  ctx.beginPath(); ctx.arc(bx, by, 6, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = c.base; ctx.lineWidth = 2; ctx.stroke()

  // Origin marker
  const [ox, oy] = toPx(0, 0)
  ctx.strokeStyle = c.axis; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(ox - 6, oy); ctx.lineTo(ox + 6, oy); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(ox, oy - 6); ctx.lineTo(ox, oy + 6); ctx.stroke()
}

useEffect(() => {
  const c = getThemeColors()
  drawLandscape(canvasV.current, landscape, ballV.current, trailV.current, c.mauve, c)
  drawLandscape(canvasM.current, landscape, ballM.current, trailM.current, c.teal, c)
}, [tick, landscape, themeTick])
```

If `reduced` is true, also run a single instant integration on play press to render the final converged state — a simple loop of 200 steps with no `requestAnimationFrame`.

- [ ] **Step 4: JSX**

```tsx
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

    <div className="mt-4 flex gap-2">
      <button onClick={() => setPlaying(p => !p)}
        className="px-4 py-1.5 rounded-full border border-teal/40 dark:border-teal-dark/40 bg-teal/10 dark:bg-teal-dark/10 text-teal dark:text-teal-dark text-[13px] font-[family-name:var(--font-mono)] hover:bg-teal/20">
        {playing ? 'Pause' : 'Play'}
      </button>
      <button onClick={() => {
        ballV.current = { x: -2, y: 1.5 }
        ballM.current = { x: -2, y: 1.5, vx: 0, vy: 0 }
        trailV.current = []; trailM.current = []
        setTick(t => t + 1)
      }} className="px-3 py-1.5 rounded-full border border-cream-border dark:border-night-border text-[12px] text-ink-subtle dark:text-night-muted hover:border-teal/40">
        Reset
      </button>
    </div>
  </section>
)
```

- [ ] **Step 5: Verify**

`npm run dev`. Press Play on the ravine — vanilla zig-zags across the narrow axis, momentum smooths the trajectory and reaches origin faster. Try saddle — vanilla can stall near the saddle, momentum escapes. Reduce β to 0 — momentum should match vanilla. Reduced-motion test: enable in OS settings, press Play, both balls jump to final state without animation.

- [ ] **Step 6: Commit**

```bash
git add components/learn/neural-networks.tsx
git commit -m "feat(nn): section 05 — momentum vs vanilla GD"
```

---

## Task 7: Section 6 — Training a tiny network

**Files:**
- Modify: `components/learn/neural-networks.tsx` (replace `Section6` stub)

The payoff section. A real MLP (1 hidden layer, configurable width) trained client-side on a 2D dataset with the decision boundary updating in real time.

- [ ] **Step 1: Dataset generators**

```ts
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
```

- [ ] **Step 2: Tiny MLP — forward + train one epoch**

```ts
type MLP = {
  W1: number[][]; b1: number[]   // shape: [H][2], [H]
  W2: number[];   b2: number     // shape: [H], scalar
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
  const out = activate(oNet, 'sigmoid') // output always sigmoid for classification
  return { hOut, out }
}

function trainEpoch(m: MLP, data: ReturnType<typeof genDataset>, lr: number): number {
  let totalLoss = 0
  // Mini SGD: shuffled order
  const order = data.map((_, i) => i).sort(() => Math.random() - 0.5)
  for (const idx of order) {
    const { x, y, label } = data[idx]
    const { hOut, out } = forwardMLP(m, x, y)
    const error = label - out
    totalLoss += 0.5 * error * error

    const dOut = error * out * (1 - out)
    // Output layer gradients
    for (let i = 0; i < m.W2.length; i++) {
      const dW2i = dOut * hOut[i]
      // Hidden layer δ for neuron i
      const hNet = m.W1[i][0] * x + m.W1[i][1] * y + m.b1[i]
      const dH = activationDerivative(hNet, m.act) * dOut * m.W2[i]
      // Update output weight
      m.W2[i] += lr * dW2i
      // Update hidden weights
      m.W1[i][0] += lr * dH * x
      m.W1[i][1] += lr * dH * y
      m.b1[i]    += lr * dH
    }
    m.b2 += lr * dOut
  }
  return totalLoss / data.length
}
```

- [ ] **Step 3: Section state and training loop**

```tsx
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

  // Reset on hyperparameter change (any of these invalidates training)
  useEffect(() => {
    dataRef.current = genDataset(kind)
    modelRef.current = initMLP(hidden, act)
    setEpoch(0); setLosses([])
  }, [kind, hidden, act])

  // Training loop — capped to ~30 epochs/sec for stability
  useEffect(() => {
    if (!playing) return
    if (reduced) {
      // Train 200 epochs synchronously and render final state
      const losses: number[] = []
      for (let i = 0; i < 200; i++) {
        losses.push(trainEpoch(modelRef.current, dataRef.current, lr))
      }
      setEpoch(200); setLosses(losses); setPlaying(false)
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
}
```

- [ ] **Step 4: Drawing — decision boundary heatmap + points + loss sparkline**

```ts
function drawTraining(
  canvas: HTMLCanvasElement | null,
  data: ReturnType<typeof genDataset>,
  model: MLP,
  c: ReturnType<typeof getThemeColors>,
) {
  if (!canvas) return
  const setup = setupCanvas(canvas, 360); if (!setup) return
  const { ctx, W, H } = setup

  // Decision boundary as colored cells (40x40 grid)
  const cells = 50
  for (let j = 0; j < cells; j++) {
    for (let i = 0; i < cells; i++) {
      const x = (i + 0.5) / cells
      const y = (j + 0.5) / cells
      const { out } = forwardMLP(model, x, y)
      // out in [0,1]; teal = label 1, peach = label 0
      const alpha = Math.abs(out - 0.5) * 1.1 + 0.05
      ctx.fillStyle = out > 0.5
        ? `${c.teal}${Math.round(Math.min(0.6, alpha) * 255).toString(16).padStart(2, '0')}`
        : `${c.peach}${Math.round(Math.min(0.6, alpha) * 255).toString(16).padStart(2, '0')}`
      ctx.fillRect((i / cells) * W, (j / cells) * H, W / cells + 1, H / cells + 1)
    }
  }

  // Data points
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

useEffect(() => {
  const c = getThemeColors()
  drawTraining(canvasRef.current, dataRef.current, modelRef.current, c)
  drawLossSparkline(lossCanvasRef.current, losses, c)
}, [epoch, losses, themeTick, kind, hidden, act])
```

- [ ] **Step 5: Compute accuracy, write JSX**

```tsx
const accuracy = useMemo(() => {
  let correct = 0
  for (const { x, y, label } of dataRef.current) {
    const { out } = forwardMLP(modelRef.current, x, y)
    if ((out > 0.5 ? 1 : 0) === label) correct++
  }
  return correct / dataRef.current.length
}, [epoch, kind, hidden, act])

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
            modelRef.current = initMLP(hidden, act); setEpoch(0); setLosses([])
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
```

- [ ] **Step 6: Verify**

`npm run dev`. With `moons + ReLU + H=8 + η=0.5`, click Play — within ~50 epochs the boundary curls between the moons and accuracy rises to 95%+. Set H=2 — accuracy plateaus around 70-80% (capacity issue). Set η=3 — loss explodes/oscillates.

- [ ] **Step 7: Commit**

```bash
git add components/learn/neural-networks.tsx
git commit -m "feat(nn): section 06 — training a tiny network"
```

---

## Task 8: Section 7 — Autoencoder vs PCA

**Files:**
- Modify: `components/learn/neural-networks.tsx` (replace `Section7` stub)

Two datasets toggleable: linear blob (where AE ≈ PCA) and a curved ring (where PCA fails). Each shows the original points, PCA reconstruction, and AE reconstruction side by side. AE trains client-side on mount.

- [ ] **Step 1: Dataset and PCA helpers**

```ts
type AEDataset = 'linear' | 'curve'

function genAEDataset(kind: AEDataset, n: number = 120): Array<[number, number]> {
  const pts: Array<[number, number]> = []
  const noise = () => (Math.random() - 0.5) * 0.04
  if (kind === 'linear') {
    // Elongated Gaussian along y = x
    for (let i = 0; i < n; i++) {
      const t = (Math.random() - 0.5) * 0.8
      pts.push([0.5 + t + noise(), 0.5 + t + noise()])
    }
  } else {
    // Half-ring
    for (let i = 0; i < n; i++) {
      const a = Math.PI * Math.random()
      pts.push([0.5 + 0.32 * Math.cos(a) + noise(), 0.3 + 0.32 * Math.sin(a) + noise()])
    }
  }
  return pts
}

// 1D PCA: find direction of max variance, project, reconstruct
function pcaReconstruct(pts: Array<[number, number]>): Array<[number, number]> {
  const n = pts.length
  const mx = pts.reduce((s, p) => s + p[0], 0) / n
  const my = pts.reduce((s, p) => s + p[1], 0) / n
  let cxx = 0, cxy = 0, cyy = 0
  for (const [x, y] of pts) {
    cxx += (x - mx) ** 2; cyy += (y - my) ** 2; cxy += (x - mx) * (y - my)
  }
  cxx /= n; cyy /= n; cxy /= n
  // Eigenvector of [[cxx, cxy],[cxy, cyy]] with larger eigenvalue
  const trace = cxx + cyy
  const det = cxx * cyy - cxy * cxy
  const lam = trace / 2 + Math.sqrt(Math.max(0, trace * trace / 4 - det))
  // Eigenvector (cxy, lam - cxx) — normalize
  let ex = cxy, ey = lam - cxx
  if (Math.abs(ex) < 1e-9 && Math.abs(ey) < 1e-9) { ex = 1; ey = 0 }
  const norm = Math.hypot(ex, ey); ex /= norm; ey /= norm
  // Project + reconstruct
  return pts.map(([x, y]) => {
    const dx = x - mx, dy = y - my
    const t = dx * ex + dy * ey
    return [mx + t * ex, my + t * ey] as [number, number]
  })
}
```

- [ ] **Step 2: Tiny 2→1→2 autoencoder, trained on mount**

```ts
type AEModel = {
  W1: [number, number]; b1: number     // 2→1
  W2: [number, number]; b2: [number, number]  // 1→2
}

function initAE(): AEModel {
  const r = () => (Math.random() - 0.5) * 0.6
  return { W1: [r(), r()], b1: r(), W2: [r(), r()], b2: [r(), r()] }
}

function aeForward(m: AEModel, x: number, y: number): { z: number; rx: number; ry: number } {
  // Encoder uses tanh nonlinearity for nonlinear case
  const z = Math.tanh(m.W1[0] * x + m.W1[1] * y + m.b1)
  // Decoder is linear (so AE = PCA when encoder is linear; tanh enables curvature)
  const rx = m.W2[0] * z + m.b2[0]
  const ry = m.W2[1] * z + m.b2[1]
  return { z, rx, ry }
}

function trainAE(m: AEModel, data: Array<[number, number]>, lr: number, epochs: number) {
  for (let e = 0; e < epochs; e++) {
    for (const [x, y] of data) {
      const z = Math.tanh(m.W1[0] * x + m.W1[1] * y + m.b1)
      const rx = m.W2[0] * z + m.b2[0]
      const ry = m.W2[1] * z + m.b2[1]
      const ex = rx - x
      const ey = ry - y
      // Decoder grads
      const dW2x = ex * z
      const dW2y = ey * z
      const db2x = ex
      const db2y = ey
      // Encoder grad: dL/dz = ex*W2x + ey*W2y; through tanh: *(1-z^2)
      const dz = (ex * m.W2[0] + ey * m.W2[1]) * (1 - z * z)
      const dW1x = dz * x
      const dW1y = dz * y
      const db1  = dz
      // Update
      m.W2[0] -= lr * dW2x; m.W2[1] -= lr * dW2y
      m.b2[0] -= lr * db2x; m.b2[1] -= lr * db2y
      m.W1[0] -= lr * dW1x; m.W1[1] -= lr * dW1y
      m.b1    -= lr * db1
    }
  }
}

function aeReconstruct(pts: Array<[number, number]>, model: AEModel): Array<[number, number]> {
  return pts.map(([x, y]) => {
    const { rx, ry } = aeForward(model, x, y)
    return [rx, ry] as [number, number]
  })
}

function mse(a: Array<[number, number]>, b: Array<[number, number]>): number {
  let s = 0
  for (let i = 0; i < a.length; i++) {
    s += (a[i][0] - b[i][0]) ** 2 + (a[i][1] - b[i][1]) ** 2
  }
  return s / a.length
}
```

- [ ] **Step 3: Component — train on mount per dataset, render three panels**

```tsx
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
    trainAE(m, pts, 0.05, 800)  // ~50ms on 120 points
    setData(pts)
    setAeModel(m)
  }, [kind])

  const pcaPts = useMemo(() => data.length ? pcaReconstruct(data) : [], [data])
  const aePts  = useMemo(() => data.length && aeModel ? aeReconstruct(data, aeModel) : [], [data, aeModel])
  const pcaErr = useMemo(() => data.length ? mse(data, pcaPts) : 0, [data, pcaPts])
  const aeErr  = useMemo(() => data.length && aeModel ? mse(data, aePts) : 0, [data, aePts, aeModel])

  // Drawing — three panels side by side in one canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !data.length) return
    const setup = setupCanvas(canvas, 280); if (!setup) return
    const { ctx, W, H } = setup
    const c = getThemeColors()

    const panelW = W / 3
    const drawPanel = (offsetX: number, title: string, recon: Array<[number, number]> | null, color: string) => {
      // Title
      ctx.fillStyle = c.subtext
      ctx.font = '11px var(--font-mono), monospace'
      ctx.textAlign = 'center'; ctx.textBaseline = 'top'
      ctx.fillText(title, offsetX + panelW / 2, 6)
      // Original points (always drawn faintly)
      data.forEach(([x, y]) => {
        ctx.fillStyle = c.subtext
        ctx.globalAlpha = 0.4
        ctx.beginPath(); ctx.arc(offsetX + x * panelW, y * H, 2.5, 0, Math.PI * 2); ctx.fill()
      })
      ctx.globalAlpha = 1
      if (!recon) return
      // Reconstructed points (colored) + residual lines
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

    drawPanel(0,            'Original',                 null,    c.text)
    drawPanel(panelW,       `PCA (MSE ${pcaErr.toFixed(4)})`, pcaPts, c.mauve)
    drawPanel(2 * panelW,   `Autoencoder (MSE ${aeErr.toFixed(4)})`, aePts, c.teal)
  }, [data, pcaPts, aePts, pcaErr, aeErr, themeTick])

  // ... JSX in Step 4
}
```

- [ ] **Step 4: JSX with dataset toggle and PCA cross-link**

```tsx
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
      <a href="/learn/pca" className="text-mauve dark:text-mauve-dark hover:underline">/learn/pca</a>
    </p>
  </section>
)
```

- [ ] **Step 5: Verify**

`npm run dev`. Linear blob — both panels' MSE should be near identical (≤ 0.001). Curved ring — PCA MSE significantly higher (~0.01+) than AE MSE. Toggle datasets several times — training completes silently within ~100ms each toggle. Dark mode works. PCA link navigates correctly.

- [ ] **Step 6: Commit**

```bash
git add components/learn/neural-networks.tsx
git commit -m "feat(nn): section 07 — autoencoder vs PCA"
```

---

## Task 9: Final polish, build verification, CLAUDE.md update

**Files:**
- Modify: `CLAUDE.md`
- Verify: full build, lighthouse, mobile, dark/light, prefers-reduced-motion

- [ ] **Step 1: Update CLAUDE.md**

Add `neural-networks.tsx` to the file-structure section. In the existing `components/learn/` block, alongside the other artifact entries, add:

```
neural-networks.tsx   # 07/ Neural Networks (7 sections: neuron anatomy, XOR & depth, activations & vanishing gradients, backprop walkthrough, momentum vs vanilla GD, training a tiny MLP, autoencoder vs PCA)
```

Update the **Learn artifacts with ssr: false** pattern paragraph: change "4 of 6 learn artifacts" to "5 of 7 learn artifacts" and add Neural Networks to the listed examples (it uses Math.random in initMLP and dataset jitter).

In **Multi-accent section pills** or somewhere appropriate in the Catppuccin section, add a one-line note about the new accent: `Teal (#179299 / #94e2d5) — neural-network artifact (07/)`.

In **Client components marked explicitly**, add `neural-networks` to the list of `'use client'` learn components.

- [ ] **Step 2: Run full production build**

```bash
npm run build
```

Expected: build succeeds; `/learn/neural-networks` appears in the route summary as a static page (since it's in `generateStaticParams`). No new lint errors.

- [ ] **Step 3: Sanity-check sitemap and OG**

```bash
npm run start
```

Open `http://localhost:3000/sitemap.xml` — confirm `/learn/neural-networks` is listed.

Open `http://localhost:3000/learn/neural-networks/opengraph-image` — should serve the shared learn OG image (re-exported per existing pattern). If it doesn't exist, the parent `/learn/[slug]` route already inherits the shared one — verify by checking the page's HTML head includes the OG meta tags.

- [ ] **Step 4: Mobile + accessibility pass**

In Chrome DevTools mobile mode (375px), step through all 7 sections and confirm:
- All canvases scale correctly
- All sliders are operable with finger-sized targets
- Text remains readable (no text < 12px)
- Section 2 drag handles work via touch
- Section 5/6 play buttons work
- No horizontal overflow

Run an a11y audit: Tab through the page — confirm focus order is sensible, focus rings appear on all interactive elements (mauve outline per global `:focus-visible` rule), all form controls have labels, the SR-only summaries in sections 1 and 6 are present.

- [ ] **Step 5: Reduced-motion verification**

Toggle "Reduce motion" in OS settings. Reload `/learn/neural-networks`:
- Sections 1–4 work normally (input-driven, no animation)
- Section 5 Play button immediately shows final converged state on both balls
- Section 6 Play button immediately runs 200 epochs synchronously and shows final boundary

- [ ] **Step 6: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add Neural Networks artifact to CLAUDE.md"
```

- [ ] **Step 7: Final summary check**

Run `git log --oneline -10` to confirm 9 commits are present (1 scaffold + 7 sections + 1 docs). Open `/learn` and confirm the NN card is present and links work. Open `/learn/neural-networks`, scroll through all 7 sections in both light and dark mode, confirm the prev arrow points to `/learn/shap` and there is no next arrow.

---

## Self-Review Notes

- **Spec coverage:** all 7 sections from the spec mapped 1-to-1 to Tasks 2–8. Scaffolding (metadata, route, dynamic import, accent token) covered in Task 1. Polish + CLAUDE.md updates in Task 9.
- **Type consistency:** `Activation` type defined once, reused in every section. `MLP`, `BackpropState`, `AEModel` are local to their sections. `getThemeColors` return type referenced via `ReturnType<typeof getThemeColors>`.
- **Placeholders:** none — every step has either runnable code or a concrete verification action.
- **Known caveat:** Section 1's slider for hidden width in Section 6 reuses the generic `SliderRow` which emits floats; we round it (`Math.round(v)`) on the `setHidden` call. Documented in the Section 6 JSX.
- **AE training on mount:** the spec was changed during brainstorming from "pre-trained" to "client-side trained on mount, ~100ms." Task 8's `trainAE` with `epochs=800` on 120 points runs in <50ms in modern browsers — well under budget.
