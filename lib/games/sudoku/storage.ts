// localStorage persistence for /games/sudoku. Every access is wrapped in
// try/catch — private mode, quota, and corrupt payloads all degrade to
// "no save", never to a crash. Only called from the ssr:false component.

export const STORAGE_KEY = 'sudoku-progress-v1'

export interface SudokuSettings {
  showMistakes: boolean
}

export interface SavedProgress {
  puzzleId: string | null
  values: string
  notes: number[]
  elapsedSeconds: number
  usedIds: string[]
  settings: SudokuSettings
}

export function defaultProgress(): SavedProgress {
  return {
    puzzleId: null,
    values: '',
    notes: [],
    elapsedSeconds: 0,
    usedIds: [],
    settings: { showMistakes: true },
  }
}

function isValid(p: unknown): p is SavedProgress {
  if (typeof p !== 'object' || p === null) return false
  const o = p as Record<string, unknown>
  if (o.puzzleId !== null && typeof o.puzzleId !== 'string') return false
  if (typeof o.values !== 'string') return false
  if (!Array.isArray(o.notes) || !o.notes.every((n) => typeof n === 'number')) return false
  if (typeof o.elapsedSeconds !== 'number' || !Number.isFinite(o.elapsedSeconds)) return false
  if (!Array.isArray(o.usedIds) || !o.usedIds.every((id) => typeof id === 'string')) return false
  const settings = o.settings as Record<string, unknown> | null
  if (typeof settings !== 'object' || settings === null) return false
  if (typeof settings.showMistakes !== 'boolean') return false
  if (o.puzzleId !== null) {
    if (o.values.length !== 81) return false
    if (o.notes.length !== 81) return false
  }
  return true
}

export function loadProgress(): SavedProgress | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isValid(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function saveProgress(p: SavedProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
  } catch {
    // storage unavailable — play continues without persistence
  }
}
