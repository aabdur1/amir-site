'use client'

import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { WebR, ChannelType } from 'webr'
import { useScrollReveal } from '@/lib/hooks'
import { SectionDivider } from '@/components/section-divider'
import { PY_CSV, PY_COUNTS } from '@/lib/learn/python-data'
import { R_SETUP_CODE } from '@/lib/learn/r-harness'
import { R_EXERCISES, type RExercise, type RSectionId } from '@/lib/learn/r-exercises'

// === Engine — module-level singleton ===
// webR is fully self-hosted: the runtime under public/webr/0.6.0/ and the
// dplyr/jsonlite binaries under public/webr/repo/ are populated at build time
// by scripts/fetch-webr.mjs — the browser never talks to a third-party origin,
// and nothing under /webr/ downloads until the user clicks the load button.
// PostMessage channel: the site has no COOP/COEP (CloudFront/Credly images),
// which costs only interruption of running code — parity with 08/ and 09/,
// except R runs in a Web Worker so the page itself never freezes.
const WEBR_VERSION = '0.6.0'
const R_VERSION = '4.6.0'
const LOAD_LABEL = 'Load R — ~21 MB'

// webR's characteristic failure is a HANG, not a rejection (a worker killed
// by its environment dies silently and init() never settles) — the watchdog
// turns that into the error fallback instead of a forever-spinning button.
const INIT_TIMEOUT_MS = 60_000

let webRInstance: WebR | null = null
let enginePromise: Promise<void> | null = null

export type LoadPhase = 'runtime' | 'packages' | 'dataset'

async function initEngine(onPhase: (phase: LoadPhase) => void): Promise<void> {
  onPhase('runtime')
  const webR = new WebR({
    baseUrl: `/webr/${WEBR_VERSION}/`,
    repoUrl: '/webr/repo/',
    channelType: ChannelType.PostMessage,
  })
  await webR.init()
  onPhase('packages')
  await webR.installPackages(['dplyr', 'jsonlite'])
  onPhase('dataset')
  await webR.FS.mkdir('/data')
  for (const [name, csv] of Object.entries(PY_CSV)) {
    await webR.FS.writeFile(`/data/${name}.csv`, new TextEncoder().encode(csv))
  }
  await webR.evalRVoid(R_SETUP_CODE)
  webRInstance = webR
}

function loadEngine(onPhase: (phase: LoadPhase) => void): Promise<void> {
  if (!enginePromise) {
    enginePromise = (async () => {
      const attempt = initEngine(onPhase)
      // A timed-out attempt may still settle later — swallow that rejection
      // so it can't surface as an unhandled one.
      attempt.catch(() => {})
      let timer: number | undefined
      try {
        await Promise.race([
          attempt,
          new Promise<never>((_, reject) => {
            timer = window.setTimeout(
              () => reject(new Error('R engine start timed out')),
              INIT_TIMEOUT_MS
            )
          }),
        ])
      } finally {
        window.clearTimeout(timer)
      }
    })().catch((err) => {
      // Documents intent only: like Pyodide and sql.js, webR's init is not
      // assumed re-enterable after a failure — "Try again" reloads the page.
      enginePromise = null
      throw err
    })
  }
  return enginePromise
}

// Runs execute inside the webR worker — the page stays responsive, so the
// "Running…" state is real (no paint-then-block setTimeout like 08/ and 09/).
async function runExercise(userCode: string, exercise: RExercise): Promise<RunPayload> {
  const webR = webRInstance
  if (!webR) throw new Error('R engine not ready')
  // User code travels as a bound R variable, never string-interpolated —
  // no escaping problems. resultType/ordered come from our own literals.
  await webR.objs.globalEnv.bind('.webr_user_code', userCode)
  await webR.objs.globalEnv.bind('.webr_solution_code', exercise.solution)
  const raw = await webR.evalRString(
    `.webr_run_and_check(.webr_user_code, .webr_solution_code, ${
      exercise.ordered ? 'TRUE' : 'FALSE'
    }, '${exercise.resultType}')`
  )
  return JSON.parse(raw) as RunPayload
}

type EngineStatus = 'idle' | LoadPhase | 'ready' | 'error'

