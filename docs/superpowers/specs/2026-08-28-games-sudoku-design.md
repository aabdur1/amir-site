# /games Section + Sudoku — Design

**Date:** 2026-08-28
**Status:** Approved (brainstormed 2026-08-28)
**Scope:** Add an unlisted, ad-free `/games` section (fourth top-level route) with
Sudoku as game 01, architected so future games (word search, solitaire, a possible
3D word search) are one component + one metadata entry each.

## Problem

Amir's mom plays sudoku, solitaire, and word searches on her phone through apps that
interrupt every move with 15-second ads. The site already has the machinery for
hand-crafted interactive client components (the /learn artifacts) and metadata-driven
sections (/learn, /work). A `/games` route reuses both to give her an ad-free,
frictionless place to play — and doubles as a portfolio statement: hand-built games,
no dependencies, no ads, full Living Ledger treatment.

Primary audience plays on **phone and tablet**. Mobile is the design target;
desktop (with full keyboard play) is the progressive enhancement.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Treatment | **Portfolio-grade Living Ledger**, mom-first interaction design | User chose "portfolio piece too"; the origin story (ad-free games for mom) is itself the statement. Every interaction decision still favors her comfort on a phone. |
| Sudoku scope | **Comfortable classic** | Difficulty picker, pencil notes, undo, erase, mistake highlighting (toggleable), auto-save/resume, completion celebration. No hints engine, no visible timer, no stats/streaks — YAGNI for v1. |
| Puzzle source | **Committed puzzle bank** via generator script | Matches the `generate-sql-seed.mjs` pattern: deterministic LCG, in-script assertions (unique solution per puzzle), committed output. Instant new-game, fully testable, zero runtime generation cost. |
| Discoverability | **Unlinked + noindex** | No nav pill, no sitemap entry, `robots: { index: false }` metadata (404-page precedent). Deliberately NOT in robots.txt disallow — a disallow line would advertise the path. |
| Architecture | **Metadata-driven section mirroring /learn** | `lib/games/games.ts` single source of truth; `/games` index card grid; `/games/[slug]` renders code-split game components. Adding a game later = one component + one array entry. Bookmarks never churn. |
| Layout priority | **Phone portrait → tablet → desktop** | Whole play surface fits one `100dvh` viewport on phones ≥568px tall; side-by-side board+pad at `lg:`; keyboard layer on desktop only as enhancement. |
| Out of scope (v1) | PWA/offline, hints, visible timer, stats, number-first entry, per-slug OG images | Each is a coherent later increment; none blocks mom playing today. |

## Architecture

New files, mirroring the learn/work patterns:

```
lib/games/
  games.ts                  # GAMES array: slug, number, title, description, accent — single source of truth
  sudoku-puzzles.ts         # GENERATED — 180 puzzles (60/difficulty), committed
  sudoku/
    engine.ts               # Pure game logic: board state, moves, notes, undo, conflicts, completion
    engine.test.ts          # Vitest unit tests (no DOM)
    puzzles.test.ts         # Bank integrity test over the committed puzzles
app/games/
  page.tsx                  # Index: card grid (server component), robots noindex, PageTransition
  opengraph-image.tsx       # Mocha OG card (cascades to /games/[slug] unfurls)
  [slug]/
    page.tsx                # generateStaticParams from GAMES; dynamic import of game component; error boundary
components/games/
  game-card.tsx             # Index card (learn-card pattern: number, title, accent, drawn illustration)
  game-error-boundary.tsx   # Thin duplicate of ArtifactErrorBoundary with games copy
  dynamic-games.tsx         # 'use client' wrapper re-exporting games via next/dynamic { ssr: false }
  sudoku/
    sudoku.tsx              # The game component (client) — consumes engine.ts
scripts/
  generate-sudoku-puzzles.mjs  # Deterministic generator + assertions → lib/games/sudoku-puzzles.ts
```

- **`Game` type:** `{ slug, number, title, description, accent }` where `accent` is an
  `ACCENT_STYLES` key. Sudoku: `{ slug: 'sudoku', number: '01', accent: 'sapphire' }`.
- **Engine is pure TS**, componentless: `newGame(puzzle)`, `setValue`, `toggleNote`,
  `erase`, `undo`, `conflicts`, `mistakes(state)`, `isSolved(state)`. All state
  transitions return new state + push a history entry; the component is a thin view.
- **Sudoku loads `ssr: false`** (localStorage in lazy initializers, python.tsx
  precedent) through `dynamic-games.tsx`, so game code never bundles into other routes.
- **`routeProfile()` in living-field.tsx** gets an explicit entry:
  `pathname.startsWith('/games')` → faint (0.45 / 0.55) so the field never distracts
  mid-puzzle. (Default already resolves faint; the explicit entry follows the
  CLAUDE.md instruction to add one per new top-level route.)
