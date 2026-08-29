# /games Section + Sudoku Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an unlisted, ad-free `/games` section with Sudoku as game 01 — mobile-first, Living Ledger styled, resumable, keyboard-accessible — architected so future games are one component + one metadata entry.

**Architecture:** Metadata-driven section mirroring `/learn`: `lib/games/games.ts` drives the `/games` index and `/games/[slug]` pages; the Sudoku component is code-split `ssr: false`. Pure game logic lives in `lib/games/sudoku/` (engine + storage, fully unit-tested); a deterministic generator script emits a committed 180-puzzle bank with uniqueness assertions.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind 4 (CSS-first tokens), vitest + Testing Library (jsdom), Playwright. Zero new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-28-games-sudoku-design.md` — the authority on any question this plan doesn't answer.

## Global Constraints

- Branch: `feat/games-sudoku` (already exists, spec committed on it).
- **No new npm dependencies.** Everything is hand-rolled.
- **No CSP / headers changes.** No third-party bytes, no wasm, no new origins.
- **Unlisted:** `robots: { index: false }` on both /games pages; NO sitemap entries, NO robots.txt change, NO nav pill, NO footer link, NO homepage mention.
- **Touch targets ≥ 44px** on all controls (board cells exempt — contiguous grid). Minimum readable text 12px, except pencil-note digits below 375px viewports (documented spec deviation).
- **Both themes** via existing token classes (`text-ink dark:text-night-text`, etc.). New color tokens: `--color-red` `#d20f39` (Latte Red), `--color-red-dark` `#f38ba8` (Mocha Red) — mistake highlighting only.
- **Reduced motion:** no entry animations, drawn strokes render fully drawn (the sitewide CSS override covers `draw-stroke`; don't add JS animation that bypasses it).
- **localStorage key:** `sudoku-progress-v1`, read only in lazy initializers (component is ssr:false), every read/write in try/catch.
- Comment style: sparse, only for constraints the code can't show (match existing files).
- All commits end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` (project convention — see recent `git log`).

---

### Task 1: Sudoku engine (pure TS, TDD)

**Files:**
- Create: `lib/games/sudoku/engine.ts`
- Test: `lib/games/sudoku/engine.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces (exact, later tasks depend on these names):

```ts
export type Difficulty = 'easy' | 'medium' | 'hard'
export interface SudokuPuzzle { id: string; difficulty: Difficulty; givens: string; solution: string }
export interface Cell { value: number; given: boolean; notes: number } // notes = bitmask, bit (d-1) = note digit d
export interface HistoryEntry { cells: { index: number; before: Cell; after: Cell }[] }
export interface BoardState { puzzle: SudokuPuzzle; cells: Cell[]; history: HistoryEntry[] }
export const HISTORY_CAP = 200
export function peers(index: number): number[]
export function newGame(puzzle: SudokuPuzzle): BoardState
export function restoreGame(puzzle: SudokuPuzzle, values: string, notes: number[]): BoardState
export function setValue(state: BoardState, index: number, digit: number): BoardState
export function toggleNote(state: BoardState, index: number, digit: number): BoardState
export function eraseCell(state: BoardState, index: number): BoardState
export function undo(state: BoardState): BoardState
export function mistakes(state: BoardState): number[]
export function isComplete(state: BoardState): boolean
export function isSolved(state: BoardState): boolean
export function serialize(state: BoardState): { values: string; notes: number[] }
export function pickPuzzle(puzzles: SudokuPuzzle[], difficulty: Difficulty, usedIds: string[], rand?: () => number): { puzzle: SudokuPuzzle; usedIds: string[] }
export function formatElapsed(seconds: number): string
```

- [ ] **Step 1: Write the failing tests**

`lib/games/sudoku/engine.test.ts`:

```ts
/**
 * Tests for lib/games/sudoku/engine.ts — pure sudoku game logic.
 * TEST_SOLUTION is the standard row-shift grid (valid completed sudoku);
 * TEST_GIVENS blanks cells 0 and 1 (same row/box — exercises note cascade).
 */
import {
  HISTORY_CAP, newGame, restoreGame, setValue, toggleNote, eraseCell, undo,
  mistakes, isComplete, isSolved, serialize, peers, pickPuzzle, formatElapsed,
  type SudokuPuzzle,
} from '@/lib/games/sudoku/engine'

const TEST_SOLUTION = [
  '123456789', '456789123', '789123456',
  '231564897', '564897231', '897231564',
  '312645978', '645978312', '978312645',
].join('')
const TEST_GIVENS = '00' + TEST_SOLUTION.slice(2)

const PUZZLE: SudokuPuzzle = {
  id: 't01', difficulty: 'easy', givens: TEST_GIVENS, solution: TEST_SOLUTION,
}

describe('newGame', () => {
  it('maps givens: 0 chars become empty non-given cells', () => {
    const s = newGame(PUZZLE)
    expect(s.cells).toHaveLength(81)
    expect(s.cells[0]).toEqual({ value: 0, given: false, notes: 0 })
    expect(s.cells[1]).toEqual({ value: 0, given: false, notes: 0 })
    expect(s.cells[2]).toEqual({ value: 3, given: true, notes: 0 })
    expect(s.history).toEqual([])
  })
})

describe('peers', () => {
  it('returns the 20 cells sharing a row, column, or box', () => {
    const p = peers(0)
    expect(p).toHaveLength(20)
    expect(p).toContain(1)   // row
    expect(p).toContain(9)   // column
    expect(p).toContain(10)  // box
    expect(p).not.toContain(0)
  })
})

describe('setValue', () => {
  it('places a digit and records one history entry', () => {
    const s = setValue(newGame(PUZZLE), 0, 5)
    expect(s.cells[0].value).toBe(5)
    expect(s.history).toHaveLength(1)
  })

  it('is a no-op on given cells and on re-placing the same digit', () => {
    const s0 = newGame(PUZZLE)
    expect(setValue(s0, 2, 9)).toBe(s0)
    const s1 = setValue(s0, 0, 5)
    expect(setValue(s1, 0, 5)).toBe(s1)
  })

  it('clears the placed digit from peer notes in the SAME history entry, and undo restores both', () => {
    let s = newGame(PUZZLE)
    s = toggleNote(s, 1, 5) // cell 1 is a peer of cell 0
    s = setValue(s, 0, 5)
    expect(s.cells[1].notes).toBe(0)
    expect(s.history).toHaveLength(2) // note toggle + placement (cascade folded in)
    s = undo(s)
    expect(s.cells[0].value).toBe(0)
    expect(s.cells[1].notes).toBe(1 << 4)
  })

  it('clears the cell own notes when a value is placed', () => {
    let s = toggleNote(newGame(PUZZLE), 0, 3)
    s = setValue(s, 0, 5)
    expect(s.cells[0].notes).toBe(0)
  })
})

describe('toggleNote', () => {
  it('toggles a note bit on and off', () => {
    let s = toggleNote(newGame(PUZZLE), 0, 4)
    expect(s.cells[0].notes).toBe(1 << 3)
    s = toggleNote(s, 0, 4)
    expect(s.cells[0].notes).toBe(0)
  })

  it('is a no-op on given cells and on cells holding a value', () => {
    const s0 = newGame(PUZZLE)
    expect(toggleNote(s0, 2, 4)).toBe(s0)
    const s1 = setValue(s0, 0, 5)
    expect(toggleNote(s1, 0, 4)).toBe(s1)
  })
})

describe('eraseCell', () => {
  it('clears value and notes', () => {
    let s = setValue(newGame(PUZZLE), 0, 5)
    s = eraseCell(s, 0)
    expect(s.cells[0]).toEqual({ value: 0, given: false, notes: 0 })
  })

  it('is a no-op on given cells and already-empty cells', () => {
    const s0 = newGame(PUZZLE)
    expect(eraseCell(s0, 2)).toBe(s0)
    expect(eraseCell(s0, 0)).toBe(s0)
  })
})

describe('undo', () => {
  it('is a no-op with empty history', () => {
    const s0 = newGame(PUZZLE)
    expect(undo(s0)).toBe(s0)
  })

  it('caps history at HISTORY_CAP entries, dropping the oldest', () => {
    let s = newGame(PUZZLE)
    for (let i = 0; i < HISTORY_CAP + 10; i++) s = toggleNote(s, 0, (i % 9) + 1)
    expect(s.history).toHaveLength(HISTORY_CAP)
  })
})

describe('mistakes / isComplete / isSolved', () => {
  it('flags wrong non-given values only', () => {
    // solution has 1 at cell 0, 2 at cell 1
    let s = setValue(newGame(PUZZLE), 0, 9)
    s = setValue(s, 1, 2)
    expect(mistakes(s)).toEqual([0])
  })

  it('correct fill => complete and solved; wrong fill => complete, not solved', () => {
    let s = setValue(newGame(PUZZLE), 0, 1)
    expect(isComplete(s)).toBe(false)
    s = setValue(s, 1, 2)
    expect(isComplete(s)).toBe(true)
    expect(isSolved(s)).toBe(true)
    const wrong = setValue(s, 0, 9)
    expect(isComplete(wrong)).toBe(true)
    expect(isSolved(wrong)).toBe(false)
  })
})

describe('serialize / restoreGame', () => {
  it('round-trips values and notes; history resets; givens win over corrupt values', () => {
    let s = setValue(newGame(PUZZLE), 0, 5)
    s = toggleNote(s, 1, 7)
    const { values, notes } = serialize(s)
    const r = restoreGame(PUZZLE, values, notes)
    expect(r.cells[0].value).toBe(5)
    expect(r.cells[1].notes).toBe(1 << 6)
    expect(r.history).toEqual([])
    // a corrupt saved value on a given cell must not override the given
    const tampered = restoreGame(PUZZLE, '9' + values.slice(1, 2) + '9' + values.slice(3), notes)
    expect(tampered.cells[2]).toEqual({ value: 3, given: true, notes: 0 })
  })
})

describe('pickPuzzle', () => {
  const bank: SudokuPuzzle[] = [
    { id: 'e1', difficulty: 'easy', givens: TEST_GIVENS, solution: TEST_SOLUTION },
    { id: 'e2', difficulty: 'easy', givens: TEST_GIVENS, solution: TEST_SOLUTION },
    { id: 'm1', difficulty: 'medium', givens: TEST_GIVENS, solution: TEST_SOLUTION },
  ]

  it('picks only the requested difficulty, excluding used ids', () => {
    const { puzzle, usedIds } = pickPuzzle(bank, 'easy', ['e1'], () => 0)
    expect(puzzle.id).toBe('e2')
    expect(usedIds).toEqual(['e1', 'e2'])
  })

  it('resets the used list for a difficulty when it is exhausted, keeping other difficulties', () => {
    const { puzzle, usedIds } = pickPuzzle(bank, 'easy', ['e1', 'e2', 'm1'], () => 0)
    expect(puzzle.id).toBe('e1')
    expect(usedIds).toEqual(['m1', 'e1'])
  })
})

describe('formatElapsed', () => {
  it('formats seconds, minutes, and hours', () => {
    expect(formatElapsed(45)).toBe('45 sec')
    expect(formatElapsed(60)).toBe('1 min')
    expect(formatElapsed(845)).toBe('14 min')
    expect(formatElapsed(3720)).toBe('1 hr 2 min')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/games/sudoku/engine.test.ts`
Expected: FAIL — cannot resolve `@/lib/games/sudoku/engine`.

- [ ] **Step 3: Write the implementation**

`lib/games/sudoku/engine.ts`:

```ts
// Pure sudoku game logic — no DOM, no React. The component in
// components/games/sudoku/ is a thin view over these functions.
// All state transitions are immutable: they return a new BoardState
// (or the SAME state object for no-ops, which callers rely on).

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface SudokuPuzzle {
  id: string
  difficulty: Difficulty
  givens: string // 81 chars, '0' = empty
  solution: string // 81 chars, digits 1-9
}

export interface Cell {
  value: number // 0 = empty
  given: boolean
  notes: number // bitmask: bit (d-1) set = pencil note d
}

export interface HistoryEntry {
  cells: { index: number; before: Cell; after: Cell }[]
}

export interface BoardState {
  puzzle: SudokuPuzzle
  cells: Cell[]
  history: HistoryEntry[]
}

export const HISTORY_CAP = 200

const PEERS: number[][] = (() => {
  const out: number[][] = []
  for (let i = 0; i < 81; i++) {
    const r = Math.floor(i / 9)
    const c = i % 9
    const br = Math.floor(r / 3) * 3
    const bc = Math.floor(c / 3) * 3
    const set = new Set<number>()
    for (let k = 0; k < 9; k++) {
      set.add(r * 9 + k)
      set.add(k * 9 + c)
      set.add((br + Math.floor(k / 3)) * 9 + bc + (k % 3))
    }
    set.delete(i)
    out.push([...set].sort((a, b) => a - b))
  }
  return out
})()

export function peers(index: number): number[] {
  return PEERS[index]
}

export function newGame(puzzle: SudokuPuzzle): BoardState {
  const cells = Array.from({ length: 81 }, (_, i) => {
    const d = puzzle.givens.charCodeAt(i) - 48
    return { value: d, given: d !== 0, notes: 0 }
  })
  return { puzzle, cells, history: [] }
}

// Rebuild a board from persisted values/notes. Givens are re-derived from the
// puzzle (a tampered/corrupt save can never override a given); history resets.
export function restoreGame(puzzle: SudokuPuzzle, values: string, notes: number[]): BoardState {
  const cells = Array.from({ length: 81 }, (_, i) => {
    const g = puzzle.givens.charCodeAt(i) - 48
    if (g !== 0) return { value: g, given: true, notes: 0 }
    const v = values.charCodeAt(i) - 48
    return { value: v >= 1 && v <= 9 ? v : 0, given: false, notes: (notes[i] ?? 0) & 0x1ff }
  })
  return { puzzle, cells, history: [] }
}

function pushHistory(history: HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
  const next = [...history, entry]
  return next.length > HISTORY_CAP ? next.slice(next.length - HISTORY_CAP) : next
}

export function setValue(state: BoardState, index: number, digit: number): BoardState {
  const cell = state.cells[index]
  if (cell.given || cell.value === digit) return state
  const cells = state.cells.slice()
  const changed: HistoryEntry['cells'] = []
  const after = { value: digit, given: false, notes: 0 }
  changed.push({ index, before: cell, after })
  cells[index] = after
  // Placing a digit removes it from peer notes — one history entry for the
  // whole cascade so a single undo restores everything.
  const bit = 1 << (digit - 1)
  for (const p of PEERS[index]) {
    const pc = cells[p]
    if (!pc.given && pc.value === 0 && pc.notes & bit) {
      const pAfter = { ...pc, notes: pc.notes & ~bit }
      changed.push({ index: p, before: pc, after: pAfter })
      cells[p] = pAfter
    }
  }
  return { ...state, cells, history: pushHistory(state.history, { cells: changed }) }
}

export function toggleNote(state: BoardState, index: number, digit: number): BoardState {
  const cell = state.cells[index]
  if (cell.given || cell.value !== 0) return state
  const after = { ...cell, notes: cell.notes ^ (1 << (digit - 1)) }
  const cells = state.cells.slice()
  cells[index] = after
  return { ...state, cells, history: pushHistory(state.history, { cells: [{ index, before: cell, after }] }) }
}

export function eraseCell(state: BoardState, index: number): BoardState {
  const cell = state.cells[index]
  if (cell.given || (cell.value === 0 && cell.notes === 0)) return state
  const after = { value: 0, given: false, notes: 0 }
  const cells = state.cells.slice()
  cells[index] = after
  return { ...state, cells, history: pushHistory(state.history, { cells: [{ index, before: cell, after }] }) }
}

export function undo(state: BoardState): BoardState {
  const entry = state.history[state.history.length - 1]
  if (!entry) return state
  const cells = state.cells.slice()
  for (const { index, before } of entry.cells) cells[index] = before
  return { ...state, cells, history: state.history.slice(0, -1) }
}

export function mistakes(state: BoardState): number[] {
  const out: number[] = []
  for (let i = 0; i < 81; i++) {
    const c = state.cells[i]
    if (!c.given && c.value !== 0 && c.value !== state.puzzle.solution.charCodeAt(i) - 48) out.push(i)
  }
  return out
}

export function isComplete(state: BoardState): boolean {
  return state.cells.every((c) => c.value !== 0)
}

export function isSolved(state: BoardState): boolean {
  return state.cells.every((c, i) => c.value === state.puzzle.solution.charCodeAt(i) - 48)
}

export function serialize(state: BoardState): { values: string; notes: number[] } {
  return {
    values: state.cells.map((c) => String(c.value)).join(''),
    notes: state.cells.map((c) => c.notes),
  }
}

// Random puzzle of a difficulty, avoiding already-played ids. When the
// difficulty is exhausted its used entries reset (other difficulties keep
// theirs). Returns the updated used list alongside the pick.
export function pickPuzzle(
  puzzles: SudokuPuzzle[],
  difficulty: Difficulty,
  usedIds: string[],
  rand: () => number = Math.random
): { puzzle: SudokuPuzzle; usedIds: string[] } {
  const pool = puzzles.filter((p) => p.difficulty === difficulty)
  const used = new Set(usedIds)
  let fresh = pool.filter((p) => !used.has(p.id))
  let nextUsed = usedIds
  if (fresh.length === 0) {
    const poolIds = new Set(pool.map((p) => p.id))
    nextUsed = usedIds.filter((id) => !poolIds.has(id))
    fresh = pool
  }
  const puzzle = fresh[Math.floor(rand() * fresh.length)]
  return { puzzle, usedIds: [...nextUsed, puzzle.id] }
}

export function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h} hr ${m} min`
  if (m > 0) return `${m} min`
  return `${seconds} sec`
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/games/sudoku/engine.test.ts`
Expected: PASS (all tests).

- [ ] **Step 5: Run the full suite + lint to catch regressions**

Run: `npm test -- --run && npm run lint`
Expected: all existing tests still pass; no new lint errors (2 known pre-existing errors in `interactive-headshot.tsx` and `masonry-grid.tsx` are OK).

- [ ] **Step 6: Commit**

```bash
git add lib/games/sudoku/engine.ts lib/games/sudoku/engine.test.ts
git commit -m "feat: sudoku engine — pure board logic with notes, undo, and puzzle picking

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Puzzle generator + committed bank

**Files:**
- Create: `scripts/generate-sudoku-puzzles.mjs`
- Create (generated): `lib/games/sudoku-puzzles.ts`
- Test: `lib/games/sudoku/puzzles.test.ts`

**Interfaces:**
- Consumes: `SudokuPuzzle` type from Task 1 (type-only import in the generated file).
- Produces: `export const SUDOKU_PUZZLES: SudokuPuzzle[]` from `@/lib/games/sudoku-puzzles` — 180 puzzles, ids `e01…e60`, `m01…m60`, `h01…h60`.

- [ ] **Step 1: Write the failing bank-integrity test**

`lib/games/sudoku/puzzles.test.ts`:

```ts
/**
 * Integrity tests over the COMMITTED puzzle bank (lib/games/sudoku-puzzles.ts).
 * Uniqueness-of-solution is asserted at generation time by the script — the
 * counting solver is too slow for the unit suite. These tests re-verify
 * everything cheap: validity, subset, counts, ids.
 */
import { SUDOKU_PUZZLES } from '@/lib/games/sudoku-puzzles'

const RANGES: Record<string, [number, number]> = {
  easy: [38, 42],
  medium: [30, 34],
  hard: [26, 29],
}

function unitValid(digits: number[]): boolean {
  return digits.length === 9 && new Set(digits).size === 9 && digits.every((d) => d >= 1 && d <= 9)
}

function solutionValid(sol: string): boolean {
  const at = (r: number, c: number) => sol.charCodeAt(r * 9 + c) - 48
  for (let k = 0; k < 9; k++) {
    const row = [], col = [], box = []
    for (let j = 0; j < 9; j++) {
      row.push(at(k, j))
      col.push(at(j, k))
      box.push(at(Math.floor(k / 3) * 3 + Math.floor(j / 3), (k % 3) * 3 + (j % 3)))
    }
    if (!unitValid(row) || !unitValid(col) || !unitValid(box)) return false
  }
  return true
}

it('has 60 puzzles per difficulty with unique ids', () => {
  expect(SUDOKU_PUZZLES).toHaveLength(180)
  const ids = new Set(SUDOKU_PUZZLES.map((p) => p.id))
  expect(ids.size).toBe(180)
  for (const d of ['easy', 'medium', 'hard']) {
    expect(SUDOKU_PUZZLES.filter((p) => p.difficulty === d)).toHaveLength(60)
  }
})

it('every solution is a valid completed grid', () => {
  for (const p of SUDOKU_PUZZLES) {
    expect(p.solution).toHaveLength(81)
    expect(solutionValid(p.solution), `puzzle ${p.id}`).toBe(true)
  }
})

it('givens are a subset of the solution, with counts in the difficulty range', () => {
  for (const p of SUDOKU_PUZZLES) {
    expect(p.givens).toHaveLength(81)
    let count = 0
    for (let i = 0; i < 81; i++) {
      const g = p.givens.charCodeAt(i) - 48
      if (g !== 0) {
        count++
        expect(g, `puzzle ${p.id} cell ${i}`).toBe(p.solution.charCodeAt(i) - 48)
      }
    }
    const [lo, hi] = RANGES[p.difficulty]
    expect(count, `puzzle ${p.id} givens`).toBeGreaterThanOrEqual(lo)
    expect(count, `puzzle ${p.id} givens`).toBeLessThanOrEqual(hi)
  }
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/games/sudoku/puzzles.test.ts`
Expected: FAIL — cannot resolve `@/lib/games/sudoku-puzzles`.

- [ ] **Step 3: Write the generator script**

`scripts/generate-sudoku-puzzles.mjs`:

```js
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
```

- [ ] **Step 4: Run the generator**

Run: `node scripts/generate-sudoku-puzzles.mjs`
Expected: progress lines, then `Wrote 180 puzzles to …/lib/games/sudoku-puzzles.ts`. May take a minute or two (the hard-tier uniqueness checks are the slow part). If it throws an assertion, do NOT hand-edit the output — fix the generator (or bump `SEED`) and re-run.

- [ ] **Step 5: Run the bank test to verify it passes**

Run: `npx vitest run lib/games/sudoku/puzzles.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit (generated bank included — it is a committed artifact, like sql-seed.ts)**

```bash
git add scripts/generate-sudoku-puzzles.mjs lib/games/sudoku-puzzles.ts lib/games/sudoku/puzzles.test.ts
git commit -m "feat: deterministic sudoku puzzle bank — 180 unique-solution puzzles

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Storage module (TDD)

**Files:**
- Create: `lib/games/sudoku/storage.ts`
- Test: `lib/games/sudoku/storage.test.ts`

**Interfaces:**
- Consumes: nothing (types only).
- Produces:

```ts
export const STORAGE_KEY = 'sudoku-progress-v1'
export interface SudokuSettings { showMistakes: boolean }
export interface SavedProgress {
  puzzleId: string | null
  values: string        // 81 chars when puzzleId is set
  notes: number[]       // 81 bitmasks when puzzleId is set
  elapsedSeconds: number
  usedIds: string[]
  settings: SudokuSettings
}
export function defaultProgress(): SavedProgress
export function loadProgress(): SavedProgress | null
export function saveProgress(p: SavedProgress): void
```

- [ ] **Step 1: Write the failing tests**

`lib/games/sudoku/storage.test.ts`:

```ts
/**
 * Tests for lib/games/sudoku/storage.ts. jsdom provides a working
 * localStorage; the quota test stubs setItem to throw.
 */
import {
  STORAGE_KEY, defaultProgress, loadProgress, saveProgress,
  type SavedProgress,
} from '@/lib/games/sudoku/storage'

const VALID: SavedProgress = {
  puzzleId: 'e01',
  values: '0'.repeat(81),
  notes: Array(81).fill(0),
  elapsedSeconds: 120,
  usedIds: ['e01'],
  settings: { showMistakes: true },
}

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

it('round-trips a valid progress object', () => {
  saveProgress(VALID)
  expect(loadProgress()).toEqual(VALID)
})

it('returns null when nothing is stored', () => {
  expect(loadProgress()).toBeNull()
})

it('returns null on corrupt JSON', () => {
  localStorage.setItem(STORAGE_KEY, '{nope')
  expect(loadProgress()).toBeNull()
})

it('returns null on shape violations', () => {
  for (const bad of [
    { ...VALID, values: '0'.repeat(80) },        // wrong length
    { ...VALID, notes: Array(80).fill(0) },       // wrong length
    { ...VALID, elapsedSeconds: 'soon' },         // wrong type
    { ...VALID, usedIds: [1, 2] },                // wrong element type
    { ...VALID, settings: {} },                   // missing flag
  ]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bad))
    expect(loadProgress()).toBeNull()
  }
})

it('allows empty values/notes when puzzleId is null', () => {
  const fresh = defaultProgress()
  saveProgress(fresh)
  expect(loadProgress()).toEqual(fresh)
})

it('saveProgress swallows storage errors (private mode / quota)', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('QuotaExceededError')
  })
  expect(() => saveProgress(VALID)).not.toThrow()
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/games/sudoku/storage.test.ts`
Expected: FAIL — cannot resolve module.

- [ ] **Step 3: Write the implementation**

`lib/games/sudoku/storage.ts`:

```ts
// localStorage persistence for /games/sudoku. Every access is wrapped in
// try/catch — private mode, quota, and corrupt payloads all degrade to
// "no save", never to a crash. Only called from the ssr:false component.

export const STORAGE_KEY = 'sudoku-progress-v1'

export interface SudokuSettings {
  showMistakes: boolean
}

export interface SavedProgress {
  puzzleId: string | null
  values: string
  notes: number[]
  elapsedSeconds: number
  usedIds: string[]
  settings: SudokuSettings
}

export function defaultProgress(): SavedProgress {
  return {
    puzzleId: null,
    values: '',
    notes: [],
    elapsedSeconds: 0,
    usedIds: [],
    settings: { showMistakes: true },
  }
}

function isValid(p: unknown): p is SavedProgress {
  if (typeof p !== 'object' || p === null) return false
  const o = p as Record<string, unknown>
  if (o.puzzleId !== null && typeof o.puzzleId !== 'string') return false
  if (typeof o.elapsedSeconds !== 'number' || !Number.isFinite(o.elapsedSeconds)) return false
  if (!Array.isArray(o.usedIds) || !o.usedIds.every((id) => typeof id === 'string')) return false
  const settings = o.settings as Record<string, unknown> | null
  if (typeof settings !== 'object' || settings === null) return false
  if (typeof settings.showMistakes !== 'boolean') return false
  if (o.puzzleId !== null) {
    if (typeof o.values !== 'string' || o.values.length !== 81) return false
    if (!Array.isArray(o.notes) || o.notes.length !== 81) return false
    if (!o.notes.every((n) => typeof n === 'number')) return false
  }
  return true
}

export function loadProgress(): SavedProgress | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isValid(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function saveProgress(p: SavedProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
  } catch {
    // storage unavailable — play continues without persistence
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/games/sudoku/storage.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/games/sudoku/storage.ts lib/games/sudoku/storage.test.ts
git commit -m "feat: sudoku progress persistence — validated localStorage round-trip

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Games metadata, theme tokens, /games index, OG image, routeProfile

**Files:**
- Create: `lib/games/games.ts`
- Create: `components/games/game-card.tsx`
- Create: `app/games/page.tsx`
- Create: `app/games/opengraph-image.tsx`
- Modify: `app/globals.css` (add `--color-red` / `--color-red-dark` to the `@theme` block, `@property` registrations next to the existing ones)
- Modify: `components/living-field.tsx:55-59` (`routeProfile`)

**Interfaces:**
- Consumes: `ACCENT_STYLES`, `AccentColor` from `@/lib/styles`; `useScrollReveal`, `useHydrated` from `@/lib/hooks`; `STORAGE_KEY` from Task 3.
- Produces:

```ts
// lib/games/games.ts
export interface Game { slug: string; title: string; number: string; description: string; accent: AccentColor }
export const GAMES: Game[]
export function getGame(slug: string): Game | undefined
```

- [ ] **Step 1: Create the metadata module**

`lib/games/games.ts`:

```ts
import type { AccentColor } from '@/lib/styles'

// Single source of truth for /games — the index grid, /games/[slug] pages,
// and the per-game component registry all derive from this array.
// Adding a game: create its component, register it in
// components/games/dynamic-games.tsx + app/games/[slug]/page.tsx, add an
// entry here. The section is deliberately unlisted: no sitemap entries,
// no nav pill, robots noindex on every page.
export interface Game {
  slug: string
  title: string
  number: string
  description: string
  accent: AccentColor
}

export const GAMES: Game[] = [
  {
    slug: 'sudoku',
    title: 'Sudoku',
    number: '01',
    description: 'Classic 9×9 — three difficulties, pencil notes, undo, and your game saves itself. No ads, no timer pressure.',
    accent: 'sapphire',
  },
]

export function getGame(slug: string): Game | undefined {
  return GAMES.find((g) => g.slug === slug)
}
```

- [ ] **Step 2: Add the red tokens to globals.css**

In the `@theme` block of `app/globals.css`, next to the existing accent tokens (around the `--color-mauve` lines):

```css
  --color-red: #d20f39;      /* Latte Red — mistake highlighting (/games) */
  --color-red-dark: #f38ba8; /* Mocha Red */
```

And next to the existing `@property` registrations (search for `@property --color-mauve`), matching their exact format:

```css
@property --color-red {
  syntax: "<color>";
  inherits: true;
  initial-value: #d20f39;
}
@property --color-red-dark {
  syntax: "<color>";
  inherits: true;
  initial-value: #f38ba8;
}
```

(Copy the surrounding registrations' exact property order/format — if they include other descriptors, match them.)

- [ ] **Step 3: Add the /games routeProfile entry**

In `components/living-field.tsx`, `routeProfile()`:

```ts
function routeProfile(pathname: string): { density: number; opacity: number } {
  if (pathname === "/") return { density: 1, opacity: 1 };
  if (pathname === "/learn") return { density: 0.7, opacity: 0.8 };
  // /games is explicit (not just the fallback): the field must stay faint
  // and never distract mid-puzzle
  if (pathname.startsWith("/games")) return { density: 0.45, opacity: 0.55 };
  return { density: 0.45, opacity: 0.55 }; // gallery, artifact pages, 404
}
```

- [ ] **Step 4: Create the game card**

`components/games/game-card.tsx` (LearnCard pattern; accent from metadata instead of index):

```tsx
"use client"

import React from "react"
import Link from "next/link"
import { useScrollReveal, useHydrated } from "@/lib/hooks"
import { ACCENT_STYLES } from "@/lib/styles"
import type { Game } from "@/lib/games/games"
import { STORAGE_KEY } from "@/lib/games/sudoku/storage"

// Reads only the puzzleId key — importing the bank or engine here would pull
// them into the index chunk. A solved-but-not-continued game still shows
// "In progress" (accepted: storage keeps the finished board until the next
// new game).
function hasProgress(slug: string): boolean {
  if (slug !== "sudoku") return false
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const parsed: unknown = JSON.parse(raw)
    return typeof (parsed as { puzzleId?: unknown } | null)?.puzzleId === "string"
  } catch {
    return false
  }
}

