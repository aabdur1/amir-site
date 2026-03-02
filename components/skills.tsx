"use client";

import { useEffect, useRef, useState } from "react";

const PILL_STYLES = {
  sapphire: {
    bg: "bg-sapphire/10 dark:bg-sapphire-dark/12",
    border: "border-sapphire/25 dark:border-sapphire-dark/25",
    dot: "bg-sapphire dark:bg-sapphire-dark",
    text: "text-ink/80 dark:text-night-text/80",
  },
  mauve: {
    bg: "bg-mauve/10 dark:bg-mauve-dark/12",
    border: "border-mauve/25 dark:border-mauve-dark/25",
    dot: "bg-mauve dark:bg-mauve-dark",
    text: "text-ink/80 dark:text-night-text/80",
  },
  peach: {
    bg: "bg-peach/10 dark:bg-peach-dark/12",
    border: "border-peach/25 dark:border-peach-dark/25",
    dot: "bg-peach dark:bg-peach-dark",
    text: "text-ink/80 dark:text-night-text/80",
  },
  lavender: {
    bg: "bg-lavender/10 dark:bg-lavender-dark/12",
    border: "border-lavender/25 dark:border-lavender-dark/25",
    dot: "bg-lavender dark:bg-lavender-dark",
    text: "text-ink/80 dark:text-night-text/80",
  },
} as const;

const skillCategories = [
  {
    label: "Cloud & Security",
    accent: "sapphire" as const,
    skills: ["AWS", "EC2", "S3", "VPC", "KMS", "IAM", "CloudFront", "GCP", "Firebase", "Zero Trust"],
  },
  {
    label: "Programming",
    accent: "mauve" as const,
    skills: ["Java", "JavaFX", "JavaScript", "React", "Python", "R", "SQL", "HTML/CSS"],
  },
  {
    label: "Healthcare IT",
    accent: "peach" as const,
    skills: ["Epic EMR", "EHR Implementation", "Clinical Workflow", "HIPAA", "Medical Documentation"],
  },
  {
    label: "AI & Analytics",
    accent: "sapphire" as const,
    skills: ["Claude Code", "Google Colab", "BigQuery", "Looker", "Snowflake"],
  },
  {
    label: "Tools & Methods",
    accent: "lavender" as const,
    skills: ["UML Modeling", "Agile/Scrum", "Git", "Systems Analysis", "Vendor Management"],
  },
];

export function Skills() {
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
    <section ref={sectionRef} className="relative py-20 sm:py-28 bg-cream-dark/40 dark:bg-night-card/30">
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
          <p className="text-[13px] tracking-[0.3em] uppercase font-[family-name:var(--font-mono)]
            text-ink-muted dark:text-night-muted mb-3">
            <span className="text-peach dark:text-peach-dark">04</span>
            <span className="mx-2 text-cream-border dark:text-night-border">/</span>
            Skills
          </p>
          <h2 className="text-3xl sm:text-4xl font-[family-name:var(--font-display)]
            text-ink dark:text-night-text">
            Technical Stack
          </h2>
          <div
            className="mt-4 mx-auto h-px w-12 bg-mauve dark:bg-mauve-dark origin-center"
            style={{
              transform: "scaleX(0)",
              ...(visible ? { animation: "line-grow 0.8s ease-out 0.3s forwards" } : {}),
            }}
          />
        </div>

        {/* Skill categories */}
        <div className="space-y-8">
          {skillCategories.map((category, i) => {
            const s = PILL_STYLES[category.accent];
            return (
              <div
                key={category.label}
                style={{
                  opacity: 0,
                  ...(visible
                    ? { animation: `fade-in-up 0.5s ease-out ${200 + i * 120}ms forwards` }
                    : {}),
                }}
              >
                {/* Category label with colored dot */}
                <div className="flex items-center gap-2 mb-3">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
                  <span className="font-[family-name:var(--font-mono)] text-xs tracking-[0.2em] uppercase
                    text-ink-muted dark:text-night-muted">
                    {category.label}
                  </span>
                </div>

                {/* Skill pills */}
                <div className="flex flex-wrap gap-2">
                  {category.skills.map((skill) => (
                    <span
                      key={skill}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5
                        text-[11px] sm:text-[13px] tracking-wide font-[family-name:var(--font-badge)]
                        ${s.bg} border ${s.border} ${s.text}`}
                    >
                      <span className={`w-1 h-1 rounded-full shrink-0 ${s.dot}`} />
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
