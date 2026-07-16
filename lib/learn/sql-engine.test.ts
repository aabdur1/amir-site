// lib/learn/sql-engine.test.ts — executes all 19 canonical SQL exercise
// solutions against the REAL sql.js engine in Node and runs each result
// through the checker, mirroring what scripts/verify-r-exercises.mjs does
// for R. Catches any canonical solution that fails to execute, returns an
// empty result set (teaching-shape violation, same rule as verify-r), or
// that compareResults would reject.
//
// The engine/seed plumbing replicates components/learn/sql.tsx (which can't
// be imported here — it's a 'use client' React component): seed DB built
// once from SQL_SEED, its export() buffer cached, and a FRESH
// Database(seedBuffer) per query so destructive statements can't leak.

import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import initSqlJs from 'sql.js'
import type { Database, SqlJsStatic } from 'sql.js'
import { SQL_SEED, SQL_SEED_COUNTS } from '@/lib/learn/sql-seed'
import { SQL_EXERCISES } from '@/lib/learn/sql-exercises'
import { compareResults, type QueryResult } from '@/lib/learn/sql-check'

// Resolve the committed wasm from node_modules (public/sql-wasm.wasm is a
// copy of this exact file; the app serves it at /sql-wasm.wasm).
const require = createRequire(import.meta.url)
const wasmPath = require.resolve('sql.js/dist/sql-wasm.wasm')

let engine: SqlJsStatic
let seedBuffer: Uint8Array

// Mirrors sql.tsx's runQuery(): fresh copy of the seed database per run,
// return the LAST result set, or null when nothing returned rows.
function runQuery(sql: string): QueryResult | null {
  const db: Database = new engine.Database(seedBuffer)
  try {
    const results = db.exec(sql)
    return results.length ? results[results.length - 1] : null
  } finally {
    db.close()
  }
}

beforeAll(async () => {
  // locateFile mirrors sql.tsx; wasmBinary is also supplied because the
  // vitest environment is jsdom — Emscripten detects a "web" environment
  // and would fetch() the wasm (which can't hit the filesystem). Passing
  // the bytes directly sidesteps that while loading the same binary.
  engine = await initSqlJs({
    locateFile: () => wasmPath,
    wasmBinary: readFileSync(wasmPath).buffer as ArrayBuffer,
  })
  // Build the seed exactly the way the app does, cache the exported buffer.
  const db = new engine.Database()
  db.run(SQL_SEED)
  seedBuffer = db.export()
  db.close()
})

describe('seed database', () => {
  it('builds with the generated row counts', () => {
    for (const [table, expected] of Object.entries(SQL_SEED_COUNTS)) {
      const res = runQuery(`SELECT COUNT(*) FROM ${table}`)
      expect(res, `${table} count query returned no result`).not.toBeNull()
      expect(res!.values[0][0], `row count for ${table}`).toBe(expected)
    }
  })
})

describe('canonical solutions execute and pass the checker', () => {
  it('covers all 19 exercises', () => {
    expect(SQL_EXERCISES).toHaveLength(19)
  })

  for (const ex of SQL_EXERCISES) {
    it(`${ex.id} (${ex.section})`, () => {
      // Two independent runs on fresh DB copies — exactly what the app does
      // on Run (user query and canonical solution each get their own DB).
      const user = runQuery(ex.solution)
      const expected = runQuery(ex.solution)

      // The solution must produce a result set with ≥1 column…
      expect(user, 'solution returned no result set').not.toBeNull()
      expect(user!.columns.length, 'solution returned zero columns').toBeGreaterThanOrEqual(1)
      // …and ≥1 row: an empty expected result is a teaching-shape
      // violation, same rule verify-r-exercises.mjs enforces for R.
      expect(user!.values.length, 'solution returned zero rows — teaching-shape violation').toBeGreaterThanOrEqual(1)

      // Self-consistency through the real checker with the exercise's
      // ordered flag — proves the checker plumbing accepts the canonical
      // solution end-to-end (mirrors verify-r's user === solution run).
      const outcome = compareResults(user, expected as QueryResult, ex.ordered)
      expect(outcome, `checker rejected ${ex.id}: ${!outcome.pass ? outcome.reason : ''}`).toEqual({ pass: true })
    })
  }
})