interface GameCardProps {
  game: Game
  index: number
  illustration: React.ReactNode
}

export function GameCard({ game, index, illustration }: GameCardProps) {
  const [ref, visible] = useScrollReveal()
  const hydrated = useHydrated()
  const styles = ACCENT_STYLES[game.accent]
  const inProgress = hydrated && hasProgress(game.slug)

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      style={visible ? {
        animation: `fade-in-up 0.6s ease-out ${index * 0.12}s forwards`,
        opacity: 0,
      } : { opacity: 0 }}
    >
      <Link
        href={`/games/${game.slug}`}
        className="card-hover group block rounded-xl border border-cream-border dark:border-night-border
          bg-white dark:bg-night-card overflow-hidden transition-all duration-300"
      >
        <div className={`flex items-center justify-center h-40 bg-cream-dark/50 dark:bg-night/60
          border-b border-cream-border dark:border-night-border ${visible ? 'is-drawn' : ''}`}>
          {illustration}
        </div>

        <div className="p-5">
          <div className="flex items-baseline gap-1.5 mb-2">
            <span className="font-[family-name:var(--font-mono)] text-[12px] text-peach dark:text-peach-dark">
              {game.number}/
            </span>
            {/* inline text-shadow:none keeps the pre-h2 appearance — globals.css shadows all h2 */}
            <h2
              className="font-[family-name:var(--font-display)] text-lg text-ink dark:text-night-text"
              style={{ textShadow: "none" }}
            >
              {game.title}
            </h2>
          </div>

          <p className="text-[13px] text-ink-subtle dark:text-night-muted mb-3">
            {game.description}
          </p>

          <div className="flex gap-2 flex-wrap">
            <span className={`${styles.bg} ${styles.border} border text-[12px] px-2.5 py-0.5 rounded-full
              font-[family-name:var(--font-mono)] ${styles.text}`}>
              Playable
            </span>
            {inProgress && (
              <span className="bg-peach/10 dark:bg-peach-dark/12 border-peach/25 dark:border-peach-dark/25
                border text-[12px] px-2.5 py-0.5 rounded-full
                font-[family-name:var(--font-mono)] text-ink dark:text-night-text/80">
                In progress
              </span>
            )}
          </div>
        </div>
      </Link>
    </div>
  )
}
```

- [ ] **Step 5: Create the index page**

`app/games/page.tsx`:

```tsx
// app/games/page.tsx
// Deliberately unlisted: robots noindex, no sitemap entry, no nav pill.
// Anyone with the link plays; search engines that stumble on it don't index.
import type { Metadata } from 'next'
import { GAMES } from '@/lib/games/games'
import { GameCard } from '@/components/games/game-card'
import { PageTransition } from '@/components/page-transition'

