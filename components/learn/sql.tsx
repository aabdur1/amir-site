'use client'

import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import initSqlJs from 'sql.js'
import type { Database, SqlJsStatic } from 'sql.js'
import { useScrollReveal } from '@/lib/hooks'
import { SectionDivider } from '@/components/section-divider'
import { SQL_SEED, SQL_SEED_COUNTS } from '@/lib/learn/sql-seed'
import { SQL_EXERCISES, type SqlExercise, type SqlSectionId } from '@/lib/learn/sql-exercises'
import { compareResults, type CheckResult, type QueryResult, type SqlValue } from '@/lib/learn/sql-check'

// === Engine — module-level singleton ===
// sql.js is imported only in this file, and this component loads with
// ssr: false via dynamic-artifacts.tsx, so the engine chunk and
// /sql-wasm.wasm are fetched on /learn/sql only.
let engine: SqlJsStatic | null = null
let seedBuffer: Uint8Array | null = null
let enginePromise: Promise<void> | null = null

function loadEngine(): Promise<void> {
  if (!enginePromise) {
    enginePromise = initSqlJs({ locateFile: () => '/sql-wasm.wasm' })
      .then((mod) => {
        const db = new mod.Database()
        db.run(SQL_SEED)
        seedBuffer = db.export()
        db.close()
        engine = mod
      })
      .catch((err) => {
        // Documents intent only: sql.js's initSqlJs() caches its own
        // module-level promise and never clears it on rejection, so this
        // reset can't actually trigger a re-fetch within the same page
        // load. "Try again" reloads the page instead — see EngineFallback.
        enginePromise = null
        throw err
      })
  }
  return enginePromise
}

// Every run gets a fresh copy of the seed database, so destructive
// statements can't leak between runs or exercises. Returns the LAST result
// set, or null when nothing returned rows (e.g. UPDATE).
function runQuery(sql: string): QueryResult | null {
  if (!engine || !seedBuffer) throw new Error('SQL engine not ready')
  const db: Database = new engine.Database(seedBuffer)
  try {
    const results = db.exec(sql)
    return results.length ? results[results.length - 1] : null
  } finally {
    db.close()
  }
}

type EngineStatus = 'loading' | 'ready' | 'error'

function useSqlEngine(): { status: EngineStatus } {
  const [status, setStatus] = useState<EngineStatus>(() => (engine ? 'ready' : 'loading'))
  useEffect(() => {
    if (status !== 'loading') return
    let cancelled = false
    loadEngine().then(
      () => {
        if (!cancelled) setStatus('ready')
      },
      () => {
        if (!cancelled) setStatus('error')
      }
    )
    return () => {
      cancelled = true
    }
  }, [status])
  return { status }
}

// === Shared UI helpers (self-contained, like every other artifact file) ===
const PILL_PRIMARY =
  'btn-lift inline-flex items-center px-5 py-2.5 rounded-full text-[13px] font-[family-name:var(--font-mono)] tracking-wide border border-mauve/40 dark:border-mauve-dark/40 bg-mauve/10 dark:bg-mauve-dark/10 text-mauve dark:text-mauve-dark hover:border-mauve dark:hover:border-mauve-dark transition-colors disabled:opacity-50 disabled:pointer-events-none'
const PILL_SUBTLE =
  'px-4 py-2.5 rounded-full text-[13px] font-[family-name:var(--font-mono)] tracking-wide border border-cream-border dark:border-night-border text-ink-subtle dark:text-night-muted hover:border-sapphire/60 dark:hover:border-sapphire-dark/60 hover:text-ink dark:hover:text-night-text transition-colors'

function InsightBox({ children }: { children: ReactNode }) {
  return (
    <div className="mt-8 rounded-lg bg-sapphire/10 dark:bg-sapphire-dark/10 px-4 py-3 text-sm leading-relaxed text-sapphire dark:text-sapphire-dark">
      {children}
    </div>
  )
}

