# Parkinson's Voice Screening Case Study — Design

**Date:** 2026-08-07
**Status:** Implemented from the 2026-08-07 handoff (`docs/superpowers/HANDOFF-parkinsons-case-study.md`)
**Scope:** Publish `/work/parkinsons-voice-screening` as case study 04; correct the
homepage projects card, whose headline numbers do not survive verification.

## Problem

The Parkinson's project sat as an emphasized-tier card linking out to GitHub, with
numbers written from memory. The handoff established the evidence was never blocked:
`aabdur1/parkinsons-voice-screening` is public and `parkinsons_analysis.ipynb` has
committed cell outputs. Verification against those outputs shows the card's headline
claims are wrong — see Claims rejected.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Arc | **The best number in the notebook is the one the analysis refuses to headline** | The notebook's own discussion says Model 4's CV AUC 0.912 is age-driven and "the honest assessment of voice-based PD detection is Models 1–3". That refusal — age confound found in EDA, curse of dimensionality demonstrated, calibration and thresholds reported — is a stronger analyst story than any inflated AUC, and it is fully sourced. |
| Visual | **Plate only: the LR odds-ratio forest plot** | 1200×1050, legible at column width, and every CI crossing 1.0 *is* the honest-reporting story. The CV heatmap (2629×880) was considered and rejected: its cell annotations fall below legible size at the article's ~975px column. No new drawn figure — keeps scope at zero new components. |
| Bars | Age alone (0.864) vs best voice-only (0.775); all-165 (0.714) vs filtered-85 (0.775) | The two central comparisons, rendered by the existing PairedBars component with exact notebook values. |
| Accent | `mauve` | Matches the existing projects-card accent, same reasoning as DocDefend's sapphire. |
| Slug / number | `parkinsons-voice-screening` / `04` | Slug matches the repo name and the quarantined draft. |
| Homepage card | Corrected in the same PR, points inward at `/work/parkinsons-voice-screening` | Handoff: "If any number disagrees, the notebook wins and the projects card should be corrected too." DocDefend precedent for the inward link. |

## Verified facts

Source of truth: committed cell outputs of `parkinsons_analysis.ipynb` in
`aabdur1/parkinsons-voice-screening` (cloned 2026-08-07). Cell numbers are 0-based
notebook cell indices. **No number enters the page without a row here.**

| Fact | Source | Verified |
|---|---|---|
| 81 participants: 41 HC, 40 PwPD | cell 3 output: `Loaded 81 samples: {'HC': 41, 'PwPD': 40}` | ✓ n=81 is TOTAL; per-class is 41/40 |
| Sex 44 F / 37 M, balanced across groups (χ² p = 0.3201, ns) | cells 3, 9 outputs | ✓ |
| Sustained /a/ vowel, mono WAV, 8 kHz ("telephone-quality") | README data section + cell 14/39 markdown (4 kHz Nyquist reasoning matches 8 kHz) | ✓ |
| 80/20 stratified split, seed 42 → train 64 (32/32), test 17 (9 HC / 8 PwPD) | cell 7 output | ✓ |
| Age: HC 47.7 ± 14.3 [18–79]; PwPD 67.0 ± 9.0 [43–85]; gap 19.3 yrs; t-test p < 0.0001 | cell 9 output | ✓ |
| **Age alone → AUC 0.864** | cell 9 output: `⚠ CONFOUND WARNING: Age alone → AUC = 0.864` | ✓ |
| Speech features: 17 (Parselmouth: duration, voiced fraction, pitch, intensity, jitter, shimmer, HNR, F1–F4) | cell 19 output: `Model 1: Speech Only: 17 features` (cell 17 markdown says "15" — stale, output wins) | ✓ |
| Baseline spectral: 80 (precalculated LPC/LAR/cepstral/MFCC means+vars) | cell 5 output: `80 features for 81 samples` | ✓ |
| Librosa spectral: 68 (13 MFCC + 13 ΔMFCC means+vars, centroid, rolloff, bandwidth, 4-band contrast, ZCR) | cell 15 output: `Spectral features per sample: 68` (cell 17 markdown says "62" — stale, output wins) | ✓ |
| Feature sets: 17 / 97 / **165 voice** / **167 = 165 + age + sex** | cell 19 output | ✓ — "167 acoustic features" is WRONG; 165 are acoustic |
| 4 classifiers (LR, RF, SVM-RBF, XGBoost) × 4 sets = 16 models; default hyperparameters, deliberately (nested tuning would overfit at n=81) | cells 22–23 | ✓ |
| Best single-split AUC **0.819** (XGBoost, all + demographics); acc 0.706, F1 0.706 | cells 23/38 outputs | ✓ |
| Single-split confusion (best model): sens 0.750 (6/8), spec 0.667 (6/9), 2 FN | cell 38 output | ✓ |
| 17 test samples → one misclassification ≈ 5.9% accuracy swing | cell 25/39 markdown, arithmetic 1/17 | ✓ |
| 10-fold stratified CV, shuffle, seed 42, on all 81 | cell 26 code | ✓ |
| **Best CV AUC 0.912 ± 0.113** (XGBoost, all + demographics) | cell 26 output | ✓ |
| Notebook's own verdict: Model 4's gain is age-driven; age was its #1 feature; "honest assessment … is Models 1–3, *not* Model 4" | cell 39 markdown, Key Findings §2 | ✓ |
| Best voice-only CV: speech-only LR **0.767 ± 0.131**; all-165 best **0.714 ± 0.189** (SVM) | cell 26 output | ✓ — adding features degraded CV performance |
| Mann-Whitney filter: 57/165 at p < 0.05, 70 at p < 0.10, 85 at p < 0.20 | cell 29 output | ✓ — 57 is the p<0.05 count of 165 EXTRACTED, README's "167 → ~57" mixes in demographics |
| Filtered CV: p < 0.20 (85 feats) SVM **0.775 ± 0.138**; p < 0.05 (57 feats) SVM 0.769 ± 0.137 | cell 29 output | ✓ best voice-only number in the notebook |
| Top-20 discriminative features nearly all *variance* measures, ↑ in PD (temporal instability) | cell 29 output + printed observation | ✓ |
| LR odds ratios (speech-only): **none individually significant** — every 95% CI crosses 1.0; largest std_intensity OR 2.999 (0.751–11.970), f2_std 2.984 (0.730–12.190) | cell 32 output table | ✓ |
| Hosmer-Lemeshow: χ² 3.422, df 6, p = 0.7543 → adequately calibrated (8 groups, train+test pooled) | cell 32 output | ✓ |
| Youden's J optimum 0.972 → sens 0.250 / spec 1.000 (computed on the 17-sample test set; notebook itself flags a lower threshold as clinically preferable) | cell 32 output | ✓ — a degenerate optimum, reported as such |
| 8 peer-reviewed references | cell 39 reference list, counted | ✓ |
| Audio/source data excluded from repo (course data-sharing restrictions) | README | ✓ |
| Repo public | cloned anonymously via HTTPS 2026-08-07 | ✓ |
| Plate asset content: forest plot, 17 features, x-axis 0–8, dashed line at OR 1.0 | `lr_forest_plot.png` read visually 2026-08-07 | ✓ |

