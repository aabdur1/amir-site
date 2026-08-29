"use client"

import React, { useRef, useState } from "react"
import { lineBetween, snapLine, type WordSearchPuzzle } from "@/lib/games/word-search/engine"
import { FOUND_STYLES } from "./found-styles"

export interface GridProps {
  puzzle: WordSearchPuzzle
  cellAccents: ReadonlyMap<number, number>
  disabled: boolean
  onAttempt: (cells: number[] | null) => void
  announce: (msg: string) => void
}

function cellLabel(i: number, size: number, letter: string, isAnchor: boolean): string {
  const base = `Row ${Math.floor(i / size) + 1}, column ${(i % size) + 1}, letter ${letter}`
  return isAnchor ? `${base}, selected` : base
}

export function Grid({ puzzle, cellAccents, disabled, onAttempt, announce }: GridProps) {
  const { size, grid } = puzzle
  const cellRefs = useRef<(HTMLButtonElement | null)[]>([])
  const gridRef = useRef<HTMLDivElement>(null)
  const dragStart = useRef<number | null>(null)
  // Set once a pointer gesture has actually run tapCell/onAttempt in
  // onPointerUp, cleared at the start of the next pointerdown. This is the
  // real cross-engine suppression for the click that a browser dispatches
  // after a pointer sequence — see the onClick comment below.
  const pointerHandled = useRef(false)
  const [anchor, setAnchor] = useState<number | null>(null)
  const [focusIndex, setFocusIndex] = useState(0)
  const [preview, setPreview] = useState<number[] | null>(null)

  // Tap-ends / keyboard-Enter share one path: first activation anchors,
  // second attempts the EXACT line between them (lineBetween — snapping two
  // taps would select a line the player never touched).
  const tapCell = (i: number) => {
    if (disabled) return
    if (anchor === null) {
      setAnchor(i)
      announce(`Anchor set at row ${Math.floor(i / size) + 1}, column ${(i % size) + 1}`)
    } else if (anchor === i) {
      setAnchor(null)
      announce("Anchor cleared")
    } else {
      onAttempt(lineBetween(size, anchor, i))
      setAnchor(null)
    }
  }

  // Drag geometry: coordinate math off the grid's bounding rect, NOT
  // elementFromPoint — elementFromPoint breaks once the pointer is captured
  // (captured pointers keep delivering events to the capturing element, but
  // elementFromPoint still reports whatever's under the cursor visually,
  // which can desync from the cell the drag logically belongs to).
  const cellFromPoint = (clientX: number, clientY: number): number | null => {
    const rect = gridRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return null
    const x = clientX - rect.left
    const y = clientY - rect.top
    if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) return null
    return Math.floor((y / rect.height) * size) * size + Math.floor((x / rect.width) * size)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    pointerHandled.current = false
    if (disabled) return
    const cell = cellFromPoint(e.clientX, e.clientY)
    if (cell === null) return
    gridRef.current?.setPointerCapture(e.pointerId)
    dragStart.current = cell
    setPreview([cell])
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (dragStart.current === null) return
    const cell = cellFromPoint(e.clientX, e.clientY)
    if (cell === null) return
    setPreview(cell === dragStart.current ? [dragStart.current] : snapLine(size, dragStart.current, cell))
  }

  const onPointerUp = () => {
    const start = dragStart.current
    const cells = preview
    dragStart.current = null
    setPreview(null)
    if (start === null) return
    setFocusIndex(start)
    if (cells && cells.length > 1) {
      // Mirrors tapCell's own attempt branch: a completed drag attempt must
      // clear any anchor left over from an earlier tap, or the next ordinary
      // tap gets misread as completing a line from that stale anchor.
      onAttempt(cells)
      setAnchor(null)
    } else tapCell(start) // press-release on one cell IS the tap path
    // Gesture handled — a click that follows this pointerup must not
    // re-run tapCell. Only reached when start !== null: if this pointerup
    // never resolved to a cell (early return above), no activation ran here
    // and the click's own guard below is what fires it.
    pointerHandled.current = true
  }

  const onPointerCancel = () => {
    dragStart.current = null
    setPreview(null)
  }

  const move = (to: number) => {
    setFocusIndex(to)
    cellRefs.current[to]?.focus()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    const f = focusIndex
    let handled = true
    if (e.key === "ArrowLeft") move(f % size === 0 ? f : f - 1)
    else if (e.key === "ArrowRight") move(f % size === size - 1 ? f : f + 1)
    else if (e.key === "ArrowUp") move(f < size ? f : f - size)
    else if (e.key === "ArrowDown") move(f >= size * (size - 1) ? f : f + size)
    else if (e.key === "Enter" || e.key === " ") tapCell(f)
    else if (e.key === "Escape") {
      setAnchor(null)
      announce("Anchor cleared")
    } else handled = false
    if (handled) e.preventDefault()
  }

  const previewSet = preview ? new Set(preview) : null

  return (
    <div
      ref={gridRef}
      role="grid"
      aria-label={`Word search grid, ${size} by ${size}`}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      className="grid w-full aspect-square select-none touch-none rounded-sm overflow-hidden
        border-2 border-ink/50 dark:border-night-text/40 bg-white dark:bg-night-card"
      style={{ gridTemplateRows: `repeat(${size}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: size }, (_, r) => (
        <div key={r} role="row" className="grid" style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}>
          {Array.from({ length: size }, (_, c) => {
            const i = r * size + c
            const accent = cellAccents.get(i)
            const isAnchor = anchor === i
            return (
              <button
                key={i}
                ref={(el) => { cellRefs.current[i] = el }}
                type="button"
                role="gridcell"
                data-cell={i}
                aria-label={cellLabel(i, size, grid[i], isAnchor)}
                aria-selected={isAnchor || undefined}
                tabIndex={i === focusIndex ? 0 : -1}
                // Pointer-up owns activation for a real drag/tap; this onClick
                // is the fallback for a click with no prior pointer sequence
                // (jsdom's fireEvent.click, which never dispatches
                // pointerdown/up — that's Task 5/6's whole test suite). In a
                // real browser it should also be moot: verified in Chromium
                // (repro outside this repo, since jsdom can't exercise this)
                // that once onPointerDown calls gridRef.setPointerCapture, the
                // browser redirects the matching mouseup AND the click that
                // follows it to the CAPTURING element (the grid div) instead
                // of the cell button under the cursor, so click never reaches
                // a button's onClick for a real tap or drag there. But that
                // was only checked on one engine — public interop history
                // shows browsers have disagreed on the post-capture click
                // target (Safari's behavior here is unconfirmed), and this
                // site targets Safari/mobile.
                //
                // The state guard below (dragStart.current === null &&
                // preview === null) does NOT provide that safety net: React
                // flushes discrete-event state updates before the next
                // event dispatches, so by the time a post-gesture click
                // reaches here, onPointerUp has already nulled both — the
                // guard reads as "clear" even when it was this exact click's
                // own gesture that just ran tapCell/onAttempt. On an engine
                // that doesn't retarget the click away from the cell, this
                // guard alone would let every tap double-fire (anchor set by
                // pointerup, then immediately cleared by click).
                // pointerHandled is the ref that actually suppresses that:
                // it's true only when this cell's own pointerup already
                // handled the gesture, and false again once a fresh
                // pointerdown starts (or when no pointer sequence preceded
                // the click at all — jsdom's fireEvent.click, and the
                // Chromium-verified real-tap case above). Check it first,
                // then keep the state guard as a second line of defense.
                onClick={() => {
                  if (pointerHandled.current) return
                  if (dragStart.current === null && preview === null) {
                    setFocusIndex(i)
                    tapCell(i)
                  }
                }}
                className={`relative flex items-center justify-center transition-colors
                  font-[family-name:var(--font-mono)] text-[15px] sm:text-lg leading-none
                  text-ink dark:text-night-text
                  ${accent !== undefined ? FOUND_STYLES[accent].bg : previewSet?.has(i) ? "bg-mauve/15 dark:bg-mauve-dark/20" : ""}
                  ${isAnchor ? "ring-2 ring-inset ring-mauve dark:ring-mauve-dark" : ""}`}
              >
                {grid[i]}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
