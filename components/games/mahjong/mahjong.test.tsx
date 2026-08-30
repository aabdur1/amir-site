/**
 * RTL tests for the Mahjong container. Deterministic: Math.random pinned →
 * fallback deal is MAHJONG_DEALS[0] (me01); the deal's committed solution
 * supplies known-free matching pairs. matchMedia/getContext stubbed
 * file-wide (ConfettiBurst mounts on any live clear).
 */
import { render, screen, fireEvent, act } from '@testing-library/react'
import { Mahjong } from '@/components/games/mahjong/mahjong'
import { MAHJONG_DEALS } from '@/lib/games/mahjong-deals'
import { MAHJONG_LAYOUTS } from '@/lib/games/mahjong-layouts'
import { KINDS } from '@/lib/games/mahjong/engine'
import { FACE_NAMES } from '@/components/games/mahjong/tile-faces'
import { STORAGE_KEY } from '@/lib/games/mahjong/storage'

const deal = MAHJONG_DEALS[0] // me01
const layout = MAHJONG_LAYOUTS.easy
const label = (i: number) => {
  const p = layout.positions[i]
  return `${FACE_NAMES[KINDS[deal.kinds[i]]]}, row ${p.y / 2 + 1}, column ${p.x / 2 + 1}, layer ${p.z + 1}`
}
const [pairA, pairB] = [deal.solution[0], deal.solution[1]]
const totalPairs = deal.kinds.length / 2

beforeEach(() => {
  vi.spyOn(Math, 'random').mockReturnValue(0)
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }))
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
})
afterEach(() => {
  localStorage.clear()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function seed(overrides: Record<string, unknown> = {}) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    puzzleId: deal.id, removed: [], kinds: null,
    elapsedSeconds: 0, usedIds: [deal.id], ...overrides,
  }))
}

it('deals me01 with the fig. 04 annotation and a full board', () => {
  render(<Mahjong />)
  expect(screen.getByText(`fig. 04 · ${totalPairs} pairs · easy`)).toBeInTheDocument()
  expect(screen.getAllByRole('button', { name: /layer \d/ })).toHaveLength(deal.kinds.length)
})

it('matching the first solution pair removes it and updates the count', () => {
  seed()
  render(<Mahjong />)
  fireEvent.click(screen.getByRole('button', { name: label(pairA) }))
  fireEvent.click(screen.getByRole('button', { name: label(pairB) }))
  expect(screen.getByText(`fig. 04 · ${totalPairs - 1} pairs · easy`)).toBeInTheDocument()
  expect(screen.getByRole('status').textContent).toContain('Matched two')
})

it('tapping a blocked tile announces and does not select it', () => {
  seed()
  render(<Mahjong />)
  const blocked = screen.getAllByRole('button', { name: /, blocked$/ })[0]
  fireEvent.click(blocked)
  expect(screen.getByRole('status')).toHaveTextContent('That tile is blocked')
  expect(screen.queryByRole('button', { name: /selected/ })).toBeNull()
})

it('undo restores the last pair and is disabled on a fresh board', () => {
  seed()
  render(<Mahjong />)
  const undoBtn = screen.getByRole('button', { name: 'Undo' })
  expect(undoBtn).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: label(pairA) }))
  fireEvent.click(screen.getByRole('button', { name: label(pairB) }))
  expect(undoBtn).toBeEnabled()
  fireEvent.click(undoBtn)
  expect(screen.getByText(`fig. 04 · ${totalPairs} pairs · easy`)).toBeInTheDocument()
})

it('hint pulses a pair and announces it', () => {
  seed()
  render(<Mahjong />)
  fireEvent.click(screen.getByRole('button', { name: 'Hint' }))
  expect(screen.getByRole('status').textContent).toMatch(/^Hint: two /)
})

