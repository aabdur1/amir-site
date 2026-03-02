# Resume Sections Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add four new editorial sections (Experience, Projects, Skills, Education) to the landing page below Certifications, incorporating full resume content.

**Architecture:** Four new client components, each following the Certifications component pattern — IntersectionObserver scroll-triggered reveals, staggered fade-in-up animations, ornamental diamond dividers, numbered mono labels. Inserted into `app/page.tsx` between `<Certifications>` and the footer.

**Tech Stack:** Next.js App Router, React client components, Tailwind CSS 4 (Catppuccin tokens from globals.css), existing animation keyframes.

---

### Task 1: Experience Section

**Files:**
- Create: `components/experience.tsx`

**Step 1: Create the Experience component**

Write `components/experience.tsx` — a `"use client"` component following the exact Certifications pattern:
- IntersectionObserver with `threshold: 0.1` and `triggerOnce` (disconnect after first intersection)
- `visible` state controls animation
- Section uses alternating background: no background class (transparent — Certifications already uses the tinted bg, so Experience alternates to transparent)
- Ornamental diamond divider at top (identical to Certifications)
- Section header: `02 / Experience` mono label, "Professional Experience" display heading, mauve accent rule
- Single featured card with:
  - Left peach accent stripe (4px border-left using `border-l-4 border-peach dark:border-peach-dark`)
  - Role: "Chief Medical Scribe" in `font-display text-2xl`
  - Org: "ScribeAmerica — Advocate Christ & Condell Medical Centers" in body, muted
  - Date: "Aug 2021 – Sep 2023" in mono font, small
  - Two highlight bullets with muted dot markers
  - Card uses `bg-cream/80 dark:bg-night/60 border border-cream-border/60 dark:border-night-border/60 rounded-2xl p-6 sm:p-8`
- All elements get staggered `fade-in-up` animations gated on `visible`

**Step 2: Verify in dev server**

Run: `npm run dev`
Verify: Section appears below Certifications, scroll-triggered animation fires, card renders with peach accent stripe, responsive on mobile.

**Step 3: Commit**

```bash
git add components/experience.tsx
git commit -m "feat: add Experience section with ScribeAmerica role card"
```

---

### Task 2: Projects Section

**Files:**
- Create: `components/projects.tsx`

**Step 1: Create the Projects component**

Write `components/projects.tsx` — same `"use client"` + IntersectionObserver pattern.

