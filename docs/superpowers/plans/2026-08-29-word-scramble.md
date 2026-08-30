# Word Scramble (Game 03) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `/games/word-scramble` — a themed tap-tile word scramble (game 03) mirroring the sudoku/word-search architecture.

**Architecture:** Committed deterministic puzzle bank (generator SEED=13; scrambled orderings are runtime, not stored) + pure unit-tested engine (`lib/games/word-scramble/`) + thin client component tree (`components/games/word-scramble/`) loaded ssr:false, registered through the `GameSlug` union so missing registry entries fail to compile.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind 4, vitest + Testing Library (jsdom), Playwright.

**Spec:** `docs/superpowers/specs/2026-08-29-word-scramble-design.md` — read it first; it is the authority on behavior.

## Global Constraints

- TDD for every code task: write the failing test, RUN it and see it fail, then implement. No production code without a failing test first.
- Engine convention (copied from sudoku/word-search): transitions are immutable and **no-ops return the SAME state object** — callers rely on identity.
- Game code never imports another game's engine or components; cross-game helpers come from `lib/games/shared.ts` re-exported by this game's engine.
- Generated files (`lib/games/word-scramble-puzzles.ts`) are committed and never hand-edited; regenerate by re-running the script.
- localStorage key: `word-scramble-progress-v1`. Storage modules shape-check on load and try/catch every access.
- jsdom quirks (established in this repo): no `matchMedia` → `vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }))`; no 2d canvas → `vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)`. Both file-wide in any test file whose renders can mount `ConfettiBurst`.
- Accent for this game: **rosewater** (`ACCENT_STYLES.rosewater` in `lib/styles.ts` has the exact class strings). Number `03`.
- Timer is quiet (never shown during play); no scoring, no penalties.
- All new interactive elements: native `<button type="button">`, tray tiles ≥44px both axes; slots keep ≥44px height but may be ~34px wide for 8-letter words at 320px (sudoku board-cell precedent).
- Commit after each task with the repo's message style; end every commit message with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Run commands from the repo root. Unit tests: `npx vitest run <path>`. Full suite: `npm test`.

---

### Task 1: Shared theme lists module

Move the 8 curated `THEMES` lists out of the word-search generator into a shared module both generators import. The gate is byte-identical word-search output.

**Files:**
- Create: `scripts/word-themes.mjs`
- Modify: `scripts/generate-word-search-puzzles.mjs` (delete its inline `THEMES`, import instead)

**Interfaces:**
- Produces: `scripts/word-themes.mjs` exporting `export const THEMES = [{ name: string, words: string[] }, …]` — 8 entries, 28 words each, order preserved EXACTLY as currently in `generate-word-search-puzzles.mjs`.

- [ ] **Step 1: Create `scripts/word-themes.mjs`**

Cut the entire `const THEMES = [ … ]` array (8 objects, from `{ name: 'In the Kitchen', …` through `…'TROLLEY','MAILBOX'] },` and the closing `]`) out of `scripts/generate-word-search-puzzles.mjs` verbatim — do not re-type it, do not reorder anything — and paste it into the new file:

```js
// scripts/word-themes.mjs
// The 8 curated theme word lists shared by every word game's generator
// (word search, word scramble). Order and content are load-bearing: the
// word-search generator's PRNG stream walks these arrays, so ANY change
// here changes that committed bank. Edit only with a deliberate regenerate.
export const THEMES = [
  // …the 8 entries, verbatim…
]
```

- [ ] **Step 2: Import it from the word-search generator**

In `scripts/generate-word-search-puzzles.mjs`, where the array was, add to the imports at top:

```js
import { THEMES } from './word-themes.mjs'
```

- [ ] **Step 3: Verify byte-identical regeneration**

```bash
node scripts/generate-word-search-puzzles.mjs && git diff --exit-code lib/games/word-search-puzzles.ts
```

Expected: generator completes, `git diff --exit-code` exits 0 (no diff). If there IS a diff, the array content or order changed — fix the module until the diff is empty. Do not commit a changed bank.

- [ ] **Step 4: Run the word-search tests**

```bash
npx vitest run lib/games/word-search
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/word-themes.mjs scripts/generate-word-search-puzzles.mjs
git commit -m "refactor: extract shared word-themes module (word-search bank byte-identical)"
```

---

### Task 2: Engine — word state, scramble, place/return, checks

**Files:**
- Create: `lib/games/word-scramble/engine.ts`
- Test: `lib/games/word-scramble/engine.test.ts`

**Interfaces:**
- Consumes: `pickPuzzle`, `formatElapsed` from `lib/games/shared.ts` (re-export only).
- Produces (later tasks rely on these exact names):

```ts
export type Difficulty = 'easy' | 'medium' | 'hard'
export interface ScramblePuzzle { id: string; difficulty: Difficulty; theme: string; words: string[] }
export interface WordState {
  word: string             // the target
  tiles: string[]          // tile i => its letter; index = tile identity, NEVER reordered
  tray: number[]           // unplaced tile indexes in display order
  slots: (number | null)[] // slot i => tile index or null
  locked: boolean[]        // hint-revealed slots
}
export function scrambleOrder(word: string, rand: () => number): number[]
export function startWord(word: string, rand?: () => number): WordState
export function placeTile(ws: WordState, tile: number): WordState
export function returnSlot(ws: WordState, slot: number): WordState
export function returnAll(ws: WordState): WordState
export function isFilled(ws: WordState): boolean
export function isCorrect(ws: WordState): boolean
export { pickPuzzle, formatElapsed } from '../shared'
```

(The spec calls `scrambleOrder` "scramble"; it returns a permutation of tile indexes, not letters, because slots reference tiles by index — identity survives tray reshuffles.)

- [ ] **Step 1: Write the failing tests**

Create `lib/games/word-scramble/engine.test.ts`:

```ts
/**
 * Tests for lib/games/word-scramble/engine.ts — pure word-scramble logic.
 * Slots hold tile INDEXES (identity), so duplicate letters are
 * interchangeable for correctness but distinct for placement.
 */
import {
  scrambleOrder, startWord, placeTile, returnSlot, returnAll,
  isFilled, isCorrect, pickPuzzle, formatElapsed,
} from '@/lib/games/word-scramble/engine'

describe('scrambleOrder', () => {
  it('returns a permutation of all tile indexes whose letters differ from the word', () => {
    const order = scrambleOrder('SPROUT', Math.random)
    expect([...order].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5])
    expect(order.map((t) => 'SPROUT'[t]).join('')).not.toBe('SPROUT')
  })

  it('re-rolls duplicate-letter words until the LETTER sequence differs', () => {
    // 20 tries at random: every result must spell something ≠ SEEDS
    for (let i = 0; i < 20; i++) {
      const order = scrambleOrder('SEEDS', Math.random)
      expect(order.map((t) => 'SEEDS'[t]).join('')).not.toBe('SEEDS')
    }
  })
})

describe('startWord', () => {
  it('builds tiles in word order, a scrambled tray, empty unlocked slots', () => {
    const ws = startWord('HONEY')
    expect(ws.word).toBe('HONEY')
    expect(ws.tiles).toEqual(['H', 'O', 'N', 'E', 'Y'])
    expect([...ws.tray].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4])
    expect(ws.slots).toEqual([null, null, null, null, null])
    expect(ws.locked).toEqual([false, false, false, false, false])
  })
})

describe('placeTile / returnSlot / returnAll', () => {
  it('places a tray tile into the lowest empty slot and removes it from the tray', () => {
    const ws = startWord('HONEY')
    const t = ws.tray[0]
    const next = placeTile(ws, t)
    expect(next.slots[0]).toBe(t)
    expect(next.tray).not.toContain(t)
    expect(next.tray).toHaveLength(4)
  })

  it('is a no-op (same object) for an already-placed tile', () => {
    const ws = placeTile(startWord('HONEY'), 0)
    expect(placeTile(ws, 0)).toBe(ws)
  })

  it('returnSlot sends the tile back to the tray; no-op on empty slots', () => {
    let ws = startWord('HONEY')
    const t = ws.tray[0]
    ws = placeTile(ws, t)
    const back = returnSlot(ws, 0)
    expect(back.slots[0]).toBeNull()
    expect(back.tray).toContain(t)
    expect(returnSlot(back, 0)).toBe(back)
  })

  it('returnSlot refuses locked slots', () => {
    let ws = startWord('HONEY')
    ws = placeTile(ws, ws.tray[0])
    const lockedWs = { ...ws, locked: ws.locked.map((_, i) => i === 0) }
    expect(returnSlot(lockedWs, 0)).toBe(lockedWs)
  })

  it('returnAll clears every unlocked slot, keeps locked ones, no-op when nothing to clear', () => {
    let ws = startWord('HONEY')
    ws = placeTile(ws, ws.tray[0])
    ws = placeTile(ws, ws.tray[0])
    const withLock = { ...ws, locked: ws.locked.map((_, i) => i === 0) }
    const cleared = returnAll(withLock)
    expect(cleared.slots[0]).toBe(withLock.slots[0]) // locked survives
    expect(cleared.slots[1]).toBeNull()
    expect(cleared.tray).toHaveLength(4) // 5 tiles - 1 locked
    expect(returnAll(cleared)).toBe(cleared)
  })
})

describe('isFilled / isCorrect', () => {
  // Place tiles to spell the word exactly: for each target letter take a
  // tray tile carrying that letter.
  function solve(word: string) {
    let ws = startWord(word)
    for (const ch of word) {
      const tile = ws.tray.find((t) => ws.tiles[t] === ch)!
      ws = placeTile(ws, tile)
    }
    return ws
  }

  it('a correctly spelled fill is filled and correct — duplicate letters interchangeable', () => {
    const ws = solve('SEEDS') // which E/S tile lands where is arbitrary
    expect(isFilled(ws)).toBe(true)
    expect(isCorrect(ws)).toBe(true)
  })

  it('a full but wrong arrangement is filled, not correct', () => {
    let ws = startWord('HONEY')
    // fill slots in tray order — with a scramble ≠ word this can still
    // accidentally spell the word, so force a wrong arrangement: place the
    // tile for the LAST letter first.
    const lastTile = ws.tray.find((t) => ws.tiles[t] === 'Y')!
    ws = placeTile(ws, lastTile)
    while (ws.tray.length > 0) ws = placeTile(ws, ws.tray[0])
    expect(isFilled(ws)).toBe(true)
    expect(isCorrect(ws)).toBe(false)
  })

  it('an unfilled word is neither', () => {
    const ws = placeTile(startWord('HONEY'), 0)
    expect(isFilled(ws)).toBe(false)
    expect(isCorrect(ws)).toBe(false)
  })
})

describe('re-exports', () => {
  it('pickPuzzle and formatElapsed come from shared', () => {
    expect(typeof pickPuzzle).toBe('function')
    expect(formatElapsed(65)).toBe('1 min')
  })
})
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
npx vitest run lib/games/word-scramble/engine.test.ts
```

