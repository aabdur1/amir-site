# Word Scramble (game 03) — Design

**Date:** 2026-08-29
**Status:** Approved by Amir (structure, input, assists, bank approach each confirmed)
**Audience:** Amir's mom (iPhone 13 Pro, 390×844) — ad-free, no-pressure play, same as games 01/02.

## Goal

Third game in the unlisted `/games` section: a themed word scramble (jumble).
A puzzle is one theme's set of scrambled words, solved one word at a time by
tapping letter tiles into answer slots. Mirrors the sudoku/word-search
architecture end to end: committed deterministic bank, pure unit-tested
engine, localStorage autosave, difficulty pills with confirm-on-abandon,
quiet timer, solved panel with SparkRule + ConfettiBurst.

## Decisions (made with Amir, 2026-08-29)

1. **Puzzle shape:** themed set of words (not endless single words, not a
   daily word) — gives a real solved state for the panel/confetti and fits
   pickPuzzle/resume.
2. **Input:** tap letter tiles (no drag, no text field/system keyboard).
3. **Assists:** unlimited "Reveal a letter" hint + "Shuffle" re-scramble, no
   penalty; the timer stays quiet (revealed only on the solved panel).
4. **Bank:** approach A — committed generated bank of `{id, difficulty,
   theme, words[]}`; scrambled *orderings* are runtime (the Shuffle button
   needs runtime re-scrambling anyway, so stored scrambles would be dead
   weight).

## Puzzle bank

- **Source words:** the 8 curated themes (28 words each) already in
  `scripts/generate-word-search-puzzles.mjs`. The `THEMES` array moves to a
  shared module `scripts/word-themes.mjs` imported by both generators, so the
  lists stay single-source (word-search output stays byte-identical — same
  data, same iteration order).
- **Generator:** `scripts/generate-word-scramble-puzzles.mjs` — deterministic
  LCG, **SEED=13**, same recipe as SEED=7 (sudoku) / SEED=11 (word search).
  Writes committed `lib/games/word-scramble-puzzles.ts`. Never hand-edit.
- **Shape:** 90 puzzles, 30 per difficulty, themes round-robin. Ids
  `se01…se30`, `sm01…sm30`, `sh01…sh30`.
- **Word selection:** per theme, rank words by length, ties alphabetical
  (deterministic). Easy puzzles draw **6 words from the shortest 10**,
  medium **7 from the middle 10** (ranks 10–19), hard **8 from the longest
  10**. Measured bands this yields: easy ≈ 4–6 letters, medium ≈ 5–7,
  hard ≈ 6–8. Different puzzles of the same theme+difficulty use different
  seeded samples of their slice; words may repeat across puzzles (sudoku
  precedent), never within one.
- **Generation-time assertions, re-proven in `puzzles.test.ts`:** 30/30/30
  split; ids unique; every puzzle's words distinct, ≥4 letters, members of
  the correct slice of the correct theme; **no two words within a puzzle are
  anagrams of each other** (so a filled arrangement can never match a
  different target from the same puzzle; verified today: the source themes
  contain zero intra-theme anagram pairs, so this assertion is currently
  free and guards future list edits).

## Engine — `lib/games/word-scramble/engine.ts` (pure, unit-tested)

```ts
export type Difficulty = 'easy' | 'medium' | 'hard'

export interface ScramblePuzzle {
  id: string
  difficulty: Difficulty
  theme: string
  words: string[]          // solve order as stored
}

export interface WordState {
  word: string             // the target
  tiles: string[]          // scrambled letters, tray order
  slots: (number | null)[] // slot i holds tiles-index or null
  locked: boolean[]        // hint-revealed slots; length === word.length
}
```

Transitions (all immutable; no-ops return the SAME object, engine
convention):

- `scramble(word, rand)` → shuffled letter array that differs from the word
  (re-roll, capped attempts; cap unreachable for real words with ≥2 distinct
  letters — on cap, return the last shuffle rather than loop).
- `startWord(word, rand)` → fresh `WordState` with scrambled tiles, empty
  slots, no locks.
- `placeTile(ws, tileIndex)` → tile into the **lowest empty slot**; no-op if
  that tile is already placed or the word is full.
- `returnSlot(ws, slotIndex)` → sends that slot's tile back to the tray;
  no-op on empty or locked slots.