export const metadata: Metadata = {
  title: 'Games — Hand-Built & Ad-Free',
  description: 'A small collection of hand-built, ad-free browser games.',
  robots: { index: false },
}

// Drawn sudoku-grid motif in the learn-index illustration style: solid
// strokes carry draw-stroke (+pathLength) so they draw when the card's
// is-drawn container reveals.
function SudokuIllustration() {
  return (
    <svg width="80" height="64" viewBox="0 0 80 64" aria-hidden="true" focusable="false">
      <rect x="13" y="5" width="54" height="54" rx="2" fill="none" stroke="currentColor" strokeWidth="2"
        className="text-sapphire dark:text-sapphire-dark draw-stroke" pathLength={100} />
      <line x1="31" y1="5" x2="31" y2="59" stroke="currentColor" strokeWidth="1.5"
        className="text-sapphire dark:text-sapphire-dark draw-stroke" pathLength={100} style={{ animationDelay: '150ms' }} />
      <line x1="49" y1="5" x2="49" y2="59" stroke="currentColor" strokeWidth="1.5"
        className="text-sapphire dark:text-sapphire-dark draw-stroke" pathLength={100} style={{ animationDelay: '220ms' }} />
      <line x1="13" y1="23" x2="67" y2="23" stroke="currentColor" strokeWidth="1.5"
        className="text-sapphire dark:text-sapphire-dark draw-stroke" pathLength={100} style={{ animationDelay: '290ms' }} />
      <line x1="13" y1="41" x2="67" y2="41" stroke="currentColor" strokeWidth="1.5"
        className="text-sapphire dark:text-sapphire-dark draw-stroke" pathLength={100} style={{ animationDelay: '360ms' }} />
      <circle cx="40" cy="32" r="3.5" className="fill-peach dark:fill-peach-dark" />
      <circle cx="22" cy="14" r="3.5" className="fill-mauve dark:fill-mauve-dark" opacity="0.7" />
      <circle cx="58" cy="50" r="3.5" className="fill-lavender dark:fill-lavender-dark" opacity="0.7" />
    </svg>
  )
}

