// localStorage persistence for /games/word-search. Shape validation only —
// puzzle-consistency (words belong to the resumed puzzle, cells in range)
// is the component restore path's job, so this module never imports the
// bank. Every access is try/catch: private mode, quota, and corrupt
// payloads degrade to "no save", never a crash.

export const STORAGE_KEY = 'word-search-progress-v1'

export interface SavedWordSearch {
  puzzleId: string | null
  found: { word: string; cells: number[] }[]
  elapsedSeconds: number
  usedIds: string[]
}

export function defaultProgress(): SavedWordSearch {
  return { puzzleId: null, found: [], elapsedSeconds: 0, usedIds: [] }
}

function isValid(p: unknown): p is SavedWordSearch {
  if (typeof p !== 'object' || p === null) return false
  const o = p as Record<string, unknown>
  if (o.puzzleId !== null && typeof o.puzzleId !== 'string') return false
  if (typeof o.elapsedSeconds !== 'number' || !Number.isFinite(o.elapsedSeconds)) return false
  if (!Array.isArray(o.usedIds) || !o.usedIds.every((id) => typeof id === 'string')) return false
  if (!Array.isArray(o.found)) return false
  for (const f of o.found) {
    if (typeof f !== 'object' || f === null) return false
    const e = f as Record<string, unknown>
    if (typeof e.word !== 'string') return false
    if (!Array.isArray(e.cells) || !e.cells.every((c) => typeof c === 'number')) return false
  }
  return true
}

export function loadProgress(): SavedWordSearch | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isValid(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function saveProgress(p: SavedWordSearch): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
  } catch {
    // storage unavailable — play continues without persistence
  }
}
