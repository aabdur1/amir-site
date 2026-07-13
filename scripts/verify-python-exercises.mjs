#!/usr/bin/env node
// scripts/verify-python-exercises.mjs — asserts every canonical pandas
// solution passes the Python checker, running Pyodide in Node (same
// discipline as scripts/verify-r-exercises.mjs: canonical vs canonical must
// pass, non-empty, with the exercise's own ordered flag). Run:
// npm run verify-python
// Expected final line: "<N> / <N> solutions pass" with exit code 0.
//
// The checker harness is NOT duplicated here — it is sliced verbatim out of
// components/learn/python.tsx, so this script always verifies against the
// exact Python the browser executes. The Pyodide runtime comes from the
// `pyodide` npm devDependency (core only); loadPackage pulls the
// pandas/NumPy wheels from the Pyodide CDN on first run, so this needs
// network access the first time.

import { readFileSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'
import { loadPyodide } from 'pyodide'

const require = createRequire(import.meta.url)

// --- compile the TS data modules to CJS so plain Node can load them ---
const outDir = path.resolve('.verify-tmp')
await rm(outDir, { recursive: true, force: true })
execFileSync('npx', [
  'tsc',
  'lib/learn/python-data.ts', 'lib/learn/python-exercises.ts',
  '--outDir', outDir, '--module', 'commonjs', '--target', 'es2022', '--skipLibCheck',
], { stdio: 'inherit' })
const { PY_CSV } = require(path.join(outDir, 'python-data.js'))
const { PY_EXERCISES } = require(path.join(outDir, 'python-exercises.js'))

// --- extract SETUP_CODE (frames + fresh-namespace runner + checker) ---
// python.tsx is a client component (JSX, app-aliased imports), so it can't
// be tsc-compiled and required the way the data modules are. Its SETUP_CODE
// template literal contains no ${} interpolation and no backticks, so
// slicing it out of the source text yields the EXACT string the browser
// executes — zero duplication, zero drift.
const componentPath = path.resolve('components/learn/python.tsx')
const source = readFileSync(componentPath, 'utf8')
const match = source.match(/const SETUP_CODE = `([\s\S]*?)`/)
if (!match) throw new Error(`could not extract SETUP_CODE from ${componentPath}`)
const SETUP_CODE = match[1]
for (const needle of ['def _run_and_check', '_build_frames(json.loads(_PY_CSV_JSON))']) {
  if (!SETUP_CODE.includes(needle)) {
    throw new Error(`extracted SETUP_CODE is missing "${needle}" — extraction is stale, fix the slice`)
  }
}

// --- boot the engine the way components/learn/python.tsx does ---
const py = await loadPyodide()
await py.loadPackage(['pandas', 'numpy'])
py.globals.set('_PY_CSV_JSON', JSON.stringify(PY_CSV))
await py.runPythonAsync(SETUP_CODE)
const runAndCheck = py.globals.get('_run_and_check')

// --- every canonical solution must pass its own checker, non-empty ---
let passed = 0
const failures = []
for (const ex of PY_EXERCISES) {
  let payload = null
  let thrown = null
  try {
    payload = JSON.parse(runAndCheck(ex.solution, ex.solution, ex.ordered, ex.resultType))
  } catch (e) {
    thrown = e instanceof Error ? e.message : String(e)
  }
  const exp = payload?.expected
  const nonEmpty = exp != null && (exp.kind === 'scalar' ? exp.value !== null : exp.total > 0)
  const ok = thrown === null && payload?.error == null && payload?.check?.pass && nonEmpty
  if (ok) {
    passed++
    console.log(`✓ ${ex.id}`)
  } else {
    console.log(`✗ ${ex.id}`)
    failures.push({
      id: ex.id,
      error: thrown ?? payload?.error ?? undefined,
      reason:
        payload?.check?.reason ??
        (payload && !nonEmpty ? 'expected result is EMPTY — teaching-shape violation' : undefined),
    })
  }
}

console.log(`${passed} / ${PY_EXERCISES.length} solutions pass`)
if (failures.length > 0) {
  console.table(failures)
  process.exitCode = 1
}

runAndCheck?.destroy?.()
await rm(outDir, { recursive: true, force: true })
// Pyodide's Emscripten runtime can hold the event loop open; the work is
// done and the summary is printed, so exit explicitly with the verdict.
process.exit(process.exitCode ?? 0)
