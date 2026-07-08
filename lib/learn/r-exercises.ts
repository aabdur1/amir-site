// lib/learn/r-exercises.ts — the 19 checked exercises for the 10/ R artifact.
// They mirror the 08/ SQL and 09/ Python exercises one-for-one on the same
// dataset, so the SQL ↔ pandas ↔ dplyr mapping is explicit; each section
// escalates and the final challenge section combines concepts.
//
// Contract: every prompt ends with "Assign your answer to result." The checker
// (lib/learn/r-harness.ts) runs the user's code and the canonical `solution`
// in separate fresh environments and compares the two `result`s positionally —
// column count then cell-by-cell, renames pass, canonical row sort unless
// `ordered: true`, numerics within 1e-9, NA ≡ NA. R has no index, so grouped
// summaries already carry their keys as columns and compare directly.
//
// To add an exercise: append an entry with a unique id and an existing
// `section` id — numbering and section attachment are automatic.
//   resultType: 'dataframe' (table-shaped, compared positionally)
//               | 'vector' (atomic vector — compared as a one-column table)
//               | 'scalar' (single value, compared with 1e-9 tolerance)

export type RSectionId = 'r-filter' | 'r-group' | 'r-join' | 'r-window' | 'r-challenge'

export interface RExercise {
  id: string
  section: RSectionId
  prompt: string
  hint: string
  solution: string
  resultType: 'dataframe' | 'vector' | 'scalar'
  ordered: boolean
  tables: string[]
}

