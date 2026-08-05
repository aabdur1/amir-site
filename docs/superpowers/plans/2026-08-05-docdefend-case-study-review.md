# DocDefend+ Implementation Plan — Review Feedback

**Date:** 2026-08-05
**Reviewer:** independent review session (Fable), for Amir's sign-off
**Plan:** `docs/superpowers/plans/2026-08-05-docdefend-case-study.md`
**Verdict:** Approved after three edits — one prevents a guaranteed test failure the plan doesn't anticipate, two keep the plan consistent with its own rules. No structural changes.

## Independently re-verified (all held)

- Every cited line reference is accurate: `case-studies.test.ts:15`, `badges.test.ts` MANUAL_NAMES at 9–14 and the length assertions, `case-study-article.tsx:6` and the embed block at 98–102, `projects.tsx:38`, `globals.css` 555 / 593–600 / 629–631, `hooks.ts:74`.
- The Task 4 renderer code (the IIFE reading `study.figure.kind` inside the narrowing chain) typechecks clean under `--strict` with the repo's TypeScript and React types — probed directly, not assumed.
- The Task 3 crop command reproduces byte-for-byte: `wrote 1192x640 117KB`, and the output image shows the Clinical Note panel, the 25/LOW score ring, the "Overcoded" badge, Selected 99214 against Documented 99213, and the ≈$40 downcoding callout, ending cleanly below it. The Task 5 alt text is an accurate description of the asset.
- `https://www.kaggle.com/certification/badges/amirabdurrahim/108` returns 200 (re-checked 2026-08-05).
- vitest is already jsdom with `vitest.setup.ts` and jest-dom matchers in use by existing component tests, so the new `.test.tsx` files run without harness work.
- The privacy edits are carried through correctly: Task 5 prose attributes by specialty only with no employer, tenure, or pronouns, and Task 8 step 7 makes it auditable.
- Spot-checked rows of the self-review's assumptions table (`.reg-mark` has no border width; `.is-drawn .draw-stroke` descendant variant; reduced-motion override) — all match `globals.css`.

## Edit 1 (required — prevents a surprise test failure): badge sort-order assertion

`lib/badges.test.ts` has a hardcoded name-order assertion the plan never touches: `expectManualOnlySortedNewestFirst` (around lines 333–342) asserts `badges.map(name)` equals the four existing manual badges sorted by date descending. It is used by several tests in the failure-handling describe block. The new badge is dated `2026-07` — newer than "Building with the Claude API" (2026-05) — so after Task 7 step 3 every test using that helper fails, which the plan's step 2 failure list doesn't predict and step 5 ("Expected: PASS") contradicts.

Fix in Task 7 step 1: also insert `"5-Day AI Agents: Intensive Vibe Coding Course", // 2026-07` as the FIRST entry of the `toEqual` array inside `expectManualOnlySortedNewestFirst`, and add these failures to step 2's expected list.

## Edit 2 (required — the plan violates its own 12px floor): figure viewBox width

Task 2 claims "the viewBox is 320 wide so that at a 320px viewport it renders 1:1 and the 12px labels are exactly 12px." Not true: the page column is `max-w-5xl px-6` (`app/work/[slug]/page.tsx`), so at a 320px viewport the content box is 272px. The SVG renders at 272/320 scale and the 12px labels are effectively ~10.2px — under the plan's own Global Constraint.

Fix in Task 2: make the viewBox 272 wide and recompute the constants — `viewBox="0 0 272 430"`, `CENTER = 136`, `BOX_X = 10`, `BOX_W = 252`. Then 1:1 genuinely holds at a 320px viewport inside the page's `px-6`, and the 12px floor is real. Update the design-note sentence and the component comment to say 272/`px-6` rather than 320.

## Edit 3 (required for the audit to be executable): numbers with no Verified-facts row

The Global Constraint says every number must trace to the spec's Verified facts table, and Task 8 step 6 audits against it. Four numbers on the page have no row:

- "sixty to eighty" requests per full run (Task 5, "Evaluating it honestly")
- 75–80% self-estimated accuracy and ~10% denials (they appear in the spec's Content section, but not in the facts table the audit reads)
- The plate's on-screen figures in the alt text: the 25/100 score and the ≈$40 per visit callout

A literal implementer following the constraint would have to strip them; a literal auditor at step 6 would fail them. Fix by adding rows to the spec's Verified facts table: 60–80 with its actual source (agent README or eval-runner docs — cite whichever states it), 75–80% and ~10% sourced to the discovery interview notes, and the plate figures sourced to the asset itself (verified by inspection of the 1192×640 crop). No page-copy changes needed.

## Notes, no action required

- The plate crop deviates from the spec (full-width 1192×640 including the Clinical Note panel, vs the spec's right-column-only 536×859). Verified visually — the wider crop is better: it shows input and output as one story and still contains everything the spec required the frame to show. Optionally sync the spec's plate paragraph so spec and plan agree.
- Task 5 prose, metric tiles, links, and metadata all match the spec and the review's privacy decision. The 14/16 honesty paragraph and the limitations section are faithful to the spec's claims-rejected list.
