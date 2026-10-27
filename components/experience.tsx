"use client";

import { useScrollReveal } from "@/lib/hooks";
import { SectionDivider } from "@/components/section-divider";
import { SectionHeader } from "@/components/section-header";

// Bullets mirror the resume (~/job_search/resume.md) word for word — keep the
// two in sync. IDS 401 is open to undergrads and grads, so never call it an
// undergraduate course; the graded count grows through the semester.
const roles = [
  {
    title: "Graduate Hourly (Teaching Assistant)",
    org: "University of Illinois Chicago — Information & Decision Sciences",
    dates: "Aug 2026 – Present",
    border: "border-mauve dark:border-mauve-dark",
    dot: "bg-mauve/60 dark:bg-mauve-dark/60",
    bullets: [
      "Graded 193 assignments and exams for IDS 401 (Java programming) and IDS 314 (AI Essentials); wrote the IDS 401 rubrics, compiled and tested every Java submission against the answer key, and proctored a 45-student exam.",
    ],
  },
  {
    title: "Chief Medical Scribe",
    org: "ScribeAmerica — Advocate Christ & Condell Medical Centers",
    dates: "Aug 2021 – Sep 2023",
    border: "border-peach dark:border-peach-dark",
    dot: "bg-peach/60 dark:bg-peach-dark/60",
    bullets: [
      "Documented 15+ patient encounters per shift in Epic EHR across high-volume ED and inpatient settings, ensuring complete and accurate medical records; developed deep knowledge of Epic clinical data structure, charge capture, order workflows, and ICD-10/CPT documentation standards.",
      "Promoted to Chief Scribe; trained 3 new scribes on clinical documentation standards and provider-specific Epic workflows, supervising 2 as direct reports.",
      "Selected for AI-documentation pilot program; produced throughput analysis demonstrating a 20% productivity gain vs baseline scribe workflow.",
    ],
  },
];

export function Experience() {
  const [sectionRef, visible] = useScrollReveal();

  return (
    <section ref={sectionRef} aria-labelledby="section-01" className="relative py-20 sm:py-28">
      <SectionDivider />

      <div className="max-w-5xl mx-auto px-6 sm:px-8">
        <SectionHeader
          number="01"
          label="Experience"
          title="Professional Experience"
          visible={visible}
          annotation={<>fig. 01 &middot; n = {roles.length} roles &middot; Epic EHR &middot; UIC IDS</>}
          spark={{ data: [1, 1, 2, 2.5, 3, 4], variant: "step" }}
        />

        <div className="max-w-2xl mx-auto space-y-6">
          {roles.map((role, i) => (
            <div
              key={role.title}
              className={`rounded-2xl border-l-4 ${role.border}
                bg-cream/80 dark:bg-night/60 border-y border-r border-y-cream-border/60 border-r-cream-border/60
                dark:border-y-night-border/60 dark:border-r-night-border/60 p-6 sm:p-8`}
              style={{
                opacity: 0,
                ...(visible ? { animation: `fade-in-up 0.5s ease-out ${200 + i * 150}ms forwards` } : {}),
              }}
            >
              <h3 className="text-xl sm:text-2xl font-[family-name:var(--font-display)] text-ink dark:text-night-text mb-1">
                {role.title}
              </h3>
              <p className="text-sm font-[family-name:var(--font-body)] text-ink-subtle dark:text-night-muted mb-2">
                {role.org}
              </p>
              <p className="text-xs tracking-[0.15em] uppercase font-[family-name:var(--font-mono)] text-peach dark:text-peach-dark mb-5">
                {role.dates}
              </p>
              <ul className="space-y-3">
                {role.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-3 text-sm text-ink dark:text-night-text/80 leading-relaxed">
                    <span className={`mt-2 w-1 h-1 rounded-full ${role.dot} shrink-0`} />
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