const ROW_CAP = 50

function formatCell(v: SqlValue): string {
  if (v === null) return 'NULL'
  if (typeof v === 'number' && !Number.isInteger(v)) return String(Math.round(v * 10000) / 10000)
  return String(v)
}

function ResultTable({ result, caption }: { result: QueryResult; caption: string }) {
  const total = result.values.length
  const rows = result.values.slice(0, ROW_CAP)
  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-cream-border dark:border-night-border">
        <table className="w-full text-[12px] font-[family-name:var(--font-mono)]">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="bg-cream-dark/60 dark:bg-night-card/60">
              {result.columns.map((c, i) => (
                <th
                  key={i}
                  scope="col"
                  className="px-3 py-2 text-left font-medium whitespace-nowrap text-ink dark:text-night-text border-b border-cream-border dark:border-night-border"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-cream-border/60 dark:border-night-border/60 last:border-b-0">
                {row.map((v, j) => (
                  <td
                    key={j}
                    className={`px-3 py-1.5 whitespace-nowrap text-ink-subtle dark:text-night-muted ${v === null ? 'italic' : ''}`}
                  >
                    {formatCell(v)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 font-[family-name:var(--font-mono)] text-[12px] text-ink-subtle dark:text-night-muted">
        {total > ROW_CAP ? `showing ${ROW_CAP} of ${total} rows` : `${total} row${total === 1 ? '' : 's'}`}
      </p>
    </div>
  )
}

// === Checked exercise ===
function Exercise({
  exercise,
  number,
  engineReady,
}: {
  exercise: SqlExercise
  number: number
  engineReady: boolean
}) {
  const [text, setText] = useState('')
  const [hasRun, setHasRun] = useState(false)
  const [userResult, setUserResult] = useState<QueryResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<CheckResult | null>(null)
  const [expected, setExpected] = useState<QueryResult | null>(null)
  const [showExpected, setShowExpected] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [showSolution, setShowSolution] = useState(false)

  const run = useCallback(() => {
    if (!engineReady || !text.trim()) return
    setHasRun(true)
    setShowExpected(false)
    try {
      const user = runQuery(text)
      const exp = runQuery(exercise.solution) as QueryResult // canonical solutions always return rows
      setUserResult(user)
      setExpected(exp)
      setOutcome(compareResults(user, exp, exercise.ordered))
      setError(null)
    } catch (e) {
      setUserResult(null)
      setExpected(null)
      setOutcome(null)
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [engineReady, text, exercise])

  return (
    <div className="rounded-lg border border-cream-border dark:border-night-border bg-cream-dark/30 dark:bg-night-card/40 p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-3">
        <p className="font-[family-name:var(--font-mono)] text-[12px] tracking-[0.2em] uppercase text-peach dark:text-peach-dark">
          ex. {String(number).padStart(2, '0')}
        </p>
        <p className="font-[family-name:var(--font-mono)] text-[12px] text-ink-subtle dark:text-night-muted">
          {exercise.tables.join(' · ')}
        </p>
      </div>
      <p className="text-sm text-ink-subtle dark:text-night-muted leading-relaxed mb-4">{exercise.prompt}</p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          // Ctrl/Cmd+Enter runs. Tab is deliberately NOT intercepted — it
          // must keep moving focus (no keyboard trap).
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault()
            run()
          }
        }}
        rows={4}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        placeholder="SELECT …"
        aria-label={`SQL editor for exercise ${number} (${exercise.tables.join(', ')})`}
        className="w-full resize-y rounded-lg border border-cream-border dark:border-night-border bg-cream-dark/60 dark:bg-night-card/60 px-3.5 py-3 font-[family-name:var(--font-mono)] text-[13px] leading-relaxed text-ink dark:text-night-text placeholder:text-ink-subtle/70 dark:placeholder:text-night-muted/70"
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" onClick={run} disabled={!engineReady} className={PILL_PRIMARY}>
          Run
        </button>
        <span className="font-[family-name:var(--font-mono)] text-[12px] text-ink-subtle dark:text-night-muted">
          {'⌘↩'} to run
        </span>
        <button type="button" onClick={() => setShowHint((v) => !v)} className={PILL_SUBTLE}>
          {showHint ? 'Hide hint' : 'Hint'}
        </button>
        <button type="button" onClick={() => setShowSolution((v) => !v)} className={PILL_SUBTLE}>
          {showSolution ? 'Hide solution' : 'Reveal solution'}
        </button>
      </div>

      {showHint && (
        <p className="mt-3 rounded-lg bg-sapphire/10 dark:bg-sapphire-dark/10 px-4 py-3 text-sm leading-relaxed text-sapphire dark:text-sapphire-dark">
          {exercise.hint}
        </p>
      )}
      {showSolution && (
        <pre className="mt-3 overflow-x-auto rounded-lg bg-cream-dark/60 dark:bg-night-card/60 px-4 py-3 font-[family-name:var(--font-mono)] text-[13px] leading-relaxed text-ink dark:text-night-text">
          {exercise.solution}
        </pre>
      )}

      {userResult && !error && (
        <div className="mt-4">
          <ResultTable result={userResult} caption={`Your result for exercise ${number}`} />
        </div>
      )}

      {/* Live region — announces run/check outcomes and errors */}
      <div aria-live="polite">
        {error && (
          <p className="mt-4 rounded-lg bg-red-600/10 px-4 py-3 font-[family-name:var(--font-mono)] text-[13px] leading-relaxed text-red-600 dark:text-red-400">
            SQL error: {error}
          </p>
        )}
        {hasRun && !error && !userResult && (
          <p className="mt-4 font-[family-name:var(--font-mono)] text-[13px] text-ink-subtle dark:text-night-muted">
            query returned no result set &mdash; try a SELECT
          </p>
        )}
        {outcome && outcome.pass && (
          <p className="mt-4 font-[family-name:var(--font-mono)] text-[13px] text-ink dark:text-night-text">
            <span aria-hidden="true" className="text-peach dark:text-peach-dark">
              {'✓'}{' '}
            </span>
            Correct &mdash; result matches expected
          </p>
        )}
        {outcome && !outcome.pass && userResult && (
          <p className="mt-4 font-[family-name:var(--font-mono)] text-[13px] text-ink-subtle dark:text-night-muted">
            Doesn&apos;t match &mdash; {outcome.reason}
          </p>
        )}
      </div>

      {outcome && !outcome.pass && expected && (
        <div className="mt-3">
          <button type="button" onClick={() => setShowExpected((v) => !v)} className={PILL_SUBTLE}>
            {showExpected ? 'Hide expected' : 'Show expected'}
          </button>
          {showExpected && (
            <div className="mt-3">
              <ResultTable result={expected} caption={`Expected result for exercise ${number}`} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// === Sections ===
interface SectionDef {
  id: SqlSectionId
  number: string
  title: string
  intro: string
  insight: string
}

// The sections; exercises attach by their `section` id, numbered
// continuously across sections.
const SECTIONS: SectionDef[] = [
  {
    id: 'sql-select',
    number: '01',
    title: 'SELECT, WHERE, ORDER BY',
    intro:
      'Every query starts as a question. SELECT picks the columns, WHERE filters the rows, ORDER BY sorts what survives, and DISTINCT collapses duplicates.',
    insight:
      'WHERE runs before SELECT ever labels a column, so filter on real column values, not output aliases. And ISO dates like 1980-01-01 sort correctly as plain strings — which is exactly why analysts store dates that way.',
  },
  {
    id: 'sql-aggregate',
    number: '02',
    title: 'GROUP BY & HAVING',
    intro:
      'GROUP BY collapses rows into groups and aggregates summarize each one. WHERE filters rows before grouping; HAVING filters the groups after.',
    insight:
      'If a filter mentions an aggregate (AVG, COUNT), it belongs in HAVING. If it mentions raw column values, put it in WHERE — rows drop before grouping, which is also cheaper.',
  },
  {
    id: 'sql-joins',
    number: '03',
    title: 'Joins & the fan-out trap',
    intro:
      'Joins line tables up row by row. INNER keeps only matches; LEFT keeps every left-side row, with NULLs where the right side is missing. One-to-many joins multiply rows — the fan-out that quietly corrupts counts.',
    insight:
      'COUNT(*) counts rows; COUNT(e.encounter_id) skips the NULLs a LEFT JOIN produces — that is how zero-encounter patients show 0 instead of 1. And after a double one-to-many join, aggregate per level (COUNT(DISTINCT …) or a pre-aggregated CTE) before trusting any number.',
  },
  {
    id: 'sql-windows',
    number: '04',
    title: 'Window functions',
    intro:
      'Window functions compute a value per row over a partition — GROUP BY without collapsing the rows. ROW_NUMBER() OVER (PARTITION BY … ORDER BY …) is the workhorse.',
    insight:
      'The latest-row-per-group pattern — rank with ROW_NUMBER() OVER (PARTITION BY patient ORDER BY taken_at DESC) in a CTE, keep rn = 1 — shows up in nearly every analyst interview, because transactional data is always many rows per entity.',
  },
  {
    id: 'sql-challenge',
    number: '05',
    title: 'Challenges',
    intro:
      'Nothing new here — each of these combines two or three of the sections above in one query, the way real analyst tickets do. Expect a CTE, a join, and an aggregate working together.',
    insight:
      'Hard queries are written inside-out: build the innermost piece first, run it, look at the rows, then wrap the next layer around it. A CTE is just a saved intermediate step — SQL for assigning to a variable.',
  },
]

function ArtifactSection({
  section,
  exercises,
  startNumber,
  engineReady,
}: {
  section: SectionDef
  exercises: SqlExercise[]
  startNumber: number
  engineReady: boolean
}) {
  const [sectionRef, visible] = useScrollReveal()
  return (
    <section
      ref={sectionRef as React.RefObject<HTMLElement>}
      aria-labelledby={section.id}
      className={`py-8 transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <div className="text-center mb-8">
        <p className="font-[family-name:var(--font-mono)] text-[12px] tracking-[0.3em] uppercase text-peach dark:text-peach-dark">
          {section.number}/
        </p>
        <h2 id={section.id} className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl text-ink dark:text-night-text mt-2">
          {section.title}
        </h2>
        <p className="text-sm text-ink-subtle dark:text-night-muted mt-3 max-w-2xl mx-auto leading-relaxed">{section.intro}</p>
      </div>
      <div className="space-y-6">
        {exercises.map((ex, i) => (
          <Exercise key={ex.id} exercise={ex} number={startNumber + i} engineReady={engineReady} />
        ))}
      </div>
      <InsightBox>{section.insight}</InsightBox>
    </section>
  )
}

// Engine-load failure stays inside the artifact (never thrown to the
// ArtifactErrorBoundary). sql.js caches its own init promise module-wide and
// never resets it on rejection, so a soft retry can never re-fetch — the
// only real retry is a fresh page load.
function EngineFallback() {
  return (
    <div className="text-center py-20">
      <p className="font-[family-name:var(--font-mono)] text-[13px] tracking-[0.3em] uppercase mb-4 text-peach dark:text-peach-dark">
        Engine error
      </p>
      <h2 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl text-ink dark:text-night-text mb-4">
        The SQL engine didn&apos;t load
      </h2>
      <p className="text-[15px] text-ink-subtle dark:text-night-muted mb-8">
        The WebAssembly build of SQLite failed to download or initialize.
      </p>
      <button type="button" onClick={() => window.location.reload()} className={PILL_PRIMARY}>
        Try again
      </button>
    </div>
  )
}

export function SQL() {
  const { status } = useSqlEngine()
  const engineReady = status === 'ready'

  // Exercise numbering is continuous across sections
  const startNumbers: number[] = []
  let acc = 1
  for (const sec of SECTIONS) {
    startNumbers.push(acc)
    acc += SQL_EXERCISES.filter((e) => e.section === sec.id).length
  }

  return (
    <div className="mx-auto max-w-5xl px-6 sm:px-10 lg:px-12">
      {/* Title */}
      <div className="text-center mb-12">
        <p className="font-[family-name:var(--font-mono)] text-[13px] tracking-[0.3em] uppercase mb-4 text-peach dark:text-peach-dark">
          08/
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl text-ink dark:text-night-text mb-4">
          SQL / Querying Data
        </h1>
        <p className="text-[15px] text-ink-subtle dark:text-night-muted">
          {SECTIONS.length} sections {'·'} {SQL_EXERCISES.length} checked exercises {'·'} SQLite running in your browser via WebAssembly
        </p>
        <div className="mt-4 h-px w-16 mx-auto bg-mauve dark:bg-mauve-dark" />
        <p role="status" className="mt-6 font-[family-name:var(--font-mono)] text-[12px] text-ink-subtle dark:text-night-muted">
          {status === 'loading' && 'loading engine — ~0.7 MB of WebAssembly'}
          {status === 'ready' && 'engine ready — every run starts from a fresh copy of the dataset'}
          {status === 'error' && 'engine failed to load'}
        </p>
      </div>

      {status === 'error' ? (
        <EngineFallback />
      ) : (
        <>
          {/* Dataset legend — plain-text schema reference (a diagram is out of scope) */}
          <div className="mb-4 rounded-lg border border-cream-border dark:border-night-border bg-cream-dark/30 dark:bg-night-card/40 p-5 overflow-x-auto">
            <p className="font-[family-name:var(--font-mono)] text-[12px] tracking-[0.2em] uppercase text-mauve dark:text-mauve-dark mb-3">
              the dataset {'·'} synthetic {'·'} obviously fake
            </p>
            <ul className="space-y-1.5 font-[family-name:var(--font-mono)] text-[12px] sm:text-[13px] text-ink-subtle dark:text-night-muted">
              <li className="whitespace-nowrap">
                <span className="text-ink dark:text-night-text">patients</span> (patient_id, name, sex, birth_date, city) &mdash; {SQL_SEED_COUNTS.patients} rows
              </li>
              <li className="whitespace-nowrap">
                <span className="text-ink dark:text-night-text">encounters</span> (encounter_id, patient_id, dept, admit_date, discharge_date) &mdash; {SQL_SEED_COUNTS.encounters} rows
              </li>
              <li className="whitespace-nowrap">
                <span className="text-ink dark:text-night-text">labs</span> (lab_id, encounter_id, test_name, value, unit, taken_at) &mdash; {SQL_SEED_COUNTS.labs} rows
              </li>
              <li className="whitespace-nowrap">
                <span className="text-ink dark:text-night-text">medications</span> (med_id, patient_id, drug_name, start_date, end_date) &mdash; {SQL_SEED_COUNTS.medications} rows
              </li>
            </ul>
          </div>

          {SECTIONS.map((sec, i) => (
            <div key={sec.id}>
              {i > 0 && (
                <div className="py-12 [&>div]:mb-0">
                  <SectionDivider absolute={false} />
                </div>
              )}
              <ArtifactSection
                section={sec}
                exercises={SQL_EXERCISES.filter((e) => e.section === sec.id)}
                startNumber={startNumbers[i]}
                engineReady={engineReady}
              />
            </div>
          ))}
        </>
      )}
    </div>
  )
}
