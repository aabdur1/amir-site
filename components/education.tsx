"use client";

import { useEffect, useRef, useState } from "react";

export function Education() {
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
    <section
      ref={sectionRef}
      className="relative py-20 sm:py-28"
    >
      {/* Top ornamental divider */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 flex items-center gap-3 -translate-y-1/2">
        <div className="h-px w-12 bg-cream-border dark:bg-night-border" />
        <span className="text-peach dark:text-peach-dark text-xs leading-none">&#9670;</span>
        <div className="h-px w-12 bg-cream-border dark:bg-night-border" />
      </div>

      <div className="max-w-5xl mx-auto px-6 sm:px-8">
        {/* Section header */}
        <div
          className="text-center mb-14"
          style={{
            opacity: 0,
            ...(visible ? { animation: "fade-in-up 0.6s ease-out forwards" } : {}),
          }}
        >
          <p className="text-[13px] tracking-[0.3em] uppercase font-[family-name:var(--font-mono)] text-ink-muted dark:text-night-muted mb-3">
            <span className="text-peach dark:text-peach-dark">05</span>
            <span className="mx-2 text-cream-border dark:text-night-border">/</span>
            Education
          </p>
          <h2 className="text-3xl sm:text-4xl font-[family-name:var(--font-display)] text-ink dark:text-night-text">
            Education
          </h2>
          <div
            className="mt-4 mx-auto h-px w-12 bg-mauve dark:bg-mauve-dark origin-center"
            style={{
              transform: "scaleX(0)",
              ...(visible ? { animation: "line-grow 0.8s ease-out 0.3s forwards" } : {}),
            }}
          />
        </div>

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
            <p className="text-sm font-[family-name:var(--font-body)] text-ink-muted dark:text-night-muted mt-1">
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
                  className="border border-cream-border/80 dark:border-night-border/80 bg-transparent rounded-full px-3 py-1 text-[11px] tracking-wide font-[family-name:var(--font-mono)] text-ink-muted dark:text-night-muted"
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
            <p className="text-sm font-[family-name:var(--font-body)] text-ink-muted dark:text-night-muted mt-1">
              University of Illinois Chicago · May 2020
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
