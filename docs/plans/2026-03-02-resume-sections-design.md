# Resume Sections — Landing Page Expansion

## Goal

Incorporate full resume content into the landing page as new editorial sections below Certifications. Site serves dual audience: recruiters/hiring managers and personal brand/community.

## Approach

Editorial Longform — each resume section becomes a numbered, full-bleed editorial section following the existing Catppuccin editorial design system.

## Page Flow

1. Hero (existing)
2. Experience — `01/`
3. Projects — `02/`
4. Certifications — `03/`
5. Skills — `04/`
6. Education — `05/`
7. Footer (existing)

## Section Designs

### 01/ Experience — "Professional Experience"

Single featured card (one role).

- Alternating background (`bg-cream-dark/40 dark:bg-night-card/30`)
- Card: left peach accent stripe (4px vertical bar)
- **Role:** "Chief Medical Scribe" in display font (~2xl)
- **Org:** "ScribeAmerica — Advocate Christ & Condell Medical Centers" body, muted
- **Date:** "Aug 2021 – Sep 2023" mono tag
- **Highlights** (2 bullets):
  - Supported 6+ hospitalists with real-time EHR documentation using Epic
  - Contributed to AI-assisted documentation pilot — 20% productivity improvement
- Accent: peach

### 02/ Projects — "Things I've Built"

2-column grid (1-col mobile), `card-hover` treatment.

1. **DocDefend+** (sapphire) — "Clinical Documentation QA Platform" — Full-stack app using Claude AI to validate clinical notes support billing codes. Pills: `React` `Express` `Claude API` `Tailwind`. Live: docdefend.vercel.app
2. **StudentPM** (sapphire) — "Project Management Application" — JavaFX desktop app with MVC, SQLite, auth. Pills: `JavaFX` `MVC` `SQLite` `Auth`
3. **LightERP** (mauve) — "Enterprise Resource Planning System" — React MVP with Firebase, full UML docs. Pills: `React` `Firebase` `UML`
4. **CTF & Security Labs** (lavender) — "Capture the Flag & Cloud Security" — Network forensics, AWS security labs. Pills: `AWS` `KMS` `VPC` `Forensics`

Cards have top accent stripe, link to GitHub/live site where applicable.

### 04/ Skills — "Technical Stack"

5 category rows, each with label + flowing accent-tinted pills (same style as hero badge pills).

| Category | Accent | Skills |
|----------|--------|--------|
| Cloud & Security | Sapphire | AWS, EC2, S3, VPC, KMS, IAM, CloudFront, GCP, Firebase, Zero Trust |
| Programming | Mauve | Java, JavaFX, JavaScript, React, Python, R, SQL, HTML/CSS |
| Healthcare IT | Peach | Epic EMR, EHR Implementation, Clinical Workflow, HIPAA, Medical Documentation |
| AI & Analytics | Sapphire | Claude Code, Google Colab, BigQuery, Looker, Snowflake |
| Tools & Methods | Lavender | UML Modeling, Agile/Scrum, Git, Systems Analysis, Vendor Management |

### 05/ Education — "Education"

Two stacked entries, minimal typography-driven layout.

**Entry 1 (prominent):**
- "Master of Science in Management Information Systems" — display font xl
- "University of Illinois Chicago" — body, muted
- "Expected Fall 2026" — mono tag
- Coursework pills (no accent tint, just border): Enterprise App Dev, Systems Analysis, Info Security, Project Management, Healthcare IS, Advanced DB Management, Data Mining for Business, Health Info Management & Analytics

**Entry 2 (secondary):**
- "Bachelor of Arts in Psychology" — display font (smaller)
- "University of Illinois Chicago · May 2020" — body, muted

Separated by thin horizontal rule.

## Shared Patterns

- Scroll-triggered reveals via IntersectionObserver (same as Certifications)
- Staggered animation within sections (header → content → details)
- Alternating section backgrounds (transparent / cream-dark)
- Mobile-first, 320px safe
- `prefers-reduced-motion` respected
- Ornamental diamond dividers between sections
- Numbered mono labels (`02/`, `03/`, etc.) + display font headings + mauve accent rules

## New Files

- `components/experience.tsx` — Experience section
- `components/projects.tsx` — Projects section
- `components/skills.tsx` — Skills section
- `components/education.tsx` — Education section

## Modified Files

- `app/page.tsx` — Import and render new sections below Certifications

## Future Enhancements

### Healthcare Analytics Project Card
Add a project card for health data analysis work from the Health Info Management & Analytics course (IDS 506 / similar). This would be a strong addition to the Projects section — concrete evidence of the "healthcare meets technology" positioning using real clinical datasets.

Potential card:
- **Name:** Healthcare Analytics
- **Subtitle:** Clinical Data Analysis
- **Description:** Predictive modeling and statistical analysis on clinical datasets — survival analysis, logistic regression, patient outcome modeling.
- **Pills:** `R` `Python` `Logistic Regression` `Survival Analysis`
- **Accent:** peach (healthcare color)

Add when the coursework produces a presentable project or write-up.
