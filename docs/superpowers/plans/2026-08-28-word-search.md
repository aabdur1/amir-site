# Word Search (game 02) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Word Search as `/games/word-search` — themed committed puzzle bank, drag + tap-ends + keyboard selection, resume/timer/difficulty-pills parity with Sudoku.

**Architecture:** Mirrors the Sudoku build exactly (pure engine + validated storage in `lib/games/word-search/`, generated bank, ssr:false component registered via the games metadata). A small shared-module refactor first (`pickPuzzle`, `formatElapsed`, `DIFFICULTY_STYLES`, `GameSlug` union) so nothing is duplicated across games and the component registry becomes compile-time safe.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind 4, vitest + Testing Library (jsdom), Playwright. Zero new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-28-word-search-design.md` — governs anything this plan doesn't restate; its parent `2026-08-28-games-sudoku-design.md` (+ addendum) governs anything the word-search spec doesn't.

## Global Constraints

- Branch: `feat/games-word-search` (exists, spec committed).
- **No new npm dependencies. No CSP/header/sitemap/robots/nav changes** — the /games-wide rules already cover the new route (robots noindex comes from the [slug] route's existing `generateMetadata`).
- Storage key exactly `word-search-progress-v1`; reads only in lazy initializers (ssr:false component); every read/write try/catch; storage validates SHAPE only (no bank import); puzzle-consistency validation lives in the component's restore path.
- Touch targets ≥44px on all controls (grid letter cells exempt — contiguous grid, Sudoku ruling). Readable text ≥12px (grid letters are 15px+).
- Wrong guess = selection clears, NO error styling, no shake (spec decision).
- Reduced motion: no preview animation, tints instant, solved flourish static (SparkRule is covered by the sitewide CSS override).
- Both themes via existing token classes. No new color tokens (found tints reuse the five accents).
- Comment style: sparse, constraints only. All commits end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Known pre-existing lint errors: exactly 2 (interactive-headshot.tsx, masonry-grid.tsx). Suite baseline at plan time: 404 vitest tests, 22 e2e — all green; every task leaves them green.
- Difficulty config (exact): easy 8×8/8 words/directions E,S; medium 10×10/10 words/+SE,NE; hard 12×12/12 words/all 8. Bank ids `we01…we30`, `wm01…wm30`, `wh01…wh30` (90 puzzles).
- TDD wherever the deliverable is logic; the report must show RED then GREEN evidence.

---

### Task 1: Shared foundations refactor (behavior-preserving)

**Files:**
- Create: `lib/games/shared.ts`
- Modify: `lib/games/sudoku/engine.ts` (delete local `pickPuzzle` + `formatElapsed` bodies, re-export from shared)
- Modify: `lib/styles.ts` (add `DIFFICULTY_STYLES`)
- Modify: `components/games/sudoku/sudoku.tsx` (delete local `DIFFICULTY_STYLES`, import from `@/lib/styles`)
- Modify: `lib/games/games.ts` (add `GameSlug` union)
- Modify: `app/games/[slug]/page.tsx` (key `GAME_COMPONENTS` by `GameSlug`)

**Interfaces:**
- Consumes: current sudoku engine (`pickPuzzle(puzzles, difficulty, usedIds, rand)` returning `{ puzzle, usedIds }`, throws `` `No puzzles available for difficulty: ${difficulty}` `` on an empty pool; `formatElapsed(seconds)` → `"45 sec" | "14 min" | "1 hr 2 min"`).
- Produces (later tasks import these exact names):

```ts
// lib/games/shared.ts
export function pickPuzzle<T extends { id: string; difficulty: string }>(
  puzzles: T[], difficulty: T['difficulty'], usedIds: string[], rand?: () => number
): { puzzle: T; usedIds: string[] }
export function formatElapsed(seconds: number): string
// lib/styles.ts
export const DIFFICULTY_STYLES: Record<'easy' | 'medium' | 'hard', string>
// lib/games/games.ts
export type GameSlug = 'sudoku'          // 'word-search' joins in Task 8
```

- [ ] **Step 1: Create `lib/games/shared.ts`** — move the two functions VERBATIM from `lib/games/sudoku/engine.ts` (they are the `pickPuzzle` and `formatElapsed` at the bottom of that file), generalizing only `pickPuzzle`'s signature:

```ts
// Cross-game helpers. Each game's engine re-exports what it uses so game
// code never imports another game's engine.

