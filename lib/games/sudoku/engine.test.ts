/**
 * Tests for lib/games/sudoku/engine.ts — pure sudoku game logic.
 * TEST_SOLUTION is the standard row-shift grid (valid completed sudoku);
 * TEST_GIVENS blanks cells 0 and 1 (same row/box — exercises note cascade).
 */
import {
  HISTORY_CAP, newGame, restoreGame, setValue, toggleNote, eraseCell, undo,
  mistakes, isComplete, isSolved, serialize, peers, pickPuzzle, formatElapsed,
  type SudokuPuzzle,
} from '@/lib/games/sudoku/engine'

const TEST_SOLUTION = [
  '123456789', '456789123', '789123456',
  '231564897', '564897231', '897231564',
  '312645978', '645978312', '978312645',
].join('')
const TEST_GIVENS = '00' + TEST_SOLUTION.slice(2)

const PUZZLE: SudokuPuzzle = {
  id: 't01', difficulty: 'easy', givens: TEST_GIVENS, solution: TEST_SOLUTION,
}

describe('newGame', () => {
  it('maps givens: 0 chars become empty non-given cells', () => {
    const s = newGame(PUZZLE)
    expect(s.cells).toHaveLength(81)
    expect(s.cells[0]).toEqual({ value: 0, given: false, notes: 0 })
    expect(s.cells[1]).toEqual({ value: 0, given: false, notes: 0 })
    expect(s.cells[2]).toEqual({ value: 3, given: true, notes: 0 })
    expect(s.history).toEqual([])
  })
})

describe('peers', () => {
  it('returns the 20 cells sharing a row, column, or box', () => {
    const p = peers(0)
    expect(p).toHaveLength(20)
    expect(p).toContain(1)   // row
    expect(p).toContain(9)   // column
    expect(p).toContain(10)  // box
    expect(p).not.toContain(0)
  })
})

describe('setValue', () => {
  it('places a digit and records one history entry', () => {
    const s = setValue(newGame(PUZZLE), 0, 5)
    expect(s.cells[0].value).toBe(5)
    expect(s.history).toHaveLength(1)
  })

  it('is a no-op on given cells and on re-placing the same digit', () => {
    const s0 = newGame(PUZZLE)
    expect(setValue(s0, 2, 9)).toBe(s0)
    const s1 = setValue(s0, 0, 5)
    expect(setValue(s1, 0, 5)).toBe(s1)
  })

  it('clears the placed digit from peer notes in the SAME history entry, and undo restores both', () => {
    let s = newGame(PUZZLE)
    s = toggleNote(s, 1, 5) // cell 1 is a peer of cell 0
    s = setValue(s, 0, 5)
    expect(s.cells[1].notes).toBe(0)
    expect(s.history).toHaveLength(2) // note toggle + placement (cascade folded in)
    s = undo(s)
    expect(s.cells[0].value).toBe(0)
    expect(s.cells[1].notes).toBe(1 << 4)
  })

  it('clears the cell own notes when a value is placed', () => {
    let s = toggleNote(newGame(PUZZLE), 0, 3)
    s = setValue(s, 0, 5)
    expect(s.cells[0].notes).toBe(0)
  })
})

describe('toggleNote', () => {
  it('toggles a note bit on and off', () => {
    let s = toggleNote(newGame(PUZZLE), 0, 4)
    expect(s.cells[0].notes).toBe(1 << 3)
    s = toggleNote(s, 0, 4)
    expect(s.cells[0].notes).toBe(0)
  })

  it('is a no-op on given cells and on cells holding a value', () => {
    const s0 = newGame(PUZZLE)
    expect(toggleNote(s0, 2, 4)).toBe(s0)
    const s1 = setValue(s0, 0, 5)
    expect(toggleNote(s1, 0, 4)).toBe(s1)
  })
})

