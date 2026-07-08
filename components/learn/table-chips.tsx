'use client'

// Shared chrome for the 08/ SQL and 09/ Python sandboxes — like
// SectionDivider/LearnCard, this lives outside the self-contained-artifact-
// file convention because it's cross-artifact chrome, not artifact body.
//
// Renders an exercise's `tables` as interactive chips (one <button> per
// table) instead of the old static `tables.join(' · ')` mono label. Hover
// (fine pointers only), click/tap, or keyboard focus+Enter opens a small
// popover with that table's columns and row count, read from the
// generator-emitted TABLE_SCHEMAS (lib/learn/schema.ts). Unknown table names
// (not in TABLE_SCHEMAS) render as the original static text — graceful
// fallback, never a broken chip.

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { TABLE_SCHEMAS, type TableSchema } from '@/lib/learn/schema'

const MONO = 'font-[family-name:var(--font-mono)] text-[12px]'

// Page-wide "only one popover open at a time" — a chip group (one per
// exercise card) claims the active slot when it opens a popover and closes
// whichever group held it before. Module-level because groups are separate
// component instances with no shared parent state.
let activeGroup: { id: string; close: () => void } | null = null
function claimActiveGroup(id: string, close: () => void) {
  if (activeGroup && activeGroup.id !== id) activeGroup.close()
  activeGroup = { id, close }
}
function releaseActiveGroup(id: string) {
  if (activeGroup?.id === id) activeGroup = null
}

interface TableChipsProps {
  tables: string[]
  /** Unique per exercise (e.g. exercise.id) — namespaces popover element ids. */
  idPrefix: string
}

export function TableChips({ tables, idPrefix }: TableChipsProps) {
  // Hover-visibility and click-toggle are tracked separately and OR'd into
  // "is this chip's popover open". A real mouse click is always preceded by
  // a hover, so a naive single toggle-on-click would immediately re-close a
  // popover that hover had just opened. Keeping them separate lets hover
  // "preview" independently of the click/keyboard "pin" state.
  const [hoveredTable, setHoveredTable] = useState<string | null>(null)
  const [clickedTable, setClickedTable] = useState<string | null>(null)
  const groupId = useId()
  const anyOpen = hoveredTable !== null || clickedTable !== null

  useEffect(() => {
    if (anyOpen) {
      claimActiveGroup(groupId, () => {
        setHoveredTable(null)
        setClickedTable(null)
      })
    } else {
      releaseActiveGroup(groupId)
    }
  }, [anyOpen, groupId])

  // Release this group's claim if it unmounts while still open (e.g. the
  // exercise list re-renders mid-interaction).
  useEffect(() => () => releaseActiveGroup(groupId), [groupId])

  return (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
      {tables.map((table, i) => (
        <span key={`${table}-${i}`} className="flex items-center gap-x-1">
          {i > 0 && (
            <span aria-hidden="true" className={`${MONO} text-ink-subtle/60 dark:text-night-muted/60`}>
              ·
            </span>
          )}
          <TableChip
            table={table}
            schema={TABLE_SCHEMAS[table]}
            isOpen={hoveredTable === table || clickedTable === table}
            popoverId={`${idPrefix}-schema-${table}`}
            onHoverOpen={() => setHoveredTable(table)}
            onHoverClose={() => setHoveredTable((v) => (v === table ? null : v))}
            onToggle={() => {
              setClickedTable((v) => (v === table ? null : table))
              // A different chip's lingering hover shouldn't stay open once
              // this one is explicitly toggled — keeps "only one at a time".
              setHoveredTable((v) => (v && v !== table ? null : v))
            }}
            onForceClose={() => {
              setHoveredTable((v) => (v === table ? null : v))
              setClickedTable((v) => (v === table ? null : v))
            }}
          />
        </span>
      ))}
    </div>
  )
}

function pointerIsFine() {
  return typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches
}

