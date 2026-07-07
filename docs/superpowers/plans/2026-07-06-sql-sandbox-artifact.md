# "08/ SQL" Runnable SQL Sandbox Artifact — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an eighth learn artifact at `/learn/sql` — 11 checked SQL exercises across 4 sections, running real SQLite (sql.js → WASM) against a committed synthetic healthcare dataset, fully inside the existing artifact pipeline (rail, tab bar, OG card, sitemap, JSON-LD).

**Architecture:** A one-off generator script emits a deterministic seed dataset (`lib/learn/sql-seed.ts`) and self-verifies its teaching shapes against a real SQLite before writing. A pure comparator (`lib/learn/sql-check.ts`) implements the spec's result-equality semantics. The client component `components/learn/sql.tsx` lazily initializes sql.js (wasm served from `/sql-wasm.wasm`), caches the seeded DB as an exported buffer, and creates a **fresh Database per run** so destructive statements never leak. Exercise definitions live in `lib/learn/sql-exercises.ts`.

**Tech Stack:** Next.js 16 (App Router, Turbopack), TypeScript, Tailwind 4, `sql.js` ^1.14.1 (+ `@types/sql.js` dev). No other new dependencies.

**Spec:** `docs/superpowers/specs/2026-07-06-sql-sandbox-artifact-design.md` — decisions there are settled; do not relitigate.

## Global Constraints

- **Branch:** commit to `feature/design` in logical chunks. NEVER merge or push to `main`, never deploy.
- **Never commit `lib/work/`** (untracked scratch for a separate task) or the modified `public/theli/home.png` (unrelated in-flight change) — stage files explicitly, never `git add -A`/`git add .`.
- **No R content anywhere.**
- **Scope cap:** exactly 4 sections, 11 exercises. No scratchpad, no localStorage progress, no Web Worker isolation, no schema *diagram* (a plain-text column legend is fine), no query-plan viz, no difficulty tracks.
- **No component/editor libraries:** the editor is a hand-rolled `<textarea>`. No CodeMirror/Monaco, no icon libs.
- **Only new packages:** `sql.js` (dependency), `@types/sql.js` (devDependency).
- **Keyboard:** Ctrl/Cmd+Enter runs; Tab must move focus (never hijack Tab for indentation); visible "⌘↩ to run" annotation.
- **WCAG AA:** readable text ≥ 12px in `text-ink-subtle dark:text-night-muted` (or stronger); `text-ink-faint` only for decoration; both themes via existing tokens only.
- **320px safe:** result tables scroll inside their own `overflow-x-auto` container; no page-level horizontal overflow.
- **Rail labels ≤ 13 chars** (SELECT, Aggregation, Joins, Windows all comply).
- **Dev server on port 3100:** `npm run dev -- -p 3100`. If lock error: `pkill -f "next dev" && rm -rf .next/dev/lock`.
- **Lint baseline:** exactly 2 pre-existing errors (`interactive-headshot.tsx`, `masonry-grid.tsx`). Anything else is a regression you introduced.
- **Scratchpad** for throwaway test scripts: `/private/tmp/claude-501/-Users-amirabdurrahim-repos-amir-site/77454d9d-ac1e-4372-b5fe-0e9e804c76bc/scratchpad` (already has `sql.js@1.14.1` installed in its own `node_modules`). Run TS test scripts with `npx --yes tsx <file>`. Nothing in the scratchpad is ever committed.
- **Measured engine size:** wasm is 659,730 bytes; the sql.js JS loader ~45 KB. Loading copy says "~0.7 MB" (the spec's "~1.2 MB" was a pre-measurement estimate; the spec's own rule is audit every claim).

---

### Task 1: sql.js dependency + committed wasm binary

**Files:**
- Modify: `package.json`, `package-lock.json` (via npm)
- Create: `public/sql-wasm.wasm` (copied from node_modules, committed)

**Interfaces:**
- Produces: `import initSqlJs from 'sql.js'` resolvable with types; `/sql-wasm.wasm` served statically. sql.js 1.14.1's exports map has a `browser` condition → `dist/sql-wasm-browser.js` (zero Node `require()` calls — safe for client bundling). The node and browser `.wasm` binaries are byte-identical (verified md5 `6b0f91e4b8647e6d2372463f596e928e`), so one copy serves both.

- [ ] **Step 1: Install packages**

```bash
cd /Users/amirabdurrahim/repos/amir-site
npm install sql.js@^1.14.1
npm install -D @types/sql.js
```

Expected: both succeed; `package.json` gains `"sql.js": "^1.14.1"` under dependencies and `"@types/sql.js"` under devDependencies.

