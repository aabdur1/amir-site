// lib/learn/sql-check.ts — result-set comparison for the SQL artifact's
// checked exercises. Pure logic, no sql.js import (types are structural
// mirrors of sql.js QueryExecResult).

export type SqlValue = number | string | Uint8Array | null

export interface QueryResult {
  columns: string[]
  values: SqlValue[][]
}

export type CheckResult = { pass: true } | { pass: false; reason: string }

const EPS = 1e-9

function normalize(v: SqlValue): SqlValue {
  if (typeof v === 'string') return v.trim()
  if (v instanceof Uint8Array) return `blob:${Array.from(v).join(',')}`
  return v
}

function cellsEqual(a: SqlValue, b: SqlValue): boolean {
  const na = normalize(a)
  const nb = normalize(b)
  if (na === null || nb === null) return na === nb
  if (typeof na === 'number' && typeof nb === 'number') return Math.abs(na - nb) <= EPS
  return na === nb
}

// Canonical, collision-free sort key: JSON keeps cell boundaries and types
// unambiguous (NULL stays JSON null, never the string 'null'); numbers are
// tagged arrays rendered past EPS so float noise can't reorder rows.
function sortKey(row: SqlValue[]): string {
  return JSON.stringify(
    row.map((v) => {
      const n = normalize(v)
      return typeof n === 'number' ? ['n', n.toFixed(9)] : n
    })
  )
}


function sorted(values: SqlValue[][]): SqlValue[][] {
  return values
    .map((row) => ({ row, key: sortKey(row) }))
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
    .map((e) => e.row)
}

// Aliases must not fail a correct query — columns compare by count and
// position, never by name.
export function compareResults(user: QueryResult | null, expected: QueryResult, ordered: boolean): CheckResult {
  if (!user) return { pass: false, reason: 'query returned no result set' }
  if (user.columns.length !== expected.columns.length) {
    return {
      pass: false,
      reason: `${user.columns.length} column${user.columns.length === 1 ? '' : 's'} vs ${expected.columns.length} expected`,
    }
  }
  if (user.values.length !== expected.values.length) {
    return {
      pass: false,
      reason: `${user.values.length} row${user.values.length === 1 ? '' : 's'} vs ${expected.values.length} expected`,
    }
  }
  const u = ordered ? user.values : sorted(user.values)
  const e = ordered ? expected.values : sorted(expected.values)
  for (let i = 0; i < u.length; i++) {
    for (let j = 0; j < u[i].length; j++) {
      if (!cellsEqual(u[i][j], e[i][j])) {
        return { pass: false, reason: `values differ at row ${i + 1}, column ${j + 1}` }
      }
    }
  }
  return { pass: true }
}
