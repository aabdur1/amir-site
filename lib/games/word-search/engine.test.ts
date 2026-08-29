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