- [ ] **Step 2: Copy the wasm binary to public/**

```bash
cp node_modules/sql.js/dist/sql-wasm.wasm public/sql-wasm.wasm
md5 public/sql-wasm.wasm
```

Expected: md5 = `6b0f91e4b8647e6d2372463f596e928e`, size 659730 bytes.

- [ ] **Step 3: Verify the build still passes**

```bash
npm run build
```

Expected: build succeeds (nothing imports sql.js yet — this catches lockfile/install breakage only).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json public/sql-wasm.wasm
git commit -m "feat: add sql.js engine dependency and committed wasm binary"
```

---

### Task 2: Deterministic seed generator + `lib/learn/sql-seed.ts`

**Files:**
- Create: `scripts/generate-sql-seed.mjs` (committed — matches the repo's `scripts/*.mjs` utility pattern; makes the ~1000 generated INSERT rows reviewable and regenerable)
- Create: `lib/learn/sql-seed.ts` (generated output, committed)

**Interfaces:**
- Produces: `export const SQL_SEED: string` (DDL + INSERTs, template-literal safe) and `export const SQL_SEED_COUNTS: { patients: 50, encounters: number, labs: number, medications: 120 }` from `lib/learn/sql-seed.ts`.
- Teaching shapes guaranteed by in-script assertions (the generator loads the SQL into a real sql.js database and queries it before writing the file): 5 zero-encounter patients; ≥3 patients with >3 encounters; 6 depts with tie-free encounter counts; avg length-of-stay split cleanly around 3 days; unique patient names; tie-free `(patient_id, admit_date)`; ≥5 patients with a 3+-result HbA1c series with tie-free per-patient `taken_at`.

- [ ] **Step 1: Write the generator**

Create `scripts/generate-sql-seed.mjs` with exactly this content:

```js
// scripts/generate-sql-seed.mjs
// One-off generator for lib/learn/sql-seed.ts — the deterministic synthetic
// healthcare dataset behind the 08/ SQL learn artifact. The output is
// committed; re-run only to change the dataset. If an assertion below trips
// after an edit, bump SEED until the shapes hold again.
//
//   node scripts/generate-sql-seed.mjs
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import initSqlJs from 'sql.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '..', 'lib', 'learn', 'sql-seed.ts')

// --- deterministic PRNG (LCG) ---
const SEED = 42
let s = SEED
const rand = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0), s / 4294967296)
const randInt = (min, max) => min + Math.floor(rand() * (max - min + 1))
const pick = (arr) => arr[randInt(0, arr.length - 1)]

// --- date helpers (all UTC, ISO strings) ---
const pad2 = (n) => String(n).padStart(2, '0')
const DAY = 86400000
const iso = (ms) => {
  const d = new Date(ms)
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`
}
const dayMs = (isoStr) => Date.parse(isoStr + 'T00:00:00Z')
const randDay = (fromIso, toIso) =>
  iso(dayMs(fromIso) + randInt(0, Math.round((dayMs(toIso) - dayMs(fromIso)) / DAY)) * DAY)

// --- vocabulary ---
const FIRST = ['Amara','Bilal','Carmen','Dmitri','Elena','Farid','Grace','Hana','Idris','Jun','Khadija','Liam','Maya','Nadia','Omar','Priya','Quinn','Rosa','Samir','Tessa','Umar','Vera','Wes','Yusuf','Zora']
const LAST = ['Adeyemi','Brooks','Castillo','Duarte','Ellison','Fontaine','Guzman','Haddad','Ibrahim','Jensen','Kowalski','Lindqvist','Moreau','Nakamura','Okafor','Petrov','Quraishi','Reyes','Sato','Tran','Ueda','Vance','Whitfield','Yilmaz','Zhang']
const CITIES = ['Chicago','Chicago','Chicago','Evanston','Oak Park','Naperville','Skokie','Cicero'] // Chicago-weighted
const DEPTS = ['Emergency','Cardiology','Endocrinology','Oncology','Orthopedics','Family Medicine']
// Per-dept length-of-stay ranges (days) — engineered so exercise 5's
// HAVING avg > 3 actually splits the departments
const LOS = { Emergency: [0, 2], 'Family Medicine': [0, 3], Endocrinology: [1, 4], Orthopedics: [1, 7], Cardiology: [2, 9], Oncology: [3, 14] }
const DRUGS = ['Metformin','Lisinopril','Atorvastatin','Levothyroxine','Amlodipine','Omeprazole','Sertraline','Albuterol']
const TESTS = [
  { name: 'HbA1c', unit: '%', gen: () => (4.8 + rand() * 6.4).toFixed(1) },
  { name: 'LDL', unit: 'mg/dL', gen: () => String(randInt(60, 190)) },
  { name: 'Glucose', unit: 'mg/dL', gen: () => String(randInt(70, 240)) },
  { name: 'Creatinine', unit: 'mg/dL', gen: () => (0.5 + rand() * 1.9).toFixed(2) },
  { name: 'Hemoglobin', unit: 'g/dL', gen: () => (9 + rand() * 8).toFixed(1) },
]

// --- patients (50) ---
const patients = []
const usedNames = new Set()
while (patients.length < 50) {
  const name = `${pick(FIRST)} ${pick(LAST)}`
  if (usedNames.has(name)) continue
  usedNames.add(name)
  patients.push({
    id: patients.length + 1,
    name,
    sex: rand() < 0.5 ? 'F' : 'M',
    birth: randDay('1940-01-01', '2005-12-31'),
    city: pick(CITIES),
  })
}

// --- encounters (~200) ---
// Teaching shapes: ids 46-50 have ZERO encounters (LEFT JOIN exercise);
// ids 7/19/33 are heavy utilizers (fan-out); ids 3/11/24/40 also exceed
// the "more than 3 encounters" threshold.
const ZERO_IDS = new Set([46, 47, 48, 49, 50])
const EXTRA = { 3: [4, 6], 7: [8, 10], 11: [4, 6], 19: [8, 10], 24: [4, 6], 33: [8, 10], 40: [4, 6] }
const encounters = []
for (const p of patients) {
  if (ZERO_IDS.has(p.id)) continue
  const count = EXTRA[p.id] ? randInt(EXTRA[p.id][0], EXTRA[p.id][1]) : randInt(2, 5)
  const usedAdmits = new Set()
  for (let i = 0; i < count; i++) {
    let admit
    do { admit = randDay('2024-01-01', '2026-05-31') } while (usedAdmits.has(admit))
    usedAdmits.add(admit)
    const dept = pick(DEPTS)
    const [lo, hi] = LOS[dept]
    encounters.push({
      id: encounters.length + 1,
      patientId: p.id,
      dept,
      admit,
      discharge: iso(dayMs(admit) + randInt(lo, hi) * DAY),
    })
  }
}

// --- labs (~600) ---
// The EXTRA patients double as HbA1c-series patients: their first lab per
// encounter is always an HbA1c, giving each a multi-result series over time
// (latest-per-group exercise). Tie-free taken_at per patient keeps
// exercise 11's ROW_NUMBER deterministic.
const HBA1C_IDS = new Set([3, 7, 11, 19, 24, 33, 40])
const labs = []
const usedHba1cAt = new Set()
for (const e of encounters) {
  const n = randInt(2, 4)
  for (let i = 0; i < n; i++) {
    const test = i === 0 && HBA1C_IDS.has(e.patientId) ? TESTS[0] : pick(TESTS)
    let takenAt
    do {
      takenAt = `${e.admit} ${pad2(randInt(6, 20))}:${pad2(randInt(0, 59))}`
    } while (test.name === 'HbA1c' && usedHba1cAt.has(`${e.patientId}|${takenAt}`))
    if (test.name === 'HbA1c') usedHba1cAt.add(`${e.patientId}|${takenAt}`)
    labs.push({ id: labs.length + 1, encounterId: e.id, test: test.name, value: Number(test.gen()), unit: test.unit, takenAt })
  }
}

// --- medications (120) ---
const medications = []
for (let i = 1; i <= 120; i++) {
  const start = randDay('2024-01-01', '2026-05-31')
  medications.push({
    id: i,
    patientId: randInt(1, 50),
    drug: pick(DRUGS),
    start,
    end: rand() < 0.2 ? null : iso(dayMs(start) + randInt(30, 365) * DAY), // NULL = ongoing
  })
}

// --- render SQL ---
const q = (v) => (v === null ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
const insert = (table, cols, rows) => {
  const out = []
  for (let i = 0; i < rows.length; i += 10) {
    const chunk = rows.slice(i, i + 10).map((r) => `  (${r.map(q).join(', ')})`).join(',\n')
    out.push(`INSERT INTO ${table} (${cols.join(', ')}) VALUES\n${chunk};`)
  }
  return out.join('\n')
}

const seedSql = `CREATE TABLE patients (
  patient_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  sex TEXT NOT NULL,
  birth_date TEXT NOT NULL,
  city TEXT NOT NULL
);
CREATE TABLE encounters (
  encounter_id INTEGER PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES patients(patient_id),
  dept TEXT NOT NULL,
  admit_date TEXT NOT NULL,
  discharge_date TEXT NOT NULL
);
CREATE TABLE labs (
  lab_id INTEGER PRIMARY KEY,
  encounter_id INTEGER NOT NULL REFERENCES encounters(encounter_id),
  test_name TEXT NOT NULL,
  value REAL NOT NULL,
  unit TEXT NOT NULL,
  taken_at TEXT NOT NULL
);
CREATE TABLE medications (
  med_id INTEGER PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES patients(patient_id),
  drug_name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT
);

${insert('patients', ['patient_id', 'name', 'sex', 'birth_date', 'city'], patients.map((p) => [p.id, p.name, p.sex, p.birth, p.city]))}

${insert('encounters', ['encounter_id', 'patient_id', 'dept', 'admit_date', 'discharge_date'], encounters.map((e) => [e.id, e.patientId, e.dept, e.admit, e.discharge]))}

${insert('labs', ['lab_id', 'encounter_id', 'test_name', 'value', 'unit', 'taken_at'], labs.map((l) => [l.id, l.encounterId, l.test, l.value, l.unit, l.takenAt]))}

${insert('medications', ['med_id', 'patient_id', 'drug_name', 'start_date', 'end_date'], medications.map((m) => [m.id, m.patientId, m.drug, m.start, m.end]))}`

// --- verify teaching shapes against a real SQLite before writing ---
const SQL = await initSqlJs({ locateFile: (f) => path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', f) })
const db = new SQL.Database()
db.run(seedSql)
const val = (sql) => db.exec(sql)[0].values[0][0]
const rows = (sql) => db.exec(sql)[0]?.values ?? []
const assert = (cond, msg) => { if (!cond) { console.error(`ASSERTION FAILED: ${msg}`); process.exit(1) } }

assert(val('SELECT COUNT(*) FROM patients') === 50, '50 patients')
assert(val('SELECT COUNT(DISTINCT name) FROM patients') === 50, 'names unique (so GROUP BY name === GROUP BY patient_id)')
const encCount = val('SELECT COUNT(*) FROM encounters')
assert(encCount >= 150 && encCount <= 240, `encounter count ~200 (got ${encCount})`)
const labCount = val('SELECT COUNT(*) FROM labs')
assert(labCount >= 450 && labCount <= 750, `lab count ~600 (got ${labCount})`)
assert(val('SELECT COUNT(*) FROM medications') === 120, '120 medications')
assert(val('SELECT COUNT(*) FROM patients WHERE patient_id NOT IN (SELECT patient_id FROM encounters)') === 5, '5 zero-encounter patients')
assert(val('SELECT COUNT(*) FROM (SELECT 1 FROM encounters GROUP BY patient_id HAVING COUNT(*) > 3)') >= 3, '>=3 patients with more than 3 encounters')
assert(val('SELECT COUNT(DISTINCT dept) FROM encounters') === 6, '6 departments')
assert(val("SELECT COUNT(*) FROM patients WHERE city = 'Chicago'") >= 5, 'enough Chicago patients for exercise 1')
assert(val("SELECT COUNT(*) FROM patients WHERE sex = 'F' AND birth_date > '1980-01-01'") >= 3, 'enough rows for exercise 2')
// exercise 4 is ordered:true — dept encounter counts must be tie-free
assert(val('SELECT COUNT(DISTINCT c) FROM (SELECT COUNT(*) AS c FROM encounters GROUP BY dept)') === 6, 'dept encounter counts all distinct (else exercise 4 ORDER BY is ambiguous)')
// exercise 5 needs HAVING avg > 3 to split departments, with a clear margin
const losRows = rows('SELECT dept, AVG(julianday(discharge_date) - julianday(admit_date)) FROM encounters GROUP BY dept')
assert(losRows.some((r) => r[1] > 3.3) && losRows.some((r) => r[1] < 2.7), 'avg LOS splits around 3 days')
assert(losRows.every((r) => Math.abs(r[1] - 3) > 0.3), 'every avg LOS clear of the 3-day threshold')
// exercise 10 ranks over (patient_id, admit_date) — must be tie-free
assert(val('SELECT COUNT(*) FROM (SELECT 1 FROM encounters GROUP BY patient_id, admit_date HAVING COUNT(*) > 1)') === 0, 'no (patient_id, admit_date) ties')
// exercise 11 — HbA1c series with tie-free per-patient timestamps
assert(val("SELECT COUNT(*) FROM (SELECT e.patient_id FROM labs l JOIN encounters e ON e.encounter_id = l.encounter_id WHERE l.test_name = 'HbA1c' GROUP BY e.patient_id HAVING COUNT(*) >= 3)") >= 5, '>=5 patients with a 3+-result HbA1c series')
assert(val("SELECT COUNT(*) FROM (SELECT 1 FROM labs l JOIN encounters e ON e.encounter_id = l.encounter_id WHERE l.test_name = 'HbA1c' GROUP BY e.patient_id, l.taken_at HAVING COUNT(*) > 1)") === 0, 'no per-patient HbA1c taken_at ties')
db.close()

// --- write the TS module ---
assert(!seedSql.includes('`') && !seedSql.includes('${'), 'seed SQL is template-literal safe')
const ts = `// lib/learn/sql-seed.ts — GENERATED by scripts/generate-sql-seed.mjs. Do not edit by hand.
// Deterministic synthetic healthcare data for the 08/ SQL artifact — obviously
// fake, committed so checked-exercise results can never drift.

export const SQL_SEED_COUNTS = { patients: 50, encounters: ${encounters.length}, labs: ${labs.length}, medications: 120 } as const

export const SQL_SEED = \`
${seedSql}
\`
`
writeFileSync(OUT, ts)
console.log(`wrote ${OUT}`)
console.log(`patients 50 · encounters ${encounters.length} · labs ${labs.length} · medications 120`)
```

- [ ] **Step 2: Run it and watch the assertions**

```bash
cd /Users/amirabdurrahim/repos/amir-site
node scripts/generate-sql-seed.mjs
```

Expected: `wrote …/lib/learn/sql-seed.ts` plus a count summary line, exit 0. If any `ASSERTION FAILED` prints, bump `SEED` (42 → 43 → …) and re-run until all assertions hold; the committed output is deterministic for whatever seed lands.

- [ ] **Step 3: Verify determinism**

```bash
node scripts/generate-sql-seed.mjs && git diff --stat lib/learn/sql-seed.ts
```

Expected: second run produces zero diff (file identical).

- [ ] **Step 4: Type-check the generated file**

```bash
npx tsc --noEmit
```

Expected: no errors (uses the repo tsconfig).

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-sql-seed.mjs lib/learn/sql-seed.ts
git commit -m "feat: deterministic synthetic healthcare seed for the SQL artifact"
```

---

### Task 3: Result-set comparator `lib/learn/sql-check.ts` (TDD)

**Files:**
- Create: `lib/learn/sql-check.ts`
- Test: `<scratchpad>/test-sql-check.ts` (throwaway, run with `npx --yes tsx`; never committed — the repo has no test infrastructure by design)

**Interfaces:**
- Produces (exact exports later tasks rely on):
  - `export type SqlValue = number | string | Uint8Array | null`
  - `export interface QueryResult { columns: string[]; values: SqlValue[][] }` (structural mirror of sql.js `QueryExecResult` — assignable both ways)
  - `export type CheckResult = { pass: true } | { pass: false; reason: string }`
  - `export function compareResults(user: QueryResult | null, expected: QueryResult, ordered: boolean): CheckResult`
- Semantics (from the spec): compare column **count** only (aliases must pass); then row count; then cells by position. Numbers within 1e-9; strings trimmed; NULL ≡ NULL. `ordered: false` → canonically sort both row sets before comparing; `ordered: true` → compare as-is. `user === null` (no result set) → fail with reason `query returned no result set`. Reasons are user-facing (they feed the live region, e.g. `12 rows vs 8 expected`); cell mismatches don't leak expected values (that's what "Show expected" is for).

- [ ] **Step 1: Write the failing test**

Create `<scratchpad>/test-sql-check.ts` (substitute the scratchpad path from Global Constraints):

```ts
import assert from 'node:assert/strict'
import { compareResults, type QueryResult } from '/Users/amirabdurrahim/repos/amir-site/lib/learn/sql-check'

const r = (columns: string[], values: (number | string | null)[][]): QueryResult => ({ columns, values })

// identical result sets pass
assert.deepEqual(compareResults(r(['a'], [[1]]), r(['a'], [[1]]), true), { pass: true })
// aliases don't matter — comparison is positional
assert.deepEqual(compareResults(r(['my_alias'], [[1]]), r(['n'], [[1]]), true), { pass: true })
// column count mismatch
assert.deepEqual(compareResults(r(['a', 'b'], [[1, 2]]), r(['a'], [[1]]), true), { pass: false, reason: '2 columns vs 1 expected' })
// row count mismatch — the spec's example message shape
assert.deepEqual(compareResults(r(['a'], [[1], [2], [3]]), r(['a'], [[1]]), true), { pass: false, reason: '3 rows vs 1 expected' })
// float tolerance 1e-9
assert.equal(compareResults(r(['a'], [[1 + 1e-12]]), r(['a'], [[1]]), true).pass, true)
assert.equal(compareResults(r(['a'], [[1.01]]), r(['a'], [[1]]), true).pass, false)
// strings trimmed
assert.equal(compareResults(r(['a'], [[' Chicago ']]), r(['a'], [['Chicago']]), true).pass, true)
// NULL handling: NULL ≡ NULL, NULL ≠ value, NULL ≠ 'null' the string
assert.equal(compareResults(r(['a'], [[null]]), r(['a'], [[null]]), true).pass, true)
assert.equal(compareResults(r(['a'], [[null]]), r(['a'], [['x']]), true).pass, false)
assert.equal(compareResults(r(['a'], [['null']]), r(['a'], [[null]]), true).pass, false)
// unordered: shuffled rows pass; ordered: shuffled rows fail
const shuffled = r(['a', 'b'], [[2, 'y'], [1, 'x']])
const canon = r(['a', 'b'], [[1, 'x'], [2, 'y']])
assert.equal(compareResults(shuffled, canon, false).pass, true)
assert.equal(compareResults(shuffled, canon, true).pass, false)
// cell mismatch reason names the position but not the expected value
assert.deepEqual(compareResults(r(['a'], [[1], [9]]), r(['a'], [[1], [2]]), true), { pass: false, reason: 'values differ at row 2, column 1' })
// no result set (UPDATE etc.)
assert.deepEqual(compareResults(null, canon, false), { pass: false, reason: 'query returned no result set' })
console.log('sql-check: all assertions passed')
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npx --yes tsx <scratchpad>/test-sql-check.ts
```

Expected: FAIL — cannot find module `.../lib/learn/sql-check`.

- [ ] **Step 3: Write the implementation**

Create `lib/learn/sql-check.ts` with exactly this content:

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx --yes tsx <scratchpad>/test-sql-check.ts
```

Expected: `sql-check: all assertions passed`.

- [ ] **Step 5: Lint + type-check, then commit**

```bash
npm run lint && npx tsc --noEmit
git add lib/learn/sql-check.ts
git commit -m "feat: result-set comparator for checked SQL exercises"
```

Expected: lint shows only the 2 known pre-existing errors; tsc clean.

---

### Task 4: Exercise definitions `lib/learn/sql-exercises.ts`

**Files:**
- Create: `lib/learn/sql-exercises.ts`
- Test: `<scratchpad>/test-sql-exercises.ts` (throwaway; runs every canonical solution against the real seed via sql.js)

**Interfaces:**
- Consumes: `SQL_SEED`, `SQL_SEED_COUNTS` (Task 2); `compareResults` (Task 3).
- Produces (exact exports Task 5 relies on):
  - `export type SqlSectionId = 'sql-select' | 'sql-aggregate' | 'sql-joins' | 'sql-windows'`
  - `export interface SqlExercise { id: string; section: SqlSectionId; prompt: string; hint: string; solution: string; ordered: boolean; tables: string[] }`
  - `export const SQL_EXERCISES: SqlExercise[]` — 11 entries in display order (3 select, 3 aggregate, 3 joins, 2 windows).

- [ ] **Step 1: Write the failing test**

Create `<scratchpad>/test-sql-exercises.ts` (substitute the scratchpad path; note `locateFile` points at the **scratchpad's** node_modules, where sql.js 1.14.1 is already installed):

```ts
import assert from 'node:assert/strict'
import path from 'node:path'
import initSqlJs from 'sql.js'
import { SQL_SEED, SQL_SEED_COUNTS } from '/Users/amirabdurrahim/repos/amir-site/lib/learn/sql-seed'
import { SQL_EXERCISES } from '/Users/amirabdurrahim/repos/amir-site/lib/learn/sql-exercises'
import { compareResults } from '/Users/amirabdurrahim/repos/amir-site/lib/learn/sql-check'

const SQL = await initSqlJs({
  locateFile: (f: string) => path.join('<scratchpad>/node_modules/sql.js/dist', f),
})
const seed = new SQL.Database()
seed.run(SQL_SEED)
const buf = seed.export()
seed.close()

const run = (sql: string) => {
  const db = new SQL.Database(buf)
  try {
    const res = db.exec(sql)
    return res.length ? res[res.length - 1] : null
  } finally {
    db.close()
  }
}

assert.equal(SQL_EXERCISES.length, 11, '11 exercises')
assert.deepEqual(
  SQL_EXERCISES.map((e) => e.section),
  ['sql-select', 'sql-select', 'sql-select', 'sql-aggregate', 'sql-aggregate', 'sql-aggregate', 'sql-joins', 'sql-joins', 'sql-joins', 'sql-windows', 'sql-windows'],
  'sections in display order'
)
const EXPECTED_COLS: Record<string, number> = {
  'select-city': 2, 'select-compound': 2, 'select-distinct': 1,
  'agg-count-dept': 2, 'agg-having': 2, 'agg-multi': 2,
  'join-inner': 2, 'join-left': 2, 'join-fanout': 3,
  'win-rownumber': 3, 'win-latest-hba1c': 3,
}
for (const ex of SQL_EXERCISES) {
  const res = run(ex.solution)
  assert.ok(res, `${ex.id}: solution returns a result set`)
  assert.ok(res!.values.length >= 1, `${ex.id}: solution returns rows`)
  assert.equal(res!.columns.length, EXPECTED_COLS[ex.id], `${ex.id}: column count`)
  assert.equal(compareResults(res!, run(ex.solution)!, ex.ordered).pass, true, `${ex.id}: solution passes its own check`)
}
const by = (id: string) => run(SQL_EXERCISES.find((e) => e.id === id)!.solution)!
assert.equal(by('select-distinct').values.length, 6, 'six distinct departments')
assert.equal(by('agg-count-dept').values.length, 6)
const kept = by('agg-having').values.length
assert.ok(kept >= 1 && kept <= 5, `HAVING actually filters (kept ${kept} of 6 depts)`)
assert.ok(by('agg-multi').values.length >= 3)
assert.equal(by('join-left').values.length, SQL_SEED_COUNTS.patients, 'LEFT JOIN keeps all patients')
assert.ok(by('join-left').values.some((row) => row[1] === 0), 'zero-encounter patients show 0')
assert.ok(by('join-fanout').values.some((row) => (row[2] as number) > (row[1] as number)), 'fan-out visible: labs > encounters for someone')
assert.equal(by('win-rownumber').values.length, SQL_SEED_COUNTS.encounters, 'one row per encounter')
assert.ok(by('win-latest-hba1c').values.length >= 5, 'one row per HbA1c patient')
console.log('sql-exercises: all 11 solutions verified against the seed')
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npx --yes tsx <scratchpad>/test-sql-exercises.ts
```

Expected: FAIL — cannot find module `.../lib/learn/sql-exercises`.

- [ ] **Step 3: Write the exercises**

Create `lib/learn/sql-exercises.ts` with exactly this content:

```ts
// lib/learn/sql-exercises.ts — the 11 checked exercises for the 08/ SQL
// artifact. Checking runs `solution` against a fresh seed database and
// compares result sets positionally (lib/learn/sql-check.ts), so prompts
// must pin down the output columns; ordered: true only where the prompt
// demands a specific ORDER BY.

export type SqlSectionId = 'sql-select' | 'sql-aggregate' | 'sql-joins' | 'sql-windows'

export interface SqlExercise {
  id: string
  section: SqlSectionId
  prompt: string
  hint: string
  solution: string
  ordered: boolean
  tables: string[]
}

export const SQL_EXERCISES: SqlExercise[] = [
  // --- 01/ SELECT, WHERE, ORDER BY ---
  {
    id: 'select-city',
    section: 'sql-select',
    prompt: 'Return the name and birth_date of every patient who lives in Chicago, ordered by birth_date with the oldest patient first.',
    hint: "Filter with WHERE city = 'Chicago', then ORDER BY birth_date — ascending is the default, and the earliest birth dates are the oldest patients.",
    solution: `SELECT name, birth_date
FROM patients
WHERE city = 'Chicago'
ORDER BY birth_date;`,
    ordered: true,
    tables: ['patients'],
  },
  {
    id: 'select-compound',
    section: 'sql-select',
    prompt: 'Return the name and birth_date of every female patient born after 1980-01-01.',
    hint: "Combine two conditions with AND. Dates here are ISO strings, so birth_date > '1980-01-01' works as a plain string comparison.",
    solution: `SELECT name, birth_date
FROM patients
WHERE sex = 'F' AND birth_date > '1980-01-01';`,
    ordered: false,
    tables: ['patients'],
  },
  {
    id: 'select-distinct',
    section: 'sql-select',
    prompt: 'Return each department that appears in the encounters table — one row per department, no duplicates.',
    hint: 'SELECT dept alone returns one row per encounter. DISTINCT collapses the duplicates.',
    solution: `SELECT DISTINCT dept
FROM encounters;`,
    ordered: false,
    tables: ['encounters'],
  },

  // --- 02/ GROUP BY / HAVING ---
  {
    id: 'agg-count-dept',
    section: 'sql-aggregate',
    prompt: 'Return each department and its encounter count, sorted with the busiest department first.',
    hint: 'GROUP BY dept, COUNT(*) for the size of each group, then ORDER BY that count DESC.',
    solution: `SELECT dept, COUNT(*) AS encounter_count
FROM encounters
GROUP BY dept
ORDER BY encounter_count DESC;`,
    ordered: true,
    tables: ['encounters'],
  },
  {
    id: 'agg-having',
    section: 'sql-aggregate',
    prompt: 'Return each department whose average length of stay is longer than 3 days, together with that average. Length of stay in days = julianday(discharge_date) - julianday(admit_date).',
    hint: 'AVG over the julianday difference gives days. The filter compares an aggregate, so it belongs in HAVING, not WHERE.',
    solution: `SELECT dept, AVG(julianday(discharge_date) - julianday(admit_date)) AS avg_los
FROM encounters
GROUP BY dept
HAVING avg_los > 3;`,
    ordered: false,
    tables: ['encounters'],
  },
  {
    id: 'agg-multi',
    section: 'sql-aggregate',
    prompt: 'Return the patient_id and encounter count of every patient with more than 3 encounters.',
    hint: 'GROUP BY patient_id, then HAVING COUNT(*) > 3 — HAVING filters groups after aggregation.',
    solution: `SELECT patient_id, COUNT(*) AS encounter_count
FROM encounters
GROUP BY patient_id
HAVING COUNT(*) > 3;`,
    ordered: false,
    tables: ['encounters'],
  },

  // --- 03/ Joins & the fan-out trap ---
  {
    id: 'join-inner',
    section: 'sql-joins',
    prompt: "Return every encounter's patient name and department — two columns, name and dept, one row per encounter.",
    hint: 'JOIN encounters to patients ON the patient_id they share. Every encounter has a patient, so an INNER JOIN loses nothing here.',
    solution: `SELECT p.name, e.dept
FROM patients p
JOIN encounters e ON e.patient_id = p.patient_id;`,
    ordered: false,
    tables: ['patients', 'encounters'],
  },
  {
    id: 'join-left',
    section: 'sql-joins',
    prompt: "Return every patient's name and encounter count — including the patients with zero encounters.",
    hint: 'LEFT JOIN keeps patients with no encounters (their encounter columns come back NULL). COUNT(e.encounter_id) ignores those NULLs — COUNT(*) would count them as 1.',
    solution: `SELECT p.name, COUNT(e.encounter_id) AS encounter_count
FROM patients p
LEFT JOIN encounters e ON e.patient_id = p.patient_id
GROUP BY p.patient_id, p.name;`,
    ordered: false,
    tables: ['patients', 'encounters'],
  },
  {
    id: 'join-fanout',
    section: 'sql-joins',
    prompt: "First run this and look closely: SELECT p.name, COUNT(e.encounter_id) AS n FROM patients p JOIN encounters e ON e.patient_id = p.patient_id JOIN labs l ON l.encounter_id = e.encounter_id GROUP BY p.patient_id, p.name — n is each patient's LAB count, not encounter count, because the second join fanned the rows out. Then write the checked query: each patient's name, true encounter count, and lab count (three columns: name, encounters, labs).",
    hint: 'After both joins there is one row per lab. COUNT(DISTINCT e.encounter_id) collapses the duplicates back to true encounters; COUNT(l.lab_id) is already right because each lab row appears exactly once.',
    solution: `SELECT p.name,
       COUNT(DISTINCT e.encounter_id) AS encounters,
       COUNT(l.lab_id) AS labs
FROM patients p
JOIN encounters e ON e.patient_id = p.patient_id
JOIN labs l ON l.encounter_id = e.encounter_id
GROUP BY p.patient_id, p.name;`,
    ordered: false,
    tables: ['patients', 'encounters', 'labs'],
  },

  // --- 04/ Window functions ---
  {
    id: 'win-rownumber',
    section: 'sql-windows',
    prompt: "Return patient_id, admit_date, and a visit_number that numbers each patient's encounters in admit_date order (1 = that patient's earliest encounter).",
    hint: 'ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY admit_date) restarts the numbering at 1 for every patient — no GROUP BY needed.',
    solution: `SELECT patient_id,
       admit_date,
       ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY admit_date) AS visit_number
FROM encounters;`,
    ordered: false,
    tables: ['encounters'],
  },
  {
    id: 'win-latest-hba1c',
    section: 'sql-windows',
    prompt: "Return each patient's most recent HbA1c result — three columns: name, value, taken_at. One row per patient who has at least one HbA1c lab.",
    hint: 'Rank HbA1c rows per patient with ROW_NUMBER() OVER (PARTITION BY … ORDER BY taken_at DESC) inside a CTE, then keep the rows where the rank is 1.',
    solution: `WITH ranked AS (
  SELECT e.patient_id,
         l.value,
         l.taken_at,
         ROW_NUMBER() OVER (PARTITION BY e.patient_id ORDER BY l.taken_at DESC) AS rn
  FROM labs l
  JOIN encounters e ON e.encounter_id = l.encounter_id
  WHERE l.test_name = 'HbA1c'
)
SELECT p.name, r.value, r.taken_at
FROM ranked r
JOIN patients p ON p.patient_id = r.patient_id
WHERE r.rn = 1;`,
    ordered: false,
    tables: ['patients', 'encounters', 'labs'],
  },
]
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx --yes tsx <scratchpad>/test-sql-exercises.ts
```

Expected: `sql-exercises: all 11 solutions verified against the seed`. If a shape assertion fails (and it isn't a typo in a solution), the dataset is at fault — revisit Task 2's generator, bump SEED, regenerate, re-run this test.

- [ ] **Step 5: Lint + type-check, then commit**

```bash
npm run lint && npx tsc --noEmit
git add lib/learn/sql-exercises.ts
git commit -m "feat: 11 checked SQL exercises across four sections"
```

---

### Task 5: Artifact component `components/learn/sql.tsx` (engine + exercise UI + section 01) and route wiring

**Files:**
- Create: `components/learn/sql.tsx`
- Modify: `components/learn/dynamic-artifacts.tsx` (add `SQL` with `ssr: false`)
- Modify: `lib/learn/artifacts.ts` (append the `sql` entry)
- Modify: `app/learn/[slug]/page.tsx:19` (import) and the `ARTIFACT_COMPONENTS` map at `app/learn/[slug]/page.tsx:59-67`
- Test: manual, via dev server + Playwright MCP (React UI; the repo has no component test infrastructure)

**Interfaces:**
- Consumes: `SQL_SEED`, `SQL_SEED_COUNTS` (Task 2); `compareResults`, `QueryResult`, `SqlValue`, `CheckResult` (Task 3); `SQL_EXERCISES`, `SqlExercise`, `SqlSectionId` (Task 4).
- Produces: `export function SQL()` — the artifact component. Internal `SECTIONS: SectionDef[]` array that Task 6 extends with three more entries (aggregate/joins/windows); everything else (Exercise, ResultTable, engine, fallback) is final after this task.

Design notes locked here:
- **Engine is a module-level singleton**: `initSqlJs({ locateFile: () => '/sql-wasm.wasm' })` once, seed DB built once, `db.export()` buffer cached; **every Run creates `new engine.Database(seedBuffer)` and closes it** — destructive statements can't leak.
- **Init failure never throws to the ArtifactErrorBoundary**: `useSqlEngine` catches and renders `EngineFallback` (styled to match the boundary) with a working "Try again" (the failed promise is cleared so retry re-fetches).
- **`react-hooks/set-state-in-effect` trap**: this repo's ESLint flags synchronous `setState` in effect bodies (see the known `masonry-grid.tsx` error). `useSqlEngine` below only sets state in async promise callbacks — keep it that way.
- **JSX apostrophes**: `eslint-config-next` enforces `react/no-unescaped-entities` — use `&apos;` or `{'…'}`-style expressions in JSX text, as written below.

- [ ] **Step 1: Write the component**

Create `components/learn/sql.tsx` with exactly this content:

```tsx
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
        enginePromise = null // allow "Try again" to re-fetch
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

function useSqlEngine(): { status: EngineStatus; retry: () => void } {
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
  const retry = useCallback(() => setStatus('loading'), [])
  return { status, retry }
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

// Task 6 appends the aggregate/joins/windows entries here.
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
// ArtifactErrorBoundary) — same editorial styling, working retry.
function EngineFallback({ onRetry }: { onRetry: () => void }) {
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
      <button type="button" onClick={onRetry} className={PILL_PRIMARY}>
        Try again
      </button>
    </div>
  )
}

export function SQL() {
  const { status, retry } = useSqlEngine()
  const engineReady = status === 'ready'

  // Exercise numbering is continuous across sections (ex. 01–11)
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
          4 sections {'·'} 11 checked exercises {'·'} SQLite running in your browser via WebAssembly
        </p>
        <div className="mt-4 h-px w-16 mx-auto bg-mauve dark:bg-mauve-dark" />
        <p role="status" className="mt-6 font-[family-name:var(--font-mono)] text-[12px] text-ink-subtle dark:text-night-muted">
          {status === 'loading' && 'loading engine — ~0.7 MB of WebAssembly'}
          {status === 'ready' && 'engine ready — every run starts from a fresh copy of the dataset'}
        </p>
      </div>

      {status === 'error' ? (
        <EngineFallback onRetry={retry} />
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
```

Note: the file uses literal Unicode glyphs (⌘↩ ✓ · … —) — fine in JSX — but bare apostrophes in JSX **text** are a lint error (`react/no-unescaped-entities`); keep them as `&apos;` exactly as written above.

- [ ] **Step 2: Register in dynamic-artifacts.tsx**

Append to `components/learn/dynamic-artifacts.tsx`:

```tsx
// SQL is ssr: false for a different reason than the ones above: its sql.js
// WebAssembly engine can only initialize in the browser.
export const SQL = dynamic(
  () => import('./sql').then(m => ({ default: m.SQL })),
  { ssr: false }
)
```

- [ ] **Step 3: Add the metadata entry**

Append to the `ARTIFACTS` array in `lib/learn/artifacts.ts` (after the `neural-networks` entry, verbatim from the spec):

```ts
  {
    slug: 'sql',
    title: 'SQL / Querying Data',
    shortTitle: 'SQL',
    description: 'Run real SQL against a synthetic patient dataset — SQLite compiled to WebAssembly, with checked exercises from SELECT to window functions.',
    number: '08',
    subtopics: ['SELECT & filtering', 'Aggregation', 'Joins', 'Window functions'],
    sectionCount: 4,
    sections: [
      { id: 'sql-select', label: 'SELECT' },
      { id: 'sql-aggregate', label: 'Aggregation' },
      { id: 'sql-joins', label: 'Joins' },
      { id: 'sql-windows', label: 'Windows' },
    ],
  },
```

- [ ] **Step 4: Wire the route**

In `app/learn/[slug]/page.tsx`, change the dynamic-artifacts import line to:

```tsx
import { LogLossCrossEntropy, PCA, Clustering, SHAP, NeuralNetworks, SQL } from '@/components/learn/dynamic-artifacts'
```

and add to `ARTIFACT_COMPONENTS`:

```tsx
  'sql': SQL,
```

- [ ] **Step 5: Build + lint**

```bash
npm run build && npm run lint
```

Expected: build succeeds with `/learn/sql` prerendered; lint shows only the 2 known errors. **Contingency:** if the build fails with `Module not found: node:fs` (or `node:crypto`) coming from sql.js, Turbopack didn't apply the browser export condition — add to `next.config.ts`: `turbopack: { resolveAlias: { 'sql.js': 'sql.js/dist/sql-wasm-browser.js' } }` (the package's exports map exposes `./dist/*`), re-run the build, and include that file in the commit.

- [ ] **Step 6: Verify in the browser (Playwright MCP against the dev server)**

```bash
npm run dev -- -p 3100
```

On `http://localhost:3100/learn/sql` verify:
1. Status line shows "loading engine — ~0.7 MB of WebAssembly", then flips to "engine ready — every run starts from a fresh copy of the dataset". Dataset legend shows real row counts.
2. Section 01/ renders with exercises ex. 01–03. To fill a React-controlled textarea from `browser_evaluate`, use the native setter so React sees the change:

```js
(sql, i) => {
  const ta = document.querySelectorAll('textarea[aria-label^="SQL editor"]')[i]
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(ta, sql)
  ta.dispatchEvent(new Event('input', { bubbles: true }))
}
```

3. Paste exercise 1's canonical solution into ex. 01, click Run → result table renders, "✓ Correct — result matches expected".
4. Paste `SELECT name FROM patients` into ex. 01, Run → "Doesn't match — 1 column vs 2 expected", "Show expected" toggle reveals the expected table with the user's result still visible above it.
5. Paste `SELEC name FROM patients` → inline red "SQL error: near \"SELEC\"…" message.
6. Paste `UPDATE patients SET city = 'Nowhere'` → "query returned no result set — try a SELECT" (and a fresh Run of the exercise 1 solution afterwards still passes — proof the seed DB wasn't mutated).
7. Ctrl/Cmd+Enter in the textarea runs; pressing Tab in the textarea moves focus to the Run button (no trap).
8. Hint reveals the hint; Reveal solution shows the SQL in a `<pre>`.

- [ ] **Step 7: Commit**

```bash
git add components/learn/sql.tsx components/learn/dynamic-artifacts.tsx lib/learn/artifacts.ts "app/learn/[slug]/page.tsx"
git commit -m "feat: SQL sandbox artifact — wasm engine, checked exercise UI, SELECT section"
```

(Include `next.config.ts` if the Step 5 contingency was needed.)

---

### Task 6: Sections 02–04 (aggregation, joins, windows)

**Files:**
- Modify: `components/learn/sql.tsx` (extend the `SECTIONS` array — no other change)
- Test: manual via dev server + Playwright MCP — all 11 canonical solutions pass through the UI

**Interfaces:**
- Consumes: `SECTIONS: SectionDef[]` from Task 5 (fields `id`, `number`, `title`, `intro`, `insight`); exercises resolve automatically by `section` id.

- [ ] **Step 1: Extend SECTIONS**

In `components/learn/sql.tsx`, append to the `SECTIONS` array (after the `sql-select` entry):

```tsx
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
```

Also update the comment above the array from "Task 6 appends…" to a plain description:

```tsx
// The four sections; exercises attach by their `section` id, numbered
// continuously across sections (ex. 01–11).
```

- [ ] **Step 2: Build + lint**

```bash
npm run build && npm run lint
```

Expected: clean build; only the 2 known lint errors.

- [ ] **Step 3: Verify all 11 solutions through the UI**

With the dev server on port 3100, on `/learn/sql` (engine ready): for each exercise index 0–10, fill its textarea with the exercise's canonical `solution` (native-setter snippet from Task 5 Step 6), click its Run button, and confirm "✓ Correct — result matches expected" appears in that exercise's card. Also confirm:
- ex. 04 (`agg-count-dept`): reordering the solution's `ORDER BY` to `ASC` produces a mismatch (ordered check works).
- ex. 08 (`join-left`): the result table shows at least one `0` encounter_count row.
- Section dividers render between sections; all four section h2 anchors exist (`#sql-select`, `#sql-aggregate`, `#sql-joins`, `#sql-windows`).
- SectionRail (≥1280px viewport): shows the 4 labels, highlights follow scroll, click smooth-scrolls with the h2 landing clear of the sticky nav.

- [ ] **Step 4: Commit**

```bash
git add components/learn/sql.tsx
git commit -m "feat: aggregation, joins, and window sections for the SQL artifact"
```

---

### Task 7: Index card illustration + per-slug OG card

**Files:**
- Modify: `app/learn/page.tsx` (add `SQLIllustration` + `ILLUSTRATIONS` entry)
- Modify: `app/learn/[slug]/opengraph-image.tsx` (add `case 'sql'` to `Illustration`)

**Interfaces:**
- Consumes: the existing 80×64 illustration conventions — solid strokes get `draw-stroke` + `pathLength={100}`, fill rects get `spark-bar` + `transformBox: 'fill-box'`, dashed strokes stay static; OG variant hardcodes Mocha hexes from the `C` constant.
- Motif (from the spec): two tables joining — two outlined table cards with header rules and dashed body rows, linked by a peach join stroke with a commit dot.

- [ ] **Step 1: Add the index card illustration**

In `app/learn/page.tsx`, add after `NeuralNetworksIllustration`:

```tsx
function SQLIllustration() {
  return (
    <svg width="80" height="64" viewBox="0 0 80 64" aria-hidden="true" focusable="false">
      {/* left table */}
      <rect x="6" y="10" width="30" height="34" rx="3" fill="none" className="stroke-sapphire dark:stroke-sapphire-dark draw-stroke" pathLength={100} strokeWidth="1.5" />
      <line x1="6" y1="19" x2="36" y2="19" className="stroke-sapphire dark:stroke-sapphire-dark draw-stroke" pathLength={100} strokeWidth="1.5" style={{ animationDelay: '80ms' }} />
      <line x1="11" y1="27" x2="31" y2="27" className="stroke-ink-faint dark:stroke-night-border" strokeWidth="1.2" strokeDasharray="3" />
      <line x1="11" y1="33" x2="31" y2="33" className="stroke-ink-faint dark:stroke-night-border" strokeWidth="1.2" strokeDasharray="3" />
      <line x1="11" y1="39" x2="31" y2="39" className="stroke-ink-faint dark:stroke-night-border" strokeWidth="1.2" strokeDasharray="3" />
      {/* right table */}
      <rect x="44" y="20" width="30" height="34" rx="3" fill="none" className="stroke-mauve dark:stroke-mauve-dark draw-stroke" pathLength={100} strokeWidth="1.5" style={{ animationDelay: '120ms' }} />
      <line x1="44" y1="29" x2="74" y2="29" className="stroke-mauve dark:stroke-mauve-dark draw-stroke" pathLength={100} strokeWidth="1.5" style={{ animationDelay: '200ms' }} />
      <line x1="49" y1="37" x2="69" y2="37" className="stroke-ink-faint dark:stroke-night-border" strokeWidth="1.2" strokeDasharray="3" />
      <line x1="49" y1="43" x2="69" y2="43" className="stroke-ink-faint dark:stroke-night-border" strokeWidth="1.2" strokeDasharray="3" />
      <line x1="49" y1="49" x2="69" y2="49" className="stroke-ink-faint dark:stroke-night-border" strokeWidth="1.2" strokeDasharray="3" />
      {/* join link */}
      <line x1="36" y1="30" x2="44" y2="34" className="stroke-peach dark:stroke-peach-dark draw-stroke" pathLength={100} strokeWidth="1.5" style={{ animationDelay: '280ms' }} />
      <circle cx="40" cy="32" r="3" className="fill-peach dark:fill-peach-dark" />
    </svg>
  )
}
```

and register it in the `ILLUSTRATIONS` map:

```tsx
  'sql': SQLIllustration,
