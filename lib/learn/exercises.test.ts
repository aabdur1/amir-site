// lib/learn/exercises.test.ts — data-shape tests for the three parallel
// exercise-definition arrays behind the 08/ SQL, 09/ Python, and 10/ R learn
// artifacts. Pure data testing: no sql.js/Pyodide/webR engines are run.
//
// Verified against the actual data (not just the docs):
// - Each array has exactly 19 entries.
// - Python AND R prompts all end with "Assign your answer to result."
//   (period included — the python-exercises.ts doc comment quotes the phrase
//   with the period inside the sentence; the data agrees for both languages).
// - SQL prompts never carry that phrase (no `result` variable in SQL).
// - The SQL ↔ Python/R mirror is NOT strictly positional: SQL has a DISTINCT
//   exercise ('select-distinct') with no Python/R counterpart, and Python/R
//   have a cumulative-sum window exercise with no SQL counterpart. Python ↔ R
//   ARE strictly positional (same section boundaries, tables, ordered flags,
//   scalar positions). Tests below assert the structure that actually holds.

import { SQL_EXERCISES } from '@/lib/learn/sql-exercises'
import { PY_EXERCISES } from '@/lib/learn/python-exercises'
import { R_EXERCISES } from '@/lib/learn/r-exercises'

const EXPECTED_COUNT = 19
const KNOWN_TABLES = ['patients', 'encounters', 'labs', 'medications']

/** Loosely-typed view shared by all three exercise shapes. */
interface AnyExercise {
  id: string
  section: string
  prompt: string
  hint: string
  solution: string
  ordered: boolean
  tables: string[]
  resultType?: string
}

interface LanguageSpec {
  name: string
  exercises: readonly AnyExercise[]
  /** Canonical section ids in reading order. */
  sectionOrder: string[]
  /** Entries per section, in sectionOrder order (counted from the data). */
  sectionCounts: number[]
  /** Required id prefix, if the language uses one. */
  idPrefix: string | null
  /** Allowed resultType union values, if the shape has resultType. */
  resultTypes: string[] | null
  /** Exact required prompt ending, if the language has that contract. */
  promptEnding: string | null
  /** Regex every solution must match (the "produce a result" contract). */
  solutionPattern: RegExp
}

const SQL_SPEC: LanguageSpec = {
  name: 'SQL (SQL_EXERCISES)',
  exercises: SQL_EXERCISES,
  sectionOrder: ['sql-select', 'sql-aggregate', 'sql-joins', 'sql-windows', 'sql-challenge'],
  sectionCounts: [4, 5, 5, 3, 2],
  idPrefix: null,
  resultTypes: null,
  promptEnding: null,
  // Every SQL solution is a plain query: SELECT ... or WITH ... cte.
  solutionPattern: /^(SELECT|WITH)\b/i,
}

const PY_SPEC: LanguageSpec = {
  name: 'Python (PY_EXERCISES)',
  exercises: PY_EXERCISES,
  sectionOrder: ['py-filter', 'py-groupby', 'py-merge', 'py-window', 'py-challenge'],
  sectionCounts: [3, 5, 5, 4, 2],
  idPrefix: 'py-',
  resultTypes: ['dataframe', 'series', 'scalar'],
  promptEnding: 'Assign your answer to result.',
  // The checker compares the `result` variable, so every solution must assign it.
  solutionPattern: /(^|\n)result\s*(\[[^\]]*\]\s*)?=/,
}

const R_SPEC: LanguageSpec = {
  name: 'R (R_EXERCISES)',
  exercises: R_EXERCISES,
  sectionOrder: ['r-filter', 'r-group', 'r-join', 'r-window', 'r-challenge'],
  sectionCounts: [3, 5, 5, 4, 2],
  idPrefix: 'r-',
  resultTypes: ['dataframe', 'vector', 'scalar'],
  promptEnding: 'Assign your answer to result.',
  solutionPattern: /(^|\n)result\s*<-/,
}

const SPECS = [SQL_SPEC, PY_SPEC, R_SPEC]

