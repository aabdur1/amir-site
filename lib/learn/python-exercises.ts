// lib/learn/python-exercises.ts — the 11 checked exercises for the 09/ Python
// artifact. They mirror the 08/ SQL exercises one-for-one on the same dataset,
// so the SQL ↔ pandas mapping is explicit.
//
// Contract: every prompt ends with "Assign your answer to result." The checker
// (embedded in components/learn/python.tsx) runs the user's code and the
// canonical `solution` in separate fresh namespaces and compares the two
// `result`s positionally — column count then cell-by-cell, aliases/renames
// pass, canonical row sort unless `ordered: true`, numerics within 1e-9,
// NaN ≡ NaN. A groupby/value_counts result with keys in the index passes
// against a reset_index() solution (both forms are tried).
//
// To add an exercise: append an entry here with a unique id and an existing
// `section` id — numbering and section attachment are automatic.
//   resultType: 'dataframe' | 'series' (table-shaped, compared positionally)
//               | 'scalar' (single value, compared with 1e-9 tolerance)

export type PySectionId = 'py-filter' | 'py-groupby' | 'py-merge' | 'py-window'

export interface PyExercise {
  id: string
  section: PySectionId
  prompt: string
  hint: string
  solution: string
  resultType: 'dataframe' | 'series' | 'scalar'
  ordered: boolean
  tables: string[]
}