```

- [ ] **Step 2: Add the OG card variant**

In `app/learn/[slug]/opengraph-image.tsx`, add before `default:` in the `Illustration` switch (same motif, Mocha hexes, no CSS classes — satori renders inline SVG as-is):

```tsx
    case 'sql':
      return (
        <svg {...common}>
          <rect x="6" y="10" width="30" height="34" rx="3" fill="none" stroke={C.sapphire} strokeWidth="1.5" />
          <line x1="6" y1="19" x2="36" y2="19" stroke={C.sapphire} strokeWidth="1.5" />
          <line x1="11" y1="27" x2="31" y2="27" stroke={C.line} strokeWidth="1.2" strokeDasharray="3" />
          <line x1="11" y1="33" x2="31" y2="33" stroke={C.line} strokeWidth="1.2" strokeDasharray="3" />
          <line x1="11" y1="39" x2="31" y2="39" stroke={C.line} strokeWidth="1.2" strokeDasharray="3" />
          <rect x="44" y="20" width="30" height="34" rx="3" fill="none" stroke={C.mauve} strokeWidth="1.5" />
          <line x1="44" y1="29" x2="74" y2="29" stroke={C.mauve} strokeWidth="1.5" />
          <line x1="49" y1="37" x2="69" y2="37" stroke={C.line} strokeWidth="1.2" strokeDasharray="3" />
          <line x1="49" y1="43" x2="69" y2="43" stroke={C.line} strokeWidth="1.2" strokeDasharray="3" />
          <line x1="49" y1="49" x2="69" y2="49" stroke={C.line} strokeWidth="1.2" strokeDasharray="3" />
          <line x1="36" y1="30" x2="44" y2="34" stroke={C.peach} strokeWidth="1.5" />
          <circle cx="40" cy="32" r="3" fill={C.peach} />
        </svg>
      )
