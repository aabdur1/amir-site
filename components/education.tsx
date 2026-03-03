"use client";

import { useScrollReveal } from "@/lib/hooks";
import { SectionDivider } from "@/components/section-divider";
import { SectionHeader } from "@/components/section-header";

export function Education() {
  const [sectionRef, visible] = useScrollReveal();

  return (
    <section
      ref={sectionRef}
      aria-labelledby="section-05"
      className="relative py-20 sm:py-28"
    >
      <SectionDivider />

      <div className="max-w-5xl mx-auto px-6 sm:px-8">
        <SectionHeader number="05" label="Education" title="Education" visible={visible} />

        {/* Content area */}
        <div className="max-w-2xl mx-auto">
          {/* Entry 1: Master's */}
          <div
            style={{
              opacity: 0,
              ...(visible ? { animation: "fade-in-up 0.5s ease-out 200ms forwards" } : {}),
            }}
          >
            <p className="text-xs tracking-[0.15em] uppercase font-[family-name:var(--font-mono)] text-peach dark:text-peach-dark mb-1">
              Expected Fall 2026
            </p>
            <h3 className="font-[family-name:var(--font-display)] text-xl sm:text-2xl text-ink dark:text-night-text">
              Master of Science in Management Information Systems
            </h3>
            <p className="text-sm font-[family-name:var(--font-body)] text-ink-subtle dark:text-night-muted mt-1">
              University of Illinois Chicago
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {[
                "Enterprise App Dev",
                "Systems Analysis",
                "Info Security",
                "Project Management",
                "Healthcare IS",
                "Advanced DB Management",
                "Data Mining for Business",
                "Health Info Management & Analytics",
              ].map((course) => (
                <span
                  key={course}
                  className="border border-cream-border/80 dark:border-night-border/80 bg-transparent rounded-full px-3 py-1 text-[12px] sm:text-[13px] tracking-wide font-[family-name:var(--font-mono)] text-ink-subtle dark:text-night-muted"
                >
                  {course}
                </span>
              ))}
            </div>
          </div>

          {/* Separator */}
          <div className="h-px bg-cream-border/60 dark:bg-night-border/60 my-8" />

          {/* Entry 2: Bachelor's */}
          <div
            style={{
              opacity: 0,
              ...(visible ? { animation: "fade-in-up 0.5s ease-out 400ms forwards" } : {}),
            }}
          >
            <h3 className="font-[family-name:var(--font-display)] text-lg sm:text-xl text-ink dark:text-night-text">
              Bachelor of Arts in Psychology
            </h3>
            <p className="text-sm font-[family-name:var(--font-body)] text-ink-subtle dark:text-night-muted mt-1">
              University of Illinois Chicago · May 2020
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
