// localStorage persistence for /games/word-scramble. Shape validation only —
// clamping solvedCount to the resumed puzzle's word count is the component
// restore path's job, so this module never imports the bank. Every access
// is try/catch: private mode, quota, and corrupt payloads degrade to
// "no save", never a crash.

export const STORAGE_KEY = 'word-scramble-progress-v1'

export interface SavedWordScramble {
  puzzleId: string | null
  solvedCount: number
  elapsedSeconds: number
  usedIds: string[]
}

export function defaultProgress(): SavedWordScramble {
  return { puzzleId: null, solvedCount: 0, elapsedSeconds: 0, usedIds: [] }
}

function isValid(p: unknown): p is SavedWordScramble {
  if (typeof p !== 'object' || p === null) return false
  const o = p as Record<string, unknown>
  if (o.puzzleId !== null && typeof o.puzzleId !== 'string') return false
  if (typeof o.solvedCount !== 'number' || !Number.isInteger(o.solvedCount) || o.solvedCount < 0) return false
  if (typeof o.elapsedSeconds !== 'number' || !Number.isFinite(o.elapsedSeconds)) return false
  if (!Array.isArray(o.usedIds) || !o.usedIds.every((id) => typeof id === 'string')) return false
  return true
}

export function loadProgress(): SavedWordScramble | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isValid(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function saveProgress(p: SavedWordScramble): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
  } catch {
    // storage unavailable — play continues without persistence
  }
}