Expected: FAIL — cannot resolve `@/lib/games/word-scramble/engine`.

- [ ] **Step 3: Implement the engine**

Create `lib/games/word-scramble/engine.ts`:

```ts
// Pure word-scramble game logic — no DOM, no React. The component in
// components/games/word-scramble/ is a thin view over these functions.
// All state transitions are immutable: they return a new WordState
// (or the SAME state object for no-ops, which callers rely on).
//
// Identity model: `tiles` is fixed (index = tile identity); the tray and
// slots reference tiles BY INDEX. Duplicate letters are therefore
// interchangeable for correctness but distinct for placement/return.

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface ScramblePuzzle {
  id: string
  difficulty: Difficulty
  theme: string
  words: string[] // solve order as stored
}

export interface WordState {
  word: string
  tiles: string[]
  tray: number[]
  slots: (number | null)[]
  locked: boolean[]
}

function fisherYates(arr: number[], rand: () => number): number[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Permutation of tile indexes whose letter sequence differs from the word.
// The cap is unreachable for real words with ≥2 distinct letters; on cap,
// the last shuffle is returned rather than looping forever.
export function scrambleOrder(word: string, rand: () => number): number[] {
  const base = Array.from(word, (_, i) => i)
  let order = base
  for (let i = 0; i < 50; i++) {
    order = fisherYates(base, rand)
    if (order.some((t, k) => word[t] !== word[k])) break
  }
  return order
}

export function startWord(word: string, rand: () => number = Math.random): WordState {
  return {
    word,
    tiles: [...word],
    tray: scrambleOrder(word, rand),
    slots: Array.from(word, () => null),
    locked: Array.from(word, () => false),
  }
}

export function placeTile(ws: WordState, tile: number): WordState {
  if (!ws.tray.includes(tile)) return ws
  const slot = ws.slots.indexOf(null)
  if (slot === -1) return ws
  const slots = ws.slots.slice()
  slots[slot] = tile
  return { ...ws, slots, tray: ws.tray.filter((t) => t !== tile) }
}

export function returnSlot(ws: WordState, slot: number): WordState {
  const tile = ws.slots[slot]
  if (tile === null || tile === undefined || ws.locked[slot]) return ws
  const slots = ws.slots.slice()
  slots[slot] = null
  return { ...ws, slots, tray: [...ws.tray, tile] }
}

export function returnAll(ws: WordState): WordState {
  if (!ws.slots.some((t, i) => t !== null && !ws.locked[i])) return ws
  const slots = ws.slots.slice()
  const freed: number[] = []
  slots.forEach((t, i) => {
    if (t !== null && !ws.locked[i]) {
      freed.push(t)
      slots[i] = null
    }
  })
  return { ...ws, slots, tray: [...ws.tray, ...freed] }
}

export function isFilled(ws: WordState): boolean {
  return ws.slots.every((t) => t !== null)
}

export function isCorrect(ws: WordState): boolean {
  return isFilled(ws) && ws.slots.every((t, i) => ws.tiles[t as number] === ws.word[i])
}

export { pickPuzzle, formatElapsed } from '../shared'
```

- [ ] **Step 4: Run tests, verify they pass**

```bash
npx vitest run lib/games/word-scramble/engine.test.ts
```

Expected: PASS, all tests.

- [ ] **Step 5: Commit**

```bash
git add lib/games/word-scramble/engine.ts lib/games/word-scramble/engine.test.ts
git commit -m "feat: word-scramble engine — word state, scramble, place/return, checks"
```

---

### Task 3: Engine — shuffleTray and revealLetter

**Files:**
- Modify: `lib/games/word-scramble/engine.ts`
- Test: `lib/games/word-scramble/engine.test.ts` (append)

**Interfaces:**
- Produces:

```ts
export function shuffleTray(ws: WordState, rand?: () => number): WordState
export function revealLetter(ws: WordState): WordState  // deterministic, no rand
```

Behavior (from the spec, exactly):
- `shuffleTray`: re-orders only the tray; placed/locked tiles untouched. The tray's LETTER sequence must change when more than one distinct unplaced letter exists; otherwise no-op (same object).
- `revealLetter`: walk slots from the left, skipping locked ones; a filled slot already holding its correct letter gets **locked in passing** (never waste the hint); the first unlocked slot that is empty or wrong becomes the target. Its correct letter is locked in: prefer a tray tile with that letter, else evict one from an unlocked slot (that slot becomes empty). A wrong tile displaced from the target slot returns to the tray. No-op when every slot is already locked-or-correct and no lock changes.

- [ ] **Step 1: Append the failing tests**

Append to `lib/games/word-scramble/engine.test.ts` (add `shuffleTray, revealLetter` to the import list):

```ts
describe('shuffleTray', () => {
  it('changes the tray letter sequence and leaves placed tiles alone', () => {
    let ws = startWord('SPROUT')
    ws = placeTile(ws, ws.tray[0])
    const placed = ws.slots[0]
    const before = ws.tray.map((t) => ws.tiles[t]).join('')
    const next = shuffleTray(ws, Math.random)
    expect(next.slots[0]).toBe(placed)
    expect([...next.tray].sort((a, b) => a - b)).toEqual([...ws.tray].sort((a, b) => a - b))
    expect(next.tray.map((t) => next.tiles[t]).join('')).not.toBe(before)
  })

  it('is a no-op when fewer than two distinct unplaced letters remain', () => {
    let ws = startWord('SEEDS')
    // place S, D, S — leaving only the two Es in the tray
    for (const ch of ['S', 'D', 'S']) {
      ws = placeTile(ws, ws.tray.find((t) => ws.tiles[t] === ch)!)
    }
    expect(ws.tray.map((t) => ws.tiles[t]).sort().join('')).toBe('EE')
    expect(shuffleTray(ws, Math.random)).toBe(ws)
  })
})

describe('revealLetter', () => {
  it('locks the correct letter into the first empty slot, from the tray', () => {
    const ws = startWord('HONEY')
    const next = revealLetter(ws)
    expect(next.locked[0]).toBe(true)
    expect(next.tiles[next.slots[0]!]).toBe('H')
    expect(next.tray).toHaveLength(4)
  })

  it('displaces a wrong tile from the target slot back to the tray', () => {
    let ws = startWord('HONEY')
    const wrong = ws.tray.find((t) => ws.tiles[t] !== 'H')!
    ws = placeTile(ws, wrong) // wrong letter sits in slot 0
    const next = revealLetter(ws)
    expect(next.tiles[next.slots[0]!]).toBe('H')
    expect(next.locked[0]).toBe(true)
    expect(next.tray).toContain(wrong)
  })

  it('locks an already-correct filled slot in passing instead of spending the reveal on it', () => {
    let ws = startWord('HONEY')
    ws = placeTile(ws, ws.tray.find((t) => ws.tiles[t] === 'H')!) // slot 0 correct, unlocked
    const next = revealLetter(ws)
    expect(next.locked[0]).toBe(true)            // locked in passing
    expect(next.locked[1]).toBe(true)            // the actual reveal
    expect(next.tiles[next.slots[1]!]).toBe('O')
  })

  it('evicts the needed letter from a later unlocked slot when the tray has none', () => {
    let ws = startWord('SOIL')
    // fill everything wrong such that no tray tiles remain
    const order = ['O', 'S', 'L', 'I'] // slot0=O (wrong; needs S)
    for (const ch of order) {
      ws = placeTile(ws, ws.tray.find((t) => ws.tiles[t] === ch)!)
    }
    expect(ws.tray).toHaveLength(0)
    const next = revealLetter(ws)
    expect(next.tiles[next.slots[0]!]).toBe('S')
    expect(next.locked[0]).toBe(true)
    // the S came out of slot 1; the displaced O went back to the tray
    expect(next.slots[1]).toBeNull()
    expect(next.tray.map((t) => next.tiles[t]).sort().join('')).toBe('O')
  })

  it('repeated reveals solve the whole word', () => {
    let ws = startWord('SPROUT')
    for (let i = 0; i < 6; i++) ws = revealLetter(ws)
    expect(isCorrect(ws)).toBe(true)
    expect(ws.locked.every(Boolean)).toBe(true)
    expect(revealLetter(ws)).toBe(ws) // fully locked => no-op
  })
})
```

(Also add `isCorrect` to the imports if not already there.)

- [ ] **Step 2: Run tests, verify the new ones fail**

```bash
npx vitest run lib/games/word-scramble/engine.test.ts
```

Expected: the Task 2 tests still pass; every `shuffleTray`/`revealLetter` test FAILS with "not a function".

- [ ] **Step 3: Implement**

Append to `lib/games/word-scramble/engine.ts`:

```ts
// Re-orders only the tray (slots reference tiles by index, so placed tiles
// are untouched). No-op unless the visible letter sequence actually changes.
export function shuffleTray(ws: WordState, rand: () => number = Math.random): WordState {
  const distinct = new Set(ws.tray.map((t) => ws.tiles[t]))
  if (distinct.size < 2) return ws
  for (let i = 0; i < 50; i++) {
    const next = fisherYates(ws.tray, rand)
    if (next.some((t, k) => ws.tiles[t] !== ws.tiles[ws.tray[k]])) {
      return { ...ws, tray: next }
    }
  }
  return ws
}

// Hint: lock the correct letter into the first slot that needs it.
// Already-correct filled slots on the way are locked in passing — the
// player was right; don't spend the reveal on them. Deterministic (no rand).
export function revealLetter(ws: WordState): WordState {
  const slots = ws.slots.slice()
  const locked = ws.locked.slice()
  const tray = ws.tray.slice()

  let target = -1
  for (let i = 0; i < slots.length; i++) {
    if (locked[i]) continue
    const t = slots[i]
    if (t !== null && ws.tiles[t] === ws.word[i]) {
      locked[i] = true
      continue
    }
    target = i
    break
  }

  if (target === -1) {
    // every slot already correct — reveal spends nothing, but keep any
    // in-passing locks it just proved
    return locked.some((l, i) => l !== ws.locked[i]) ? { ...ws, locked } : ws
  }

  const letter = ws.word[target]
  const displaced = slots[target] // wrong tile currently in the target slot, if any
  if (displaced !== null) tray.push(displaced)

  let source = -1
  const trayIdx = tray.findIndex((t) => ws.tiles[t] === letter)
  if (trayIdx !== -1) {
    source = tray[trayIdx]
    tray.splice(trayIdx, 1)
  } else {
    for (let j = 0; j < slots.length; j++) {
      if (j === target || locked[j]) continue
      const t = slots[j]
      if (t !== null && ws.tiles[t] === letter) {
        source = t
        slots[j] = null
        break
      }
    }
  }
  if (source === -1) return ws // unreachable: a needed letter always has a free copy

  slots[target] = source
  locked[target] = true
  return { ...ws, slots, locked, tray }
}
```

- [ ] **Step 4: Run tests, verify all pass**

```bash
npx vitest run lib/games/word-scramble/engine.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/games/word-scramble/engine.ts lib/games/word-scramble/engine.test.ts
git commit -m "feat: word-scramble engine — shuffleTray + revealLetter hints"
```

---

### Task 4: Puzzle bank generator + committed bank

**Files:**
- Create: `scripts/generate-word-scramble-puzzles.mjs`
- Create (generated): `lib/games/word-scramble-puzzles.ts`
- Test: `lib/games/word-scramble/puzzles.test.ts`

**Interfaces:**
- Consumes: `THEMES` from `scripts/word-themes.mjs`; `type ScramblePuzzle` from Task 2.
- Produces: `export const WORD_SCRAMBLE_PUZZLES: ScramblePuzzle[]` — 90 puzzles; ids `se01…se30`, `sm01…sm30`, `sh01…sh30`; easy = 6 words from each theme's shortest 10, medium = 7 from ranks 10–19, hard = 8 from the longest 10 (ranks 18–27); length-then-alphabetical ranking; themes round-robin by puzzle number.

- [ ] **Step 1: Write the failing bank test**

Create `lib/games/word-scramble/puzzles.test.ts`. It re-proves the bank invariants that don't require the theme source (slice membership is generator-asserted; re-proving it here would mean importing an .mjs into TS for marginal value):

```ts
/**
 * Re-proves the committed word-scramble bank's invariants (generation-time
 * assertions live in scripts/generate-word-scramble-puzzles.mjs; this
 * mirrors the ones checkable from the bank alone).
 */
import { WORD_SCRAMBLE_PUZZLES } from '@/lib/games/word-scramble-puzzles'

const THEME_NAMES = [
  'In the Kitchen', 'Garden', 'Weather', 'Travel',
  'Animals', 'Music', 'Baking', 'Around Town',
]
const WORD_COUNT = { easy: 6, medium: 7, hard: 8 } as const
const anagramKey = (w: string) => [...w].sort().join('')

it('has 90 puzzles, 30 per difficulty, unique ids with the right prefixes', () => {
  expect(WORD_SCRAMBLE_PUZZLES).toHaveLength(90)
  expect(new Set(WORD_SCRAMBLE_PUZZLES.map((p) => p.id)).size).toBe(90)
  for (const [difficulty, prefix] of [['easy', 'se'], ['medium', 'sm'], ['hard', 'sh']] as const) {
    const pool = WORD_SCRAMBLE_PUZZLES.filter((p) => p.difficulty === difficulty)
    expect(pool).toHaveLength(30)
    for (const p of pool) expect(p.id).toMatch(new RegExp(`^${prefix}\\d{2}$`))
  }
})

it('every puzzle: known theme, correct word count, uppercase words ≥4 letters, distinct, anagram-free', () => {
  for (const p of WORD_SCRAMBLE_PUZZLES) {
    expect(THEME_NAMES).toContain(p.theme)
    expect(p.words).toHaveLength(WORD_COUNT[p.difficulty])
    expect(new Set(p.words).size).toBe(p.words.length)
    const keys = p.words.map(anagramKey)
    expect(new Set(keys).size).toBe(keys.length)
    for (const w of p.words) {
      expect(w).toMatch(/^[A-Z]{4,}$/)
    }
  }
})

it('difficulty tracks word length: every hard word ≥ 6 letters, every easy word ≤ 6', () => {
  for (const p of WORD_SCRAMBLE_PUZZLES) {
    for (const w of p.words) {
      if (p.difficulty === 'easy') expect(w.length).toBeLessThanOrEqual(6)
      if (p.difficulty === 'hard') expect(w.length).toBeGreaterThanOrEqual(6)
    }
  }
})
```

- [ ] **Step 2: Run it, verify it fails**

```bash
npx vitest run lib/games/word-scramble/puzzles.test.ts
```

Expected: FAIL — cannot resolve `@/lib/games/word-scramble-puzzles`.

- [ ] **Step 3: Write the generator**

Create `scripts/generate-word-scramble-puzzles.mjs`:

```js
// scripts/generate-word-scramble-puzzles.mjs
// One-off generator for the committed word-scramble bank behind
// /games/word-scramble. 90 puzzles (30/difficulty), 8 themes round-robin.
// Deterministic (SEED); output committed; never hand-edit — re-run instead.
// Scrambled orderings are NOT stored: the engine scrambles at runtime
// (the Shuffle button needs runtime re-scrambling anyway).
//
//   node scripts/generate-word-scramble-puzzles.mjs
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { THEMES } from './word-themes.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '..', 'lib', 'games', 'word-scramble-puzzles.ts')

const SEED = 13
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

// Difficulty = which length-ranked slice of the theme's 28 words feeds the
// puzzle, and how many words it holds. Ranks: length asc, ties alphabetical.
const CONFIG = {
  easy: { count: 6, slice: [0, 10], prefix: 'se' },
  medium: { count: 7, slice: [10, 20], prefix: 'sm' },
  hard: { count: 8, slice: [18, 28], prefix: 'sh' },
}
const PER_DIFFICULTY = 30

const anagramKey = (w) => [...w].sort().join('')
const ranked = (theme) =>
  theme.words.slice().sort((a, b) => a.length - b.length || a.localeCompare(b))

function samplePuzzleWords(theme, config) {
  const pool = ranked(theme).slice(config.slice[0], config.slice[1])
  for (let tries = 0; tries < 200; tries++) {
    const pick = shuffle(pool).slice(0, config.count)
    if (new Set(pick.map(anagramKey)).size === pick.length) return pick
  }
  throw new Error(`theme ${theme.name}: could not sample ${config.count} anagram-free words`)
}

// --- generate ---
const puzzles = []
for (const [difficulty, config] of Object.entries(CONFIG)) {
  for (let n = 1; n <= PER_DIFFICULTY; n++) {
    const theme = THEMES[(n - 1) % THEMES.length]
    puzzles.push({
      id: `${config.prefix}${String(n).padStart(2, '0')}`,
      difficulty,
      theme: theme.name,
      words: samplePuzzleWords(theme, config),
    })
  }
}

// --- assertions (generation fails loudly) ---
const assert = (cond, msg) => {
  if (!cond) throw new Error(`assertion failed: ${msg}`)
}
assert(puzzles.length === 90, 'expected 90 puzzles')
assert(new Set(puzzles.map((p) => p.id)).size === 90, 'ids must be unique')
for (const p of puzzles) {
  const config = CONFIG[p.difficulty]
  const theme = THEMES.find((t) => t.name === p.theme)
  const pool = new Set(ranked(theme).slice(config.slice[0], config.slice[1]))
  assert(p.words.length === config.count, `${p.id}: word count`)
  assert(new Set(p.words).size === p.words.length, `${p.id}: duplicate word`)
  assert(new Set(p.words.map(anagramKey)).size === p.words.length, `${p.id}: intra-puzzle anagram pair`)
  for (const w of p.words) {
    assert(/^[A-Z]{4,}$/.test(w), `${p.id}: ${w} shape`)
    assert(pool.has(w), `${p.id}: ${w} outside its difficulty slice`)
  }
}

// --- emit ---
const header = `// lib/games/word-scramble-puzzles.ts
// GENERATED by scripts/generate-word-scramble-puzzles.mjs (SEED=${SEED}) — do
// not edit. 90 puzzles, 30 per difficulty, 8 themes round-robin. Words come
// from length-ranked slices of the shared theme lists (easy shortest,
// hard longest); no puzzle contains an intra-puzzle anagram pair. Imported
// only by the word-scramble chunk.
import type { ScramblePuzzle } from './word-scramble/engine'