function useREngine(): { status: EngineStatus; start: () => void } {
  const [status, setStatus] = useState<EngineStatus>(() => (webRInstance ? 'ready' : 'idle'))
  const start = useCallback(() => {
    setStatus((s) => (s === 'idle' ? 'runtime' : s))
  }, [])
  const loading = status !== 'idle' && status !== 'ready' && status !== 'error'
  useEffect(() => {
    if (!loading) return
    let cancelled = false
    loadEngine((phase) => {
      if (!cancelled) setStatus(phase)
    }).then(
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
  }, [loading])
  return { status, start }
}

// Dev-only console fallback for scripts/verify-r-exercises.mjs: load the
// engine on /learn/r, then run window.__verifyAllR().
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  ;(window as unknown as { __verifyAllR?: () => Promise<void> }).__verifyAllR = async () => {
    const failures: { id: string; reason?: string; error?: string | null }[] = []
    for (const ex of R_EXERCISES) {
      const p = await runExercise(ex.solution, ex)
      if (!p.check?.pass) failures.push({ id: ex.id, reason: p.check?.reason, error: p.error })
    }
    console.log(`${R_EXERCISES.length - failures.length} / ${R_EXERCISES.length} solutions pass`)
    if (failures.length > 0) console.table(failures)
  }
}

// === Result payload (shape produced by _run_and_check) ===
type Cell = string | number | boolean | null

interface DisplayFrame {
  kind: 'frame'
  columns: string[]
  rows: Cell[][]
  total: number
}

interface DisplayScalar {
  kind: 'scalar'
  value: Cell
}

type DisplayResult = DisplayFrame | DisplayScalar