```

Satori reminder from CLAUDE.md: keep every text node in this route a **single** template string (no `{number}/`-style multi-node interpolation) — this task adds no text, so only the SVG above is needed.

- [ ] **Step 3: Verify**

With the dev server on port 3100:
1. `/learn` shows 8 cards; the SQL card's illustration draws on reveal (scroll it into view); card links to `/learn/sql`.
2. Homepage teaser section 06 says "Explore all 8" (derived from `ARTIFACTS.length` — just confirm).
3. `curl -s -o <scratchpad>/og-sql.png -w "%{http_code}" http://localhost:3100/learn/sql/opengraph-image` → `200`; Read the PNG and confirm: "08/", "SQL / Querying Data", the four subtopics, and the two-tables illustration on the card plate.

- [ ] **Step 4: Commit**

```bash
git add app/learn/page.tsx "app/learn/[slug]/opengraph-image.tsx"
git commit -m "feat: SQL index card illustration and per-slug OG card"
```

---

### Task 8: CSP + wasm cache headers in netlify.toml

**Files:**
- Modify: `netlify.toml:34` (CSP) and append a headers block

- [ ] **Step 1: Allow WebAssembly in script-src**

In the `Content-Security-Policy` value on line 34, change:

```
script-src 'self' 'sha256-FzZqltVqNEMe1AP7MNJyYU92WT6Smm3z6p9+mEkOLu0='
```

