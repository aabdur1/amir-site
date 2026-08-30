import {
  STORAGE_KEY, defaultProgress, loadProgress, saveProgress,
} from '@/lib/games/mahjong/storage'

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

it('round-trips a save', () => {
  saveProgress({ puzzleId: 'mj01', removed: [0, 1], kinds: null, elapsedSeconds: 120, usedIds: ['mj01'] })
  expect(loadProgress()).toEqual({
    puzzleId: 'mj01', removed: [0, 1], kinds: null, elapsedSeconds: 120, usedIds: ['mj01'],
  })
})

it('round-trips a save with non-null kinds', () => {
  saveProgress({ puzzleId: 'mj01', removed: [2, 3, 4, 5], kinds: [0, 1, 2], elapsedSeconds: 60, usedIds: ['mj01', 'mj02'] })
  expect(loadProgress()).toEqual({
    puzzleId: 'mj01', removed: [2, 3, 4, 5], kinds: [0, 1, 2], elapsedSeconds: 60, usedIds: ['mj01', 'mj02'],
  })
})

it('returns null with no save or an unparsable payload', () => {
  expect(loadProgress()).toBeNull()
  localStorage.setItem(STORAGE_KEY, '{not json')
  expect(loadProgress()).toBeNull()
})

it('rejects malformed shapes', () => {
  const bad = [
    { puzzleId: 5, removed: [0, 1], kinds: null, elapsedSeconds: 0, usedIds: [] },
    { puzzleId: 'mj01', removed: [0], kinds: null, elapsedSeconds: 0, usedIds: [] }, // odd length
    { puzzleId: 'mj01', removed: [0, -1], kinds: null, elapsedSeconds: 0, usedIds: [] }, // negative
    { puzzleId: 'mj01', removed: [0, 1.5], kinds: null, elapsedSeconds: 0, usedIds: [] }, // non-integer
    { puzzleId: 'mj01', removed: [0, 1], kinds: 'not-array', elapsedSeconds: 0, usedIds: [] }, // kinds as string
    { puzzleId: 'mj01', removed: [0, 1], kinds: [0, -1], elapsedSeconds: 0, usedIds: [] }, // negative in kinds
    { puzzleId: 'mj01', removed: [0, 1], kinds: [0, 1.5], elapsedSeconds: 0, usedIds: [] }, // non-integer in kinds
    { puzzleId: 'mj01', removed: [0, 1], kinds: null, elapsedSeconds: Infinity, usedIds: [] },
    { puzzleId: 'mj01', removed: [0, 1], kinds: null, elapsedSeconds: 0, usedIds: [7] },
    { puzzleId: 'mj01', removed: [0, 1], kinds: null, elapsedSeconds: 0 }, // missing usedIds
  ]
  for (const p of bad) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
    expect(loadProgress()).toBeNull()
  }
})

it('defaultProgress is an empty fresh state', () => {
  expect(defaultProgress()).toEqual({
    puzzleId: null, removed: [], kinds: null, elapsedSeconds: 0, usedIds: [],
  })
})

it('saveProgress swallows storage errors', () => {
  vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
    throw new Error('QuotaExceededError')
  })
  const progress = { puzzleId: 'mj01', removed: [0, 1], kinds: null, elapsedSeconds: 120, usedIds: ['mj01'] }
  expect(() => saveProgress(progress)).not.toThrow()
  expect(localStorage.setItem).toHaveBeenCalled()
})
