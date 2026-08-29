/**
 * Tests for lib/games/word-search/storage.ts — shape validation only; the
 * component's restore path owns puzzle-consistency (spec: Persistence).
 */
import {
  STORAGE_KEY, defaultProgress, loadProgress, saveProgress,
  type SavedWordSearch,
} from '@/lib/games/word-search/storage'

const VALID: SavedWordSearch = {
  puzzleId: 'we01',
  found: [{ word: 'GARDEN', cells: [0, 1, 2, 3, 4, 5] }],
  elapsedSeconds: 90,
  usedIds: ['we01'],
}

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

it('round-trips a valid progress object', () => {
  saveProgress(VALID)
  expect(loadProgress()).toEqual(VALID)
})

it('returns null when nothing is stored and on corrupt JSON', () => {
  expect(loadProgress()).toBeNull()
  localStorage.setItem(STORAGE_KEY, '{nope')
  expect(loadProgress()).toBeNull()
})

it('returns null on shape violations', () => {
  for (const bad of [
    { ...VALID, found: [{ word: 7, cells: [0] }] },          // word not a string
    { ...VALID, found: [{ word: 'A', cells: 'x' }] },        // cells not an array
    { ...VALID, found: [{ word: 'A', cells: [0, 'b'] }] },   // cell not a number
    { ...VALID, found: 'GARDEN' },                            // found not an array
    { ...VALID, elapsedSeconds: 'soon' },
    { ...VALID, usedIds: [1] },
    { ...VALID, puzzleId: 7 },
  ]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bad))
    expect(loadProgress()).toBeNull()
  }
})

it('defaultProgress validates', () => {
  saveProgress(defaultProgress())
  expect(loadProgress()).toEqual(defaultProgress())
})

it('saveProgress swallows storage errors', () => {
  vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
    throw new Error('QuotaExceededError')
  })
  expect(() => saveProgress(VALID)).not.toThrow()
  expect(localStorage.setItem).toHaveBeenCalled()
})
