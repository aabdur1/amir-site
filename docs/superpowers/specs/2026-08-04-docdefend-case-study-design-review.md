# DocDefend+ Case Study Spec — Review Feedback

**Date:** 2026-08-05
**Reviewer:** independent review session (Fable), decisions confirmed by Amir
**Disposition (added 2026-08-05 by the implementing session):** Edits 1, 4, and 5 applied. Edit 2 was already applied before this review arrived — the badge was renamed to `public/badges/kaggle-google-ai-agents.png` and committed in `a0a2712`. **Edit 3 is stale and was deliberately not applied:** Amir supplied his personal Kaggle verification URL (`https://www.kaggle.com/certification/badges/amirabdurrahim/108`, verified 200 on 2026-08-04) directly to the implementing session, so it is a closed input, not an open one. The review session had no visibility into that exchange.

**Verdict:** Approved once the edits below are applied. Every number and architecture claim in the spec was independently re-verified against source (eval JSON, `guardrails.py`, agent test count, `case-studies.ts` schema, `badges.ts`, `projects.tsx`, site CLAUDE.md conventions) and holds exactly. Apply these edits, then proceed to the implementation plan.

## 1. Interviewee privacy — generalize further (Amir's decision)

Applies to Content section 2 (Context) and the corresponding Decisions-table row. De-identification by role is not sufficient: role + employer type + tenure + a gendered pronoun, published next to named public-capacity figures on a site tied to Amir's identity, makes the interviewees recognizable to anyone in the class or their own circles. Edit to:

- Attribute by specialty only: "a physiatrist," "a family-medicine physician," "an anesthesiologist."
- Drop all employer descriptors ("VA," "private practice," "county hospital") and tenure ("after 15 years").
- No gendered pronouns for de-identified people — use they/them or restructure the sentence.
- Keep the quantitative substance (the 75–80% self-estimated coding accuracy, the ~10% denial rate, EMR transitions as a miscoding source). The numbers carry the argument; the biography does not.
- Update the Decisions-table row to record the stricter rule: "De-identified by specialty only — no employer type, tenure, or pronouns; only public-capacity figures named."

## 2. Badge asset — the cutout already exists (spec is stale here)

Amir created the square badge cutout after the spec was written. `public/badges/5-Day AI Agents_ Intensive Vibe Coding Course_badge.png` (537×572, the hexagonal badge mark alone) is already in the repo, untracked. Replace the certificate-cropping instruction with: rename this file to `public/badges/kaggle-google-ai-agents.png` (the spaces in the current filename must not ship in a URL) and use it as-is. No crop step in the plan.

## 3. Badge URL — still the one open input

Unchanged from the spec: `Badge.url` needs Amir's personal Kaggle verification link if one exists, otherwise the official course page. Keep this flagged in the implementation plan as the input to collect from Amir before the `badges.ts` edit, with the 200-check applied to whichever URL he supplies.

## 4. Status line

The spec header read "Approved" before Amir had reviewed it. With edits 1–2 applied, his sign-off stands and the status becomes true — add a revision note or date bump when editing so the history is honest.

## 5. Minor, at your discretion

- The title ("DocDefend+ — Grounding a Billing Agent in Real Terminology Data") is a longer two-part shape than 01 and 02, which are plain titles. Testing item 10 already covers the OG card; also eyeball the `/work` index card and prev/next labels with the longer title (shortTitle should cover most of it).

## Everything else stands as written

No changes requested to the arc, page count, agent-led framing, accent, slug, schema extension, figure/plate design, verified-facts table, claims-rejected list, testing gates, or scope boundaries.