// Random puzzle of a difficulty, avoiding already-played ids. When the
// difficulty is exhausted its used entries reset (other difficulties keep
// theirs). Returns the updated used list alongside the pick.
export function pickPuzzle<T extends { id: string; difficulty: string }>(
  puzzles: T[],
  difficulty: T['difficulty'],
  usedIds: string[],
  rand: () => number = Math.random
): { puzzle: T; usedIds: string[] } {
  const pool = puzzles.filter((p) => p.difficulty === difficulty)
  if (pool.length === 0) throw new Error(`No puzzles available for difficulty: ${difficulty}`)
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

(Copy the exact bodies from engine.ts — if they differ from the above in any detail, the ENGINE's committed version wins; the only intended change is the generic `<T>`.)

- [ ] **Step 2: Re-export from the sudoku engine.** In `lib/games/sudoku/engine.ts`, delete the `pickPuzzle` and `formatElapsed` function bodies and add at the bottom:

```ts
export { pickPuzzle, formatElapsed } from '../shared'
```

Every existing import site (`sudoku.tsx`, `engine.test.ts`) keeps compiling unchanged.

- [ ] **Step 3: Move `DIFFICULTY_STYLES`.** Cut the `DIFFICULTY_STYLES` const from `components/games/sudoku/sudoku.tsx` (it sits right above `export function Sudoku()`) and add it VERBATIM to `lib/styles.ts` below `ACCENT_STYLES`, typed `Record<'easy' | 'medium' | 'hard', string>` and exported. In `sudoku.tsx`, import it: `import { DIFFICULTY_STYLES } from "@/lib/styles"`.

- [ ] **Step 4: Add the `GameSlug` union.** In `lib/games/games.ts`:

```ts
// Adding a game: extend this union FIRST — Record<GameSlug, …> registries
// (GAME_COMPONENTS, the index ILLUSTRATIONS map) then fail to compile until
// every registry carries the new slug (the /work FIGURES precedent).
export type GameSlug = 'sudoku'
```

and change `Game`'s `slug: string` to `slug: GameSlug`. In `app/games/[slug]/page.tsx`, change `const GAME_COMPONENTS: Record<string, React.ComponentType>` to `Record<GameSlug, React.ComponentType>` (import the type), and change the lookup to use the narrowed game object: `const GameComponent = GAME_COMPONENTS[game.slug]` (after the `notFound()` guard `game` is defined and `game.slug` is `GameSlug`).

- [ ] **Step 5: Verify — full gate for a refactor**

Run: `npm test -- --run && npm run lint && npx tsc --noEmit`
Expected: 404/404 pass (zero behavior change), lint at the 2 known errors, tsc clean.

- [ ] **Step 6: Commit**

```bash
git add lib/games/shared.ts lib/games/sudoku/engine.ts lib/styles.ts components/games/sudoku/sudoku.tsx lib/games/games.ts app/games/[slug]/page.tsx
git commit -m "refactor: shared games helpers + compile-safe GameSlug registry

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Word-search engine (TDD)

**Files:**
- Create: `lib/games/word-search/engine.ts`
- Test: `lib/games/word-search/engine.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces (exact):

```ts
export type Difficulty = 'easy' | 'medium' | 'hard'
export interface WordPlacement { word: string; row: number; col: number; dRow: number; dCol: number }
export interface WordSearchPuzzle {
  id: string; difficulty: Difficulty; theme: string; size: number
  grid: string          // size*size chars, row-major, A-Z
  words: string[]       // uppercase targets
  placements: WordPlacement[]
}
export interface FoundWord { word: string; cells: number[] }
export function snapLine(size: number, anchor: number, current: number): number[] | null
export function lineBetween(size: number, a: number, b: number): number[] | null
export function readLine(grid: string, cells: number[]): string
export function attempt(puzzle: WordSearchPuzzle, found: FoundWord[], cells: number[] | null): FoundWord | null
export function isComplete(puzzle: WordSearchPuzzle, found: FoundWord[]): boolean
```

Semantics the tests pin down: `snapLine` snaps a drag to the nearest of 8 directions (vertical when `|dr| ≥ 2|dc|`, horizontal when `|dc| ≥ 2|dr|`, else diagonal; length = dominant delta, clamped at grid edges; `null` when anchor === current). `lineBetween` is EXACT — null unless the two cells are colinear in one of the 8 directions (used by tap-ends and keyboard). `attempt` reads the cells, matches forwards or backwards against UNFOUND targets, and returns the cells oriented so they spell the word forwards (reverse the cell order on a backward read).

- [ ] **Step 1: Write the failing tests**

`lib/games/word-search/engine.test.ts`:

```ts
/**
 * Tests for lib/games/word-search/engine.ts — pure selection geometry and
 * find bookkeeping. TEST_PUZZLE is a hand-built 5×5 with CAT (E), DOG (S),
 * SUN (SE) so every direction family is exercised without the generator.
 */
import {
  snapLine, lineBetween, readLine, attempt, isComplete,
  type WordSearchPuzzle,
} from '@/lib/games/word-search/engine'

// grid (5×5, row-major):
// C A T Q D
// X S X X O
// X X U X G
// X X X N X
// X X X X X
const TEST_PUZZLE: WordSearchPuzzle = {
  id: 'wt1', difficulty: 'easy', theme: 'Test', size: 5,
  grid: 'CATQD' + 'XSXXO' + 'XXUXG' + 'XXXNX' + 'XXXXX',
  words: ['CAT', 'DOG', 'SUN'],
  placements: [
    { word: 'CAT', row: 0, col: 0, dRow: 0, dCol: 1 },
    { word: 'DOG', row: 0, col: 4, dRow: 1, dCol: 0 },
    { word: 'SUN', row: 1, col: 1, dRow: 1, dCol: 1 },
  ],
}

describe('snapLine', () => {
  it('returns null when anchor === current', () => {
    expect(snapLine(5, 12, 12)).toBeNull()
  })

  it('follows exact horizontal, vertical, and diagonal drags', () => {
    expect(snapLine(5, 0, 2)).toEqual([0, 1, 2])        // E
    expect(snapLine(5, 4, 14)).toEqual([4, 9, 14])      // S
    expect(snapLine(5, 6, 18)).toEqual([6, 12, 18])     // SE
    expect(snapLine(5, 18, 6)).toEqual([18, 12, 6])     // NW (reverse drag)
  })

  it('snaps an off-axis drag to the dominant direction', () => {
    // from (0,0) to (0+1 row, 3 cols): |dc|=3 >= 2*|dr|=2 → horizontal, len 3
    expect(snapLine(5, 0, 8)).toEqual([0, 1, 2, 3])
    // from (0,0) to (2,3): neither dominates → diagonal SE, len 3
    expect(snapLine(5, 0, 13)).toEqual([0, 6, 12, 18])
  })

  it('clamps at the grid edge instead of wrapping', () => {
    // diagonal SE from (3,3): only (3,3)→(4,4) fits a len-2 snap
    expect(snapLine(5, 18, 24)).toEqual([18, 24])
  })
})

describe('lineBetween', () => {
  it('returns the exact line for colinear cells and null otherwise', () => {
    expect(lineBetween(5, 0, 2)).toEqual([0, 1, 2])
    expect(lineBetween(5, 6, 18)).toEqual([6, 12, 18])
    expect(lineBetween(5, 2, 0)).toEqual([2, 1, 0])     // reverse order preserved
    expect(lineBetween(5, 0, 7)).toBeNull()             // knight move — not a line
    expect(lineBetween(5, 3, 3)).toBeNull()
  })
})

describe('readLine / attempt / isComplete', () => {
  it('readLine spells the letters along the cells', () => {
    expect(readLine(TEST_PUZZLE.grid, [0, 1, 2])).toBe('CAT')
  })

  it('finds a word selected forwards', () => {
    expect(attempt(TEST_PUZZLE, [], [0, 1, 2])).toEqual({ word: 'CAT', cells: [0, 1, 2] })
  })

  it('finds a word selected backwards, returning cells forward-oriented', () => {
    expect(attempt(TEST_PUZZLE, [], [2, 1, 0])).toEqual({ word: 'CAT', cells: [0, 1, 2] })
  })

  it('rejects non-words, already-found words, and degenerate selections', () => {
    expect(attempt(TEST_PUZZLE, [], [0, 5, 10])).toBeNull()               // CXX
    expect(attempt(TEST_PUZZLE, [{ word: 'CAT', cells: [0, 1, 2] }], [0, 1, 2])).toBeNull()
    expect(attempt(TEST_PUZZLE, [], null)).toBeNull()
    expect(attempt(TEST_PUZZLE, [], [0])).toBeNull()
  })

  it('isComplete when every word is found', () => {
    const found = [
      { word: 'CAT', cells: [0, 1, 2] },
      { word: 'DOG', cells: [4, 9, 14] },
    ]
    expect(isComplete(TEST_PUZZLE, found)).toBe(false)
    expect(isComplete(TEST_PUZZLE, [...found, { word: 'SUN', cells: [6, 12, 18] }])).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify FAIL** — `npx vitest run lib/games/word-search/engine.test.ts` → cannot resolve module.

- [ ] **Step 3: Implement**

`lib/games/word-search/engine.ts`:

```ts
// Pure word-search logic — no DOM, no React. Selection geometry lives here
// (not in the component) so it is unit-testable: jsdom cannot exercise the
// pointer-drag path.

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface WordPlacement {
  word: string
  row: number
  col: number
  dRow: number
  dCol: number
}

export interface WordSearchPuzzle {
  id: string
  difficulty: Difficulty
  theme: string
  size: number
  grid: string // size*size chars, row-major, A-Z
  words: string[]
  placements: WordPlacement[]
}

export interface FoundWord {
  word: string
  cells: number[]
}

// Drag selection: snap the anchor→current vector to the nearest of the 8
// straight directions. Vertical/horizontal win when their delta is at least
// twice the other axis; everything else snaps diagonal. Length follows the
// dominant delta, clamped at the grid edge.
export function snapLine(size: number, anchor: number, current: number): number[] | null {
  if (anchor === current) return null
  const ar = Math.floor(anchor / size)
  const ac = anchor % size
  const dr = Math.floor(current / size) - ar
  const dc = (current % size) - ac
  let stepR: number
  let stepC: number
  let len: number
  if (Math.abs(dr) >= 2 * Math.abs(dc)) {
    stepR = Math.sign(dr); stepC = 0; len = Math.abs(dr)
  } else if (Math.abs(dc) >= 2 * Math.abs(dr)) {
    stepR = 0; stepC = Math.sign(dc); len = Math.abs(dc)
  } else {
    stepR = Math.sign(dr); stepC = Math.sign(dc); len = Math.max(Math.abs(dr), Math.abs(dc))
  }
  const cells: number[] = []
  for (let k = 0; k <= len; k++) {
    const r = ar + k * stepR
    const c = ac + k * stepC
    if (r < 0 || r >= size || c < 0 || c >= size) break
    cells.push(r * size + c)
  }
  return cells
}

// Tap-ends / keyboard selection: EXACT line or nothing — snapping two taps
// that aren't colinear would select a line the player never touched.
export function lineBetween(size: number, a: number, b: number): number[] | null {
  if (a === b) return null
  const ar = Math.floor(a / size)
  const ac = a % size
  const dr = Math.floor(b / size) - ar
  const dc = (b % size) - ac
  if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return null
  const len = Math.max(Math.abs(dr), Math.abs(dc))
  const stepR = Math.sign(dr)
  const stepC = Math.sign(dc)
  const cells: number[] = []
  for (let k = 0; k <= len; k++) cells.push((ar + k * stepR) * size + (ac + k * stepC))
  return cells
}

export function readLine(grid: string, cells: number[]): string {
  return cells.map((i) => grid[i]).join('')
}

// Either read direction counts; cells come back oriented so they spell the
// word forwards (resume repaints don't care which way she dragged).
export function attempt(
  puzzle: WordSearchPuzzle,
  found: FoundWord[],
  cells: number[] | null
): FoundWord | null {
  if (!cells || cells.length < 2) return null
  const s = readLine(puzzle.grid, cells)
  const rev = [...s].reverse().join('')
  const foundSet = new Set(found.map((f) => f.word))
  for (const word of puzzle.words) {
    if (foundSet.has(word)) continue
    if (s === word) return { word, cells }
    if (rev === word) return { word, cells: [...cells].reverse() }
  }
  return null
}

export function isComplete(puzzle: WordSearchPuzzle, found: FoundWord[]): boolean {
  return found.length === puzzle.words.length
}

export { pickPuzzle, formatElapsed } from '../shared'
```

- [ ] **Step 4: Run to verify PASS** — `npx vitest run lib/games/word-search/engine.test.ts`.
- [ ] **Step 5: Full suite + lint once** — `npm test -- --run && npm run lint`.
- [ ] **Step 6: Commit**

```bash
git add lib/games/word-search/engine.ts lib/games/word-search/engine.test.ts
git commit -m "feat: word-search engine — snap/exact line geometry and find bookkeeping

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Storage (TDD)

**Files:**
- Create: `lib/games/word-search/storage.ts`
- Test: `lib/games/word-search/storage.test.ts`

**Interfaces:**
- Produces:

```ts
export const STORAGE_KEY = 'word-search-progress-v1'
export interface SavedWordSearch {
  puzzleId: string | null
  found: { word: string; cells: number[] }[]
  elapsedSeconds: number
  usedIds: string[]
}
export function defaultProgress(): SavedWordSearch
export function loadProgress(): SavedWordSearch | null
export function saveProgress(p: SavedWordSearch): void
```

Shape-only validation (no bank import — game-card stays cheap): `found` must be an array of `{ word: string, cells: number[] }`; puzzle-consistency checks happen in the component's restore (Task 6).

- [ ] **Step 1: Write the failing tests**

`lib/games/word-search/storage.test.ts`:

```ts
/**
 * Tests for lib/games/word-search/storage.ts — shape validation only; the
 * component's restore path owns puzzle-consistency (spec: Persistence).
 */
import {
  STORAGE_KEY, defaultProgress, loadProgress, saveProgress,
  type SavedWordSearch,
} from '@/lib/games/word-search/storage'

const VALID: SavedWordSearch = {
  puzzleId: 'we01',
  found: [{ word: 'GARDEN', cells: [0, 1, 2, 3, 4, 5] }],
  elapsedSeconds: 90,
  usedIds: ['we01'],
}

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

it('round-trips a valid progress object', () => {
  saveProgress(VALID)
  expect(loadProgress()).toEqual(VALID)
})

it('returns null when nothing is stored and on corrupt JSON', () => {
  expect(loadProgress()).toBeNull()
  localStorage.setItem(STORAGE_KEY, '{nope')
  expect(loadProgress()).toBeNull()
})

it('returns null on shape violations', () => {
  for (const bad of [
    { ...VALID, found: [{ word: 7, cells: [0] }] },          // word not a string
    { ...VALID, found: [{ word: 'A', cells: 'x' }] },        // cells not an array
    { ...VALID, found: [{ word: 'A', cells: [0, 'b'] }] },   // cell not a number
    { ...VALID, found: 'GARDEN' },                            // found not an array
    { ...VALID, elapsedSeconds: 'soon' },
    { ...VALID, usedIds: [1] },
    { ...VALID, puzzleId: 7 },
  ]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bad))
    expect(loadProgress()).toBeNull()
  }
})

it('defaultProgress validates', () => {
  saveProgress(defaultProgress())
  expect(loadProgress()).toEqual(defaultProgress())
})

it('saveProgress swallows storage errors', () => {
  vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
    throw new Error('QuotaExceededError')
  })
  expect(() => saveProgress(VALID)).not.toThrow()
  expect(localStorage.setItem).toHaveBeenCalled()
})
```

- [ ] **Step 2: Run to verify FAIL** — `npx vitest run lib/games/word-search/storage.test.ts`.
- [ ] **Step 3: Implement**

`lib/games/word-search/storage.ts`:

```ts
// localStorage persistence for /games/word-search. Shape validation only —
// puzzle-consistency (words belong to the resumed puzzle, cells in range)
// is the component restore path's job, so this module never imports the
// bank. Every access is try/catch: private mode, quota, and corrupt
// payloads degrade to "no save", never a crash.

export const STORAGE_KEY = 'word-search-progress-v1'

export interface SavedWordSearch {
  puzzleId: string | null
  found: { word: string; cells: number[] }[]
  elapsedSeconds: number
  usedIds: string[]
}

export function defaultProgress(): SavedWordSearch {
  return { puzzleId: null, found: [], elapsedSeconds: 0, usedIds: [] }
}

function isValid(p: unknown): p is SavedWordSearch {
  if (typeof p !== 'object' || p === null) return false
  const o = p as Record<string, unknown>
  if (o.puzzleId !== null && typeof o.puzzleId !== 'string') return false
  if (typeof o.elapsedSeconds !== 'number' || !Number.isFinite(o.elapsedSeconds)) return false
  if (!Array.isArray(o.usedIds) || !o.usedIds.every((id) => typeof id === 'string')) return false
  if (!Array.isArray(o.found)) return false
  for (const f of o.found) {
    if (typeof f !== 'object' || f === null) return false
    const e = f as Record<string, unknown>
    if (typeof e.word !== 'string') return false
    if (!Array.isArray(e.cells) || !e.cells.every((c) => typeof c === 'number')) return false
  }
  return true
}

export function loadProgress(): SavedWordSearch | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isValid(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function saveProgress(p: SavedWordSearch): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
  } catch {
    // storage unavailable — play continues without persistence
  }
}
```

- [ ] **Step 4: Run to verify PASS**, then `npm test -- --run` once.
- [ ] **Step 5: Commit**

```bash
git add lib/games/word-search/storage.ts lib/games/word-search/storage.test.ts
git commit -m "feat: word-search progress persistence — shape-validated localStorage

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Generator + committed bank

**Files:**
- Create: `scripts/generate-word-search-puzzles.mjs`
- Create (generated): `lib/games/word-search-puzzles.ts`
- Test: `lib/games/word-search/puzzles.test.ts`

**Interfaces:**
- Consumes: `WordSearchPuzzle` type (type-only import in the generated file).
- Produces: `export const WORD_SEARCH_PUZZLES: WordSearchPuzzle[]` from `@/lib/games/word-search-puzzles` — 90 puzzles, ids per Global Constraints, themes round-robin.

- [ ] **Step 1: Write the failing bank-integrity test**

`lib/games/word-search/puzzles.test.ts`:

```ts
/**
 * Integrity tests over the COMMITTED word-search bank. Unlike sudoku, the
 * expensive guarantee (each target readable at exactly one line, either
 * direction) is cheap here, so the test re-proves it for all 90 puzzles.
 */
import { WORD_SEARCH_PUZZLES } from '@/lib/games/word-search-puzzles'

const CONFIG: Record<string, { size: number; count: number }> = {
  easy: { size: 8, count: 8 },
  medium: { size: 10, count: 10 },
  hard: { size: 12, count: 12 },
}

// All maximal straight lines of a grid in the 4 canonical directions —
// reading each line forwards and backwards covers all 8 directions.
function allLines(grid: string, size: number): string[] {
  const at = (r: number, c: number) => grid[r * size + c]
  const lines: string[] = []
  for (let r = 0; r < size; r++) lines.push(Array.from({ length: size }, (_, c) => at(r, c)).join(''))
  for (let c = 0; c < size; c++) lines.push(Array.from({ length: size }, (_, r) => at(r, c)).join(''))
  for (let s = 0; s < 2 * size - 1; s++) {
    let se = '', ne = ''
    for (let r = 0; r < size; r++) {
      const cSE = s - r
      if (cSE >= 0 && cSE < size) se += at(r, size - 1 - cSE) // anti-diagonal family
      const cNE = s - (size - 1 - r)
      if (cNE >= 0 && cNE < size) ne += at(r, cNE)            // diagonal family
    }
    if (se.length > 1) lines.push(se)
    if (ne.length > 1) lines.push(ne)
  }
  return lines
}

function occurrences(lines: string[], word: string): number {
  const rev = [...word].reverse().join('')
  let n = 0
  for (const line of lines) {
    for (let i = 0; i + word.length <= line.length; i++) {
      const seg = line.slice(i, i + word.length)
      if (seg === word) n++
      if (seg === rev && rev !== word) n++
    }
  }
  return n
}

it('has 30 puzzles per difficulty with unique ids and correct shapes', () => {
  expect(WORD_SEARCH_PUZZLES).toHaveLength(90)
  expect(new Set(WORD_SEARCH_PUZZLES.map((p) => p.id)).size).toBe(90)
  for (const p of WORD_SEARCH_PUZZLES) {
    const { size, count } = CONFIG[p.difficulty]
    expect(p.size, p.id).toBe(size)
    expect(p.grid, p.id).toMatch(new RegExp(`^[A-Z]{${size * size}}$`))
    expect(p.words, p.id).toHaveLength(count)
    expect(p.placements, p.id).toHaveLength(count)
  }
})

it('every stored placement spells its word', () => {
  for (const p of WORD_SEARCH_PUZZLES) {
    for (const pl of p.placements) {
      const spelled = Array.from(
        { length: pl.word.length },
        (_, k) => p.grid[(pl.row + k * pl.dRow) * p.size + (pl.col + k * pl.dCol)]
      ).join('')
      expect(spelled, `${p.id}:${pl.word}`).toBe(pl.word)
    }
  }
})

it('every target is readable at exactly one location, either direction', () => {
  for (const p of WORD_SEARCH_PUZZLES) {
    const lines = allLines(p.grid, p.size)
    for (const word of p.words) {
      expect(occurrences(lines, word), `${p.id}:${word}`).toBe(1)
    }
  }
})
```

- [ ] **Step 2: Run to verify FAIL** — cannot resolve `@/lib/games/word-search-puzzles`.

- [ ] **Step 3: Write the generator**

`scripts/generate-word-search-puzzles.mjs` (LCG identical to the sudoku generator's; the themed word lists below are the content — copy them exactly):

```js
// scripts/generate-word-search-puzzles.mjs
// One-off generator for the committed word-search bank behind
// /games/word-search. 90 puzzles (30/difficulty), 8 themes round-robin.
// Deterministic (SEED); output committed; never hand-edit — re-run instead.
// The load-bearing guarantee: every target word is readable at EXACTLY ONE
// straight line in its grid, in either direction — fill letters re-roll
// until that holds, so found-word highlighting is always unambiguous.
//
//   node scripts/generate-word-search-puzzles.mjs
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '..', 'lib', 'games', 'word-search-puzzles.ts')

const SEED = 11
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

const THEMES = [
  { name: 'In the Kitchen', words: ['SPATULA','WHISK','KETTLE','SKILLET','LADLE','GRATER','TOASTER','BLENDER','OVEN','APRON','RECIPE','SPICES','TIMER','MIXER','TONGS','PANTRY','GRIDDLE','COLANDER','PITCHER','PLATTER','NAPKIN','SAUCER','TEAPOT','BURNER','FREEZER','CUTLERY','PEELER','JUICER'] },
  { name: 'Garden', words: ['TULIP','DAISY','ROSES','SOIL','SHOVEL','TROWEL','MULCH','SEEDS','BLOOM','PETAL','HEDGE','VINES','CLOVER','ORCHID','PANSY','FERNS','ROOTS','SPROUT','GARDENIA','LILAC','PEONY','THORN','POLLEN','NECTAR','TRELLIS','COMPOST','PLANTER','PRUNING'] },
  { name: 'Weather', words: ['BREEZE','CLOUDY','THUNDER','DRIZZLE','RAINBOW','SUNSHINE','FROST','HUMID','STORMY','WINDY','HAIL','FOGGY','CHILLY','MONSOON','TORNADO','BLIZZARD','DEWDROP','ICICLE','PUDDLE','UMBRELLA','FORECAST','SEASONS','AUTUMN','SPRING','WINTER','SUMMER','MISTY','GUSTY'] },
  { name: 'Travel', words: ['PASSPORT','SUITCASE','AIRPORT','JOURNEY','VOYAGE','HOTEL','RESORT','BEACH','CRUISE','TICKET','LUGGAGE','CAMERA','POSTCARD','SOUVENIR','ISLAND','SAFARI','TOURIST','COMPASS','ATLAS','HIGHWAY','TRAIN','SUBWAY','HARBOR','VILLAGE','CASTLE','MUSEUM','MARKET','SUNSET'] },
  { name: 'Animals', words: ['GIRAFFE','ELEPHANT','PENGUIN','DOLPHIN','RACCOON','SQUIRREL','LEOPARD','OSTRICH','PEACOCK','HAMSTER','RABBIT','TURTLE','MONKEY','PARROT','DONKEY','BEAVER','BADGER','WALRUS','JAGUAR','GAZELLE','HEDGEHOG','OTTER','PANDA','KOALA','ZEBRA','MOOSE','BISON','CAMEL'] },
  { name: 'Music', words: ['MELODY','RHYTHM','GUITAR','TRUMPET','VIOLIN','CLARINET','HARMONY','CHORUS','SOPRANO','BALLAD','CONCERT','PIANIST','DRUMMER','WHISTLE','LULLABY','ENCORE','TEMPO','OPERA','BANJO','CELLO','FLUTE','ORGAN','PIANO','SINGER','POLKA','WALTZ','JAZZ','MAESTRO'] },
  { name: 'Baking', words: ['FLOUR','SUGAR','YEAST','DOUGH','ICING','GLAZE','MUFFIN','COOKIE','BROWNIE','CUPCAKE','FROSTING','SPRINKLE','CINNAMON','VANILLA','CARAMEL','PASTRY','STRUDEL','BISCUIT','PRETZEL','CRUST','BATTER','RAISIN','WALNUT','ALMOND','HONEY','COCOA','SCONE','OATMEAL'] },
  { name: 'Around Town', words: ['LIBRARY','BAKERY','MARKET','THEATER','MUSEUM','STATION','AVENUE','PLAZA','CORNER','BRIDGE','FOUNTAIN','SIDEWALK','TRAFFIC','PARADE','FESTIVAL','DINER','FLORIST','BARBER','TAILOR','GROCERY','PHARMACY','SCHOOL','CHAPEL','GAZEBO','BENCH','LANTERN','TROLLEY','MAILBOX'] },
]

const CONFIG = {
  easy: { size: 8, count: 8, dirs: [[0, 1], [1, 0]], prefix: 'we' },
  medium: { size: 10, count: 10, dirs: [[0, 1], [1, 0], [1, 1], [-1, 1]], prefix: 'wm' },
  hard: { size: 12, count: 12, dirs: [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]], prefix: 'wh' },
}
const PER_DIFFICULTY = 30

