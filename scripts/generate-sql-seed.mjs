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
const SEED = 50
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
