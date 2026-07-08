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
]