interface RunPayload {
  error: string | null
  stdout: string
  user: DisplayResult | null
  expected: DisplayResult | null
  check: { pass: boolean; reason?: string } | null
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

function formatCell(v: Cell): string {
  if (v === null) return 'NA'
  if (typeof v === 'boolean') return v ? 'True' : 'False'
  if (typeof v === 'number' && !Number.isInteger(v)) return String(Math.round(v * 10000) / 10000)
  return String(v)
}

function ResultFrame({ result, caption }: { result: DisplayFrame; caption: string }) {
  const shown = result.rows.length
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
            {result.rows.map((row, i) => (
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
        {result.total > shown ? `showing ${shown} of ${result.total} rows` : `${result.total} row${result.total === 1 ? '' : 's'}`}
      </p>
    </div>
  )
}

function ResultDisplay({ result, caption }: { result: DisplayResult; caption: string }) {
  if (result.kind === 'frame') return <ResultFrame result={result} caption={caption} />
  return (
    <p className="font-[family-name:var(--font-mono)] text-[13px] text-ink dark:text-night-text">
      result = {formatCell(result.value)}
    </p>
  )
}

// === Checked exercise ===
function Exercise({
  exercise,
  number,
  engineReady,
  solved,
  onPass,
}: {
  exercise: RExercise
  number: number
  engineReady: boolean
  solved: boolean
  onPass: (id: string) => void
}) {
  const [text, setText] = useState('')
  const [payload, setPayload] = useState<RunPayload | null>(null)
  const [running, setRunning] = useState(false)
  const [showExpected, setShowExpected] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [showSolution, setShowSolution] = useState(false)

  const run = useCallback(() => {
    if (!engineReady || !text.trim() || running) return
    setRunning(true)
    setShowExpected(false)
    void (async () => {
      try {
        const result = await runExercise(text, exercise)
        setPayload(result)
        if (result.check?.pass) onPass(exercise.id)
      } catch (e) {
        setPayload({
          error: e instanceof Error ? e.message : String(e),
          stdout: '',
          user: null,
          expected: null,
          check: null,
        })
      } finally {
        setRunning(false)
      }
    })()
  }, [engineReady, running, text, exercise, onPass])

  const failed = payload?.check && !payload.check.pass

  return (
    <div className="rounded-lg border border-cream-border dark:border-night-border bg-cream-dark/30 dark:bg-night-card/40 p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-3">
        <p className="font-[family-name:var(--font-mono)] text-[12px] tracking-[0.2em] uppercase text-peach dark:text-peach-dark">
          ex. {String(number).padStart(2, '0')}
          {solved && (
            <span className="ml-3 normal-case tracking-normal">
              <span aria-hidden="true">{'✓'} </span>solved
            </span>
          )}
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
        rows={5}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        placeholder="result <- …"
        aria-label={`R editor for exercise ${number} (${exercise.tables.join(', ')})`}
        className="w-full resize-y rounded-lg border border-cream-border dark:border-night-border bg-cream-dark/60 dark:bg-night-card/60 px-3.5 py-3 font-[family-name:var(--font-mono)] text-[13px] leading-relaxed text-ink dark:text-night-text placeholder:text-ink-subtle/70 dark:placeholder:text-night-muted/70"
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" onClick={run} disabled={!engineReady || running} className={PILL_PRIMARY}>
          {running ? 'Running…' : 'Run'}
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

      {payload && payload.stdout && (
        <div className="mt-4">
          <p className="font-[family-name:var(--font-mono)] text-[12px] tracking-[0.2em] uppercase text-ink-subtle dark:text-night-muted mb-1.5">
            stdout
          </p>
          <pre className="overflow-x-auto rounded-lg bg-cream-dark/60 dark:bg-night-card/60 px-4 py-3 font-[family-name:var(--font-mono)] text-[13px] leading-relaxed text-ink dark:text-night-text">
            {payload.stdout}
          </pre>
        </div>
      )}

      {payload?.user && !payload.error && (
        <div className="mt-4">
          <ResultDisplay result={payload.user} caption={`Your result for exercise ${number}`} />
        </div>
      )}

      {/* Live region — announces run/check outcomes and errors */}
      <div aria-live="polite">
        {payload?.error && (
          <p className="mt-4 rounded-lg bg-red-600/10 px-4 py-3 font-[family-name:var(--font-mono)] text-[13px] leading-relaxed text-red-600 dark:text-red-400">
            R error: {payload.error}
          </p>
        )}
        {payload?.check?.pass && (
          <p className="mt-4 font-[family-name:var(--font-mono)] text-[13px] text-ink dark:text-night-text">
            <span aria-hidden="true" className="text-peach dark:text-peach-dark">
              {'✓'}{' '}
            </span>
            Correct &mdash; result matches expected
          </p>
        )}
        {failed && (
          <p className="mt-4 font-[family-name:var(--font-mono)] text-[13px] text-ink-subtle dark:text-night-muted">
            Doesn&apos;t match &mdash; {payload?.check?.reason}
          </p>
        )}
      </div>

      {failed && payload?.expected && (
        <div className="mt-3">
          <button type="button" onClick={() => setShowExpected((v) => !v)} className={PILL_SUBTLE}>
            {showExpected ? 'Hide expected' : 'Show expected'}
          </button>
          {showExpected && (
            <div className="mt-3">
              <ResultDisplay result={payload.expected} caption={`Expected result for exercise ${number}`} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// === Sections ===
interface SectionDef {
  id: RSectionId
  number: string
  title: string
  intro: string
  insight: string
}

const SECTIONS: SectionDef[] = [
  {
    id: 'r-filter',
    number: '01',
    title: 'Filtering & sorting',
    intro:
      "filter() is R's WHERE: write the condition directly — no mask, no brackets — and only the matching rows survive. arrange() is ORDER BY, select() the column list, and |> chains the verbs in reading order.",
    insight:
      "Several conditions inside one filter() are AND — commas behave like SQL's AND, with none of pandas' parentheses trap. Date columns compare directly against as.Date('1980-01-01') (a bare string coerces too). And NA never equals anything: end_date == NA matches nothing, silently — is.na() is the test.",
  },
  {
    id: 'r-group',
    number: '02',
    title: 'Group & summarise',
    intro:
      "group_by() + summarise() is GROUP BY — n() counts the rows in each group, and the keys come back as ordinary columns, no index to reset. There is no HAVING keyword: summarise first, then filter() the summarised frame.",
    insight:
      'The WHERE / HAVING split is filter() placement: before group_by() it prunes raw rows, after summarise() it prunes groups. Same rule in all three languages — if the condition mentions an aggregate, it comes after.',
  },
  {
    id: 'r-join',
    number: '03',
    title: 'Joins & the fan-out trap',
    intro:
      'The *_join verbs read like the SQL they mirror: inner_join keeps matches, left_join keeps every left-side row with NA where the right side is missing — and anti_join is a first-class verb, not a ~isin() trick. One-to-many joins multiply rows: the same fan-out that corrupts SQL and pandas counts corrupts dplyr counts.',
    insight:
      "After a left join, missing values come back NA — coalesce(x, 0) is dplyr's fillna. After a double one-to-many join, count per level with n_distinct() — R's COUNT(DISTINCT).",
  },
  {
    id: 'r-window',
    number: '04',
    title: 'Window operations',
    intro:
      "The window move in dplyr is a grouped mutate(): group_by() + mutate() computes per group while keeping every row — row_number() is ROW_NUMBER, lag() is LAG, cumsum() the running total. slice_max() grabs the latest row per group in one verb.",
    insight:
      "summarise() collapses to one row per group; a grouped mutate() keeps them all — that one distinction is the whole window-function idea, in R as in pandas as in SQL. arrange() first: cumulative operations honor the current row order. And ungroup() when you're done — a forgotten grouping silently changes the next verb.",
  },
  {
    id: 'r-challenge',
    number: '05',
    title: 'Challenges',
    intro:
      'No new verbs here — each of these chains filtering, joining, grouping, and window steps in one pipeline, the way real analyst work does.',
    insight:
      'Long pipelines are written step by step: assign each stage to a name, print(head(x)) to look at it, and only then chain the next verb. The stdout box above every result exists for exactly that.',
  },
]

function ArtifactSection({
  section,
  exercises,
  startNumber,
  engineReady,
  solved,
  onPass,
}: {
  section: SectionDef
  exercises: RExercise[]
  startNumber: number
  engineReady: boolean
  solved: Set<string>
  onPass: (id: string) => void
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
          <Exercise
            key={ex.id}
            exercise={ex}
            number={startNumber + i}
            engineReady={engineReady}
            solved={solved.has(ex.id)}
            onPass={onPass}
          />
        ))}
      </div>
      <InsightBox>{section.insight}</InsightBox>
    </section>
  )
}

// Engine-load failure stays inside the artifact (never thrown to the
// ArtifactErrorBoundary). webR's init isn't safely re-enterable after a
// failed load, so the only real retry is a fresh page load.
function EngineFallback() {
  return (
    <div className="text-center py-20">
      <p className="font-[family-name:var(--font-mono)] text-[13px] tracking-[0.3em] uppercase mb-4 text-peach dark:text-peach-dark">
        Engine error
      </p>
      <h2 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl text-ink dark:text-night-text mb-4">
        The R engine didn&apos;t load
      </h2>
      <p className="text-[15px] text-ink-subtle dark:text-night-muted mb-8">
        The webR runtime failed to start — it may have timed out, or this browser may not support it.
      </p>
      <button type="button" onClick={() => window.location.reload()} className={PILL_PRIMARY}>
        Try again
      </button>
    </div>
  )
}

const PROGRESS_KEY = 'r-progress-v1'

const STATUS_COPY: Record<EngineStatus, string> = {
  idle: 'nothing downloads until you click Load R',
  runtime: 'loading R runtime — ~21 MB total, served from this site',
  packages: 'installing dplyr…',
  dataset: 'building data.frames from the seed dataset…',
  ready: 'engine ready — every run starts from fresh copies of the data.frames',
  error: 'engine failed to load',
}

export function R() {
  const { status, start } = useREngine()
  const engineReady = status === 'ready'

  // localStorage progress — safe to read in the lazy initializer because
  // this component loads with ssr: false (no server render to mismatch)
  const [solved, setSolved] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    try {
      const raw = localStorage.getItem(PROGRESS_KEY)
      if (!raw) return new Set()
      const ids = (JSON.parse(raw) as unknown[]).filter((x): x is string => typeof x === 'string')
      return new Set(ids)
    } catch {
      // corrupted/blocked storage — start fresh
      return new Set()
    }
  })
  const markSolved = useCallback((id: string) => {
    setSolved((prev) => {
      if (prev.has(id)) return prev
      const next = new Set(prev).add(id)
      try {
        localStorage.setItem(PROGRESS_KEY, JSON.stringify([...next]))
      } catch {
        // storage full/blocked — progress just won't persist
      }
      return next
    })
  }, [])
  const resetProgress = useCallback(() => {
    setSolved(new Set())
    try {
      localStorage.removeItem(PROGRESS_KEY)
    } catch {
      // nothing to clean up if storage is blocked
    }
  }, [])

  // Exercise numbering is continuous across sections
  const startNumbers: number[] = []
  let acc = 1
  for (const sec of SECTIONS) {
    startNumbers.push(acc)
    acc += R_EXERCISES.filter((e) => e.section === sec.id).length
  }

  return (
    <div className="mx-auto max-w-5xl px-6 sm:px-10 lg:px-12">
      {/* Title */}
      <div className="text-center mb-12">
        <p className="font-[family-name:var(--font-mono)] text-[13px] tracking-[0.3em] uppercase mb-4 text-peach dark:text-peach-dark">
          10/
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl text-ink dark:text-night-text mb-4">
          R / dplyr
        </h1>
        <p className="text-[15px] text-ink-subtle dark:text-night-muted">
          {SECTIONS.length} sections {'·'} {R_EXERCISES.length} checked exercises {'·'} R + dplyr running in your browser via WebAssembly
        </p>
        <div className="mt-4 h-px w-16 mx-auto bg-mauve dark:bg-mauve-dark" />
        <p role="status" className="mt-6 font-[family-name:var(--font-mono)] text-[12px] text-ink-subtle dark:text-night-muted">
          {STATUS_COPY[status]}
        </p>
        {status === 'idle' && (
          <div className="mt-6">
            <button type="button" onClick={start} className={PILL_PRIMARY}>
              {LOAD_LABEL}
            </button>
            <p className="mt-4 text-[13px] text-ink-subtle dark:text-night-muted max-w-md mx-auto leading-relaxed">
              webR {WEBR_VERSION} &mdash; R {R_VERSION} and dplyr compiled to WebAssembly,
              self-hosted on this site and fetched only when you ask.
            </p>
          </div>
        )}
      </div>

      {status === 'error' ? (
        <EngineFallback />
      ) : (
        <>
          {/* Dataset legend — plain-text schema reference */}
          <div className="mb-4 rounded-lg border border-cream-border dark:border-night-border bg-cream-dark/30 dark:bg-night-card/40 p-5 overflow-x-auto">
            <p className="font-[family-name:var(--font-mono)] text-[12px] tracking-[0.2em] uppercase text-mauve dark:text-mauve-dark mb-3">
              the data.frames {'·'} synthetic {'·'} same data as 08/ SQL and 09/ Python
            </p>
            <ul className="space-y-1.5 font-[family-name:var(--font-mono)] text-[12px] sm:text-[13px] text-ink-subtle dark:text-night-muted">
              <li className="whitespace-nowrap">
                <span className="text-ink dark:text-night-text">patients</span> (patient_id, name, sex, birth_date, city) &mdash; {PY_COUNTS.patients} rows
              </li>
              <li className="whitespace-nowrap">
                <span className="text-ink dark:text-night-text">encounters</span> (encounter_id, patient_id, dept, admit_date, discharge_date) &mdash; {PY_COUNTS.encounters} rows
              </li>
              <li className="whitespace-nowrap">
                <span className="text-ink dark:text-night-text">labs</span> (lab_id, encounter_id, test_name, value, unit, taken_at) &mdash; {PY_COUNTS.labs} rows
              </li>
              <li className="whitespace-nowrap">
                <span className="text-ink dark:text-night-text">medications</span> (med_id, patient_id, drug_name, start_date, end_date) &mdash; {PY_COUNTS.medications} rows
              </li>
            </ul>
            <p className="mt-3 font-[family-name:var(--font-mono)] text-[12px] text-ink-subtle dark:text-night-muted">
              date columns are Date (labs.taken_at is POSIXct) {'·'} dplyr is pre-loaded {'·'} every exercise ends by assigning to result
            </p>
          </div>

          {/* Progress line */}
          <div className="mb-4 flex items-baseline justify-end gap-4 font-[family-name:var(--font-mono)] text-[12px] text-ink-subtle dark:text-night-muted">
            <p>
              <span aria-hidden="true" className="text-peach dark:text-peach-dark">
                {'✓'}{' '}
              </span>
              {solved.size} of {R_EXERCISES.length} solved
            </p>
            {solved.size > 0 && (
              <button
                type="button"
                onClick={resetProgress}
                className="underline underline-offset-2 hover:text-ink dark:hover:text-night-text transition-colors py-3"
              >
                reset progress
              </button>
            )}
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
                exercises={R_EXERCISES.filter((e) => e.section === sec.id)}
                startNumber={startNumbers[i]}
                engineReady={engineReady}
                solved={solved}
                onPass={markSolved}
              />
            </div>
          ))}
        </>
      )}

      <p className="mt-16 text-center font-[family-name:var(--font-mono)] text-[12px] text-ink-subtle dark:text-night-muted">
        R and the webR runtime binaries are GPL-3 &mdash;{' '}
        <a
          href="https://github.com/r-wasm/webr"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="webR source on GitHub (opens in new tab)"
          className="underline underline-offset-2 hover:text-ink dark:hover:text-night-text transition-colors"
        >
          source
        </a>
      </p>
    </div>
  )
}
