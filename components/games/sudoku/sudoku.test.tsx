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
  // Any live solve mounts ConfettiBurst; jsdom has no matchMedia (stubbed —
  // hooks.test.ts precedent) and no 2d context (mocked null: the burst draws
  // nothing, but the canvas mounts, which is what the celebrate tests assert)
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }))
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
})

afterEach(() => {
  localStorage.clear()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function cellButton(r: number, c: number) {
  return screen.getByRole('gridcell', { name: new RegExp(`^Row ${r}, column ${c}(,|$)`) })
}

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

describe('completed-digit pad gray-out', () => {
  // Seed a board where every copy of correctDigit is correctly placed:
  // solution values wherever the solution holds that digit, givens elsewhere.
  const completedValues = puzzle.givens
    .split('')
    .map((g, i) => (puzzle.solution[i] === String(correctDigit) ? puzzle.solution[i] : g))
    .join('')
  // A digit that still has blanks after the seed (exists: only correctDigit
  // was completed beyond the givens, and easy puzzles blank several digits)
  const liveDigit = [1, 2, 3, 4, 5, 6, 7, 8, 9].find(
    (d) =>
      d !== correctDigit &&
      puzzle.givens.split('').filter((g) => g === String(d)).length < 9
  )!
  // An empty cell whose solution is not correctDigit, to aim the no-op tap at
  const otherEmpty = puzzle.givens
    .split('')
    .findIndex((g, i) => g === '0' && puzzle.solution[i] !== String(correctDigit))
  const otherRow = Math.floor(otherEmpty / 9) + 1
  const otherCol = (otherEmpty % 9) + 1

  it('marks a fully-placed digit aria-disabled, leaves live digits enabled', () => {
    seedProgress({ values: completedValues })
    render(<Sudoku />)
    expect(screen.getByRole('button', { name: `Enter ${correctDigit}` }))
      .toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('button', { name: `Enter ${liveDigit}` }))
      .not.toHaveAttribute('aria-disabled', 'true')
  })

  it('taps on a grayed-out digit do nothing', () => {
    seedProgress({ values: completedValues })
    render(<Sudoku />)
    fireEvent.click(cellButton(otherRow, otherCol))
    fireEvent.click(screen.getByRole('button', { name: `Enter ${correctDigit}` }))
    expect(cellButton(otherRow, otherCol)).toHaveAccessibleName(
      `Row ${otherRow}, column ${otherCol}, empty`
    )
  })

  it('grays a digit out live, on its final correct placement', () => {
    // one copy of correctDigit left to place — the seeded board minus cell firstEmpty
    const values = completedValues.slice(0, firstEmpty) + '0' + completedValues.slice(firstEmpty + 1)
    seedProgress({ values })
    render(<Sudoku />)
    const pad = screen.getByRole('button', { name: `Enter ${correctDigit}` })
    expect(pad).not.toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(cellButton(row, col))
    fireEvent.click(pad)
    expect(pad).toHaveAttribute('aria-disabled', 'true')
  })
})

describe('persistence, timer, panels', () => {
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
    // via keyboard: with every other digit complete, wrongDigit's pad key is
    // grayed out by design — the keyboard path stays open
    fireEvent.keyDown(screen.getByRole('grid'), { key: String(wrongDigit) })
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

describe('confetti on solve', () => {
  // all but the first empty cell already solved
  const values = puzzle.solution.slice(0, firstEmpty) + '0' + puzzle.solution.slice(firstEmpty + 1)

  it('bursts on a live solve', () => {
    seedProgress({ values })
    render(<Sudoku />)
    expect(document.querySelector('canvas')).toBeNull()
    fireEvent.click(cellButton(row, col))
    fireEvent.click(screen.getByRole('button', { name: `Enter ${correctDigit}` }))
    expect(screen.getByRole('heading', { name: 'Solved' })).toBeInTheDocument()
    expect(document.querySelector('canvas')).not.toBeNull()
  })

  it('does not burst when resuming an already-solved board', () => {
    seedProgress({ values: puzzle.solution })
    render(<Sudoku />)
    expect(screen.getByRole('heading', { name: 'Solved' })).toBeInTheDocument()
    expect(document.querySelector('canvas')).toBeNull()
  })

  it('unmounts when a new puzzle starts', () => {
    seedProgress({ values })
    render(<Sudoku />)
    fireEvent.click(cellButton(row, col))
    fireEvent.click(screen.getByRole('button', { name: `Enter ${correctDigit}` }))
    fireEvent.click(screen.getByRole('button', { name: 'New puzzle' }))
    fireEvent.click(screen.getByRole('button', { name: 'easy' }))
    expect(document.querySelector('canvas')).toBeNull()
  })
})

describe('difficulty pills', () => {
  it('render with the current difficulty pressed', () => {
    seedProgress() // e01, easy
    render(<Sudoku />)
    expect(screen.getByRole('button', { name: 'Play easy' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Play medium' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Play hard' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('switch instantly on an untouched board', () => {
    seedProgress() // values === givens: no progress at stake
    render(<Sudoku />)
    fireEvent.click(screen.getByRole('button', { name: 'Play medium' }))
    expect(screen.queryByText('This abandons your current puzzle.')).toBeNull()
    expect(screen.getByRole('button', { name: 'Play medium' })).toHaveAttribute('aria-pressed', 'true')
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(saved.puzzleId).toMatch(/^m/)
  })

  it('confirm before abandoning a puzzle in progress, and Keep playing dismisses', () => {
    const values = puzzle.givens.slice(0, firstEmpty) + String(correctDigit) + puzzle.givens.slice(firstEmpty + 1)
    seedProgress({ values })
    render(<Sudoku />)
    fireEvent.click(screen.getByRole('button', { name: 'Play hard' }))
    expect(screen.getByText('Start a new hard puzzle?')).toBeInTheDocument()
    expect(screen.getByText('This abandons your current puzzle.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Keep playing' }))
    expect(screen.queryByText('Start a new hard puzzle?')).toBeNull()
    // board untouched, still the easy puzzle
    expect(cellButton(row, col)).toHaveAccessibleName(`Row ${row}, column ${col}, ${correctDigit}`)
    expect(screen.getByRole('button', { name: 'Play easy' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('confirming the switch starts the new puzzle and resets elapsed', () => {
    const values = puzzle.givens.slice(0, firstEmpty) + String(correctDigit) + puzzle.givens.slice(firstEmpty + 1)
    seedProgress({ values, elapsedSeconds: 300 })
    render(<Sudoku />)
    fireEvent.click(screen.getByRole('button', { name: 'Play hard' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start hard puzzle' }))
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(saved.puzzleId).toMatch(/^h/)
    expect(saved.elapsedSeconds).toBe(0)
    expect(screen.getByRole('button', { name: 'Play hard' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('tapping the current difficulty mid-game is a no-op', () => {
    const values = puzzle.givens.slice(0, firstEmpty) + String(correctDigit) + puzzle.givens.slice(firstEmpty + 1)
    seedProgress({ values })
    render(<Sudoku />)
    fireEvent.click(screen.getByRole('button', { name: 'Play easy' }))
    expect(screen.queryByText('Start a new easy puzzle?')).toBeNull()
    expect(cellButton(row, col)).toHaveAccessibleName(`Row ${row}, column ${col}, ${correctDigit}`)
  })

  it('start a fresh puzzle straight from the Solved panel', () => {
    const values = puzzle.solution.slice(0, firstEmpty) + '0' + puzzle.solution.slice(firstEmpty + 1)
    seedProgress({ values })
    render(<Sudoku />)
    fireEvent.click(cellButton(row, col))
    fireEvent.click(screen.getByRole('button', { name: `Enter ${correctDigit}` }))
    expect(screen.getByRole('heading', { name: 'Solved' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Play easy' }))
    expect(screen.queryByRole('heading', { name: 'Solved' })).toBeNull()
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(saved.puzzleId).toMatch(/^e/)
    expect(saved.puzzleId).not.toBe(puzzle.id) // e01 is used — a fresh easy puzzle deals
  })
})
