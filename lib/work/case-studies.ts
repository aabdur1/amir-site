import type { AccentColor } from '@/lib/styles'

// Single source of truth for the /work case-study system.
// The index page, per-project pages, prev/next nav, sitemap entries, and
// JSON-LD schema all derive from this array — mirrors lib/learn/artifacts.ts.
//
// Five earlier case-study drafts live in lib/work/unpublished-drafts.ts (not
// imported anywhere, prose unverified). To publish one: verify every number
// against the source project, move the entry into CASE_STUDIES, and renumber.

export interface CaseStudyLink {
  label: string
  href: string
  // external links get target="_blank" + rel + "(opens in new tab)"
  external?: boolean
}

export interface CaseStudyMetric {
  // A single headline number rendered as a stat tile.
  value: string
  label: string
}

export interface CaseStudyBar {
  // A two-value before/after comparison rendered as paired bars.
  label: string
  from: { value: number; label: string }
  to: { value: number; label: string }
}

export interface CaseStudyFigure {
  // Selects the drawn diagram component. Add a kind here and a matching entry
  // in FIGURES (case-study-article.tsx) to introduce a new one.
  kind: 'grounding-pipeline' | 'distillation-recovery'
  // Mono caption rendered under the figure — say what the marks mean.
  caption: string
}

export interface CaseStudyTableCell {
  // The primary value (e.g. the held-out test figure).
  main: string
  // A secondary value shown beside it in muted brackets (e.g. validation).
  aside?: string
  // What the aside is, for screen readers ("validation").
  asideLabel?: string
}

export interface CaseStudyTable {
  // Visible caption — say what the numbers are and what the brackets mean.
  caption: string
  // srLabel disambiguates repeated visible headers ("Seeds ahead" twice).
  columns: { label: string; srLabel?: string }[]
  // One row per entry; the first cell is the row header. Each row must have
  // exactly columns.length cells.
  rows: (string | CaseStudyTableCell)[][]
}

export interface CaseStudyPlate {
  // Local path under /public. Rendered as a "mounted print" inside fixed
  // registration marks, same treatment as the Spotify featured card.
  src: string
  alt: string
  // Intrinsic pixel dimensions of the asset, for next/image.
  width: number
  height: number
  caption: string
}

export interface CaseStudySection {
  heading: string
  // Each paragraph is one string; rendered as its own <p>.
  body: string[]
  // Render the study's embed (if any) under this section's paragraphs.
  embed?: boolean
  // Render the study's drawn figure under this section's paragraphs.
  figure?: boolean
  // Render the study's screenshot plate under this section's paragraphs.
  plate?: boolean
  // Render the study's data table under this section's paragraphs.
  table?: boolean
}

export interface CaseStudyEmbed {
  // Clean view URL (no share query params); the component adds embed params.
  url: string
  // Iframe title + placeholder copy.
  title: string
  // Author-set fixed size of the Tableau viz, used to shape the frame.
  width: number
  height: number
  // Placeholder motif + button/status noun ("story" / "dashboard").
  kind: 'story' | 'dashboard'
  // Mono caption line on the click-gate placeholder.
  caption: string
}

export interface CaseStudy {
  slug: string
  number: string
  title: string
  shortTitle: string
  // One-line summary used on cards and in metadata.
  summary: string
  // Longer lead paragraph shown at the top of the case-study page.
  lead: string
  role: string
  provenance: string
  accent: AccentColor
  tech: string[]
  // Whether this project has a full analyst narrative (flagship) or is a
  // lighter honest page. Controls the card badge and page depth.
  depth: 'full' | 'light'
  metrics?: CaseStudyMetric[]
  bars?: CaseStudyBar[]
  embed?: CaseStudyEmbed
  figure?: CaseStudyFigure
  plate?: CaseStudyPlate
  table?: CaseStudyTable
  sections: CaseStudySection[]
  links: CaseStudyLink[]
}