to:

```
script-src 'self' 'wasm-unsafe-eval' 'sha256-FzZqltVqNEMe1AP7MNJyYU92WT6Smm3z6p9+mEkOLu0='
```

(Only insert `'wasm-unsafe-eval'`; the hash and the rest of the policy stay byte-identical.)

- [ ] **Step 2: Add the wasm cache block**

Append after the `/badges/*` headers block:

```toml
[[headers]]
  for = "/sql-wasm.wasm"
  [headers.values]
    Cache-Control = "public, max-age=86400"
```

- [ ] **Step 3: Verify + commit**

Netlify headers don't apply to `npm run dev`/`next start`, so the CSP interaction can only be fully verified on a Netlify deploy preview — **record this as a deploy-time checklist item in the final report; do not block on it.** Locally just confirm the TOML parses (`npm run build` is unaffected; a visual re-read of the diff suffices).

```bash
git add netlify.toml
git commit -m "chore: allow wasm-unsafe-eval in CSP and cache sql-wasm.wasm"
```

---

### Task 9: CLAUDE.md documentation

**Files:**
- Modify: `CLAUDE.md` — five precise touch-points, keeping the existing voice (dense, pattern-oriented, includes the "why")

- [ ] **Step 1: Tech Stack section**

Add a bullet after the Lightbox line:

