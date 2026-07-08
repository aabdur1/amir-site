// lib/learn/sql-check.test.ts — unit tests for the SQL result-set comparator.
// Covers the documented contract: positional column-count check (aliases pass),
// positional cell comparison, 1e-9 numeric tolerance, trimmed strings,
// NULL ≡ NULL, canonical row sort unless `ordered: true`, and blob handling.

import { compareResults, type QueryResult, type SqlValue } from '@/lib/learn/sql-check'

function rs(columns: string[], values: SqlValue[][]): QueryResult {
  return { columns, values }
}

describe('compareResults', () => {
  describe('null user result', () => {
    it('fails with a "no result set" reason when user is null', () => {
      const result = compareResults(null, rs(['a'], [[1]]), false)
      expect(result).toEqual({ pass: false, reason: 'query returned no result set' })
    })
  })

  describe('column count (positional, never by name)', () => {
    it('passes when column names differ but count and cells match (aliases/renames)', () => {
      const user = rs(['patient_full_name', 'yrs'], [['Ada Lovelace', 36]])
      const expected = rs(['name', 'age'], [['Ada Lovelace', 36]])
      expect(compareResults(user, expected, false)).toEqual({ pass: true })
    })

    it('fails when user has fewer columns than expected', () => {
      const result = compareResults(rs(['a'], [[1]]), rs(['a', 'b'], [[1, 2]]), false)
      expect(result.pass).toBe(false)
      if (!result.pass) expect(result.reason).toBe('1 column vs 2 expected')
    })

    it('fails when user has more columns than expected', () => {
      const result = compareResults(rs(['a', 'b', 'c'], [[1, 2, 3]]), rs(['a'], [[1]]), false)
      expect(result.pass).toBe(false)
      if (!result.pass) expect(result.reason).toBe('3 columns vs 1 expected')
    })

    it('column-count mismatch fails even when both have zero rows', () => {
      const result = compareResults(rs(['a', 'b'], []), rs(['a'], []), false)
      expect(result.pass).toBe(false)
      if (!result.pass) expect(result.reason).toContain('2 columns vs 1 expected')
    })
  })

  describe('row count', () => {
    it('fails on extra rows', () => {
      const result = compareResults(
        rs(['a'], [[1], [2]]),
        rs(['a'], [[1]]),
        false
      )
      expect(result.pass).toBe(false)
      if (!result.pass) expect(result.reason).toBe('2 rows vs 1 expected')
    })

    it('fails on missing rows (zero rows pluralizes with "s")', () => {
      const result = compareResults(rs(['a'], []), rs(['a'], [[1]]), false)
      expect(result.pass).toBe(false)
      if (!result.pass) expect(result.reason).toBe('0 rows vs 1 expected')
    })

    it('uses singular "row" when the user has exactly one row', () => {
      const result = compareResults(rs(['a'], [[1]]), rs(['a'], [[1], [2]]), false)
      expect(result.pass).toBe(false)
      if (!result.pass) expect(result.reason).toBe('1 row vs 2 expected')
    })
  })

  describe('positional cell comparison', () => {
    it('passes on an exact multi-row, multi-column match', () => {
      const values: SqlValue[][] = [
        [1, 'alpha', 3.5],
        [2, 'beta', null],
      ]
      expect(
        compareResults(rs(['a', 'b', 'c'], values), rs(['x', 'y', 'z'], values), true)
      ).toEqual({ pass: true })
    })

    it('fails when a single cell differs, reporting 1-based row and column', () => {
      const user = rs(['a', 'b'], [[1, 'x'], [2, 'WRONG']])
      const expected = rs(['a', 'b'], [[1, 'x'], [2, 'y']])
      const result = compareResults(user, expected, true)
      expect(result.pass).toBe(false)
      if (!result.pass) expect(result.reason).toBe('values differ at row 2, column 2')
    })

    it('fails when columns are transposed (position matters, not name)', () => {
      // Same data, but the user selected the columns in the wrong order.
      const user = rs(['age', 'name'], [[36, 'Ada']])
      const expected = rs(['name', 'age'], [['Ada', 36]])
      const result = compareResults(user, expected, false)
      expect(result.pass).toBe(false)
      if (!result.pass) expect(result.reason).toBe('values differ at row 1, column 1')
    })
  })

  describe('numeric tolerance (EPS = 1e-9)', () => {
    it('passes when numbers differ by less than 1e-9', () => {
      expect(
        compareResults(rs(['n'], [[1 + 1e-10]]), rs(['n'], [[1]]), true)
      ).toEqual({ pass: true })
    })

    it('passes when numbers differ by exactly 1e-9 (inclusive bound)', () => {
      // 0 vs 1e-9 gives an exact float difference of 1e-9, so <= EPS holds.
      expect(compareResults(rs(['n'], [[1e-9]]), rs(['n'], [[0]]), true)).toEqual({ pass: true })
    })

    it('fails when numbers differ by more than 1e-9', () => {
      const result = compareResults(rs(['n'], [[2e-9]]), rs(['n'], [[0]]), true)
      expect(result.pass).toBe(false)
      if (!result.pass) expect(result.reason).toBe('values differ at row 1, column 1')
    })

    it('absorbs classic float noise (0.1 + 0.2 vs 0.3)', () => {
      expect(
        compareResults(rs(['n'], [[0.1 + 0.2]]), rs(['n'], [[0.3]]), true)
      ).toEqual({ pass: true })
    })

    it('treats -0 and 0 as equal', () => {
      expect(compareResults(rs(['n'], [[-0]]), rs(['n'], [[0]]), true)).toEqual({ pass: true })
    })

    it('does NOT coerce types: number 5 !== string "5"', () => {
      const result = compareResults(rs(['n'], [['5']]), rs(['n'], [[5]]), true)
      expect(result.pass).toBe(false)
      if (!result.pass) expect(result.reason).toBe('values differ at row 1, column 1')
    })
  })

  describe('string comparison (trimmed)', () => {
    it('passes when strings differ only in leading/trailing whitespace', () => {
      expect(
        compareResults(rs(['s'], [['  hello  ']]), rs(['s'], [['hello']]), true)
      ).toEqual({ pass: true })
    })

    it('does not collapse internal whitespace', () => {
      const result = compareResults(rs(['s'], [['a  b']]), rs(['s'], [['a b']]), true)
      expect(result.pass).toBe(false)
    })

    it('is case-sensitive', () => {
      const result = compareResults(rs(['s'], [['Hello']]), rs(['s'], [['hello']]), true)
      expect(result.pass).toBe(false)
    })

    it('a whitespace-only string equals the empty string after trimming', () => {
      expect(compareResults(rs(['s'], [['   ']]), rs(['s'], [['']]), true)).toEqual({ pass: true })
    })
  })

  describe('NULL handling', () => {
    it('NULL ≡ NULL passes', () => {
      expect(
        compareResults(rs(['a', 'b'], [[null, null]]), rs(['a', 'b'], [[null, null]]), true)
      ).toEqual({ pass: true })
    })

    it('NULL vs 0 fails', () => {
      expect(compareResults(rs(['a'], [[null]]), rs(['a'], [[0]]), true).pass).toBe(false)
    })

    it('NULL vs empty string fails', () => {
      expect(compareResults(rs(['a'], [['']]), rs(['a'], [[null]]), true).pass).toBe(false)
    })

    it('NULL vs the string "null" fails (JSON null never collides with "null")', () => {
      expect(compareResults(rs(['a'], [['null']]), rs(['a'], [[null]]), true).pass).toBe(false)
    })
  })

  describe('unordered mode (canonical row sort)', () => {
    it('passes when rows are shuffled', () => {
      const user = rs(['id', 'name'], [
        [3, 'carol'],
        [1, 'alice'],
        [2, 'bob'],
      ])
      const expected = rs(['id', 'name'], [
        [1, 'alice'],
        [2, 'bob'],
        [3, 'carol'],
      ])
      expect(compareResults(user, expected, false)).toEqual({ pass: true })
    })

    it('passes when shuffled rows contain NULLs and mixed types', () => {
      const user = rs(['a', 'b'], [
        [null, 'x'],
        [1, null],
        [2, 'y'],
      ])
      const expected = rs(['a', 'b'], [
        [2, 'y'],
        [null, 'x'],
        [1, null],
      ])
      expect(compareResults(user, expected, false)).toEqual({ pass: true })
    })

    it('is multiset-strict: same rows but wrong duplicate counts fail', () => {
      // user has A twice / B once; expected has A once / B twice
      const user = rs(['a'], [['A'], ['A'], ['B']])
      const expected = rs(['a'], [['A'], ['B'], ['B']])
      const result = compareResults(user, expected, false)
      expect(result.pass).toBe(false)
      if (!result.pass) expect(result.reason).toMatch(/values differ at row \d+, column 1/)
    })

    it('sorts on trimmed strings so padding cannot break row alignment', () => {
      const user = rs(['s'], [['  banana'], ['apple  ']])
      const expected = rs(['s'], [['apple'], ['banana']])
      expect(compareResults(user, expected, false)).toEqual({ pass: true })
    })

    it('keeps NULL and the string "null" in distinct sort buckets', () => {
      const user = rs(['a'], [[null], ['null']])
      const expected = rs(['a'], [['null'], [null]])
      expect(compareResults(user, expected, false)).toEqual({ pass: true })
    })

    it('float noise within tolerance does not misalign the canonical sort', () => {
      // 0.30000000000000004 and 0.3 render identically at 9 decimals,
      // so both land in the same sort position and compare within EPS.
      const user = rs(['n'], [[0.1 + 0.2], [0.1]])
      const expected = rs(['n'], [[0.1], [0.3]])
      expect(compareResults(user, expected, false)).toEqual({ pass: true })
    })

    it('fails when the multiset of rows genuinely differs', () => {
      const user = rs(['id'], [[1], [2], [4]])
      const expected = rs(['id'], [[1], [2], [3]])
      expect(compareResults(user, expected, false).pass).toBe(false)
    })
  })

  describe('ordered mode (ordered: true)', () => {
    it('passes when rows are in the expected order', () => {
      const values: SqlValue[][] = [[3], [1], [2]]
      expect(compareResults(rs(['a'], values), rs(['a'], [[3], [1], [2]]), true)).toEqual({
        pass: true,
      })
    })

    it('fails when the same rows arrive in a different order', () => {
      const user = rs(['a'], [[1], [2], [3]])
      const expected = rs(['a'], [[3], [2], [1]])
      const result = compareResults(user, expected, true)
      expect(result.pass).toBe(false)
      if (!result.pass) expect(result.reason).toBe('values differ at row 1, column 1')
    })

    it('the identical shuffle that fails ordered passes unordered', () => {
      const user = rs(['a'], [[1], [2], [3]])
      const expected = rs(['a'], [[3], [2], [1]])
      expect(compareResults(user, expected, true).pass).toBe(false)
      expect(compareResults(user, expected, false)).toEqual({ pass: true })
    })
  })

  describe('Uint8Array (blob) cells', () => {
    it('equal blobs pass', () => {
      const user = rs(['b'], [[new Uint8Array([1, 2, 3])]])
      const expected = rs(['b'], [[new Uint8Array([1, 2, 3])]])
      expect(compareResults(user, expected, true)).toEqual({ pass: true })
    })

    it('different blobs fail', () => {
      const user = rs(['b'], [[new Uint8Array([1, 2, 3])]])
      const expected = rs(['b'], [[new Uint8Array([1, 2, 4])]])
      expect(compareResults(user, expected, true).pass).toBe(false)
    })

    it('blobs participate in the unordered canonical sort', () => {
      const user = rs(['b'], [[new Uint8Array([9])], [new Uint8Array([1])]])
      const expected = rs(['b'], [[new Uint8Array([1])], [new Uint8Array([9])]])
      expect(compareResults(user, expected, false)).toEqual({ pass: true })
    })

    it('QUIRK (current behavior): a string cell "blob:1,2,3" equals Uint8Array([1,2,3])', () => {
      // normalize() renders blobs as the string `blob:${bytes}`, so a plain
      // string with that exact shape collides with a real blob. Harmless in
      // practice (sql.js never returns such strings from the seed data), but
      // this documents the collision.
      const user = rs(['b'], [['blob:1,2,3']])
      const expected = rs(['b'], [[new Uint8Array([1, 2, 3])]])
      expect(compareResults(user, expected, true)).toEqual({ pass: true })
    })
  })

  describe('empty result sets', () => {
    it('passes when both are empty with matching column counts', () => {
      expect(compareResults(rs(['a', 'b'], []), rs(['x', 'y'], []), false)).toEqual({
        pass: true,
      })
      expect(compareResults(rs(['a'], []), rs(['a'], []), true)).toEqual({ pass: true })
    })

    it('passes when both have zero columns and zero rows', () => {
      expect(compareResults(rs([], []), rs([], []), false)).toEqual({ pass: true })
    })
  })

  describe('ragged rows (edge case documenting current behavior)', () => {
    it('QUIRK: extra expected cells are ignored when a user row is shorter than its column list', () => {
      // The inner loop bounds on u[i].length, so if a user row carries fewer
      // cells than the (matching-length) column list, the trailing expected
      // cells are never compared. sql.js can't actually produce this shape —
      // rows always match columns.length — but the comparator itself would
      // pass it. Suspected latent bug; asserting current behavior per spec.
      const user: QueryResult = { columns: ['a', 'b'], values: [[1]] }
      const expected: QueryResult = { columns: ['a', 'b'], values: [[1, 999]] }
      expect(compareResults(user, expected, true)).toEqual({ pass: true })
    })
  })
})
