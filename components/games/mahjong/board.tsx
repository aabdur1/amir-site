"use client"

// Presentational board: absolutely-positioned tile buttons over a scaled
// aspect-ratio box (percent geometry off the layout's half-unit grid), with
// a depth offset per layer and the roving-focus keyboard protocol. All game
// state (selection, matching, win/lose) lives in the container — this
// component only maps state to buttons and reports one onTileTap index.

import React, { useEffect, useRef, useState } from "react"
import { freeSet, KINDS, removedSet, type MahjongLayout, type MahjongState } from "@/lib/games/mahjong/engine"
import { FACE_NAMES, TileFace } from "./tile-faces"

export interface MahjongBoardProps {
  layout: MahjongLayout
  state: MahjongState
  selected: number | null
  hintPair: [number, number] | null
  onTileTap: (index: number) => void // container decides select/match/blocked
}

// --- geometry helpers ---------------------------------------------------

// Board size in half-units. The +1 headroom leaves room for the depth
// translate (up to 8 layers × 12% of a tile) to never clip outside the box.
function boardDims(layout: MahjongLayout): { w: number; h: number } {
  let maxX = 0
  let maxY = 0
  for (const p of layout.positions) {
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  return { w: maxX + 2 + 1, h: maxY + 2 + 1 }
}

// DOM paint order = visual stacking order: lower layers first, then reading
// order, so a higher tile's DOM node comes after (and so paints over) what
// it sits on — no per-tile zIndex needed.
function paintOrder(layout: MahjongLayout, removed: ReadonlySet<number>): number[] {
  return layout.positions
    .map((_, i) => i)
    .filter((i) => !removed.has(i))
    .sort((a, b) => {
      const pa = layout.positions[a]
      const pb = layout.positions[b]
      return pa.z - pb.z || pa.y - pb.y || pa.x - pb.x
    })
}

// Roving-focus order: top layer first (the tiles a player can actually see
// and reach), then reading order within a layer.
function rovingOrder(layout: MahjongLayout, free: ReadonlySet<number>): number[] {
  return [...free].sort((a, b) => {
    const pa = layout.positions[a]
    const pb = layout.positions[b]
    return pb.z - pa.z || pa.y - pb.y || pa.x - pb.x
  })
}

function tileLabel(kindIndex: number, x: number, y: number, z: number, blocked: boolean, isSelected: boolean): string {
  let label = `${FACE_NAMES[KINDS[kindIndex]]}, row ${y / 2 + 1}, column ${x / 2 + 1}, layer ${z + 1}`
  if (blocked) label += ", blocked"
  if (isSelected) label += ", selected"
  return label
}

export function MahjongBoard({ layout, state, selected, hintPair, onTileTap }: MahjongBoardProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([])
  // The tile index that most recently received real DOM focus (via Tab,
  // click, or our own moveFocus) — kept via each tile's onFocus below, used
  // only to detect "the button that had focus just unmounted" (see effect).
  const lastFocusedIndexRef = useRef<number | null>(null)
  const [focusIndex, setFocusIndex] = useState<number | null>(null)

  const removed = removedSet(state)
  const free = freeSet(layout, state)
  const { w, h } = boardDims(layout)
  const order = rovingOrder(layout, free)
  // Roving focus resets to the first free tile once the one it pointed at
  // is gone (removed, or never free to begin with).
  const effectiveFocus = focusIndex !== null && free.has(focusIndex) ? focusIndex : (order[0] ?? null)

  const moveFocus = (next: number) => {
    setFocusIndex(next)
    buttonRefs.current[next]?.focus()
  }

  // A keyboard match (Enter on the focused tile) removes that tile, and the
  // browser drops DOM focus out of the board entirely (falls back to
  // <body>) — the wrapper's onKeyDown then stops receiving Arrow/Enter/
  // Escape until the player re-clicks or Tabs back in. Restore focus to the
  // new roving-focus target, but ONLY when it really fell out of the board:
  // if the previously-focused button is still mounted, or focus already
  // sits on some other element (a mouse/touch user, or a panel the
  // container itself legitimately focused), leave it alone.
  useEffect(() => {
    const lastIndex = lastFocusedIndexRef.current
    if (lastIndex === null) return // the board has never actually held focus
    if (buttonRefs.current[lastIndex] !== null) return // still mounted — not our concern
    const active = document.activeElement
    if (active && wrapperRef.current?.contains(active)) return // focus is already inside the board
    if (effectiveFocus === null) return // nothing left to focus
    buttonRefs.current[effectiveFocus]?.focus()
  }, [effectiveFocus])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      if (order.length === 0) return
      const idx = effectiveFocus !== null ? order.indexOf(effectiveFocus) : -1
      const step = e.key === "ArrowRight" ? 1 : -1
      const nextIdx = idx === -1 ? 0 : (idx + step + order.length) % order.length
      moveFocus(order[nextIdx])
      e.preventDefault()
    } else if (e.key === "Enter") {
      if (effectiveFocus !== null) onTileTap(effectiveFocus)
      e.preventDefault()
    } else if (e.key === "Escape") {
      onTileTap(-1)
      e.preventDefault()
    }
  }

  return (
    <div
      ref={wrapperRef}
      role="group"
      aria-label="Mahjong board"
      onKeyDown={onKeyDown}
      className="relative w-full select-none"
      style={{ aspectRatio: `${w} / ${h}` }}
    >
      {paintOrder(layout, removed).map((i) => {
        const { x, y, z } = layout.positions[i]
        const blocked = !free.has(i)
        const isSelected = selected === i
        const isHint = hintPair !== null && (hintPair[0] === i || hintPair[1] === i)
        return (
          <button
            key={i}
            ref={(el) => {
              buttonRefs.current[i] = el
            }}
            type="button"
            aria-label={tileLabel(state.kinds[i], x, y, z, blocked, isSelected)}
            aria-disabled={blocked ? true : undefined}
            tabIndex={i === effectiveFocus ? 0 : -1}
            onClick={() => onTileTap(i)}
            onFocus={() => {
              lastFocusedIndexRef.current = i
            }}
            style={{
              left: `${(x / w) * 100}%`,
              top: `${(y / h) * 100}%`,
              width: `${(2 / w) * 100}%`,
              height: `${(2 / h) * 100}%`,
              transform: `translate(${-z * 12}%, ${-z * 12}%)`,
            }}
            className={`absolute rounded-md border bg-white dark:bg-cream/95 border-cream-border
              shadow-[1px_2px_0_rgba(76,79,105,0.28)]
              ${blocked ? "opacity-55" : "hover:border-mauve/50"}
              ${isSelected ? "ring-2 ring-mauve dark:ring-mauve-dark" : ""}
              ${isHint ? "animate-pulse" : ""}`}
          >
            <span className="block w-full h-full p-[8%] [&>svg]:w-full [&>svg]:h-full">
              <TileFace kind={KINDS[state.kinds[i]]} />
            </span>
          </button>
        )
      })}
    </div>
  )
}
