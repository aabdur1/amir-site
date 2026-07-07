// lib/learn/python-exercises.ts — the 19 checked exercises for the 09/ Python
// artifact. They mirror the 08/ SQL exercises one-for-one on the same dataset,
// so the SQL ↔ pandas mapping is explicit; each section escalates and the
// final challenge section combines concepts.
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

export type PySectionId = 'py-filter' | 'py-groupby' | 'py-merge' | 'py-window' | 'py-challenge'

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
  {
    id: 'py-filter-null',
    section: 'py-filter',
    prompt:
      'Return the drug_name and start_date of every medication that is still ongoing — the ones with no end date recorded. Assign your answer to result.',
    hint: 'NaN/NaT never equals anything, even itself — end_date == None matches nothing, silently. Mask with .isna() instead.',
    solution: `result = medications[medications['end_date'].isna()][['drug_name', 'start_date']]`,
    resultType: 'dataframe',
    ordered: false,
    tables: ['medications'],
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
  {
    id: 'py-group-year',
    section: 'py-groupby',
    prompt:
      'Return encounter counts per department per year — three columns: yr (the year of admit_date), dept, encounter_count. Assign your answer to result.',
    hint: "encounters['admit_date'].dt.year gives the year — .assign() it as a column and group by both keys with groupby(['yr', 'dept'], as_index=False). A two-key groupby without as_index=False returns a MultiIndex result, which also passes.",
    solution: `by_year = encounters.assign(yr=encounters['admit_date'].dt.year)
result = by_year.groupby(['yr', 'dept'], as_index=False).agg(encounter_count=('encounter_id', 'count'))`,
    resultType: 'dataframe',
    ordered: false,
    tables: ['encounters'],
  },
  {
    id: 'py-group-share',
    section: 'py-groupby',
    prompt:
      "Return each department's share of all encounters as a percentage rounded to one decimal — two columns, dept and pct — with the busiest department first. Assign your answer to result.",
    hint: 'value_counts(normalize=True) gives fractions that already come sorted busiest-first — multiply by 100 and .round(1). Counting per dept and dividing by len(encounters) works too.',
    solution: `pct = (encounters['dept'].value_counts(normalize=True) * 100).round(1)
result = pct.reset_index()
result.columns = ['dept', 'pct']`,
    resultType: 'dataframe',
    ordered: true,
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
  {
    id: 'py-merge-antijoin',
    section: 'py-merge',
    prompt:
      'Return the name of every patient with no medications at all — one column, name. Assign your answer to result.',
    hint: "The anti-join in pandas is a negated membership mask: ~patients['patient_id'].isin(medications['patient_id']) keeps exactly the patients who never appear in medications.",
    solution: `result = patients[~patients['patient_id'].isin(medications['patient_id'])][['name']]`,
    resultType: 'dataframe',
    ordered: false,
    tables: ['patients', 'medications'],
  },
  {
    id: 'py-merge-active',
    section: 'py-merge',
    prompt:
      'How many encounters began while the patient had at least one medication active on the admission date? Active means start_date on or before admit_date, and end_date on or after it — or no end date at all. Return a single number. Assign your answer to result.',
    hint: 'Merge medications onto encounters by patient_id, mask the date range — with .isna() as the ongoing branch — then .nunique() on encounter_id, since several active meds fan the same encounter out.',
    solution: `merged = encounters.merge(medications, on='patient_id')
active = merged[(merged['start_date'] <= merged['admit_date']) &
                (merged['end_date'].isna() | (merged['end_date'] >= merged['admit_date']))]
result = active['encounter_id'].nunique()`,
    resultType: 'scalar',
    ordered: false,
    tables: ['encounters', 'medications'],
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
  {
    id: 'py-window-lag',
    section: 'py-window',
    prompt:
      "Return patient_id, admit_date, and days_since_prev — the number of days since that patient's previous encounter (NaN for their first one). Assign your answer to result.",
    hint: "Sort by patient and date, then groupby('patient_id')['admit_date'].shift() reads the previous visit's date within each patient — pandas' LAG. Subtract and take .dt.days; a first visit has nothing to shift in, so it stays NaT and the days come out NaN.",
    solution: `ordered = encounters.sort_values(['patient_id', 'admit_date'])
result = ordered[['patient_id', 'admit_date']].copy()
prev = ordered.groupby('patient_id')['admit_date'].shift()
result['days_since_prev'] = (ordered['admit_date'] - prev).dt.days`,
    resultType: 'dataframe',
    ordered: false,
    tables: ['encounters'],
  },

  // --- 05/ Challenges ---
  {
    id: 'py-challenge-hba1c',
    section: 'py-challenge',
    prompt:
      'The care team wants a follow-up list: every patient whose most recent HbA1c result is above 6.5 — two columns, name and value, one row per flagged patient. Assign your answer to result.',
    hint: 'Pieces you already know, chained: filter labs to HbA1c, merge patient_id in via encounters, sort + groupby.tail(1) for the latest per patient, then a value > 6.5 mask and one last merge for the names.',
    solution: `hba1c = labs[labs['test_name'] == 'HbA1c'].merge(
    encounters[['encounter_id', 'patient_id']], on='encounter_id')
latest = hba1c.sort_values('taken_at').groupby('patient_id').tail(1)
flagged = latest[latest['value'] > 6.5]
result = flagged.merge(patients[['patient_id', 'name']], on='patient_id')[['name', 'value']]`,
    resultType: 'dataframe',
    ordered: false,
    tables: ['patients', 'encounters', 'labs'],
  },
  {
    id: 'py-challenge-burden',
    section: 'py-challenge',
    prompt:
      'For every patient with more than 3 encounters, return name, encounters, and distinct_drugs — the number of different medications they have ever been on, with 0 (not NaN, not a missing row) for the patients who take nothing. Assign your answer to result.',
    hint: "Count encounters per patient and keep > 3, left-merge medications so the zero-drug patients survive, then agg ('drug_name', 'nunique') — nunique skips NaN, so the no-medication rows land on 0 by themselves.",
    solution: `counts = encounters.groupby('patient_id', as_index=False).agg(encounters=('encounter_id', 'count'))
frequent = counts[counts['encounters'] > 3]
merged = frequent.merge(medications, on='patient_id', how='left')
per_patient = merged.groupby('patient_id', as_index=False).agg(
    encounters=('encounters', 'first'),
    distinct_drugs=('drug_name', 'nunique'),
)
result = per_patient.merge(patients[['patient_id', 'name']], on='patient_id')[['name', 'encounters', 'distinct_drugs']]`,
    resultType: 'dataframe',
    ordered: false,
    tables: ['patients', 'encounters', 'medications'],
  },
]
