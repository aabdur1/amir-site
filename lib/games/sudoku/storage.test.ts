/**
 * Tests for lib/games/sudoku/storage.ts. jsdom provides a working
 * localStorage; the quota test stubs setItem to throw.
 */
import {
  STORAGE_KEY, defaultProgress, loadProgress, saveProgress,
  type SavedProgress,
} from '@/lib/games/sudoku/storage'

const VALID: SavedProgress = {
  puzzleId: 'e01',
  values: '0'.repeat(81),
  notes: Array(81).fill(0),
  elapsedSeconds: 120,
  usedIds: ['e01'],
  settings: { showMistakes: true },
}

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

it('round-trips a valid progress object', () => {
  saveProgress(VALID)
  expect(loadProgress()).toEqual(VALID)
})

it('returns null when nothing is stored', () => {
  expect(loadProgress()).toBeNull()
})

it('returns null on corrupt JSON', () => {
  localStorage.setItem(STORAGE_KEY, '{nope')
  expect(loadProgress()).toBeNull()
})

it('returns null on shape violations', () => {
  for (const bad of [
    { ...VALID, values: '0'.repeat(80) },        // wrong length
    { ...VALID, notes: Array(80).fill(0) },       // wrong length
    { ...VALID, elapsedSeconds: 'soon' },         // wrong type
    { ...VALID, usedIds: [1, 2] },                // wrong element type
    { ...VALID, settings: {} },                   // missing flag
  ]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bad))
    expect(loadProgress()).toBeNull()
  }
})

it('rejects wrong-typed values/notes even when puzzleId is null', () => {
  for (const bad of [
    { puzzleId: null, values: 123, notes: [], elapsedSeconds: 0, usedIds: [], settings: { showMistakes: true } },  // values not string
    { puzzleId: null, values: '', notes: 'x', elapsedSeconds: 0, usedIds: [], settings: { showMistakes: true } },   // notes not array
  ]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bad))
    expect(loadProgress()).toBeNull()
  }
})

it('allows empty values/notes when puzzleId is null', () => {
  const fresh = defaultProgress()
  saveProgress(fresh)
  expect(loadProgress()).toEqual(fresh)
})

it('saveProgress swallows storage errors (private mode / quota)', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('QuotaExceededError')
  })
  expect(() => saveProgress(VALID)).not.toThrow()
})
