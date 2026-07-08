#!/usr/bin/env node
// scripts/fetch-webr.mjs — populates public/webr/ (gitignored) with the
// pinned webR runtime and a first-party mirror of the dplyr/jsonlite wasm
// binaries, so the 10/ R artifact never touches a third-party origin at
// runtime. Idempotent: when scripts/webr-assets.lock.json exists and every
// listed file matches its sha256, the script exits without downloading.
// Runs as `prebuild`; run `node scripts/fetch-webr.mjs --update` after
// bumping WEBR_VERSION or the mirrored packages to re-record the lock.

import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { gzipSync } from 'node:zlib'

const WEBR_VERSION = '0.6.0'
const TARBALL_URL = `https://github.com/r-wasm/webr/releases/download/v${WEBR_VERSION}/webr-${WEBR_VERSION}.tar.gz`
const REPO_BASE = 'https://repo.r-wasm.org/bin/emscripten/contrib/4.6'
const MIRROR_ROOTS = ['dplyr', 'jsonlite']

const PUBLIC_WEBR = path.resolve('public/webr')
const OUT_RUNTIME = path.join(PUBLIC_WEBR, WEBR_VERSION)
const OUT_REPO = path.join(PUBLIC_WEBR, 'repo/bin/emscripten/contrib/4.6')
const LOCK_PATH = path.resolve('scripts/webr-assets.lock.json')
const UPDATE = process.argv.includes('--update')

// PACKAGES.gz is generated locally by gzipping PACKAGES, and gzip output is
// not byte-stable across zlib versions/platforms — so it is exempt from the
// sha256 lock (its source of truth, the plain PACKAGES file, IS locked).
// verifyLock still requires it to exist.
const LOCK_EXEMPT = /(^|\/)PACKAGES\.gz$/

// Packages that ship inside the webR runtime itself — excluded from the mirror.
const BASE_PACKAGES = new Set([
  'R', 'base', 'compiler', 'datasets', 'grDevices', 'graphics', 'grid',
  'methods', 'parallel', 'splines', 'stats', 'stats4', 'tcltk', 'tools',
  'translations', 'utils',
])

async function sha256(file) {
  return createHash('sha256').update(await readFile(file)).digest('hex')
}

