# Word Search (game 02) — Design

**Date:** 2026-08-28
**Status:** Approved (brainstormed 2026-08-28; mom-requested after playing Sudoku)
**Scope:** Add Word Search as `/games/word-search`, the second game in the unlisted
/games section, reusing every pattern the Sudoku build established (see
`2026-08-28-games-sudoku-design.md` + its addendum — that spec governs anything
not restated here: unlisted-ness, storage validation rules, difficulty-pill
semantics, timer model, reduced-motion, CSP/no-deps constraints).

## Problem

Amir's mom finished her first ad-free Sudoku and asked for a word search next.
The /games architecture was built for exactly this: one component + one
`GAMES` entry. The open design work was gameplay, not architecture — decided
below.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Content | **Themed puzzles** | 8 hand-curated, family-friendly themes; each puzzle titled by its theme. Feels like a puzzle book; the annotation writes itself ("fig. 02 · Garden · 4/12 found"). |
| Difficulty | **Size + directions** | easy 8×8, 8 words, → and ↓ only; medium 10×10, 10 words, + diagonals (↘ ↗); hard 12×12, 12 words, + backwards (all 8 directions). The classic axes; the difficulty pills carry over unchanged. |
| Selection | **Drag + tap-ends** | Swipe first→last letter (snapped to straight lines) AND tap-first-then-tap-last. Drag is the natural gesture; tap-ends is forgiving for imprecise touches and doubles as the keyboard model. Either read direction of a line counts. |
| Rendering | **DOM grid, per-cell found tints** | Same accessibility story as the Sudoku board. Found words tint their cells, cycling the five Catppuccin accents. SVG capsule overlays (puzzle-book ovals) deferred to a possible v1.1 polish. Canvas rejected (loses DOM a11y). |
| Wrong guess | **Selection just clears** | No error state, no shake — this is a relaxing game; a miss is not a mistake. |
| Bank | **30 puzzles/difficulty, committed** | ~90 puzzles ≈ 25KB source, generated deterministically, imported only by the word-search chunk. |

## Architecture

Mirrors Sudoku exactly:

```
lib/games/word-search/
  engine.ts               # Pure logic: line snapping, attempt validation, found bookkeeping
  engine.test.ts
  puzzles.test.ts         # Bank integrity over the committed puzzles
  storage.ts              # word-search-progress-v1 (validated load/save, sudoku pattern)
  storage.test.ts
lib/games/word-search-puzzles.ts   # GENERATED — 90 puzzles, committed
scripts/generate-word-search-puzzles.mjs
components/games/word-search/
  word-search.tsx         # Container: state, persistence, timer, pills, panels
  grid.tsx                # Letter grid: pointer drag + tap-ends + keyboard
  word-list.tsx           # Compact themed word list with found/struck state
```

- `GAMES` gains `{ slug: 'word-search', number: '02', title: 'Word Search', accent: 'lavender' }`;
  registered in `dynamic-games.tsx` (ssr:false — localStorage lazy init) and
  `GAME_COMPONENTS`; index page gains a drawn illustration (mini letter grid
  with one highlighted diagonal run). No routeProfile/nav/sitemap/CSP changes —
  the /games-wide rules already cover the new route.
- **Engine core types:**
  `WordSearchPuzzle { id, difficulty, theme, size, grid, words: string[], placements: { word, row, col, dRow, dCol }[] }`;
  `FoundWord { word, cells: number[] }`. Key functions:
  `snapLine(size, anchor, current) → number[] | null` (cells along the straight
  line from anchor toward current, snapped to the nearest of 8 directions;
  null when anchor === current), `readLine(grid, cells) → string`,
  `attempt(puzzle, found, cells) → FoundWord | null` (letters along the cells,
  read forwards or backwards, match an unfound target), `isComplete(puzzle, found)`.
- All selection geometry is pure engine math — the pointer/keyboard handlers in
  `grid.tsx` are thin adapters (jsdom can't test `elementFromPoint`, so the
  logic must live where vitest reaches it; the drag path gets a real-browser
  e2e test instead).

## Bank + generator

`scripts/generate-word-search-puzzles.mjs` — LCG (sudoku pattern), fixed SEED,
committed output, never hand-edited:

- **Themes (8):** In the Kitchen, Garden, Weather, Travel, Animals, Music,
  Baking, Around Town. 25–40 words each, 4–10 letters, uppercase A–Z only,
  family-friendly. Curated in the generator source.
- **Per puzzle:** theme assigned round-robin within each difficulty (even
  coverage); words sampled without replacement from the theme (skip words
  longer than the grid); placed by random position/direction from the
  difficulty's direction set with overlap allowed (shared letters must match);
  unplaceable word → resample; unfillable puzzle → restart from a new subseed.
  Remaining cells fill with weighted-random letters.