// --- line scanning (mirrors puzzles.test.ts so gen-time and test agree) ---
function allLines(grid, size) {
  const at = (r, c) => grid[r * size + c]
  const lines = []
  for (let r = 0; r < size; r++) lines.push(Array.from({ length: size }, (_, c) => at(r, c)).join(''))
  for (let c = 0; c < size; c++) lines.push(Array.from({ length: size }, (_, r) => at(r, c)).join(''))
  for (let d = 0; d < 2 * size - 1; d++) {
    let se = ''
    let ne = ''
    for (let r = 0; r < size; r++) {
      const cSE = d - r
      if (cSE >= 0 && cSE < size) se += at(r, size - 1 - cSE)
      const cNE = d - (size - 1 - r)
      if (cNE >= 0 && cNE < size) ne += at(r, cNE)
    }
    if (se.length > 1) lines.push(se)
    if (ne.length > 1) lines.push(ne)
  }
  return lines
}

function occurrences(lines, word) {
  const rev = [...word].reverse().join('')
  let n = 0
  for (const line of lines) {
    for (let i = 0; i + word.length <= line.length; i++) {
      const seg = line.slice(i, i + word.length)
      if (seg === word) n++
      if (seg === rev && rev !== word) n++
    }
  }
  return n
}

// --- sampling: no word may be a substring of another (either direction) in
// the same puzzle, or the exactly-once guarantee is unsatisfiable ---
function sampleWords(theme, size, count) {
  const eligible = theme.words.filter((w) => w.length <= size)
  for (let tries = 0; tries < 200; tries++) {
    const pick = shuffle(eligible).slice(0, count)
    if (pick.length < count) throw new Error(`theme ${theme.name}: not enough words ≤ ${size}`)
    const clash = pick.some((a) =>
      pick.some((b) => {
        if (a === b) return false
        const revB = [...b].reverse().join('')
        return a.includes(b) || a.includes(revB)
      })
    )
    if (!clash) return pick
  }
  throw new Error(`theme ${theme.name}: could not sample ${count} clash-free words`)
}

