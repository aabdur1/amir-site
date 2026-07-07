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