export const CASE_STUDIES: CaseStudy[] = [
  {
    // Every number on this page comes from the public write-up
    // (github.com/aabdur1/dataset-distillation-vehicle-damage). Rules carried
    // over from the capstone record: "ran the reported runs", never "every
    // run"; ResNet-18 on CarDD is "at or above", never "beats"; validation
    // figures sit beside test figures, never in place of them; no dataset or
    // distilled images, no code, no private-repo link, no teammate names.
    slug: 'dataset-distillation-vehicle-damage',
    number: '01',
    title: 'Dataset Distillation for Vehicle Damage Classification',
    shortTitle: 'Dataset Distillation',
    summary:
      "A capstone sponsored by CCC Intelligent Solutions, on a team of three: distribution-matching dataset distillation on two vehicle-damage datasets, scored once on held-out test splits under a frozen protocol. At 100 images per class (9.7% of CarDD's training crops) the distilled set recovers 84% of full-data macro-F1 on a ConvNet and 83% on ResNet-18; the herding picks it started from recover 78% and 80%.",
    lead:
      "On the held-out test split, a distilled set at 100 images per class — 9.7% of CarDD's training crops — recovers 84% of full-data macro-F1 on a ConvNet and 83% on ResNet-18. The herding-selected real crops it started from recover 78% and 80%. Every configuration was scored once on the test split, under claims and decision rules written down and frozen at a commit beforehand.",
    role: 'Team of three · I designed the experiments and ran the reported PyTorch runs',
    provenance: 'Graduate capstone · IDS 507, UIC MS MIS · Fall 2026, in progress · sponsored by CCC Intelligent Solutions',
    accent: 'lavender',
    depth: 'full',
    tech: ['Python', 'PyTorch', 'torchvision', 'Google Colab', 'Git'],
    metrics: [
      { value: '84%', label: 'Of full-data macro-F1 recovered (ConvNet, CarDD test, 100 images per class)' },
      { value: '9.7%', label: "Of CarDD's training crops in that 100-per-class set" },
      { value: '5 of 5', label: 'Paired seeds favoring the distilled set, ConvNet, at every CarDD budget' },
      { value: '+7.3', label: 'Macro-F1 points over the herding picks at 10 images per class (ConvNet, CarDD)' },
    ],
    figure: {
      kind: 'distillation-recovery',
      caption: 'fig. 01 · share of full-data macro-F1 recovered · CarDD test split, 100 images per class',
    },
    table: {
      caption:
        'Macro-F1 of the distilled set minus the herding picks, in points, over five paired seeds. Held-out test figures, with validation in brackets.',
      columns: [
        { label: 'Dataset' },
        { label: 'Images per class' },
        { label: 'ConvNet' },
        { label: 'Seeds ahead', srLabel: 'ConvNet seeds ahead' },
        { label: 'ResNet-18' },
        { label: 'Seeds ahead', srLabel: 'ResNet-18 seeds ahead' },
      ],
      rows: [
        ['CarDD', '10', { main: '+7.3', aside: '+7.1', asideLabel: 'validation' }, '5 of 5', { main: '+1.7', aside: '+1.3', asideLabel: 'validation' }, '4 of 5'],
        ['CarDD', '50', { main: '+3.0', aside: '+4.5', asideLabel: 'validation' }, '5 of 5', { main: '+1.7', aside: '+2.2', asideLabel: 'validation' }, '4 of 5'],
        ['CarDD', '100', { main: '+4.8', aside: '+3.9', asideLabel: 'validation' }, '5 of 5', { main: '+2.2', aside: '+2.2', asideLabel: 'validation' }, '5 of 5'],
        ['VehiDE', '50', { main: '+5.8', aside: '+5.9', asideLabel: 'validation' }, '5 of 5', { main: '+4.0', aside: '+3.7', asideLabel: 'validation' }, '5 of 5'],
      ],
    },
    sections: [
      {
        heading: 'The question',
        body: [
          'Dataset distillation learns a small set of synthetic training images that can stand in for a full dataset. If a few hundred images can train a model nearly as well as a few thousand, training gets cheaper and there is less data to store and move.',
          'Most published results come from benchmarks like CIFAR-10. This capstone, sponsored by CCC Intelligent Solutions, tested whether it holds up on photos of vehicle damage.',
        ],
      },
      {
        heading: 'The data',
        body: [
          'CarDD: car damage photos, cropped to the damaged area and resized to 64 by 64, in six classes — dent, scratch, crack, glass shatter, lamp broken, and tire flat. The test split has 785 crops.',
          'VehiDE: vehicle damage photos in seven classes, with 24,575 training crops. The test split has 4,940 crops.',
          'Both datasets come with their own terms of use, so no dataset images or distilled images appear on this page or in the public write-up. The chart below is drawn from the reported numbers.',
        ],
      },
      {
        heading: 'The method',
        body: [
          "Distillation used distribution matching (Zhao and Bilen, 2023). It updates the synthetic images so that their average features, taken through randomly initialized networks, match the real images' features class by class. Each synthetic set starts from real crops picked by herding, and a small pixel learning rate keeps the images close to those starting crops.",
          'Budgets were 10, 50, and 100 images per class. Each distilled set was compared against the herding picks it started from, against randomly picked real crops, and against the full training set.',
          'Each set trains a small ConvNet and a ResNet-18 from scratch with hard labels. Every comparison uses the same five training seeds for both sets, so each seed gives a paired difference. The headline score is macro-F1, also reported as the share of full-data macro-F1 that a set recovers; accuracy is recorded alongside it.',
        ],
      },
      {
        heading: 'A test protocol, frozen first',
        body: [
          'We wrote down the claims and the decision rules, froze the code at a commit, and then scored every configuration once on the untouched test splits.',
          'A gain counts as a win when at least four of the five seeds favor the distilled set and the mean gain is at least twice its standard error. Validation figures stay beside the test figures below, never in place of them.',
        ],
      },
      {
        heading: 'Results on the held-out test split',
        table: true,
        body: [
          'The gain columns are mean differences over the five paired seeds; the seeds-ahead columns count how many of the five favored the distilled set.',
        ],
      },
      {
        heading: 'Reading the results',
        figure: true,
        body: [
          'On the ConvNet the distilled set beats the herding picks at every budget on both datasets: by 7.3, 3.0, and 4.8 points at 10, 50, and 100 images per class on CarDD, and by 5.8 on VehiDE, five of five seeds each.',
          'On ResNet-18 it is at or above the picks on CarDD at every budget, by 1.7, 1.7, and 2.2 points. At 50 per class the mean gain misses the twice-the-standard-error rule by 0.04 of a point. On VehiDE it beats the picks on all five seeds, by 4.0.',
          'At 100 images per class on CarDD, which is 9.7% of the training crops, the distilled set recovers 84% of full-data macro-F1 on the ConvNet and 83% on ResNet-18. The herding picks recover 78% and 80%. In accuracy the distilled set is ahead of the picks on every seed, on both networks and both datasets, at every budget.',
          'Test and validation agree within about a point on every row except the ConvNet at 50 per class, which dropped 1.5 points on test.',
        ],
      },
      {
        heading: 'What did not work',
        body: [
          'Starting from noise. Sets distilled from random noise instead of real crops landed far below the herding picks on both networks: 8.4 and 18.9 points below at 50 per class on CarDD.',
          'A large pixel step. Our first learning rate, about 12 times the published step, moved the images much further from the real crops. On validation it kept a ConvNet gain, but on test it was 0.8 points below the picks on the ConvNet and 8.5 below on ResNet-18.',
          'A pixel-change penalty (validation split). We tried charging the distillation for moving each pixel away from its starting crop, which we did not find in the literature. Holding the large step to the same pixel distance as the small step did not produce an equally good set. We report it as a negative result.',
          'IDM-style matching (validation split). A queue of partly trained matching networks plus a class-aware term (Zhao et al., 2023) gave the same outcomes as plain distribution matching and showed no gain at any budget we tried.',
        ],
      },
      {
        heading: 'Limitations',
        body: [
          'Two damage datasets at 64 by 64 resolution, hard labels only.',
          'On test, each configuration is one distilled set trained under five seeds. Variation between separate distillation runs was not measured on test.',
          'The herding picks themselves scored higher on test than on validation at 50 per class, so part of each difference at that budget moves with the comparison set.',
          'Work on a larger benchmark is in progress and has no test protocol yet, so it is not reported here.',
        ],
      },
      {
        heading: 'My role',
        body: [
          'I designed the experiments, ran the reported PyTorch runs, did the analysis, wrote the weekly updates to the sponsor, and gave most of the sponsor presentations. A teammate reproduced the first result rows on his own machine.',
          "Much of the code was drafted with Claude Code; I reviewed, ran, and checked it. The code stays in the team's private repository, so the public write-up has nothing runnable. I'm happy to walk through the code and the results on a call.",
        ],
      },
    ],
    links: [
      {
        label: 'Full write-up on GitHub',
        href: 'https://github.com/aabdur1/dataset-distillation-vehicle-damage',
        external: true,
      },
    ],
  },
  {
    slug: 'parkinsons-voice-screening',
    number: '02',
    title: "Parkinson's Voice Screening — Refusing an Age-Confounded AUC",
    shortTitle: "Parkinson's Voice",
    summary:
      "Four classifier families by four feature sets on 81 sustained-vowel recordings. The best cross-validated AUC in the notebook is 0.912 — and the analysis exists to explain why that number cannot be claimed: age alone separates the groups at 0.864, and the defensible voice-only estimate is about 0.73, with feature selection nested inside cross-validation.",
    lead:
      "The strongest number this project produces is a cross-validated AUC of 0.912, and the analysis exists to explain why I will not claim it. The Parkinson's group averages 19 years older than the controls, and age alone separates the groups at AUC 0.864 — better than any voice-only model I trained. What survives the confound is a voice-only cross-validated AUC of about 0.73, with feature selection nested inside cross-validation. Smaller number, defensible study.",
    role: 'Solo project — feature extraction, modeling, and writeup',
    provenance: 'Graduate coursework · IDS 506 Healthcare Information Management & Analytics, UIC MS MIS',
    accent: 'mauve',
    depth: 'full',
    tech: ['Python', 'scikit-learn', 'XGBoost', 'Parselmouth', 'librosa'],
    metrics: [
      { value: '81', label: "Participants: 41 healthy controls, 40 with Parkinson's" },
      { value: '165', label: 'Acoustic features per recording, three extraction pipelines' },
      { value: '16', label: 'Models compared: 4 classifiers × 4 feature sets, 10-fold CV' },
      { value: '0.912', label: 'Best CV AUC — refused as the headline: it is mostly age' },
    ],
    bars: [
      {
        label: '10-fold CV AUC — the confound vs the voice signal',
        from: { value: 0.864, label: 'Age alone (0.864)' },
        to: { value: 0.73, label: 'Voice only (0.73)' },
      },
      {
        // The corrected result (Oct 2026): 0.775 appears only labeled as
        // leaky — never cite it as a result.
        label: 'Voice-only CV AUC — where the Mann-Whitney filter is fit',
        from: { value: 0.775, label: 'Before CV, leaky (0.775)' },
        to: { value: 0.713, label: 'Inside each fold (0.713)' },
      },
    ],
    plate: {
      src: '/work/parkinsons-plate.png',
      alt: 'Forest plot of logistic regression odds ratios for the 17 speech features, with 95% confidence intervals. The largest odds ratios are intensity variability and second-formant variability, each near 3.0, and every confidence interval crosses 1.0.',
      width: 1204,
      height: 1050,
      caption: 'odds ratios, speech-only logistic regression · every 95% CI crosses 1.0 at n = 81',
    },
    sections: [
      {
        heading: 'The finding',
        body: [
          "Sixteen models — four classifier families by four feature sets — trained to tell Parkinson's patients from healthy controls using sustained-vowel voice recordings. The best cross-validated AUC was 0.912, from XGBoost on every feature including demographics. The finding is that this number is not the result.",
          'Exploratory analysis surfaced the problem before any model ran: the patient group averages 67 years old, the controls 48. Age alone — no audio at all — classifies at AUC 0.864, beating every voice-only model I trained. A model handed age, or anything correlated with it, gets to look brilliant by detecting birthdays.',
          'The defensible result is voice-only: a cross-validated AUC of about 0.73, with feature selection nested inside cross-validation — still well below age alone at 0.864. The rest of the analysis is what it takes to trust even that smaller number — calibration, threshold behavior, and the limits an 81-sample study has to state.',
        ],
      },
      {
        heading: 'Context',
        body: [
          "Parkinson's changes the voice early — vocal-fold instability, breathiness, reduced loudness control — often before motor symptoms are obvious. That makes a short vowel recording a candidate for cheap, non-invasive screening, and it is why voice models keep appearing in the Parkinson's literature.",
          'This was a case assignment for IDS 506, Healthcare Information Management & Analytics. I framed it as a clinical study rather than a leaderboard: the deliverable was a screening claim I could defend, with its confounds and calibration on the table and the methods grounded in eight peer-reviewed sources — not a single high number.',
        ],
      },
      {
        heading: 'The data',
        body: [
          "81 participants — 41 healthy controls, 40 with Parkinson's — each recorded a sustained /a/ vowel as a mono WAV at 8 kHz: telephone-quality audio with a 4 kHz ceiling on everything spectral. Sex is balanced across the groups. Age, as it turned out, is not.",
          'From each recording I extracted 165 acoustic features in three pipelines: 17 phonation features via Parselmouth, a Praat wrapper — jitter, shimmer, harmonics-to-noise ratio, pitch and intensity statistics, formants F1–F4, duration, voiced fraction; 80 precalculated spectral coefficients that shipped with the dataset — LPC, LAR, cepstral, and MFCC means and variances; and 68 librosa features — 13 MFCCs and their deltas, spectral centroid, rolloff, bandwidth, per-band contrast, and zero-crossing rate.',
          'An 80/20 stratified split — 64 training samples, 17 test, fixed seed — was held constant for every model. The audio and source spreadsheet are excluded from the public repository under course data-sharing restrictions; the notebook and its committed outputs are the public record.',
        ],
      },
      {
        heading: 'The confound',
        body: [
          'The group comparison ran before any classifier did. Controls average 47.7 ± 14.3 years; patients 67.0 ± 9.0 — a 19-year gap at p < 0.0001. Sex passes its chi-squared test. And a "classifier" that consists of the age column and nothing else scores AUC 0.864.',
          "That one number reframes the project. Many acoustic features drift with normal aging — jitter rises, pitch range narrows, formant structure shifts — so a model trained on this cohort can achieve most of its separation without learning anything about Parkinson's. When the all-features-plus-demographics XGBoost reached 0.912 cross-validated, age sat at the top of its feature importances. The notebook says it plainly: models that include demographics are measuring the study design, not the disease. The honest comparison is voice-only.",
        ],
      },
      {
        heading: 'Sixteen models, and the curse of dimensionality',
        body: [
          'The grid was four classifiers — logistic regression, random forest, RBF-kernel SVM, XGBoost — by four incremental feature sets: 17 speech features, 97 adding the baseline spectral block, 165 adding the librosa block, 167 adding demographics. Hyperparameters stayed at established defaults, deliberately: with 64 training samples and up to 165 features, nested tuning is as likely to overfit the validation metric as to improve the model.',
          'The fixed 17-sample test split turned out to be nearly useless on its own — one flipped prediction moves accuracy by six points — so every claim rests on 10-fold stratified cross-validation instead. CV delivered the classic small-sample verdict: adding features hurt. The 17 speech features alone cross-validated at 0.767 (0.738 over 10 repeats of 10-fold CV); all 165 voice features managed 0.714.',
          'Feature filtering added nothing. The first version of this analysis ran a Mann-Whitney filter on all 81 participants before cross-validation, keeping the 85 features that passed p < 0.20. That leaked the test folds\' labels into feature selection and inflated the voice-only AUC to 0.775. With the filter fit inside each training fold instead, the same SVM scores 0.713 (0.734 over 10 repeats of 10-fold CV), the same as using all 165 features unfiltered.',
          "Descriptively, 57 of the 165 features differ between the groups at p < 0.05, uncorrected for 165 tests. They are mostly variance measures, higher in Parkinson's: frame-to-frame instability rather than average voice quality.",
        ],
      },
      {
        heading: 'Reading it like a clinical study',
        plate: true,
        body: [
          'A screening claim needs more than a ranking metric, so the logistic regression got the clinical treatment. Odds ratios per standard deviation, with 95% confidence intervals: the largest effects are intensity variability and second-formant variability, each roughly tripling the odds — and every single interval crosses 1.0. At 81 samples, no individual feature clears significance, and saying so plainly is what the forest plot below is for.',
          'Calibration held up better. A Hosmer-Lemeshow test on the predicted probabilities came back at p = 0.75 — the probabilities track observed rates, which matters when a probability is what triggers a referral. Threshold optimization became the cautionary tale instead: Youden\'s J, computed on the 17-sample test set, "optimized" to a 0.97 cutoff with 25% sensitivity — a degenerate operating point no screening tool would ship. At this scale the threshold has to come from clinical priorities — sensitivity first, because a false positive costs an exam while a false negative delays treatment — not from optimizing a curve.',
        ],
      },
      {
        heading: 'Limitations, and what I would do next',
        body: [
          'The limits are structural. Eighty-one samples caps statistical power — ten-fold cross-validation leaves about eight samples per held-out fold. The age gap cannot be convincingly adjusted away at this size; the clean fix is an age-matched cohort, not a covariate. Collapsing each recording to means and variances discards the temporal structure — pitch drift, tremor oscillation, voice breaks — that clinicians actually listen for. And a single sustained vowel at telephone quality says nothing about connected speech.',
          'Next, in order: an age-matched or age-stratified design, since nothing else rescues the confound; connected-speech tasks, where prosody and articulation carry signal a vowel cannot; sequence models over the raw feature trajectories instead of summary statistics; and external validation on a separate cohort before the word "screening" gets used without qualification.',
        ],
      },
    ],
    links: [
      {
        label: 'Analysis notebook on GitHub',
        href: 'https://github.com/aabdur1/parkinsons-voice-screening',
        external: true,
      },
    ],
  },
  {
    slug: 'docdefend-agent',
    number: '03',
    title: 'DocDefend+ — Grounding a Billing Agent in Real Terminology Data',
    shortTitle: 'DocDefend+',
    summary:
      'An ADK and Gemini agent that verifies every billing code against live NLM terminology data before it may enter a defensibility report, with a two-boundary PII firewall and a deterministic reconciler that overrides unbacked grounding claims. It passed 16 of 16 evaluation cases (110 checks) in the recorded run.',
    lead:
      'A language model asked to review a billing code can describe one that does not exist — confidently, in fluent clinical English. A prompt can ask a model to be careful; it cannot make it check. This agent makes an ungrounded code structurally unshippable: every code is verified against live NLM terminology data before it can enter the report, and a deterministic reconciler overrides any grounding the model claims but the tools never backed.',
    role: 'Solo agent design, guardrails, and evaluation — the underlying MVP is a team project',
    provenance: 'Graduate coursework · UIC MS MIS · agent built for the Kaggle × Google 5-Day AI Agents Intensive',
    accent: 'sapphire',
    depth: 'full',
    tech: ['Google ADK', 'Gemini', 'MCP', 'Python', 'Claude API', 'React'],
    metrics: [
      { value: '16/16', label: 'Evaluation cases passed (110/110 checks)' },
      { value: '68', label: 'Unit tests passing, zero API calls' },
      { value: '2', label: 'PII firewall boundaries, 6 identifier kinds' },
      { value: '12.2s', label: 'Average per live evaluation case' },
    ],
    figure: {
      kind: 'grounding-pipeline',
      caption: 'fig. 03 · every hard-edged stage is deterministic code — only the rounded one guesses',
    },
    plate: {
      src: '/work/docdefend-plate.png',
      alt: 'The DocDefend+ interface: a clinical note on the left, and on the right a defensibility score of 25 out of 100, an "Overcoded" flag, a selected code of 99214 against a documented level of 99213, and a warning that downcoding would reduce reimbursement by about $40 per visit.',
      width: 1192,
      height: 640,
      caption: 'the underlying app · synthetic note, demo-grade rates',
    },
    sections: [
      {
        heading: 'The finding',
        body: [
          'A single language-model call can bless a billing code that does not exist. It can also bless a real code the documentation does not support. Both produce the same outcome for a practice: a claim that gets denied, downcoded, or flagged in an audit. The model is not being careless — emitting text is the only move it has. It never checks anything.',
          'So I stopped asking it to be careful and made checking structural. Every code the agent reports must first come back from a terminology tool queried against live NLM data. A tracker records what the tools actually returned, and after the run a reconciler compares the report against that record — any code claiming to be grounded without tool backing is downgraded to NOT_SUPPORTED and flagged high risk. A model that lies about its own grounding cannot ship the lie.',
          'Run against gemini-2.5-flash at temperature 0 on 16 July 2026, the suite passes 16 of 16 cases across 110 assertions, including three prompt-injection attempts and two fabricated codes. Every assertion is deterministic — there is no model judging the model.',
        ],
      },
      {
        heading: 'Context',
        body: [
          'DocDefend+ started as a team project for IDS 594, Entrepreneurship with AI, at UIC: a pre-claim QA layer for small medical practices. A provider or billing coder pastes a clinical note, selects the CPT and ICD-10 codes they intend to bill, and gets back a defensibility report. The agent described here is separate, solo work, built afterward for the Kaggle and Google 5-Day AI Agents Intensive.',
          'The problem came out of customer discovery rather than a whiteboard. A physiatrist self-estimated their own coding accuracy at 75 to 80 percent. A family-medicine physician outsources coding entirely to a third party and runs roughly 10 percent denials while believing the practice is undercoded. An anesthesiologist pointed to EMR transitions as a reliable source of miscoding. None of them described a documentation problem — they described a verification gap.',
          'That gap is the whole thesis. An AI scribe writes the note. A billing company picks the codes. Payers increasingly use automated review to deny or downcode. Nobody checks whether the note actually supports the codes before the claim goes out.',
        ],
      },
      {
        heading: 'What a one-shot call cannot do',
        body: [
          'The original app makes one Claude call per analysis and asks for structured JSON back. That works well for reading a note and reasoning about medical decision-making complexity. It cannot verify that a code exists, because nothing in the loop ever leaves the model.',
          'This is the clinical version of a failure mode that shows up wherever models name things: a plausible identifier, correctly formatted, described fluently, that simply is not real. Prompting harder does not fix it. Neither does temperature 0 — a deterministic wrong answer is still wrong. The fix has to sit outside the model.',
        ],
      },
      {
        heading: 'How grounding is enforced',
        figure: true,
        body: [
          'The instruction forbids describing any code from memory and routes each code type to its own tool — CPT and E/M to a curated reference, ICD-10 to a search against NLM data. The terminology lookups come from an MCP server I built separately against the NLM public APIs.',
          'Deterministic code sits at every boundary. A structural gate allowlists which tools may run at all. A PII firewall masks identifiers twice: once before anything reaches Gemini, and again on every outgoing tool argument, covering six identifier kinds. A tracker records only codes a tool actually returned — results marked not-found are never counted as grounded.',
          'Then the output gate. After the run, the reconciler compares what the report claims against what the tools verified, and downgrades every unbacked claim. Tool errors are held distinct from genuine no-matches: on a network failure the agent retries, and on repeated failure it reports the code as unverifiable rather than invalid. It fails closed in both directions.',
        ],
      },
      {
        heading: 'Evaluating it honestly',
        plate: true,
        body: [
          'The suite is 16 labelled cases: grounded real codes, fabricated codes, over- and under-coded E/M levels, real codes the documentation does not support, three prompt-injection attempts, the PII firewall, and malformed input rejected before the model is ever called. Thirteen run live against the API; three are static and need no network. All 110 assertions are deterministic.',
          'An earlier identical run scored 14 of 16. Both failures were real and both were fixed: the model once emitted an out-of-vocabulary value for a medical-decision-making element, so the permitted vocabulary is now pinned in the instruction; and it made a borderline call between two E/M levels, so the CMS two-of-three rule is now explicit. Worth stating plainly — model output varies between runs even at temperature 0, so a future run may not be a clean sweep. The deterministic guardrails do not vary, which is precisely the argument for putting the guarantees there instead of in the prompt.',
          'One practical note from the run. The free tier allowed about five requests a minute and roughly twenty a day, against a suite that needs sixty to eighty. The full pass used a billed key, and a static-only mode exists so the deterministic cases stay runnable at zero cost.',
        ],
      },
      {
        heading: 'Limitations',
        body: [
          'Name detection is regex-only. Labelled names are masked; a name in unlabelled prose is not. Real de-identification needs a local model or a named-entity pass, which is the next thing I would build. Date masking is deliberately over-broad — every full date is treated as an identifier, so visit dates get masked too, because over-redaction is the safe direction to err.',
          'Grounded means the code exists in real terminology data. It does not mean the documentation supports it — that judgment lives in a separate status field, and conflating the two would be exactly the kind of overclaim this project exists to prevent. The CPT reference is 12 curated codes with approximate national rates, because CPT is licensed and absent from free NLM data, so every dollar figure is demo-grade. Time-based E/M billing is not modelled at all.',
          'And the honest headline: this runs on synthetic notes. There has been no pilot, no accuracy validation against real claim outcomes, and no clinical use. Real validation needs real notes, which needs compliance work that has not been funded. Until then the eval suite measures whether the guardrails hold — not whether the clinical judgment is correct.',
        ],
      },
      {
        heading: 'What I would extend',
        body: [
          'Three things, in order. Replace regex name detection with a local de-identification pass, so the firewall stops depending on how a note happens to be formatted. Add time-based E/M as a billing path — it is a legitimate route under CMS and common for new patients, and its absence was the first gap a physician found when reviewing the product. Then validation: a set of notes with known claim outcomes, scored against the agent, which is the only evidence that would justify calling any of this accurate.',
        ],
      },
    ],
    links: [
      { label: 'Try the live app', href: 'https://www.docdefend.health', external: true },
      { label: 'Agent source on GitHub', href: 'https://github.com/aabdur1/docdefend-mvp', external: true },
      { label: 'The MCP server I built', href: 'https://github.com/aabdur1/healthcare-terminology-mcp', external: true },
    ],
  },
  {
    slug: 'spotify-listening',
    number: '04',
    title: 'My Spotify Listening, 2021–2026',
    shortTitle: 'Spotify Listening',
    summary:
      'A personal-data pipeline from my own Spotify extended streaming history: 61,230 raw plays cleaned with pandas, genre-enriched via the Last.fm API, and published as a seven-view Tableau dashboard covering 4.7 years of listening.',
    lead:
      'My heaviest listening block is weekday midday, not evening — and midday is also where I skip hardest, peaking at 52.9% on Wednesdays at 1pm against a 45.7% overall skip rate. This dashboard turns 4.7 years of my own Spotify history into seven linked views, including the window where bass music overtook hip-hop and the one hour of the week I have never played music at all.',
    role: 'Solo pipeline, analysis, and dashboard',
    provenance: 'Personal project · my own Spotify data',
    accent: 'sapphire',
    depth: 'full',
    tech: ['Tableau', 'Python', 'pandas', 'Last.fm API'],
    metrics: [
      { value: '1,437', label: 'Hours of music, Dec 2021 – Jul 2026' },
      { value: '57,200', label: 'Music streams kept of 61,230 raw plays' },
      { value: '3,341', label: 'Distinct artists across 8,408 tracks' },
      { value: '45.7%', label: 'Average skip rate (plays under 30 seconds)' },
    ],
    embed: {
      url: 'https://public.tableau.com/views/MySpotifyListening2021-2026/MySpotifyListening20212026',
      title: 'My Spotify Listening, 2021–2026 — interactive Tableau dashboard',
      width: 1000,
      height: 3177,
      kind: 'dashboard',
      caption: 'interactive tableau dashboard · seven linked views',
    },
    sections: [
      {
        heading: 'The finding',
        body: [
          'Three things came out of 4.7 years of my own listening data. The clearest: my heaviest listening happens on weekday middays — the hour-by-day heatmap peaks between roughly 11am and 3pm early in the week — and that same block is where I skip hardest, topping out at 52.9% at Wednesday 1pm against my 45.7% overall rate. That pairing reads like background listening: lots of starts, quick judgments.',
          'Second, the genre mix has a clean before-and-after. Hip-hop/rap carried 2022; bass music takes the top share in the window of my first festivals — Heatwave and North Coast, summer 2023 — and holds it from then on. The annotated line on the dashboard is not a slow drift. It is a handoff.',
          'And one negative-space finding: Friday at 3am is the only hour of the week with zero plays across the entire 4.7-year window.',
        ],
      },
      {
        heading: 'Context',
        body: [
          'This is a personal project, not coursework: my own data, my own questions. Spotify provides a full-history export on request — Privacy Settings, then "extended streaming history" — and everything here is built from that export: pandas notebooks for cleaning and features, the Last.fm API for genres, Tableau Public for the dashboard.',
          'The dashboard is deliberately styled to sit inside this site: Catppuccin Latte palette, colorblind-validated, with a DM Serif Display title card. Load it below and it should read like a page of this site that happens to be Tableau.',
        ],
      },
      {
        heading: 'The data and the pipeline',
        body: [
          'The export arrives as JSON: 61,230 raw play records from December 2021 through July 2026. A set of numbered pandas notebooks concatenates the files, localizes timestamps, applies a real-listen threshold, and derives sessions, skip flags — a skip is a play under 30 seconds — and first-play discovery dates. Excluding podcasts leaves 57,200 music streams: 1,437 hours across 3,341 artists and 8,408 tracks.',
          'The export carries no genre field, so genres come from the Last.fm API: one cached lookup per artist, mapped into six groups — bass music, hip-hop/rap, electronic, classical/score, house/dance, and everything else. Coverage is about 98.3% of artists.',
          'The raw export is personal data, so it never leaves my machine. The repo gitignores it, and what Tableau receives are aggregate CSV extracts, not row-level plays.',
        ],
      },
      {
        heading: 'Seven views, one parameter',
        embed: true,
        body: [
          'The dashboard is seven linked views on one tall canvas. An all-time KPI row sits on top; below it, a monthly-hours line annotated with eras (the February 2023 low of 5.39 hours, the first-festivals window, the start of my MS program, the May 2026 peak of 67.94 hours), a 100% stacked genre mix, an hour-by-day heatmap, a diverging skip-rate heatmap, and top artists colored by genre group with cross-chart hover.',
          'A global Year Select parameter drives five of the seven views. The KPI row ignores it on purpose, so the headline numbers stay whole-history while everything below re-slices. The skip definition and the podcast exclusion are stated on the dashboard itself — the numbers carry their caveats with them.',
        ],
      },
      {
        heading: 'What the analysis showed',
        body: [
          'The midday block is the clearest result: listening concentrates around weekday middays, and skip rate rises with it. High-volume hours are also high-churn hours. The diverging heatmap makes that visible because it is anchored at my own 45.7% average rather than at zero — a red cell means skippier than my normal, not skippy in the abstract.',
          'The genre handoff holds up against the annotations: hip-hop/rap dominant through 2022, bass music taking the top share in the months around summer 2023, the same window as my first festivals. Correlation is not causation, but the timing is unambiguous — and it is the kind of ground truth you only have when the analyst is also the subject.',
          'The honest limitations: a 30-second skip threshold is a proxy for intent, not a measurement of it; genre labels are Last.fm community tags mapped by me into six groups; and the export covers Spotify only, so anything played elsewhere is invisible. All three are stated on the dashboard or in the pipeline rather than smoothed over.',
        ],
      },
      {
        heading: 'What I would extend',
        body: [
          'The repo is queued for a public release: aggregated extracts plus a reproduce path, since anyone can request their own extended streaming history from Spotify. A Top Tracks view is queued for the dashboard itself. Beyond that, the pipeline already computes session and discovery-date features the dashboard does not use yet — session length by time of day, and how long a newly discovered artist survives in rotation, are the two analyses I would build next.',
        ],
      },
    ],
    links: [
      {
        label: 'View on Tableau Public',
        href: 'https://public.tableau.com/app/profile/amir.abdur.rahim/viz/MySpotifyListening2021-2026/MySpotifyListening20212026',
        external: true,
      },
      {
        label: 'See my full Tableau portfolio',
        href: 'https://public.tableau.com/app/profile/amir.abdur.rahim/vizzes',
        external: true,
      },
    ],
  },
  {
    slug: 'airline-flight-patterns',
    number: '05',
    title: 'US Airline Flight Patterns',
    shortTitle: 'Flight Patterns',
    summary:
      'A four-point Tableau story across two years of US commercial flight records and 11 carriers: traffic over time, weekly flights by airline, and the distance-airtime relationship.',
    lead:
      'Southwest operated more weekly flights than any other US carrier in every single week of the two years I analyzed, while flying one of the shortest average airtimes in the set. This Tableau story shows how the flight records reveal that model, and where the data nearly tells you a lie about 2011.',
    role: 'Solo analysis and visualization',
    provenance: 'Coursework · IDS 405 Business Systems Analysis & Design',
    accent: 'peach',
    depth: 'full',
    tech: ['Tableau', 'Tableau Public'],
    metrics: [
      { value: '~345K', label: 'Peak monthly flight records (December 2010)' },
      { value: '11', label: 'US carriers compared' },
      { value: '~1.43B mi', label: 'Southwest total distance flown, the most of any carrier' },
      { value: '~94 min', label: 'Southwest average airtime, among the shortest' },
    ],
    embed: {
      url: 'https://public.tableau.com/views/IP4_17645572320100/Story1',
      title: 'US Airline Flight Patterns — interactive Tableau story',
      width: 1016,
      height: 991,
      kind: 'story',
      caption: 'interactive tableau story · four captioned points',
    },
    sections: [
      {
        heading: 'The finding',
        body: [
          'Two things came out of the data. First, Southwest ran the most weekly flights of any carrier in every week from December 2009 through November 2011, peaking around 13,197 flights in a week, and it did that while flying short hops: the most total distance of any carrier (about 1.43 billion miles) but an average airtime of only about 94 minutes. That combination is the signature of a short-haul, high-frequency route model.',
          'Second, the data itself tried to mislead. Monthly flight counts appear to fall off a cliff in late 2011. They do not. The dataset simply ends in November 2011, so the last months are incomplete. Catching that artifact before a reader mistakes it for an industry decline is as much the point of the story as the charts are.',
        ],
      },
      {
        heading: 'Context',
        body: [
          'This was an individual project (IP4) for IDS 405, Business Systems Analysis & Design. The assignment was to take a real dataset and build a Tableau story that walks a reader through it: not a dashboard dump, but a sequence of captioned views that make one argument at a time.',
        ],
      },
      {
        heading: 'The data',
        body: [
          'The dataset is US commercial airline flight records covering roughly December 2009 through November 2011, spanning 11 carriers: AirTran, Alaska, American, Continental, Delta, Frontier, Hawaiian, JetBlue, Southwest, United, and US Airways.',
          'Monthly record counts hold steady at roughly 330K to 350K across the period, which makes the apparent late-2011 drop stand out immediately if you are looking for it, and easy to misread if you are not.',
        ],
      },
      {
        heading: 'Three views, four story points',
        embed: true,
        body: [
          'The story is built from three views arranged as four captioned story points. The first is a line chart of flights over time: monthly counts holding in that 330K to 350K band with a peak of about 345K in December 2010, plus a caption flagging that the 2011 tail is a data-completeness artifact, not a real decline.',
          'The second is a highlight table of weekly flights by airline. Color intensity does the work here: Southwest is the darkest row in every week of the period, with weekly counts across the table running from about 400 at the low end to about 23,470 at the high end.',
          'The third is a scatter of total distance flown against average airtime, with a trend line showing the expected positive correlation. Southwest sits far off the pack: highest total distance, yet an average airtime of about 94 minutes. Lots of planes, short trips, all day long.',
        ],
      },
      {
        heading: 'What the analysis showed',
        body: [
          'The three views triangulate one conclusion: over this period Southwest ran a short-haul, high-frequency operation at a scale no other US carrier matched, week in and week out. The scatter makes the mechanism visible. Its total mileage comes from flight volume, not flight length.',
          'The quieter lesson is the artifact. Any time-series that ends mid-period will look like a decline in its final months, and a chart reader who does not check the data boundary will walk away with a false story. Flagging it in the caption costs one sentence and saves the reader from the wrong conclusion.',
        ],
      },
      {
        heading: 'What I would extend',
        body: [
          'The record counts measure flights, not passengers or seats, so the natural next step is joining load-factor or capacity data to separate flying often from flying full. I would also add a route-level view, since carrier-level averages hide which city pairs drive the pattern, and a seasonality decomposition to separate the December peaks from the underlying trend.',
        ],
      },
    ],
    links: [
      {
        label: 'View on Tableau Public',
        href: 'https://public.tableau.com/views/IP4_17645572320100/Story1',
        external: true,
      },
      {
        label: 'See my full Tableau portfolio',
        href: 'https://public.tableau.com/app/profile/amir.abdur.rahim/vizzes',
        external: true,
      },
    ],
  },
]

export function getCaseStudy(slug: string): CaseStudy | undefined {
  return CASE_STUDIES.find((c) => c.slug === slug)
}

export function getAdjacentCaseStudies(slug: string): {
  prev: CaseStudy | null
  next: CaseStudy | null
} {
  const index = CASE_STUDIES.findIndex((c) => c.slug === slug)
  if (index === -1) return { prev: null, next: null }
  return {
    prev: index > 0 ? CASE_STUDIES[index - 1] : null,
    next: index < CASE_STUDIES.length - 1 ? CASE_STUDIES[index + 1] : null,
  }
}
