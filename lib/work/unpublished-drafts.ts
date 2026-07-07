import type { CaseStudy } from './case-studies'

// ============================================================================
// UNPUBLISHED DRAFTS — NOT rendered anywhere. Nothing imports this file.
//
// Six case-study drafts written in an earlier session, moved here when the
// /work system shipped with the verified Tableau study only. The prose and
// numbers below are UNVERIFIED (several entries carry their own TODOs).
//
// To publish one: verify every number and claim against the source project,
// move the entry into CASE_STUDIES in lib/work/case-studies.ts, renumber the
// `number` fields (Tableau currently holds '01'), and delete it here.
// ============================================================================

export const UNPUBLISHED_DRAFTS: CaseStudy[] = [
  {
    slug: 'parkinsons-voice-screening',
    number: '01',
    title: "Parkinson's Voice Screening",
    shortTitle: "Parkinson's Voice",
    summary:
      "A binary classifier that separates Parkinson's patients from healthy controls using acoustic features extracted from voice recordings.",
    lead:
      "I built a screening classifier that tells Parkinson's patients apart from healthy controls using only acoustic features from voice recordings, then treated the modeling choices the way a clinical study would.",
    role: 'Solo project — data work, modeling, and writeup',
    provenance: 'Graduate coursework · IDS 506, UIC MS MIS · Spring 2026',
    accent: 'mauve',
    depth: 'full',
    tech: ['Python', 'scikit-learn', 'XGBoost', 'Parselmouth', 'librosa'],
    metrics: [
      { value: '81', label: 'Voice samples (40 patients, 41 controls)' },
      { value: '167', label: 'Acoustic features extracted' },
      { value: '4 × 4', label: 'Model families × feature sets compared' },
      { value: '10-fold', label: 'Stratified cross-validation' },
    ],
    sections: [
      {
        heading: 'Context',
        body: [
          "Parkinson's disease changes the voice early — reduced pitch range, breathiness, and instability in sustained sounds. That makes voice a candidate for low-cost screening, but only if a model can separate the disease signal from ordinary variation between people.",
          "For this project I framed it as a clinical study rather than a leaderboard: the goal was a classifier whose decisions I could defend, with the confounds and calibration spelled out, not just a high accuracy number.",
        ],
      },
      {
        heading: 'Data',
        body: [
          'The dataset is 81 voice samples — 40 people with Parkinson\'s and 41 controls — which is small and close to balanced. From each recording I extracted 167 acoustic features using Parselmouth (a Praat wrapper) and librosa: measures like jitter and shimmer, spectral features, and MFCCs.',
          'The audio and derived data are excluded from the public repository per course restrictions, so the repo holds the code and analysis rather than the recordings.',
        ],
      },
      {
        heading: 'Approach',
        body: [
          'I evaluated four model families — logistic regression, random forest, SVM, and XGBoost — across four feature sets, using stratified 10-fold cross-validation so the class balance held in every fold. That 4-by-4 grid was the point: I wanted to see which combinations of model and feature set actually held up, not to report the single best run.',
          'Two problems needed handling before any of that meant anything. Age is a confound — voice changes with age regardless of disease — so I controlled for it rather than letting the model learn age as a proxy for diagnosis. And many of the 167 features carry the same information, so I used Mann-Whitney U filtering to cut redundant and non-discriminating features.',
          "For interpretability I reported odds ratios with 95% confidence intervals from the logistic regression, checked calibration with the Hosmer-Lemeshow test, and set the decision threshold using Youden's J rather than defaulting to 0.5. The analysis is grounded in 8 peer-reviewed sources.",
        ],
      },
      {
        heading: 'Results',
        body: [
          "The comparison surfaced which model-and-feature combinations separate patients from controls reliably under cross-validation, and the odds ratios name the acoustic features that carry the signal — with confidence intervals, so the strength of each is visible rather than implied.",
          'Reporting calibration and a chosen threshold matters more than a headline accuracy number here: a screening tool is judged on how its errors fall, not on a single score.',
          // TODO(amir): add the specific headline results you want to feature —
          // e.g. best model + feature set, its cross-validated AUC/sensitivity/
          // specificity, and 1-2 top odds ratios with their CIs. Only fill in
          // numbers you can cite from the report; leave blank otherwise.
        ],
      },
      {
        heading: 'Limitations and what I would do next',
        body: [
          '81 samples is a real constraint. The cross-validation guards against overfitting to a single split, but a dataset this size still limits how confident any estimate can be, and the results need external validation on a separate cohort before they mean anything clinically.',
          'Next steps I would take: validate on an independent dataset, test whether the signal holds across recording conditions rather than one clean set, and look at whether a smaller, defensible feature set performs as well as the full 167 — a screening tool is more useful when you can explain every input.',
        ],
      },
    ],
    links: [
      {
        label: 'GitHub repository',
        href: 'https://github.com/aabdur1/parkinsons-voice-screening',
        external: true,
      },
    ],
  },
  {
    slug: 'wieiad-tiktok-analysis',
    number: '02',
    title: 'WIEIAD TikTok Analysis',
    shortTitle: 'WIEIAD Analysis',
    summary:
      'A multimodal pipeline that scored 1,159 "What I Eat in a Day" TikToks for nutritional quality and eating-disorder risk signals, then compared mainstream against coded hashtags.',
    lead:
      'I built a pipeline that reads a TikTok the way a person would — audio, on-screen text, and images together — to measure nutritional quality and eating-disorder risk signals across 1,159 "What I Eat in a Day" videos, then tested whether coded "evasion" hashtags carry more risk than mainstream ones.',
    role: 'Solo pipeline build, with a second coder on the validation subset',
    provenance: 'Graduate coursework · IDS 506, UIC MS MIS · Spring 2026',
    accent: 'lavender',
    depth: 'full',
    tech: ['Python', 'Whisper', 'EasyOCR', 'CLIP', 'LLM rubric scoring'],
    metrics: [
      { value: '1,159', label: 'TikTok videos analyzed' },
      { value: '~60', label: 'Videos dual-coded for validation' },
      { value: '5', label: 'Eating-disorder risk signals scored' },
      { value: '3 of 4', label: 'Testable signals Bonferroni-significant' },
    ],
    bars: [
      {
        label: 'Any-signal prevalence: mainstream vs. coded hashtags',
        from: { value: 7.5, label: 'Mainstream (7.5%)' },
        to: { value: 15.0, label: 'Coded (15.0%)' },
      },
      {
        label: 'MyPlate alignment score: mainstream vs. coded hashtags',
        from: { value: 3.45, label: 'Mainstream (3.45)' },
        to: { value: 0.75, label: 'Coded (0.75)' },
      },
    ],
    sections: [
      {
        heading: 'Context',
        body: [
          '"What I Eat in a Day" is one of the most common formats on food TikTok, and some of it drifts into disordered-eating territory that hides behind coded hashtags. I wanted to measure that at scale instead of by anecdote: how does nutritional quality and eating-disorder risk differ between mainstream food hashtags and the coded "evasion" tags used to dodge moderation?',
          'The hard part is that the signal lives across modalities. What someone says, what they caption on screen, and what the food actually looks like can each carry information a text-only or image-only model would miss.',
        ],
      },
      {
        heading: 'Data',
        body: [
          'The corpus is 1,159 TikTok videos pulled across mainstream and coded "evasion" hashtags so the two groups could be compared directly.',
          'To check the automated scores against human judgment, a second coder and I hand-annotated a validation subset of roughly 60 videos. That dual-coding is what lets me talk about the pipeline\'s output as measurements rather than guesses.',
        ],
      },
      {
        heading: 'Approach',
        body: [
          'The pipeline is multimodal by design. Whisper transcribes the spoken audio, EasyOCR pulls on-screen captions and text overlays, and CLIP does zero-shot classification of the visual content. An LLM then scores each video against a rubric covering MyPlate nutritional quality and five eating-disorder risk signals.',
          'Combining the three input channels matters: a video can look innocuous but say something restrictive, or narrate a normal meal over imagery that tells a different story. Reading them together is what makes the risk signals measurable.',
          'For the comparison itself I tested mainstream against coded hashtags and applied a Bonferroni correction, so the significant results survive the multiple-comparisons problem rather than being an artifact of testing many signals at once.',
        ],
      },
      {
        heading: 'Results',
        body: [
          'The coded hashtags carried substantially more risk than the mainstream ones. Any-signal prevalence doubled, from 7.5% under mainstream tags to 15.0% under coded tags. Three of the four testable risk signals were significant after Bonferroni correction.',
          'Nutritional quality moved the opposite way. MyPlate alignment collapsed from 3.45 under mainstream tags to 0.75 under coded tags, at p < 10⁻⁶⁴ — the coded content is not just riskier, it is far less nutritionally balanced.',
          'Taken together, the coded-hashtag content is both lower in nutritional quality and higher in eating-disorder risk signals — the pattern you would worry about, quantified across a thousand-video corpus rather than argued from examples.',
        ],
      },
      {
        heading: 'Limitations and what I would do next',
        body: [
          'The validation subset is about 60 videos, which anchors the automated scores but is small; a larger annotated set would tighten the agreement estimates. Hashtag membership is also a rough proxy for intent, and coded tags shift over time, so the specific tags are a snapshot.',
          'Next I would expand the human-coded set, track how coded vocabulary migrates over time, and separate the contribution of each modality — measuring how much the audio, text, and image channels each add would tell you where the risk signal actually lives.',
        ],
      },
    ],
    links: [
      // TODO(amir): add GitHub repo and/or writeup links for the WIEIAD project
      // if you want them public. Left empty rather than guessing a URL.
    ],
  },
  {
    slug: 'docdefend',
    number: '03',
    title: 'DocDefend+',
    shortTitle: 'DocDefend+',
    summary:
      'A clinical-documentation platform that checks whether E/M notes justify their billing codes before a claim goes out, plus an agent grounded in a self-built medical-terminology server.',
    lead:
      'DocDefend+ checks whether clinical documentation actually justifies the billing code assigned to it before the claim is submitted — encoding Epic documentation structure and ICD-10/CPT rules into the validation logic.',
    role: 'Full-stack build — web app, validation logic, and grounding agent',
    provenance: 'Kaggle capstone project',
    accent: 'sapphire',
    depth: 'full',
    tech: ['Claude API', 'ADK / Gemini', 'MCP', 'NLM APIs', 'ICD-10 / CPT'],
    metrics: [
      { value: '99214', label: 'Real E/M code the agent grounds and validates' },
      { value: 'M54.50', label: 'Real ICD-10 code (low back pain) it verifies' },
      { value: 'Live', label: 'NLM API calls via a self-built MCP server' },
    ],
    sections: [
      {
        heading: 'Context',
        body: [
          "Clinical notes and billing codes get out of sync. A note might not contain enough documentation to justify the code attached to it, or a code might be inflated beyond what the visit supports. Both cause denied claims and compliance risk, and both are caught late — after submission.",
          'DocDefend+ moves that check earlier: it asks whether the documentation defends the code before the claim goes out, using the rules a coder would apply.',
        ],
      },
      {
        heading: 'Approach',
        body: [
          "The core is a full-stack web app that uses the Claude API to validate whether evaluation-and-management (E/M) documentation justifies its assigned billing code. Rather than treating this as free-form text generation, it encodes Epic documentation structure and ICD-10/CPT rules into the validation logic, so the check reflects how the codes actually work.",
          'The second half is an agent problem: a model will happily invent plausible-looking codes. To stop that, I built the platform as an ADK/Gemini agent grounded by a healthcare-terminology MCP server I wrote myself, which makes live calls to the National Library of Medicine (NLM) APIs.',
        ],
      },
      {
        heading: 'What it does',
        body: [
          'Grounded in real terminology, the agent behaves the way a billing check should. It confirms real codes against the live source — for example the E/M code 99214 and the ICD-10 code M54.50 (low back pain, unspecified). It flags fabricated codes as do-not-bill instead of passing them through. And it catches overcoding, for instance recommending a downgrade from 99214 to 99213 when the documentation only supports the lower level.',
          'The grounding is the point: because the terminology lookups hit the NLM APIs live rather than the model\'s memory, a code either exists and checks out or it does not, and the do-not-bill flag has something real behind it.',
        ],
      },
      {
        heading: 'Limitations and what I would do next',
        body: [
          'This is a capstone project, not a deployed billing system — it demonstrates the validation approach rather than clearing the bar for production use in a clinic. Real E/M leveling has edge cases and payer-specific rules that a rules-plus-LLM check does not fully capture.',
          'Next steps I would take: widen the rule coverage beyond the encoded subset, validate the recommendations against a set of real coded encounters, and measure how often the overcoding and do-not-bill flags agree with a human coder.',
        ],
      },
    ],
    links: [
      {
        label: 'Live demo',
        href: 'https://docdefend.vercel.app',
        external: true,
      },
      // TODO(amir): add the DocDefend+ GitHub repo and/or Kaggle writeup link
      // if you'd like them public.
    ],
  },
  {
    slug: 'studentpm',
    number: '04',
    title: 'StudentPM',
    shortTitle: 'StudentPM',
    summary:
      'A JavaFX desktop project-management app with an MVC architecture, SQLite storage, and user authentication.',
    lead:
      'A desktop project-management application built in JavaFX, structured around the MVC pattern with SQLite storage and user authentication.',
    role: 'Graduate coursework project',
    provenance: 'Graduate coursework · UIC MS MIS',
    accent: 'peach',
    depth: 'light',
    tech: ['JavaFX', 'MVC', 'SQLite', 'Auth'],
    sections: [
      {
        heading: 'About',
        body: [
          'StudentPM is a desktop project-management app written in JavaFX. It uses a Model-View-Controller architecture to keep the interface, data, and logic separate, stores data in SQLite, and gates access behind user authentication.',
          'It was a coursework project focused on applying software-design structure — MVC, persistence, and auth — in a working desktop application rather than a throwaway prototype.',
        ],
      },
    ],
    links: [
      {
        label: 'GitHub',
        href: 'https://github.com/aabdur1',
        external: true,
      },
    ],
  },
  {
    slug: 'lighterp',
    number: '05',
    title: 'LightERP',
    shortTitle: 'LightERP',
    summary:
      'A React enterprise-resource-planning MVP backed by Firebase Cloud Firestore, with a full UML documentation suite.',
    lead:
      'A lightweight enterprise-resource-planning MVP built in React on Firebase Cloud Firestore, documented with a full UML suite.',
    role: 'Graduate coursework project',
    provenance: 'Graduate coursework · UIC MS MIS',
    accent: 'mauve',
    depth: 'light',
    tech: ['React', 'Firebase', 'Firestore', 'UML'],
    sections: [
      {
        heading: 'About',
        body: [
          'LightERP is a React MVP for enterprise resource planning, using Firebase Cloud Firestore for its backend. Alongside the app I produced a full UML documentation suite, so the design was specified rather than improvised.',
          'The emphasis was on pairing a working web MVP with the modeling and documentation an ERP system needs, as a coursework exercise in end-to-end system design.',
        ],
      },
    ],
    links: [
      {
        label: 'GitHub',
        href: 'https://github.com/aabdur1',
        external: true,
      },
    ],
  },
  {
    slug: 'ctf-security-labs',
    number: '06',
    title: 'CTF & Security Labs',
    shortTitle: 'Security Labs',
    summary:
      'A Top-20 regional finish in the SANS AWS Skills to Jobs CTF, plus network-forensics and AWS security lab work.',
    lead:
      'I placed in the top 20 regionally in the SANS AWS Skills to Jobs Capture the Flag with 7,498 points, working through network forensics and hands-on AWS security labs.',
    role: 'Competition and self-directed labs',
    provenance: 'SANS competition',
    accent: 'lavender',
    depth: 'light',
    tech: ['AWS', 'KMS', 'VPC', 'S3', 'IAM', 'Network forensics'],
    metrics: [
      { value: 'Top 20', label: 'Regional finish, SANS AWS Skills to Jobs CTF' },
      { value: '7,498', label: 'Points scored' },
    ],
    sections: [
      {
        heading: 'About',
        body: [
          'I finished in the top 20 regionally in the SANS AWS Skills to Jobs Capture the Flag, scoring 7,498 points. The challenges ran across network forensics and packet analysis alongside AWS security work.',
          'The AWS labs covered KMS, VPC, S3, and IAM — the services where most cloud security mistakes actually happen — as hands-on exercises rather than reading.',
        ],
      },
    ],
    links: [],
  },
]