- **Nav:** no Games pill. Verify the morphing indicator behaves on a route with no
  active pill (404 precedent) — implementation checklist item, not a code change
  unless broken.
- **CSP / headers:** zero changes. No third-party bytes, no wasm, no new origins.

## Puzzle bank

`scripts/generate-sudoku-puzzles.mjs`, run manually, output committed:

- **PRNG:** same LCG style as `generate-sql-seed.mjs`, fixed `SEED`. Fully
  deterministic — re-running the script reproduces the bank byte-identically.
- **Generation:** backtracking fill with randomized digit order → solved grid.
  Then dig: visit cells in shuffled order, remove a value only if the puzzle still
  has a **unique solution** (counting solver, early-exit at 2). Stop at the
  difficulty's target givens; if a dig run can't reach target, restart that puzzle
  from a new subseed.
- **Difficulty by givens count:** easy 38–42, medium 30–34, hard 26–29. (Givens
  count is an honest proxy, not a technique-graded difficulty engine — documented
  limitation, fine for v1.)
- **Bank:** 60 puzzles per difficulty, 180 total (~30KB source, ~10KB gzipped,
  imported only by the sudoku chunk). Ids `e01…e60`, `m01…m60`, `h01…h60`.
- **Format:** `{ id, difficulty, givens, solution }` — `givens` is an 81-char string
  (`'0'` = empty), `solution` an 81-char digit string.
- **In-script assertions (generation fails loudly):** every puzzle's solution is a
  valid completed grid; givens are a subset of the solution; every puzzle solves
  uniquely to exactly its stored solution; givens counts within the difficulty range;
  ids unique.

## Sudoku UX

**Phone portrait (design target, 320–430px):** everything in one `100dvh` viewport
on screens ≥568px tall (iPhone SE1 measurements below; shorter viewports fall back
to normal page scroll — no clipping):

- Condensed title row: `01/ Sudoku` mono label + difficulty of current puzzle +
  quiet annotation (`fig. 01 · 40 given`).
- **Board:** 9×9 CSS grid sized `min(100vw − 2rem, height share)`; 32px cells at
  320px, 3px box borders / 1px cell borders in the ledger hairline style. Givens in
  ink at semibold; her entries in mauve regular; both at the same size (weight +
  color distinguish, never size).
- **Number pad, thumb zone, all keys ≥44pt in at least one dimension (≥51×48 at
  320px):**
  - Row A: `1 2 3 4 5`
  - Row B: `6 7 8 9 ⌫` (erase)
  - Row C (controls): `✎ Notes` (toggle, pressed state visible) · `↶ Undo` ·
    `New game`
  - Note: this replaces the 3×3 pad from the approved sketch — two rows of five
    is what makes the whole surface fit 568px-tall viewports without scrolling,
    and the keys are larger in the thumb axis. Flagged as the one deviation.
- "Show mistakes" toggle: small labeled switch below the pad (infrequent control).
- Interaction: **tap cell → tap number.** Nothing behind hover or long-press.
  Tapping a number with notes mode on toggles that pencil mark.

**Tablet:** portrait keeps the stacked layout, scaled up. At `lg:` (1024px+ — iPad
landscape and desktop) the pad moves beside the board, both vertically centered.

**Desktop enhancement:** full keyboard play — arrows move selection, `1–9` enter,
`Backspace`/`Delete`/`0` erase, `N` toggles notes mode, `Z` (or `Cmd/Ctrl+Z`) undo.
Hover cell highlights behind `(pointer: fine)` only.

**Highlighting (both themes, soft Catppuccin tints):** selected cell (mauve tint),
its row/col/box (fainter tint), all cells matching the selected value (sapphire
tint). Mistakes (when enabled): cells whose value differs from the stored solution
get a maroon/red tint + digit color.

**Mistake model:** single "Show mistakes" toggle, default ON, persisted. ON compares
against the stored solution live. OFF gives no feedback until the board is full: if
full-but-wrong, a gentle status line ("Something's not quite right yet") with no
location or count revealed.

**Notes:** pencil mode toggle; notes render as a 3×3 mini-grid of digits in the
cell (~cell/3.2 px; 12px+ at 375px-wide viewports and above, smaller only below
that — accepted deviation from the 12px text floor, documented here: notes are
optional user annotations, not site content). Entering a real value in a cell
clears that cell's notes AND removes that digit from notes in its row/col/box
(one undo entry for the whole cascade).

**Undo:** history of state deltas (cell index, prev value+notes, next value+notes),
session-only (not persisted), capped at 200 entries.