### Claims rejected

- **"Best model AUC 0.94"** (homepage card + repo README). No cell output produces
  0.94. Best single-split is 0.819 (XGBoost); the README attributes 0.94 to "SVM, all
  features", whose committed single-split output is 0.653. Presumably from an earlier
  uncommitted run. The card is corrected in this PR; the README is Amir's to fix.
- **"0.88–0.90 cross-validated" / README "Best CV AUC ~0.88–0.90 (RF/SVM, feature-selected sets)"**.
  Committed outputs: feature-selected best is SVM 0.775; RF best is 0.838 (Model 4,
  age-confounded); the only ≈0.9 is XGBoost Model 4 at 0.912. No RF/SVM
  feature-selected result reaches 0.88.
- **"Extracted 167 acoustic features"**. 165 are acoustic; 167 includes age + sex.
- **Headlining CV AUC 0.912 as the result**. The notebook's own discussion rejects it
  as age-driven; the page presents it only alongside that verdict.
- **Youden's J as a usable operating point**. The 0.972 threshold (sens 0.25) is an
  artifact of a 17-sample test set; presented as a finding about small-n threshold
  optimization, not as the recommended cutoff.

## Architecture

Zero new components. One entry appended to `CASE_STUDIES` (number 04), the
Parkinson's draft deleted from `unpublished-drafts.ts` (six → five), the index/nav/
sitemap/OG/JSON-LD all derive. Plate via existing `CaseStudyPlate`; bars via existing
`PairedBars`; no `figure`.

**Plate asset:** `public/work/parkinsons-plate.png` — `lr_forest_plot.png` (1200×1050),
white-margin-trimmed and optimized with sharp to comparable weight to the existing
plates (~70–120KB).

## Adjacent changes

- `components/projects.tsx` — Parkinson's card description corrected (165 features;
  0.912 age-confounded / ≈0.77 voice-only honest estimate; drop 0.94), `url` moves
  inward to `/work/parkinsons-voice-screening`.
- `lib/work/case-studies.test.ts` — count pinned 3 → 4; explicit adjacency tests
  extended to the new last entry.
- `CLAUDE.md` — four published studies; five quarantined drafts; new plate asset.

## Testing and verification gates

Per the handoff: `npm run build`, `npm run lint` (2 documented pre-existing errors
only), `npm test`, real-browser 320px `scrollWidth === 320` on the new page, dark
mode, outbound links 200, grep the *served* HTML (not a stale server), every number
traceable to a Verified-facts row, prev/next chain 01→02→03→04, OG card renders for
the new slug.