export const WORD_SCRAMBLE_PUZZLES: ScramblePuzzle[] = [
`
const rows = puzzles
  .map((p) => `  { id: '${p.id}', difficulty: '${p.difficulty}', theme: '${p.theme}', words: ${JSON.stringify(p.words)} },`)
  .join('\n')
writeFileSync(OUT, header + rows + '\n]\n')
console.log(`wrote ${puzzles.length} puzzles to ${OUT}`)
```

- [ ] **Step 4: Run the generator, then the tests**

```bash
node scripts/generate-word-scramble-puzzles.mjs
npx vitest run lib/games/word-scramble/puzzles.test.ts
```

Expected: generator prints `wrote 90 puzzles …`; tests PASS. If the length-band test fails (a slice straddling 6 letters differently than expected), adjust the TEST's band expectations to the measured reality (easy ≤6 / hard ≥6 comes from today's measured slices) — never hand-edit the bank.

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-word-scramble-puzzles.mjs lib/games/word-scramble-puzzles.ts lib/games/word-scramble/puzzles.test.ts
git commit -m "feat: word-scramble puzzle bank — 90 puzzles, SEED=13, anagram-free"
```

---

### Task 5: Storage module

**Files:**
- Create: `lib/games/word-scramble/storage.ts`
- Test: `lib/games/word-scramble/storage.test.ts`

**Interfaces:**
- Produces:

```ts
export const STORAGE_KEY = 'word-scramble-progress-v1'
export interface SavedWordScramble {
  puzzleId: string | null
  solvedCount: number
  elapsedSeconds: number
  usedIds: string[]
}
export function defaultProgress(): SavedWordScramble
export function loadProgress(): SavedWordScramble | null
export function saveProgress(p: SavedWordScramble): void
```

`solvedCount` must be a finite non-negative integer to validate; clamping to the puzzle's word count happens in the component (the storage module never imports the bank — word-search precedent).

- [ ] **Step 1: Write the failing tests**

Create `lib/games/word-scramble/storage.test.ts`:

```ts
import {
  STORAGE_KEY, defaultProgress, loadProgress, saveProgress,
} from '@/lib/games/word-scramble/storage'

afterEach(() => localStorage.clear())

it('round-trips a save', () => {
  saveProgress({ puzzleId: 'se01', solvedCount: 3, elapsedSeconds: 120, usedIds: ['se01'] })
  expect(loadProgress()).toEqual({
    puzzleId: 'se01', solvedCount: 3, elapsedSeconds: 120, usedIds: ['se01'],
  })
})

it('returns null with no save or an unparsable payload', () => {
  expect(loadProgress()).toBeNull()
  localStorage.setItem(STORAGE_KEY, '{not json')
  expect(loadProgress()).toBeNull()
})

it('rejects malformed shapes', () => {
  const bad = [
    { puzzleId: 5, solvedCount: 0, elapsedSeconds: 0, usedIds: [] },
    { puzzleId: 'se01', solvedCount: -1, elapsedSeconds: 0, usedIds: [] },
    { puzzleId: 'se01', solvedCount: 1.5, elapsedSeconds: 0, usedIds: [] },
    { puzzleId: 'se01', solvedCount: 0, elapsedSeconds: Infinity, usedIds: [] },
    { puzzleId: 'se01', solvedCount: 0, elapsedSeconds: 0, usedIds: [7] },
    { puzzleId: 'se01', solvedCount: 0, elapsedSeconds: 0 },
  ]
  for (const p of bad) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
    expect(loadProgress()).toBeNull()
  }
})

it('defaultProgress is an empty fresh state', () => {
  expect(defaultProgress()).toEqual({
    puzzleId: null, solvedCount: 0, elapsedSeconds: 0, usedIds: [],
  })
})
```

- [ ] **Step 2: Run, verify fail**

```bash
npx vitest run lib/games/word-scramble/storage.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `lib/games/word-scramble/storage.ts`:

```ts
// localStorage persistence for /games/word-scramble. Shape validation only —
// clamping solvedCount to the resumed puzzle's word count is the component
// restore path's job, so this module never imports the bank. Every access
// is try/catch: private mode, quota, and corrupt payloads degrade to
// "no save", never a crash.

export const STORAGE_KEY = 'word-scramble-progress-v1'

export interface SavedWordScramble {
  puzzleId: string | null
  solvedCount: number
  elapsedSeconds: number
  usedIds: string[]
}

export function defaultProgress(): SavedWordScramble {
  return { puzzleId: null, solvedCount: 0, elapsedSeconds: 0, usedIds: [] }
}

function isValid(p: unknown): p is SavedWordScramble {
  if (typeof p !== 'object' || p === null) return false
  const o = p as Record<string, unknown>
  if (o.puzzleId !== null && typeof o.puzzleId !== 'string') return false
  if (typeof o.solvedCount !== 'number' || !Number.isInteger(o.solvedCount) || o.solvedCount < 0) return false
  if (typeof o.elapsedSeconds !== 'number' || !Number.isFinite(o.elapsedSeconds)) return false
  if (!Array.isArray(o.usedIds) || !o.usedIds.every((id) => typeof id === 'string')) return false
  return true
}

export function loadProgress(): SavedWordScramble | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isValid(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function saveProgress(p: SavedWordScramble): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
  } catch {
    // storage unavailable — play continues without persistence
  }
}
```

- [ ] **Step 4: Run, verify pass**

```bash
npx vitest run lib/games/word-scramble/storage.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/games/word-scramble/storage.ts lib/games/word-scramble/storage.test.ts
git commit -m "feat: word-scramble localStorage persistence (word-scramble-progress-v1)"
```

---

### Task 6: ScrambleBoard component

Presentational board: answer slots, letter tray, controls, keyboard handling. All game state lives in the container (Task 7); the board maps a `WordState` to buttons and callbacks.

**Files:**
- Create: `components/games/word-scramble/scramble-board.tsx`
- Test: `components/games/word-scramble/scramble-board.test.tsx`

**Interfaces:**
- Consumes: `WordState`, `type` only, from `@/lib/games/word-scramble/engine`.
- Produces:

```tsx
export interface ScrambleBoardProps {
  ws: WordState
  wordDone: boolean   // true during the solved-word accent flash
  onPlace: (tile: number) => void
  onReturn: (slot: number) => void
  onShuffle: () => void
  onHint: () => void
  onClear: () => void
}
export function ScrambleBoard(props: ScrambleBoardProps): React.JSX.Element
```

Accessibility contract (container tests and e2e rely on these exact labels):
- Slots: group `aria-label="Your answer"`; each slot is a `<button>` labeled `Slot {i+1} of {n}, {letter | 'empty'}` with `, revealed` appended when locked; locked slots get `aria-disabled="true"` and their clicks no-op.
- Tray: group `aria-label="Letter tiles"`; each unplaced tile is a `<button>` labeled `Letter {letter}` (placed tiles are NOT rendered in the tray — the tile visually moves).
- Controls: buttons named exactly `Reveal a letter`, `Shuffle`, `Clear`.
- Keyboard on the board wrapper: a single letter key places the first tray tile with that letter (case-insensitive); Backspace returns the highest-index unlocked filled slot. Handled keys call `preventDefault()`.

- [ ] **Step 1: Write the failing tests**

Create `components/games/word-scramble/scramble-board.test.tsx`:

```tsx
/**
 * RTL tests for the presentational board. State transitions live in the
 * engine; here we assert the WordState → buttons mapping and callbacks.
 */
import { render, screen, fireEvent, within } from '@testing-library/react'
import { ScrambleBoard } from '@/components/games/word-scramble/scramble-board'
import { startWord, placeTile, type WordState } from '@/lib/games/word-scramble/engine'

function renderBoard(ws: WordState, overrides: Partial<Parameters<typeof ScrambleBoard>[0]> = {}) {
  const props = {
    ws,
    wordDone: false,
    onPlace: vi.fn(),
    onReturn: vi.fn(),
    onShuffle: vi.fn(),
    onHint: vi.fn(),
    onClear: vi.fn(),
    ...overrides,
  }
  render(<ScrambleBoard {...props} />)
  return props
}

const ws0 = startWord('HONEY', () => 0.5)

it('renders one slot per letter and one tray tile per unplaced letter', () => {
  renderBoard(ws0)
  const slots = within(screen.getByRole('group', { name: 'Your answer' })).getAllByRole('button')
  expect(slots).toHaveLength(5)
  expect(slots[0]).toHaveAccessibleName('Slot 1 of 5, empty')
  const tray = within(screen.getByRole('group', { name: 'Letter tiles' })).getAllByRole('button')
  expect(tray).toHaveLength(5)
  expect(tray.map((b) => b.textContent).sort().join('')).toBe('EHNOY')
})

it('a placed tile leaves the tray and labels its slot', () => {
  const t = ws0.tray.find((i) => ws0.tiles[i] === 'H')!
  renderBoard(placeTile(ws0, t))
  expect(within(screen.getByRole('group', { name: 'Letter tiles' })).getAllByRole('button')).toHaveLength(4)
  expect(screen.getByRole('button', { name: 'Slot 1 of 5, H' })).toBeInTheDocument()
})

it('tapping a tray tile calls onPlace with its tile index', () => {
  const props = renderBoard(ws0)
  const tray = screen.getByRole('group', { name: 'Letter tiles' })
  fireEvent.click(within(tray).getAllByRole('button', { name: 'Letter H' })[0])
  expect(props.onPlace).toHaveBeenCalledWith(ws0.tiles.indexOf('H'))
})

it('tapping a filled slot calls onReturn with its index', () => {
  const props = renderBoard(placeTile(ws0, ws0.tray[0]))
  const slot = within(screen.getByRole('group', { name: 'Your answer' })).getAllByRole('button')[0]
  fireEvent.click(slot)
  expect(props.onReturn).toHaveBeenCalledWith(0)
})

it('a locked slot is aria-disabled and inert', () => {
  const t = ws0.tray[0]
  const filled = placeTile(ws0, t)
  const lockedWs = { ...filled, locked: filled.locked.map((_, i) => i === 0) }
  const props = renderBoard(lockedWs)
  const slot = within(screen.getByRole('group', { name: 'Your answer' })).getAllByRole('button')[0]
  expect(slot.getAttribute('aria-label')).toContain('revealed')
  expect(slot).toHaveAttribute('aria-disabled', 'true')
  fireEvent.click(slot)
  expect(props.onReturn).not.toHaveBeenCalled()
})

it('controls fire their callbacks', () => {
  const props = renderBoard(ws0)
  fireEvent.click(screen.getByRole('button', { name: 'Reveal a letter' }))
  fireEvent.click(screen.getByRole('button', { name: 'Shuffle' }))
  fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
  expect(props.onHint).toHaveBeenCalled()
  expect(props.onShuffle).toHaveBeenCalled()
  expect(props.onClear).toHaveBeenCalled()
})

it('keyboard: a letter key places the first matching tray tile, Backspace returns the last unlocked filled slot', () => {
  const t = ws0.tray[0]
  const filled = placeTile(ws0, t)
  const props = renderBoard(filled)
  const tray = screen.getByRole('group', { name: 'Letter tiles' })
  fireEvent.keyDown(tray, { key: 'n' })
  expect(props.onPlace).toHaveBeenCalledWith(ws0.tiles.indexOf('N'))
  fireEvent.keyDown(tray, { key: 'Backspace' })
  expect(props.onReturn).toHaveBeenCalledWith(0)
})

it('keyboard ignores letters with no tray tile', () => {
  const props = renderBoard(ws0)
  fireEvent.keyDown(screen.getByRole('group', { name: 'Letter tiles' }), { key: 'z' })
  expect(props.onPlace).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Run, verify fail**

```bash
npx vitest run components/games/word-scramble/scramble-board.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the board**