```markdown
- **SQL engine:** sql.js ^1.14 (SQLite → WASM, MIT) — the one deliberate exception to the no-dependencies ethos (you can't hand-roll a SQL engine). Used only by the 08/ SQL learn artifact.
```

- [ ] **Step 2: Client components list**

In the Key Conventions bullet listing learn client components, add `sql` to the list (after `neural-networks`).

- [ ] **Step 3: Key Patterns entry**

Add a bullet in Key Patterns (after the "Learn artifacts with ssr: false" bullet — and update that bullet's count from "5 of 7" to "6 of 8", appending SQL to its component list with the note "SQL is ssr:false because its WASM engine is client-only, not because of Math.random()"):

```markdown
- **SQL sandbox artifact (08/).** `components/learn/sql.tsx`: sql.js is imported only here (ssr: false chunk → zero bytes outside `/learn/sql`); wasm served from `public/sql-wasm.wasm` — **re-copy from `node_modules/sql.js/dist/sql-wasm.wasm` when bumping the sql.js dependency**. Engine is a module singleton: seed DB built once from `lib/learn/sql-seed.ts`, `db.export()` buffer cached, **fresh `Database(seedBuffer)` per Run** (destructive statements can't leak; accepted MVP risk: queries run on the main thread). Seed data is generated by `scripts/generate-sql-seed.mjs` (deterministic LCG, committed output, in-script assertions enforce the teaching shapes — zero-encounter patients, tie-free ORDER BY / ROW_NUMBER columns, HbA1c series). Exercises in `lib/learn/sql-exercises.ts` are checked by `lib/learn/sql-check.ts`: column *count* (aliases pass), then positional cells — numbers 1e-9 tolerance, strings trimmed, NULL ≡ NULL, canonical row sort unless `ordered: true`. Engine-load failure renders an in-artifact fallback with retry (never throws to the ArtifactErrorBoundary). CSP needs `'wasm-unsafe-eval'` (netlify.toml; deploy-preview-only verification).
```

- [ ] **Step 4: File structure tree**

Add lines in the appropriate places:

```
    sql.tsx                 # 08/ SQL (4 sections: SELECT/WHERE/ORDER BY, GROUP BY/HAVING, joins & fan-out, window functions — 11 checked exercises on sql.js)
    sql-seed.ts             # GENERATED deterministic healthcare seed (patients/encounters/labs/medications) — regenerate via scripts/generate-sql-seed.mjs
    sql-exercises.ts        # 11 exercise definitions (prompt, hint, solution, ordered, tables)
    sql-check.ts            # Result-set comparator (positional, tolerant, ordered/unordered)
  generate-sql-seed.mjs   # Seed generator + teaching-shape assertions (writes lib/learn/sql-seed.ts)
  sql-wasm.wasm           # sql.js WASM binary (re-copy on sql.js bumps), served at /sql-wasm.wasm
```

(`sql.tsx` under `components/learn/`; `sql-seed.ts`/`sql-exercises.ts` under `lib/learn/`; `sql-check.ts` under `lib/learn/`; `generate-sql-seed.mjs` under `scripts/`; `sql-wasm.wasm` under `public/`.)

- [ ] **Step 5: Security Headers section**

Update the CSP line to mention the new directive:

```markdown
- **CSP:** `script-src 'self' 'wasm-unsafe-eval'` + SHA-256 hash of the inline dark-mode script. `'wasm-unsafe-eval'` is required by sql.js on /learn/sql. If the inline script in `layout.tsx` changes, recompute the hash: `echo -n "<script-content>" | openssl dgst -sha256 -binary | base64`
```

- [ ] **Step 6: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document the SQL sandbox artifact in CLAUDE.md"
```

---

### Task 10: Full verification sweep (spec checklist)

**Files:** none new — fixes only if a check fails (commit each fix with a descriptive message).

Audit every claim before reporting; run each check, don't assume.

- [ ] **Step 1: Build + lint**

```bash
npm run build && npm run lint
```

Expected: build succeeds; lint = exactly the 2 known errors.

- [ ] **Step 2: Solutions + engine behavior (already proven in Tasks 5–6 — spot-check ex. 01, 08, 11 again on a fresh page load)**

- [ ] **Step 3: Network isolation**

Dev server on 3100; via Playwright `browser_network_requests`:
- On `/` and `/learn/gradient-descent`: **no** request for `sql-wasm.wasm` and no sql.js chunk.
- On `/learn/sql`: `sql-wasm.wasm` fetched once (200).

- [ ] **Step 4: Engine-failure path**

Simulate a wasm outage against the dev server: temporarily move the file —

```bash
mv public/sql-wasm.wasm public/sql-wasm.wasm.bak
```

Hard-reload `/learn/sql` → the in-artifact fallback renders ("The SQL engine didn't load" + Try again), **not** the ArtifactErrorBoundary, and no unhandled rejection in the console. Restore and retry:

```bash
mv public/sql-wasm.wasm.bak public/sql-wasm.wasm
```

Click "Try again" → engine loads, exercises work. (This also proves the retry path re-fetches after a cleared failed promise.)

- [ ] **Step 5: Both themes, 320px, reduced motion, keyboard**

- Toggle dark mode on `/learn/sql`: tables, pills, insight boxes, error/success lines all legible in both themes (screenshot each).
- `browser_resize` to 320×700: `document.documentElement.scrollWidth <= 320` (evaluate), result tables scroll internally, dataset legend scrolls internally.
- Emulate `prefers-reduced-motion` (Playwright `browser_run_code_unsafe` page.emulateMedia or OS-level): page renders fully visible; no new animation surface exists in this artifact beyond existing vocabulary.
- Keyboard-only: Tab reaches textarea → Run → hint/solution buttons in order; Tab inside the textarea exits to Run (no trap); Cmd/Ctrl+Enter runs; focus ring visible.

- [ ] **Step 6: Rail, index, OG, SEO surfaces**

- Rail at ≥1280px lists SELECT / Aggregation / Joins / Windows and follows scroll (`aria-current="location"` moves).
- `/learn` shows 8 cards; homepage teaser says "Explore all 8".
- `curl -s http://localhost:3100/sitemap.xml | grep -c '/learn/'` → 8 (the artifact URLs; the learn index URL has no trailing slash and is checked separately by eye).
- `/learn/sql` page source contains the `LearningResource` and `BreadcrumbList` JSON-LD scripts and the prev/next nav (prev = Neural Networks, no next).
- `/learn/sql/opengraph-image` → 200, distinct correct card.

- [ ] **Step 7: Console**

`browser_console_messages` on `/learn/sql` after a full interaction pass: zero new errors.

- [ ] **Step 8: Final state check**

```bash
git status
git log --oneline main..feature/design | head -20
```

Expected: working tree contains only the pre-existing unrelated changes (`public/theli/home.png` modified, `lib/work/` untracked — leave both alone); all SQL-artifact commits present; nothing pushed.

- [ ] **Step 9: Report**

Report results claim-by-claim against the spec's Verification section, including the two deploy-preview-only items that must be checked when this branch eventually deploys: (1) CSP `'wasm-unsafe-eval'` actually permits engine init in production, (2) `/sql-wasm.wasm` served with the 86400 Cache-Control header.