async function download(url, dest) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`)
  await mkdir(path.dirname(dest), { recursive: true })
  await writeFile(dest, Buffer.from(await res.arrayBuffer()))
}

async function listFiles(dir) {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true })
  return entries
    .filter((e) => e.isFile())
    .map((e) => path.join(e.parentPath ?? e.path, e.name))
}

async function verifyLock() {
  if (!existsSync(LOCK_PATH)) return false
  const lock = JSON.parse(await readFile(LOCK_PATH, 'utf8'))
  if (lock.webrVersion !== WEBR_VERSION) return false
  for (const [rel, expected] of Object.entries(lock.files)) {
    const file = path.join(PUBLIC_WEBR, rel)
    if (!existsSync(file) || (await sha256(file)) !== expected) return false
  }
  // PACKAGES.gz is lock-exempt (see LOCK_EXEMPT) but still must exist — a
  // partially-deleted dir should still trigger repopulation.
  if (!existsSync(path.join(OUT_REPO, 'PACKAGES.gz'))) return false
  console.log(`webr assets verified against lock (${Object.keys(lock.files).length} files) — nothing to do`)
  return true
}

// PACKAGES is a DCF file: blank-line-separated stanzas of "Key: value" with
// space-indented continuation lines.
function parsePackagesIndex(text) {
  const index = new Map()
  for (const stanza of text.split(/\n(?=Package:)/)) {
    const fields = {}
    let key = null
    for (const line of stanza.split('\n')) {
      const m = line.match(/^([A-Za-z][A-Za-z0-9._]*):\s*(.*)$/)
      if (m) {
        key = m[1]
        fields[key] = m[2]
      } else if (key && /^\s/.test(line)) {
        fields[key] += ' ' + line.trim()
      }
    }
    if (fields.Package) index.set(fields.Package, { fields, raw: stanza.trim() })
  }
  return index
}

function depsOf(fields) {
  return [fields.Depends, fields.Imports, fields.LinkingTo]
    .filter(Boolean)
    .join(', ')
    .split(',')
    .map((s) => s.trim().replace(/\s*\(.*\)$/, ''))
    .filter((s) => s.length > 0)
}

function resolveClosure(index, roots) {
  const seen = new Set()
  const queue = [...roots]
  while (queue.length > 0) {
    const name = queue.shift()
    if (seen.has(name) || BASE_PACKAGES.has(name)) continue
    const entry = index.get(name)
    if (!entry) throw new Error(`package "${name}" not found in the PACKAGES index`)
    seen.add(name)
    queue.push(...depsOf(entry.fields))
  }
  return [...seen].sort()
}

async function populate() {
  await rm(PUBLIC_WEBR, { recursive: true, force: true })

  // 1. webR runtime from the pinned GitHub release tarball (the browser-ready
  //    bundle — the npm dist/ webr.mjs is bundler-only and is used solely as
  //    the loader import in components/learn/r.tsx).
  console.log(`downloading webR ${WEBR_VERSION} release tarball…`)
  const work = await mkdtemp(path.join(tmpdir(), 'fetch-webr-'))
  const tarPath = path.join(work, 'webr.tar.gz')
  await download(TARBALL_URL, tarPath)
  const extractDir = path.join(work, 'extract')
  await mkdir(extractDir, { recursive: true })
  execFileSync('tar', ['-xzf', tarPath, '-C', extractDir])
  // Locate the dist directory (the one containing webr-worker.js) wherever
  // the tarball nests it, then copy everything except sourcemaps.
  const files = await listFiles(extractDir)
  const workerFile = files.find((f) => path.basename(f) === 'webr-worker.js')
  if (!workerFile) throw new Error('webr-worker.js not found in the release tarball')
  const distDir = path.dirname(workerFile)
  // The REPL demo app (index.html, repl.*, assets/, and the bundler-only
  // webr.mjs loader) must never be served from our domain — only the
  // worker-essential runtime files, mirroring the .map exclusion below.
  const EXCLUDED_RUNTIME_NAMES = new Set(['index.html', 'repl.html', 'repl.js', 'repl.css', 'webr.mjs'])
  await cp(distDir, OUT_RUNTIME, {
    recursive: true,
    filter: (src) => {
      if (src.endsWith('.map')) return false
      const rel = path.relative(distDir, src)
      if (rel === 'assets' || rel.startsWith(`assets${path.sep}`)) return false
      if (EXCLUDED_RUNTIME_NAMES.has(rel)) return false
      return true
    },
  })
  console.log(`runtime -> public/webr/${WEBR_VERSION}/`)

  // 2. First-party mirror of the package binaries (CRAN layout, filtered
  //    PACKAGES index so an off-mirror install fails loudly).
  console.log('mirroring package binaries from repo.r-wasm.org…')
  const packagesRes = await fetch(`${REPO_BASE}/PACKAGES`)
  if (!packagesRes.ok) throw new Error(`GET ${REPO_BASE}/PACKAGES -> ${packagesRes.status}`)
  const index = parsePackagesIndex(await packagesRes.text())
  const closure = resolveClosure(index, MIRROR_ROOTS)
  await mkdir(OUT_REPO, { recursive: true })
  const stanzas = []
  for (const name of closure) {
    const { fields, raw } = index.get(name)
    const tgz = `${name}_${fields.Version}.tgz`
    await download(`${REPO_BASE}/${tgz}`, path.join(OUT_REPO, tgz))
    stanzas.push(raw)
    console.log(`  ${tgz}`)
  }
  const packagesContent = stanzas.join('\n\n') + '\n'
  await writeFile(path.join(OUT_REPO, 'PACKAGES'), packagesContent)
  // webR probes for PACKAGES.gz alongside PACKAGES — write it too so the
  // index lookup doesn't 404 on every engine load.
  await writeFile(path.join(OUT_REPO, 'PACKAGES.gz'), gzipSync(packagesContent))
  console.log(`mirrored ${closure.length} packages: ${closure.join(', ')}`)

  await rm(work, { recursive: true, force: true })
}

async function recordOrCheckLock() {
  const files = {}
  for (const file of (await listFiles(PUBLIC_WEBR)).sort()) {
    const rel = path.relative(PUBLIC_WEBR, file)
    if (LOCK_EXEMPT.test(rel)) continue
    files[rel] = await sha256(file)
  }
  if (existsSync(LOCK_PATH) && !UPDATE) {
    const lock = JSON.parse(await readFile(LOCK_PATH, 'utf8'))
    const mismatches = Object.entries(lock.files).filter(([rel, sum]) => files[rel] !== sum)
    const extra = Object.keys(files).filter((rel) => !(rel in lock.files))
    if (mismatches.length > 0 || extra.length > 0) {
      console.error('LOCK MISMATCH — downloaded assets differ from scripts/webr-assets.lock.json')
      for (const [rel] of mismatches) console.error(`  changed/missing: ${rel}`)
      for (const rel of extra) console.error(`  unexpected: ${rel}`)
      console.error('If this change is intentional, re-run with --update and commit the new lock.')
      process.exit(1)
    }
    console.log('downloaded assets match the committed lock')
    return
  }
  await writeFile(LOCK_PATH, JSON.stringify({ webrVersion: WEBR_VERSION, files }, null, 2) + '\n')
  console.log(`lock recorded (${Object.keys(files).length} files) — commit scripts/webr-assets.lock.json`)
}

if (UPDATE || !(await verifyLock())) {
  await populate()
  await recordOrCheckLock()
}