it('autosaves removal order; resume rebuilds the board AND the undo history', () => {
  seed()
  render(<Mahjong />)
  fireEvent.click(screen.getByRole('button', { name: label(pairA) }))
  fireEvent.click(screen.getByRole('button', { name: label(pairB) }))
  expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).removed).toEqual([pairA, pairB])
  // remount = resume
  render(<Mahjong />)
  const boards = screen.getAllByText(`fig. 04 · ${totalPairs - 1} pairs · easy`)
  expect(boards.length).toBeGreaterThan(0)
  // undo works right after resume (removal order rebuilt the history)
  const undoBtns = screen.getAllByRole('button', { name: 'Undo' })
  expect(undoBtns[undoBtns.length - 1]).toBeEnabled()
})

it('an invalid save (unreplayable removed list) falls back to a fresh deal', () => {
  seed({ removed: [0, 0] }) // same tile twice can never replay
  render(<Mahjong />)
  expect(screen.getByText(`fig. 04 · ${totalPairs} pairs · easy`)).toBeInTheDocument()
})

it('clearing the last pair live shows Board cleared with confetti; resume-of-cleared has no confetti', () => {
  // all but the LAST solution pair already removed
  seed({ removed: deal.solution.slice(0, -2) })
  render(<Mahjong />)
  expect(document.querySelector('canvas')).toBeNull()
  const [a, b] = deal.solution.slice(-2)
  fireEvent.click(screen.getByRole('button', { name: label(a) }))
  fireEvent.click(screen.getByRole('button', { name: label(b) }))
  expect(screen.getByRole('heading', { name: 'Board cleared' })).toBeInTheDocument()
  expect(document.querySelector('canvas')).not.toBeNull()
})

it('resume-of-cleared shows the panel without confetti', () => {
  seed({ removed: deal.solution })
  render(<Mahjong />)
  expect(screen.getByRole('heading', { name: 'Board cleared' })).toBeInTheDocument()
  expect(document.querySelector('canvas')).toBeNull()
})

it('the live clear status is distinct from the visible heading', () => {
  seed({ removed: deal.solution.slice(0, -2) })
  render(<Mahjong />)
  const [a, b] = deal.solution.slice(-2)
  fireEvent.click(screen.getByRole('button', { name: label(a) }))
  fireEvent.click(screen.getByRole('button', { name: label(b) }))
  expect(screen.getByRole('status')).toHaveTextContent('All pairs matched')
  expect(screen.getByRole('heading', { name: 'Board cleared' })).toBeInTheDocument()
})

it('undo is disabled after a live clear and does not revert the winning match', () => {
  seed({ removed: deal.solution.slice(0, -2) })
  render(<Mahjong />)
  const [a, b] = deal.solution.slice(-2)
  fireEvent.click(screen.getByRole('button', { name: label(a) }))
  fireEvent.click(screen.getByRole('button', { name: label(b) }))
  const undoBtn = screen.getByRole('button', { name: 'Undo' })
  expect(undoBtn).toBeDisabled()
  fireEvent.click(undoBtn)
  expect(screen.getByRole('heading', { name: 'Board cleared' })).toBeInTheDocument()
  expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).removed).toEqual(deal.solution)
})

it('difficulty pills confirm before abandoning progress', () => {
  seed({ removed: deal.solution.slice(0, 2) })
  render(<Mahjong />)
  fireEvent.click(screen.getByRole('button', { name: 'Play hard' }))
  expect(screen.getByText('Start a new hard puzzle?')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Keep playing' }))
  expect(screen.queryByText('Start a new hard puzzle?')).toBeNull()
})

it('timer accrues into the autosave', () => {
  seed()
  vi.useFakeTimers()
  render(<Mahjong />)
  act(() => { vi.advanceTimersByTime(30_000) })
  expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).elapsedSeconds).toBe(30)
  vi.useRealTimers()
})

it('the no-moves rescue never appears on a cleared board', () => {
  seed({ removed: deal.solution })
  render(<Mahjong />)
  expect(screen.queryByText('No moves left')).toBeNull()
})
