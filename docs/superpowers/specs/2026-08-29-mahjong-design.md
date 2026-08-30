# Mahjong Solitaire (game 04) — Design

**Date:** 2026-08-29
**Status:** Approved decisions from Amir (game type, board sizing, tile faces, stuck policy, deal storage); spec pending his review.
**Audience:** Amir's mom (iPhone 13 Pro, 390×844 portrait) — ad-free, no-pressure, same as games 01–03.
**Sizing honesty:** roughly 2.5–3× the word-scramble build. The three big chunks are the face SVG set, the layout data + generator, and the geometry engine — the implementation plan should keep each in its own task.

## Goal

Fourth game in the unlisted `/games` section: mahjong solitaire — layered
tile stacks, tap free matching pairs to clear the board. Full architecture
mirror of games 01–03: committed deterministic bank, pure unit-tested
engine, ssr:false component, localStorage autosave, difficulty pills with
confirm-on-abandon, quiet timer, solved panel + ConfettiBurst.

## Decisions (made with Amir, 2026-08-29)

1. **Game type:** mahjong solitaire (tile matching), not 4-player mahjong.
2. **Board sizing:** phone-first custom layouts, NOT the 144-tile turtle —
   at most 8 columns wide so tiles stay ~44px at 390px. Difficulty = layout
   size + stacking depth.
3. **Tile faces:** hand-drawn editorial SVG ("readable suits"): dots and
   bamboo as geometric patterns, the character suit as big numerals
   (western faces), winds as E/S/W/N letters, dragons as three colored
   medallions. No images, no icon fonts, no Unicode mahjong glyphs (iOS
   font coverage unreliable).
4. **Stuck policy — full no-pressure kit:** deals winnable by construction,
   undo, Hint (flash a free matching pair), Shuffle-remaining offered when
   no moves remain. No penalties; quiet timer.
5. **Deal storage — approach A:** committed layouts + committed deal bank
   (LCG **SEED=17**), each deal built by reverse-construction so its
   committed `solution` is a replayable winnability proof. pickPuzzle /
   usedIds / resume unchanged.
6. **No flowers/seasons.** Their any-match-within-group rule adds engine
   complexity for tiles she'd meet rarely; matching is always exact-kind.
7. **Blocked tiles subtly dimmed** so free tiles read at a glance (plus an
   accessible `blocked` state — dimming is never the only signal).
8. **Accent:** mauve (sapphire, lavender, rosewater taken by games 01–03).

## Geometry model (the engine's foundation)

Positions live on the classic **half-unit grid**: a tile's footprint is
2×2 half-units. `Position = { x, y, z }` (top-left corner, half-units;
z = layer, 0 = table).

- **Overlap** (same test for all three rules): tiles A and B overlap iff
  `|A.x − B.x| ≤ 1 AND |A.y − B.y| ≤ 1`.
- **Covered:** some remaining tile at `z+1` overlaps it.
- **Left-blocked:** some remaining tile at the same z with `x' = x − 2` and
  `|y' − y| ≤ 1`. Right-blocked mirrors with `x' = x + 2`.
- **Free** = not covered AND (not left-blocked OR not right-blocked).

Freeness is pure geometry over the remaining-position set — kind-agnostic,
which is what makes reverse-construction work.

## Layouts

Hand-authored data, single-sourced in `scripts/mahjong-layouts.mjs`
(word-themes.mjs precedent: shared authoring module for generator scripts).
The generator emits the TS mirror consumed by app code. One layout per
difficulty:

| Difficulty | Tiles | Layers | Max width | Kinds (each exactly ×4) |
|---|---|---|---|---|
| easy | 48 | 2 | ≤ 16 half-units (8 cols) | 12 |
| medium | 72 | 3 | ≤ 16 half-units | 18 |
| hard | 104 | 4 | ≤ 16 half-units | 26 |

Authoring validation (asserted by the generator, generation fails loudly):

- even tile count; count matches the table; no two tiles overlap at the
  same z; every z>0 tile overlaps ≥1 tile at z−1 (no floating tiles);
  bounding width ≤ 16 half-units; every position in-bounds and on integer
  half-units.
- Layout aesthetics (symmetry, silhouette) are reviewed visually in the
  browser, not asserted.

## Tile kinds

Canonical ordered kind list (module constant, indexes are the bank's
vocabulary): `DOT_1…DOT_8, BAM_1…BAM_8, NUM_1, NUM_2, NUM_3, WIND_E,
WIND_S, WIND_W, WIND_N, DRAGON_R, DRAGON_G, DRAGON_W` — **26 kinds,
deliberately the exact union of the difficulty pools** so the compile-gated
face registry never demands a face no pool uses. Extending a pool later
means appending kinds + drawing their faces then, not now.

Per-difficulty pools (each kind appears exactly 4 times = 2 pairs):

- **easy (12):** dots 1–6, bamboo 1–3, dragons R/G/W
- **medium (18):** dots 1–7, bamboo 1–5, numerals 1–3, dragons R/G/W
- **hard (26):** dots 1–8, bamboo 1–8, numerals 1–3, winds E/S/W/N,
  dragons R/G/W

