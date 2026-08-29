/**
 * RTL tests for the Sudoku container (board + pad integration). All DOM —
 * no canvas. Storage-dependent behavior is tested in Task 7's additions;
 * here the container starts a fresh SUDOKU_PUZZLES[0] game.
 */
import { render, screen, fireEvent, act } from '@testing-library/react'
import { Sudoku } from '@/components/games/sudoku/sudoku'
import { SUDOKU_PUZZLES } from '@/lib/games/sudoku-puzzles'
import { STORAGE_KEY } from '@/lib/games/sudoku/storage'

const puzzle = SUDOKU_PUZZLES[0]
const firstEmpty = puzzle.givens.indexOf('0')
const row = Math.floor(firstEmpty / 9) + 1
const col = (firstEmpty % 9) + 1
const correctDigit = Number(puzzle.solution[firstEmpty])
const wrongDigit = (correctDigit % 9) + 1 // any digit ≠ correct

// The container's fallback puzzle pick (no resumable save) is genuinely
// random per the spec (Math.random default in pickPuzzle). Pin it here so
// the unseeded tests below — which assume the fallback puzzle is exactly
// SUDOKU_PUZZLES[0] ('e01') — are deterministic; afterEach's
// restoreAllMocks() resets this before every test.
beforeEach(() => {
  vi.spyOn(Math, 'random').mockReturnValue(0)
})

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

function cellButton(r: number, c: number) {
  return screen.getByRole('gridcell', { name: new RegExp(`^Row ${r}, column ${c}(,|$)`) })
}

it('renders 81 gridcells with given/empty labels', () => {
  render(<Sudoku />)
  expect(screen.getAllByRole('gridcell')).toHaveLength(81)
  expect(cellButton(row, col)).toHaveAccessibleName(`Row ${row}, column ${col}, empty`)
})

it('tap cell then tap pad digit places the digit', () => {
  render(<Sudoku />)
  fireEvent.click(cellButton(row, col))
  fireEvent.click(screen.getByRole('button', { name: `Enter ${correctDigit}` }))
  expect(cellButton(row, col)).toHaveAccessibleName(`Row ${row}, column ${col}, ${correctDigit}`)
})

it('flags a wrong digit as incorrect (showMistakes default on)', () => {
  render(<Sudoku />)
  fireEvent.click(cellButton(row, col))
  fireEvent.click(screen.getByRole('button', { name: `Enter ${wrongDigit}` }))
  expect(cellButton(row, col).getAttribute('aria-label')).toContain('incorrect')
})

it('keyboard: arrows move selection, digit keys place values', () => {
  render(<Sudoku />)
  const grid = screen.getByRole('grid')
  fireEvent.click(cellButton(row, col))
  fireEvent.keyDown(grid, { key: String(correctDigit) })
  expect(cellButton(row, col)).toHaveAccessibleName(`Row ${row}, column ${col}, ${correctDigit}`)
  // ArrowRight moves selection right (or stays at col 9 edge)
  fireEvent.keyDown(grid, { key: 'ArrowRight' })
  const nextCol = col === 9 ? col : col + 1
  expect(cellButton(row, nextCol).getAttribute('tabindex')).toBe('0')
})

it('digit taps with no cell selected do nothing', () => {
  render(<Sudoku />)
  fireEvent.click(screen.getByRole('button', { name: 'Enter 5' }))
  expect(screen.getAllByRole('gridcell')).toHaveLength(81) // no crash, board intact
})