const ILLUSTRATIONS: Record<string, React.ReactNode> = {
  sudoku: <SudokuIllustration />,
}

export default function GamesPage() {
  return (
    <PageTransition>
      <section className="pt-16 pb-24 mx-auto max-w-5xl px-6 sm:px-10 lg:px-12">
        <header className="mb-12">
          <p className="font-[family-name:var(--font-mono)] text-[13px] tracking-[0.3em] uppercase
            text-ink-subtle dark:text-night-muted mb-4">
            <span className="text-peach dark:text-peach-dark">fig. 00</span>
            <span className="mx-2 text-cream-border dark:text-night-border">·</span>
            0 ads · 0 tracking · 0 accounts
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl
            text-ink dark:text-night-text mb-4">
            Games
          </h1>
          <p className="max-w-xl text-[15px] leading-relaxed text-ink-subtle dark:text-night-muted">
            Hand-built browser games with nothing to sit through and nothing to buy.
            Made for my mom, who deserves to place a number without watching a
            15-second ad first.
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {GAMES.map((game, i) => (
            <GameCard key={game.slug} game={game} index={i} illustration={ILLUSTRATIONS[game.slug]} />
          ))}
        </div>

        <p className="mt-10 font-[family-name:var(--font-mono)] text-[12px]
          text-ink-subtle dark:text-night-muted">
          more games in the works —
        </p>
      </section>
    </PageTransition>
  )
}
```

- [ ] **Step 6: Create the OG image**

`app/games/opengraph-image.tsx` (learn OG pattern; Next's OG cascade also serves this for `/games/sudoku` unfurls — that's why it exists despite noindex: the link should look good texted to mom). Satori gotchas: every text node a single template string, ornaments drawn as divs (no ◆ glyph):

```tsx
// app/games/opengraph-image.tsx
import { ImageResponse } from 'next/og'

export const alt = 'Games — Hand-Built & Ad-Free'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

async function loadFont(): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(
      'https://fonts.gstatic.com/s/dmserifdisplay/v17/-nFnOHM81r4j6k0gjAW3mujVU2B2K_c.ttf'
    )
    if (!res.ok) return null
    return res.arrayBuffer()
  } catch {
    return null
  }
}

export default async function Image() {
  const fontData = await loadFont()

  // 3×3 grid motif — two accent cells, drawn with plain bordered divs
  const cells = Array.from({ length: 9 }, (_, i) => i)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1e1e2e',
          fontFamily: 'DM Serif',
        }}
      >
        <div
          style={{
            fontSize: 16,
            color: '#74c7ec',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            fontFamily: 'monospace',
            marginBottom: 28,
          }}
        >
          0 ads · 0 tracking
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            width: 132,
            height: 132,
            marginBottom: 36,
            border: '3px solid #74c7ec',
            borderRadius: 6,
          }}
        >
          {cells.map((i) => (
            <div
              key={i}
              style={{
                width: 42,
                height: 42,
                border: '1px solid #313244',
                backgroundColor: i === 4 ? '#fab387' : i === 2 ? '#cba6f7' : 'transparent',
              }}
            />
          ))}
        </div>

        <div style={{ fontSize: 72, color: '#cdd6f4', lineHeight: 1.1, textAlign: 'center' }}>
          Games
        </div>

        <div
          style={{
            fontSize: 24,
            color: '#a6adc8',
            marginTop: 20,
            fontFamily: 'sans-serif',
            letterSpacing: '0.02em',
          }}
        >
          Amir Abdur-Rahim
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fontData
        ? [{ name: 'DM Serif', data: fontData, style: 'normal' as const, weight: 400 as const }]
        : [],
    }
  )
}
```

- [ ] **Step 7: Verify — build + suite + lint**

Run: `npm run build && npm test -- --run && npm run lint`
Expected: build succeeds with `/games` in the route list; all tests pass; no new lint errors. (The build is the real check here — page/OG/token wiring has no unit test.)

- [ ] **Step 8: Commit**

```bash
git add lib/games/games.ts components/games/game-card.tsx app/games/page.tsx app/games/opengraph-image.tsx app/globals.css components/living-field.tsx
git commit -m "feat: /games index — metadata-driven, unlisted, Living Ledger card grid

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Sudoku board + number pad + minimal playable container (TDD)

**Files:**
- Create: `components/games/sudoku/board.tsx`
- Create: `components/games/sudoku/number-pad.tsx`
- Create: `components/games/sudoku/sudoku.tsx`
- Test: `components/games/sudoku/sudoku.test.tsx`

**Interfaces:**
- Consumes: everything from `@/lib/games/sudoku/engine` (Task 1), `SUDOKU_PUZZLES` (Task 2).
- Produces:
  - `Board` props: `{ cells: Cell[]; selected: number | null; mistakeSet: Set<number>; onSelect: (i: number) => void; onKeyDigit: (d: number) => void; onKeyErase: () => void; onKeyToggleNotes: () => void; onKeyUndo: () => void }`
  - `NumberPad` props: `{ notesMode: boolean; canUndo: boolean; onDigit: (d: number) => void; onErase: () => void; onUndo: () => void; onToggleNotes: () => void; onNewGame: () => void }`
  - `export function Sudoku()` from `components/games/sudoku/sudoku.tsx` — the component Task 8 registers.
- **Scope note:** in this task the container starts a fixed puzzle (`newGame(SUDOKU_PUZZLES[0])`) with `showMistakes` hardcoded true and `notesMode` local state. Task 6 adds notes/erase/undo/mistakes-toggle behavior wiring; Task 7 replaces the fixed start with storage-based init and adds panels/timer/header. `NumberPad` is built COMPLETE here (all buttons render; `onNewGame` is a no-op until Task 7).

- [ ] **Step 1: Write the failing tests**

`components/games/sudoku/sudoku.test.tsx`:

```tsx
/**
 * RTL tests for the Sudoku container (board + pad integration). All DOM —
 * no canvas. Storage-dependent behavior is tested in Task 7's additions;
 * here the container starts a fresh SUDOKU_PUZZLES[0] game.
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { Sudoku } from '@/components/games/sudoku/sudoku'
import { SUDOKU_PUZZLES } from '@/lib/games/sudoku-puzzles'

const puzzle = SUDOKU_PUZZLES[0]
const firstEmpty = puzzle.givens.indexOf('0')
const row = Math.floor(firstEmpty / 9) + 1
const col = (firstEmpty % 9) + 1
const correctDigit = Number(puzzle.solution[firstEmpty])
const wrongDigit = (correctDigit % 9) + 1 // any digit ≠ correct

afterEach(() => localStorage.clear())

function cellButton(r: number, c: number) {
  return screen.getByRole('gridcell', { name: new RegExp(`^Row ${r}, column ${c}(,|$)`) })
}

it('renders 81 gridcells with given/empty labels', () => {
  render(<Sudoku />)
  expect(screen.getAllByRole('gridcell')).toHaveLength(81)
  expect(cellButton(row, col)).toHaveAccessibleName(`Row ${row}, column ${col}, empty`)
})

it('tap cell then tap pad digit places the digit', () => {
  render(<Sudoku />)
  fireEvent.click(cellButton(row, col))
  fireEvent.click(screen.getByRole('button', { name: `Enter ${correctDigit}` }))
  expect(cellButton(row, col)).toHaveAccessibleName(`Row ${row}, column ${col}, ${correctDigit}`)
})

it('flags a wrong digit as incorrect (showMistakes default on)', () => {
  render(<Sudoku />)
  fireEvent.click(cellButton(row, col))
  fireEvent.click(screen.getByRole('button', { name: `Enter ${wrongDigit}` }))
  expect(cellButton(row, col).getAttribute('aria-label')).toContain('incorrect')
})

it('keyboard: arrows move selection, digit keys place values', () => {
  render(<Sudoku />)
  const grid = screen.getByRole('grid')
  fireEvent.click(cellButton(row, col))
  fireEvent.keyDown(grid, { key: String(correctDigit) })
  expect(cellButton(row, col)).toHaveAccessibleName(`Row ${row}, column ${col}, ${correctDigit}`)
  // ArrowRight moves selection right (or stays at col 9 edge)
  fireEvent.keyDown(grid, { key: 'ArrowRight' })
  const nextCol = col === 9 ? col : col + 1
  expect(cellButton(row, nextCol).getAttribute('tabindex')).toBe('0')
})

it('digit taps with no cell selected do nothing', () => {
  render(<Sudoku />)
  fireEvent.click(screen.getByRole('button', { name: 'Enter 5' }))
  expect(screen.getAllByRole('gridcell')).toHaveLength(81) // no crash, board intact
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run components/games/sudoku/sudoku.test.tsx`
Expected: FAIL — cannot resolve `@/components/games/sudoku/sudoku`.

- [ ] **Step 3: Write Board**

`components/games/sudoku/board.tsx`:

