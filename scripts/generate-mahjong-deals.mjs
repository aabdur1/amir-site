// scripts/generate-mahjong-deals.mjs
// One-off generator for the committed mahjong banks behind /games/mahjong.
// Emits BOTH lib/games/mahjong-layouts.ts (TS mirror of the authored
// layouts) and lib/games/mahjong-deals.ts (90 deals, 30/difficulty).
// Deterministic (SEED); output committed; never hand-edit — re-run instead.
// Every deal is built by PEELING: repeatedly pick two free positions,
// assign them a kind pair, remove them — the peel order IS a winning
// solution, committed as `solution` and re-proven in deals.test.ts.
// The freeSet/peel logic mirrors lib/games/mahjong/engine.ts
// (word-search allLines precedent: gen and test agree).
//
//   node scripts/generate-mahjong-deals.mjs
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { LAYOUTS } from './mahjong-layouts.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_LAYOUTS = path.join(__dirname, '..', 'lib', 'games', 'mahjong-layouts.ts')
const OUT_DEALS = path.join(__dirname, '..', 'lib', 'games', 'mahjong-deals.ts')

const SEED = 17
let s = SEED
const rand = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0), s / 4294967296)
const shuffle = (arr) => {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// kind indexes into the engine's 26-entry KINDS list
const POOLS = {
  easy: [0, 1, 2, 3, 4, 5, 8, 9, 10, 23, 24, 25],
  medium: [0, 1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 16, 17, 18, 23, 24, 25],
  hard: Array.from({ length: 26 }, (_, i) => i),
}
const PREFIX = { easy: 'me', medium: 'mm', hard: 'mh' }
const PER_DIFFICULTY = 30

// --- geometry + peel (mirrors lib/games/mahjong/engine.ts) ---
const overlaps = (a, b) => Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1
function freeIndexes(pos, aliveSet) {
  const out = []
  for (const i of aliveSet) {
    let covered = false, left = false, right = false
    for (const j of aliveSet) {
      if (j === i) continue
      if (pos[j].z === pos[i].z + 1 && overlaps(pos[i], pos[j])) covered = true
      if (pos[j].z === pos[i].z && Math.abs(pos[j].y - pos[i].y) <= 1) {
        if (pos[j].x === pos[i].x - 2) left = true
        if (pos[j].x === pos[i].x + 2) right = true
      }
    }
    if (!covered && (!left || !right)) out.push(i)
  }
  return out
}

function peelDeal(pos, kindPairs) {
  const alive = new Set(pos.map((_, i) => i))
  const kinds = new Array(pos.length).fill(-1)
  const order = []
  for (const kind of kindPairs) {
    const free = freeIndexes(pos, alive)
    if (free.length < 2) return null
    const a = free.splice(Math.floor(rand() * free.length), 1)[0]
    const b = free[Math.floor(rand() * free.length)]
    kinds[a] = kind
    kinds[b] = kind
    alive.delete(a)
    alive.delete(b)
    order.push(a, b)
  }
  return { kinds, order }
}

// --- layout assertions (fail loudly) ---
const assert = (cond, msg) => {
  if (!cond) throw new Error(`assertion failed: ${msg}`)
}
for (const [name, pos] of Object.entries(LAYOUTS)) {
  const pool = POOLS[name]
  assert(pos.length === pool.length * 4, `${name}: tile count ${pos.length} != pool ${pool.length}×4`)
  assert(Math.max(...pos.map((p) => p.x)) + 2 <= 16, `${name}: wider than 16 half-units`)
  assert(pos.every((p) => Number.isInteger(p.x) && Number.isInteger(p.y) && Number.isInteger(p.z) && p.x >= 0 && p.y >= 0 && p.z >= 0), `${name}: bad coordinates`)
  for (let i = 0; i < pos.length; i++) {
    for (let j = i + 1; j < pos.length; j++) {
      assert(!(pos[i].z === pos[j].z && overlaps(pos[i], pos[j])), `${name}: same-z overlap at ${i},${j}`)
    }
    if (pos[i].z > 0) {
      assert(pos.some((b) => b.z === pos[i].z - 1 && overlaps(pos[i], b)), `${name}: floating tile ${i}`)
    }
  }
}

// --- generate ---
const deals = []
for (const [difficulty, pos] of Object.entries(LAYOUTS)) {
  const pool = POOLS[difficulty]
  for (let n = 1; n <= PER_DIFFICULTY; n++) {
    let built = null
    let tries = 0
    while (!built && tries < 200) {
      const kindPairs = shuffle(pool.flatMap((k) => [k, k])) // 2 pairs per kind
      built = peelDeal(pos, kindPairs)
      tries++
    }
    assert(built, `${difficulty} deal ${n}: peel could not complete in 200 tries`)
    deals.push({
      id: `${PREFIX[difficulty]}${String(n).padStart(2, '0')}`,
      difficulty,
      kinds: built.kinds,
      solution: built.order,
    })
  }
}

// --- deal assertions ---
assert(deals.length === 90, 'expected 90 deals')
assert(new Set(deals.map((d) => d.id)).size === 90, 'ids must be unique')
for (const d of deals) {
  const pos = LAYOUTS[d.difficulty]
  const pool = POOLS[d.difficulty]
  const counts = new Map()
  for (const k of d.kinds) counts.set(k, (counts.get(k) ?? 0) + 1)
  assert([...counts.keys()].sort((a, b) => a - b).join() === pool.join(), `${d.id}: pool mismatch`)
  for (const k of pool) assert(counts.get(k) === 4, `${d.id}: kind ${k} count`)
  assert(new Set(d.solution).size === pos.length, `${d.id}: solution coverage`)
  // replay the solution against geometry: every pair free at its turn, kinds match
  const alive = new Set(pos.map((_, i) => i))
  for (let k = 0; k < d.solution.length; k += 2) {
    const [a, b] = [d.solution[k], d.solution[k + 1]]
    const free = new Set(freeIndexes(pos, alive))
    assert(free.has(a) && free.has(b), `${d.id}: pair ${k / 2} not free`)
    assert(d.kinds[a] === d.kinds[b], `${d.id}: pair ${k / 2} kind mismatch`)
    alive.delete(a)
    alive.delete(b)
  }
  assert(alive.size === 0, `${d.id}: solution does not clear`)
}

// --- emit ---
const layoutHeader = `// lib/games/mahjong-layouts.ts
// GENERATED by scripts/generate-mahjong-deals.mjs from
// scripts/mahjong-layouts.mjs — do not edit either output by hand.
// Positions are half-units (tile footprint 2×2), z = layer.
import type { MahjongLayout, Difficulty } from './mahjong/engine'

export const MAHJONG_LAYOUTS: Record<Difficulty, MahjongLayout> = {
`
const layoutRows = Object.entries(LAYOUTS)
  .map(([name, pos]) => `  ${name}: { positions: ${JSON.stringify(pos)} },`)
  .join('\n')
writeFileSync(OUT_LAYOUTS, layoutHeader + layoutRows + '\n}\n')

const dealHeader = `// lib/games/mahjong-deals.ts
// GENERATED by scripts/generate-mahjong-deals.mjs (SEED=${SEED}) — do not
// edit. 90 deals, 30 per difficulty, built by peel construction: each
// deal's \`solution\` is a winning removal order, proven at generation and
// re-proven in deals.test.ts. Imported only by the mahjong chunk.
import type { MahjongDeal } from './mahjong/engine'

export const MAHJONG_DEALS: MahjongDeal[] = [
`
const dealRows = deals
  .map((d) => `  { id: '${d.id}', difficulty: '${d.difficulty}', kinds: ${JSON.stringify(d.kinds)}, solution: ${JSON.stringify(d.solution)} },`)
  .join('\n')
writeFileSync(OUT_DEALS, dealHeader + dealRows + '\n]\n')
console.log(`wrote ${Object.keys(LAYOUTS).length} layouts and ${deals.length} deals`)
