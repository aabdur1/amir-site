/**
 * RTL tests for the presentational board. State transitions live in the
 * engine; here we assert the WordState → buttons mapping and callbacks.
 */
import { render, screen, fireEvent, within } from '@testing-library/react'
import { ScrambleBoard } from '@/components/games/word-scramble/scramble-board'
import { startWord, placeTile, type WordState } from '@/lib/games/word-scramble/engine'

function renderBoard(ws: WordState, overrides: Partial<Parameters<typeof ScrambleBoard>[0]> = {}) {
  const props = {
    ws,
    wordDone: false,
    onPlace: vi.fn(),
    onReturn: vi.fn(),
    onShuffle: vi.fn(),
    onHint: vi.fn(),
    onClear: vi.fn(),
    ...overrides,
  }
  render(<ScrambleBoard {...props} />)
  return props
}

const ws0 = startWord('HONEY', () => 0.5)

it('renders one slot per letter and one tray tile per unplaced letter', () => {
  renderBoard(ws0)
  const slots = within(screen.getByRole('group', { name: 'Your answer' })).getAllByRole('button')
  expect(slots).toHaveLength(5)
  expect(slots[0]).toHaveAccessibleName('Slot 1 of 5, empty')
  const tray = within(screen.getByRole('group', { name: 'Letter tiles' })).getAllByRole('button')
  expect(tray).toHaveLength(5)
  expect(tray.map((b) => b.textContent).sort().join('')).toBe('EHNOY')
})

it('a placed tile leaves the tray and labels its slot', () => {
  const t = ws0.tray.find((i) => ws0.tiles[i] === 'H')!
  renderBoard(placeTile(ws0, t))
  expect(within(screen.getByRole('group', { name: 'Letter tiles' })).getAllByRole('button')).toHaveLength(4)
  expect(screen.getByRole('button', { name: 'Slot 1 of 5, H' })).toBeInTheDocument()
})

it('tapping a tray tile calls onPlace with its tile index', () => {
  const props = renderBoard(ws0)
  const tray = screen.getByRole('group', { name: 'Letter tiles' })
  fireEvent.click(within(tray).getAllByRole('button', { name: 'Letter H' })[0])
  expect(props.onPlace).toHaveBeenCalledWith(ws0.tiles.indexOf('H'))
})

it('tapping a filled slot calls onReturn with its index', () => {
  const props = renderBoard(placeTile(ws0, ws0.tray[0]))
  const slot = within(screen.getByRole('group', { name: 'Your answer' })).getAllByRole('button')[0]
  fireEvent.click(slot)
  expect(props.onReturn).toHaveBeenCalledWith(0)
})

it('a locked slot is aria-disabled and inert', () => {
  const t = ws0.tray[0]
  const filled = placeTile(ws0, t)
  const lockedWs = { ...filled, locked: filled.locked.map((_, i) => i === 0) }
  const props = renderBoard(lockedWs)
  const slot = within(screen.getByRole('group', { name: 'Your answer' })).getAllByRole('button')[0]
  expect(slot.getAttribute('aria-label')).toContain('revealed')
  expect(slot).toHaveAttribute('aria-disabled', 'true')
  fireEvent.click(slot)
  expect(props.onReturn).not.toHaveBeenCalled()
})

it('controls fire their callbacks', () => {
  const props = renderBoard(ws0)
  fireEvent.click(screen.getByRole('button', { name: 'Reveal a letter' }))
  fireEvent.click(screen.getByRole('button', { name: 'Shuffle' }))
  fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
  expect(props.onHint).toHaveBeenCalled()
  expect(props.onShuffle).toHaveBeenCalled()
  expect(props.onClear).toHaveBeenCalled()
})

it('keyboard: a letter key places the first matching tray tile, Backspace returns the last unlocked filled slot', () => {
  const t = ws0.tray[0]
  const filled = placeTile(ws0, t)
  const props = renderBoard(filled)
  const tray = screen.getByRole('group', { name: 'Letter tiles' })
  fireEvent.keyDown(tray, { key: 'n' })
  expect(props.onPlace).toHaveBeenCalledWith(ws0.tiles.indexOf('N'))
  fireEvent.keyDown(tray, { key: 'Backspace' })
  expect(props.onReturn).toHaveBeenCalledWith(0)
})

it('keyboard ignores letters with no tray tile', () => {
  const props = renderBoard(ws0)
  fireEvent.keyDown(screen.getByRole('group', { name: 'Letter tiles' }), { key: 'z' })
  expect(props.onPlace).not.toHaveBeenCalled()
})