for (const spec of SPECS) {
  describe(spec.name, () => {
    it(`has exactly ${EXPECTED_COUNT} exercises`, () => {
      expect(spec.exercises).toHaveLength(EXPECTED_COUNT)
    })

    it('every exercise has a non-empty prompt, hint, and solution', () => {
      for (const ex of spec.exercises) {
        expect(ex.prompt, `${ex.id} prompt`).toBeTypeOf('string')
        expect(ex.prompt.trim(), `${ex.id} prompt`).not.toBe('')
        expect(ex.hint, `${ex.id} hint`).toBeTypeOf('string')
        expect(ex.hint.trim(), `${ex.id} hint`).not.toBe('')
        expect(ex.solution, `${ex.id} solution`).toBeTypeOf('string')
        expect(ex.solution.trim(), `${ex.id} solution`).not.toBe('')
      }
    })

    it('every exercise has a non-empty string id', () => {
      for (const ex of spec.exercises) {
        expect(ex.id).toBeTypeOf('string')
        expect(ex.id.trim()).not.toBe('')
      }
    })

    it('ids are unique within the array', () => {
      const ids = spec.exercises.map((ex) => ex.id)
      expect(new Set(ids).size).toBe(ids.length)
    })

    if (spec.idPrefix !== null) {
      it(`every id starts with "${spec.idPrefix}"`, () => {
        for (const ex of spec.exercises) {
          expect(ex.id, `${ex.id}`).toMatch(new RegExp(`^${spec.idPrefix}`))
        }
      })
    }

    it('ordered is a boolean on every exercise', () => {
      for (const ex of spec.exercises) {
        expect(ex.ordered, `${ex.id} ordered`).toBeTypeOf('boolean')
      }
    })

    it('tables is a non-empty array of known table names with no duplicates', () => {
      for (const ex of spec.exercises) {
        expect(Array.isArray(ex.tables), `${ex.id} tables is array`).toBe(true)
        expect(ex.tables.length, `${ex.id} tables non-empty`).toBeGreaterThan(0)
        for (const t of ex.tables) {
          expect(t, `${ex.id} table name type`).toBeTypeOf('string')
          expect(KNOWN_TABLES, `${ex.id} references unknown table "${t}"`).toContain(t)
        }
        expect(new Set(ex.tables).size, `${ex.id} duplicate table names`).toBe(ex.tables.length)
      }
    })

    if (spec.resultTypes !== null) {
      const allowed = spec.resultTypes
      it(`resultType is one of ${allowed.join(' | ')} on every exercise`, () => {
        for (const ex of spec.exercises) {
          expect(allowed, `${ex.id} resultType "${ex.resultType}"`).toContain(ex.resultType)
        }
      })
    } else {
      it('exercises do not carry a resultType field', () => {
        for (const ex of spec.exercises) {
          expect(ex.resultType, `${ex.id} unexpectedly has resultType`).toBeUndefined()
        }
      })
    }

    if (spec.promptEnding !== null) {
      const ending = spec.promptEnding
      it(`every prompt ends with "${ending}"`, () => {
        for (const ex of spec.exercises) {
          expect(ex.prompt.endsWith(ending), `${ex.id} prompt ends: …${ex.prompt.slice(-40)}`).toBe(
            true,
          )
        }
      })
    } else {
      it('no prompt carries the "Assign your answer to result" contract (SQL has no result variable)', () => {
        for (const ex of spec.exercises) {
          expect(ex.prompt, `${ex.id}`).not.toContain('Assign your answer to result')
        }
      })
    }

    it('every solution produces the checked result (matches the language contract pattern)', () => {
      for (const ex of spec.exercises) {
        expect(ex.solution, `${ex.id} solution`).toMatch(spec.solutionPattern)
      }
    })

    it('section ids are valid, contiguous, and in canonical order with the expected counts', () => {
      // Every section value belongs to the declared union.
      for (const ex of spec.exercises) {
        expect(spec.sectionOrder, `${ex.id} section "${ex.section}"`).toContain(ex.section)
      }
      // Sections appear as contiguous blocks in canonical order (the artifacts
      // derive numbering and section attachment from array order).
      const seen: string[] = []
      for (const ex of spec.exercises) {
        if (seen[seen.length - 1] !== ex.section) seen.push(ex.section)
      }
      expect(seen).toEqual(spec.sectionOrder)
      // Per-section counts match the data as it stands today.
      const counts = spec.sectionOrder.map(
        (s) => spec.exercises.filter((ex) => ex.section === s).length,
      )
      expect(counts).toEqual(spec.sectionCounts)
    })
  })
}