function TableChip({
  table,
  schema,
  isOpen,
  popoverId,
  onHoverOpen,
  onHoverClose,
  onToggle,
  onForceClose,
}: {
  table: string
  schema: TableSchema | undefined
  isOpen: boolean
  popoverId: string
  onHoverOpen: () => void
  onHoverClose: () => void
  onToggle: () => void
  onForceClose: () => void
}) {
  const wrapperRef = useRef<HTMLSpanElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [shift, setShift] = useState(0)

  // Clamp the popover's horizontal position so it never overflows the
  // viewport (verified requirement: no horizontal scroll at 320px). Recomputed
  // on open and on resize while open — the popover itself is `position:
  // absolute` relative to this wrapper (so it scrolls naturally with the
  // page); only the extra edge-clamp needs viewport coordinates.
  useLayoutEffect(() => {
    if (!isOpen) return
    const wrapper = wrapperRef.current
    const popover = popoverRef.current
    if (!wrapper || !popover) return

    const recompute = () => {
      const margin = 8
      const wrapperRect = wrapper.getBoundingClientRect()
      const popoverWidth = popover.getBoundingClientRect().width
      let next = 0
      const naturalRight = wrapperRect.left + popoverWidth
      if (naturalRight > window.innerWidth - margin) {
        next = window.innerWidth - margin - naturalRight
      }
      if (wrapperRect.left + next < margin) {
        next = margin - wrapperRect.left
      }
      setShift(next)
    }
    recompute()
    window.addEventListener('resize', recompute)
    return () => window.removeEventListener('resize', recompute)
  }, [isOpen])

  // Outside click and Escape (mirrors the gallery sort-controls dropdown
  // precedent). Escape also returns focus to the chip regardless of what
  // triggered the open (hover, click, or keyboard).
  useEffect(() => {
    if (!isOpen) return
    function handlePointerDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        onForceClose()
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onForceClose()
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', handlePointerDown, { passive: true })
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onForceClose])

  if (!schema) {
    // Graceful fallback for an unrecognized table name — the original
    // static text, unchanged.
    return <span className={`${MONO} text-ink-subtle dark:text-night-muted`}>{table}</span>
  }

  return (
    <span
      ref={wrapperRef}
      className="relative inline-flex"
      onMouseEnter={() => pointerIsFine() && onHoverOpen()}
      onMouseLeave={() => pointerIsFine() && onHoverClose()}
      onBlur={(e) => {
        if (!wrapperRef.current?.contains(e.relatedTarget as Node)) onForceClose()
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls={isOpen ? popoverId : undefined}
        onClick={onToggle}
        className={`${MONO} rounded-md px-2 py-1 underline decoration-dotted decoration-1 underline-offset-2 transition-colors cursor-pointer ${
          isOpen
            ? 'bg-sapphire/10 dark:bg-sapphire-dark/10 text-sapphire dark:text-sapphire-dark decoration-solid'
            : 'text-ink-subtle dark:text-night-muted hover:bg-sapphire/5 dark:hover:bg-sapphire-dark/5 hover:text-sapphire dark:hover:text-sapphire-dark hover:decoration-solid focus-visible:text-sapphire dark:focus-visible:text-sapphire-dark'
        }`}
      >
        {table}
      </button>

      {isOpen && (
        <div
          id={popoverId}
          ref={popoverRef}
          role="group"
          aria-label={`${schema.name} table schema`}
          style={{ width: 'min(17rem, calc(100vw - 2rem))', transform: `translateX(${shift}px)` }}
          className="absolute left-0 top-full z-50 mt-1.5 rounded-lg border border-cream-border dark:border-night-border bg-cream dark:bg-night-card p-3 text-left shadow-card"
        >
          <p className={`${MONO} tracking-[0.15em] uppercase text-peach dark:text-peach-dark`}>{schema.name}</p>
          <p className={`${MONO} mt-0.5 text-ink-subtle dark:text-night-muted`}>
            {schema.rows.toLocaleString()} row{schema.rows === 1 ? '' : 's'}
          </p>
          <ul className="mt-2 space-y-1 border-t border-cream-border dark:border-night-border pt-2">
            {schema.columns.map((c) => (
              <li key={c.name} className="flex items-baseline justify-between gap-3">
                <span className={`${MONO} text-ink dark:text-night-text`}>{c.name}</span>
                <span className={`${MONO} text-ink-subtle dark:text-night-muted`}>{c.type}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </span>
  )
}
