// scripts/generate-sudoku-puzzles.mjs
// One-off generator for the committed sudoku puzzle bank behind /games/sudoku.
// Emits lib/games/sudoku-puzzles.ts: 180 puzzles (60 per difficulty), each
// verified here to have EXACTLY ONE solution — its stored one. Difficulty is
// a givens-count proxy (easy 38-42, medium 30-34, hard 26-29), not a
// technique-graded engine. The output is committed; re-run only to change
// the bank. Deterministic: same SEED, same file.
//
//   node scripts/generate-sudoku-puzzles.mjs
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '..', 'lib', 'games', 'sudoku-puzzles.ts')

// --- deterministic PRNG (LCG, same recipe as generate-sql-seed.mjs) ---
const SEED = 7
let s = SEED
const rand = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0), s / 4294967296)
const randInt = (min, max) => min + Math.floor(rand() * (max - min + 1))
const shuffle = (arr) => {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(0, i)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// --- grid helpers (grid: Uint8Array(81), 0 = empty) ---
const rowOf = (i) => Math.floor(i / 9)
const colOf = (i) => i % 9
const boxOf = (i) => Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3)

function canPlace(grid, cell, d) {
  const r = rowOf(cell), c = colOf(cell), b = boxOf(cell)
  for (let i = 0; i < 81; i++) {
    if (grid[i] === d && (rowOf(i) === r || colOf(i) === c || boxOf(i) === b)) return false
  }
  return true
}

// Fill a solved grid via randomized backtracking.
function fillGrid(grid, cell = 0) {
  if (cell === 81) return true
  if (grid[cell] !== 0) return fillGrid(grid, cell + 1)
  for (const d of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
    if (canPlace(grid, cell, d)) {
      grid[cell] = d
      if (fillGrid(grid, cell + 1)) return true
      grid[cell] = 0
    }
  }
  return false
}

// Count solutions up to `limit` (early exit). MRV: branch on the empty cell
// with the fewest candidates. Backtracks fully — grid is left as passed.
function countSolutions(grid, limit = 2) {
  let best = -1
  let bestCands = null
  for (let i = 0; i < 81; i++) {
    if (grid[i] !== 0) continue
    const cands = []
    for (let d = 1; d <= 9; d++) if (canPlace(grid, i, d)) cands.push(d)
    if (cands.length === 0) return 0
    if (!bestCands || cands.length < bestCands.length) {
      best = i
      bestCands = cands
      if (cands.length === 1) break
    }
  }
  if (best === -1) return 1 // no empties — a full valid grid
  let count = 0
  for (const d of bestCands) {
    grid[best] = d
    count += countSolutions(grid, limit - count)
    grid[best] = 0
    if (count >= limit) break
  }
  return count
}

// First solution of a (unique-solution) puzzle, deterministic digit order.
function solveOne(grid) {
  const g = Uint8Array.from(grid)
  const step = (cell) => {
    if (cell === 81) return true
    if (g[cell] !== 0) return step(cell + 1)
    for (let d = 1; d <= 9; d++) {
      if (canPlace(g, cell, d)) {
        g[cell] = d
        if (step(cell + 1)) return true
        g[cell] = 0
      }
    }
    return false
  }
  if (!step(0)) throw new Error('solveOne: unsolvable grid')
  return g
}

// Dig holes from a solved grid down to targetGivens, keeping uniqueness.
// Single shuffled pass; returns null if the pass bottoms out above target.
function dig(solution, targetGivens) {
  const grid = Uint8Array.from(solution)
  let givens = 81
  for (const i of shuffle([...Array(81).keys()])) {
    if (givens === targetGivens) break
    const saved = grid[i]
    grid[i] = 0
    if (countSolutions(grid, 2) === 1) {
      givens--
    } else {
      grid[i] = saved
    }
  }
  return givens === targetGivens ? grid : null
}

// --- generate ---
const TARGETS = { easy: [38, 42], medium: [30, 34], hard: [26, 29] }
const PER_DIFFICULTY = 60
const puzzles = []

for (const [difficulty, [lo, hi]] of Object.entries(TARGETS)) {
  for (let n = 1; n <= PER_DIFFICULTY; n++) {
    const target = randInt(lo, hi)
    let givensGrid = null
    let solGrid = null
    while (!givensGrid) {
      solGrid = new Uint8Array(81)
      if (!fillGrid(solGrid)) continue
      givensGrid = dig(solGrid, target)
    }
    const id = `${difficulty[0]}${String(n).padStart(2, '0')}`
    puzzles.push({
      id,
      difficulty,
      givens: Array.from(givensGrid).join(''),
      solution: Array.from(solGrid).join(''),
    })
    process.stdout.write(`\r${difficulty} ${n}/${PER_DIFFICULTY}   `)
  }
  process.stdout.write('\n')
}

// --- assertions: generation fails loudly if any shape is off ---
const assert = (cond, msg) => {
  if (!cond) throw new Error(`assertion failed: ${msg}`)
}

assert(puzzles.length === 180, 'expected 180 puzzles')
assert(new Set(puzzles.map((p) => p.id)).size === 180, 'ids must be unique')

for (const p of puzzles) {
  const sol = Uint8Array.from(p.solution, (ch) => ch.charCodeAt(0) - 48)
  const giv = Uint8Array.from(p.givens, (ch) => ch.charCodeAt(0) - 48)
  // solution is a valid completed grid
  for (let i = 0; i < 81; i++) {
    const d = sol[i]
    sol[i] = 0
    assert(canPlace(sol, i, d), `${p.id}: solution invalid at cell ${i}`)
    sol[i] = d
  }
  // givens subset + count in range
  let count = 0
  for (let i = 0; i < 81; i++) {
    if (giv[i] !== 0) {
      count++
      assert(giv[i] === sol[i], `${p.id}: given differs from solution at ${i}`)
    }
  }
  const [lo, hi] = TARGETS[p.difficulty]
  assert(count >= lo && count <= hi, `${p.id}: ${count} givens outside [${lo}, ${hi}]`)
  // unique solution, and it is the stored one
  assert(countSolutions(Uint8Array.from(giv), 2) === 1, `${p.id}: solution not unique`)
  const solved = solveOne(giv)
  assert(solved.every((d, i) => d === sol[i]), `${p.id}: solver disagrees with stored solution`)
}

// --- emit ---
const header = `// lib/games/sudoku-puzzles.ts
// GENERATED by scripts/generate-sudoku-puzzles.mjs (SEED=${SEED}) — do not edit.
// 180 puzzles, 60 per difficulty. Every puzzle was verified at generation
// time to have exactly one solution: its stored one. Imported only by the
// sudoku chunk (ssr: false), so this file costs other routes zero bytes.
import type { SudokuPuzzle } from './sudoku/engine'

export const SUDOKU_PUZZLES: SudokuPuzzle[] = [
`
const rows = puzzles
  .map((p) => `  { id: '${p.id}', difficulty: '${p.difficulty}', givens: '${p.givens}', solution: '${p.solution}' },`)
  .join('\n')
writeFileSync(OUT, header + rows + '\n]\n')
console.log(`Wrote ${puzzles.length} puzzles to ${OUT}`)
