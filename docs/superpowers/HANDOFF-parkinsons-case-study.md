# Handoff: Parkinson's case study (/work 04)

**Written 2026-08-07** at the end of the DocDefend session, for a fresh session to pick up.

## The task

Publish the Parkinson's voice screening project as `/work/parkinsons-voice-screening`, case study **04**.

## Why this is not blocked (it was believed to be)

Earlier notes said this was blocked on Amir supplying headline numbers. **It is not.** The repo `aabdur1/parkinsons-voice-screening` is PUBLIC on GitHub and contains `parkinsons_analysis.ipynb` with the numbers in its cell outputs, plus a dozen result plots. It is simply not cloned locally, which is why it read as blocked.

This is the same situation DocDefend was in: the evidence lived in a repo rather than a document.

**WIEIAD is still genuinely blocked** — no repo exists under the account.

## First step

Clone it somewhere outside this repo, then read the notebook's cell outputs:

```bash
gh repo clone aabdur1/parkinsons-voice-screening /tmp/parkinsons
```

Files present: `parkinsons_analysis.ipynb`, `README.md`, `requirements.txt`, and plots —
`lr_forest_plot.png`, `lr_calibration_plot.png`, `lr_calibration_threshold.png`,
`lr_threshold_plot.png`, `cv_comparison_heatmap.png`, `results_heatmap.png`,
`feature_importance.png`, `feature_selection.png`, `eda_demographics.png`,
`eda_feature_distributions.png`.

## Numbers currently claimed on the homepage card

`components/projects.tsx`, the Parkinson's entry, currently asserts:

> Binary classification of Parkinson's patients vs healthy controls from sustained vowel recordings (n=81). Extracted 167 acoustic features (MFCCs, jitter/shimmer, spectral contrast) across 4 classifier families; LR odds ratios, Hosmer-Lemeshow calibration, and Youden's J threshold optimization for clinical interpretability. Best model AUC 0.94 (0.88–0.90 cross-validated).

**Every one of these must be re-verified against the notebook before it goes on a case-study page.** They were written from memory, not from source. If any number disagrees, the notebook wins and the projects card should be corrected too.

## The hard constraint

Build a verified-facts table before writing any prose, exactly as
`docs/superpowers/specs/2026-08-04-docdefend-case-study-design.md` does. **No number
reaches the page without a row naming its source cell or file.** That discipline is
what makes these pages defensible in an interview, and it caught several
near-misses on DocDefend.

Be especially careful to distinguish:
- test-set AUC vs cross-validated AUC (the card claims 0.94 and 0.88–0.90 — confirm which is which)
- n=81 — is that total, or per class?
- 167 features — extracted, or retained after selection?

## What already exists (do not rebuild)

- **Schema:** `CaseStudy` in `lib/work/case-studies.ts` supports `metrics`, `bars`
  (paired before/after), `embed` (Tableau), `figure` (drawn SVG), and `plate`
  (screenshot mounted print). A section-level boolean flag renders each.
- **Plate component:** `components/work/case-study-plate.tsx`. One of the repo's
  existing plots is likely the right plate — the forest plot or the CV heatmap.
  Crop with `sharp` (already a dependency) and put it in `public/work/`.
- **Figure registry:** `FIGURES` in `case-study-article.tsx`, keyed by
  `CaseStudyFigure['kind']`. Adding a new drawn diagram means adding a kind to the
  union AND a registry entry — a missing entry fails to compile, by design.
- **Tests:** `lib/work/case-studies.test.ts` will need its count bumped 3 → 4, and
  the `getAdjacentCaseStudies` test that pins `docdefend-agent` as last will break —
  that is expected, fix it rather than reverting.

## Gotchas that cost time last session

1. **Tailwind v4 cascade layers.** Anything declared unlayered in `globals.css`
   (e.g. `.reg-mark { display: block }`) outranks every Tailwind utility, so
   `class="reg-mark hidden lg:block"` renders at all breakpoints. Gate on a plain
   wrapper div. jsdom does not model this — only a browser's computed style shows it.
   Documented in `CLAUDE.md` Key Conventions.
2. **SVG figures:** the article column is `max-w-5xl px-6`, so a 320px viewport gives
   a 272px content box. A drawn figure should use `viewBox="0 0 272 …"` to render 1:1
   there and keep 12px labels at 12px.
3. **Verify the served build, not the running server.** A stale `next start` will
   happily serve old markup with a 200. Grep the served HTML for the change.
4. **`gh pr merge` has no `-q` flag** — it prints usage and does not merge. Always
   confirm `state=MERGED` before deleting any branch.

## Verification gates before publishing

`npm run build`, `npm run lint` (2 documented pre-existing errors only), `npm test`
(currently 334), a real-browser 320px `scrollWidth === 320` check, dark mode, and
every outbound link returning 200.

## After this ships

The resume refresh becomes worth doing: `~/job_search/resume.md` currently makes
**zero** mention of `/work`, and the export pipeline is
`node ~/job_search/scripts/export-resume.mjs` → copy to `public/`. With four
published studies it is worth pointing at amirabdurrahim.com/work.
