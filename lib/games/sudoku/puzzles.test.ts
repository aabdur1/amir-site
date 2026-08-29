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