- `returnAll(ws)` → clears every unlocked slot (used by the wrong-guess
  "start over" affordance and by Shuffle's precondition — see UX).
- `shuffleTray(ws, rand)` → re-scrambles the *unplaced* tiles' visual order;
  placed/locked tiles untouched; the tray arrangement must change when more
  than one distinct unplaced letter exists.
- `revealLetter(ws)` → finds the lowest unlocked slot whose held tile is NOT
  the correct letter (or which is empty), locks the correct letter into it:
  prefer an unplaced tray tile with that letter; otherwise evict one from an
  unlocked slot holding it (evicted slot becomes empty). Any tile the reveal
  displaces from the target slot returns to the tray. Already-correct filled
  slots encountered on the way are locked in passing (they were right —
  don't waste the hint on them). No-op when the word is already solved.
- `isFilled(ws)` / `isCorrect(ws)` — full check compares slot letters to the
  target.

Re-exports `pickPuzzle`, `formatElapsed` from `lib/games/shared.ts`
(engine-convention: game code never imports another game's engine).

Duplicate letters are handled by identity (slots hold tile *indexes*, not
letters), so two E tiles are interchangeable for correctness but distinct
for placement/return.

## Play flow / UX

- Shell identical to word-search: header `03/ Word Scramble` +
  `fig. 03 · {theme} · {solved}/{total} solved`, difficulty pills with
  confirm-on-abandon (progress = ≥1 word solved OR any tile placed), New
  game panel, solved panel, sr-only `role=status`.
- **Board** (`scramble-board.tsx`): answer slots row on top (empty slot =
  dashed underline cell; filled = letter tile; locked = accent-tinted,
  non-interactive), tray of scrambled letter tiles below (≥44px targets,
  wrapping rows for 8-letter words at 320px), then a controls row:
  **Reveal a letter** · **Shuffle** · **Clear** (returnAll).
- Tap a tray tile → fills the lowest empty slot. Tap a filled slot → returns
  it. When the last slot fills: **correct** → slots flash the accent, brief
  ~600ms beat, then the next word deals (status: "SPROUT solved — 3 of 6");
  **wrong** → gentle mono nudge under the board: "Not quite — tap letters to
  move them back" (sudoku-nudge tone; no red alarm, no shake), tiles stay.
- Solved words appear as a struck-through mono list (word-list styling,
  muted ink, single peach dot — no FOUND_STYLES promotion, YAGNI).
- Last word solved → solved panel (`Unscrambled all {N}` / elapsed · theme ·
  difficulty / New puzzle) + `ConfettiBurst` behind the same live-solve
  `celebrate` gating as games 01/02 (set in the adjust-during-render block;
  resume-of-solved never bursts; startNewGame unmounts).

## Storage — `lib/games/word-scramble/storage.ts`

Key `word-scramble-progress-v1`: `{ puzzleId, solvedCount, elapsedSeconds,
usedIds }`. Words solve in stored order, so `solvedCount` fully determines
the solved list — no per-word payload. Mid-word tile placement is
deliberately not persisted: resume re-deals a fresh scramble of word
`solvedCount` (word-search precedent — found words persist, the in-flight
gesture doesn't). Shape-check on load like the other storage modules;
out-of-range `solvedCount` clamps to `[0, words.length]`.

## Registration & wiring

- `GameSlug` union += `'word-scramble'` FIRST → `GAME_COMPONENTS`,
  `ILLUSTRATIONS`, and `dynamic-games.tsx` fail to compile until filled.
- `GAMES` entry: number `03`, accent **rosewater** (first rosewater in
  games; sapphire/lavender taken), description in the established voice
  ("Unscramble themed words tile by tile — hints when you want them, and
  your game saves itself.").
- Index illustration: letter-tile motif SVG in `app/games/page.tsx`
  (draw-stroke ornaments consistent with the other two cards).
- Component loads `ssr: false` via `dynamic-games.tsx` (runtime scramble in
  a `useState` initializer — python.tsx precedent), wrapped in
  `GameErrorBoundary`.
- No routeProfile / CSP / sitemap / OG changes: `/games` is already faint in
  LivingField, unlisted-by-omission covers the new slug automatically.

## Accessibility & keyboard

- Tiles and slots are native `<button>`s. Tray tile label: `Letter E`;
  placed-tile buttons vanish from the tray (not aria-disabled — the tile
  visually moves). Slot label: `Slot 2 of 6, letter E` / `empty` /
  `revealed`. Locked slots are `aria-disabled`.
- Keyboard: typing a letter places the first unplaced tray tile with that
  letter; Backspace returns the highest unlocked filled slot; the board is
  reachable in tab order without a roving-focus grid (a tray is a row of
  buttons, not a 2D grid — no arrow-key protocol needed).
- `role=status` announces: word solved (always, with progress), puzzle
  solved, hint result, wrong-fill nudge, new game. Individual tile
  placements are NOT announced (sr users hear their own button labels;
  per-tap announcements would be noise — the games a11y-pass lesson).
- Reduced motion: the correct-word flash and any tile transitions are
  CSS-animation based → covered by the global reduced-motion kill; confetti
  already renders null.
- 320px: an 8-letter hard word needs slots narrower than 44px (≈34px wide,
  full ≥44px height) — the sudoku board precedent (9 cells ≈ 35px wide at
  320px, shipped in game 01); tray tiles, the primary touch path, stay
  ≥44px both axes. Verify with
  `document.documentElement.scrollWidth === 320`.

## Testing

TDD throughout (watch each fail first):

1. **Engine unit tests:** scramble ≠ word incl. duplicate-letter words
   (`SEEDS`); place/return/returnAll no-op conventions; shuffleTray leaves
   placed tiles and changes tray order; revealLetter's tray-first,
   evict-second, lock-corrects-in-passing behavior; isCorrect with
   duplicate letters swapped (must pass — identity-independent).
2. **Bank test** (`puzzles.test.ts`): re-prove every generation assertion.
3. **Storage tests:** round-trip, shape rejection, solvedCount clamp.
4. **RTL container tests:** deal → tap-solve a word → progress + status;
   wrong fill shows nudge and keeps tiles; hint reveals and locks; Clear;
   resume mid-puzzle (solvedCount honored, fresh word dealt);
   resume-of-solved shows panel without confetti; live solve bursts; new
   game clears; difficulty pills confirm-on-progress. File-wide
   matchMedia/getContext stubs (established pattern).
5. **E2E:** one spec block in `e2e/games.spec.ts`: index shows the 03 card;
   tap-solve the first word of an easy puzzle for real.
6. **Browser verification:** 390×844 + 320px pass, light + dark, console
   clean.

## Out of scope

- Persisting mid-word tile placement (documented above).
- Streaks/scoring of any kind (design principle: no pressure).
- PWA/offline (separately queued /games v2 item).
- New word themes (reuse only; adding themes is a data change later).
