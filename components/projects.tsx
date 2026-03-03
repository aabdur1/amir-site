"use client";

import { useScrollReveal } from "@/lib/hooks";
import { ACCENT_STYLES } from "@/lib/styles";
import { SectionDivider } from "@/components/section-divider";
import { SectionHeader } from "@/components/section-header";

const STRIPE_STYLES = {
  sapphire: "border-t-sapphire dark:border-t-sapphire-dark",
  mauve: "border-t-mauve dark:border-t-mauve-dark",
  lavender: "border-t-lavender dark:border-t-lavender-dark",
} as const;

const projects = [
  {
    name: "DocDefend+",
    subtitle: "Clinical Documentation QA Platform",
    description:
      "Full-stack app using Claude AI to validate whether clinical notes support billing codes before claim submission. Defensibility scoring, E/M recommendations, and financial impact analysis.",
    pills: ["React", "Express", "Claude API", "Tailwind"],
    accent: "sapphire" as const,
    url: "https://docdefend.vercel.app",
  },
  {
    name: "StudentPM",
    subtitle: "Project Management Application",
    description:
      "JavaFX desktop app with MVC architecture, SQLite integration, and user authentication.",
    pills: ["JavaFX", "MVC", "SQLite", "Auth"],
    accent: "sapphire" as const,
    url: "https://github.com/aabdur1",
  },
  {
    name: "LightERP",
    subtitle: "Enterprise Resource Planning System",
    description:
      "React MVP with Firebase Cloud Firestore and full UML documentation suite.",
    pills: ["React", "Firebase", "UML"],
    accent: "mauve" as const,
    url: "https://github.com/aabdur1",
  },
  {
    name: "CTF & Security Labs",
    subtitle: "Capture the Flag & Cloud Security",
    description:
      "Network forensics, packet analysis, and AWS security labs covering KMS, VPC, S3, and IAM.",
    pills: ["AWS", "KMS", "VPC", "Forensics"],
    accent: "lavender" as const,
    url: null,
  },
];

export function Projects() {
  const [sectionRef, visible] = useScrollReveal();

  return (
    <section
      ref={sectionRef}
      className="relative py-20 sm:py-28 bg-cream-dark/50 dark:bg-night-card/40"
    >
      <SectionDivider />

      <div className="max-w-5xl mx-auto px-6 sm:px-8">
        <SectionHeader number="02" label="Projects" title="Things I've Built" visible={visible} />

        {/* Project grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {projects.map((project, i) => {
            const s = ACCENT_STYLES[project.accent];

            const cardContent = (
              <>
                {/* Project name */}
                <h3
                  className="text-lg font-[family-name:var(--font-display)]
                    text-ink dark:text-night-text mb-1 leading-tight"
                >
                  {project.name}
                </h3>

                {/* Subtitle */}
                <p
                  className="text-sm font-[family-name:var(--font-badge)] italic
                    text-ink-subtle dark:text-night-muted mb-3"
                >
                  {project.subtitle}
                </p>

                {/* Description */}
                <p
                  className="text-sm font-[family-name:var(--font-body)]
                    text-ink dark:text-night-text/70 leading-relaxed mb-4 flex-1"
                >
                  {project.description}
                </p>

                {/* Tech pills */}
                <div className="flex flex-wrap gap-1.5">
                  {project.pills.map((pill) => (
                    <span
                      key={pill}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1
                        ${s.bg} border ${s.border}
                        text-[12px] sm:text-[13px] tracking-wide font-[family-name:var(--font-badge)]
                        ${s.text}`}
                    >
                      <span className={`w-1 h-1 rounded-full ${s.dot} shrink-0`} />
                      {pill}
                    </span>
                  ))}
                </div>

                {/* Arrow icon — only shown when card is a link */}
                {project.url && (
                  <div className="absolute top-4 right-4 text-ink-faint/40 dark:text-night-muted/40
                    group-hover:text-ink-muted dark:group-hover:text-night-muted
                    transition-colors duration-200">
                    <svg aria-hidden="true" focusable="false" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path
                        fillRule="evenodd"
                        d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
              </>
            );

            const sharedClassName = `group relative flex flex-col p-5 sm:p-6 rounded-2xl
              border-t-[3px] ${STRIPE_STYLES[project.accent]}
              bg-cream/80 dark:bg-night/60
              border border-cream-border/60 dark:border-night-border/60
              ${s.hoverBorder}
              hover:-translate-y-1 hover:shadow-card`;

            const sharedStyle = {
              opacity: 0,
              transition:
                "transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 300ms cubic-bezier(0.34, 1.56, 0.64, 1), border-color 300ms ease",
              ...(visible
                ? {
                    animation: `fade-in-up 0.5s ease-out ${200 + i * 100}ms forwards`,
                  }
                : {}),
            };

            if (project.url) {
              return (
                <a
                  key={project.name}
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${project.name} — ${project.subtitle} (opens in new tab)`}
                  className={sharedClassName}
                  style={sharedStyle}
                >
                  {cardContent}
                </a>
              );
            }

            return (
              <div
                key={project.name}
                className={sharedClassName}
                style={sharedStyle}
              >
                {cardContent}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