Create `components/games/word-scramble/scramble-board.tsx`:

```tsx
"use client"

import React from "react"
import type { WordState } from "@/lib/games/word-scramble/engine"

export interface ScrambleBoardProps {
  ws: WordState
  wordDone: boolean
  onPlace: (tile: number) => void
  onReturn: (slot: number) => void
  onShuffle: () => void
  onHint: () => void
  onClear: () => void
}

// Tray tiles are the primary touch path: ≥44px both axes (h-12 = 48px).
// Slots may shrink to ~34px wide for 8-letter hard words at 320px — the
// sudoku board-cell precedent — but keep ≥44px height.
const TILE =
  "h-12 min-w-11 px-2 rounded-lg border border-cream-border dark:border-night-border " +
  "bg-white dark:bg-night-card text-ink dark:text-night-text text-xl " +
  "hover:border-mauve/50 dark:hover:border-mauve-dark/50 " +
  "active:bg-mauve/10 dark:active:bg-mauve-dark/15 transition-colors"

const CONTROL =
  "h-12 rounded-lg border text-[13px] font-[family-name:var(--font-mono)] tracking-wide " +
  "border-cream-border dark:border-night-border text-ink-subtle dark:text-night-muted " +
  "hover:border-mauve/40 dark:hover:border-mauve-dark/40 transition-colors"

export function ScrambleBoard({
  ws, wordDone, onPlace, onReturn, onShuffle, onHint, onClear,
}: ScrambleBoardProps) {
  const n = ws.word.length

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (/^[a-zA-Z]$/.test(e.key)) {
      const letter = e.key.toUpperCase()
      const tile = ws.tray.find((t) => ws.tiles[t] === letter)
      if (tile !== undefined) {
        e.preventDefault()
        onPlace(tile)
      }
      return
    }
    if (e.key === "Backspace") {
      for (let i = n - 1; i >= 0; i--) {
        if (ws.slots[i] !== null && !ws.locked[i]) {
          e.preventDefault()
          onReturn(i)
          return
        }
      }
    }
  }

  return (
    <div className="flex flex-col gap-4" onKeyDown={handleKeyDown}>
      <div role="group" aria-label="Your answer" className="flex justify-center gap-1.5">
        {ws.slots.map((tile, i) => {
          const letter = tile === null ? null : ws.tiles[tile]
          const locked = ws.locked[i]
          const accent = locked || wordDone
          return (
            <button
              key={i}
              type="button"
              aria-disabled={locked || undefined}
              aria-label={`Slot ${i + 1} of ${n}, ${letter ?? "empty"}${locked ? ", revealed" : ""}`}
              onClick={() => { if (!locked) onReturn(i) }}
              className={`h-11 w-9 min-[360px]:w-11 rounded-lg border text-xl text-ink dark:text-night-text
                transition-colors ${
                accent
                  ? "border-rosewater/40 dark:border-rosewater-dark/40 bg-rosewater/10 dark:bg-rosewater-dark/12"
                  : letter
                    ? "border-cream-border dark:border-night-border bg-white dark:bg-night-card"
                    : "border-dashed border-cream-border dark:border-night-border"
              }`}
            >
              {letter}
            </button>
          )
        })}
      </div>

      <div role="group" aria-label="Letter tiles" className="flex flex-wrap justify-center gap-2 min-h-12">
        {ws.tray.map((tile) => (
          <button
            key={tile}
            type="button"
            aria-label={`Letter ${ws.tiles[tile]}`}
            onClick={() => onPlace(tile)}
            className={TILE}
          >
            {ws.tiles[tile]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button type="button" onClick={onHint} className={CONTROL}>
          Reveal a letter
        </button>
        <button type="button" onClick={onShuffle} className={CONTROL}>
          Shuffle
        </button>
        <button type="button" onClick={onClear} className={CONTROL}>
          Clear
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run, verify pass**

```bash
npx vitest run components/games/word-scramble/scramble-board.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/games/word-scramble/scramble-board.tsx components/games/word-scramble/scramble-board.test.tsx
git commit -m "feat: word-scramble board — slots, tray, controls, keyboard"
```

---

### Task 7: WordScramble container

The game shell, mirroring `components/games/word-search/word-search.tsx` closely (read it first — the difficulty pills, panels, autosave, quiet timer, render-adjust, and celebrate blocks are copied idioms, not new design).

**Files:**
- Create: `components/games/word-scramble/word-scramble.tsx`
- Test: `components/games/word-scramble/word-scramble.test.tsx`

**Interfaces:**
- Consumes: everything from Tasks 2–6 (exact names in their Interfaces blocks), `WORD_SCRAMBLE_PUZZLES`, `ConfettiBurst` from `@/components/games/confetti`, `SparkRule`, `DIFFICULTY_STYLES`.
- Produces: `export function WordScramble(): React.JSX.Element` (registered in Task 8).

Behavioral contract (each item gets a test):
1. Fresh visit deals a random easy puzzle; header annotation reads `fig. 03 · {theme} · 0/{N} solved`.
2. Solving a word (tapping tray tiles in target order): status announces `{WORD} solved — 1 of {N}`, slots flash accent (wordDone), and after 600ms the next word deals and the solved list shows the word struck through.
3. A full wrong arrangement shows the nudge `Not quite — tap letters to move them back` and leaves tiles in place.
4. `Reveal a letter` locks a slot; repeated hints can finish the word (then it advances like any solve).
5. Autosave: every state change writes `{puzzleId, solvedCount, elapsedSeconds, usedIds}`.
6. Resume honors `solvedCount` (solved list populated, current word dealt fresh); out-of-range `solvedCount` clamps.
7. Resume-of-solved shows the solved panel (heading `Unscrambled all {N}`) with NO confetti canvas.
8. Solving the final word live shows the panel AND mounts the confetti canvas; starting a new puzzle unmounts it.
9. Difficulty pills: instant switch on a fresh board; confirm dialog when progress exists (`solvedCount > 0` or any placed tile); `Keep playing` dismisses.
10. Quiet timer accrues and lands in the autosave.

- [ ] **Step 1: Write the failing tests**

Create `components/games/word-scramble/word-scramble.test.tsx`:

```tsx
/**
 * RTL tests for the WordScramble container. Deterministic: Math.random is
 * pinned so the fallback deal is WORD_SCRAMBLE_PUZZLES[0]; solving taps
 * tray tiles by letter (robust to any scramble order). matchMedia +
 * getContext stubs are file-wide because any live solve mounts
 * ConfettiBurst (established games-test pattern).
 */
import { render, screen, fireEvent, act, within } from '@testing-library/react'
import { WordScramble } from '@/components/games/word-scramble/word-scramble'
import { WORD_SCRAMBLE_PUZZLES } from '@/lib/games/word-scramble-puzzles'
import { STORAGE_KEY } from '@/lib/games/word-scramble/storage'

const puzzle = WORD_SCRAMBLE_PUZZLES[0] // 'se01' with Math.random pinned to 0
const firstWord = puzzle.words[0]
const N = puzzle.words.length

beforeEach(() => {
  vi.spyOn(Math, 'random').mockReturnValue(0)
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }))
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
})

afterEach(() => {
  localStorage.clear()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function seedProgress(overrides: Record<string, unknown> = {}) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    puzzleId: puzzle.id,
    solvedCount: 0,
    elapsedSeconds: 0,
    usedIds: [puzzle.id],
    ...overrides,
  }))
}

// Tap tray tiles spelling `word` left to right.
function tapWord(word: string) {
  const tray = screen.getByRole('group', { name: 'Letter tiles' })
  for (const ch of word) {
    fireEvent.click(within(tray).getAllByRole('button', { name: `Letter ${ch}` })[0])
  }
}

it('deals an easy puzzle with the fig. 03 annotation', () => {
  render(<WordScramble />)
  expect(screen.getByText(`fig. 03 · ${puzzle.theme} · 0/${N} solved`)).toBeInTheDocument()
  expect(screen.getByRole('group', { name: 'Your answer' })).toBeInTheDocument()
})