function buildPuzzle(theme, config) {
  const { size, count, dirs } = config
  outer: for (let puzzleTry = 0; puzzleTry < 100; puzzleTry++) {
    const words = sampleWords(theme, size, count).sort((a, b) => b.length - a.length)
    const cells = new Array(size * size).fill('')
    const placements = []
    for (const word of words) {
      let placed = false
      for (let t = 0; t < 300 && !placed; t++) {
        const [dRow, dCol] = dirs[randInt(0, dirs.length - 1)]
        const lastR = (word.length - 1) * dRow
        const lastC = (word.length - 1) * dCol
        const row = randInt(Math.max(0, -lastR), Math.min(size - 1, size - 1 - lastR))
        const col = randInt(Math.max(0, -lastC), Math.min(size - 1, size - 1 - lastC))
        let ok = true
        for (let k = 0; k < word.length; k++) {
          const existing = cells[(row + k * dRow) * size + (col + k * dCol)]
          if (existing !== '' && existing !== word[k]) { ok = false; break }
        }
        if (!ok) continue
        for (let k = 0; k < word.length; k++) cells[(row + k * dRow) * size + (col + k * dCol)] = word[k]
        placements.push({ word, row, col, dRow, dCol })
        placed = true
      }
      if (!placed) continue outer // repack from a fresh sample
    }
    // Fill from the puzzle's own letter pool (keeps the grid looking themed),
    // re-rolling until no target reads anywhere but its placement.
    const pool = words.join('')
    const empties = cells.map((v, i) => (v === '' ? i : -1)).filter((i) => i >= 0)
    for (let fillTry = 0; fillTry < 300; fillTry++) {
      for (const i of empties) cells[i] = pool[randInt(0, pool.length - 1)]
      const grid = cells.join('')
      const lines = allLines(grid, size)
      if (words.every((w) => occurrences(lines, w) === 1)) {
        return { grid, words: [...words].sort(), placements }
      }
    }
  }
  throw new Error(`could not build a ${config.size}×${config.size} puzzle for ${theme.name}`)
}

// --- generate ---
const puzzles = []
for (const [difficulty, config] of Object.entries(CONFIG)) {
  for (let n = 1; n <= PER_DIFFICULTY; n++) {
    const theme = THEMES[(n - 1) % THEMES.length]
    const built = buildPuzzle(theme, config)
    puzzles.push({
      id: `${config.prefix}${String(n).padStart(2, '0')}`,
      difficulty,
      theme: theme.name,
      size: config.size,
      ...built,
    })
    process.stdout.write(`\r${difficulty} ${n}/${PER_DIFFICULTY}   `)
  }
  process.stdout.write('\n')
}

// --- assertions (generation fails loudly) ---
const assert = (cond, msg) => {
  if (!cond) throw new Error(`assertion failed: ${msg}`)
}
assert(puzzles.length === 90, 'expected 90 puzzles')
assert(new Set(puzzles.map((p) => p.id)).size === 90, 'ids must be unique')
for (const p of puzzles) {
  const { size, count } = CONFIG[p.difficulty]
  assert(new RegExp(`^[A-Z]{${size * size}}$`).test(p.grid), `${p.id}: grid shape`)
  assert(p.words.length === count && p.placements.length === count, `${p.id}: word count`)
  const lines = allLines(p.grid, size)
  for (const pl of p.placements) {
    const spelled = Array.from(
      { length: pl.word.length },
      (_, k) => p.grid[(pl.row + k * pl.dRow) * size + (pl.col + k * pl.dCol)]
    ).join('')
    assert(spelled === pl.word, `${p.id}: placement ${pl.word}`)
  }
  for (const w of p.words) assert(occurrences(lines, w) === 1, `${p.id}: ${w} not unique`)
}

// --- emit ---
const header = `// lib/games/word-search-puzzles.ts
// GENERATED by scripts/generate-word-search-puzzles.mjs (SEED=${SEED}) — do
// not edit. 90 puzzles, 30 per difficulty, 8 themes round-robin. Every
// target verified at generation time to be readable at exactly one line in
// its grid, either direction. Imported only by the word-search chunk.
import type { WordSearchPuzzle } from './word-search/engine'

export const WORD_SEARCH_PUZZLES: WordSearchPuzzle[] = [
`
const rows = puzzles
  .map((p) => `  { id: '${p.id}', difficulty: '${p.difficulty}', theme: '${p.theme}', size: ${p.size}, grid: '${p.grid}', words: ${JSON.stringify(p.words)}, placements: ${JSON.stringify(p.placements)} },`)
  .join('\n')
writeFileSync(OUT, header + rows + '\n]\n')
console.log(`Wrote ${puzzles.length} puzzles to ${OUT}`)
```

- [ ] **Step 4: Run the generator** — `node scripts/generate-word-search-puzzles.mjs`. Fast (seconds). If it throws, fix the generator or bump `SEED` — never hand-edit output.
- [ ] **Step 5: Run the bank test to verify PASS** — `npx vitest run lib/games/word-search/puzzles.test.ts`.
- [ ] **Step 6: Commit**

```bash
git add scripts/generate-word-search-puzzles.mjs lib/games/word-search-puzzles.ts lib/games/word-search/puzzles.test.ts
git commit -m "feat: themed word-search bank — 90 puzzles, exactly-once placement guarantee

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Grid + WordList + minimal container (tap-ends, TDD)

**Files:**
- Create: `components/games/word-search/found-styles.ts`
- Create: `components/games/word-search/grid.tsx`
- Create: `components/games/word-search/word-list.tsx`
- Create: `components/games/word-search/word-search.tsx`
- Test: `components/games/word-search/word-search.test.tsx`

