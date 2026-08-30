// scripts/mahjong-layouts.mjs
// Hand-authored mahjong layouts, single source of truth (word-themes.mjs
// precedent). Positions are half-units (tile footprint 2×2), z = layer.
// Constraints (asserted by generate-mahjong-deals.mjs): even counts
// matching the pools ×4, width ≤ 16 half-units (8 columns → ~44px tiles
// at 390px), no same-z overlap, no floating tiles. Coordinates validated
// with 30 peels per difficulty before being committed here.
const grid = (xs, ys, z) => xs.flatMap((x) => ys.map((y) => ({ x, y, z })))
const range = (a, b) => Array.from({ length: (b - a) / 2 + 1 }, (_, i) => a + i * 2)

export const LAYOUTS = {
  // 48 = 8×4 base + centered 4×4 cap
  easy: [
    ...grid(range(0, 14), range(0, 6), 0),
    ...grid(range(4, 10), range(0, 6), 1),
  ],
  // 72 = 8×5 base + 6×4 mid + 4×2 cap
  medium: [
    ...grid(range(0, 14), range(0, 8), 0),
    ...grid(range(2, 12), range(0, 6), 1),
    ...grid(range(4, 10), range(2, 4), 2),
  ],
  // 104 = 8×6 base + 6×6 + 4×4 + 2×2 nested pyramid
  hard: [
    ...grid(range(0, 14), range(0, 10), 0),
    ...grid(range(2, 12), range(0, 10), 1),
    ...grid(range(4, 10), range(2, 8), 2),
    ...grid(range(6, 8), range(4, 6), 3),
  ],
}
