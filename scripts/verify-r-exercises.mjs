#!/usr/bin/env node
// scripts/verify-r-exercises.mjs — asserts every canonical dplyr solution
// passes the R checker, running webR in Node against the ACTUAL served
// public/webr assets (same discipline as generate-sql-seed.mjs's in-script
// assertions). Run: npm run verify-r
// Expected final line: "<N> / <N> solutions pass" with exit code 0.
//
// If webR-in-Node fails on your Node version, the browser fallback is the
// dev-only hook in components/learn/r.tsx: run `npm run dev`, open
// /learn/r, load the engine, then call window.__verifyAllR() in the console.

import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'

const WEBR_VERSION = '0.6.0'
const require = createRequire(import.meta.url)

// --- compile the TS data modules to CJS so plain Node can load them ---
const outDir = path.resolve('.verify-tmp')
await rm(outDir, { recursive: true, force: true })
execFileSync('npx', [
  'tsc',
  'lib/learn/python-data.ts', 'lib/learn/r-harness.ts', 'lib/learn/r-exercises.ts',
  '--outDir', outDir, '--module', 'commonjs', '--target', 'es2022', '--skipLibCheck',
], { stdio: 'inherit' })
const { PY_CSV } = require(path.join(outDir, 'python-data.js'))
const { R_SETUP_CODE } = require(path.join(outDir, 'r-harness.js'))
const { R_EXERCISES } = require(path.join(outDir, 'r-exercises.js'))

// --- serve ./public so webR fetches the same files the site would ---
const root = path.resolve('public')
const MIME = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.wasm': 'application/wasm', '.json': 'application/json' }
const servedPaths = []
const server = createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
  servedPaths.push(urlPath)
  const file = path.normalize(path.join(root, urlPath))
  if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404).end()
    return
  }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream' })
  createReadStream(file).pipe(res)
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const origin = `http://127.0.0.1:${server.address().port}`

// --- boot webR the way components/learn/r.tsx will, adapted for Node ---
// baseUrl is a FILESYSTEM path (not the HTTP origin the browser uses):
// Node's worker_threads.Worker refuses http:// URLs for the worker script,
// so webR-in-Node must load webr-worker.js from disk. These are still the
// exact assets the site serves (public/webr/0.6.0/). repoUrl stays HTTP so
// the package mirror is exercised over its real URL layout.
const { WebR } = await import('webr')
const webR = new WebR({
  baseUrl: path.resolve('public/webr', WEBR_VERSION) + '/',
  repoUrl: `${origin}/webr/repo/`,
})
await webR.init()
await webR.installPackages(['dplyr', 'jsonlite'])
await webR.FS.mkdir('/data')
for (const [name, csv] of Object.entries(PY_CSV)) {
  await webR.FS.writeFile(`/data/${name}.csv`, new TextEncoder().encode(csv))
}
await webR.evalRVoid(R_SETUP_CODE)

// --- every canonical solution must pass its own checker, non-empty ---
let passed = 0
const failures = []
for (const ex of R_EXERCISES) {
  await webR.objs.globalEnv.bind('.webr_user_code', ex.solution)
  await webR.objs.globalEnv.bind('.webr_solution_code', ex.solution)
  const raw = await webR.evalRString(
    `.webr_run_and_check(.webr_user_code, .webr_solution_code, ${ex.ordered ? 'TRUE' : 'FALSE'}, '${ex.resultType}')`
  )
  const payload = JSON.parse(raw)
  const exp = payload.expected
  const nonEmpty = exp != null && (exp.kind === 'scalar' ? exp.value !== null : exp.total > 0)
  if (payload.check?.pass && nonEmpty) {
    passed++
  } else {
    failures.push({
      id: ex.id,
      error: payload.error,
      reason: payload.check?.reason ?? (nonEmpty ? undefined : 'expected result is EMPTY — teaching-shape violation'),
    })
  }
}

console.log(`${passed} / ${R_EXERCISES.length} solutions pass`)
if (failures.length > 0) {
  console.table(failures)
  process.exitCode = 1
}

// Traffic audit: webR's only URL knobs are baseUrl (a local filesystem path
// here) and repoUrl (the local server) — every HTTP request must be a
// package-mirror fetch. Anything else means an off-mirror escape.
const offMirror = servedPaths.filter((p) => !p.startsWith('/webr/repo/'))
if (offMirror.length > 0) {
  console.error(`unexpected non-mirror requests: ${offMirror.join(', ')}`)
  process.exitCode = 1
} else {
  console.log(`traffic audit: ${servedPaths.length} HTTP fetches, all from the local package mirror`)
}

webR.close()
server.close()
await rm(outDir, { recursive: true, force: true })
