'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useScrollReveal } from '@/lib/hooks'
import { SectionDivider } from '@/components/section-divider'

// --- Math helpers ---
function rng() {
  let u = 0, v = 0
  while (!u) u = Math.random()
  while (!v) v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

function dist(a: number[], b: number[]) {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2)
}

// --- Data generators ---
function genBlobs(k: number, nPer: number, spread: number): number[][] {
  const pts: number[][] = []
  const centers: number[][] = []
  for (let i = 0; i < k; i++) centers.push([0.15 + Math.random() * 0.7, 0.15 + Math.random() * 0.7])
  for (let i = 0; i < k; i++)
    for (let j = 0; j < nPer; j++)
      pts.push([centers[i][0] + rng() * spread, centers[i][1] + rng() * spread])
  return pts
}

function genMoons(n: number): number[][] {
  const pts: number[][] = []
  for (let i = 0; i < n; i++) {
    const a = Math.PI * i / n
    pts.push([0.35 + 0.25 * Math.cos(a) + rng() * 0.025, 0.5 + 0.2 * Math.sin(a) + rng() * 0.025])
  }
  for (let i = 0; i < n; i++) {
    const a = Math.PI * i / n
    pts.push([0.65 - 0.25 * Math.cos(a) + rng() * 0.025, 0.4 - 0.2 * Math.sin(a) + rng() * 0.025])
  }
  return pts
}

function genRing(n: number): number[][] {
  const pts: number[][] = []
  for (let i = 0; i < n; i++) {
    const a = 2 * Math.PI * i / n + rng() * 0.1
    const r = 0.15 + rng() * 0.015
    pts.push([0.5 + r * Math.cos(a), 0.5 + r * Math.sin(a)])
  }
  for (let i = 0; i < Math.floor(n * 0.4); i++) {
    pts.push([0.5 + rng() * 0.04, 0.5 + rng() * 0.04])
  }
  return pts
}

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
    // Cluster palette (8 distinct colors for up to 8 clusters)
    clusters: isDark
      ? ['#74c7ec', '#f38ba8', '#a6e3a1', '#f9e2af', '#cba6f7', '#f5c2e7', '#94e2d5', '#fab387']
      : ['#209fb5', '#d20f39', '#40a02b', '#df8e1d', '#8839ef', '#ea76cb', '#179299', '#fe640b'],
    clustersAlpha: isDark
      ? ['#74c7ec88', '#f38ba888', '#a6e3a188', '#f9e2af88', '#cba6f788', '#f5c2e788', '#94e2d588', '#fab38788']
      : ['#209fb588', '#d20f3988', '#40a02b88', '#df8e1d88', '#8839ef88', '#ea76cb88', '#17929988', '#fe640b88'],
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

// --- Shape toggle button ---
type ShapeKey = 'blobs' | 'moons' | 'ring'
const SHAPES: Array<{ key: ShapeKey; label: string }> = [
  { key: 'blobs', label: 'Blobs (spherical)' },
  { key: 'moons', label: 'Moons (non-convex)' },
  { key: 'ring', label: 'Ring + core' },
]

