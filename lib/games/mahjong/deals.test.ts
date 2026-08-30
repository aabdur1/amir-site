/**
 * Re-proves the committed mahjong bank's invariants. THE key test: every
 * deal's committed solution replays to a cleared board through the
 * engine's own removePair — winnability is a proof, not a promise.
 */
import { MAHJONG_DEALS } from '@/lib/games/mahjong-deals'
import { MAHJONG_LAYOUTS } from '@/lib/games/mahjong-layouts'
import { startGame, removePair, isCleared } from '@/lib/games/mahjong/engine'

const POOLS: Record<string, number[]> = {
  // kind indexes into KINDS — easy: dots 1-6, bam 1-3, dragons
  easy: [0, 1, 2, 3, 4, 5, 8, 9, 10, 23, 24, 25],
  // medium: dots 1-7, bam 1-5, num 1-3, dragons
  medium: [0, 1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 16, 17, 18, 23, 24, 25],
  // hard: all 26
  hard: Array.from({ length: 26 }, (_, i) => i),
}
const TILE_COUNT = { easy: 48, medium: 72, hard: 104 } as const

it('has 90 deals, 30 per difficulty, unique prefixed ids', () => {
  expect(MAHJONG_DEALS).toHaveLength(90)
  expect(new Set(MAHJONG_DEALS.map((d) => d.id)).size).toBe(90)
  for (const [difficulty, prefix] of [['easy', 'me'], ['medium', 'mm'], ['hard', 'mh']] as const) {
    const pool = MAHJONG_DEALS.filter((d) => d.difficulty === difficulty)
    expect(pool).toHaveLength(30)
    for (const d of pool) expect(d.id).toMatch(new RegExp(`^${prefix}\\d{2}$`))
  }
})

it('layouts match the spec table: tile counts, ≤16 half-units wide, no floating tiles', () => {
  for (const [difficulty, layout] of Object.entries(MAHJONG_LAYOUTS)) {
    const pos = layout.positions
    expect(pos).toHaveLength(TILE_COUNT[difficulty as keyof typeof TILE_COUNT])
    expect(Math.max(...pos.map((p) => p.x)) + 2).toBeLessThanOrEqual(16)
    for (const a of pos) {
      if (a.z === 0) continue
      expect(pos.some((b) => b.z === a.z - 1 && Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1)).toBe(true)
    }
  }
})

it('every deal: kind multiset equals its pool ×4', () => {
  for (const d of MAHJONG_DEALS) {
    const counts = new Map<number, number>()
    for (const k of d.kinds) counts.set(k, (counts.get(k) ?? 0) + 1)
    const pool = POOLS[d.difficulty]
    expect([...counts.keys()].sort((a, b) => a - b)).toEqual(pool)
    for (const k of pool) expect(counts.get(k)).toBe(4)
  }
})

it('every deal: the committed solution replays to a cleared board', () => {
  for (const d of MAHJONG_DEALS) {
    const layout = MAHJONG_LAYOUTS[d.difficulty]
    expect(new Set(d.solution).size).toBe(layout.positions.length)
    let s = startGame(d)
    for (let k = 0; k < d.solution.length; k += 2) {
      const next = removePair(layout, s, d.solution[k], d.solution[k + 1])
      expect(next, `${d.id}: pair at step ${k / 2} is not legal`).not.toBe(s)
      s = next
    }
    expect(isCleared(s)).toBe(true)
  }
})
