"use client";

import { useEffect, useRef, useState } from "react";

const ACCENT_STYLES = {
  sapphire: {
    bg: "bg-sapphire/10 dark:bg-sapphire-dark/12",
    border: "border-sapphire/25 dark:border-sapphire-dark/25",
    hoverBorder: "hover:border-sapphire/50 dark:hover:border-sapphire-dark/50",
    dot: "bg-sapphire dark:bg-sapphire-dark",
    text: "text-ink/80 dark:text-night-text/80",
    stripe: "border-t-sapphire dark:border-t-sapphire-dark",
  },
  mauve: {
    bg: "bg-mauve/10 dark:bg-mauve-dark/12",
    border: "border-mauve/25 dark:border-mauve-dark/25",
    hoverBorder: "hover:border-mauve/50 dark:hover:border-mauve-dark/50",
    dot: "bg-mauve dark:bg-mauve-dark",
    text: "text-ink/80 dark:text-night-text/80",
    stripe: "border-t-mauve dark:border-t-mauve-dark",
  },
  lavender: {
    bg: "bg-lavender/10 dark:bg-lavender-dark/12",
    border: "border-lavender/25 dark:border-lavender-dark/25",
    hoverBorder: "hover:border-lavender/50 dark:hover:border-lavender-dark/50",
    dot: "bg-lavender dark:bg-lavender-dark",
    text: "text-ink/80 dark:text-night-text/80",
    stripe: "border-t-lavender dark:border-t-lavender-dark",
  },
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
      className="relative py-20 sm:py-28 bg-cream-dark/40 dark:bg-night-card/30"
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
          <p
            className="text-[13px] tracking-[0.3em] uppercase font-[family-name:var(--font-mono)]
              text-ink-muted dark:text-night-muted mb-3"
          >
            <span className="text-peach dark:text-peach-dark">02</span>
            <span className="mx-2 text-cream-border dark:text-night-border">/</span>
            Projects
          </p>
          <h2
            className="text-3xl sm:text-4xl font-[family-name:var(--font-display)]
              text-ink dark:text-night-text"
          >
            Things I&apos;ve Built
          </h2>
          <div
            className="mt-4 mx-auto h-px w-12 bg-mauve dark:bg-mauve-dark origin-center"
            style={{
              transform: "scaleX(0)",
              ...(visible ? { animation: "line-grow 0.8s ease-out 0.3s forwards" } : {}),
            }}
          />
        </div>

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
                    text-ink-muted dark:text-night-muted mb-3"
                >
                  {project.subtitle}
                </p>

                {/* Description */}
                <p
                  className="text-sm font-[family-name:var(--font-body)]
                    text-ink/80 dark:text-night-text/70 leading-relaxed mb-4 flex-1"
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
                        text-[10px] sm:text-[11px] tracking-wide font-[family-name:var(--font-badge)]
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
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
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
              border-t-[3px] ${s.stripe}
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
