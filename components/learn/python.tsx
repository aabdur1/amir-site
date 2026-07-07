'use client'

import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useScrollReveal } from '@/lib/hooks'
import { SectionDivider } from '@/components/section-divider'
import { PY_CSV, PY_COUNTS } from '@/lib/learn/python-data'
import { PY_EXERCISES, type PyExercise, type PySectionId } from '@/lib/learn/python-exercises'

// === Engine — module-level singleton ===
// Pyodide loads from the pinned jsDelivr CDN, and only after the user clicks
// the load button — zero Pyodide bytes on any other route AND on this page
// before the click. The /learn/python CSP override in next.config.ts is what
// allows the CDN; the site-wide policy stays untouched.
const PYODIDE_VERSION = '0.29.4'
const PYODIDE_CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`

interface PyodideApi {
  loadPackage(pkg: string): Promise<unknown>
  runPythonAsync(code: string): Promise<unknown>
  globals: {
    set(name: string, value: unknown): void
    get(name: string): unknown
  }
}

declare global {
  interface Window {
    loadPyodide?: (opts: { indexURL: string }) => Promise<PyodideApi>
  }
}

// The Python side of the sandbox: frame building, a fresh namespace per run,
// and the checker. Comparison mirrors lib/learn/sql-check.ts semantics:
// positional (aliases/renames pass), canonical row sort unless ordered,
// numeric atol 1e-9, NaN/NaT equal to themselves, shape mismatches reported
// as counts. A groupby/value_counts result with keys in the index is also
// compared reset_index(), so either idiom passes.
const SETUP_CODE = `
import io
import json
import math
import contextlib
import numpy as np
import pandas as pd

_MASTER = {}
_HEAD = 50
_EPS = 1e-9


def _build_frames(csv_map):
    _MASTER['patients'] = pd.read_csv(io.StringIO(csv_map['patients']), parse_dates=['birth_date'])
    _MASTER['encounters'] = pd.read_csv(io.StringIO(csv_map['encounters']), parse_dates=['admit_date', 'discharge_date'])
    _MASTER['labs'] = pd.read_csv(io.StringIO(csv_map['labs']), parse_dates=['taken_at'])
    _MASTER['medications'] = pd.read_csv(io.StringIO(csv_map['medications']), parse_dates=['start_date', 'end_date'])


def _fresh_ns():
    # Fresh namespace per run: users get .copy()s, so mutations never leak
    # between runs or exercises.
    ns = {'pd': pd, 'np': np}
    for name, frame in _MASTER.items():
        ns[name] = frame.copy()
    return ns


def _isna(v):
    try:
        r = pd.isna(v)
        return bool(r) if not isinstance(r, np.ndarray) else False
    except Exception:
        return False


def _is_num(v):
    return isinstance(v, (int, float, np.integer, np.floating)) and not isinstance(v, (bool, np.bool_))


def _matrix(obj):
    if isinstance(obj, pd.Series):
        name = 'value' if obj.name is None else str(obj.name)
        return [name], [[v] for v in obj.tolist()]
    cols = [str(c) for c in obj.columns]
    rows = [list(t) for t in obj.itertuples(index=False, name=None)]
    return cols, rows


def _candidates(obj):
    # A groupby/value_counts result carries its keys in the index; comparing
    # both as-is and reset_index() lets either idiom pass.
    out = [_matrix(obj)]
    try:
        out.append(_matrix(obj.reset_index()))
    except Exception:
        pass
    return out


def _cells_equal(a, b):
    na, nb = _isna(a), _isna(b)
    if na or nb:
        return na and nb
    if _is_num(a) and _is_num(b):
        return bool(np.isclose(float(a), float(b), rtol=0.0, atol=_EPS))
    if isinstance(a, pd.Timestamp) or isinstance(b, pd.Timestamp):
        try:
            return pd.Timestamp(a) == pd.Timestamp(b)
        except Exception:
            return False
    if isinstance(a, str) and isinstance(b, str):
        return a.strip() == b.strip()
    try:
        return bool(a == b)
    except Exception:
        return False


def _sort_key(row):
    parts = []
    for v in row:
        if _isna(v):
            parts.append(['z'])
        elif _is_num(v):
            parts.append(['n', format(float(v), '.9f')])
        elif isinstance(v, pd.Timestamp):
            parts.append(['t', v.isoformat()])
        else:
            parts.append(['s', str(v).strip()])
    return json.dumps(parts)


