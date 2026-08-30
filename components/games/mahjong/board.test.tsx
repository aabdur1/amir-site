import { render, screen, fireEvent, within } from '@testing-library/react'
import { MahjongBoard } from '@/components/games/mahjong/board'
import { startGame, type MahjongLayout } from '@/lib/games/mahjong/engine'

// row of three: ends free, middle blocked; kinds dot-1, dot-1, dot-2
const ROW: MahjongLayout = { positions: [
  { x: 0, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }, { x: 4, y: 0, z: 0 },
] }
const state = () => startGame({ id: 't', difficulty: 'easy', kinds: [0, 1, 0], solution: [] })

function renderBoard(overrides: Partial<Parameters<typeof MahjongBoard>[0]> = {}) {
  const props = {
    layout: ROW, state: state(), selected: null, hintPair: null,
    onTileTap: vi.fn(), ...overrides,
  }
  render(<MahjongBoard {...props} />)
  return props
}

it('renders remaining tiles with face/position labels; blocked tiles say so and are aria-disabled', () => {
  renderBoard()
  const board = screen.getByRole('group', { name: 'Mahjong board' })
  expect(within(board).getAllByRole('button')).toHaveLength(3)
  expect(screen.getByRole('button', { name: 'One of dots, row 1, column 1, layer 1' })).toBeInTheDocument()
  const middle = screen.getByRole('button', { name: 'Two of dots, row 1, column 2, layer 1, blocked' })
  expect(middle).toHaveAttribute('aria-disabled', 'true')
})

it('removed tiles are not rendered', () => {
  const s = { ...state(), removed: [0, 2] }
  renderBoard({ state: s })
  expect(screen.getAllByRole('button')).toHaveLength(1)
})

it('tapping any tile (free or blocked) reports its index', () => {
  const props = renderBoard()
  fireEvent.click(screen.getByRole('button', { name: /column 3/ }))
  expect(props.onTileTap).toHaveBeenCalledWith(2)
  fireEvent.click(screen.getByRole('button', { name: /blocked/ }))
  expect(props.onTileTap).toHaveBeenCalledWith(1)
})

it('selected tile is labeled and ringed', () => {
  renderBoard({ selected: 0 })
  const tile = screen.getByRole('button', { name: /column 1.*selected/ })
  expect(tile.className).toContain('ring-2')
})

it('keyboard: arrows cycle free tiles, Enter activates, Escape clears', () => {
  const props = renderBoard()
  const board = screen.getByRole('group', { name: 'Mahjong board' })
  const free1 = screen.getByRole('button', { name: /column 1/ })
  free1.focus()
  fireEvent.keyDown(board, { key: 'ArrowRight' })
  expect(screen.getByRole('button', { name: /column 3/ })).toHaveFocus()
  fireEvent.keyDown(board, { key: 'Enter' })
  expect(props.onTileTap).toHaveBeenCalledWith(2)
  fireEvent.keyDown(board, { key: 'Escape' })
  expect(props.onTileTap).toHaveBeenCalledWith(-1)
})

it('restores DOM focus to the new roving-focus target when the focused tile unmounts (a keyboard-driven match)', () => {
  const onTileTap = vi.fn()
  const { rerender } = render(
    <MahjongBoard layout={ROW} state={state()} selected={null} hintPair={null} onTileTap={onTileTap} />
  )
  const free1 = screen.getByRole('button', { name: /column 1/ })
  free1.focus()
  expect(free1).toHaveFocus()

  // Simulate the container removing the matched pair (the two free ends —
  // index 0 and index 2) in response to that Enter. Index 1 (the old
  // middle, blocked tile) is now the sole remaining, now-free tile.
  const removedState = { ...state(), removed: [0, 2] }
  rerender(
    <MahjongBoard layout={ROW} state={removedState} selected={null} hintPair={null} onTileTap={onTileTap} />
  )

  expect(screen.getAllByRole('button')).toHaveLength(1)
  expect(screen.getByRole('button')).toHaveFocus()
})

it('does not steal focus from an element outside the board when it was never inside the board', () => {
  const onTileTap = vi.fn()
  const outside = document.createElement('button')
  outside.textContent = 'Outside'
  document.body.appendChild(outside)
  outside.focus()
  expect(outside).toHaveFocus()

  const { rerender } = render(
    <MahjongBoard layout={ROW} state={state()} selected={null} hintPair={null} onTileTap={onTileTap} />
  )
  const removedState = { ...state(), removed: [0, 2] }
  rerender(
    <MahjongBoard layout={ROW} state={removedState} selected={null} hintPair={null} onTileTap={onTileTap} />
  )

  expect(outside).toHaveFocus()
  document.body.removeChild(outside)
})
