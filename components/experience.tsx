"use client";

import { useEffect, useRef, useState } from "react";

export function Experience() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="relative py-20 sm:py-28">
      {/* Ornamental diamond divider at top */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 flex items-center gap-3 -translate-y-1/2">
        <div className="h-px w-12 bg-cream-border dark:bg-night-border" />
        <span className="text-peach dark:text-peach-dark text-xs leading-none">&#9670;</span>
        <div className="h-px w-12 bg-cream-border dark:bg-night-border" />
      </div>

      <div className="max-w-5xl mx-auto px-6 sm:px-8">
        {/* Section header */}
        <div
          className="text-center mb-14"
          style={{ opacity: 0, ...(visible ? { animation: "fade-in-up 0.6s ease-out forwards" } : {}) }}
        >
          <p className="text-[13px] tracking-[0.3em] uppercase font-[family-name:var(--font-mono)] text-ink-muted dark:text-night-muted mb-3">
            <span className="text-peach dark:text-peach-dark">01</span>
            <span className="mx-2 text-cream-border dark:text-night-border">/</span>
            Experience
          </p>
          <h2 className="text-3xl sm:text-4xl font-[family-name:var(--font-display)] text-ink dark:text-night-text">
            Professional Experience
          </h2>
          <div
            className="mt-4 mx-auto h-px w-12 bg-mauve dark:bg-mauve-dark origin-center"
            style={{ transform: "scaleX(0)", ...(visible ? { animation: "line-grow 0.8s ease-out 0.3s forwards" } : {}) }}
          />
        </div>

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
          <p className="text-sm font-[family-name:var(--font-body)] text-ink-muted dark:text-night-muted mb-2">
            ScribeAmerica — Advocate Christ &amp; Condell Medical Centers
          </p>
          <p className="text-xs tracking-[0.15em] uppercase font-[family-name:var(--font-mono)] text-peach dark:text-peach-dark mb-5">
            Aug 2021 – Sep 2023
          </p>
          <ul className="space-y-3">
            <li className="flex gap-3 text-sm text-ink/80 dark:text-night-text/80 leading-relaxed">
              <span className="mt-2 w-1 h-1 rounded-full bg-peach/60 dark:bg-peach-dark/60 shrink-0" />
              Supported 6+ hospitalists with real-time EHR documentation using Epic, capturing patient encounters, progress notes, and discharge summaries in high-volume clinical settings.
            </li>
            <li className="flex gap-3 text-sm text-ink/80 dark:text-night-text/80 leading-relaxed">
              <span className="mt-2 w-1 h-1 rounded-full bg-peach/60 dark:bg-peach-dark/60 shrink-0" />
              Contributed to AI-assisted documentation pilot, helping achieve a 20% productivity improvement. Trained new scribes on Epic workflows and SOAP documentation standards.
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