describe('notes, erase, undo, mistakes toggle', () => {
  it('notes mode places pencil marks instead of values', () => {
    render(<Sudoku />)
    fireEvent.click(screen.getByRole('button', { name: 'Notes' }))
    expect(screen.getByRole('button', { name: 'Notes' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(cellButton(row, col))
    fireEvent.click(screen.getByRole('button', { name: `Enter ${correctDigit}` }))
    expect(cellButton(row, col)).toHaveAccessibleName(
      `Row ${row}, column ${col}, empty, notes ${correctDigit}`
    )
  })

  it('erase clears a placed value', () => {
    render(<Sudoku />)
    fireEvent.click(cellButton(row, col))
    fireEvent.click(screen.getByRole('button', { name: `Enter ${correctDigit}` }))
    fireEvent.click(screen.getByRole('button', { name: 'Erase' }))
    expect(cellButton(row, col)).toHaveAccessibleName(`Row ${row}, column ${col}, empty`)
  })

  it('undo is disabled until a move exists, then reverts the move', () => {
    render(<Sudoku />)
    const undoBtn = screen.getByRole('button', { name: 'Undo' })
    expect(undoBtn).toBeDisabled()
    fireEvent.click(cellButton(row, col))
    fireEvent.click(screen.getByRole('button', { name: `Enter ${correctDigit}` }))
    expect(undoBtn).toBeEnabled()
    fireEvent.click(undoBtn)
    expect(cellButton(row, col)).toHaveAccessibleName(`Row ${row}, column ${col}, empty`)
  })

  it('turning Show mistakes off removes the incorrect flag', () => {
    render(<Sudoku />)
    fireEvent.click(cellButton(row, col))
    fireEvent.click(screen.getByRole('button', { name: `Enter ${wrongDigit}` }))
    expect(cellButton(row, col).getAttribute('aria-label')).toContain('incorrect')
    fireEvent.click(screen.getByRole('button', { name: 'Show mistakes' }))
    expect(cellButton(row, col).getAttribute('aria-label')).not.toContain('incorrect')
  })
})

describe('persistence, timer, panels', () => {
  function seedProgress(overrides: Record<string, unknown> = {}) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      puzzleId: puzzle.id,
      values: puzzle.givens,
      notes: Array(81).fill(0),
      elapsedSeconds: 0,
      usedIds: [puzzle.id],
      settings: { showMistakes: true },
      ...overrides,
    }))
  }

  it('resumes a saved board silently', () => {
    const values = puzzle.givens.slice(0, firstEmpty) + String(correctDigit) + puzzle.givens.slice(firstEmpty + 1)
    seedProgress({ values })
    render(<Sudoku />)
    expect(cellButton(row, col)).toHaveAccessibleName(`Row ${row}, column ${col}, ${correctDigit}`)
  })

  it('autosaves each move to localStorage', () => {
    seedProgress()
    render(<Sudoku />)
    fireEvent.click(cellButton(row, col))
    fireEvent.click(screen.getByRole('button', { name: `Enter ${correctDigit}` }))
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(saved.values[firstEmpty]).toBe(String(correctDigit))
  })

  it('persists the Show mistakes setting', () => {
    seedProgress()
    render(<Sudoku />)
    fireEvent.click(screen.getByRole('button', { name: 'Show mistakes' }))
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(saved.settings.showMistakes).toBe(false)
  })

  it('new game panel: difficulty pick resets the board and closes the panel', () => {
    seedProgress()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    render(<Sudoku />)
    fireEvent.click(screen.getByRole('button', { name: 'New game' }))
    fireEvent.click(screen.getByRole('button', { name: 'easy' }))
    expect(screen.queryByRole('button', { name: 'easy' })).toBeNull() // panel closed
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(saved.elapsedSeconds).toBe(0)
    expect(saved.puzzleId).toMatch(/^e/)
  })

  it('solving the last cell shows the completion panel with quiet elapsed time', () => {
    // all but the first empty cell already solved
    const values = puzzle.solution.slice(0, firstEmpty) + '0' + puzzle.solution.slice(firstEmpty + 1)
    seedProgress({ values, elapsedSeconds: 845 })
    render(<Sudoku />)
    fireEvent.click(cellButton(row, col))
    fireEvent.click(screen.getByRole('button', { name: `Enter ${correctDigit}` }))
    expect(screen.getByRole('heading', { name: 'Solved' })).toBeInTheDocument()
    expect(screen.getByText(`solved in 14 min · ${puzzle.difficulty}`)).toBeInTheDocument()
  })

  it('timer accrues while visible and lands in the autosave', () => {
    seedProgress()
    vi.useFakeTimers()
    render(<Sudoku />)
    act(() => { vi.advanceTimersByTime(65_000) })
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(saved.elapsedSeconds).toBe(65)
    vi.useRealTimers()
  })

  it('a full-but-wrong board shows a gentle nudge, no locations revealed', () => {
    const values = puzzle.solution.slice(0, firstEmpty) + '0' + puzzle.solution.slice(firstEmpty + 1)
    seedProgress({ values, settings: { showMistakes: false } })
    render(<Sudoku />)
    fireEvent.click(cellButton(row, col))
    fireEvent.click(screen.getByRole('button', { name: `Enter ${wrongDigit}` }))
    expect(screen.getByText("Something's not quite right yet.")).toBeInTheDocument()
    expect(cellButton(row, col).getAttribute('aria-label')).not.toContain('incorrect')
  })

  it('cancelling the new-game panel after solving returns to the Solved panel', () => {
    const values = puzzle.solution.slice(0, firstEmpty) + '0' + puzzle.solution.slice(firstEmpty + 1)
    seedProgress({ values, elapsedSeconds: 100 })
    render(<Sudoku />)
    fireEvent.click(cellButton(row, col))
    fireEvent.click(screen.getByRole('button', { name: `Enter ${correctDigit}` }))
    expect(screen.getByRole('heading', { name: 'Solved' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'New puzzle' }))
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('heading', { name: 'Solved' })).toBeInTheDocument()
  })

  it('new game panel warns when the resumed board has progress', () => {
    const values = puzzle.givens.slice(0, firstEmpty) + String(correctDigit) + puzzle.givens.slice(firstEmpty + 1)
    seedProgress({ values })
    render(<Sudoku />)
    fireEvent.click(screen.getByRole('button', { name: 'New game' }))
    expect(screen.getByText('This abandons your current puzzle.')).toBeInTheDocument()
  })

  it('new game panel shows no warning for a fresh, untouched board', () => {
    seedProgress() // values === puzzle.givens: no non-given cell has a value or note
    render(<Sudoku />)
    fireEvent.click(screen.getByRole('button', { name: 'New game' }))
    expect(screen.queryByText('This abandons your current puzzle.')).toBeNull()
  })

  it('keyboard undo after solving does not revert the winning move', () => {
    // all but the first empty cell already solved
    const values = puzzle.solution.slice(0, firstEmpty) + '0' + puzzle.solution.slice(firstEmpty + 1)
    seedProgress({ values })
    render(<Sudoku />)
    fireEvent.click(cellButton(row, col))
    fireEvent.click(screen.getByRole('button', { name: `Enter ${correctDigit}` }))
    expect(screen.getByRole('heading', { name: 'Solved' })).toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole('grid'), { key: 'z' })
    expect(screen.getByRole('heading', { name: 'Solved' })).toBeInTheDocument()
    expect(cellButton(row, col)).toHaveAccessibleName(`Row ${row}, column ${col}, ${correctDigit}`)
  })
})
