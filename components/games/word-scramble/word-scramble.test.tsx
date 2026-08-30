/**
 * RTL tests for the WordScramble container. Deterministic: Math.random is
 * pinned so the fallback deal is WORD_SCRAMBLE_PUZZLES[0]; solving taps
 * tray tiles by letter (robust to any scramble order). matchMedia +
 * getContext stubs are file-wide because any live solve mounts
 * ConfettiBurst (established games-test pattern).
 */
import { render, screen, fireEvent, act, within } from '@testing-library/react'
import { WordScramble } from '@/components/games/word-scramble/word-scramble'
import { WORD_SCRAMBLE_PUZZLES } from '@/lib/games/word-scramble-puzzles'
import { STORAGE_KEY } from '@/lib/games/word-scramble/storage'

const puzzle = WORD_SCRAMBLE_PUZZLES[0] // 'se01' with Math.random pinned to 0
const firstWord = puzzle.words[0]
const N = puzzle.words.length

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

function seedProgress(overrides: Record<string, unknown> = {}) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    puzzleId: puzzle.id,
    solvedCount: 0,
    elapsedSeconds: 0,
    usedIds: [puzzle.id],
    ...overrides,
  }))
}

// Tap tray tiles spelling `word` left to right.
function tapWord(word: string) {
  const tray = screen.getByRole('group', { name: 'Letter tiles' })
  for (const ch of word) {
    fireEvent.click(within(tray).getAllByRole('button', { name: `Letter ${ch}` })[0])
  }
}

it('deals an easy puzzle with the fig. 03 annotation', () => {
  render(<WordScramble />)
  expect(screen.getByText(`fig. 03 · ${puzzle.theme} · 0/${N} solved`)).toBeInTheDocument()
  expect(screen.getByRole('group', { name: 'Your answer' })).toBeInTheDocument()
})

it('solving a word announces it, then advances to the next after the beat', () => {
  vi.useFakeTimers()
  seedProgress()
  render(<WordScramble />)
  tapWord(firstWord)
  expect(screen.getByRole('status')).toHaveTextContent(`${firstWord} solved — 1 of ${N}`)
  act(() => { vi.advanceTimersByTime(600) })
  expect(screen.getByText(`fig. 03 · ${puzzle.theme} · 1/${N} solved`)).toBeInTheDocument()
  const solvedList = screen.getByRole('list', { name: 'Solved words' })
  expect(within(solvedList).getByText(firstWord).closest('li')!.className).toContain('line-through')
  vi.useRealTimers()
})

it('a full wrong arrangement shows the gentle nudge and keeps the tiles', () => {
  seedProgress()
  render(<WordScramble />)
  // spell the word with its last letter first — guaranteed wrong
  const rotated = firstWord[firstWord.length - 1] + firstWord.slice(0, -1)
  tapWord(rotated)
  expect(screen.getByText('Not quite — tap letters to move them back')).toBeInTheDocument()
  const slots = within(screen.getByRole('group', { name: 'Your answer' })).getAllByRole('button')
  expect(slots[0]).toHaveAccessibleName(`Slot 1 of ${firstWord.length}, ${rotated[0]}`)
})

it('Reveal a letter locks slot 1; enough hints finish the word', () => {
  vi.useFakeTimers()
  seedProgress()
  render(<WordScramble />)
  fireEvent.click(screen.getByRole('button', { name: 'Reveal a letter' }))
  const slots = within(screen.getByRole('group', { name: 'Your answer' })).getAllByRole('button')
  expect(slots[0]).toHaveAccessibleName(`Slot 1 of ${firstWord.length}, ${firstWord[0]}, revealed`)
  for (let i = 1; i < firstWord.length; i++) {
    fireEvent.click(screen.getByRole('button', { name: 'Reveal a letter' }))
  }
  expect(screen.getByRole('status')).toHaveTextContent(`${firstWord} solved — 1 of ${N}`)
  vi.useRealTimers()
})

it('autosaves solved progress', () => {
  vi.useFakeTimers()
  seedProgress()
  render(<WordScramble />)
  tapWord(firstWord)
  act(() => { vi.advanceTimersByTime(600) })
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
  expect(saved.solvedCount).toBe(1)
  expect(saved.puzzleId).toBe(puzzle.id)
  vi.useRealTimers()
})

it('resumes solvedCount with the solved list populated; clamps out-of-range', () => {
  seedProgress({ solvedCount: 2 })
  render(<WordScramble />)
  expect(screen.getByText(`fig. 03 · ${puzzle.theme} · 2/${N} solved`)).toBeInTheDocument()
  const solvedList = screen.getByRole('list', { name: 'Solved words' })
  expect(within(solvedList).getByText(puzzle.words[0])).toBeInTheDocument()
  expect(within(solvedList).getByText(puzzle.words[1])).toBeInTheDocument()
})

it('clamps an oversized solvedCount to solved', () => {
  seedProgress({ solvedCount: 99 })
  render(<WordScramble />)
  expect(screen.getByRole('heading', { name: `Unscrambled all ${N}` })).toBeInTheDocument()
})

it('resume-of-solved shows the panel without confetti', () => {
  seedProgress({ solvedCount: N })
  render(<WordScramble />)
  expect(screen.getByRole('heading', { name: `Unscrambled all ${N}` })).toBeInTheDocument()
  expect(document.querySelector('canvas')).toBeNull()
})

it('solving the last word live shows the panel with confetti; new game clears it', () => {
  vi.useFakeTimers()
  seedProgress({ solvedCount: N - 1 })
  render(<WordScramble />)
  tapWord(puzzle.words[N - 1])
  act(() => { vi.advanceTimersByTime(600) })
  expect(screen.getByRole('heading', { name: `Unscrambled all ${N}` })).toBeInTheDocument()
  expect(document.querySelector('canvas')).not.toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'New puzzle' }))
  fireEvent.click(screen.getByRole('button', { name: 'easy' }))
  expect(document.querySelector('canvas')).toBeNull()
  vi.useRealTimers()
})

describe('difficulty pills', () => {
  it('switch instantly with no progress', () => {
    seedProgress()
    render(<WordScramble />)
    fireEvent.click(screen.getByRole('button', { name: 'Play medium' }))
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).puzzleId).toMatch(/^sm/)
  })

  it('confirm before abandoning progress; Keep playing dismisses', () => {
    seedProgress({ solvedCount: 1 })
    render(<WordScramble />)
    fireEvent.click(screen.getByRole('button', { name: 'Play hard' }))
    expect(screen.getByText('Start a new hard puzzle?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Keep playing' }))
    expect(screen.queryByText('Start a new hard puzzle?')).toBeNull()
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).puzzleId).toBe(puzzle.id)
  })

  it('a placed tile alone counts as progress', () => {
    seedProgress()
    render(<WordScramble />)
    tapWord(firstWord[0])
    fireEvent.click(screen.getByRole('button', { name: 'Play hard' }))
    expect(screen.getByText('Start a new hard puzzle?')).toBeInTheDocument()
  })
})

it('timer accrues while visible and lands in the autosave', () => {
  seedProgress()
  vi.useFakeTimers()
  render(<WordScramble />)
  act(() => { vi.advanceTimersByTime(30_000) })
  expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).elapsedSeconds).toBe(30)
  vi.useRealTimers()
})
