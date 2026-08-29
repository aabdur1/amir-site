/**
 * RTL tests for the WordSearch container — tap-ends + keyboard path (drag
 * is pointer-geometry, unit-tested in the engine and e2e-tested for real).
 * Deterministic: the container starts WORD_SEARCH_PUZZLES[0] in this task.
 */
import { render, screen, fireEvent, act } from '@testing-library/react'
import { WordSearch } from '@/components/games/word-search/word-search'
import { WORD_SEARCH_PUZZLES } from '@/lib/games/word-search-puzzles'
import { STORAGE_KEY } from '@/lib/games/word-search/storage'

const puzzle = WORD_SEARCH_PUZZLES[0]
const pl = puzzle.placements[0]
const cellsOf = (p: typeof pl) =>
  Array.from({ length: p.word.length }, (_, k) => (p.row + k * p.dRow) * puzzle.size + (p.col + k * p.dCol))
const target = cellsOf(pl)
const first = target[0]
const last = target[target.length - 1]

beforeEach(() => {
  vi.spyOn(Math, 'random').mockReturnValue(0)
})

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

function cell(i: number) {
  const r = Math.floor(i / puzzle.size) + 1
  const c = (i % puzzle.size) + 1
  return screen.getByRole('gridcell', { name: new RegExp(`^Row ${r}, column ${c},`) })
}

it('renders size² letter cells and the full word list', () => {
  render(<WordSearch />)
  expect(screen.getAllByRole('gridcell')).toHaveLength(puzzle.size * puzzle.size)
  for (const w of puzzle.words) {
    expect(screen.getByText(w)).toBeInTheDocument()
  }
})

it('tap-ends finds a word: struck in the list, cells tinted, status announced', () => {
  render(<WordSearch />)
  fireEvent.click(cell(first))
  fireEvent.click(cell(last))
  expect(screen.getByText(pl.word).className).toContain('line-through')
  expect(cell(first).className).toMatch(/bg-(sapphire|mauve|peach|lavender|rosewater)/)
  expect(screen.getByRole('status')).toHaveTextContent(`Found ${pl.word} — 1 of ${puzzle.words.length}`)
})

it('two taps that are not in a straight line keep the anchor and explain', () => {
  render(<WordSearch />)
  // any in-bounds cell whose row/col deltas from `first` are non-zero and
  // unequal is never colinear — search instead of hardcoding an offset that
  // could fall off the grid depending on where the placement sits
  const off = Array.from({ length: puzzle.size * puzzle.size }, (_, i) => i).find((i) => {
    const dr = Math.abs(Math.floor(i / puzzle.size) - Math.floor(first / puzzle.size))
    const dc = Math.abs((i % puzzle.size) - (first % puzzle.size))
    return dr !== 0 && dc !== 0 && dr !== dc
  })!
  fireEvent.click(cell(first))
  fireEvent.click(cell(off))
  expect(screen.getByRole('status')).toHaveTextContent("aren't in a straight line")
  expect(screen.getByText(pl.word).className).not.toContain('line-through')
})

it('a straight selection that spells nothing clears gently', () => {
  render(<WordSearch />)
  // first two cells of the placement spell a 2-letter non-word (targets are ≥4)
  fireEvent.click(cell(target[0]))
  fireEvent.click(cell(target[1]))
  expect(screen.getByRole('status')).toHaveTextContent('Not a word — cleared')
})

it('tapping the anchor again clears it', () => {
  render(<WordSearch />)
  fireEvent.click(cell(first))
  fireEvent.click(cell(first))
  fireEvent.click(cell(last)) // no anchor now — this only sets a new anchor
  expect(screen.getByText(pl.word).className).not.toContain('line-through')
})

it('keyboard: Enter anchors, Enter on the far end completes, Escape clears', () => {
  render(<WordSearch />)
  const grid = screen.getByRole('grid')
  fireEvent.click(cell(first))          // roving focus to the first cell + anchor set
  fireEvent.keyDown(grid, { key: 'Escape' })
  fireEvent.keyDown(grid, { key: 'Enter' }) // re-anchor at focused cell
  for (let k = 1; k < target.length; k++) {
    const dr = pl.dRow, dc = pl.dCol
    const key = dr === 1 ? 'ArrowDown' : dr === -1 ? 'ArrowUp' : dc === 1 ? 'ArrowRight' : 'ArrowLeft'
    // pure horizontal/vertical placements move one axis; diagonal placements
    // need both — send the vertical then horizontal arrow
    if (dr !== 0 && dc !== 0) {
      fireEvent.keyDown(grid, { key: dr === 1 ? 'ArrowDown' : 'ArrowUp' })
      fireEvent.keyDown(grid, { key: dc === 1 ? 'ArrowRight' : 'ArrowLeft' })
    } else {
      fireEvent.keyDown(grid, { key })
    }
  }
  fireEvent.keyDown(grid, { key: 'Enter' })
  expect(screen.getByText(pl.word).className).toContain('line-through')
})