- Alternating background: `bg-cream-dark/40 dark:bg-night-card/30` (tinted)
- Diamond divider, section header: `03 / Projects`, "Things I've Built", mauve rule
- 3-column grid: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6`
- Project data as a `const` array:

```ts
const projects = [
  {
    name: "StudentPM",
    subtitle: "Project Management Application",
    description: "JavaFX desktop app with MVC architecture, SQLite integration, and user authentication.",
    pills: ["JavaFX", "MVC", "SQLite", "Auth"],
    accent: "sapphire" as const,
    url: "https://github.com/aabdur1",
  },
  {
    name: "LightERP",
    subtitle: "Enterprise Resource Planning System",
    description: "React MVP with Firebase Cloud Firestore and full UML documentation suite.",
    pills: ["React", "Firebase", "UML"],
    accent: "mauve" as const,
    url: "https://github.com/aabdur1",
  },
  {
    name: "CTF & Security Labs",
    subtitle: "Capture the Flag & Cloud Security",
    description: "Network forensics, packet analysis, and AWS security labs covering KMS, VPC, S3, and IAM.",
    pills: ["AWS", "KMS", "VPC", "Forensics"],
    accent: "lavender" as const,
    url: null,
  },
];
```

- Each card: rounded-2xl, same card styling as cert cards but with a 3px top accent stripe (`border-t-[3px]` with accent color), card-hover treatment via inline transition style (matching certifications pattern), cycling accent hover borders
- Project name in `font-display text-lg`, subtitle in `font-badge italic text-sm`, description in `text-sm text-muted`, tech pills as small accent-tinted tags matching hero badge style
- Cards with GitHub URLs get a small external-link icon; CTF card has no link
- Staggered `fade-in-up` per card: `${200 + i * 100}ms`

**Step 2: Verify in dev server**

Verify: 3-column grid on desktop, stacks on mobile, hover effects work, pills render correctly.

**Step 3: Commit**

```bash
git add components/projects.tsx
git commit -m "feat: add Projects section with StudentPM, LightERP, CTF cards"
```

---

### Task 3: Skills Section

**Files:**
- Create: `components/skills.tsx`

**Step 1: Create the Skills component**

Write `components/skills.tsx` — same pattern.

- Transparent background (alternating)
- Diamond divider, section header: `04 / Skills`, "Technical Stack", mauve rule
- Skills data as a `const` array:

```ts
const skillCategories = [
  {
    label: "Cloud & Security",
    accent: "sapphire" as const,
    skills: ["AWS", "EC2", "S3", "VPC", "KMS", "IAM", "CloudFront", "GCP", "BigQuery", "Looker", "Snowflake", "Firebase", "Zero Trust"],
  },
  {
    label: "Programming",
    accent: "mauve" as const,
    skills: ["Java", "JavaFX", "JavaScript", "React", "Python", "SQL", "HTML/CSS"],
  },
  {
    label: "Healthcare IT",
    accent: "peach" as const,
    skills: ["Epic EMR", "EHR Implementation", "Clinical Workflow", "HIPAA", "Medical Documentation"],
  },
  {
    label: "Tools & Methods",
    accent: "lavender" as const,
    skills: ["UML Modeling", "Agile/Scrum", "Git", "Systems Analysis", "Vendor Management"],
  },
];
```

- Each category row: category label in mono font with colored dot (same as hero badge dot), then a `flex flex-wrap gap-2` of pills
- Pills use the exact hero badge multi-accent style: `bg-{accent}/10 dark:bg-{accent}-dark/12`, `border-{accent}/25`, colored dot, `text-[11px] sm:text-[13px] tracking-wide font-badge`
- Reuse the `PILL_STYLES` map from the design (same structure as `BADGE_STYLES` in hero.tsx — duplicate it here rather than extracting, keeping components self-contained per YAGNI)
- Stagger: categories animate in one after another, `${200 + i * 120}ms`

**Step 2: Verify in dev server**

Verify: Four category rows with flowing pills, accent colors correct per category, responsive wrapping.

**Step 3: Commit**

```bash
git add components/skills.tsx
git commit -m "feat: add Skills section with categorized accent-tinted pills"
```

---

### Task 4: Education Section

**Files:**
- Create: `components/education.tsx`

**Step 1: Create the Education component**

Write `components/education.tsx` — same pattern.

- Alternating background: `bg-cream-dark/40 dark:bg-night-card/30` (tinted)
- Diamond divider, section header: `05 / Education`, "Education", mauve rule
- Two entries stacked vertically with a thin `h-px bg-cream-border dark:bg-night-border` separator between them
- Entry 1 (MS):
  - "Master of Science in Management Information Systems" in `font-display text-xl sm:text-2xl`
  - "University of Illinois Chicago" in body, muted
  - "Expected Spring 2026" in `font-mono text-xs tracking-wide uppercase` with peach color
  - Coursework pills in a `flex flex-wrap gap-2 mt-3`: plain border pills (no accent tint — `border border-cream-border/80 dark:border-night-border/80 bg-transparent`), mono font at `text-[11px]`
  - Coursework: Enterprise App Dev, Systems Analysis, Info Security, Project Management, Healthcare IS
- Entry 2 (BA):
  - "Bachelor of Arts in Psychology" in `font-display text-lg sm:text-xl`
  - "University of Illinois Chicago · May 2020" in body, muted
- Stagger: header animates, then entry 1, then separator, then entry 2

**Step 2: Verify in dev server**

Verify: Two entries render with separator, coursework pills appear, typography hierarchy clear.

**Step 3: Commit**

```bash
git add components/education.tsx
git commit -m "feat: add Education section with degrees and coursework"
```

---

### Task 5: Wire into page.tsx

**Files:**
- Modify: `app/page.tsx`

**Step 1: Import and render all four sections**

Add imports for Experience, Projects, Skills, Education. Render them inside `<PageTransition>` after `<Certifications>`:

```tsx
import { Experience } from "@/components/experience";
import { Projects } from "@/components/projects";
import { Skills } from "@/components/skills";
import { Education } from "@/components/education";

// In render:
<PageTransition>
  <Hero />
  <Certifications badges={badges} />
  <Experience />
  <Projects />
  <Skills />
  <Education />
</PageTransition>
```

**Step 2: Update page metadata**

Update the `description` in the page metadata to reflect the expanded content:
```ts
description: 'Personal site of Amir Abdur-Rahim. MS in MIS at UIC, 1st Place AWS National Cloud Quest, Zscaler Zero Trust Architect. Experience, projects, certifications, and photography. Chicago.',
```

**Step 3: Verify full page flow**

Run: `npm run dev`
Verify: All sections appear in order (Hero → Certs → Experience → Projects → Skills → Education → Footer), scroll progress bar works across the longer page, PageTransition stagger applies to first visit, all scroll-triggered animations fire correctly.

**Step 4: Run lint**

Run: `npm run lint`
Expected: No errors.

**Step 5: Run build**

Run: `npm run build`
Expected: Build succeeds with no errors.

**Step 6: Commit**

```bash
git add app/page.tsx
git commit -m "feat: wire Experience, Projects, Skills, Education into landing page"
```