describe('cross-language mirroring', () => {
  it('all three arrays have the same length (19)', () => {
    expect(SQL_EXERCISES.length).toBe(EXPECTED_COUNT)
    expect(PY_EXERCISES.length).toBe(EXPECTED_COUNT)
    expect(R_EXERCISES.length).toBe(EXPECTED_COUNT)
  })

  it('ids are unique across all three arrays combined', () => {
    const ids = [...SQL_EXERCISES, ...PY_EXERCISES, ...R_EXERCISES].map((ex) => ex.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('all three drill the same four tables (same table-name universe)', () => {
    const universe = (exs: readonly AnyExercise[]) =>
      [...new Set(exs.flatMap((ex) => ex.tables))].sort()
    const sql = universe(SQL_EXERCISES)
    expect(universe(PY_EXERCISES)).toEqual(sql)
    expect(universe(R_EXERCISES)).toEqual(sql)
    expect(sql).toEqual([...KNOWN_TABLES].sort())
  })

  describe('Python ↔ R are strictly positional (one-for-one)', () => {
    it('entry i uses the same tables, ordered flag, and section ordinal in both languages', () => {
      for (let i = 0; i < EXPECTED_COUNT; i++) {
        const py = PY_EXERCISES[i]
        const r = R_EXERCISES[i]
        expect(r.tables, `index ${i}: ${py.id} vs ${r.id} tables`).toEqual(py.tables)
        expect(r.ordered, `index ${i}: ${py.id} vs ${r.id} ordered`).toBe(py.ordered)
        const pyOrdinal = PY_SPEC.sectionOrder.indexOf(py.section)
        const rOrdinal = R_SPEC.sectionOrder.indexOf(r.section)
        expect(rOrdinal, `index ${i}: ${py.id} (${py.section}) vs ${r.id} (${r.section})`).toBe(
          pyOrdinal,
        )
      }
    })

    it('scalar results sit at the same position: the "active medication" count (index 12)', () => {
      const pyScalars = PY_EXERCISES.filter((ex) => ex.resultType === 'scalar').map((ex) => ex.id)
      const rScalars = R_EXERCISES.filter((ex) => ex.resultType === 'scalar').map((ex) => ex.id)
      expect(pyScalars).toEqual(['py-merge-active'])
      expect(rScalars).toEqual(['r-join-active'])
      expect(PY_EXERCISES[12].id).toBe('py-merge-active')
      expect(R_EXERCISES[12].id).toBe('r-join-active')
    })

    it('the declared "series" (Python) and "vector" (R) resultType variants are currently unused', () => {
      // Locks in current behavior: every non-scalar exercise is a dataframe.
      expect(PY_EXERCISES.some((ex) => ex.resultType === 'series')).toBe(false)
      expect(R_EXERCISES.some((ex) => ex.resultType === 'vector')).toBe(false)
    })
  })

  describe('SQL ↔ Python/R mirror by topic, not strictly by position', () => {
    // SQL's 'select-distinct' has no Python/R counterpart; Python/R's
    // cumulative-sum window exercise has no SQL counterpart. The section
    // shapes lock that documented divergence in: SQL 4/5/5/3/2 vs 3/5/5/4/2.
    it('section shapes differ exactly by the DISTINCT ↔ cumsum swap', () => {
      const shape = (exs: readonly AnyExercise[], order: string[]) =>
        order.map((s) => exs.filter((ex) => ex.section === s).length)
      expect(shape(SQL_EXERCISES, SQL_SPEC.sectionOrder)).toEqual([4, 5, 5, 3, 2])
      expect(shape(PY_EXERCISES, PY_SPEC.sectionOrder)).toEqual([3, 5, 5, 4, 2])
      expect(shape(R_EXERCISES, R_SPEC.sectionOrder)).toEqual([3, 5, 5, 4, 2])
      expect(SQL_EXERCISES.some((ex) => ex.id === 'select-distinct')).toBe(true)
      expect(PY_EXERCISES.some((ex) => ex.id === 'py-window-cumsum')).toBe(true)
      expect(R_EXERCISES.some((ex) => ex.id === 'r-window-cumsum')).toBe(true)
    })

    it('the ordered (ORDER-BY-pinned) exercises are the same three topics in every language', () => {
      const topic = (id: string) => id.replace(/^(py|r)-/, '').replace(/^[a-z]+-/, '')
      const orderedTopics = (exs: readonly AnyExercise[]) =>
        exs.filter((ex) => ex.ordered).map((ex) => topic(ex.id)).sort()
      const sql = orderedTopics(SQL_EXERCISES)
      expect(sql).toEqual(['city', 'count-dept', 'share'])
      expect(orderedTopics(PY_EXERCISES)).toEqual(sql)
      expect(orderedTopics(R_EXERCISES)).toEqual(sql)
    })

    it('the anchor exercises line up across all three: first (city) and the two challenges', () => {
      // Index 0 — Chicago filter, ordered, patients only.
      for (const exs of [SQL_EXERCISES, PY_EXERCISES, R_EXERCISES] as const) {
        expect(exs[0].tables).toEqual(['patients'])
        expect(exs[0].ordered).toBe(true)
      }
      // Last two — the HbA1c follow-up and medication-burden challenges.
      for (const exs of [SQL_EXERCISES, PY_EXERCISES, R_EXERCISES] as const) {
        expect(exs[17].id).toMatch(/challenge-hba1c$/)
        expect(exs[17].tables).toEqual(['patients', 'encounters', 'labs'])
        expect(exs[18].id).toMatch(/challenge-burden$/)
        expect(exs[18].tables).toEqual(['patients', 'encounters', 'medications'])
      }
    })
  })
})