describe('persistence, timer, pills, panels', () => {
  function seedProgress(overrides: Record<string, unknown> = {}) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      puzzleId: puzzle.id,
      found: [],
      elapsedSeconds: 0,
      usedIds: [puzzle.id],
      ...overrides,
    }))
  }
  const allFound = () => puzzle.placements.map((p) => ({ word: p.word, cells: cellsOf(p) }))

  it('resumes found words silently and repaints their cells', () => {
    seedProgress({ found: [{ word: pl.word, cells: target }] })
    render(<WordSearch />)
    expect(screen.getByText(pl.word).className).toContain('line-through')
    expect(cell(first).className).toMatch(/bg-(sapphire|mauve|peach|lavender|rosewater)/)
  })

  it('restore drops found entries that do not belong to the puzzle', () => {
    seedProgress({ found: [
      { word: 'NOTAWORD', cells: [0, 1, 2] },
      { word: pl.word, cells: [0, 9999] },
    ] })
    render(<WordSearch />)
    expect(screen.getByText(pl.word).className).not.toContain('line-through')
  })

  it('autosaves each find', () => {
    seedProgress()
    render(<WordSearch />)
    fireEvent.click(cell(first))
    fireEvent.click(cell(last))
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(saved.found).toEqual([{ word: pl.word, cells: target }])
  })

  it('timer accrues and lands in the autosave', () => {
    seedProgress()
    vi.useFakeTimers()
    render(<WordSearch />)
    act(() => { vi.advanceTimersByTime(30_000) })
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).elapsedSeconds).toBe(30)
    vi.useRealTimers()
  })

  it('finding the last word shows the solved panel with theme and elapsed', () => {
    const rest = allFound().filter((f) => f.word !== pl.word)
    seedProgress({ found: rest, elapsedSeconds: 845 })
    render(<WordSearch />)
    fireEvent.click(cell(first))
    fireEvent.click(cell(last))
    expect(screen.getByRole('heading', { name: `Found all ${puzzle.words.length}` })).toBeInTheDocument()
    expect(screen.getByText(`14 min · ${puzzle.theme} · ${puzzle.difficulty}`)).toBeInTheDocument()
  })

  it('difficulty pills: instant switch when nothing found, confirm mid-puzzle', () => {
    seedProgress()
    render(<WordSearch />)
    expect(screen.getByRole('button', { name: 'Play easy' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Play medium' }))
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).puzzleId).toMatch(/^wm/)
  })

  it('mid-puzzle switch confirms; Keep playing dismisses', () => {
    seedProgress({ found: [{ word: pl.word, cells: target }] })
    render(<WordSearch />)
    fireEvent.click(screen.getByRole('button', { name: 'Play hard' }))
    expect(screen.getByText('Start a new hard puzzle?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Keep playing' }))
    expect(screen.queryByText('Start a new hard puzzle?')).toBeNull()
    expect(screen.getByText(pl.word).className).toContain('line-through')
  })

  it('confirming the switch starts a fresh puzzle of that difficulty', () => {
    seedProgress({ found: [{ word: pl.word, cells: target }], elapsedSeconds: 300 })
    render(<WordSearch />)
    fireEvent.click(screen.getByRole('button', { name: 'Play hard' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start hard puzzle' }))
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(saved.puzzleId).toMatch(/^wh/)
    expect(saved.elapsedSeconds).toBe(0)
    expect(saved.found).toEqual([])
  })

  it('New game button opens the panel; picking a difficulty deals', () => {
    seedProgress()
    render(<WordSearch />)
    fireEvent.click(screen.getByRole('button', { name: 'New game' }))
    fireEvent.click(screen.getByRole('button', { name: 'easy' }))
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(saved.puzzleId).toMatch(/^we/)
    expect(saved.puzzleId).not.toBe(puzzle.id) // we01 used → a fresh easy deals
  })
})