**Interfaces:**
- Consumes: engine (Task 2), `WORD_SEARCH_PUZZLES` (Task 4).
- Produces:
  - `Grid` props: `{ puzzle: WordSearchPuzzle; cellAccents: ReadonlyMap<number, number>; disabled: boolean; onAttempt: (cells: number[] | null) => void; announce: (msg: string) => void }`
  - `WordList` props: `{ words: string[]; found: ReadonlyMap<string, number> }` (word → accent index)
  - `export function WordSearch()` — the component Task 8 registers.
  - `export const FOUND_STYLES: { bg: string; dot: string }[]` from `found-styles.ts` (its own module — grid.tsx and word-list.tsx import it, and the container imports both of THEM, so styles in the container would be a circular import).
- **Scope note:** this task delivers tap-ends + keyboard play on a fixed `WORD_SEARCH_PUZZLES[0]` with found-tint cycling and the word list. Drag arrives in Task 7; pills/panels/persistence/timer in Task 6. Do not flag those as missing.

- [ ] **Step 1: Write the failing tests**

`components/games/word-search/word-search.test.tsx`:

```tsx
/**
 * RTL tests for the WordSearch container — tap-ends + keyboard path (drag
 * is pointer-geometry, unit-tested in the engine and e2e-tested for real).
 * Deterministic: the container starts WORD_SEARCH_PUZZLES[0] in this task.
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { WordSearch } from '@/components/games/word-search/word-search'
import { WORD_SEARCH_PUZZLES } from '@/lib/games/word-search-puzzles'

const puzzle = WORD_SEARCH_PUZZLES[0]
const pl = puzzle.placements[0]
const cellsOf = (p: typeof pl) =>
  Array.from({ length: p.word.length }, (_, k) => (p.row + k * p.dRow) * puzzle.size + (p.col + k * p.dCol))
const target = cellsOf(pl)
const first = target[0]
const last = target[target.length - 1]

beforeEach(() => {
  vi.spyOn(Math, 'random').mockReturnValue(0)
})

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

function cell(i: number) {
  const r = Math.floor(i / puzzle.size) + 1
  const c = (i % puzzle.size) + 1
  return screen.getByRole('gridcell', { name: new RegExp(`^Row ${r}, column ${c},`) })
}

it('renders size² letter cells and the full word list', () => {
  render(<WordSearch />)
  expect(screen.getAllByRole('gridcell')).toHaveLength(puzzle.size * puzzle.size)
  for (const w of puzzle.words) {
    expect(screen.getByText(w)).toBeInTheDocument()
  }
})

it('tap-ends finds a word: struck in the list, cells tinted, status announced', () => {
  render(<WordSearch />)
  fireEvent.click(cell(first))
  fireEvent.click(cell(last))
  expect(screen.getByText(pl.word).className).toContain('line-through')
  expect(cell(first).className).toMatch(/bg-(sapphire|mauve|peach|lavender|rosewater)/)
  expect(screen.getByRole('status')).toHaveTextContent(`Found ${pl.word} — 1 of ${puzzle.words.length}`)
})

it('two taps that are not in a straight line keep the anchor and explain', () => {
  render(<WordSearch />)
  // any in-bounds cell whose row/col deltas from `first` are non-zero and
  // unequal is never colinear — search instead of hardcoding an offset that
  // could fall off the grid depending on where the placement sits
  const off = Array.from({ length: puzzle.size * puzzle.size }, (_, i) => i).find((i) => {
    const dr = Math.abs(Math.floor(i / puzzle.size) - Math.floor(first / puzzle.size))
    const dc = Math.abs((i % puzzle.size) - (first % puzzle.size))
    return dr !== 0 && dc !== 0 && dr !== dc
  })!
  fireEvent.click(cell(first))
  fireEvent.click(cell(off))
  expect(screen.getByRole('status')).toHaveTextContent("aren't in a straight line")
  expect(screen.getByText(pl.word).className).not.toContain('line-through')
})

it('a straight selection that spells nothing clears gently', () => {
  render(<WordSearch />)
  // first two cells of the placement spell a 2-letter non-word (targets are ≥4)
  fireEvent.click(cell(target[0]))
  fireEvent.click(cell(target[1]))
  expect(screen.getByRole('status')).toHaveTextContent('Not a word — cleared')
})

it('tapping the anchor again clears it', () => {
  render(<WordSearch />)
  fireEvent.click(cell(first))
  fireEvent.click(cell(first))
  fireEvent.click(cell(last)) // no anchor now — this only sets a new anchor
  expect(screen.getByText(pl.word).className).not.toContain('line-through')
})

it('keyboard: Enter anchors, Enter on the far end completes, Escape clears', () => {
  render(<WordSearch />)
  const grid = screen.getByRole('grid')
  fireEvent.click(cell(first))          // roving focus to the first cell + anchor set
  fireEvent.keyDown(grid, { key: 'Escape' })
  fireEvent.keyDown(grid, { key: 'Enter' }) // re-anchor at focused cell
  for (let k = 1; k < target.length; k++) {
    const dr = pl.dRow, dc = pl.dCol
    const key = dr === 1 ? 'ArrowDown' : dr === -1 ? 'ArrowUp' : dc === 1 ? 'ArrowRight' : 'ArrowLeft'
    // pure horizontal/vertical placements move one axis; diagonal placements
    // need both — send the vertical then horizontal arrow
    if (dr !== 0 && dc !== 0) {
      fireEvent.keyDown(grid, { key: dr === 1 ? 'ArrowDown' : 'ArrowUp' })
      fireEvent.keyDown(grid, { key: dc === 1 ? 'ArrowRight' : 'ArrowLeft' })
    } else {
      fireEvent.keyDown(grid, { key })
    }
  }
  fireEvent.keyDown(grid, { key: 'Enter' })
  expect(screen.getByText(pl.word).className).toContain('line-through')
})
```

- [ ] **Step 2: Run to verify FAIL** — `npx vitest run components/games/word-search/word-search.test.tsx`.

- [ ] **Step 3: Create the styles module, then WordList**

`components/games/word-search/found-styles.ts`:

```ts
// Accent cycle for found words — bg tints the grid cells, dot marks the
// word-list entry (list text stays muted ink for AA contrast; the lighter
// accents fail AA as text). Own module: grid.tsx and word-list.tsx both
// need it and the container imports both of them.
export const FOUND_STYLES: { bg: string; dot: string }[] = [
  { bg: "bg-sapphire/20 dark:bg-sapphire-dark/25", dot: "bg-sapphire dark:bg-sapphire-dark" },
  { bg: "bg-mauve/20 dark:bg-mauve-dark/25", dot: "bg-mauve dark:bg-mauve-dark" },
  { bg: "bg-peach/20 dark:bg-peach-dark/25", dot: "bg-peach dark:bg-peach-dark" },
  { bg: "bg-lavender/20 dark:bg-lavender-dark/25", dot: "bg-lavender dark:bg-lavender-dark" },
  { bg: "bg-rosewater/20 dark:bg-rosewater-dark/25", dot: "bg-rosewater dark:bg-rosewater-dark" },
]
```

`components/games/word-search/word-list.tsx`:

```tsx
"use client"

import React from "react"
import { FOUND_STYLES } from "./found-styles"

interface WordListProps {
  words: string[]
  found: ReadonlyMap<string, number> // word -> accent index
}

// Found words strike through in muted ink (accent text alone would fail AA
// on the lighter accents) — the accent lives in the dot, matching the
// word's cells on the grid.
export function WordList({ words, found }: WordListProps) {
  return (
    <ul aria-label="Words to find" className="flex flex-wrap gap-x-4 gap-y-2">
      {words.map((w) => {
        const accent = found.get(w)
        const isFound = accent !== undefined
        return (
          <li
            key={w}
            className={`inline-flex items-center gap-1.5 font-[family-name:var(--font-mono)] text-[13px] tracking-wide ${
              isFound
                ? "line-through text-ink-subtle/70 dark:text-night-muted/70"
                : "text-ink dark:text-night-text"
            }`}
          >
            {isFound && (
              <span aria-hidden="true" className={`h-2 w-2 rounded-full ${FOUND_STYLES[accent].dot}`} />
            )}
            {w}
            {isFound && <span className="sr-only">, found</span>}
          </li>
        )
      })}
    </ul>
  )
}
```

- [ ] **Step 4: Write Grid (tap-ends + keyboard only in this task)**

`components/games/word-search/grid.tsx`:

```tsx
"use client"

import React, { useRef, useState } from "react"
import { lineBetween, type WordSearchPuzzle } from "@/lib/games/word-search/engine"
import { FOUND_STYLES } from "./found-styles"

export interface GridProps {
  puzzle: WordSearchPuzzle
  cellAccents: ReadonlyMap<number, number>
  disabled: boolean
  onAttempt: (cells: number[] | null) => void
  announce: (msg: string) => void
}

function cellLabel(i: number, size: number, letter: string, isAnchor: boolean): string {
  const base = `Row ${Math.floor(i / size) + 1}, column ${(i % size) + 1}, letter ${letter}`
  return isAnchor ? `${base}, selected` : base
}

export function Grid({ puzzle, cellAccents, disabled, onAttempt, announce }: GridProps) {
  const { size, grid } = puzzle
  const cellRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [anchor, setAnchor] = useState<number | null>(null)
  const [focusIndex, setFocusIndex] = useState(0)

  // Tap-ends / keyboard-Enter share one path: first activation anchors,
  // second attempts the EXACT line between them (lineBetween — snapping two
  // taps would select a line the player never touched).
  const tapCell = (i: number) => {
    if (disabled) return
    if (anchor === null) {
      setAnchor(i)
      announce(`Anchor set at row ${Math.floor(i / size) + 1}, column ${(i % size) + 1}`)
    } else if (anchor === i) {
      setAnchor(null)
      announce("Anchor cleared")
    } else {
      onAttempt(lineBetween(size, anchor, i))
      setAnchor(null)
    }
  }

  const move = (to: number) => {
    setFocusIndex(to)
    cellRefs.current[to]?.focus()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    const f = focusIndex
    let handled = true
    if (e.key === "ArrowLeft") move(f % size === 0 ? f : f - 1)
    else if (e.key === "ArrowRight") move(f % size === size - 1 ? f : f + 1)
    else if (e.key === "ArrowUp") move(f < size ? f : f - size)
    else if (e.key === "ArrowDown") move(f >= size * (size - 1) ? f : f + size)
    else if (e.key === "Enter" || e.key === " ") tapCell(f)
    else if (e.key === "Escape") {
      setAnchor(null)
      announce("Anchor cleared")
    } else handled = false
    if (handled) e.preventDefault()
  }

  return (
    <div
      role="grid"
      aria-label={`Word search grid, ${size} by ${size}`}
      onKeyDown={onKeyDown}
      className="grid w-full aspect-square select-none touch-none rounded-sm overflow-hidden
        border-2 border-ink/50 dark:border-night-text/40 bg-white dark:bg-night-card"
      style={{ gridTemplateRows: `repeat(${size}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: size }, (_, r) => (
        <div key={r} role="row" className="grid" style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}>
          {Array.from({ length: size }, (_, c) => {
            const i = r * size + c
            const accent = cellAccents.get(i)
            const isAnchor = anchor === i
            return (
              <button
                key={i}
                ref={(el) => { cellRefs.current[i] = el }}
                type="button"
                role="gridcell"
                data-cell={i}
                aria-label={cellLabel(i, size, grid[i], isAnchor)}
                aria-selected={isAnchor || undefined}
                tabIndex={i === focusIndex ? 0 : -1}
                onClick={() => {
                  setFocusIndex(i)
                  tapCell(i)
                }}
                className={`relative flex items-center justify-center transition-colors
                  font-[family-name:var(--font-mono)] text-[15px] sm:text-lg leading-none
                  text-ink dark:text-night-text
                  ${accent !== undefined ? FOUND_STYLES[accent].bg : ""}
                  ${isAnchor ? "ring-2 ring-inset ring-mauve dark:ring-mauve-dark" : ""}`}
              >
                {grid[i]}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Write the minimal container**

`components/games/word-search/word-search.tsx` (Task 6 rewires init/persistence; Task 7 adds drag):

```tsx
"use client"

import React, { useMemo, useState } from "react"
import {
  attempt, isComplete, type FoundWord, type WordSearchPuzzle,
} from "@/lib/games/word-search/engine"
import { WORD_SEARCH_PUZZLES } from "@/lib/games/word-search-puzzles"
import { FOUND_STYLES } from "./found-styles"
import { Grid } from "./grid"
import { WordList } from "./word-list"

export function WordSearch() {
  const [puzzle] = useState<WordSearchPuzzle>(() => WORD_SEARCH_PUZZLES[0]) // Task 6: storage-based init
  const [found, setFound] = useState<FoundWord[]>([])
  const [status, setStatus] = useState("")

  const solved = isComplete(puzzle, found)

  const cellAccents = useMemo(() => {
    const m = new Map<number, number>()
    found.forEach((f, i) => f.cells.forEach((c) => m.set(c, i % FOUND_STYLES.length)))
    return m
  }, [found])

  const foundMap = useMemo(() => {
    const m = new Map<string, number>()
    found.forEach((f, i) => m.set(f.word, i % FOUND_STYLES.length))
    return m
  }, [found])

  const handleAttempt = (cells: number[] | null) => {
    if (solved) return
    if (!cells) {
      setStatus("Those letters aren't in a straight line")
      return
    }
    const hit = attempt(puzzle, found, cells)
    if (hit) {
      const nextCount = found.length + 1
      setFound((f) => [...f, hit])
      setStatus(
        nextCount === puzzle.words.length
          ? "All words found"
          : `Found ${hit.word} — ${nextCount} of ${puzzle.words.length}`
      )
    } else {
      setStatus("Not a word — cleared")
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-10 lg:px-12">
      <header className="mb-4 flex items-baseline justify-between gap-3">
        <p className="flex items-baseline gap-1.5">
          <span className="font-[family-name:var(--font-mono)] text-[13px] text-peach dark:text-peach-dark">
            02/
          </span>
          <span
            className="font-[family-name:var(--font-display)] text-xl text-ink dark:text-night-text"
            style={{ textShadow: "none" }}
          >
            Word Search
          </span>
        </p>
        <p className="font-[family-name:var(--font-mono)] text-[12px] text-ink-subtle dark:text-night-muted">
          fig. 02 · {puzzle.theme} · {found.length}/{puzzle.words.length} found
        </p>
      </header>

      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-center gap-6 lg:gap-10">
        <div className="w-full max-w-[420px] sm:max-w-[480px] mx-auto lg:mx-0">
          <Grid
            puzzle={puzzle}
            cellAccents={cellAccents}
            disabled={solved}
            onAttempt={handleAttempt}
            announce={setStatus}
          />
        </div>

        <div className="w-full max-w-[420px] mx-auto lg:mx-0 lg:w-[300px] lg:shrink-0">
          <WordList words={puzzle.words} found={foundMap} />
        </div>
      </div>
      <div role="status" className="sr-only">{status}</div>
    </div>
  )
}
```

- [ ] **Step 6: Run to verify PASS** — `npx vitest run components/games/word-search/word-search.test.tsx`, then `npm test -- --run && npm run lint` once.
- [ ] **Step 7: Commit**

```bash
git add components/games/word-search/
git commit -m "feat: word-search grid, word list, tap-ends + keyboard play

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Container completion — pills, panels, persistence, timer (TDD)

**Files:**
- Modify: `components/games/word-search/word-search.tsx`
- Test: append to `components/games/word-search/word-search.test.tsx`

**Interfaces:**
- Consumes: `pickPuzzle`, `formatElapsed` (re-exported by the word-search engine), `loadProgress`/`saveProgress` (Task 3), `DIFFICULTY_STYLES` from `@/lib/styles`, `SparkRule` from `@/components/spark-rule` (props: data, variant, visible, className), `type Difficulty` from the engine.
- Produces: the finished `WordSearch` — storage-based init with puzzle-consistency filtering, autosave, quiet timer (1s, skips `document.hidden`, stops when solved), difficulty pills (aria-labels "Play easy" etc., instant switch when `found.length === 0` or solved, confirm panel otherwise, current-pill no-op), confirm/new-game/solved panels swapping IN PLACE OF the word list, solved-panel copy `Found all {n}` + `` `${formatElapsed(elapsed)} · ${puzzle.theme} · ${puzzle.difficulty}` ``.

This task rewires `word-search.tsx` to the full Sudoku container shape. The Sudoku container (`components/games/sudoku/sudoku.tsx`) is the committed reference for every pattern used here — read it first. The required structure:

- [ ] **Step 1: Write the failing tests (append; add `act` to the RTL import and `STORAGE_KEY` from `@/lib/games/word-search/storage`)**

```tsx
describe('persistence, timer, pills, panels', () => {
  function seedProgress(overrides: Record<string, unknown> = {}) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      puzzleId: puzzle.id,
      found: [],
      elapsedSeconds: 0,
      usedIds: [puzzle.id],
      ...overrides,
    }))
  }
  const allFound = () => puzzle.placements.map((p) => ({ word: p.word, cells: cellsOf(p) }))

  it('resumes found words silently and repaints their cells', () => {
    seedProgress({ found: [{ word: pl.word, cells: target }] })
    render(<WordSearch />)
    expect(screen.getByText(pl.word).className).toContain('line-through')
    expect(cell(first).className).toMatch(/bg-(sapphire|mauve|peach|lavender|rosewater)/)
  })

  it('restore drops found entries that do not belong to the puzzle', () => {
    seedProgress({ found: [
      { word: 'NOTAWORD', cells: [0, 1, 2] },
      { word: pl.word, cells: [0, 9999] },
    ] })
    render(<WordSearch />)
    expect(screen.getByText(pl.word).className).not.toContain('line-through')
  })

  it('autosaves each find', () => {
    seedProgress()
    render(<WordSearch />)
    fireEvent.click(cell(first))
    fireEvent.click(cell(last))
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(saved.found).toEqual([{ word: pl.word, cells: target }])
  })

  it('timer accrues and lands in the autosave', () => {
    seedProgress()
    vi.useFakeTimers()
    render(<WordSearch />)
    act(() => { vi.advanceTimersByTime(30_000) })
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).elapsedSeconds).toBe(30)
    vi.useRealTimers()
  })

  it('finding the last word shows the solved panel with theme and elapsed', () => {
    const rest = allFound().filter((f) => f.word !== pl.word)
    seedProgress({ found: rest, elapsedSeconds: 845 })
    render(<WordSearch />)
    fireEvent.click(cell(first))
    fireEvent.click(cell(last))
    expect(screen.getByRole('heading', { name: `Found all ${puzzle.words.length}` })).toBeInTheDocument()
    expect(screen.getByText(`14 min · ${puzzle.theme} · ${puzzle.difficulty}`)).toBeInTheDocument()
  })

  it('difficulty pills: instant switch when nothing found, confirm mid-puzzle', () => {
    seedProgress()
    render(<WordSearch />)
    expect(screen.getByRole('button', { name: 'Play easy' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Play medium' }))
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).puzzleId).toMatch(/^wm/)
  })

  it('mid-puzzle switch confirms; Keep playing dismisses', () => {
    seedProgress({ found: [{ word: pl.word, cells: target }] })
    render(<WordSearch />)
    fireEvent.click(screen.getByRole('button', { name: 'Play hard' }))
    expect(screen.getByText('Start a new hard puzzle?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Keep playing' }))
    expect(screen.queryByText('Start a new hard puzzle?')).toBeNull()
    expect(screen.getByText(pl.word).className).toContain('line-through')
  })

  it('confirming the switch starts a fresh puzzle of that difficulty', () => {
    seedProgress({ found: [{ word: pl.word, cells: target }], elapsedSeconds: 300 })
    render(<WordSearch />)
    fireEvent.click(screen.getByRole('button', { name: 'Play hard' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start hard puzzle' }))
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(saved.puzzleId).toMatch(/^wh/)
    expect(saved.elapsedSeconds).toBe(0)
    expect(saved.found).toEqual([])
  })

  it('New game button opens the panel; picking a difficulty deals', () => {
    seedProgress()
    render(<WordSearch />)
    fireEvent.click(screen.getByRole('button', { name: 'New game' }))
    fireEvent.click(screen.getByRole('button', { name: 'easy' }))
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(saved.puzzleId).toMatch(/^we/)
    expect(saved.puzzleId).not.toBe(puzzle.id) // we01 used → a fresh easy deals
  })
})
```

- [ ] **Step 2: Run to verify the new describe FAILS.**

- [ ] **Step 3: Rework the container.** Mirror `components/games/sudoku/sudoku.tsx` exactly — the same state names, the same render-phase solved adjustment (NOT a useEffect — the lint gate), the same autosave/timer effects, the same pills row (aria-labels `Play {d}`, `DIFFICULTY_STYLES` from `@/lib/styles`, `lg:justify-center`), the same confirm/new-game/solved panel structure with these substitutions:

  - Board state → `puzzle: WordSearchPuzzle` + `found: FoundWord[]`; `hasProgress = found.length > 0`; `solved = isComplete(puzzle, found)`.
  - `initState()`: load → find puzzle by id in `WORD_SEARCH_PUZZLES` → filter `saved.found` (drop entries whose `word` isn't in `puzzle.words`, is duplicated, has `cells.length !== word.length`, or has any cell outside `[0, size²)`) → return `{ puzzle, found, elapsedSeconds, usedIds }`. No match → `pickPuzzle(WORD_SEARCH_PUZZLES, 'easy', saved?.usedIds ?? [])` with fresh found/elapsed.
  - Autosave effect deps `[puzzle, found, elapsed, usedIds]` writing `{ puzzleId: puzzle.id, found, elapsedSeconds: elapsed, usedIds }`.
  - Timer effect identical to Sudoku's (`[solved, puzzle.id]` deps).
  - Render-phase adjust: `if (solved && panel === "none") { setPanel("solved"); setStatus("All words found") }`; panel lazy init `useState<Panel>(() => isComplete(init.puzzle, init.found) ? "solved" : "none")`.
  - `startNewGame(d)`: pickPuzzle → setPuzzle/setFound([])/setElapsed(0)/setPanel("none")/setConfirmSwitch(null)/setStatus(`New ${d} puzzle`).
  - `pickDifficulty(d)`: current-and-unsolved no-op; `hasProgress && !solved` → confirm; else start. Confirm panel copy identical to Sudoku's (`Start a new {d} puzzle?` / warning `This abandons your current puzzle.` / `Start {d} puzzle` / `Keep playing`).
  - Right column: solved panel (SparkRule `data={[2, 4, 3, 6, 5, 8, 9]}` peach, `<h2>Found all {puzzle.words.length}</h2>`, `` `${formatElapsed(elapsed)} · ${puzzle.theme} · ${puzzle.difficulty}` ``, New puzzle → panel "new-game") → new-game panel (verbatim Sudoku structure) → confirm panel → default: `<WordList …/>` plus a full-width `New game` button below it (`h-11`, mono 13px, border like Sudoku's pad "New game" control).

- [ ] **Step 4: Run the whole file — Tasks 5 and 6 tests all PASS.** Task 5's tests must pass unmodified; if one breaks, fix the container.
- [ ] **Step 5: `npm test -- --run && npm run lint` (lint must stay at the 2 known errors — no set-state-in-effect).**
- [ ] **Step 6: Commit**

```bash
git add components/games/word-search/
git commit -m "feat: word-search resume, autosave, quiet timer, pills and panels

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Drag selection (pointer events)

**Files:**
- Modify: `components/games/word-search/grid.tsx`
- Test: append to `components/games/word-search/word-search.test.tsx`

**Interfaces:** Grid's props are UNCHANGED. Internal addition only: pointer handlers + live preview.

Behavior: `onPointerDown` on a cell captures the pointer (`setPointerCapture` on the grid container) and records the start cell; `onPointerMove` computes the current cell from the grid's bounding rect (coordinate math — NOT `elementFromPoint`, which breaks under pointer capture) and previews `snapLine(size, start, current)` with a mauve tint (`bg-mauve/15 dark:bg-mauve-dark/20`, under found tints in precedence: found > preview > anchor-ring); `onPointerUp` attempts when the preview spans >1 cell, otherwise falls through to `tapCell` (so a press-release on one cell IS the tap path — remove the separate `onClick` handler to avoid double-firing; keyboard Enter still routes through `tapCell`). Preview clears on up/cancel. When `disabled`, all pointer handling no-ops.

- [ ] **Step 1: Write the failing test (append):**

```tsx
describe('drag selection', () => {
  it('pointer drag from first to last letter finds the word', () => {
    render(<WordSearch />)
    const grid = screen.getByRole('grid')
    // jsdom reports zero rects — pin a 400×400 grid so coordinate math works
    vi.spyOn(grid, 'getBoundingClientRect').mockReturnValue({
      x: 0, y: 0, top: 0, left: 0, right: 400, bottom: 400, width: 400, height: 400,
      toJSON: () => ({}),
    } as DOMRect)
    grid.setPointerCapture = vi.fn()
    grid.releasePointerCapture = vi.fn()
    const cellPx = 400 / puzzle.size
    const center = (i: number) => ({
      clientX: ((i % puzzle.size) + 0.5) * cellPx,
      clientY: (Math.floor(i / puzzle.size) + 0.5) * cellPx,
    })
    fireEvent.pointerDown(grid, { pointerId: 1, ...center(first) })
    fireEvent.pointerMove(grid, { pointerId: 1, ...center(last) })
    fireEvent.pointerUp(grid, { pointerId: 1, ...center(last) })
    expect(screen.getByText(pl.word).className).toContain('line-through')
  })
})
```

- [ ] **Step 2: Run to verify FAIL** (no pointer handlers yet — the up never attempts).

- [ ] **Step 3: Implement.** In `grid.tsx` add refs/state — `const dragStart = useRef<number | null>(null)`, `const [preview, setPreview] = useState<number[] | null>(null)`, `const gridRef = useRef<HTMLDivElement>(null)` — plus:

```tsx
const cellFromPoint = (clientX: number, clientY: number): number | null => {
  const rect = gridRef.current?.getBoundingClientRect()
  if (!rect || rect.width === 0) return null
  const x = clientX - rect.left
  const y = clientY - rect.top
  if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) return null
  return Math.floor((y / rect.height) * size) * size + Math.floor((x / rect.width) * size)
}

const onPointerDown = (e: React.PointerEvent) => {
  if (disabled) return
  const cell = cellFromPoint(e.clientX, e.clientY)
  if (cell === null) return
  gridRef.current?.setPointerCapture(e.pointerId)
  dragStart.current = cell
  setPreview([cell])
}

const onPointerMove = (e: React.PointerEvent) => {
  if (dragStart.current === null) return
  const cell = cellFromPoint(e.clientX, e.clientY)
  if (cell === null) return
  setPreview(cell === dragStart.current ? [dragStart.current] : snapLine(size, dragStart.current, cell))
}

const onPointerUp = () => {
  const start = dragStart.current
  const cells = preview
  dragStart.current = null
  setPreview(null)
  if (start === null) return
  if (cells && cells.length > 1) onAttempt(cells)
  else tapCell(start) // press-release on one cell IS the tap path
}

const onPointerCancel = () => {
  dragStart.current = null
  setPreview(null)
}
```

Wire `ref={gridRef}` and the four handlers onto the grid container, import `snapLine`, delete the cell buttons' `onClick` (pointer-up owns activation now; keep `setFocusIndex` by calling it inside `tapCell`'s caller path — move `setFocusIndex(start)` into `onPointerUp` before `tapCell(start)`), and add the preview tint to the cell class chain with precedence found > preview > default:

```tsx
${accent !== undefined ? FOUND_STYLES[accent].bg : previewSet?.has(i) ? "bg-mauve/15 dark:bg-mauve-dark/20" : ""}
```

where `const previewSet = preview ? new Set(preview) : null` is computed per render.

- [ ] **Step 4: Run the whole test file — everything PASSES, including Task 5's tap tests (they use `fireEvent.click`, which jsdom fires without pointer events; keep a fallback: if `onClick` was removed, tap tests must still pass because RTL's `click` also dispatches `pointerdown/up`? It does NOT in jsdom — so VERIFY: if Task 5's click-based tests fail after removing `onClick`, keep the `onClick` handler but guard it: `onClick` calls `tapCell` ONLY when `dragStart.current === null && preview === null` (i.e., no pointer sequence preceded it — real browsers fire click after pointerup, jsdom fires click alone). This guard prevents double-firing in real browsers while keeping jsdom's synthetic clicks working.** Document whichever branch you land on in the code comment.
- [ ] **Step 5: `npm test -- --run && npm run lint` once.**
- [ ] **Step 6: Commit**

```bash
git add components/games/word-search/
git commit -m "feat: word-search drag selection with snapped live preview

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: Registration — metadata, card, illustration, route

**Files:**
- Modify: `lib/games/games.ts` (union + GAMES entry)
- Modify: `components/games/dynamic-games.tsx`
- Modify: `app/games/[slug]/page.tsx` (registry entry)
- Modify: `components/games/game-card.tsx` (per-slug progress keys)
- Modify: `app/games/page.tsx` (illustration + registry)

**Interfaces:** consumes `WordSearch` (Task 7), `STORAGE_KEY` from word-search storage.

- [ ] **Step 1: Extend the union and GAMES.** In `lib/games/games.ts`: `export type GameSlug = 'sudoku' | 'word-search'` and append to `GAMES`:

```ts
  {
    slug: 'word-search',
    title: 'Word Search',
    number: '02',
    description: 'Themed puzzles — swipe or tap to find the words. Three difficulties, and your game saves itself.',
    accent: 'lavender',
  },