function ShapeButtons({ shape, setShape }: { shape: ShapeKey; setShape: (s: ShapeKey) => void }) {
  return (
    <div className="flex gap-1.5 flex-wrap mb-3">
      {SHAPES.map(s => (
        <button
          key={s.key}
          type="button"
          onClick={() => setShape(s.key)}
          className={`px-3 py-1.5 rounded-lg text-[13px] font-medium border transition-colors ${
            shape === s.key
              ? 'border-sapphire/30 dark:border-sapphire-dark/30 bg-sapphire/10 dark:bg-sapphire-dark/10 text-sapphire dark:text-sapphire-dark font-semibold'
              : 'border-cream-border dark:border-night-border text-ink-subtle dark:text-night-muted hover:bg-cream-dark/60 dark:hover:bg-night-card/60'
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  )
}

// --- Primary action button ---
function ActionButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-4 py-1.5 rounded-lg text-[13px] font-medium border border-sapphire/30 dark:border-sapphire-dark/30
        bg-sapphire/10 dark:bg-sapphire-dark/10 text-sapphire dark:text-sapphire-dark
        hover:bg-sapphire/20 dark:hover:bg-sapphire-dark/20 transition-colors"
    >
      {children}
    </button>
  )
}

function SecondaryButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-4 py-1.5 rounded-lg text-[13px] font-medium border border-cream-border dark:border-night-border
        text-ink-subtle dark:text-night-muted hover:bg-cream-dark/60 dark:hover:bg-night-card/60 transition-colors"
    >
      {children}
    </button>
  )
}

// --- K-means algorithm helpers (pure functions) ---
function kmAssignCheck(pts: number[][], centroids: number[][], prevAssigns: number[]): { assigns: number[]; changed: boolean } {
  const assigns: number[] = []
  let changed = false
  pts.forEach((p, i) => {
    let best = 0, bestD = Infinity
    centroids.forEach((c, j) => { const d = dist(p, c); if (d < bestD) { bestD = d; best = j } })
    if (prevAssigns[i] !== best) changed = true
    assigns.push(best)
  })
  return { assigns, changed }
}

function kmUpdateMeans(pts: number[][], assigns: number[], k: number): number[][] {
  const sums = Array.from({ length: k }, () => [0, 0, 0])
  pts.forEach((p, i) => { const c = assigns[i]; sums[c][0] += p[0]; sums[c][1] += p[1]; sums[c][2]++ })
  return sums.map((s) => s[2] > 0 ? [s[0] / s[2], s[1] / s[2]] : [0.5, 0.5])
}

function kmUpdateMedoids(pts: number[][], assigns: number[], centroids: number[][]): number[][] {
  const newCentroids = centroids.map(c => [...c])
  for (let j = 0; j < centroids.length; j++) {
    const members = pts.filter((_, i) => assigns[i] === j)
    if (!members.length) continue
    let bestPt = members[0], bestCost = Infinity
    members.forEach(cand => {
      const cost = members.reduce((s, m) => s + dist(cand, m), 0)
      if (cost < bestCost) { bestCost = cost; bestPt = cand }
    })
    newCentroids[j] = [...bestPt]
  }
  return newCentroids
}

function computeWSS(pts: number[][], assigns: number[], centroids: number[][]): number {
  let wss = 0
  pts.forEach((p, i) => { const c = centroids[assigns[i]]; if (c) wss += dist(p, c) ** 2 })
  return wss
}

function computeSilhouette(pts: number[][], assigns: number[], k: number): number {
  const n = pts.length
  if (n < 2) return 0
  let totalS = 0, valid = 0
  for (let i = 0; i < n; i++) {
    const ci = assigns[i]
    if (ci < 0) continue
    let aSum = 0, aCnt = 0
    for (let j = 0; j < n; j++) { if (j === i || assigns[j] !== ci) continue; aSum += dist(pts[i], pts[j]); aCnt++ }
    const ai = aCnt > 0 ? aSum / aCnt : 0
    let bi = Infinity
    for (let ck = 0; ck < k; ck++) {
      if (ck === ci) continue
      let bSum = 0, bCnt = 0
      for (let j = 0; j < n; j++) { if (assigns[j] !== ck) continue; bSum += dist(pts[i], pts[j]); bCnt++ }
      if (bCnt > 0) { const avg = bSum / bCnt; if (avg < bi) bi = avg }
    }
    if (bi === Infinity) bi = 0
    const si = (bi - ai) / Math.max(ai, bi)
    totalS += si; valid++
  }
  return valid > 0 ? totalS / valid : 0
}

// Run full K-means for a given k and return WSS + silhouette
function kmRunFull(pts: number[][], k: number, mode: 'means' | 'medoids'): { wss: number; sil: number } {
  const n = pts.length
  const cents: number[][] = []
  for (let i = 0; i < k; i++) cents.push([...pts[Math.floor(Math.random() * n)]])
  const assigns = new Array(n).fill(0)
  for (let iter = 0; iter < 30; iter++) {
    let changed = false
    pts.forEach((p, i) => {
      let best = 0, bestD = Infinity
      cents.forEach((c, j) => { const d = dist(p, c); if (d < bestD) { bestD = d; best = j } })
      if (assigns[i] !== best) changed = true
      assigns[i] = best
    })
    if (!changed) break
    if (mode === 'means') {
      const sums = cents.map(() => [0, 0, 0])
      pts.forEach((p, i) => { const c = assigns[i]; sums[c][0] += p[0]; sums[c][1] += p[1]; sums[c][2]++ })
      sums.forEach((s, i) => { if (s[2] > 0) cents[i] = [s[0] / s[2], s[1] / s[2]] })
    } else {
      for (let j = 0; j < k; j++) {
        const members = pts.filter((_, i) => assigns[i] === j)
        if (!members.length) continue
        let bestPt = members[0], bestC = Infinity
        members.forEach(cand => { const c = members.reduce((s, m) => s + dist(cand, m), 0); if (c < bestC) { bestC = c; bestPt = cand } })
        cents[j] = [...bestPt]
      }
    }
  }
  let wss = 0
  pts.forEach((p, i) => { wss += dist(p, cents[assigns[i]]) ** 2 })
  let totalS = 0, valid = 0
  for (let i = 0; i < n; i++) {
    let aS = 0, aC = 0
    for (let j = 0; j < n; j++) { if (j === i || assigns[j] !== assigns[i]) continue; aS += dist(pts[i], pts[j]); aC++ }
    const ai = aC > 0 ? aS / aC : 0
    let bi = Infinity
    for (let ck = 0; ck < k; ck++) {
      if (ck === assigns[i]) continue
      let bS = 0, bC = 0
      for (let j = 0; j < n; j++) { if (assigns[j] !== ck) continue; bS += dist(pts[i], pts[j]); bC++ }
      if (bC > 0) { const a = bS / bC; if (a < bi) bi = a }
    }
    if (bi === Infinity) bi = 0
    totalS += (bi - ai) / Math.max(ai, bi); valid++
  }
  const sil = valid > 0 ? totalS / valid : 0
  return { wss, sil }
}

// --- Hierarchical clustering helpers ---
interface HCMerge {
  left: number
  right: number
  dist: number
  id: number
  leftPts: number[]
  rightPts: number[]
}

function buildDendrogram(pts: number[][]): HCMerge[] {
  const n = pts.length
  const clusters: Array<{ id: number; pts: number[] }> = pts.map((_, i) => ({ id: i, pts: [i] }))
  let nextId = n
  const merges: HCMerge[] = []
  while (clusters.length > 1) {
    let bestI = 0, bestJ = 1, bestD = Infinity
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        let totalD = 0, count = 0
        for (const pi of clusters[i].pts) {
          for (const pj of clusters[j].pts) {
            totalD += dist(pts[pi], pts[pj]); count++
          }
        }
        const avgD = totalD / count
        if (avgD < bestD) { bestD = avgD; bestI = i; bestJ = j }
      }
    }
    const merged = { id: nextId++, pts: [...clusters[bestI].pts, ...clusters[bestJ].pts] }
    merges.push({
      left: clusters[bestI].id,
      right: clusters[bestJ].id,
      dist: bestD,
      id: merged.id,
      leftPts: [...clusters[bestI].pts],
      rightPts: [...clusters[bestJ].pts],
    })
    clusters.splice(bestJ, 1)
    clusters.splice(bestI, 1)
    clusters.push(merged)
  }
  return merges
}

function getClusters(merges: HCMerge[], nPts: number, k: number): number[] {
  const clusterOf = Array.from({ length: nPts }, (_, i) => i)
  const mergesNeeded = nPts - k
  for (let m = 0; m < Math.min(mergesNeeded, merges.length); m++) {
    const mg = merges[m]
    const newId = mg.id
    for (const pi of mg.leftPts) clusterOf[pi] = newId
    for (const pi of mg.rightPts) clusterOf[pi] = newId
  }
  const ids = [...new Set(clusterOf)]
  return clusterOf.map(c => ids.indexOf(c))
}

// --- DBSCAN helper ---
function runDBSCAN(pts: number[][], eps: number, minPts: number): number[] {
  const n = pts.length
  const labels = new Array(n).fill(-1) // -1=unvisited, -2=noise, >=0=cluster
  let clusterId = 0

  function regionQuery(pi: number): number[] {
    const nbrs: number[] = []
    for (let j = 0; j < n; j++) if (dist(pts[pi], pts[j]) <= eps) nbrs.push(j)
    return nbrs
  }

  for (let i = 0; i < n; i++) {
    if (labels[i] !== -1) continue
    const nbrs = regionQuery(i)
    if (nbrs.length < minPts) { labels[i] = -2; continue }
    labels[i] = clusterId
    const queue = [...nbrs]
    while (queue.length) {
      const q = queue.shift()!
      if (labels[q] === -2) labels[q] = clusterId
      if (labels[q] !== -1) continue
      labels[q] = clusterId
      const qNbrs = regionQuery(q)
      if (qNbrs.length >= minPts) queue.push(...qNbrs)
    }
    clusterId++
  }
  return labels
}

// ======================================================================
// SECTION 1: K-Means / K-Medoids
// ======================================================================
function Section1() {
  const [sectionRef, visible] = useScrollReveal()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const elbowCanvasRef = useRef<HTMLCanvasElement>(null)
  const silCanvasRef = useRef<HTMLCanvasElement>(null)

  const [shape, setShape] = useState<ShapeKey>('blobs')
  const [mode, setMode] = useState<'means' | 'medoids'>('means')
  const [k, setK] = useState(3)
  const [pts, setPts] = useState<number[][]>(() => genBlobs(3, 40, 0.06))
  const [assigns, setAssigns] = useState<number[]>(() => new Array(120).fill(-1))
  const [centroids, setCentroids] = useState<number[][]>(() => {
    const c: number[][] = []
    for (let i = 0; i < 3; i++) c.push([0.1 + Math.random() * 0.8, 0.1 + Math.random() * 0.8])
    return c
  })
  const [step, setStep] = useState(0)
  const [converged, setConverged] = useState(false)
  const [elbowData, setElbowData] = useState<Array<{ k: number; wss: number; sil: number }> | null>(null)

  // Reset is called from event handlers only (not effects)
  const resetWithParams = useCallback((s: ShapeKey, kVal: number) => {
    let newPts: number[][]
    if (s === 'blobs') newPts = genBlobs(3, 40, 0.06)
    else if (s === 'moons') newPts = genMoons(60)
    else newPts = genRing(80)
    const newCentroids: number[][] = []
    for (let i = 0; i < kVal; i++) newCentroids.push([0.1 + Math.random() * 0.8, 0.1 + Math.random() * 0.8])
    setPts(newPts)
    setCentroids(newCentroids)
    setAssigns(new Array(newPts.length).fill(-1))
    setStep(0)
    setConverged(false)
  }, [])

  const doStep = useCallback(() => {
    if (converged) return
    const { assigns: newAssigns, changed } = kmAssignCheck(pts, centroids, assigns)
    const newStep = step + 1
    if (!changed) {
      setAssigns(newAssigns)
      setStep(newStep)
      setConverged(true)
      return
    }
    const newCentroids = mode === 'means'
      ? kmUpdateMeans(pts, newAssigns, k)
      : kmUpdateMedoids(pts, newAssigns, centroids)
    setAssigns(newAssigns)
    setCentroids(newCentroids)
    setStep(newStep)
  }, [converged, pts, centroids, assigns, step, mode, k])

  const runToConvergence = useCallback(() => {
    let curAssigns = [...assigns]
    let curCentroids = centroids.map(c => [...c])
    let curStep = step
    let curConverged = converged
    for (let i = 0; i < 50 && !curConverged; i++) {
      const { assigns: newAssigns, changed } = kmAssignCheck(pts, curCentroids, curAssigns)
      curStep++
      if (!changed) { curAssigns = newAssigns; curConverged = true; break }
      curAssigns = newAssigns
      curCentroids = mode === 'means'
        ? kmUpdateMeans(pts, curAssigns, k)
        : kmUpdateMedoids(pts, curAssigns, curCentroids)
    }
    setAssigns(curAssigns)
    setCentroids(curCentroids)
    setStep(curStep)
    setConverged(curConverged)
  }, [assigns, centroids, step, converged, pts, mode, k])

  const computeElbow = useCallback(() => {
    const data: Array<{ k: number; wss: number; sil: number }> = []
    for (let kVal = 2; kVal <= 8; kVal++) {
      let best = { wss: Infinity, sil: -1 }
      for (let r = 0; r < 5; r++) {
        const res = kmRunFull(pts, kVal, mode)
        if (res.wss < best.wss) best = res
      }
      data.push({ k: kVal, wss: best.wss, sil: best.sil })
    }
    setElbowData(data)
  }, [pts, mode])

  const wss = step > 0 ? computeWSS(pts, assigns, centroids) : 0
  const sil = converged ? computeSilhouette(pts, assigns, k) : 0

  // Draw main canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const result = setupCanvas(canvas, 340)
    if (!result) return
    const { ctx, W, H } = result
    const c = getThemeColors()
    const pad = 20, pw = W - pad * 2, ph = H - pad * 2
    const xOf = (v: number) => pad + v * pw
    const yOf = (v: number) => pad + (1 - v) * ph

    // Points
    pts.forEach((p, i) => {
      const ci = assigns[i]
      ctx.fillStyle = ci >= 0 ? c.clustersAlpha[ci % c.clusters.length] : (c.grid)
      ctx.beginPath()
      ctx.arc(xOf(p[0]), yOf(p[1]), 4, 0, Math.PI * 2)
      ctx.fill()
    })

    // Centroids
    centroids.forEach((cent, i) => {
      const x = xOf(cent[0]), y = yOf(cent[1])
      if (mode === 'means') {
        // X marker for means
        ctx.strokeStyle = c.clusters[i % c.clusters.length]
        ctx.lineWidth = 2.5
        ctx.beginPath(); ctx.moveTo(x - 8, y - 8); ctx.lineTo(x + 8, y + 8); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(x + 8, y - 8); ctx.lineTo(x - 8, y + 8); ctx.stroke()
      } else {
        // Diamond for medoids
        ctx.fillStyle = c.clusters[i % c.clusters.length]
        ctx.beginPath()
        ctx.moveTo(x, y - 9); ctx.lineTo(x + 7, y); ctx.lineTo(x, y + 9); ctx.lineTo(x - 7, y)
        ctx.closePath(); ctx.fill()
        ctx.strokeStyle = c.base
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x, y - 9); ctx.lineTo(x + 7, y); ctx.lineTo(x, y + 9); ctx.lineTo(x - 7, y)
        ctx.closePath(); ctx.stroke()
      }
      // Radius circle
      if (assigns.some(a => a === i)) {
        const maxD = Math.max(...pts.filter((_, j) => assigns[j] === i).map(p2 => dist(p2, cent)))
        ctx.strokeStyle = c.clusters[i % c.clusters.length] + '33'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(x, y, maxD * Math.min(pw, ph), 0, Math.PI * 2)
        ctx.stroke()
      }
    })

    // Mode label
    ctx.fillStyle = c.subtext
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(mode === 'means' ? '\u00D7 = mean centroid' : '\u25C6 = medoid (actual data point)', pad + 4, pad + 14)
  }, [pts, assigns, centroids, mode])

  // Draw elbow chart
  const drawElbow = useCallback(() => {
    if (!elbowData) return
    const canvas = elbowCanvasRef.current
    if (!canvas) return
    const result = setupCanvas(canvas, 180)
    if (!result) return
    const { ctx, W, H } = result
    const c = getThemeColors()

    const p = { l: 44, r: 16, t: 16, b: 30 }
    const pw = W - p.l - p.r, ph = H - p.t - p.b
    const maxW = Math.max(...elbowData.map(d => d.wss)) * 1.1
    const xOf = (kv: number) => p.l + ((kv - 2) / 6) * pw
    const yOf = (v: number) => p.t + (1 - v / maxW) * ph

    // Axes
    ctx.strokeStyle = c.axis
    ctx.lineWidth = 0.5
    ctx.beginPath(); ctx.moveTo(p.l, p.t); ctx.lineTo(p.l, H - p.b); ctx.lineTo(W - p.r, H - p.b); ctx.stroke()
    ctx.fillStyle = c.subtext
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'center'
    for (let kv = 2; kv <= 8; kv++) ctx.fillText(String(kv), xOf(kv), H - p.b + 14)
    ctx.fillText('k', W / 2, H - 2)
    ctx.save(); ctx.translate(12, H / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('WSS', 0, 0); ctx.restore()

    // Line
    ctx.strokeStyle = c.blue
    ctx.lineWidth = 2
    ctx.beginPath()
    elbowData.forEach((d, i) => { if (i === 0) ctx.moveTo(xOf(d.k), yOf(d.wss)); else ctx.lineTo(xOf(d.k), yOf(d.wss)) })
    ctx.stroke()

    // Dots
    elbowData.forEach(d => {
      ctx.fillStyle = d.k === k ? c.red : c.blue
      ctx.beginPath()
      ctx.arc(xOf(d.k), yOf(d.wss), d.k === k ? 6 : 4, 0, Math.PI * 2)
      ctx.fill()
      if (d.k === k) {
        ctx.fillStyle = c.text
        ctx.font = '500 10px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('current', xOf(d.k), yOf(d.wss) - 10)
      }
    })
  }, [elbowData, k])

  // Draw silhouette chart
  const drawSil = useCallback(() => {
    if (!elbowData) return
    const canvas = silCanvasRef.current
    if (!canvas) return
    const result = setupCanvas(canvas, 180)
    if (!result) return
    const { ctx, W, H } = result
    const c = getThemeColors()

    const p = { l: 44, r: 16, t: 16, b: 30 }
    const pw = W - p.l - p.r, ph = H - p.t - p.b
    const maxS = 1
    const xOf = (kv: number) => p.l + ((kv - 2) / 6) * pw
    const yOf = (v: number) => p.t + (1 - v / maxS) * ph

    // Axes
    ctx.strokeStyle = c.axis
    ctx.lineWidth = 0.5
    ctx.beginPath(); ctx.moveTo(p.l, p.t); ctx.lineTo(p.l, H - p.b); ctx.lineTo(W - p.r, H - p.b); ctx.stroke()
    // Zero line
    ctx.strokeStyle = c.grid
    ctx.setLineDash([4, 4])
    ctx.beginPath(); ctx.moveTo(p.l, yOf(0)); ctx.lineTo(W - p.r, yOf(0)); ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = c.subtext
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'center'
    for (let kv = 2; kv <= 8; kv++) ctx.fillText(String(kv), xOf(kv), H - p.b + 14)
    ctx.fillText('k', W / 2, H - 2)
    ctx.save(); ctx.translate(12, H / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('Avg silhouette', 0, 0); ctx.restore()

    // Bars
    const barW = pw / 6 * 0.6
    elbowData.forEach(d => {
      const x = xOf(d.k) - barW / 2
      const h = Math.abs(d.sil) / maxS * ph
      const col = d.k === k ? c.red : (d.sil > 0.5 ? c.green : d.sil > 0.25 ? c.amber : c.red)
      ctx.fillStyle = col
      ctx.globalAlpha = 0.7
      ctx.fillRect(x, yOf(Math.max(0, d.sil)), barW, d.sil >= 0 ? h : 0)
      ctx.globalAlpha = 1
      ctx.fillStyle = c.text
      ctx.font = '500 10px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(d.sil.toFixed(2), xOf(d.k), yOf(d.sil) - 6)
    })
  }, [elbowData, k])

  useEffect(() => { draw() }, [draw])
  useEffect(() => { drawElbow() }, [drawElbow])
  useEffect(() => { drawSil() }, [drawSil])
  useDarkModeObserver(draw)
  useDarkModeObserver(drawElbow)
  useDarkModeObserver(drawSil)
  useCanvasResize(canvasRef, draw)
  useCanvasResize(elbowCanvasRef, drawElbow)
  useCanvasResize(silCanvasRef, drawSil)

  const handleShapeChange = useCallback((s: ShapeKey) => {
    setShape(s)
    setElbowData(null)
    resetWithParams(s, k)
  }, [k, resetWithParams])

  const handleModeChange = useCallback((m: 'means' | 'medoids') => {
    setMode(m)
    // reset when mode changes
    setStep(0)
    setConverged(false)
    const newCentroids: number[][] = []
    for (let i = 0; i < k; i++) newCentroids.push([0.1 + Math.random() * 0.8, 0.1 + Math.random() * 0.8])
    setCentroids(newCentroids)
    setAssigns(new Array(pts.length).fill(-1))
  }, [k, pts.length])

  // Insight text
  let insight: React.ReactNode
  if (step === 0) {
    insight = (
      <>
        Hit {'\u201C'}1 step{'\u201D'} to watch <strong>{mode === 'means' ? 'K-means' : 'K-medoids'}</strong> iterate.{' '}
        {mode === 'means'
          ? '\u00D7 markers are centroids (computed as mean).'
          : '\u25C6 markers are medoids (an actual data point). Medoids are robust to outliers because they can\'t be pulled outside the data.'}
      </>
    )
  } else if (shape === 'blobs' && converged) {
    insight = (
      <>
        <strong>Good fit!</strong> Blob-shaped data is what {mode === 'means' ? 'K-means' : 'K-medoids'} is designed for.{' '}
        {mode === 'medoids' ? 'Notice the medoids sit ON actual data points, unlike K-means centroids which can be between points.' : ''}
      </>
    )
  } else if (shape === 'moons' && converged) {
    insight = <><strong>Fails on moons!</strong> Both K-means and K-medoids draw Voronoi boundaries {'\u2014'} they split crescents in half. DBSCAN handles this.</>
  } else if (shape === 'ring' && converged) {
    insight = <><strong>Fails on rings!</strong> Can{"'"}t separate inner core from outer ring. DBSCAN handles this.</>
  } else if (converged) {
    insight = <>Converged {'\u2014'} assignments stopped changing.</>
  } else {
    insight = (
      <>
        Step {step}: assigned to nearest {mode === 'means' ? 'centroid' : 'medoid'}, then{' '}
        {mode === 'means' ? 'centroids recomputed as mean' : 'medoid updated to the point that minimizes total distance to its cluster'}.{' '}
        WSS = {wss.toFixed(2)}.
      </>
    )
  }

  const elbowInsight: React.ReactNode = elbowData
    ? (() => {
        const bestSil = elbowData.reduce((a, b) => b.sil > a.sil ? b : a)
        return (
          <>
            <strong>Elbow:</strong> look for where the WSS curve bends {'\u2014'} adding more k beyond that gives diminishing returns.{' '}
            <strong>Silhouette:</strong> best average silhouette is at k={bestSil.k} ({bestSil.sil.toFixed(2)}). Values near 1 = well-separated, near 0 = overlapping, negative = wrong cluster. Red dot = your current k.
          </>
        )
      })()
    : <>Hit {'\u201C'}Compute for k=2..8{'\u201D'} to run K-means for k=2 through 8 and plot both selection methods.</>

  return (
    <section
      ref={sectionRef as React.RefObject<HTMLElement>}
      aria-labelledby="cl-kmeans"
      className={`py-8 transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <h2
        id="cl-kmeans"
        className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl text-ink dark:text-night-text mb-3"
      >
        K-Means / K-Medoids
      </h2>
      <p className="text-sm text-ink-subtle dark:text-night-muted mb-5 leading-relaxed">
        K-means uses the mean as centroid. K-medoids uses an actual data point {'\u2014'} less sensitive to outliers. Toggle to compare.
      </p>

      <ShapeButtons shape={shape} setShape={handleShapeChange} />

      {/* Mode toggle */}
      <div className="flex gap-1.5 flex-wrap mb-3">
        {([
          { key: 'means' as const, label: 'K-means', desc: 'centroid = mean (sensitive to outliers)' },
          { key: 'medoids' as const, label: 'K-medoids', desc: 'centroid = actual point (robust)' },
        ]).map(v => (
          <button
            key={v.key}
            type="button"
            onClick={() => handleModeChange(v.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium border transition-colors ${
              mode === v.key
                ? 'border-sapphire/30 dark:border-sapphire-dark/30 bg-sapphire/10 dark:bg-sapphire-dark/10 text-sapphire dark:text-sapphire-dark font-semibold'
                : 'border-cream-border dark:border-night-border text-ink-subtle dark:text-night-muted hover:bg-cream-dark/60 dark:hover:bg-night-card/60'
            }`}
          >
            <span className="font-medium">{v.label}</span>
            <span className="text-[12px] text-ink-faint dark:text-night-muted">{v.desc}</span>
          </button>
        ))}
      </div>

      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Scatter plot showing data points colored by cluster assignment with centroid or medoid markers and radius circles"
        className="w-full rounded-lg"
        style={{ height: 340 }}
      />

      {/* k slider */}
      <div className="flex items-center gap-3 mt-2 mb-2">
        <label
          htmlFor="km-k-slider"
          className="text-sm text-ink-subtle dark:text-night-muted min-w-[50px]"
        >
          k =
        </label>
        <input
          id="km-k-slider"
          type="range"
          min={2}
          max={6}
          step={1}
          value={k}
          onChange={(e) => { const newK = parseInt(e.target.value); setK(newK); resetWithParams(shape, newK) }}
          aria-valuetext={`k = ${k}`}
          className="flex-1"
        />
        <span className="font-[family-name:var(--font-mono)] text-sm font-medium min-w-[36px] text-right text-ink dark:text-night-text">
          {k}
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex gap-1.5 flex-wrap my-2">
        <ActionButton onClick={doStep}>1 step</ActionButton>
        <ActionButton onClick={runToConvergence}>Run to convergence</ActionButton>
        <SecondaryButton onClick={() => resetWithParams(shape, k)}>Reset</SecondaryButton>
      </div>

      {/* Metrics */}
      <div className="flex gap-2.5 flex-wrap my-2.5">
        <MetricCard label="Step" value={String(step)} />
        <MetricCard label="k" value={String(k)} />
        <MetricCard label="Mode" value={mode === 'means' ? 'Means' : 'Medoids'} />
        <MetricCard label="WSS" value={step > 0 ? wss.toFixed(2) : '\u2014'} />
        <MetricCard label="Avg silhouette" value={converged ? sil.toFixed(3) : '\u2014'} />
        <MetricCard label="Status" value={converged ? 'Converged' : 'Running'} colorClass={converged ? METRIC_COLORS.green : METRIC_COLORS.amber} />
      </div>

      <InsightBox>{insight}</InsightBox>

      {/* Choosing k card */}
      <div className="mt-6 rounded-xl bg-cream-dark/50 dark:bg-night-card/40 px-4 py-4">
        <p className="text-[13px] text-ink-subtle dark:text-night-muted mb-2">
          <strong>Choosing k</strong> {'\u2014'} elbow (WSS) and silhouette methods. Computed on current data shape.
        </p>
        <div className="flex gap-1.5 flex-wrap mb-3">
          <ActionButton onClick={computeElbow}>Compute for k=2..8</ActionButton>
        </div>
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <canvas
              ref={elbowCanvasRef}
              role="img"
              aria-label="Elbow method chart showing WSS vs k"
              className="w-full rounded-lg"
              style={{ height: 180 }}
            />
            <p className="text-[12px] text-ink-faint dark:text-night-muted text-center mt-1">Elbow {'\u2014'} look for the bend</p>
          </div>
          <div className="flex-1 min-w-[200px]">
            <canvas
              ref={silCanvasRef}
              role="img"
              aria-label="Silhouette score chart showing average silhouette vs k"
              className="w-full rounded-lg"
              style={{ height: 180 }}
            />
            <p className="text-[12px] text-ink-faint dark:text-night-muted text-center mt-1">Silhouette {'\u2014'} higher is better</p>
          </div>
        </div>
        <InsightBox>{elbowInsight}</InsightBox>
      </div>
    </section>
  )
}

// ======================================================================
// SECTION 2: Hierarchical Clustering
// ======================================================================
function Section2() {
  const [sectionRef, visible] = useScrollReveal()
  const dendroCanvasRef = useRef<HTMLCanvasElement>(null)
  const scatterCanvasRef = useRef<HTMLCanvasElement>(null)

  const [shape, setShape] = useState<ShapeKey>('blobs')
  const [{ pts, merges }, setHCData] = useState(() => {
    const initPts = genBlobs(3, 8, 0.05)
    return { pts: initPts, merges: buildDendrogram(initPts) }
  })
  const [cutK, setCutK] = useState(3)

  const resetData = useCallback((s?: ShapeKey) => {
    const shapeToUse = s ?? shape
    let newPts: number[][]
    if (shapeToUse === 'blobs') newPts = genBlobs(3, 8, 0.05)
    else if (shapeToUse === 'moons') newPts = genMoons(15)
    else newPts = genRing(20)
    setHCData({ pts: newPts, merges: buildDendrogram(newPts) })
    setCutK(3)
  }, [shape])

  // Draw dendrogram
  const drawDendro = useCallback(() => {
    const canvas = dendroCanvasRef.current
    if (!canvas) return
    const result = setupCanvas(canvas, 260)
    if (!result) return
    const { ctx, W, H } = result
    const c = getThemeColors()
    const n = pts.length
    if (n === 0) return

    const pad = { l: 40, r: 20, t: 20, b: 30 }
    const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b
    const maxD = merges.length ? Math.max(...merges.map(m => m.dist)) * 1.15 : 1
    const yOf = (d: number) => pad.t + (1 - d / maxD) * ph

    // Axes
    ctx.strokeStyle = c.axis
    ctx.lineWidth = 0.5
    ctx.beginPath(); ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, H - pad.b); ctx.lineTo(W - pad.r, H - pad.b); ctx.stroke()
    ctx.fillStyle = c.subtext
    ctx.font = '11px sans-serif'
    ctx.save(); ctx.translate(14, H / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.fillText('Merge distance', 0, 0); ctx.restore()

    // Compute x positions for leaves
    const leafOrder: number[] = []
    function traverse(id: number) {
      if (id < n) { leafOrder.push(id); return }
      const mg = merges.find(m => m.id === id)
      if (!mg) { leafOrder.push(id); return }
      traverse(mg.left)
      traverse(mg.right)
    }
    if (merges.length) traverse(merges[merges.length - 1].id)
    else for (let i = 0; i < n; i++) leafOrder.push(i)

    const xPos: Record<number, number> = {}
    leafOrder.forEach((id, i) => { xPos[id] = pad.l + (i + 0.5) / leafOrder.length * pw })

    // Find cut height
    const sortedDists = [...merges.map(m => m.dist)].sort((a, b) => a - b)
    const cutIdx = n - cutK
    const cutHeight = cutIdx > 0 && cutIdx <= sortedDists.length
      ? (sortedDists[cutIdx - 1] + sortedDists[Math.min(cutIdx, sortedDists.length - 1)]) / 2
      : maxD * 0.5

    // Cut line
    ctx.setLineDash([6, 4])
    ctx.strokeStyle = c.red
    ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(pad.l, yOf(cutHeight)); ctx.lineTo(W - pad.r, yOf(cutHeight)); ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = c.red
    ctx.font = '500 11px sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(`cut \u2192 ${cutK} clusters`, W - pad.r, yOf(cutHeight) - 6)

    // Cluster colors
    const clusterAssign = getClusters(merges, n, cutK)

    // Draw merges
    merges.forEach(mg => {
      const lx = xPos[mg.left] || 0, rx = xPos[mg.right] || 0
      const my = yOf(mg.dist)
      const ly = mg.left < n ? yOf(0) : yOf(merges.find(m => m.id === mg.left)?.dist || 0)
      const ry = mg.right < n ? yOf(0) : yOf(merges.find(m => m.id === mg.right)?.dist || 0)

      ctx.strokeStyle = c.subtext
      ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx, my); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx, my); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(lx, my); ctx.lineTo(rx, my); ctx.stroke()

      xPos[mg.id] = (lx + rx) / 2
    })

    // Leaf dots
    leafOrder.forEach(id => {
      if (id < n) {
        const col = c.clusters[clusterAssign[id] % c.clusters.length]
        ctx.fillStyle = col
        ctx.beginPath()
        ctx.arc(xPos[id], yOf(0) + 4, 4, 0, Math.PI * 2)
        ctx.fill()
      }
    })
  }, [pts, merges, cutK])

  // Draw scatter
  const drawScatter = useCallback(() => {
    const canvas = scatterCanvasRef.current
    if (!canvas) return
    const result = setupCanvas(canvas, 260)
    if (!result) return
    const { ctx, W, H } = result
    const c = getThemeColors()
    const n = pts.length
    if (n === 0) return

    const pad = 20, pw = W - pad * 2, ph = H - pad * 2
    const xOf = (v: number) => pad + v * pw
    const yOf = (v: number) => pad + (1 - v) * ph

    const clusterAssign = getClusters(merges, n, cutK)
    pts.forEach((p, i) => {
      ctx.fillStyle = c.clusters[clusterAssign[i] % c.clusters.length]
      ctx.globalAlpha = 0.7
      ctx.beginPath()
      ctx.arc(xOf(p[0]), yOf(p[1]), 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    })
  }, [pts, merges, cutK])

  useEffect(() => { drawDendro() }, [drawDendro])
  useEffect(() => { drawScatter() }, [drawScatter])
  useDarkModeObserver(drawDendro)
  useDarkModeObserver(drawScatter)
  useCanvasResize(dendroCanvasRef, drawDendro)
  useCanvasResize(scatterCanvasRef, drawScatter)

  // Insight
  let insight: React.ReactNode
  if (cutK <= 2) {
    insight = <>Cutting into 2 clusters {'\u2014'} only the very last (highest) merge is split. Everything below that merge stays together.</>
  } else if (cutK >= pts.length - 2) {
    insight = <>Many small clusters {'\u2014'} you{"'"}ve cut very low on the dendrogram, so almost no merges are kept.</>
  } else {
    insight = (
      <>
        <strong>Cut into {cutK} clusters.</strong> The red dashed line crosses the dendrogram at a height where {cutK} branches remain. Tall gaps between merge heights = natural cluster boundaries. Average linkage tends to produce balanced, similar-sized clusters.
      </>
    )
  }

  return (
    <section
      ref={sectionRef as React.RefObject<HTMLElement>}
      aria-labelledby="cl-hierarchical"
      className={`py-8 transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <h2
        id="cl-hierarchical"
        className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl text-ink dark:text-night-text mb-3"
      >
        Hierarchical Clustering
      </h2>
      <p className="text-sm text-ink-subtle dark:text-night-muted mb-5 leading-relaxed">
        Agglomerative clustering builds a tree (dendrogram) of all merges. The height shows how far apart clusters were when merged. Drag the cut line to pick k.
      </p>

      <ShapeButtons shape={shape} setShape={(s) => { setShape(s); resetData(s) }} />

      <canvas
        ref={dendroCanvasRef}
        role="img"
        aria-label="Dendrogram showing hierarchical cluster merges with adjustable cut line"
        className="w-full rounded-lg"
        style={{ height: 260 }}
      />
      <p className="text-[13px] text-ink-faint dark:text-night-muted text-center my-1">
        Dendrogram {'\u2014'} taller merges = more dissimilar clusters
      </p>

      <canvas
        ref={scatterCanvasRef}
        role="img"
        aria-label="Scatter plot colored by hierarchical cluster assignment"
        className="w-full rounded-lg"
        style={{ height: 260 }}
      />
      <p className="text-[13px] text-ink-faint dark:text-night-muted text-center my-1">
        Scatter plot {'\u2014'} colored by cut
      </p>

      {/* k slider */}
      <div className="flex items-center gap-3 mt-2 mb-2">
        <label
          htmlFor="hc-k-slider"
          className="text-sm text-ink-subtle dark:text-night-muted min-w-[80px]"
        >
          Cut into k =
        </label>
        <input
          id="hc-k-slider"
          type="range"
          min={2}
          max={8}
          step={1}
          value={cutK}
          onChange={(e) => setCutK(parseInt(e.target.value))}
          aria-valuetext={`k = ${cutK}`}
          className="flex-1"
        />
        <span className="font-[family-name:var(--font-mono)] text-sm font-medium min-w-[36px] text-right text-ink dark:text-night-text">
          {cutK}
        </span>
      </div>

      <div className="flex gap-1.5 flex-wrap my-2">
        <SecondaryButton onClick={resetData}>New data</SecondaryButton>
      </div>

      <InsightBox>{insight}</InsightBox>
    </section>
  )
}

// ======================================================================
// SECTION 3: DBSCAN
// ======================================================================
function Section3() {
  const [sectionRef, visible] = useScrollReveal()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [shape, setShape] = useState<ShapeKey>('moons')
  const [eps, setEps] = useState(0.06)
  const [minPts, setMinPts] = useState(4)
  const [pts, setPts] = useState<number[][]>(() => genMoons(60))
  const [labels, setLabels] = useState<number[]>(() => runDBSCAN(genMoons(60), 0.06, 4))

  const regenData = useCallback((s: ShapeKey, epsVal: number, minPtsVal: number) => {
    let newPts: number[][]
    if (s === 'moons') newPts = genMoons(60)
    else if (s === 'ring') newPts = genRing(80)
    else newPts = genBlobs(3, 40, 0.06)
    setPts(newPts)
    setLabels(runDBSCAN(newPts, epsVal, minPtsVal))
  }, [])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const result = setupCanvas(canvas, 360)
    if (!result) return
    const { ctx, W, H } = result
    const c = getThemeColors()
    const n = pts.length
    if (n === 0) return

    const pad = 20, pw = W - pad * 2, ph = H - pad * 2
    const xOf = (v: number) => pad + v * pw
    const yOf = (v: number) => pad + (1 - v) * ph

    // Determine core vs border
    function regionQueryCount(pi: number): number {
      let cnt = 0
      for (let j = 0; j < n; j++) if (dist(pts[pi], pts[j]) <= eps) cnt++
      return cnt
    }
    const isCore = pts.map((_, i) => regionQueryCount(i) >= minPts)

    // Draw eps radius for a few core points
    let shown = 0
    pts.forEach((p, i) => {
      if (isCore[i] && labels[i] >= 0 && shown < 6 && Math.random() < 0.3) {
        ctx.strokeStyle = c.clusters[labels[i] % c.clusters.length] + '22'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(xOf(p[0]), yOf(p[1]), eps * Math.min(pw, ph), 0, Math.PI * 2)
        ctx.stroke()
        shown++
      }
    })

    // Points
    pts.forEach((p, i) => {
      const x = xOf(p[0]), y = yOf(p[1])
      if (labels[i] === -2) {
        // Noise: gray X
        ctx.strokeStyle = c.subtext
        ctx.lineWidth = 1.5
        ctx.beginPath(); ctx.moveTo(x - 3, y - 3); ctx.lineTo(x + 3, y + 3); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(x + 3, y - 3); ctx.lineTo(x - 3, y + 3); ctx.stroke()
      } else if (isCore[i]) {
        // Core: filled dot
        ctx.fillStyle = c.clusters[labels[i] % c.clusters.length]
        ctx.beginPath()
        ctx.arc(x, y, 4.5, 0, Math.PI * 2)
        ctx.fill()
      } else {
        // Border: ring
        ctx.strokeStyle = c.clusters[labels[i] % c.clusters.length]
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(x, y, 4, 0, Math.PI * 2)
        ctx.stroke()
      }
    })
  }, [pts, labels, eps, minPts])

  useEffect(() => { draw() }, [draw])
  useDarkModeObserver(draw)
  useCanvasResize(canvasRef, draw)

  const nClusters = Math.max(0, ...labels) + 1
  const nNoise = labels.filter(l => l === -2).length
  const nCore = pts.filter((_, i) => {
    let cnt = 0
    for (let j = 0; j < pts.length; j++) if (dist(pts[i], pts[j]) <= eps) cnt++
    return cnt >= minPts
  }).length

  // Insight
  let insight: React.ReactNode
  if (shape === 'moons' && nClusters === 2) {
    insight = (
      <>
        <strong>DBSCAN nails the moons!</strong> It follows the density of each crescent, connecting points that are close together. K-means couldn{"'"}t do this because it draws straight-line boundaries. Try increasing eps to merge the moons, or decreasing it to fragment them.
      </>
    )
  } else if (shape === 'ring' && nClusters === 2) {
    insight = (
      <>
        <strong>DBSCAN separates ring from core!</strong> The inner cluster is dense, the outer ring is dense, and the gap between them is sparse. DBSCAN sees the gap as a boundary. K-means failed here because both groups share the same center.
      </>
    )
  } else if (nClusters === 1) {
    insight = <><strong>Only 1 cluster.</strong> eps is too large {'\u2014'} everything is connected. Decrease eps or increase minPts to split groups apart.</>
  } else if (nClusters === 0) {
    insight = <><strong>No clusters found.</strong> eps is too small or minPts too high {'\u2014'} no point has enough neighbors to be a core point. Increase eps or decrease minPts.</>
  } else if (nNoise > pts.length * 0.3) {
    insight = <><strong>Lots of noise ({nNoise} points).</strong> eps may be too small {'\u2014'} many points can{"'"}t reach a core point. Try increasing eps slightly.</>
  } else {
    insight = (
      <>
        Found {nClusters} clusters with {nNoise} noise points. Filled dots = core points ({'\u2265'}{minPts} neighbors within eps={eps.toFixed(3)}). Rings = border points. Gray {'\u00D7'} = noise (outliers).
      </>
    )
  }

  const handleNewShape = useCallback((s: ShapeKey) => {
    setShape(s)
    regenData(s, eps, minPts)
  }, [eps, minPts, regenData])

  const handleNewData = useCallback(() => {
    regenData(shape, eps, minPts)
  }, [shape, eps, minPts, regenData])

  return (
    <section
      ref={sectionRef as React.RefObject<HTMLElement>}
      aria-labelledby="cl-dbscan"
      className={`py-8 transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <h2
        id="cl-dbscan"
        className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl text-ink dark:text-night-text mb-3"
      >
        DBSCAN
      </h2>
      <p className="text-sm text-ink-subtle dark:text-night-muted mb-5 leading-relaxed">
        DBSCAN finds dense regions. Core points (filled) have {'\u2265'} minPts neighbors within eps. Border points (rings) are near a core point. Gray {'\u00D7'} = noise. Try the shapes K-means failed on!
      </p>

      <ShapeButtons shape={shape} setShape={handleNewShape} />

      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Scatter plot showing DBSCAN clustering with core points as filled dots, border points as rings, and noise as X marks"
        className="w-full rounded-lg"
        style={{ height: 360 }}
      />

      {/* eps slider */}
      <div className="flex items-center gap-3 mt-2 mb-2">
        <label
          htmlFor="db-eps-slider"
          className="text-sm text-ink-subtle dark:text-night-muted min-w-[50px]"
        >
          eps
        </label>
        <input
          id="db-eps-slider"
          type="range"
          min={0.02}
          max={0.15}
          step={0.005}
          value={eps}
          onChange={(e) => { const v = parseFloat(e.target.value); setEps(v); setLabels(runDBSCAN(pts, v, minPts)) }}
          aria-valuetext={`eps = ${eps.toFixed(3)}`}
          className="flex-1"
        />
        <span className="font-[family-name:var(--font-mono)] text-sm font-medium min-w-[44px] text-right text-ink dark:text-night-text">
          {eps.toFixed(3)}
        </span>
      </div>

      {/* minPts slider */}
      <div className="flex items-center gap-3 mt-2 mb-2">
        <label
          htmlFor="db-minpts-slider"
          className="text-sm text-ink-subtle dark:text-night-muted min-w-[50px]"
        >
          minPts
        </label>
        <input
          id="db-minpts-slider"
          type="range"
          min={2}
          max={10}
          step={1}
          value={minPts}
          onChange={(e) => { const v = parseInt(e.target.value); setMinPts(v); setLabels(runDBSCAN(pts, eps, v)) }}
          aria-valuetext={`minPts = ${minPts}`}
          className="flex-1"
        />
        <span className="font-[family-name:var(--font-mono)] text-sm font-medium min-w-[36px] text-right text-ink dark:text-night-text">
          {minPts}
        </span>
      </div>

      <div className="flex gap-1.5 flex-wrap my-2">
        <SecondaryButton onClick={handleNewData}>New data</SecondaryButton>
      </div>

      {/* Metrics */}
      <div className="flex gap-2.5 flex-wrap my-2.5">
        <MetricCard label="Clusters found" value={String(nClusters)} colorClass={METRIC_COLORS.green} />
        <MetricCard label="Core points" value={String(nCore)} />
        <MetricCard label="Noise points" value={String(nNoise)} colorClass={METRIC_COLORS.red} />
        <MetricCard label="eps / minPts" value={`${eps.toFixed(3)} / ${minPts}`} />
      </div>

      <InsightBox>{insight}</InsightBox>
    </section>
  )
}

// ======================================================================
// MAIN EXPORT
// ======================================================================
export function Clustering() {
  return (
    <div className="mx-auto max-w-5xl px-6 sm:px-10 lg:px-12">
      {/* Title */}
      <div className="text-center mb-16">
        <p className="font-[family-name:var(--font-mono)] text-[13px] tracking-[0.3em] uppercase mb-4 text-peach dark:text-peach-dark">
          05/
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl text-ink dark:text-night-text mb-4">
          Clustering
        </h1>
        <p className="text-[15px] text-ink-subtle dark:text-night-muted">
          3 algorithms {'\u00B7'} See why shape matters
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
    </div>
  )
}