- **Assertions (generation fails loudly):** grid is size² of A–Z; every word
  appears at its stored placement; **no target word is readable along any
  straight line anywhere else in the grid, in either direction** (a reversed
  accidental occurrence is just as findable as a forward one — re-roll fill
  letters until unique) — found-word highlighting is therefore always
  unambiguous; word counts match the difficulty; ids unique
  (`we01…we30`, `wm01…wm30`, `wh01…wh30`).
- Direction sets: easy `E,S`; medium `E,S,SE,NE`; hard all 8.

## Play UX

Same shell as Sudoku, adapted:

- Header: `02/ Word Search` + `fig. 02 · {theme} · {found}/{total} found`.
- **Difficulty pills** identical in look and semantics (instant switch on a
  fresh or finished puzzle; confirm panel mid-puzzle; current pill = no-op).
  "Progress" = at least one word found.
- **Grid:** uppercase mono letters, aspect-square, sized like the Sudoku board
  (`max-w-[420px] sm:max-w-[480px]`, cells scale with grid size);
  `touch-action: none` on the grid only. Drag paints a live mauve-tinted
  preview along the snapped line and attempts on release. Tap-ends: first tap
  ring-highlights the anchor; second tap attempts; tapping the anchor again
  clears it. Correct → the word's cells take the next accent in the cycle
  (sapphire → mauve → peach → lavender → rosewater, repeating) and persist;
  wrong → preview clears, nothing else.
- **Word list** in the Sudoku pad's slot: below the grid on mobile, the right
  column at lg. Compact mono flex-wrap items; found words struck through in
  muted ink with a small accent dot matching their cells' tint (accent text
  alone fails AA on the lighter accents). The confirm/new-game/solved panels swap in
  place of the word list exactly as Sudoku's panels swap in place of the pad.
  No reveal/hint button in v1.
- **Completion:** all words found → solved panel (SparkRule flourish,
  "Found all {n}", `{elapsed} · {theme} · {difficulty}`, New puzzle button).
  Quiet timer identical to Sudoku (1s, pauses hidden, shown only here).
- New-game panel copy: "New game — pick a difficulty" + the same abandon
  warning, reused verbatim from Sudoku's structure.

## Persistence

`word-search-progress-v1`, sudoku's storage pattern (lazy init, try/catch,
shape validation, corrupt → fresh):

```ts
{ puzzleId: string | null, found: { word: string, cells: number[] }[],
  elapsedSeconds: number, usedIds: string[] }
```

Found cells are stored exactly as selected so resume repaints her actual finds.
Validation splits like Sudoku's: `storage.ts` validates SHAPE only (strings,
number arrays, no bank import — keeps the module cheap for game-card); the
component's restore path drops any found entry whose word isn't in the resumed
puzzle or whose cell indices are out of range for its size. No settings object
(no mistakes-toggle equivalent). `game-card.tsx`'s `hasProgress` gains the
word-search slug, reading only this module's `STORAGE_KEY`.

## Accessibility

- Grid cells: `role="gridcell"` buttons, roving tabindex, arrows move,
  **Enter anchors then completes** (keyboard = tap-ends model), Escape clears
  the anchor. Cell labels: "Row 3, column 5, letter G" (+ ", selected" on the
  anchor; found membership is decorative tint only — the word list carries
  found semantics).
- Word list items: `<li>` with visible strikethrough + sr-only ", found".
- sr-only `role="status"`: "Found GARDEN — 8 of 12", "Anchor set at row 3,
  column 5", "Not a word — cleared", "All words found".
- Reduced motion: no preview animation, tints apply instantly, solved flourish
  static. Touch targets: pills/panel buttons inherit Sudoku's ≥44px; grid
  cells exempt (contiguous grid, same ruling as Sudoku).

## Testing

- **engine.test.ts:** snapLine (all 8 directions, off-axis snapping to the
  dominant direction, single-cell null), readLine, attempt (forwards,
  backwards, already-found dedupe, non-word), isComplete.
- **storage.test.ts:** round-trip, corrupt/shape rejection incl. found-cells
  out of range.
- **puzzles.test.ts:** 90 puzzles, ids unique, grids size² A–Z, every stored
  placement spells its word, counts per difficulty, no-second-occurrence spot
  check re-verified in test (cheap scan).
- **RTL (word-search.test.tsx):** tap-ends find flow (anchor → complete →
  tinted + struck + status), wrong pair clears, resume repaints found words,
  difficulty pills instant/confirm flows, completion panel, autosave payloads.
- **e2e (extend games.spec.ts):** real pointer-drag finds a word (bank
  imported to locate a placement), tap-ends finds another, reload resumes the
  found state, index shows the 02 card.
- Manual: 390×844 primary + 320 floor, dark mode tint contrast, keyboard
  walk, reduced motion.

## Out of scope (v1)

SVG capsule overlays, hints/reveal, personal/family themes (option offered,
not chosen — easy later: add a theme list to the generator), per-slug OG
images, PWA. The 3D word search idea remains a separate future game.
