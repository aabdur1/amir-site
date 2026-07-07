// lib/learn/sql-exercises.ts — the 19 checked exercises for the 08/ SQL
// artifact, escalating within each section and ending in a combined
// challenge section. Checking runs `solution` against a fresh seed database
// and compares result sets positionally (lib/learn/sql-check.ts), so prompts
// must pin down the output columns; ordered: true only where the prompt
// demands a specific ORDER BY.

export type SqlSectionId = 'sql-select' | 'sql-aggregate' | 'sql-joins' | 'sql-windows' | 'sql-challenge'

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
  {
    id: 'select-null',
    section: 'sql-select',
    prompt:
      'Return the drug_name and start_date of every medication that is still ongoing — the ones with no end date recorded.',
    hint: 'NULL never equals anything, even NULL — end_date = NULL matches zero rows, silently. IS NULL is the only test that works.',
    solution: `SELECT drug_name, start_date
FROM medications
WHERE end_date IS NULL;`,
    ordered: false,
    tables: ['medications'],
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
  {
    id: 'agg-year',
    section: 'sql-aggregate',
    prompt:
      'Return encounter counts per department per year — three columns: yr (the four-digit year of admit_date), dept, encounter_count.',
    hint: "strftime('%Y', admit_date) pulls the year out of an ISO date string, and you can GROUP BY that expression (or its alias) together with dept.",
    solution: `SELECT strftime('%Y', admit_date) AS yr, dept, COUNT(*) AS encounter_count
FROM encounters
GROUP BY yr, dept;`,
    ordered: false,
    tables: ['encounters'],
  },
  {
    id: 'agg-share',
    section: 'sql-aggregate',
    prompt:
      "Return each department's share of all encounters as a percentage rounded to one decimal — two columns, dept and pct — with the busiest department first.",
    hint: 'COUNT(*) / total is integer division — it truncates to 0 before the ×100 ever happens, and 100 * COUNT(*) / total silently drops the decimals too. Make one operand a float (100.0 * …), get the grand total from a subquery, and ROUND(…, 1).',
    solution: `SELECT dept,
       ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM encounters), 1) AS pct
FROM encounters
GROUP BY dept
ORDER BY pct DESC;`,
    ordered: true,
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
  {
    id: 'join-antijoin',
    section: 'sql-joins',
    prompt: 'Return the name of every patient with no medications at all — one column, name.',
    hint: 'An anti-join: LEFT JOIN medications and keep only the rows where the right side came back empty (m.med_id IS NULL). NOT IN (SELECT patient_id FROM medications) also works here.',
    solution: `SELECT p.name
FROM patients p
LEFT JOIN medications m ON m.patient_id = p.patient_id
WHERE m.med_id IS NULL;`,
    ordered: false,
    tables: ['patients', 'medications'],
  },
  {
    id: 'join-active',
    section: 'sql-joins',
    prompt:
      'How many encounters began while the patient had at least one medication active on the admission date? Active means start_date on or before admit_date, and end_date on or after it — or no end date at all. Return a single number.',
    hint: 'Join medications to encounters on patient_id and put the date-range logic in WHERE — including the IS NULL branch for ongoing meds. A patient can have several active meds at once, so COUNT(DISTINCT e.encounter_id), not COUNT(*).',
    solution: `SELECT COUNT(DISTINCT e.encounter_id) AS n
FROM encounters e
JOIN medications m ON m.patient_id = e.patient_id
WHERE m.start_date <= e.admit_date
  AND (m.end_date IS NULL OR m.end_date >= e.admit_date);`,
    ordered: false,
    tables: ['encounters', 'medications'],
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
  {
    id: 'win-lag',
    section: 'sql-windows',
    prompt:
      "Return patient_id, admit_date, and days_since_prev — the number of days since that patient's previous encounter (NULL for their first one).",
    hint: "LAG(admit_date) OVER (PARTITION BY patient_id ORDER BY admit_date) reads the previous row's value inside each patient's partition. Wrap both dates in julianday() to subtract; the first visit has no previous row, so LAG returns NULL and the subtraction stays NULL.",
    solution: `SELECT patient_id,
       admit_date,
       julianday(admit_date) - julianday(LAG(admit_date) OVER (PARTITION BY patient_id ORDER BY admit_date)) AS days_since_prev
FROM encounters;`,
    ordered: false,
    tables: ['encounters'],
  },

  // --- 05/ Challenges ---
  {
    id: 'challenge-hba1c',
    section: 'sql-challenge',
    prompt:
      'The care team wants a follow-up list: every patient whose most recent HbA1c result is above 6.5 — two columns, name and value, one row per flagged patient.',
    hint: 'Three pieces you already know, stacked: filter labs to HbA1c and rank per patient with ROW_NUMBER() … ORDER BY taken_at DESC inside a CTE; keep rn = 1 AND value > 6.5; join patients for the name.',
    solution: `WITH ranked AS (
  SELECT e.patient_id,
         l.value,
         ROW_NUMBER() OVER (PARTITION BY e.patient_id ORDER BY l.taken_at DESC) AS rn
  FROM labs l
  JOIN encounters e ON e.encounter_id = l.encounter_id
  WHERE l.test_name = 'HbA1c'
)
SELECT p.name, r.value
FROM ranked r
JOIN patients p ON p.patient_id = r.patient_id
WHERE r.rn = 1 AND r.value > 6.5;`,
    ordered: false,
    tables: ['patients', 'encounters', 'labs'],
  },
  {
    id: 'challenge-burden',
    section: 'sql-challenge',
    prompt:
      "For every patient with more than 3 encounters, return name, encounters, and distinct_drugs — the number of different medications they have ever been on, with 0 (not NULL, not a missing row) for the patients who take nothing.",
    hint: 'A CTE with GROUP BY + HAVING finds the frequent patients. LEFT JOIN medications so the zero-drug patients survive, then COUNT(DISTINCT m.drug_name) — COUNT ignores NULLs, so the no-medication rows land on 0 by themselves.',
    solution: `WITH frequent AS (
  SELECT patient_id, COUNT(*) AS encounters
  FROM encounters
  GROUP BY patient_id
  HAVING COUNT(*) > 3
)
SELECT p.name,
       f.encounters,
       COUNT(DISTINCT m.drug_name) AS distinct_drugs
FROM frequent f
JOIN patients p ON p.patient_id = f.patient_id
LEFT JOIN medications m ON m.patient_id = f.patient_id
GROUP BY p.patient_id, p.name, f.encounters;`,
    ordered: false,
    tables: ['patients', 'encounters', 'medications'],
  },
]
