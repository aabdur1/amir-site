import type { CaseStudyTable as CaseStudyTableData, CaseStudyTableCell } from '@/lib/work/case-studies'

// A small results table for a case study. A cell can carry a secondary value
// shown beside the main one in muted brackets — the capstone uses it to keep
// validation figures beside the held-out test figures, never in place of them.
// Wide tables scroll inside their own focusable region, so the page itself
// never scrolls horizontally at 320px. The region must stay `relative`: the
// sr-only spans are position:absolute, and without a positioned scroll box
// they anchor to the article instead and widen the page (measured 491px at
// a 320px viewport before the fix).

function Cell({ cell }: { cell: string | CaseStudyTableCell }) {
  if (typeof cell === 'string') return <>{cell}</>
  return (
    <>
      <span className="text-ink dark:text-night-text">{cell.main}</span>
      {cell.aside && (
        <>
          {' '}
          <span aria-hidden="true" className="text-[12px] text-ink-subtle dark:text-night-muted">
            [{cell.aside}]
          </span>
          <span className="sr-only">
            ({cell.asideLabel ?? 'also'} {cell.aside})
          </span>
        </>
      )}
    </>
  )
}

// One table per study (a section flag, at most one — see case-studies.test.ts),
// so a fixed id is unique on the page.
const CAPTION_ID = 'case-study-table-caption'

export function CaseStudyTable({ table }: { table: CaseStudyTableData }) {
  // The caption sits outside the scroll box as a figcaption: a <caption> is as
  // wide as the table, so at 320px it scrolled sideways with it and got cut off.
  return (
    <figure className="mx-auto max-w-3xl">
      <div
        role="region"
        aria-label="Results table (scrolls horizontally on narrow screens)"
        tabIndex={0}
        className="relative overflow-x-auto rounded-lg border border-cream-border dark:border-night-border bg-cream-dark/30 dark:bg-night-card/40"
      >
        <table
          aria-describedby={CAPTION_ID}
          className="w-full min-w-[30rem] border-collapse font-[family-name:var(--font-mono)] text-[13px] tabular-nums"
        >
          <thead>
            <tr className="border-b border-cream-border dark:border-night-border">
              {table.columns.map((col, i) => (
                <th
                  key={i}
                  scope="col"
                  className={`px-3 py-2.5 text-[12px] font-normal uppercase tracking-[0.1em] text-ink-subtle dark:text-night-muted ${i === 0 ? 'text-left' : 'text-center'}`}
                >
                  {col.srLabel ? (
                    <>
                      <span aria-hidden="true">{col.label}</span>
                      <span className="sr-only">{col.srLabel}</span>
                    </>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, r) => (
              <tr key={r} className="border-b border-cream-border/60 dark:border-night-border/60 last:border-b-0">
                {row.map((cell, i) =>
                  i === 0 ? (
                    <th key={i} scope="row" className="px-3 py-2.5 text-left font-normal text-ink dark:text-night-text">
                      <Cell cell={cell} />
                    </th>
                  ) : (
                    <td key={i} className="px-3 py-2.5 text-center text-ink-subtle dark:text-night-muted whitespace-nowrap">
                      <Cell cell={cell} />
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption
        id={CAPTION_ID}
        className="mt-3 px-2 text-center font-[family-name:var(--font-mono)] text-[12px] leading-relaxed text-ink-subtle dark:text-night-muted"
      >
        {table.caption}
      </figcaption>
    </figure>
  )
}