```tsx
"use client"

import React, { useRef } from "react"
import { peers, type Cell } from "@/lib/games/sudoku/engine"

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

interface BoardProps {
  cells: Cell[]
  selected: number | null
  mistakeSet: Set<number>
  onSelect: (index: number) => void
  onKeyDigit: (digit: number) => void
  onKeyErase: () => void
  onKeyToggleNotes: () => void
  onKeyUndo: () => void
}

function cellLabel(i: number, cell: Cell, mistake: boolean): string {
  const base = `Row ${Math.floor(i / 9) + 1}, column ${(i % 9) + 1}`
  if (cell.value !== 0) {
    const flags = [cell.given ? "given" : "", mistake ? "incorrect" : ""].filter(Boolean)
    return flags.length ? `${base}, ${cell.value}, ${flags.join(", ")}` : `${base}, ${cell.value}`
  }
  if (cell.notes !== 0) {
    const ns = DIGITS.filter((d) => cell.notes & (1 << (d - 1)))
    return `${base}, empty, notes ${ns.join(" ")}`
  }
  return `${base}, empty`
}

// Hairline cell borders + heavier 3×3 box separators, ledger style.
function cellBorders(i: number): string {
  const r = Math.floor(i / 9)
  const c = i % 9
  const cls: string[] = []
  if (c < 8)
    cls.push(
      c % 3 === 2
        ? "border-r-2 border-r-ink/50 dark:border-r-night-text/40"
        : "border-r border-r-cream-border dark:border-r-night-border"
    )
  if (r < 8)
    cls.push(
      r % 3 === 2
        ? "border-b-2 border-b-ink/50 dark:border-b-night-text/40"
        : "border-b border-b-cream-border dark:border-b-night-border"
    )
  return cls.join(" ")
}

// Hover highlight is a desktop enhancement — pointer-fine only, and only on
// cells that carry no computed highlight (two bg utilities on one element
// would have unpredictable cascade order).
const HOVER = "pointer-fine:hover:bg-mauve/10 dark:pointer-fine:hover:bg-mauve-dark/10"

export function Board({
  cells, selected, mistakeSet, onSelect, onKeyDigit, onKeyErase, onKeyToggleNotes, onKeyUndo,
}: BoardProps) {
  const cellRefs = useRef<(HTMLButtonElement | null)[]>([])

  const move = (to: number) => {
    onSelect(to)
    cellRefs.current[to]?.focus()
  }

  // Desktop keyboard layer — arrows move selection+focus together (roving
  // tabindex), digits enter, Backspace/Delete/0 erase, N notes, Z undo.
  const onKeyDown = (e: React.KeyboardEvent) => {
    const sel = selected ?? 0
    let handled = true
    if (e.key === "ArrowLeft") move(sel % 9 === 0 ? sel : sel - 1)
    else if (e.key === "ArrowRight") move(sel % 9 === 8 ? sel : sel + 1)
    else if (e.key === "ArrowUp") move(sel < 9 ? sel : sel - 9)
    else if (e.key === "ArrowDown") move(sel > 71 ? sel : sel + 9)
    else if (e.key >= "1" && e.key <= "9") onKeyDigit(Number(e.key))
    else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") onKeyErase()
    else if (e.key === "n" || e.key === "N") onKeyToggleNotes()
    else if (e.key === "z" || e.key === "Z") onKeyUndo()
    else handled = false
    if (handled) e.preventDefault()
  }

  const selCell = selected !== null ? cells[selected] : null
  const selValue = selCell && selCell.value !== 0 ? selCell.value : 0
  const peerSet = selected !== null ? new Set(peers(selected)) : null

  return (
    <div
      role="grid"
      aria-label="Sudoku board"
      onKeyDown={onKeyDown}
      className="grid grid-rows-9 w-full aspect-square select-none rounded-sm overflow-hidden
        border-2 border-ink/50 dark:border-night-text/40 bg-white dark:bg-night-card"
    >
      {Array.from({ length: 9 }, (_, r) => (
        <div key={r} role="row" className="grid grid-cols-9">
          {Array.from({ length: 9 }, (_, c) => {
            const i = r * 9 + c
            const cell = cells[i]
            const mistake = mistakeSet.has(i)
            // Background priority: mistake > selected > same value > peer
            const bg = mistake
              ? "bg-red/10 dark:bg-red-dark/15"
              : i === selected
                ? "bg-mauve/20 dark:bg-mauve-dark/25"
                : selValue !== 0 && cell.value === selValue
                  ? "bg-sapphire/15 dark:bg-sapphire-dark/20"
                  : peerSet?.has(i)
                    ? "bg-mauve/5 dark:bg-mauve-dark/10"
                    : ""
            const text = mistake
              ? "text-red dark:text-red-dark"
              : cell.given
                ? "text-ink dark:text-night-text font-semibold"
                : "text-mauve dark:text-mauve-dark"
            return (
              <button
                key={i}
                ref={(el) => { cellRefs.current[i] = el }}
                type="button"
                role="gridcell"
                aria-label={cellLabel(i, cell, mistake)}
                aria-selected={i === selected || undefined}
                tabIndex={i === (selected ?? 0) ? 0 : -1}
                onClick={() => onSelect(i)}
                className={`relative flex items-center justify-center transition-colors
                  ${cellBorders(i)} ${bg || HOVER} ${text}`}
              >
                {cell.value !== 0 && (
                  <span className="text-xl sm:text-2xl leading-none">{cell.value}</span>
                )}
                {cell.value === 0 && cell.notes !== 0 && (
                  /* Pencil notes — sub-12px only below 375px viewports
                     (documented spec deviation: optional user annotations) */
                  <span
                    aria-hidden="true"
                    className="absolute inset-0.5 grid grid-cols-3 place-items-center
                      font-[family-name:var(--font-mono)] text-[9px] sm:text-[11px] leading-none
                      text-ink-subtle dark:text-night-muted"
                  >
                    {DIGITS.map((d) => (
                      <span key={d}>{cell.notes & (1 << (d - 1)) ? d : ""}</span>
                    ))}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Write NumberPad**

`components/games/sudoku/number-pad.tsx`:

```tsx
"use client"

import React from "react"

interface NumberPadProps {
  notesMode: boolean
  canUndo: boolean
  onDigit: (digit: number) => void
  onErase: () => void
  onUndo: () => void
  onToggleNotes: () => void
  onNewGame: () => void
}

// Two rows of five digit keys + a controls row. This layout (not a 3×3 pad)
// is what fits board + pad in one viewport on 568px-tall phones; every key
// is ≥44px in the thumb axis (h-12 = 48px, ≥51px wide at 320px).
const KEY =
  "h-12 rounded-lg border border-cream-border dark:border-night-border bg-white dark:bg-night-card " +
  "text-ink dark:text-night-text hover:border-mauve/50 dark:hover:border-mauve-dark/50 " +
  "active:bg-mauve/10 dark:active:bg-mauve-dark/15 transition-colors"

const CONTROL =
  "h-12 rounded-lg border text-[13px] font-[family-name:var(--font-mono)] tracking-wide transition-colors"