def _compare_matrices(user_m, exp_m, ordered):
    ucols, urows = user_m
    ecols, erows = exp_m
    if len(ucols) != len(ecols):
        s = '' if len(ucols) == 1 else 's'
        return {'pass': False, 'reason': f'{len(ucols)} column{s} vs {len(ecols)} expected'}
    if len(urows) != len(erows):
        s = '' if len(urows) == 1 else 's'
        return {'pass': False, 'reason': f'{len(urows)} row{s} vs {len(erows)} expected'}
    u = urows if ordered else sorted(urows, key=_sort_key)
    e = erows if ordered else sorted(erows, key=_sort_key)
    for i in range(len(u)):
        for j in range(len(u[i])):
            if not _cells_equal(u[i][j], e[i][j]):
                return {'pass': False, 'reason': f'values differ at row {i + 1}, column {j + 1}'}
    return {'pass': True}


def _check_frame(user, expected, ordered):
    if not isinstance(user, (pd.DataFrame, pd.Series)):
        return {'pass': False, 'reason': f'result should be a DataFrame or Series, got {type(user).__name__}'}
    exp_m = _matrix(expected)
    results = [_compare_matrices(m, exp_m, ordered) for m in _candidates(user)]
    for r in results:
        if r['pass']:
            return r
    # On failure, report the candidate matching the table the user sees:
    # display materializes informative indexes, so mirror that choice here.
    display_idx = 1 if _informative_index(user) and len(results) > 1 else 0
    return results[display_idx]


def _check_scalar(user, expected):
    if isinstance(user, (pd.DataFrame, pd.Series)):
        return {'pass': False, 'reason': f'result should be a single value, got a {type(user).__name__}'}
    if _cells_equal(user, expected):
        return {'pass': True}
    return {'pass': False, 'reason': 'value differs from expected'}


def _fmt_cell(v):
    if _isna(v):
        return None
    if isinstance(v, pd.Timestamp):
        if v.hour == 0 and v.minute == 0 and v.second == 0:
            return v.strftime('%Y-%m-%d')
        return v.strftime('%Y-%m-%d %H:%M')
    if isinstance(v, (bool, np.bool_)):
        return bool(v)
    if isinstance(v, (int, np.integer)):
        return int(v)
    if isinstance(v, (float, np.floating)):
        f = float(v)
        return f if math.isfinite(f) else str(f)
    return str(v)[:500]


def _informative_index(obj):
    # groupby keys live in a named index / MultiIndex — show those; hide the
    # anonymous integer index every plain frame carries.
    return isinstance(obj.index, pd.MultiIndex) or obj.index.name is not None


def _display(obj):
    if isinstance(obj, (pd.DataFrame, pd.Series)):
        d = obj.reset_index() if _informative_index(obj) else obj
        if isinstance(d, pd.Series):
            d = d.to_frame(name='value' if d.name is None else str(d.name))
        cols, rows = _matrix(d)
        return {
            'kind': 'frame',
            'columns': cols,
            'rows': [[_fmt_cell(v) for v in r] for r in rows[:_HEAD]],
            'total': len(rows),
        }
    return {'kind': 'scalar', 'value': _fmt_cell(obj)}


def _format_error(e):
    if isinstance(e, SyntaxError):
        line = f' (line {e.lineno})' if e.lineno else ''
        return f'SyntaxError: {e.msg}{line}'
    tb = e.__traceback__
    lineno = None
    while tb is not None:
        if tb.tb_frame.f_code.co_filename == '<your code>':
            lineno = tb.tb_lineno
        tb = tb.tb_next
    loc = f' (line {lineno})' if lineno else ''
    return f'{type(e).__name__}: {e}{loc}'


def _run_user(code):
    ns = _fresh_ns()
    out = io.StringIO()
    err = None
    with contextlib.redirect_stdout(out):
        try:
            exec(compile(code, '<your code>', 'exec'), ns)
        except BaseException as e:
            err = _format_error(e)
    return ns, out.getvalue(), err


def _run_and_check(user_code, solution_code, ordered, result_type):
    payload = {'error': None, 'stdout': '', 'user': None, 'expected': None, 'check': None}
    ns, stdout, err = _run_user(user_code)
    payload['stdout'] = stdout[-8000:]
    if err is not None:
        payload['error'] = err
        return json.dumps(payload)
    sol_ns, _, sol_err = _run_user(solution_code)
    if sol_err is not None:
        payload['error'] = f'internal: canonical solution failed - {sol_err}'
        return json.dumps(payload)
    expected = sol_ns['result']
    payload['expected'] = _display(expected)
    if 'result' not in ns:
        payload['check'] = {'pass': False, 'reason': 'assign your answer to a variable named result'}
        return json.dumps(payload)
    user = ns['result']
    payload['user'] = _display(user)
    if result_type == 'scalar':
        payload['check'] = _check_scalar(user, expected)
    else:
        payload['check'] = _check_frame(user, expected, ordered)
    return json.dumps(payload)


