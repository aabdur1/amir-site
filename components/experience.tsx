"use client";

import { useScrollReveal } from "@/lib/hooks";
import { SectionDivider } from "@/components/section-divider";
import { SectionHeader } from "@/components/section-header";

export function Experience() {
  const [sectionRef, visible] = useScrollReveal();

  return (
    <section ref={sectionRef} aria-labelledby="section-01" className="relative py-20 sm:py-28">
      <SectionDivider />

      <div className="max-w-5xl mx-auto px-6 sm:px-8">
        <SectionHeader number="01" label="Experience" title="Professional Experience" visible={visible} />

        {/* Featured experience card */}
        <div
          className="max-w-2xl mx-auto rounded-2xl border-l-4 border-peach dark:border-peach-dark
            bg-cream/80 dark:bg-night/60 border-y border-r border-y-cream-border/60 border-r-cream-border/60
            dark:border-y-night-border/60 dark:border-r-night-border/60 p-6 sm:p-8"
          style={{
            opacity: 0,
            ...(visible ? { animation: "fade-in-up 0.5s ease-out 200ms forwards" } : {}),
          }}
        >
          <h3 className="text-xl sm:text-2xl font-[family-name:var(--font-display)] text-ink dark:text-night-text mb-1">
            Chief Medical Scribe
          </h3>
          <p className="text-sm font-[family-name:var(--font-body)] text-ink-subtle dark:text-night-muted mb-2">
            ScribeAmerica — Advocate Christ &amp; Condell Medical Centers
          </p>
          <p className="text-xs tracking-[0.15em] uppercase font-[family-name:var(--font-mono)] text-peach dark:text-peach-dark mb-5">
            Aug 2021 – Sep 2023
          </p>
          <ul className="space-y-3">
            <li className="flex gap-3 text-sm text-ink dark:text-night-text/80 leading-relaxed">
              <span className="mt-2 w-1 h-1 rounded-full bg-peach/60 dark:bg-peach-dark/60 shrink-0" />
              Supported 6+ hospitalists with real-time EHR documentation using Epic, capturing patient encounters, progress notes, and discharge summaries in high-volume clinical settings.
            </li>
            <li className="flex gap-3 text-sm text-ink dark:text-night-text/80 leading-relaxed">
              <span className="mt-2 w-1 h-1 rounded-full bg-peach/60 dark:bg-peach-dark/60 shrink-0" />
              Contributed to AI-assisted documentation pilot, helping achieve a 20% productivity improvement. Trained new scribes on Epic workflows and SOAP documentation standards.
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