export function NumberPad({
  notesMode, canUndo, onDigit, onErase, onUndo, onToggleNotes, onNewGame,
}: NumberPadProps) {
  return (
    <div className="w-full flex flex-col gap-2">
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((d) => (
          <button key={d} type="button" aria-label={`Enter ${d}`} onClick={() => onDigit(d)}
            className={`${KEY} text-xl`}>
            {d}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-2">
        {[6, 7, 8, 9].map((d) => (
          <button key={d} type="button" aria-label={`Enter ${d}`} onClick={() => onDigit(d)}
            className={`${KEY} text-xl`}>
            {d}
          </button>
        ))}
        <button type="button" aria-label="Erase" onClick={onErase} className={KEY}>
          <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            className="h-5 w-5 mx-auto">
            <path d="M9 5h11a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H9L3 12l6-7z" />
            <path d="M12 9.5l5 5M17 9.5l-5 5" />
          </svg>
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          aria-pressed={notesMode}
          onClick={onToggleNotes}
          className={`${CONTROL} ${
            notesMode
              ? "bg-mauve/10 dark:bg-mauve-dark/12 border-mauve/40 dark:border-mauve-dark/40 text-mauve dark:text-mauve-dark"
              : "border-cream-border dark:border-night-border text-ink-subtle dark:text-night-muted hover:border-mauve/40 dark:hover:border-mauve-dark/40"
          }`}
        >
          Notes
        </button>
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className={`${CONTROL} border-cream-border dark:border-night-border
            text-ink-subtle dark:text-night-muted
            hover:border-mauve/40 dark:hover:border-mauve-dark/40
            disabled:opacity-40 disabled:hover:border-cream-border dark:disabled:hover:border-night-border`}
        >
          Undo
        </button>
        <button
          type="button"
          onClick={onNewGame}
          className={`${CONTROL} border-cream-border dark:border-night-border
            text-ink-subtle dark:text-night-muted
            hover:border-peach/50 dark:hover:border-peach-dark/50`}
        >
          New game
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Write the minimal container**

`components/games/sudoku/sudoku.tsx` (Task 7 rewires init/persistence — the structure anticipates it):

```tsx
"use client"

import React, { useMemo, useState } from "react"
import {
  newGame, setValue, toggleNote, eraseCell, undo, mistakes, isSolved,
  type BoardState,
} from "@/lib/games/sudoku/engine"
import { SUDOKU_PUZZLES } from "@/lib/games/sudoku-puzzles"
import { Board } from "./board"
import { NumberPad } from "./number-pad"

export function Sudoku() {
  const [board, setBoard] = useState<BoardState>(() => newGame(SUDOKU_PUZZLES[0]))
  const [selected, setSelected] = useState<number | null>(null)
  const [notesMode, setNotesMode] = useState(false)
  const [status, setStatus] = useState("")

  const solved = isSolved(board)
  const showMistakes = true // Task 7 makes this a persisted setting
  const mistakeSet = useMemo(
    () => new Set(showMistakes ? mistakes(board) : []),
    [board, showMistakes]
  )

  const handleDigit = (d: number) => {
    if (selected === null || solved) return
    setBoard((b) => (notesMode ? toggleNote(b, selected, d) : setValue(b, selected, d)))
    const r = Math.floor(selected / 9) + 1
    const c = (selected % 9) + 1
    setStatus(
      notesMode ? `Toggled note ${d} in row ${r}, column ${c}` : `Placed ${d} in row ${r}, column ${c}`
    )
  }

  const handleErase = () => {
    if (selected === null || solved) return
    setBoard((b) => eraseCell(b, selected))
  }

  const handleUndo = () => {
    setBoard((b) => undo(b))
    setStatus("Undid last move")
  }

  const handleToggleNotes = () => {
    setNotesMode((m) => {
      setStatus(m ? "Notes mode off" : "Notes mode on")
      return !m
    })
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-10 lg:px-12">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-center gap-6 lg:gap-10">
        <div className="w-full max-w-[420px] sm:max-w-[480px] mx-auto lg:mx-0">
          <Board
            cells={board.cells}
            selected={selected}
            mistakeSet={mistakeSet}
            onSelect={setSelected}
            onKeyDigit={handleDigit}
            onKeyErase={handleErase}
            onKeyToggleNotes={handleToggleNotes}
            onKeyUndo={handleUndo}
          />
        </div>
        <div className="w-full max-w-[420px] mx-auto lg:mx-0 lg:w-[300px] lg:shrink-0">
          <NumberPad
            notesMode={notesMode}
            canUndo={board.history.length > 0}
            onDigit={handleDigit}
            onErase={handleErase}
            onUndo={handleUndo}
            onToggleNotes={handleToggleNotes}
            onNewGame={() => {}}
          />
        </div>
      </div>
      <div role="status" className="sr-only">{status}</div>
    </div>
  )
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run components/games/sudoku/sudoku.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/games/sudoku/
git commit -m "feat: sudoku board + number pad — tap-first play with keyboard layer

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Notes, erase, undo, mistakes toggle (TDD)

**Files:**
- Modify: `components/games/sudoku/sudoku.tsx`
- Test: append to `components/games/sudoku/sudoku.test.tsx`

**Interfaces:**
- Consumes: Task 5's container (all handler wiring already exists — this task adds the mistakes toggle UI and verifies the notes/erase/undo flows end-to-end).
- Produces: a "Show mistakes" toggle button (`aria-pressed`, local state here; Task 7 persists it) rendered under the pad.

- [ ] **Step 1: Write the failing tests (append to sudoku.test.tsx)**

```tsx
describe('notes, erase, undo, mistakes toggle', () => {
  it('notes mode places pencil marks instead of values', () => {
    render(<Sudoku />)
    fireEvent.click(screen.getByRole('button', { name: 'Notes' }))
    expect(screen.getByRole('button', { name: 'Notes' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(cellButton(row, col))
    fireEvent.click(screen.getByRole('button', { name: `Enter ${correctDigit}` }))
    expect(cellButton(row, col)).toHaveAccessibleName(
      `Row ${row}, column ${col}, empty, notes ${correctDigit}`
    )
  })

  it('erase clears a placed value', () => {
    render(<Sudoku />)
    fireEvent.click(cellButton(row, col))
    fireEvent.click(screen.getByRole('button', { name: `Enter ${correctDigit}` }))
    fireEvent.click(screen.getByRole('button', { name: 'Erase' }))
    expect(cellButton(row, col)).toHaveAccessibleName(`Row ${row}, column ${col}, empty`)
  })

  it('undo is disabled until a move exists, then reverts the move', () => {
    render(<Sudoku />)
    const undoBtn = screen.getByRole('button', { name: 'Undo' })
    expect(undoBtn).toBeDisabled()
    fireEvent.click(cellButton(row, col))
    fireEvent.click(screen.getByRole('button', { name: `Enter ${correctDigit}` }))
    expect(undoBtn).toBeEnabled()
    fireEvent.click(undoBtn)
    expect(cellButton(row, col)).toHaveAccessibleName(`Row ${row}, column ${col}, empty`)
  })

  it('turning Show mistakes off removes the incorrect flag', () => {
    render(<Sudoku />)
    fireEvent.click(cellButton(row, col))
    fireEvent.click(screen.getByRole('button', { name: `Enter ${wrongDigit}` }))
    expect(cellButton(row, col).getAttribute('aria-label')).toContain('incorrect')
    fireEvent.click(screen.getByRole('button', { name: 'Show mistakes' }))
    expect(cellButton(row, col).getAttribute('aria-label')).not.toContain('incorrect')
  })
})
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx vitest run components/games/sudoku/sudoku.test.tsx`
Expected: the notes/erase/undo tests may already pass (wired in Task 5); the "Show mistakes" test FAILS — no such button.

- [ ] **Step 3: Add the mistakes toggle**

In `sudoku.tsx`, replace `const showMistakes = true` with state:

```tsx
const [showMistakes, setShowMistakes] = useState(true) // Task 7 persists this
```

Below the `<NumberPad …/>` element (inside the pad's column div), add:

```tsx
<button
  type="button"
  aria-pressed={showMistakes}
  onClick={() => setShowMistakes((v) => !v)}
  className="mt-3 inline-flex items-center gap-2 text-[13px]
    font-[family-name:var(--font-mono)] tracking-wide
    text-ink-subtle dark:text-night-muted
    hover:text-ink dark:hover:text-night-text transition-colors py-3"
>
  <span
    aria-hidden="true"
    className={`inline-block h-2 w-2 rounded-full transition-colors ${
      showMistakes ? "bg-red dark:bg-red-dark" : "bg-cream-border dark:bg-night-border"
    }`}
  />
  Show mistakes
</button>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run components/games/sudoku/sudoku.test.tsx`
Expected: PASS (all, including Task 5's).

- [ ] **Step 5: Commit**

```bash
git add components/games/sudoku/
git commit -m "feat: sudoku mistakes toggle + verified notes/erase/undo flows

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Persistence, timer, new-game panel, completion (TDD)

**Files:**
- Modify: `components/games/sudoku/sudoku.tsx` (major rework of init + new UI)
- Test: append to `components/games/sudoku/sudoku.test.tsx`

**Interfaces:**
- Consumes: `restoreGame`, `pickPuzzle`, `serialize`, `formatElapsed`, `type Difficulty` from engine; `loadProgress`, `saveProgress`, `defaultProgress`, `type SudokuSettings` from storage; `SparkRule` from `@/components/spark-rule`; `ACCENT_STYLES` from `@/lib/styles`.
- Produces: the finished `Sudoku` component — header block, difficulty-aware new-game panel, solved panel, autosave, resume, quiet elapsed timer.

**Behavior being built (from the spec):**
1. **Init:** lazy initializer loads saved progress; valid `puzzleId` found in the bank → `restoreGame` silently. Otherwise auto-start a random easy puzzle (first visit = zero friction; a saved `usedIds`/`settings` survives even when the puzzle doesn't).
2. **Autosave:** every state change writes `{puzzleId, values, notes, elapsedSeconds, usedIds, settings}` through `saveProgress`.
3. **Timer:** 1s interval, skips ticks while `document.hidden`, stops when solved. Shown ONLY in the solved panel.
4. **New game:** pad button opens an inline panel — difficulty pills (easy=sapphire, medium=peach, hard=mauve) + Cancel; a warning line ("This abandons your current puzzle.") appears only when moves exist and the board isn't solved. Picking a difficulty calls `pickPuzzle`, resets board/elapsed/selection.
5. **Completion:** when `isSolved` flips true → solved panel: SparkRule flourish, "Solved", `solved in {formatElapsed(elapsed)} · {difficulty}`, "New puzzle" button (opens the new-game panel).
6. **Header:** condensed title row — `01/ Sudoku`, mono annotation `fig. 01 · {difficulty} · {givensCount} given`.

- [ ] **Step 1: Write the failing tests (append to sudoku.test.tsx)**

Add imports at the top of the test file:

```tsx
import { act } from '@testing-library/react'
import { STORAGE_KEY } from '@/lib/games/sudoku/storage'
```

```tsx
describe('persistence, timer, panels', () => {
  function seedProgress(overrides: Record<string, unknown> = {}) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      puzzleId: puzzle.id,
      values: puzzle.givens,
      notes: Array(81).fill(0),
      elapsedSeconds: 0,
      usedIds: [puzzle.id],
      settings: { showMistakes: true },
      ...overrides,
    }))
  }

  it('resumes a saved board silently', () => {
    const values = puzzle.givens.slice(0, firstEmpty) + String(correctDigit) + puzzle.givens.slice(firstEmpty + 1)
    seedProgress({ values })
    render(<Sudoku />)
    expect(cellButton(row, col)).toHaveAccessibleName(`Row ${row}, column ${col}, ${correctDigit}`)
  })

  it('autosaves each move to localStorage', () => {
    seedProgress()
    render(<Sudoku />)
    fireEvent.click(cellButton(row, col))
    fireEvent.click(screen.getByRole('button', { name: `Enter ${correctDigit}` }))
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(saved.values[firstEmpty]).toBe(String(correctDigit))
  })

  it('persists the Show mistakes setting', () => {
    seedProgress()
    render(<Sudoku />)
    fireEvent.click(screen.getByRole('button', { name: 'Show mistakes' }))
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(saved.settings.showMistakes).toBe(false)
  })

  it('new game panel: difficulty pick resets the board and closes the panel', () => {
    seedProgress()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    render(<Sudoku />)
    fireEvent.click(screen.getByRole('button', { name: 'New game' }))
    fireEvent.click(screen.getByRole('button', { name: 'easy' }))
    expect(screen.queryByRole('button', { name: 'easy' })).toBeNull() // panel closed
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(saved.elapsedSeconds).toBe(0)
    expect(saved.puzzleId).toMatch(/^e/)
  })

  it('solving the last cell shows the completion panel with quiet elapsed time', () => {
    // all but the first empty cell already solved
    const values = puzzle.solution.slice(0, firstEmpty) + '0' + puzzle.solution.slice(firstEmpty + 1)
    seedProgress({ values, elapsedSeconds: 845 })
    render(<Sudoku />)
    fireEvent.click(cellButton(row, col))
    fireEvent.click(screen.getByRole('button', { name: `Enter ${correctDigit}` }))
    expect(screen.getByRole('heading', { name: 'Solved' })).toBeInTheDocument()
    expect(screen.getByText(`solved in 14 min · ${puzzle.difficulty}`)).toBeInTheDocument()
  })

  it('timer accrues while visible and lands in the autosave', () => {
    seedProgress()
    vi.useFakeTimers()
    render(<Sudoku />)
    act(() => { vi.advanceTimersByTime(65_000) })
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(saved.elapsedSeconds).toBe(65)
    vi.useRealTimers()
  })

  it('a full-but-wrong board shows a gentle nudge, no locations revealed', () => {
    const values = puzzle.solution.slice(0, firstEmpty) + '0' + puzzle.solution.slice(firstEmpty + 1)
    seedProgress({ values, settings: { showMistakes: false } })
    render(<Sudoku />)
    fireEvent.click(cellButton(row, col))
    fireEvent.click(screen.getByRole('button', { name: `Enter ${wrongDigit}` }))
    expect(screen.getByText("Something's not quite right yet.")).toBeInTheDocument()
    expect(cellButton(row, col).getAttribute('aria-label')).not.toContain('incorrect')
  })
})
```

Also add `vi.restoreAllMocks()` to the file's `afterEach`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run components/games/sudoku/sudoku.test.tsx`
Expected: new describe block FAILS (resume renders the fixed first puzzle, no panels exist).

- [ ] **Step 3: Rework the container**

Replace `components/games/sudoku/sudoku.tsx` wholesale:

```tsx
"use client"

import React, { useEffect, useMemo, useState } from "react"
import {
  newGame, restoreGame, setValue, toggleNote, eraseCell, undo, mistakes,
  isComplete, isSolved, serialize, pickPuzzle, formatElapsed,
  type BoardState, type Difficulty,
} from "@/lib/games/sudoku/engine"
import {
  loadProgress, saveProgress, type SudokuSettings,
} from "@/lib/games/sudoku/storage"
import { SUDOKU_PUZZLES } from "@/lib/games/sudoku-puzzles"
import { SparkRule } from "@/components/spark-rule"
import { Board } from "./board"
import { NumberPad } from "./number-pad"

type Panel = "none" | "new-game" | "solved"

interface InitState {
  board: BoardState
  elapsedSeconds: number
  usedIds: string[]
  settings: SudokuSettings
}

// Resume a saved puzzle when the save is valid and its puzzle exists in the
// bank; otherwise auto-start a random easy puzzle (first visit = zero
// friction). usedIds/settings survive even when the saved puzzle doesn't.
// Safe outside useEffect: this component is ssr:false (python.tsx precedent).
function initState(): InitState {
  const saved = loadProgress()
  if (saved?.puzzleId) {
    const puzzle = SUDOKU_PUZZLES.find((p) => p.id === saved.puzzleId)
    if (puzzle) {
      return {
        board: restoreGame(puzzle, saved.values, saved.notes),
        elapsedSeconds: saved.elapsedSeconds,
        usedIds: saved.usedIds,
        settings: saved.settings,
      }
    }
  }
  const { puzzle, usedIds } = pickPuzzle(SUDOKU_PUZZLES, "easy", saved?.usedIds ?? [])
  return {
    board: newGame(puzzle),
    elapsedSeconds: 0,
    usedIds,
    settings: saved?.settings ?? { showMistakes: true },
  }
}

const DIFFICULTY_STYLES: Record<Difficulty, string> = {
  easy: "border-sapphire/40 dark:border-sapphire-dark/40 bg-sapphire/10 dark:bg-sapphire-dark/12 hover:border-sapphire dark:hover:border-sapphire-dark",
  medium: "border-peach/40 dark:border-peach-dark/40 bg-peach/10 dark:bg-peach-dark/12 hover:border-peach dark:hover:border-peach-dark",
  hard: "border-mauve/40 dark:border-mauve-dark/40 bg-mauve/10 dark:bg-mauve-dark/12 hover:border-mauve dark:hover:border-mauve-dark",
}

export function Sudoku() {
  const [init] = useState(initState)
  const [board, setBoard] = useState(init.board)
  const [elapsed, setElapsed] = useState(init.elapsedSeconds)
  const [usedIds, setUsedIds] = useState(init.usedIds)
  const [settings, setSettings] = useState(init.settings)
  const [selected, setSelected] = useState<number | null>(null)
  const [notesMode, setNotesMode] = useState(false)
  const [panel, setPanel] = useState<Panel>("none")
  const [status, setStatus] = useState("")

  const solved = isSolved(board)
  const mistakeSet = useMemo(
    () => new Set(settings.showMistakes ? mistakes(board) : []),
    [board, settings.showMistakes]
  )
  const givensCount = useMemo(
    () => 81 - (board.puzzle.givens.match(/0/g)?.length ?? 0),
    [board.puzzle]
  )

  // Autosave — write-through on every state change (tiny payload)
  useEffect(() => {
    saveProgress({
      puzzleId: board.puzzle.id,
      ...serialize(board),
      elapsedSeconds: elapsed,
      usedIds,
      settings,
    })
  }, [board, elapsed, usedIds, settings])

  // Quiet timer — accrues while the tab is visible, stops once solved.
  // Never rendered during play; revealed only in the solved panel.
  useEffect(() => {
    if (solved) return
    const id = window.setInterval(() => {
      if (!document.hidden) setElapsed((e) => e + 1)
    }, 1000)
    return () => window.clearInterval(id)
  }, [solved, board.puzzle.id])

  useEffect(() => {
    if (solved) {
      setPanel("solved")
      setStatus("Puzzle solved")
    }
  }, [solved])

  const handleDigit = (d: number) => {
    if (selected === null || solved) return
    setBoard((b) => (notesMode ? toggleNote(b, selected, d) : setValue(b, selected, d)))
    const r = Math.floor(selected / 9) + 1
    const c = (selected % 9) + 1
    setStatus(
      notesMode ? `Toggled note ${d} in row ${r}, column ${c}` : `Placed ${d} in row ${r}, column ${c}`
    )
  }

  const handleErase = () => {
    if (selected === null || solved) return
    setBoard((b) => eraseCell(b, selected))
  }

  const handleUndo = () => {
    setBoard((b) => undo(b))
    setStatus("Undid last move")
  }

  const handleToggleNotes = () => {
    setNotesMode((m) => {
      setStatus(m ? "Notes mode off" : "Notes mode on")
      return !m
    })
  }

  const startNewGame = (difficulty: Difficulty) => {
    const { puzzle, usedIds: nextUsed } = pickPuzzle(SUDOKU_PUZZLES, difficulty, usedIds)
    setBoard(newGame(puzzle))
    setUsedIds(nextUsed)
    setElapsed(0)
    setSelected(null)
    setNotesMode(false)
    setPanel("none")
    setStatus(`New ${difficulty} puzzle`)
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-10 lg:px-12">
      {/* Condensed title row — one line so the whole play surface fits 100dvh on phones */}
      <header className="mb-4 flex items-baseline justify-between gap-3">
        <p className="flex items-baseline gap-1.5">
          <span className="font-[family-name:var(--font-mono)] text-[13px] text-peach dark:text-peach-dark">
            01/
          </span>
          <span
            className="font-[family-name:var(--font-display)] text-xl text-ink dark:text-night-text"
            style={{ textShadow: "none" }}
          >
            Sudoku
          </span>
        </p>
        <p className="font-[family-name:var(--font-mono)] text-[12px] text-ink-subtle dark:text-night-muted">
          fig. 01 · {board.puzzle.difficulty} · {givensCount} given
        </p>
      </header>

      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-center gap-6 lg:gap-10">
        <div className="w-full max-w-[420px] sm:max-w-[480px] mx-auto lg:mx-0">
          <Board
            cells={board.cells}
            selected={selected}
            mistakeSet={mistakeSet}
            onSelect={setSelected}
            onKeyDigit={handleDigit}
            onKeyErase={handleErase}
            onKeyToggleNotes={handleToggleNotes}
            onKeyUndo={handleUndo}
          />
          {/* With Show mistakes off there is no feedback until the board is
              full; a full-but-wrong board gets this nudge — no count, no
              locations (spec's mistake model) */}
          {isComplete(board) && !solved && (
            <p className="mt-3 text-center text-[13px] font-[family-name:var(--font-mono)]
              text-ink-subtle dark:text-night-muted">
              Something&apos;s not quite right yet.
            </p>
          )}
        </div>

        <div className="w-full max-w-[420px] mx-auto lg:mx-0 lg:w-[300px] lg:shrink-0">
          {panel === "solved" ? (
            <div className="rounded-xl border border-cream-border dark:border-night-border
              bg-white dark:bg-night-card p-6 text-center">
              <div className="flex justify-center mb-3">
                <SparkRule data={[2, 4, 3, 6, 5, 8, 9]} variant="line" visible
                  className="text-peach dark:text-peach-dark" />
              </div>
              <h2
                className="font-[family-name:var(--font-display)] text-2xl text-ink dark:text-night-text mb-2"
                style={{ textShadow: "none" }}
              >
                Solved
              </h2>
              <p className="font-[family-name:var(--font-mono)] text-[13px]
                text-ink-subtle dark:text-night-muted mb-5">
                solved in {formatElapsed(elapsed)} · {board.puzzle.difficulty}
              </p>
              <button
                type="button"
                onClick={() => setPanel("new-game")}
                className="btn-lift px-5 py-2.5 rounded-full text-[13px]
                  font-[family-name:var(--font-mono)] tracking-wide border
                  border-mauve/40 dark:border-mauve-dark/40 bg-mauve/10 dark:bg-mauve-dark/10
                  text-mauve dark:text-mauve-dark hover:border-mauve dark:hover:border-mauve-dark
                  transition-colors"
              >
                New puzzle
              </button>
            </div>
          ) : panel === "new-game" ? (
            <div className="rounded-xl border border-cream-border dark:border-night-border
              bg-white dark:bg-night-card p-4 flex flex-col gap-3">
              <p className="font-[family-name:var(--font-mono)] text-[13px] tracking-wide uppercase
                text-ink-subtle dark:text-night-muted">
                New game — pick a difficulty
              </p>
              {board.history.length > 0 && !solved && (
                <p className="text-[13px] text-red dark:text-red-dark">
                  This abandons your current puzzle.
                </p>
              )}
              <div className="grid grid-cols-3 gap-2">
                {(["easy", "medium", "hard"] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => startNewGame(d)}
                    className={`h-12 rounded-lg border text-[13px]
                      font-[family-name:var(--font-mono)] tracking-wide
                      text-ink dark:text-night-text/80 transition-colors ${DIFFICULTY_STYLES[d]}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setPanel("none")}
                className="h-11 rounded-lg text-[13px] font-[family-name:var(--font-mono)]
                  text-ink-subtle dark:text-night-muted hover:text-ink dark:hover:text-night-text
                  transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <NumberPad
                notesMode={notesMode}
                canUndo={board.history.length > 0}
                onDigit={handleDigit}
                onErase={handleErase}
                onUndo={handleUndo}
                onToggleNotes={handleToggleNotes}
                onNewGame={() => setPanel("new-game")}
              />
              <button
                type="button"
                aria-pressed={settings.showMistakes}
                onClick={() => setSettings((s) => ({ ...s, showMistakes: !s.showMistakes }))}
                className="mt-3 inline-flex items-center gap-2 text-[13px]
                  font-[family-name:var(--font-mono)] tracking-wide
                  text-ink-subtle dark:text-night-muted
                  hover:text-ink dark:hover:text-night-text transition-colors py-3"
              >
                <span
                  aria-hidden="true"
                  className={`inline-block h-2 w-2 rounded-full transition-colors ${
                    settings.showMistakes ? "bg-red dark:bg-red-dark" : "bg-cream-border dark:bg-night-border"
                  }`}
                />
                Show mistakes
              </button>
            </>
          )}
        </div>
      </div>
      <div role="status" className="sr-only">{status}</div>
    </div>
  )
}
```

Note: the new-game and solved panels REPLACE the pad in the right column (one column, no overlay juggling, nothing to trap focus behind). Tests from Tasks 5/6 that never open a panel are unaffected.

- [ ] **Step 4: Run the component tests**

Run: `npx vitest run components/games/sudoku/sudoku.test.tsx`
Expected: PASS — all of Tasks 5–7's tests. If Task 5/6 tests broke, the rework changed behavior it shouldn't have; fix the container, not the tests.

- [ ] **Step 5: Run the full suite**

Run: `npm test -- --run`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/games/sudoku/
git commit -m "feat: sudoku resume, autosave, quiet timer, new-game and solved panels

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: /games/[slug] route wiring

**Files:**
- Create: `components/games/game-error-boundary.tsx`
- Create: `components/games/dynamic-games.tsx`
- Create: `app/games/[slug]/page.tsx`

**Interfaces:**
- Consumes: `GAMES`, `getGame` (Task 4); `Sudoku` (Task 7); `PageTransition`.
- Produces: the live `/games/sudoku` route.

- [ ] **Step 1: Create the error boundary**

`components/games/game-error-boundary.tsx` — the ArtifactErrorBoundary pattern with games copy:

```tsx
'use client'

import React from 'react'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
}

// Deliberate thin duplicate of components/learn/artifact-error-boundary.tsx —
// the two sections' fallback copy diverges, and games should never import
// from learn.
export class GameErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Game error:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto max-w-5xl px-6 sm:px-10 lg:px-12 text-center py-20">
          <p
            className="font-[family-name:var(--font-mono)] text-[13px] tracking-[0.3em] uppercase mb-4
              text-peach dark:text-peach-dark"
          >
            Error
          </p>
          <h2
            className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl
              text-ink dark:text-night-text mb-4"
          >
            Something went wrong loading this game
          </h2>
          <p className="text-[15px] text-ink-subtle dark:text-night-muted mb-8">
            Your saved progress is safe — it lives in your browser.
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            className="btn-lift inline-flex items-center gap-2 px-5 py-2.5 rounded-full
              text-[13px] font-[family-name:var(--font-mono)] tracking-wide
              border border-mauve/40 dark:border-mauve-dark/40
              bg-mauve/10 dark:bg-mauve-dark/10
              text-mauve dark:text-mauve-dark
              hover:border-mauve dark:hover:border-mauve-dark
              transition-colors"
          >
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
```

- [ ] **Step 2: Create the dynamic wrapper**

`components/games/dynamic-games.tsx`:

```tsx
'use client'

import dynamic from 'next/dynamic'

// Sudoku is ssr: false because it restores saved progress from localStorage
// in a useState initializer (python.tsx precedent) — SSR would mismatch.
export const Sudoku = dynamic(
  () => import('./sudoku/sudoku').then((m) => ({ default: m.Sudoku })),
  { ssr: false }
)
```

- [ ] **Step 3: Create the route**

`app/games/[slug]/page.tsx`:

```tsx
// app/games/[slug]/page.tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { GAMES, getGame } from '@/lib/games/games'
import { GameErrorBoundary } from '@/components/games/game-error-boundary'
import { PageTransition } from '@/components/page-transition'
import { Sudoku } from '@/components/games/dynamic-games'

export function generateStaticParams() {
  return GAMES.map((g) => ({ slug: g.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const game = getGame(slug)
  if (!game) return {}
  return {
    title: `${game.title} — Games`,
    description: game.description,
    robots: { index: false },
  }
}

const GAME_COMPONENTS: Record<string, React.ComponentType> = {
  sudoku: Sudoku,
}

export default async function GamePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const game = getGame(slug)
  if (!game) notFound()

  const GameComponent = GAME_COMPONENTS[slug]

  return (
    <PageTransition>
      <article className="relative pt-8 pb-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-10 lg:px-12">
          <Link
            href="/games"
            className="inline-flex items-center gap-2 text-ink-subtle dark:text-night-muted
              hover:text-mauve dark:hover:text-mauve-dark transition-colors mb-6
              font-[family-name:var(--font-mono)] text-[12px] tracking-wide uppercase"
          >
            <svg
              aria-hidden="true"
              focusable="false"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3 w-3"
            >
              <path d="M10 6H2M5 9L2 6l3-3" />
            </svg>
            Back to Games
          </Link>
        </div>

        <GameErrorBoundary>
          <GameComponent />
        </GameErrorBoundary>
      </article>
    </PageTransition>
  )
}
```

- [ ] **Step 4: Verify — build + full suite**

Run: `npm run build && npm test -- --run`
Expected: build lists `/games` and `/games/[slug]` (● SSG with `/games/sudoku`); suite passes.

- [ ] **Step 5: Smoke-test in the browser**

Start the dev server (or reuse a running one) and check `http://localhost:3000/games` and `/games/sudoku`: card renders and links through; board + pad render; tap a cell, tap a digit; toggle dark mode. Fix anything broken before committing.

- [ ] **Step 6: Commit**

```bash
git add components/games/game-error-boundary.tsx components/games/dynamic-games.tsx app/games/
git commit -m "feat: /games/[slug] route — code-split sudoku behind error boundary

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: Playwright e2e

**Files:**
- Create: `e2e/games.spec.ts`

**Interfaces:**
- Consumes: the live routes from Task 8. Mirrors `e2e/learn.spec.ts`'s console-error-guard fixture.

- [ ] **Step 1: Write the spec**

`e2e/games.spec.ts`:

```ts
// E2E — /games index + sudoku play, resume, notes. Console-error guard
// mirrors e2e/learn.spec.ts (same filtered noise rationale).
// The mistakes-toggle behavior is covered by RTL, not here: asserting a
// wrong digit requires knowing the solution, which the RTL suite reads
// from the bank deterministically and a browser test cannot.
import { test as base, expect } from '@playwright/test'

const IGNORED_CONSOLE: RegExp[] = []

interface Fixtures {
  consoleErrors: string[]
}

const test = base.extend<Fixtures>({
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = []
      page.on('console', (msg) => {
        if (msg.type() !== 'error') return
        const text = msg.text()
        if (IGNORED_CONSOLE.some((re) => re.test(text))) return
        if (/favicon/i.test(text)) return
        if (/Failed to load resource: .*404/.test(text)) return
        errors.push(`console.error: ${text}`)
      })
      page.on('pageerror', (err) => {
        errors.push(`pageerror: ${err.message}`)
      })
      await use(errors)
      expect(errors, `Unexpected console/page errors:\n${errors.join('\n')}`).toEqual([])
    },
    { auto: true },
  ],
})

test('games index renders the sudoku card, noindexed', async ({ page }) => {
  await page.goto('/games')
  await expect(page.getByRole('heading', { name: 'Games' })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('heading', { name: 'Sudoku' })).toBeVisible()
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  // deliberately unlisted — no Games pill in the nav
  await expect(page.locator('nav').getByRole('link', { name: 'Games' })).toHaveCount(0)
})

test('sudoku: tap cell + tap digit places a value that survives reload', async ({ page }) => {
  await page.goto('/games/sudoku')
  const cells = page.locator('[role="gridcell"]')
  await expect(cells).toHaveCount(81, { timeout: 30_000 })

  const empty = page.locator('[role="gridcell"][aria-label$="empty"]').first()
  const label = await empty.getAttribute('aria-label') // "Row r, column c, empty"
  const prefix = label!.replace(/, empty$/, '')
  await empty.click()
  await page.getByRole('button', { name: 'Enter 4' }).click()

  const target = page.locator(`[role="gridcell"][aria-label^="${prefix}, 4"]`)
  await expect(target).toHaveCount(1)

  await page.reload()
  await expect(page.locator('[role="gridcell"]')).toHaveCount(81, { timeout: 30_000 })
  await expect(page.locator(`[role="gridcell"][aria-label^="${prefix}, 4"]`)).toHaveCount(1)
})

test('sudoku: notes mode places pencil marks', async ({ page }) => {
  await page.goto('/games/sudoku')
  await expect(page.locator('[role="gridcell"]')).toHaveCount(81, { timeout: 30_000 })

  await page.getByRole('button', { name: 'Notes' }).click()
  await expect(page.getByRole('button', { name: 'Notes' })).toHaveAttribute('aria-pressed', 'true')

  const empty = page.locator('[role="gridcell"][aria-label$="empty"]').first()
  await empty.click()
  await page.getByRole('button', { name: 'Enter 7' }).click()
  await expect(
    page.locator('[role="gridcell"][aria-label*="notes 7"]').first()
  ).toBeVisible()
})

test('sudoku: new game panel opens with three difficulties', async ({ page }) => {
  await page.goto('/games/sudoku')
  await expect(page.locator('[role="gridcell"]')).toHaveCount(81, { timeout: 30_000 })

  await page.getByRole('button', { name: 'New game' }).click()
  for (const d of ['easy', 'medium', 'hard']) {
    await expect(page.getByRole('button', { name: d, exact: true })).toBeVisible()
  }
})
```

Caveat for the reload test: it places digit 4 in the first empty cell of whatever puzzle the fresh browser context auto-started. If 4 happens to be wrong for that cell, the mistake tint shows — irrelevant here; the assertions only read labels.

- [ ] **Step 2: Run the e2e suite**

Run: `npm run test:e2e -- games.spec.ts`
Expected: PASS (dev server auto-starts). If a selector mismatches reality, fix the SPEC only if the app matches the plan's intent; fix the APP if it doesn't.

- [ ] **Step 3: Run the pre-existing e2e specs to catch regressions**

Run: `npm run test:e2e`
Expected: all specs pass.

- [ ] **Step 4: Commit**

```bash
git add e2e/games.spec.ts
git commit -m "test: e2e coverage for /games index and sudoku play/resume/notes

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 10: Manual verification, viewport tuning, docs, PR

**Files:**
- Modify: `components/games/sudoku/sudoku.tsx` (viewport-fit tuning only, if needed)
- Modify: `CLAUDE.md`

- [ ] **Step 1: Manual browser verification (dev server + real browser)**

Work through this checklist; fix and re-verify anything that fails (systematic-debugging skill if a fix isn't obvious):

1. **320px width:** at exactly 320px viewport, on `/games` and `/games/sudoku`, run `document.documentElement.scrollWidth === 320` in the console. Must be true (CLAUDE.md contract).
2. **Phone viewports — 390×844 FIRST (iPhone 13 Pro, the primary user's actual device), then 320×568 and 375×667 (SE floor):** board + pad visible without scrolling mid-play (small header scroll-away is OK; the play surface itself must fit). 390×844 must be comfortable, not merely fitting. If it doesn't fit, tighten the board's `max-w` (e.g. add `max-h`-aware sizing `max-w-[min(420px,calc(100dvh-19rem))]` on the board wrapper) and re-check — this is the expected tuning point.
3. **Tablet/desktop (1024px+):** board and pad side-by-side, both fully visible.
4. **Dark mode:** toggle on both pages — board tints, mistake red, notes, panels all legible. Check the red-on-red-tint mistake cells specifically in dark mode.
5. **Keyboard:** tab to the board, arrows move, digits place, N toggles notes, Z undoes, Backspace erases. Focus ring visible.
6. **Reduced motion (macOS: System Settings → Accessibility → Display → Reduce motion):** no entry animations; solved panel's SparkRule renders fully drawn.
7. **Nav:** on /games pages, no pill is active and the morphing indicator doesn't misbehave (404-page precedent — expect it hidden or parked; anything glitchy gets fixed).
8. **LivingField:** visibly faint on /games (compare with homepage density).
9. **OG image:** `curl -sI localhost:3000/games/opengraph-image | head -3` → 200, image/png.

- [ ] **Step 2: Full gate**

Run: `npm test -- --run && npm run lint && npm run build && npm run test:e2e`
Expected: everything green (2 known pre-existing lint errors only).

- [ ] **Step 3: Update CLAUDE.md**

Add to CLAUDE.md (match its voice; keep tight):
- Top summary line: add "+ unlisted /games (ad-free games)" to the site description sentence.
- **Key Patterns**, new bullet after the /work one: metadata-driven /games section — `lib/games/games.ts` single source of truth; unlisted (robots noindex on both pages, NO sitemap entries, no nav pill, deliberately absent from robots.txt); Sudoku 01: pure engine + storage in `lib/games/sudoku/` (unit-tested), component `ssr: false` via `components/games/dynamic-games.tsx`, committed 180-puzzle bank generated by `scripts/generate-sudoku-puzzles.mjs` (deterministic LCG, uniqueness asserted at generation — re-run only to change the bank, never hand-edit), localStorage `sudoku-progress-v1`, mistake highlighting uses the `--color-red`/`--color-red-dark` tokens added for it, routeProfile has an explicit faint `/games` entry.
- **Client components list:** add game-card, sudoku (board, number-pad), dynamic-games, game-error-boundary.
- **File Structure:** add the `app/games/`, `components/games/`, `lib/games/` entries and the generator script line.
- **Commands:** no new npm scripts (generator is `node scripts/generate-sudoku-puzzles.mjs`, documented in the pattern bullet).

- [ ] **Step 4: Commit docs + any tuning diffs**

```bash
git add CLAUDE.md components/games/sudoku/sudoku.tsx
git commit -m "docs: record the /games section patterns in CLAUDE.md

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

(Separate the tuning into its own `fix:` commit if Step 1 changed code.)

- [ ] **Step 5: Finish the branch**

Use the superpowers:finishing-a-development-branch skill: push `feat/games-sudoku`, open a PR titled "feat: unlisted /games section with Sudoku (01)" describing the spec/plan links, the unlisted-by-design choice, and the test coverage. PR body ends with the project's standard attribution footer.