_build_frames(json.loads(_PY_CSV_JSON))
`

type RunAndCheckFn = (userCode: string, solution: string, ordered: boolean, resultType: string) => string

let runAndCheck: RunAndCheckFn | null = null
let enginePromise: Promise<void> | null = null

export type LoadPhase = 'runtime' | 'pandas' | 'dataset'

function injectScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const el = document.createElement('script')
    el.src = src
    el.onload = () => resolve()
    el.onerror = () => reject(new Error(`failed to load ${src}`))
    document.head.appendChild(el)
  })
}

function loadEngine(onPhase: (phase: LoadPhase) => void): Promise<void> {
  if (!enginePromise) {
    enginePromise = (async () => {
      onPhase('runtime')
      if (!window.loadPyodide) await injectScript(`${PYODIDE_CDN}pyodide.js`)
      if (!window.loadPyodide) throw new Error('loadPyodide missing after script load')
      const py = await window.loadPyodide({ indexURL: PYODIDE_CDN })
      onPhase('pandas')
      await py.loadPackage('pandas')
      onPhase('dataset')
      py.globals.set('_PY_CSV_JSON', JSON.stringify(PY_CSV))
      await py.runPythonAsync(SETUP_CODE)
      runAndCheck = py.globals.get('_run_and_check') as RunAndCheckFn
    })().catch((err) => {
      // Documents intent only: Pyodide's init can't be safely re-entered
      // after a failed load (same class of problem as sql.js's cached init
      // promise), so "Try again" reloads the page instead — see
      // EngineFallback.
      enginePromise = null
      throw err
    })
  }
  return enginePromise
}

// Runs are synchronous on the main thread (accepted, like the SQL sandbox —
// a runaway loop freezes the user's own tab and a reload recovers).
function runExercise(userCode: string, exercise: PyExercise): RunPayload {
  if (!runAndCheck) throw new Error('Python engine not ready')
  const raw = runAndCheck(userCode, exercise.solution, exercise.ordered, exercise.resultType)
  return JSON.parse(raw) as RunPayload
}

type EngineStatus = 'idle' | LoadPhase | 'ready' | 'error'

function usePythonEngine(): { status: EngineStatus; start: () => void } {
  const [status, setStatus] = useState<EngineStatus>(() => (runAndCheck ? 'ready' : 'idle'))
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
  if (v === null) return 'NaN'
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
  exercise: PyExercise
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
    // The timeout lets the "Running…" state paint before the main thread
    // blocks on Python execution.
    window.setTimeout(() => {
      try {
        const result = runExercise(text, exercise)
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
    }, 30)
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
        placeholder="result = …"
        aria-label={`Python editor for exercise ${number} (${exercise.tables.join(', ')})`}
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
            Python error: {payload.error}
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
  id: PySectionId
  number: string
  title: string
  intro: string
  insight: string
}

// The four sections; exercises attach by their `section` id, numbered
// continuously across sections (ex. 01–11). Each mirrors the same-numbered
// SQL section, so the SQL ↔ pandas mapping stays explicit.
const SECTIONS: SectionDef[] = [
  {
    id: 'py-filter',
    number: '01',
    title: 'Filtering & sorting',
    intro:
      "A boolean mask is pandas' WHERE: compare a column, get a Series of True/False, index the frame with it, and only the True rows survive. sort_values is ORDER BY.",
    insight:
      "Compound masks need parentheses around every comparison — & and | bind tighter than ==, so (a == 1) & (b == 2) works where a == 1 & b == 2 silently does the wrong thing. And datetime64 columns compare directly against ISO strings like '1980-01-01'.",
  },
  {
    id: 'py-groupby',
    number: '02',
    title: 'GroupBy & aggregation',
    intro:
      'groupby collapses rows into groups the way GROUP BY does — but the group keys move into the index unless you say as_index=False. There is no HAVING keyword: aggregate first, then filter the aggregated frame.',
    insight:
      'The WHERE / HAVING split is just mask placement: filter the raw frame before groupby (WHERE), filter the aggregated result after (HAVING). Same rule as SQL — if the condition mentions an aggregate, it goes after.',
  },
  {
    id: 'py-merge',
    number: '03',
    title: 'Merging & the fan-out trap',
    intro:
      "merge lines two frames up on key columns — how='inner' keeps only matches, how='left' keeps every left-side row with NaN where the right side is missing. One-to-many merges multiply rows: the same fan-out that corrupts SQL counts corrupts pandas counts.",
    insight:
      "After a left merge, missing counts come back NaN — and NaN is a float, so the whole column silently turns float. fillna(0) before you trust it. After a double one-to-many merge, count per level with ('col', 'nunique') — pandas' COUNT(DISTINCT).",
  },
  {
    id: 'py-window',
    number: '04',
    title: 'Window operations',
    intro:
      "SQL's window functions map to groupby operations that keep every row: cumcount() is ROW_NUMBER, cumsum() a running total, and sort_values + groupby.tail(1) the latest-row-per-group pattern.",
    insight:
      "groupby.agg collapses to one row per group; cumcount/cumsum/transform keep all the rows — that one distinction is the whole 'window function' idea. Sort first: cumulative operations honor the current row order.",
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
  exercises: PyExercise[]
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
// ArtifactErrorBoundary). Pyodide's init isn't safely re-enterable after a
// failed load, so the only real retry is a fresh page load.
function EngineFallback() {
  return (
    <div className="text-center py-20">
      <p className="font-[family-name:var(--font-mono)] text-[13px] tracking-[0.3em] uppercase mb-4 text-peach dark:text-peach-dark">
        Engine error
      </p>
      <h2 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl text-ink dark:text-night-text mb-4">
        The Python engine didn&apos;t load
      </h2>
      <p className="text-[15px] text-ink-subtle dark:text-night-muted mb-8">
        The Pyodide runtime failed to download or initialize from the CDN.
      </p>
      <button type="button" onClick={() => window.location.reload()} className={PILL_PRIMARY}>
        Try again
      </button>
    </div>
  )
}

const PROGRESS_KEY = 'python-progress-v1'

const STATUS_COPY: Record<EngineStatus, string> = {
  idle: 'nothing downloads until you click Load Python',
  runtime: 'loading CPython runtime — ~13 MB total from jsDelivr',
  pandas: 'loading pandas + NumPy…',
  dataset: 'building DataFrames from the seed dataset…',
  ready: 'engine ready — every run starts from fresh copies of the DataFrames',
  error: 'engine failed to load',
}

export function Python() {
  const { status, start } = usePythonEngine()
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

  // Exercise numbering is continuous across sections (ex. 01–11)
  const startNumbers: number[] = []
  let acc = 1
  for (const sec of SECTIONS) {
    startNumbers.push(acc)
    acc += PY_EXERCISES.filter((e) => e.section === sec.id).length
  }

  return (
    <div className="mx-auto max-w-5xl px-6 sm:px-10 lg:px-12">
      {/* Title */}
      <div className="text-center mb-12">
        <p className="font-[family-name:var(--font-mono)] text-[13px] tracking-[0.3em] uppercase mb-4 text-peach dark:text-peach-dark">
          09/
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl text-ink dark:text-night-text mb-4">
          Python / pandas
        </h1>
        <p className="text-[15px] text-ink-subtle dark:text-night-muted">
          4 sections {'·'} 11 checked exercises {'·'} CPython + pandas running in your browser via WebAssembly
        </p>
        <div className="mt-4 h-px w-16 mx-auto bg-mauve dark:bg-mauve-dark" />
        <p role="status" className="mt-6 font-[family-name:var(--font-mono)] text-[12px] text-ink-subtle dark:text-night-muted">
          {STATUS_COPY[status]}
        </p>
        {status === 'idle' && (
          <div className="mt-6">
            <button type="button" onClick={start} className={PILL_PRIMARY}>
              Load Python &mdash; ~13 MB
            </button>
            <p className="mt-4 text-[13px] text-ink-subtle dark:text-night-muted max-w-md mx-auto leading-relaxed">
              Pyodide {PYODIDE_VERSION} &mdash; CPython and pandas compiled to WebAssembly, fetched from the
              jsDelivr CDN only when you ask.
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
              the DataFrames {'·'} synthetic {'·'} same data as 08/ SQL
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
              date columns are datetime64 {'·'} pd and np are pre-imported {'·'} every exercise ends by assigning to result
            </p>
          </div>

          {/* Progress line */}
          <div className="mb-4 flex items-baseline justify-end gap-4 font-[family-name:var(--font-mono)] text-[12px] text-ink-subtle dark:text-night-muted">
            <p>
              <span aria-hidden="true" className="text-peach dark:text-peach-dark">
                {'✓'}{' '}
              </span>
              {solved.size} of {PY_EXERCISES.length} solved
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
                exercises={PY_EXERCISES.filter((e) => e.section === sec.id)}
                startNumber={startNumbers[i]}
                engineReady={engineReady}
                solved={solved}
                onPass={markSolved}
              />
            </div>
          ))}
        </>
      )}
    </div>
  )
}
