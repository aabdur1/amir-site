"use client";

import { useScrollReveal } from "@/lib/hooks";
import { ACCENT_STYLES } from "@/lib/styles";
import { SectionDivider } from "@/components/section-divider";
import { SectionHeader } from "@/components/section-header";

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
  const [sectionRef, visible] = useScrollReveal();

  return (
    <section ref={sectionRef} className="relative py-20 sm:py-28 bg-cream-dark/50 dark:bg-night-card/40">
      <SectionDivider />

      <div className="max-w-5xl mx-auto px-6 sm:px-8">
        <SectionHeader number="04" label="Skills" title="Technical Stack" visible={visible} />

        {/* Skill categories */}
        <div className="space-y-8">
          {skillCategories.map((category, i) => {
            const s = ACCENT_STYLES[category.accent];
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
                    text-ink-subtle dark:text-night-muted">
                    {category.label}
                  </span>
                </div>

                {/* Skill pills */}
                <div className="flex flex-wrap gap-2">
                  {category.skills.map((skill) => (
                    <span
                      key={skill}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5
                        text-[12px] sm:text-[13px] tracking-wide font-[family-name:var(--font-badge)]
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