Pools are spec'd data, asserted at generation (a deal's kind multiset must
equal its difficulty's pool ×4 exactly).

## Deal generation (reverse-construction) + bank

`scripts/generate-mahjong-deals.mjs`, deterministic LCG **SEED=17**, same
recipe as SEED=7/11/13. One run emits BOTH committed files:

- `lib/games/mahjong-layouts.ts` — the TS mirror of the authored layouts.
- `lib/games/mahjong-deals.ts` — 90 deals (30/difficulty, ids
  `me01…me30` / `mm01…mm30` / `mh01…mh30`):
  `{ id, difficulty, kinds: number[], solution: number[] }` where
  `kinds[i]` is the kind at layout position `i`, and `solution` lists
  position indexes as consecutive pairs in a winning removal order.

**Peel algorithm** (kind-agnostic freeness makes this constructive):
starting from the full position set, repeatedly pick two distinct FREE
positions at random, assign both the next kind pair (pair order = seeded
shuffle of the pool's 2-per-kind pairs), remove them, and record the pair
in `solution`. When the set empties, `solution` is a winning sequence by
construction. The peel can wedge (e.g. the last two tiles stacked — only
one free); on wedge, retry the whole deal with fresh randomness, capped
(assert success within the cap; a wedge-prone layout is a layout bug).

Generation-time assertions: layout validations above; per deal — kind
multiset equals the pool ×4; `solution` has every position exactly once,
pairs share a kind, and **replaying it against the layout geometry keeps
every removed pair free at its turn** (the winnability proof, checked at
generation AND re-proven for all 90 deals in `deals.test.ts` via the
engine's own `removePair` — the word-search exactly-once precedent).

## Engine — `lib/games/mahjong/engine.ts` (pure, unit-tested)

Engine conventions as games 01–03: immutable transitions, no-ops return
the SAME object, re-export `pickPuzzle`/`formatElapsed` from
`lib/games/shared.ts`.

```ts
export type Difficulty = 'easy' | 'medium' | 'hard'
export interface Position { x: number; y: number; z: number }
export interface MahjongLayout { positions: Position[] }
export interface MahjongDeal {
  id: string
  difficulty: Difficulty
  kinds: number[]
  solution: number[]
}
export interface MahjongState {
  deal: MahjongDeal
  kinds: number[]     // current faces: init = deal.kinds; shuffleRemaining reassigns remaining
  removed: number[]   // position indexes in removal order (pairs) — this IS the undo history
}
```

- `freeSet(layout, state): Set<number>` — free position indexes among the
  remaining tiles (the geometry rules above).
- `removePair(layout, state, a, b)` — no-op unless a≠b, both remaining,
  both free, and `kinds[a] === kinds[b]`; appends `[a, b]` to `removed`.
- `undo(state)` — pops the last pair; no-op on empty.
- `hasMoves(layout, state)` / `isCleared(state)`.
- `findHint(layout, state): [number, number] | null` — first free matching
  pair by deterministic scan (stable for tests).
- `shuffleRemaining(layout, state, rand)` — re-peels the REMAINING
  positions against the remaining kind multiset (every kind's remaining
  count is always even, since removal is pairwise) and reassigns
  `state.kinds` at the remaining positions (this is why kinds live on the
  state, not the deal). Post-shuffle the board is winnable-from-here by
  the same construction argument. Retry-capped; on cap failure returns the same state (no-op).
  Shuffling clears `removed`? NO — removed pairs stay removed; only the
  remaining tiles' faces change. Undo history survives, but undoing past a
  shuffle restores positions with their CURRENT kinds (documented,
  acceptable — matching pairs stay matching because shuffle preserves the
  pairing invariant per kind's even count).
- The peel routine is implemented in the engine (exported for
  `shuffleRemaining` + tests) and mirrored in the generator .mjs — the
  word-search `allLines` duplication precedent (gen-time and test agree).

## Components

- `components/games/mahjong/tile-faces.tsx` — the face set: 26 small SVG
  components + a `FACE_REGISTRY` keyed by kind index (compile-gated total
  Record over the kind union), plus
  `faceName(kind)` ("Three of dots", "Seven", "North wind", "Red dragon")
  used by aria labels and status strings. Editorial style: mono-weight
  strokes, Catppuccin accents (dots sapphire, bamboo teal/green tones from
  the existing palette, numerals ink, winds lavender, dragons red/green
  /ink-on-cream), light-cream tile ground in both themes ("mounted print"
  treatment, headshot/plate precedent). Every face legible at 40px —
  verified in the browser at 390px, both themes.
- `components/games/mahjong/board.tsx` — DOM buttons (no canvas)
  absolutely positioned by percentage inside an aspect-ratio box derived
  from the layout's half-unit bounds. Depth: per-z offset of ~0.15
  half-units up-left + a darker bottom/right edge on each tile; z-index by
  layer. Free tiles full-strength; blocked/covered tiles dimmed (~55%
  opacity) AND `aria-disabled` with `, blocked` in the label — dimming
  never the only signal. Selection = mauve ring. Tap flows: blocked tile →
  status only; free tile → select; second free tile → match (both fade,
  CSS transition, global reduced-motion kill applies) or reselect if
  non-matching. Keyboard: Left/Right cycle free tiles in reading order
  (top layer first), Enter selects/matches, Escape clears; roving focus.
  Tile labels: `{faceName}, row {r}, column {c}, layer {l}` + `, blocked`
  / `, selected` as applicable.
- `components/games/mahjong/mahjong.tsx` — the shell, cloned from
  word-scramble/word-search: header `04/ Mahjong` + `fig. 04 · {pairs
  remaining} pairs · {difficulty}`, difficulty pills with
  confirm-on-abandon (progress = any removed pair), controls row (Undo ·
  Hint · New game), autosave, quiet timer, solved panel (`Board cleared` /
  elapsed · difficulty) + ConfettiBurst behind the celebrate live-solve
  gating, sr-only `role=status`. When `hasMoves` is false and the board
  isn't cleared, an inline panel appears: "No moves left" + **Shuffle
  remaining** + Undo — the only place Shuffle is offered (it's an escape
  hatch, not a strategy button).
- Status discipline (games precedent): selections and matches announce
  ("Matched two Red dragons — 21 pairs left"); blocked-tile taps announce
  once ("That tile is blocked"); hint announces the pair; no per-focus
  chatter.

## Storage — `lib/games/mahjong/storage.ts`

Key `mahjong-progress-v1`:
`{ puzzleId, removed: number[], kinds: number[] | null, elapsedSeconds, usedIds }`.

- `removed` is the ordered removal list, so restore rebuilds the FULL undo
  history — undo works across resume (an upgrade on the sudoku
  history-resets precedent, free because removal order is the state).
- `kinds` persists only after a shuffle has diverged from the deal
  (`null` = deal's original kinds), so an un-shuffled save stays tiny.
- Shape validation only (storage never imports the bank); deal-consistency
  of `removed`/`kinds` (in-range, distinct, pairs match) is the component
  restore path's job — invalid saves drop to a fresh deal (word-search
  restore precedent).

## Registration & wiring

- `GameSlug` union += `'mahjong'` FIRST → all THREE registries fail to
  compile until filled: `GAME_COMPONENTS`, `ILLUSTRATIONS`, and
  `PROGRESS_KEYS` in `components/games/game-card.tsx` (learned on game 03).
- GAMES entry: number `04`, accent **mauve**, description in the house
  voice ("Clear the tile stacks pair by pair — hints when you want them,
  and your game saves itself.").
- Index illustration: stacked-tiles motif (three offset drawn rects with a
  dot-pattern face, mauve draw-stroke + accent dots).
- ssr:false via `dynamic-games.tsx` (localStorage + Math.random in the
  useState initializer), wrapped in `GameErrorBoundary`.
- No routeProfile / CSP / sitemap / OG changes (unlisted-by-omission).
- Never duplicate a visible string into the sr-only status div (game 03
  lesson — breaks RTL getByText); status strings are always distinct
  standalone announcements.

## Testing

TDD throughout (watch each fail first):

1. **Engine geometry:** hand-built 3–6 tile mini layouts covering: covered
   blocks, left+right blocked vs one side open, z-overlap partial (half-
   unit offsets), removePair no-op conventions, undo, hasMoves,
   isCleared, findHint determinism.
2. **Peel/winnability:** peel clears every layout; wedge-retry works;
   `shuffleRemaining` output replays to clear via its own peel record.
3. **Deals bank test:** re-prove all 90 committed solutions clear their
   deal through the engine's `removePair`; kind multisets equal the pools.
4. **Storage tests** (round-trip, rejection, throw-swallow — sibling
   parity from day one).
5. **Board RTL:** labels, dimmed+aria-disabled blocked tiles, selection
   ring state, keyboard cycle/select/escape, callbacks.
6. **Container RTL:** match flow + pairs-left status; undo; hint flash;
   no-moves panel appears exactly when hasMoves is false; shuffle
   produces a playable board; resume rebuilds undo; resume-of-cleared
   shows panel without confetti; live clear bursts; new game unmounts;
   pills confirm-on-progress. File-wide matchMedia/getContext stubs.
7. **E2E** (games.spec.ts): index card; seed a deal, tap
   `solution[0]`/`solution[1]`, pair removed; reload persistence.
8. **Browser verification:** 390×844 and 320×568 (hard layout;
   `scrollWidth === 320`), both themes, console clean; every face legible
   at the rendered tile size; confetti via Playwright (not the preview
   pane — innerWidth=0 gotcha).

## Out of scope

- Flowers/seasons tiles and their group-match rule (decision 6).
- Multiple layouts per difficulty, layout picker, or the classic turtle
  (revisit only if she asks; the bank architecture supports adding layouts
  later — a new layout is authored data + regenerated deals).
- Scoring, move counters, or timers shown during play.
- PWA/offline (queued /games v2 item).