**New game:** difficulty pills (easy/medium/hard, ACCENT_STYLES). Picks a random
unused puzzle of that difficulty (used ids tracked in localStorage; when a
difficulty's 60 are exhausted, its used-list resets). Starting a new game while a
puzzle is in progress asks an inline confirm ("Abandon this puzzle?") — protects
against a mis-tap losing 20 minutes of work.

**Completion:** board full + correct → celebration: drawn-stroke flourish
(`draw-stroke` vocabulary), "Solved" headline, quiet elapsed time revealed only
here ("solved in 14 min · medium"), and a "New puzzle" CTA. Elapsed accrues on a
1s interval, paused while `document.hidden`. Reduced motion: flourish renders
fully drawn, no animation.

## Persistence

localStorage key **`sudoku-progress-v1`**, read in a lazy `useState` initializer
(safe: component is ssr-false; python.tsx precedent). Persisted on every move
(write-through, no debounce needed at this size):

```ts
{
  puzzleId: string | null,      // current puzzle
  values: string,               // 81 chars, current board ('0' empty)
  notes: number[],              // 81 bitmasks (bit d-1 = note digit d)
  elapsedSeconds: number,
  usedIds: string[],            // for new-game selection
  settings: { showMistakes: boolean },
}
```

Undo history is deliberately NOT persisted. Corrupt/unparseable storage → treated
as absent (try/catch, fresh state). Returning with a puzzle in progress resumes
silently into it; the /games index card shows a "puzzle in progress" annotation.

## Accessibility

- **Board:** container `role="grid"` with `role="row"` / `role="gridcell"` rows;
  each cell a native `<button>` with roving tabindex (one tab stop; arrows move
  focus and selection together — the learn-canvas keyboard pattern applied to DOM).
  Cell `aria-label`: "Row 3, column 5, 7, given" / "Row 3, column 5, empty" /
  "…, 4, note 2 note 7" as applicable.
- **sr-only `role="status"`** announces move results ("Placed 4 in row 3 column 5",
  "Notes mode on", "Puzzle solved").
- Notes/mistakes toggles are real toggle buttons (`aria-pressed`).
- All controls ≥44px touch targets; global focus ring applies; AA contrast for all
  digit/tint combinations in both themes (verify maroon-on-tint in dark mode).
- `prefers-reduced-motion`: no entry animations, celebration static, no transitions.
- Both themes via the standard token classes; canvas is not used (all DOM), so no
  MutationObserver machinery needed.

## Discoverability & metadata

- `/games` and `/games/[slug]`: `robots: { index: false }` (404-page precedent).
- **No sitemap entries, no robots.txt change, no nav pill, no footer link, no
  homepage mention.**
- `app/games/opengraph-image.tsx`: Mocha 1200×630 card (drawn sudoku-grid motif,
  "Games — hand-built, ad-free") following the existing OG pattern (drawn ornaments,
  no ◆ glyph, single-template-string text nodes). Next's OG cascade serves it for
  `/games/sudoku` unfurls too — so the link looks good when texted to mom.
- Page titles: "Games — Amir Abdur-Rahim" / "Sudoku — Amir Abdur-Rahim".
- No JSON-LD for games (schema.org adds nothing for an unlisted page).

## Testing

- **`lib/games/sudoku/engine.test.ts` (vitest):** setValue/toggleNote/erase
  transitions, note-cascade clearing, undo (including cascade as one entry),
  conflicts, mistakes, isSolved, history cap.
- **`lib/games/sudoku/puzzles.test.ts` (vitest):** iterate all 180 committed
  puzzles — solution rows/cols/boxes valid, givens subset of solution, givens count
  in difficulty range, ids unique. (Uniqueness-of-solution is asserted at
  generation time, not re-proven in tests — the counting solver is too slow for the
  unit suite.)
- **Generator assertions** run on every generation (see Puzzle bank).
- **Playwright e2e (`games.spec.ts`):** /games renders the card; /games/sudoku
  board renders; tap cell + tap number places a digit; notes mode places a pencil
  mark; reload resumes the same board; mistakes toggle flips highlighting.
- **Manual checklist:** 320px `document.documentElement.scrollWidth === 320` on
  both /games pages; morphing nav indicator sane with no active pill; iPhone
  SE-height viewport shows board + pad without scrolling; dark mode contrast pass.

## Future games (context, not commitments)

The `GAMES` array + `dynamic-games.tsx` + `[slug]` route accommodate each of these
as one component + one entry: word search (02 candidate), solitaire (Klondike),
and the 3D word search idea — prior art exists as printed books and letter-cube
mobile apps, but a hand-rolled web-native rotatable 3D word search would be
genuinely distinctive. A PWA manifest + offline support for the /games subtree is
the most valuable cross-game enhancement once a second game lands.
