import {
  STORAGE_KEY, defaultProgress, loadProgress, saveProgress,
} from '@/lib/games/word-scramble/storage'

afterEach(() => localStorage.clear())

it('round-trips a save', () => {
  saveProgress({ puzzleId: 'se01', solvedCount: 3, elapsedSeconds: 120, usedIds: ['se01'] })
  expect(loadProgress()).toEqual({
    puzzleId: 'se01', solvedCount: 3, elapsedSeconds: 120, usedIds: ['se01'],
  })
})

it('returns null with no save or an unparsable payload', () => {
  expect(loadProgress()).toBeNull()
  localStorage.setItem(STORAGE_KEY, '{not json')
  expect(loadProgress()).toBeNull()
})

it('rejects malformed shapes', () => {
  const bad = [
    { puzzleId: 5, solvedCount: 0, elapsedSeconds: 0, usedIds: [] },
    { puzzleId: 'se01', solvedCount: -1, elapsedSeconds: 0, usedIds: [] },
    { puzzleId: 'se01', solvedCount: 1.5, elapsedSeconds: 0, usedIds: [] },
    { puzzleId: 'se01', solvedCount: 0, elapsedSeconds: Infinity, usedIds: [] },
    { puzzleId: 'se01', solvedCount: 0, elapsedSeconds: 0, usedIds: [7] },
    { puzzleId: 'se01', solvedCount: 0, elapsedSeconds: 0 },
  ]
  for (const p of bad) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
    expect(loadProgress()).toBeNull()
  }
})

it('defaultProgress is an empty fresh state', () => {
  expect(defaultProgress()).toEqual({
    puzzleId: null, solvedCount: 0, elapsedSeconds: 0, usedIds: [],
  })
})
