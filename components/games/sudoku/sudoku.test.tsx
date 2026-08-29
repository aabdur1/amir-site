/**
 * RTL tests for the Sudoku container (board + pad integration). All DOM —
 * no canvas. Storage-dependent behavior is tested in Task 7's additions;
 * here the container starts a fresh SUDOKU_PUZZLES[0] game.
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { Sudoku } from '@/components/games/sudoku/sudoku'
import { SUDOKU_PUZZLES } from '@/lib/games/sudoku-puzzles'

const puzzle = SUDOKU_PUZZLES[0]
const firstEmpty = puzzle.givens.indexOf('0')
const row = Math.floor(firstEmpty / 9) + 1
const col = (firstEmpty % 9) + 1
const correctDigit = Number(puzzle.solution[firstEmpty])
const wrongDigit = (correctDigit % 9) + 1 // any digit ≠ correct

afterEach(() => localStorage.clear())

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