```

- [ ] **Step 2: Dynamic wrapper.** In `components/games/dynamic-games.tsx` append:

```tsx
// Word search is ssr: false for the same reason as Sudoku: saved progress
// is restored from localStorage in a useState initializer.
export const WordSearch = dynamic(
  () => import('./word-search/word-search').then((m) => ({ default: m.WordSearch })),
  { ssr: false }
)
```

- [ ] **Step 3: Route registry.** In `app/games/[slug]/page.tsx`: import `WordSearch` from the dynamic wrapper and add `'word-search': WordSearch` to `GAME_COMPONENTS` (the `Record<GameSlug, …>` type from Task 1 has been failing to compile since Step 1 of this task — this step fixes it, proving the union guard works).

- [ ] **Step 4: game-card progress keys.** In `components/games/game-card.tsx`, replace the sudoku-only `hasProgress` with a per-slug key map (still reading raw localStorage, still no engine/bank imports):

```tsx
import { STORAGE_KEY as SUDOKU_KEY } from "@/lib/games/sudoku/storage"
import { STORAGE_KEY as WORD_SEARCH_KEY } from "@/lib/games/word-search/storage"
import type { Game, GameSlug } from "@/lib/games/games"

const PROGRESS_KEYS: Record<GameSlug, string> = {
  sudoku: SUDOKU_KEY,
  "word-search": WORD_SEARCH_KEY,
}

function hasProgress(slug: GameSlug): boolean {
  try {
    const raw = localStorage.getItem(PROGRESS_KEYS[slug])
    if (!raw) return false
    const parsed: unknown = JSON.parse(raw)
    return typeof (parsed as { puzzleId?: unknown } | null)?.puzzleId === "string"
  } catch {
    return false
  }
}
```

(The existing solved-board caveat comment stays; it now applies to both games.)

- [ ] **Step 5: Index illustration.** In `app/games/page.tsx`, add next to `SudokuIllustration` and register in `ILLUSTRATIONS` (type it `Record<GameSlug, React.ReactNode>` — the same compile guard):

```tsx
// Letter-grid motif with one found word: faint grid dots, a lavender
// diagonal draw-stroke run, accent dots at the ends.
function WordSearchIllustration() {
  return (
    <svg width="80" height="64" viewBox="0 0 80 64" aria-hidden="true" focusable="false">
      {Array.from({ length: 5 }, (_, r) =>
        Array.from({ length: 6 }, (_, c) => (
          <circle key={`${r}-${c}`} cx={15 + c * 10} cy={12 + r * 10} r="1.5"
            className="fill-ink-faint dark:fill-night-border" />
        ))
      )}
      <line x1="15" y1="12" x2="55" y2="52" stroke="currentColor" strokeWidth="2.5"
        strokeLinecap="round" className="text-lavender dark:text-lavender-dark draw-stroke"
        pathLength={100} />
      <circle cx="15" cy="12" r="3.5" className="fill-peach dark:fill-peach-dark" />
      <circle cx="55" cy="52" r="3.5" className="fill-mauve dark:fill-mauve-dark" opacity="0.7" />
    </svg>
  )
}
```

- [ ] **Step 6: Verify** — `npm run build && npm test -- --run && npm run lint`. Build must list `/games/word-search` under the SSG params. Then a dev-server smoke: `curl -s localhost:3000/games | grep -o 'Word Search'` and `curl -s localhost:3000/games/word-search | grep -o 'Back to Games'` both match (start a dev server if none is running; kill it after if you started it).
- [ ] **Step 7: Commit**

```bash
git add lib/games/games.ts components/games/dynamic-games.tsx app/games/[slug]/page.tsx components/games/game-card.tsx app/games/page.tsx
git commit -m "feat: register word search as game 02 — route, card, illustration

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: E2e, full gate, CLAUDE.md, PR prep

**Files:**
- Modify: `e2e/games.spec.ts` (append word-search tests)
- Modify: `CLAUDE.md` (games bullet + file structure)

- [ ] **Step 1: Append e2e tests.** In `e2e/games.spec.ts`, add imports `import { WORD_SEARCH_PUZZLES } from '../lib/games/word-search-puzzles'` and `import { STORAGE_KEY as WS_KEY } from '../lib/games/word-search/storage'`, then:

```ts
// Word search — deterministic via addInitScript seeding: the page then
// resumes we01 instead of dealing a random puzzle.
const WS_PUZZLE = WORD_SEARCH_PUZZLES[0]
const WS_PLACEMENT = WS_PUZZLE.placements[0]
const wsCellsOf = (p: typeof WS_PLACEMENT) =>
  Array.from({ length: p.word.length }, (_, k) => ({
    row: p.row + k * p.dRow,
    col: p.col + k * p.dCol,
  }))

async function seedWordSearch(page: import('@playwright/test').Page) {
  await page.addInitScript(
    ([key, value]) => localStorage.setItem(key, value),
    [WS_KEY, JSON.stringify({
      puzzleId: WS_PUZZLE.id, found: [], elapsedSeconds: 0, usedIds: [WS_PUZZLE.id],
    })] as const
  )
}

test('word search: drag from first to last letter finds a word', async ({ page }) => {
  await seedWordSearch(page)
  await page.goto('/games/word-search')
  const cells = page.locator('[role="gridcell"]')
  await expect(cells).toHaveCount(WS_PUZZLE.size * WS_PUZZLE.size, { timeout: 30_000 })

  const ends = wsCellsOf(WS_PLACEMENT)
  const firstCell = page.locator(
    `[role="gridcell"][aria-label^="Row ${ends[0].row + 1}, column ${ends[0].col + 1},"]`)
  const lastCell = page.locator(
    `[role="gridcell"][aria-label^="Row ${ends[ends.length - 1].row + 1}, column ${ends[ends.length - 1].col + 1},"]`)
  const a = await firstCell.boundingBox()
  const b = await lastCell.boundingBox()
  await page.mouse.move(a!.x + a!.width / 2, a!.y + a!.height / 2)
  await page.mouse.down()
  await page.mouse.move(b!.x + b!.width / 2, b!.y + b!.height / 2, { steps: 8 })
  await page.mouse.up()

  await expect(page.getByText(WS_PLACEMENT.word, { exact: true })).toHaveClass(/line-through/)
})

test('word search: found words survive reload', async ({ page }) => {
  await seedWordSearch(page)
  await page.goto('/games/word-search')
  await expect(page.locator('[role="gridcell"]')).toHaveCount(WS_PUZZLE.size * WS_PUZZLE.size, { timeout: 30_000 })
  const ends = wsCellsOf(WS_PLACEMENT)
  await page.locator(`[role="gridcell"][aria-label^="Row ${ends[0].row + 1}, column ${ends[0].col + 1},"]`).click()
  await page.locator(`[role="gridcell"][aria-label^="Row ${ends[ends.length - 1].row + 1}, column ${ends[ends.length - 1].col + 1},"]`).click()
  await expect(page.getByText(WS_PLACEMENT.word, { exact: true })).toHaveClass(/line-through/)
  await page.reload()
  await expect(page.getByText(WS_PLACEMENT.word, { exact: true })).toHaveClass(/line-through/, { timeout: 30_000 })
})

test('games index shows the word search card', async ({ page }) => {
  await page.goto('/games')
  await expect(page.getByRole('heading', { name: 'Word Search' })).toBeVisible({ timeout: 30_000 })
})
```

- [ ] **Step 2: Run** `npm run test:e2e -- games.spec.ts`, then the full `npm run test:e2e`. Fix the SPEC only if the app matches plan intent; fix the APP if it deviates (report which).
- [ ] **Step 3: CLAUDE.md.** Extend the /games Key Patterns bullet: word search is game 02 (themed committed bank via `scripts/generate-word-search-puzzles.mjs`, exactly-once placement guarantee, drag + tap-ends + keyboard selection, storage `word-search-progress-v1`, shared helpers in `lib/games/shared.ts`, `DIFFICULTY_STYLES` now in `lib/styles.ts`, `GameSlug` union gates the registries). Add the new files to File Structure (mirror how the sudoku entries are listed) and add grid/word-list/word-search to the client-components sentence.
- [ ] **Step 4: Full gate** — `npm test -- --run && npm run lint && npm run build && npm run test:e2e`.
- [ ] **Step 5: Commit**

```bash
git add e2e/games.spec.ts CLAUDE.md
git commit -m "test+docs: word-search e2e coverage and CLAUDE.md patterns

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

- [ ] **Step 6:** Manual verification (controller): 390×844 primary + 320 floor scrollWidth, drag feel on the real pane, dark-mode tint contrast, keyboard walk, reduced motion parity. Then superpowers:finishing-a-development-branch (PR to main).
