// localStorage persistence for /games/mahjong. Shape validation only —
// deal-consistency (in-range, replayable) is the component's job, so this module
// never imports the bank. Every access is try/catch: private mode, quota, and
// corrupt payloads degrade to "no save", never a crash.

export const STORAGE_KEY = 'mahjong-progress-v1'

export interface SavedMahjong {
  puzzleId: string | null
  removed: number[]         // ordered removal list — restore rebuilds full undo history
  kinds: number[] | null    // null until a shuffle diverges from the deal
  elapsedSeconds: number
  usedIds: string[]
}

export function defaultProgress(): SavedMahjong {
  return { puzzleId: null, removed: [], kinds: null, elapsedSeconds: 0, usedIds: [] }
}

function isValid(p: unknown): p is SavedMahjong {
  if (typeof p !== 'object' || p === null) return false
  const o = p as Record<string, unknown>
  if (o.puzzleId !== null && typeof o.puzzleId !== 'string') return false
  if (!Array.isArray(o.removed) || o.removed.length % 2 !== 0) return false
  if (!o.removed.every((r) => typeof r === 'number' && Number.isInteger(r) && r >= 0)) return false
  if (o.kinds !== null && (!Array.isArray(o.kinds) || !o.kinds.every((k) => typeof k === 'number' && Number.isInteger(k) && k >= 0))) return false
  if (typeof o.elapsedSeconds !== 'number' || !Number.isFinite(o.elapsedSeconds)) return false
  if (!Array.isArray(o.usedIds) || !o.usedIds.every((id) => typeof id === 'string')) return false
  return true
}

export function loadProgress(): SavedMahjong | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isValid(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function saveProgress(p: SavedMahjong): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
  } catch {
    // storage unavailable — play continues without persistence
  }
}