describe('eraseCell', () => {
  it('clears value and notes', () => {
    let s = setValue(newGame(PUZZLE), 0, 5)
    s = eraseCell(s, 0)
    expect(s.cells[0]).toEqual({ value: 0, given: false, notes: 0 })
  })

  it('is a no-op on given cells and already-empty cells', () => {
    const s0 = newGame(PUZZLE)
    expect(eraseCell(s0, 2)).toBe(s0)
    expect(eraseCell(s0, 0)).toBe(s0)
  })
})

describe('undo', () => {
  it('is a no-op with empty history', () => {
    const s0 = newGame(PUZZLE)
    expect(undo(s0)).toBe(s0)
  })

  it('caps history at HISTORY_CAP entries, dropping the oldest', () => {
    let s = newGame(PUZZLE)
    for (let i = 0; i < HISTORY_CAP + 10; i++) s = toggleNote(s, 0, (i % 9) + 1)
    expect(s.history).toHaveLength(HISTORY_CAP)
  })
})

describe('mistakes / isComplete / isSolved', () => {
  it('flags wrong non-given values only', () => {
    // solution has 1 at cell 0, 2 at cell 1
    let s = setValue(newGame(PUZZLE), 0, 9)
    s = setValue(s, 1, 2)
    expect(mistakes(s)).toEqual([0])
  })

  it('correct fill => complete and solved; wrong fill => complete, not solved', () => {
    let s = setValue(newGame(PUZZLE), 0, 1)
    expect(isComplete(s)).toBe(false)
    s = setValue(s, 1, 2)
    expect(isComplete(s)).toBe(true)
    expect(isSolved(s)).toBe(true)
    const wrong = setValue(s, 0, 9)
    expect(isComplete(wrong)).toBe(true)
    expect(isSolved(wrong)).toBe(false)
  })
})

describe('serialize / restoreGame', () => {
  it('round-trips values and notes; history resets; givens win over corrupt values', () => {
    let s = setValue(newGame(PUZZLE), 0, 5)
    s = toggleNote(s, 1, 7)
    const { values, notes } = serialize(s)
    const r = restoreGame(PUZZLE, values, notes)
    expect(r.cells[0].value).toBe(5)
    expect(r.cells[1].notes).toBe(1 << 6)
    expect(r.history).toEqual([])
    // a corrupt saved value on a given cell must not override the given
    const tampered = restoreGame(PUZZLE, '9' + values.slice(1, 2) + '9' + values.slice(3), notes)
    expect(tampered.cells[2]).toEqual({ value: 3, given: true, notes: 0 })
  })
})

describe('pickPuzzle', () => {
  const bank: SudokuPuzzle[] = [
    { id: 'e1', difficulty: 'easy', givens: TEST_GIVENS, solution: TEST_SOLUTION },
    { id: 'e2', difficulty: 'easy', givens: TEST_GIVENS, solution: TEST_SOLUTION },
    { id: 'm1', difficulty: 'medium', givens: TEST_GIVENS, solution: TEST_SOLUTION },
  ]

  it('picks only the requested difficulty, excluding used ids', () => {
    const { puzzle, usedIds } = pickPuzzle(bank, 'easy', ['e1'], () => 0)
    expect(puzzle.id).toBe('e2')
    expect(usedIds).toEqual(['e1', 'e2'])
  })

  it('resets the used list for a difficulty when it is exhausted, keeping other difficulties', () => {
    const { puzzle, usedIds } = pickPuzzle(bank, 'easy', ['e1', 'e2', 'm1'], () => 0)
    expect(puzzle.id).toBe('e1')
    expect(usedIds).toEqual(['m1', 'e1'])
  })

  it('throws an error when a difficulty has no puzzles in the bank', () => {
    expect(() => pickPuzzle(bank, 'hard', [], () => 0)).toThrow('No puzzles available for difficulty: hard')
  })
})

describe('formatElapsed', () => {
  it('formats seconds, minutes, and hours', () => {
    expect(formatElapsed(45)).toBe('45 sec')
    expect(formatElapsed(60)).toBe('1 min')
    expect(formatElapsed(845)).toBe('14 min')
    expect(formatElapsed(3720)).toBe('1 hr 2 min')
  })
})