export const R_EXERCISES: RExercise[] = [
  // --- 01/ Filtering & sorting ---
  {
    id: 'r-filter-city',
    section: 'r-filter',
    prompt:
      'Return the name and birth_date of every patient who lives in Chicago, ordered by birth_date with the oldest patient first. Assign your answer to result.',
    hint: "filter(city == 'Chicago') keeps the matching rows — no mask, no brackets. Chain |> arrange(birth_date) |> select(name, birth_date); ascending is the default, and the earliest birth dates are the oldest patients.",
    solution: `result <- patients |>
  filter(city == 'Chicago') |>
  arrange(birth_date) |>
  select(name, birth_date)`,
    resultType: 'dataframe',
    ordered: true,
    tables: ['patients'],
  },
  {
    id: 'r-filter-compound',
    section: 'r-filter',
    prompt:
      'Return the name and birth_date of every female patient born after 1980-01-01. Assign your answer to result.',
    hint: "Two conditions in one filter() are AND: filter(sex == 'F', birth_date > as.Date('1980-01-01')) — no parentheses trap like pandas' &. birth_date is a Date, and R will also coerce a bare '1980-01-01' string for the comparison.",
    solution: `result <- patients |>
  filter(sex == 'F', birth_date > as.Date('1980-01-01')) |>
  select(name, birth_date)`,
    resultType: 'dataframe',
    ordered: false,
    tables: ['patients'],
  },
  {
    id: 'r-filter-null',
    section: 'r-filter',
    prompt:
      'Return the drug_name and start_date of every medication that is still ongoing — the ones with no end date recorded. Assign your answer to result.',
    hint: 'NA never equals anything, even itself — filter(end_date == NA) matches nothing, silently. The test is is.na(end_date), the same trap as NaN in pandas.',
    solution: `result <- medications |>
  filter(is.na(end_date)) |>
  select(drug_name, start_date)`,
    resultType: 'dataframe',
    ordered: false,
    tables: ['medications'],
  },

  // --- 02/ Group & summarise ---
  {
    id: 'r-group-count-dept',
    section: 'r-group',
    prompt:
      'Return each department and its encounter count — two columns, dept and encounter_count — sorted with the busiest department first. Assign your answer to result.',
    hint: "group_by(dept) |> summarise(encounter_count = n()) |> arrange(desc(encounter_count)). n() counts rows in each group; count(dept, sort = TRUE) is the one-verb shortcut and also passes.",
    solution: `result <- encounters |>
  group_by(dept) |>
  summarise(encounter_count = n()) |>
  arrange(desc(encounter_count))`,
    resultType: 'dataframe',
    ordered: true,
    tables: ['encounters'],
  },
  {
    id: 'r-group-having',
    section: 'r-group',
    prompt:
      'Return each department whose average length of stay is longer than 3 days, together with that average — two columns, dept and avg_los. Length of stay in days = as.numeric(discharge_date - admit_date). Assign your answer to result.',
    hint: 'mutate() the los column first, summarise(avg_los = mean(los)) per dept, then filter(avg_los > 3) on the summarised frame. dplyr has no HAVING keyword — HAVING is just filter() placed after summarise().',
    solution: `result <- encounters |>
  mutate(los = as.numeric(discharge_date - admit_date)) |>
  group_by(dept) |>
  summarise(avg_los = mean(los)) |>
  filter(avg_los > 3)`,
    resultType: 'dataframe',
    ordered: false,
    tables: ['encounters'],
  },
  {
    id: 'r-group-multi',
    section: 'r-group',
    prompt:
      'Return the patient_id and encounter count of every patient with more than 3 encounters — two columns, patient_id and encounter_count. Assign your answer to result.',
    hint: 'Group by patient_id, summarise with n(), then filter(encounter_count > 3) — the HAVING position again.',
    solution: `result <- encounters |>
  group_by(patient_id) |>
  summarise(encounter_count = n()) |>
  filter(encounter_count > 3)`,
    resultType: 'dataframe',
    ordered: false,
    tables: ['encounters'],
  },
  {
    id: 'r-group-year',
    section: 'r-group',
    prompt:
      'Return encounter counts per department per year — three columns: yr (the year of admit_date), dept, encounter_count. Assign your answer to result.',
    hint: "as.integer(format(admit_date, '%Y')) extracts the year — mutate() it as a column and group by both keys. summarise() on a two-key grouping keeps the result grouped by the first key; .groups = 'drop' returns a plain frame (the grouped form passes too — the checker coerces both).",
    solution: `result <- encounters |>
  mutate(yr = as.integer(format(admit_date, '%Y'))) |>
  group_by(yr, dept) |>
  summarise(encounter_count = n(), .groups = 'drop')`,
    resultType: 'dataframe',
    ordered: false,
    tables: ['encounters'],
  },
  {
    id: 'r-group-share',
    section: 'r-group',
    prompt:
      "Return each department's share of all encounters as a percentage rounded to one decimal — two columns, dept and pct — with the busiest department first. Assign your answer to result.",
    hint: 'count(dept) gives one row per dept with a column n; sum(n) inside mutate() sees the whole column, so pct = round(100 * n / sum(n), 1). arrange(desc(pct)), then select the two asked-for columns.',
    solution: `result <- encounters |>
  count(dept) |>
  mutate(pct = round(100 * n / sum(n), 1)) |>
  arrange(desc(pct)) |>
  select(dept, pct)`,
    resultType: 'dataframe',
    ordered: true,
    tables: ['encounters'],
  },

  // --- 03/ Joins & the fan-out trap ---
  {
    id: 'r-join-inner',
    section: 'r-join',
    prompt:
      "Return every encounter's patient name and department — two columns, name and dept, one row per encounter. Assign your answer to result.",
    hint: "inner_join(patients, by = 'patient_id') — every encounter has a patient, so nothing is lost. Then select(name, dept). The join verbs read like the SQL they mirror.",
    solution: `result <- encounters |>
  inner_join(patients, by = 'patient_id') |>
  select(name, dept)`,
    resultType: 'dataframe',
    ordered: false,
    tables: ['patients', 'encounters'],
  },
  {
    id: 'r-join-left',
    section: 'r-join',
    prompt:
      "Return every patient's name and encounter count — two columns, name and encounter_count — including the patients with zero encounters, whose count must be 0, not NA. Assign your answer to result.",
    hint: "Summarise encounters per patient_id first, then patients |> left_join(counts) keeps the patients with no encounters — their count comes back NA. coalesce(encounter_count, 0L) is dplyr's fillna(0).",
    solution: `counts <- encounters |>
  group_by(patient_id) |>
  summarise(encounter_count = n())
result <- patients |>
  left_join(counts, by = 'patient_id') |>
  mutate(encounter_count = coalesce(encounter_count, 0L)) |>
  select(name, encounter_count)`,
    resultType: 'dataframe',
    ordered: false,
    tables: ['patients', 'encounters'],
  },
  {
    id: 'r-join-fanout',
    section: 'r-join',
    prompt:
      "First run this and look closely: merged <- encounters |> inner_join(labs, by = 'encounter_id') |> inner_join(patients, by = 'patient_id'); result <- merged |> group_by(name) |> summarise(n = n()) — n is each patient's LAB count, not encounter count, because the one-to-many join fanned the rows out. Then write the checked answer: each patient's name, true encounter count, and lab count — three columns, name, encounters, labs, one row per patient who has labs. Assign your answer to result.",
    hint: "After both joins there is one row per lab. n_distinct(encounter_id) collapses the duplicates back to true encounters — R's COUNT(DISTINCT) — while n() is already right for labs because each lab row appears exactly once.",
    solution: `merged <- encounters |>
  inner_join(labs, by = 'encounter_id') |>
  inner_join(patients, by = 'patient_id')
result <- merged |>
  group_by(patient_id, name) |>
  summarise(encounters = n_distinct(encounter_id), labs = n(), .groups = 'drop') |>
  select(name, encounters, labs)`,
    resultType: 'dataframe',
    ordered: false,
    tables: ['patients', 'encounters', 'labs'],
  },
  {
    id: 'r-join-anti',
    section: 'r-join',
    prompt:
      'Return the name of every patient with no medications at all — one column, name. Assign your answer to result.',
    hint: "dplyr has the anti-join as a first-class verb: anti_join(medications, by = 'patient_id') keeps exactly the patients who never appear in medications — the move pandas had to spell with ~isin().",
    solution: `result <- patients |>
  anti_join(medications, by = 'patient_id') |>
  select(name)`,
    resultType: 'dataframe',
    ordered: false,
    tables: ['patients', 'medications'],
  },
  {
    id: 'r-join-active',
    section: 'r-join',
    prompt:
      'How many encounters began while the patient had at least one medication active on the admission date? Active means start_date on or before admit_date, and end_date on or after it — or no end date at all. Return a single number. Assign your answer to result.',
    hint: 'Join medications onto encounters by patient_id, filter the date range — with is.na() as the ongoing branch — then n_distinct(encounter_id), since several active meds fan the same encounter out.',
    solution: `merged <- encounters |>
  inner_join(medications, by = 'patient_id')
active <- merged |>
  filter(start_date <= admit_date, is.na(end_date) | end_date >= admit_date)
result <- n_distinct(active$encounter_id)`,
    resultType: 'scalar',
    ordered: false,
    tables: ['encounters', 'medications'],
  },

  // --- 04/ Window operations ---
  {
    id: 'r-window-rownum',
    section: 'r-window',
    prompt:
      "Return patient_id, admit_date, and a visit_number that numbers each patient's encounters in admit_date order (1 = that patient's earliest encounter) — three columns. Assign your answer to result.",
    hint: "arrange(patient_id, admit_date) first, then group_by(patient_id) |> mutate(visit_number = row_number()) — a grouped mutate() keeps every row, and row_number() is literally SQL's ROW_NUMBER. ungroup() before select.",
    solution: `result <- encounters |>
  arrange(patient_id, admit_date) |>
  group_by(patient_id) |>
  mutate(visit_number = row_number()) |>
  ungroup() |>
  select(patient_id, admit_date, visit_number)`,
    resultType: 'dataframe',
    ordered: false,
    tables: ['encounters'],
  },
  {
    id: 'r-window-latest',
    section: 'r-window',
    prompt:
      "Return each patient's most recent HbA1c result — three columns: name, value, taken_at. One row per patient who has at least one HbA1c lab. Assign your answer to result.",
    hint: "Filter labs to HbA1c, join encounters' patient_id in via encounter_id, then group_by(patient_id) |> slice_max(taken_at, n = 1) keeps each patient's latest row — the latest-row-per-group pattern in one verb. Join names on last.",
    solution: `hba1c <- labs |>
  filter(test_name == 'HbA1c') |>
  inner_join(select(encounters, encounter_id, patient_id), by = 'encounter_id')
latest <- hba1c |>
  group_by(patient_id) |>
  slice_max(taken_at, n = 1) |>
  ungroup()
result <- latest |>
  inner_join(select(patients, patient_id, name), by = 'patient_id') |>
  select(name, value, taken_at)`,
    resultType: 'dataframe',
    ordered: false,
    tables: ['patients', 'encounters', 'labs'],
  },
  {
    id: 'r-window-cumsum',
    section: 'r-window',
    prompt:
      "Return patient_id, admit_date, and cumulative_days — the running total of each patient's length-of-stay days across their encounters in admit_date order — three columns. Length of stay = as.numeric(discharge_date - admit_date). Assign your answer to result.",
    hint: "arrange(patient_id, admit_date), mutate() the per-encounter los, then a grouped mutate(cumulative_days = cumsum(los)) — a running total that restarts for every patient, like SUM(...) OVER (PARTITION BY ...).",
    solution: `result <- encounters |>
  arrange(patient_id, admit_date) |>
  mutate(los_days = as.numeric(discharge_date - admit_date)) |>
  group_by(patient_id) |>
  mutate(cumulative_days = cumsum(los_days)) |>
  ungroup() |>
  select(patient_id, admit_date, cumulative_days)`,
    resultType: 'dataframe',
    ordered: false,
    tables: ['encounters'],
  },
  {
    id: 'r-window-lag',
    section: 'r-window',
    prompt:
      "Return patient_id, admit_date, and days_since_prev — the number of days since that patient's previous encounter (NA for their first one). Assign your answer to result.",
    hint: "Sort by patient and date, then a grouped mutate with lag(admit_date) reads the previous visit's date within each patient — dplyr's lag() IS SQL's LAG. Subtract and as.numeric(); a first visit has nothing to lag in, so it stays NA.",
    solution: `result <- encounters |>
  arrange(patient_id, admit_date) |>
  group_by(patient_id) |>
  mutate(days_since_prev = as.numeric(admit_date - lag(admit_date))) |>
  ungroup() |>
  select(patient_id, admit_date, days_since_prev)`,
    resultType: 'dataframe',
    ordered: false,
    tables: ['encounters'],
  },

  // --- 05/ Challenges ---
  {
    id: 'r-challenge-hba1c',
    section: 'r-challenge',
    prompt:
      'The care team wants a follow-up list: every patient whose most recent HbA1c result is above 6.5 — two columns, name and value, one row per flagged patient. Assign your answer to result.',
    hint: 'Pieces you already know, chained: filter labs to HbA1c, join patient_id in via encounters, slice_max(taken_at) per patient for the latest, then filter(value > 6.5) and one last join for the names.',
    solution: `hba1c <- labs |>
  filter(test_name == 'HbA1c') |>
  inner_join(select(encounters, encounter_id, patient_id), by = 'encounter_id')
result <- hba1c |>
  group_by(patient_id) |>
  slice_max(taken_at, n = 1) |>
  ungroup() |>
  filter(value > 6.5) |>
  inner_join(select(patients, patient_id, name), by = 'patient_id') |>
  select(name, value)`,
    resultType: 'dataframe',
    ordered: false,
    tables: ['patients', 'encounters', 'labs'],
  },
  {
    id: 'r-challenge-burden',
    section: 'r-challenge',
    prompt:
      'For every patient with more than 3 encounters, return name, encounters, and distinct_drugs — the number of different medications they have ever been on, with 0 (not NA, not a missing row) for the patients who take nothing. Assign your answer to result.',
    hint: "Count encounters per patient and keep > 3, left_join medications so the zero-drug patients survive, then n_distinct(drug_name, na.rm = TRUE) — na.rm skips the NA a no-match left join leaves behind, so those patients land on 0 by themselves.",
    solution: `frequent <- encounters |>
  group_by(patient_id) |>
  summarise(encounters = n()) |>
  filter(encounters > 3)
result <- frequent |>
  left_join(medications, by = 'patient_id') |>
  group_by(patient_id, encounters) |>
  summarise(distinct_drugs = n_distinct(drug_name, na.rm = TRUE), .groups = 'drop') |>
  inner_join(select(patients, patient_id, name), by = 'patient_id') |>
  select(name, encounters, distinct_drugs)`,
    resultType: 'dataframe',
    ordered: false,
    tables: ['patients', 'encounters', 'medications'],
  },
]