it('solving a word announces it, then advances to the next after the beat', () => {
  vi.useFakeTimers()
  seedProgress()
  render(<WordScramble />)
  tapWord(firstWord)
  expect(screen.getByRole('status')).toHaveTextContent(`${firstWord} solved — 1 of ${N}`)
  act(() => { vi.advanceTimersByTime(600) })
  expect(screen.getByText(`fig. 03 · ${puzzle.theme} · 1/${N} solved`)).toBeInTheDocument()
  const solvedList = screen.getByRole('list', { name: 'Solved words' })
  expect(within(solvedList).getByText(firstWord).closest('li')!.className).toContain('line-through')
  vi.useRealTimers()
})

it('a full wrong arrangement shows the gentle nudge and keeps the tiles', () => {
  seedProgress()
  render(<WordScramble />)
  // spell the word with its last letter first — guaranteed wrong
  const rotated = firstWord[firstWord.length - 1] + firstWord.slice(0, -1)
  tapWord(rotated)
  expect(screen.getByText('Not quite — tap letters to move them back')).toBeInTheDocument()
  const slots = within(screen.getByRole('group', { name: 'Your answer' })).getAllByRole('button')
  expect(slots[0]).toHaveAccessibleName(`Slot 1 of ${firstWord.length}, ${rotated[0]}`)
})

it('Reveal a letter locks slot 1; enough hints finish the word', () => {
  vi.useFakeTimers()
  seedProgress()
  render(<WordScramble />)
  fireEvent.click(screen.getByRole('button', { name: 'Reveal a letter' }))
  const slots = within(screen.getByRole('group', { name: 'Your answer' })).getAllByRole('button')
  expect(slots[0]).toHaveAccessibleName(`Slot 1 of ${firstWord.length}, ${firstWord[0]}, revealed`)
  for (let i = 1; i < firstWord.length; i++) {
    fireEvent.click(screen.getByRole('button', { name: 'Reveal a letter' }))
  }
  expect(screen.getByRole('status')).toHaveTextContent(`${firstWord} solved — 1 of ${N}`)
  vi.useRealTimers()
})

it('autosaves solved progress', () => {
  vi.useFakeTimers()
  seedProgress()
  render(<WordScramble />)
  tapWord(firstWord)
  act(() => { vi.advanceTimersByTime(600) })
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
  expect(saved.solvedCount).toBe(1)
  expect(saved.puzzleId).toBe(puzzle.id)
  vi.useRealTimers()
})

it('resumes solvedCount with the solved list populated; clamps out-of-range', () => {
  seedProgress({ solvedCount: 2 })
  render(<WordScramble />)
  expect(screen.getByText(`fig. 03 · ${puzzle.theme} · 2/${N} solved`)).toBeInTheDocument()
  const solvedList = screen.getByRole('list', { name: 'Solved words' })
  expect(within(solvedList).getByText(puzzle.words[0])).toBeInTheDocument()
  expect(within(solvedList).getByText(puzzle.words[1])).toBeInTheDocument()
})

it('clamps an oversized solvedCount to solved', () => {
  seedProgress({ solvedCount: 99 })
  render(<WordScramble />)
  expect(screen.getByRole('heading', { name: `Unscrambled all ${N}` })).toBeInTheDocument()
})

it('resume-of-solved shows the panel without confetti', () => {
  seedProgress({ solvedCount: N })
  render(<WordScramble />)
  expect(screen.getByRole('heading', { name: `Unscrambled all ${N}` })).toBeInTheDocument()
  expect(document.querySelector('canvas')).toBeNull()
})

it('solving the last word live shows the panel with confetti; new game clears it', () => {
  vi.useFakeTimers()
  seedProgress({ solvedCount: N - 1 })
  render(<WordScramble />)
  tapWord(puzzle.words[N - 1])
  act(() => { vi.advanceTimersByTime(600) })
  expect(screen.getByRole('heading', { name: `Unscrambled all ${N}` })).toBeInTheDocument()
  expect(document.querySelector('canvas')).not.toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'New puzzle' }))
  fireEvent.click(screen.getByRole('button', { name: 'easy' }))
  expect(document.querySelector('canvas')).toBeNull()
  vi.useRealTimers()
})

describe('difficulty pills', () => {
  it('switch instantly with no progress', () => {
    seedProgress()
    render(<WordScramble />)
    fireEvent.click(screen.getByRole('button', { name: 'Play medium' }))
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).puzzleId).toMatch(/^sm/)
  })

  it('confirm before abandoning progress; Keep playing dismisses', () => {
    seedProgress({ solvedCount: 1 })
    render(<WordScramble />)
    fireEvent.click(screen.getByRole('button', { name: 'Play hard' }))
    expect(screen.getByText('Start a new hard puzzle?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Keep playing' }))
    expect(screen.queryByText('Start a new hard puzzle?')).toBeNull()
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).puzzleId).toBe(puzzle.id)
  })

  it('a placed tile alone counts as progress', () => {
    seedProgress()
    render(<WordScramble />)
    tapWord(firstWord[0])
    fireEvent.click(screen.getByRole('button', { name: 'Play hard' }))
    expect(screen.getByText('Start a new hard puzzle?')).toBeInTheDocument()
  })
})

it('timer accrues while visible and lands in the autosave', () => {
  seedProgress()
  vi.useFakeTimers()
  render(<WordScramble />)
  act(() => { vi.advanceTimersByTime(30_000) })
  expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).elapsedSeconds).toBe(30)
  vi.useRealTimers()
})
```

- [ ] **Step 2: Run, verify fail**

```bash
npx vitest run components/games/word-scramble/word-scramble.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the container**

Create `components/games/word-scramble/word-scramble.tsx`. This mirrors `word-search.tsx` — same header/pills/panels/status JSX with the scramble-specific middle. Full code:

```tsx
"use client"

import React, { useEffect, useState } from "react"
import {
  startWord, placeTile, returnSlot, returnAll, shuffleTray, revealLetter,
  isFilled, isCorrect, pickPuzzle, formatElapsed,
  type WordState, type ScramblePuzzle, type Difficulty,
} from "@/lib/games/word-scramble/engine"
import { loadProgress, saveProgress } from "@/lib/games/word-scramble/storage"
import { WORD_SCRAMBLE_PUZZLES } from "@/lib/games/word-scramble-puzzles"
import { ConfettiBurst } from "@/components/games/confetti"
import { SparkRule } from "@/components/spark-rule"
import { DIFFICULTY_STYLES } from "@/lib/styles"
import { ScrambleBoard } from "./scramble-board"

type Panel = "none" | "new-game" | "solved"

const ADVANCE_MS = 600 // solved-word accent beat before the next word deals

interface InitState {
  puzzle: ScramblePuzzle
  solvedCount: number
  ws: WordState | null // null once the puzzle is solved
  elapsedSeconds: number
  usedIds: string[]
}

// Resume a saved puzzle when the save is valid and its puzzle exists in the
// bank; otherwise auto-start a random easy puzzle (first visit = zero
// friction). usedIds survives even when the saved puzzle doesn't. Storage
// validates shape only; solvedCount clamps here against the resumed puzzle.
// Mid-word tile placement is deliberately not persisted — the current word
// re-deals fresh. Safe outside useEffect: ssr:false (python.tsx precedent).
function initState(): InitState {
  const saved = loadProgress()
  if (saved?.puzzleId) {
    const puzzle = WORD_SCRAMBLE_PUZZLES.find((p) => p.id === saved.puzzleId)
    if (puzzle) {
      const solvedCount = Math.min(saved.solvedCount, puzzle.words.length)
      return {
        puzzle,
        solvedCount,
        ws: solvedCount < puzzle.words.length ? startWord(puzzle.words[solvedCount]) : null,
        elapsedSeconds: saved.elapsedSeconds,
        usedIds: saved.usedIds,
      }
    }
  }
  const { puzzle, usedIds } = pickPuzzle(WORD_SCRAMBLE_PUZZLES, "easy", saved?.usedIds ?? [])
  return { puzzle, solvedCount: 0, ws: startWord(puzzle.words[0]), elapsedSeconds: 0, usedIds }
}

export function WordScramble() {
  const [init] = useState(initState)
  const [puzzle, setPuzzle] = useState(init.puzzle)
  const [solvedCount, setSolvedCount] = useState(init.solvedCount)
  const [ws, setWs] = useState(init.ws)
  const [elapsed, setElapsed] = useState(init.elapsedSeconds)
  const [usedIds, setUsedIds] = useState(init.usedIds)
  // Covers resuming an already-solved saved puzzle on mount.
  const [panel, setPanel] = useState<Panel>(() =>
    init.solvedCount >= init.puzzle.words.length ? "solved" : "none"
  )
  const [confirmSwitch, setConfirmSwitch] = useState<Difficulty | null>(null)
  // True only after a LIVE solve (set in the render-adjust below, which a
  // resumed-solved puzzle never reaches) — gates the one-shot ConfettiBurst
  const [celebrate, setCelebrate] = useState(false)
  // Accent flash on the just-solved word; the advance timer clears it
  const [wordDone, setWordDone] = useState(false)
  const [status, setStatus] = useState("")

  const total = puzzle.words.length
  const solved = solvedCount >= total
  const hasProgress = solvedCount > 0 || (ws !== null && ws.slots.some((t) => t !== null))

  // Adjust panel state during render when the puzzle transitions to solved —
  // React's "adjust state while rendering" pattern (sudoku/word-search
  // precedent). Idempotent via the panel === "none" guard.
  if (solved && panel === "none") {
    setPanel("solved")
    setCelebrate(true) // idempotent on the Cancel re-fire: no remount, no re-burst
    setStatus("All words unscrambled")
  }

  // Autosave — write-through on every state change (tiny payload)
  useEffect(() => {
    saveProgress({ puzzleId: puzzle.id, solvedCount, elapsedSeconds: elapsed, usedIds })
  }, [puzzle, solvedCount, elapsed, usedIds])

  // Quiet timer — accrues while the tab is visible, stops once solved.
  // Never rendered during play; revealed only in the solved panel.
  useEffect(() => {
    if (solved) return
    const id = window.setInterval(() => {
      if (!document.hidden) setElapsed((e) => e + 1)
    }, 1000)
    return () => window.clearInterval(id)
  }, [solved, puzzle.id])

  // The solved-word beat: flash, then advance to the next word (or finish).
  // solvedCount is a dependency on purpose: state updaters must stay pure,
  // so the next word is computed from the closed-over value instead of
  // inside a setSolvedCount updater. A re-run from any dep change while
  // wordDone is false just early-returns.
  useEffect(() => {
    if (!wordDone) return
    const id = window.setTimeout(() => {
      setWordDone(false)
      const next = solvedCount + 1
      setSolvedCount(next)
      setWs(next < total ? startWord(puzzle.words[next]) : null)
    }, ADVANCE_MS)
    return () => window.clearTimeout(id)
  }, [wordDone, solvedCount, puzzle, total])

  const afterMove = (next: WordState) => {
    setWs(next)
    if (!isFilled(next)) return
    if (isCorrect(next)) {
      setWordDone(true)
      setStatus(`${next.word} solved — ${solvedCount + 1} of ${total}`)
    } else {
      setStatus("Not quite — tap letters to move them back")
    }
  }

  const handlePlace = (tile: number) => {
    if (!ws || wordDone || solved) return
    const next = placeTile(ws, tile)
    if (next !== ws) afterMove(next)
  }

  const handleReturn = (slot: number) => {
    if (!ws || wordDone || solved) return
    setWs(returnSlot(ws, slot))
  }

  const handleShuffle = () => {
    if (!ws || wordDone || solved) return
    const next = shuffleTray(ws, Math.random)
    if (next !== ws) {
      setWs(next)
      setStatus("Letters shuffled")
    }
  }

  const handleHint = () => {
    if (!ws || wordDone || solved) return
    const next = revealLetter(ws)
    if (next === ws) return
    if (isCorrect(next)) {
      setWs(next)
      setWordDone(true)
      setStatus(`${next.word} solved — ${solvedCount + 1} of ${total}`)
    } else {
      setWs(next)
      setStatus("Revealed a letter")
    }
  }

  const handleClear = () => {
    if (!ws || wordDone || solved) return
    const next = returnAll(ws)
    if (next !== ws) {
      setWs(next)
      setStatus("Letters returned")
    }
  }

  const startNewGame = (difficulty: Difficulty) => {
    const { puzzle: nextPuzzle, usedIds: nextUsed } = pickPuzzle(
      WORD_SCRAMBLE_PUZZLES, difficulty, usedIds
    )
    setPuzzle(nextPuzzle)
    setSolvedCount(0)
    setWs(startWord(nextPuzzle.words[0]))
    setUsedIds(nextUsed)
    setElapsed(0)
    setPanel("none")
    setConfirmSwitch(null)
    setCelebrate(false)
    setWordDone(false)
    setStatus(`New ${difficulty} puzzle`)
  }

  // Difficulty pills: instant switch when nothing is at stake, confirm
  // first when real progress would be abandoned (word-search precedent).
  const pickDifficulty = (d: Difficulty) => {
    if (d === puzzle.difficulty && !solved) return
    if (hasProgress && !solved) {
      setPanel("none")
      setConfirmSwitch(d)
      return
    }
    startNewGame(d)
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-10 lg:px-12">
      <header className="mb-4 flex items-baseline justify-between gap-3">
        <p className="flex items-baseline gap-1.5">
          <span className="font-[family-name:var(--font-mono)] text-[13px] text-peach dark:text-peach-dark">
            03/
          </span>
          <span
            className="font-[family-name:var(--font-display)] text-xl text-ink dark:text-night-text"
            style={{ textShadow: "none" }}
          >
            Word Scramble
          </span>
        </p>
        <p className="font-[family-name:var(--font-mono)] text-[12px] text-ink-subtle dark:text-night-muted">
          fig. 03 · {puzzle.theme} · {solvedCount}/{total} solved
        </p>
      </header>

      <div role="group" aria-label="Difficulty" className="mb-4 flex gap-2 lg:justify-center">
        {(["easy", "medium", "hard"] as const).map((d) => (
          <button
            key={d}
            type="button"
            aria-label={`Play ${d}`}
            aria-pressed={d === puzzle.difficulty}
            onClick={() => pickDifficulty(d)}
            className={`h-11 px-4 rounded-full border text-[13px]
              font-[family-name:var(--font-mono)] tracking-wide transition-colors ${
              d === puzzle.difficulty
                ? `${DIFFICULTY_STYLES[d]} text-ink dark:text-night-text/80`
                : "border-cream-border dark:border-night-border text-ink-subtle dark:text-night-muted hover:border-mauve/40 dark:hover:border-mauve-dark/40 hover:text-ink dark:hover:text-night-text"
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-center gap-6 lg:gap-10">
        <div className="w-full max-w-[420px] sm:max-w-[480px] mx-auto lg:mx-0">
          {ws && (
            <ScrambleBoard
              ws={ws}
              wordDone={wordDone}
              onPlace={handlePlace}
              onReturn={handleReturn}
              onShuffle={handleShuffle}
              onHint={handleHint}
              onClear={handleClear}
            />
          )}
          {ws && isFilled(ws) && !isCorrect(ws) && !wordDone && (
            <p className="mt-3 text-center text-[13px] font-[family-name:var(--font-mono)]
              text-ink-subtle dark:text-night-muted">
              Not quite — tap letters to move them back
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
                Unscrambled all {total}
              </h2>
              <p className="font-[family-name:var(--font-mono)] text-[13px]
                text-ink-subtle dark:text-night-muted mb-5">
                {formatElapsed(elapsed)} · {puzzle.theme} · {puzzle.difficulty}
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
              {hasProgress && !solved && (
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
          ) : confirmSwitch ? (
            <div className="rounded-xl border border-cream-border dark:border-night-border
              bg-white dark:bg-night-card p-4 flex flex-col gap-3">
              <p className="font-[family-name:var(--font-mono)] text-[13px] tracking-wide uppercase
                text-ink-subtle dark:text-night-muted">
                Start a new {confirmSwitch} puzzle?
              </p>
              <p className="text-[13px] text-red dark:text-red-dark">
                This abandons your current puzzle.
              </p>
              <button
                type="button"
                onClick={() => startNewGame(confirmSwitch)}
                className={`h-12 rounded-lg border text-[13px]
                  font-[family-name:var(--font-mono)] tracking-wide
                  text-ink dark:text-night-text/80 transition-colors ${DIFFICULTY_STYLES[confirmSwitch]}`}
              >
                Start {confirmSwitch} puzzle
              </button>
              <button
                type="button"
                onClick={() => setConfirmSwitch(null)}
                className="h-11 rounded-lg text-[13px] font-[family-name:var(--font-mono)]
                  text-ink-subtle dark:text-night-muted hover:text-ink dark:hover:text-night-text
                  transition-colors"
              >
                Keep playing
              </button>
            </div>
          ) : (
            <>
              {solvedCount > 0 && (
                <ul aria-label="Solved words" className="flex flex-wrap gap-x-4 gap-y-2">
                  {puzzle.words.slice(0, solvedCount).map((w) => (
                    <li
                      key={w}
                      className="inline-flex items-center gap-1.5 font-[family-name:var(--font-mono)]
                        text-[13px] tracking-wide line-through text-ink-subtle/70 dark:text-night-muted/70"
                    >
                      <span aria-hidden="true" className="h-2 w-2 rounded-full bg-peach dark:bg-peach-dark" />
                      {w}
                      <span className="sr-only">, solved</span>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                onClick={() => setPanel("new-game")}
                className={`${solvedCount > 0 ? "mt-4" : ""} w-full h-11 rounded-lg border
                  border-cream-border dark:border-night-border
                  text-[13px] font-[family-name:var(--font-mono)] tracking-wide
                  text-ink-subtle dark:text-night-muted hover:text-ink dark:hover:text-night-text
                  hover:border-mauve/40 dark:hover:border-mauve-dark/40 transition-colors`}
              >
                New game
              </button>
            </>
          )}
        </div>
      </div>
      {celebrate && <ConfettiBurst />}
      <div role="status" className="sr-only">{status}</div>
    </div>
  )
}
```

Note the nudge text appears BOTH as the sr status and as visible text under the board — the visible copy is derived state (`isFilled && !isCorrect && !wordDone`), the status is set once in `afterMove` (no announcement churn).

- [ ] **Step 4: Run, verify pass**

```bash
npx vitest run components/games/word-scramble/word-scramble.test.tsx
```

Expected: PASS. If the "advance" test flakes on the timer, check that `vi.useFakeTimers()` is called BEFORE `render` in that test (the advance setTimeout must be a fake timer).

- [ ] **Step 5: Run the full unit suite**

```bash
npm test
```

Expected: all pass (no regressions).

- [ ] **Step 6: Commit**

```bash
git add components/games/word-scramble/word-scramble.tsx components/games/word-scramble/word-scramble.test.tsx
git commit -m "feat: word-scramble container — shell, autosave, hints, celebrate gating"
```

---

### Task 8: Registration — union, GAMES entry, registries, illustration

**Files:**
- Modify: `lib/games/games.ts` (union + entry)
- Modify: `components/games/dynamic-games.tsx` (dynamic export)
- Modify: `app/games/[slug]/page.tsx` (GAME_COMPONENTS)
- Modify: `app/games/page.tsx` (illustration + ILLUSTRATIONS)

**Interfaces:**
- Consumes: `WordScramble` from Task 7.
- Produces: `/games/word-scramble` route live; `/games` index shows the 03 card.

- [ ] **Step 1: Extend the union and GAMES array**

In `lib/games/games.ts`:

```ts
export type GameSlug = 'sudoku' | 'word-search' | 'word-scramble'
```

and append to `GAMES`:

```ts
  {
    slug: 'word-scramble',
    title: 'Word Scramble',
    number: '03',
    description: 'Unscramble themed words tile by tile — hints when you want them, and your game saves itself.',
    accent: 'rosewater',
  },
```

- [ ] **Step 2: Verify the compile gate fires**

```bash
npx tsc --noEmit
```

Expected: ERRORS in `app/games/[slug]/page.tsx` (GAME_COMPONENTS) and `app/games/page.tsx` (ILLUSTRATIONS) — missing `'word-scramble'` key. This is the registry gate doing its job; if tsc passes here, the Record types have been weakened — stop and investigate.

- [ ] **Step 3: Register the dynamic component**

Append to `components/games/dynamic-games.tsx`:

```tsx
// Word scramble is ssr: false for the same reason: saved progress restores
// from localStorage (and the tray scrambles with Math.random) in a useState
// initializer.
export const WordScramble = dynamic(
  () => import('./word-scramble/word-scramble').then((m) => ({ default: m.WordScramble })),
  { ssr: false }
)
```

In `app/games/[slug]/page.tsx`, extend the import and registry:

```tsx
import { Sudoku, WordSearch, WordScramble } from '@/components/games/dynamic-games'

const GAME_COMPONENTS: Record<GameSlug, React.ComponentType> = {
  sudoku: Sudoku,
  'word-search': WordSearch,
  'word-scramble': WordScramble,
}
```

- [ ] **Step 4: Add the index illustration**

In `app/games/page.tsx`, add below `WordSearchIllustration` (rosewater letter-tile motif: three drawn tile rects, a swap arc between the first two, accent dots — draw-stroke on solid strokes only, learn-card pattern):

```tsx
// Letter-tile motif with a swap: three drawn tiles, an arc trading the
// first two, accent dots at the arc's ends.
function WordScrambleIllustration() {
  return (
    <svg width="80" height="64" viewBox="0 0 80 64" aria-hidden="true" focusable="false">
      {[14, 34, 54].map((x, i) => (
        <rect key={x} x={x} y="30" width="14" height="14" rx="2" fill="none" stroke="currentColor"
          strokeWidth="2" className="text-rosewater dark:text-rosewater-dark draw-stroke"
          pathLength={100} style={{ animationDelay: `${i * 120}ms` }} />
      ))}
      <path d="M21 26 C 26 12, 56 12, 61 26" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" className="text-mauve dark:text-mauve-dark draw-stroke"
        pathLength={100} style={{ animationDelay: '360ms' }} />
      <path d="M57 22 L 61 26 L 55 27" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"
        className="text-mauve dark:text-mauve-dark draw-stroke" pathLength={100}
        style={{ animationDelay: '480ms' }} />
      <circle cx="21" cy="26" r="3" className="fill-peach dark:fill-peach-dark" />
      <circle cx="41" cy="52" r="3" className="fill-lavender dark:fill-lavender-dark" opacity="0.7" />
    </svg>
  )
}
```

and extend the registry:

```tsx
const ILLUSTRATIONS: Record<GameSlug, React.ReactNode> = {
  sudoku: <SudokuIllustration />,
  'word-search': <WordSearchIllustration />,
  'word-scramble': <WordScrambleIllustration />,
}
```

- [ ] **Step 5: Verify everything compiles and passes**

```bash
npx tsc --noEmit && npm test && npm run build
```

Expected: tsc clean, all unit tests pass, build succeeds (the new route appears in the build output under /games/[slug]).

- [ ] **Step 6: Commit**

```bash
git add lib/games/games.ts components/games/dynamic-games.tsx app/games/[slug]/page.tsx app/games/page.tsx
git commit -m "feat: register word scramble as game 03 — route, card, illustration"
```

---

### Task 9: E2E, docs, final verification

**Files:**
- Modify: `e2e/games.spec.ts` (append)
- Modify: `CLAUDE.md` (games section + file structure)

- [ ] **Step 1: Append the e2e specs**

Append to `e2e/games.spec.ts` (imports go at the top with the existing ones):

```ts
import { WORD_SCRAMBLE_PUZZLES } from '../lib/games/word-scramble-puzzles'
import { STORAGE_KEY as SCRAMBLE_KEY } from '../lib/games/word-scramble/storage'
```

and at the bottom:

```ts
// Word scramble — deterministic via the same sessionStorage-guarded
// addInitScript seeding as word search above.
const SC_PUZZLE = WORD_SCRAMBLE_PUZZLES[0]
const SC_WORD = SC_PUZZLE.words[0]

async function seedWordScramble(page: import('@playwright/test').Page) {
  await page.addInitScript(
    ([key, value]) => {
      if (!sessionStorage.getItem('__sc_e2e_seeded')) {
        localStorage.setItem(key, value)
        sessionStorage.setItem('__sc_e2e_seeded', '1')
      }
    },
    [SCRAMBLE_KEY, JSON.stringify({
      puzzleId: SC_PUZZLE.id, solvedCount: 0, elapsedSeconds: 0, usedIds: [SC_PUZZLE.id],
    })] as const
  )
}

test('word scramble: tapping tiles in order solves the first word', async ({ page }) => {
  await seedWordScramble(page)
  await page.goto('/games/word-scramble')
  const tray = page.locator('[role="group"][aria-label="Letter tiles"]')
  await expect(tray.getByRole('button')).toHaveCount(SC_WORD.length, { timeout: 30_000 })

  for (const ch of SC_WORD) {
    await tray.getByRole('button', { name: `Letter ${ch}`, exact: true }).first().click()
  }
  // after the 600ms beat the word lands in the solved list
  await expect(
    page.locator('ul[aria-label="Solved words"] li', { hasText: SC_WORD })
  ).toBeVisible()
})

test('word scramble: solved words survive reload', async ({ page }) => {
  await seedWordScramble(page)
  await page.goto('/games/word-scramble')
  const tray = page.locator('[role="group"][aria-label="Letter tiles"]')
  await expect(tray.getByRole('button')).toHaveCount(SC_WORD.length, { timeout: 30_000 })
  for (const ch of SC_WORD) {
    await tray.getByRole('button', { name: `Letter ${ch}`, exact: true }).first().click()
  }
  await expect(page.locator('ul[aria-label="Solved words"] li', { hasText: SC_WORD })).toBeVisible()
  await page.reload()
  await expect(
    page.locator('ul[aria-label="Solved words"] li', { hasText: SC_WORD })
  ).toBeVisible({ timeout: 30_000 })
})

test('games index shows the word scramble card', async ({ page }) => {
  await page.goto('/games')
  await expect(page.getByRole('heading', { name: 'Word Scramble' })).toBeVisible({ timeout: 30_000 })
})
```

- [ ] **Step 2: Run the games e2e suite**

```bash
npx playwright test e2e/games.spec.ts
```

Expected: all pass (existing 7 + new 3). The console-error fixture is auto — any page error fails the test.

- [ ] **Step 3: Update CLAUDE.md**

Two edits:
1. In the **Metadata-driven /games section** bullet: update the `GameSlug` union mention to `('sudoku' | 'word-search' | 'word-scramble')`, and append a Word Scramble sentence covering: game 03, engine in `lib/games/word-scramble/engine.ts` (tile-identity model: slots hold tile indexes so duplicate letters stay distinct), runtime scrambles (bank stores words only — Shuffle re-scrambles anyway), 90-puzzle bank GENERATED by `scripts/generate-word-scramble-puzzles.mjs` (SEED=13, length-ranked theme slices, no intra-puzzle anagram pairs, asserted at generation + re-proven in tests), themes shared via `scripts/word-themes.mjs` (order is load-bearing for the word-search PRNG stream), hint = `revealLetter` (locks correct letters, never wasted on already-correct slots), progress key `word-scramble-progress-v1` storing `solvedCount` only (mid-word placement deliberately not persisted).
2. In **File Structure**: add `word-scramble/` under `components/games/` (word-scramble.tsx, scramble-board.tsx), `word-scramble-puzzles.ts` + `word-scramble/` (engine.ts, storage.ts) under `lib/games/`, `generate-word-scramble-puzzles.mjs` + `word-themes.mjs` under `scripts/`, and update the client-components list (word-scramble, scramble-board).

- [ ] **Step 4: Full verification sweep**

```bash
npm test && npm run lint && npx tsc --noEmit && npm run build && npx playwright test e2e/games.spec.ts
```

Expected: unit suite all pass; lint shows ONLY the 2 documented pre-existing errors (interactive-headshot, masonry-grid); tsc clean; build clean; e2e all pass.

- [ ] **Step 5: Browser verification (dev server via the in-app preview or Playwright)**

- `/games` index: 03 card renders, illustration draws on reveal.
- `/games/word-scramble` at 390×844: play one word end to end by tapping; trigger a wrong fill (nudge appears); use Reveal a letter (slot locks with rosewater tint); Shuffle (tray reorders); solve a full easy puzzle → solved panel + confetti.
- 320×568: hard puzzle (8-letter words) — `document.documentElement.scrollWidth === 320`, no horizontal scroll.
- Light + dark themes; console clean.
- Note: the in-app preview pane reports `window.innerWidth = 0` while hidden, which zero-sizes canvases (LivingField and confetti) — use Playwright at a real viewport for confetti verification (games-polish PR precedent).

- [ ] **Step 6: Commit**

```bash
git add e2e/games.spec.ts CLAUDE.md
git commit -m "test+docs: word-scramble e2e coverage and CLAUDE.md patterns"
```

---

## Completion

After Task 9, all of: unit suite green, lint at baseline, tsc clean, build clean, e2e green, browser-verified at phone sizes. Then use superpowers:finishing-a-development-branch — push `feat/games-word-scramble`, open the PR (summary + test notes + verification evidence, matching PR #26/#27/#28 style), and stop for Amir's review.