export const PY_EXERCISES: PyExercise[] = [
  // --- 01/ Filtering & sorting ---
  {
    id: 'py-filter-city',
    section: 'py-filter',
    prompt:
      'Return the name and birth_date of every patient who lives in Chicago, ordered by birth_date with the oldest patient first. Assign your answer to result.',
    hint: "Index the frame with a boolean mask — patients[patients['city'] == 'Chicago'] — then select [['name', 'birth_date']] and .sort_values('birth_date'). Ascending is the default, and the earliest birth dates are the oldest patients.",
    solution: `chicago = patients[patients['city'] == 'Chicago']
result = chicago[['name', 'birth_date']].sort_values('birth_date')`,
    resultType: 'dataframe',
    ordered: true,
    tables: ['patients'],
  },
  {
    id: 'py-filter-compound',
    section: 'py-filter',
    prompt:
      'Return the name and birth_date of every female patient born after 1980-01-01. Assign your answer to result.',
    hint: "Combine two masks with & and wrap each side in parentheses — & binds tighter than ==. birth_date is datetime64, so it compares directly against the string '1980-01-01'.",
    solution: `mask = (patients['sex'] == 'F') & (patients['birth_date'] > '1980-01-01')
result = patients[mask][['name', 'birth_date']]`,
    resultType: 'dataframe',
    ordered: false,
    tables: ['patients'],
  },

  // --- 02/ GroupBy & aggregation ---
  {
    id: 'py-group-count-dept',
    section: 'py-groupby',
    prompt:
      'Return each department and its encounter count — two columns, dept and encounter_count — sorted with the busiest department first. Assign your answer to result.',
    hint: "groupby('dept', as_index=False) with a named agg — .agg(encounter_count=('encounter_id', 'count')) — then sort_values(..., ascending=False). encounters['dept'].value_counts() also passes: it is the same table with dept in the index.",
    solution: `counts = encounters.groupby('dept', as_index=False).agg(encounter_count=('encounter_id', 'count'))
result = counts.sort_values('encounter_count', ascending=False)`,
    resultType: 'dataframe',
    ordered: true,
    tables: ['encounters'],
  },
  {
    id: 'py-group-having',
    section: 'py-groupby',
    prompt:
      'Return each department whose average length of stay is longer than 3 days, together with that average — two columns, dept and avg_los. Length of stay in days = (discharge_date - admit_date).dt.days. Assign your answer to result.',
    hint: 'Compute los first with .assign(), aggregate with groupby + mean, then filter the aggregated frame with a second mask. pandas has no HAVING keyword — HAVING is just a mask applied after the groupby.',
    solution: `los = (encounters['discharge_date'] - encounters['admit_date']).dt.days
by_dept = encounters.assign(los=los).groupby('dept', as_index=False).agg(avg_los=('los', 'mean'))
result = by_dept[by_dept['avg_los'] > 3]`,
    resultType: 'dataframe',
    ordered: false,
    tables: ['encounters'],
  },
  {
    id: 'py-group-multi',
    section: 'py-groupby',
    prompt:
      'Return the patient_id and encounter count of every patient with more than 3 encounters — two columns, patient_id and encounter_count. Assign your answer to result.',
    hint: "Group by patient_id, count, then mask the aggregated frame with counts['encounter_count'] > 3 — the HAVING position again.",
    solution: `counts = encounters.groupby('patient_id', as_index=False).agg(encounter_count=('encounter_id', 'count'))
result = counts[counts['encounter_count'] > 3]`,
    resultType: 'dataframe',
    ordered: false,
    tables: ['encounters'],
  },

  // --- 03/ Merging & the fan-out trap ---
  {
    id: 'py-merge-inner',
    section: 'py-merge',
    prompt:
      "Return every encounter's patient name and department — two columns, name and dept, one row per encounter. Assign your answer to result.",
    hint: "encounters.merge(patients, on='patient_id') — how='inner' is the default, and every encounter has a patient, so nothing is lost. Then select the two columns.",
    solution: `result = encounters.merge(patients, on='patient_id')[['name', 'dept']]`,
    resultType: 'dataframe',
    ordered: false,
    tables: ['patients', 'encounters'],
  },
  {
    id: 'py-merge-left',
    section: 'py-merge',
    prompt:
      "Return every patient's name and encounter count — two columns, name and encounter_count — including the patients with zero encounters, whose count must be 0, not NaN. Assign your answer to result.",
    hint: "Aggregate encounters per patient_id first, then patients.merge(counts, on='patient_id', how='left') keeps the patients with no encounters — their count comes back NaN. fillna(0) turns the NaNs into real zeros.",
    solution: `counts = encounters.groupby('patient_id', as_index=False).agg(encounter_count=('encounter_id', 'count'))
result = patients.merge(counts, on='patient_id', how='left')[['name', 'encounter_count']]
result['encounter_count'] = result['encounter_count'].fillna(0).astype(int)`,
    resultType: 'dataframe',
    ordered: false,
    tables: ['patients', 'encounters'],
  },
  {
    id: 'py-merge-fanout',
    section: 'py-merge',
    prompt:
      "First run this and look closely: merged = encounters.merge(labs, on='encounter_id').merge(patients, on='patient_id'); result = merged.groupby('name', as_index=False).agg(n=('encounter_id', 'count')) — n is each patient's LAB count, not encounter count, because the one-to-many merge fanned the rows out. Then write the checked answer: each patient's name, true encounter count, and lab count — three columns, name, encounters, labs, one row per patient who has labs. Assign your answer to result.",
    hint: "After both merges there is one row per lab. ('encounter_id', 'nunique') collapses the duplicates back to true encounters — pandas' COUNT(DISTINCT) — while ('lab_id', 'count') is already right because each lab row appears exactly once.",
    solution: `merged = encounters.merge(labs, on='encounter_id').merge(patients, on='patient_id')
per_patient = merged.groupby(['patient_id', 'name'], as_index=False).agg(
    encounters=('encounter_id', 'nunique'),
    labs=('lab_id', 'count'),
)
result = per_patient[['name', 'encounters', 'labs']]`,
    resultType: 'dataframe',
    ordered: false,
    tables: ['patients', 'encounters', 'labs'],
  },

  // --- 04/ Window operations ---
  {
    id: 'py-window-cumcount',
    section: 'py-window',
    prompt:
      "Return patient_id, admit_date, and a visit_number that numbers each patient's encounters in admit_date order (1 = that patient's earliest encounter) — three columns. Assign your answer to result.",
    hint: "Sort by ['patient_id', 'admit_date'] first, then groupby('patient_id').cumcount() + 1 — pandas' ROW_NUMBER. cumcount starts at 0, hence the + 1.",
    solution: `ordered = encounters.sort_values(['patient_id', 'admit_date'])
result = ordered[['patient_id', 'admit_date']].copy()
result['visit_number'] = ordered.groupby('patient_id').cumcount() + 1`,
    resultType: 'dataframe',
    ordered: false,
    tables: ['encounters'],
  },
  {
    id: 'py-window-latest',
    section: 'py-window',
    prompt:
      "Return each patient's most recent HbA1c result — three columns: name, value, taken_at. One row per patient who has at least one HbA1c lab. Assign your answer to result.",
    hint: "Filter labs to HbA1c, merge encounters' patient_id in via encounter_id, then sort_values('taken_at') and groupby('patient_id').tail(1) keeps each patient's latest row — the latest-row-per-group pattern. Merge names on last.",
    solution: `hba1c = labs[labs['test_name'] == 'HbA1c'].merge(
    encounters[['encounter_id', 'patient_id']], on='encounter_id')
latest = hba1c.sort_values('taken_at').groupby('patient_id').tail(1)
result = latest.merge(patients[['patient_id', 'name']], on='patient_id')[['name', 'value', 'taken_at']]`,
    resultType: 'dataframe',
    ordered: false,
    tables: ['patients', 'encounters', 'labs'],
  },
  {
    id: 'py-window-cumsum',
    section: 'py-window',
    prompt:
      "Return patient_id, admit_date, and cumulative_days — the running total of each patient's length-of-stay days across their encounters in admit_date order — three columns. Length of stay = (discharge_date - admit_date).dt.days. Assign your answer to result.",
    hint: "Sort by ['patient_id', 'admit_date'], compute the per-encounter los column, then groupby('patient_id')['los'].cumsum() — a running total that restarts for every patient, like SUM(...) OVER (PARTITION BY ...).",
    solution: `ordered = encounters.sort_values(['patient_id', 'admit_date']).copy()
ordered['los_days'] = (ordered['discharge_date'] - ordered['admit_date']).dt.days
ordered['cumulative_days'] = ordered.groupby('patient_id')['los_days'].cumsum()
result = ordered[['patient_id', 'admit_date', 'cumulative_days']]`,
    resultType: 'dataframe',
    ordered: false,
    tables: ['encounters'],
  },
]
