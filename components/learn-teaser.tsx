"use client";

import Link from "next/link";
import { ARTIFACTS } from "@/lib/learn/artifacts";
import { useScrollReveal } from "@/lib/hooks";
import { SectionDivider } from "@/components/section-divider";
import { SectionHeader } from "@/components/section-header";

const TEASER_SLUGS = ["neural-networks", "pca", "shap"];

const teaserArtifacts = TEASER_SLUGS.flatMap((slug) => {
  const a = ARTIFACTS.find((a) => a.slug === slug);
  return a ? [a] : [];
});

export function LearnTeaser() {
  const [sectionRef, visible] = useScrollReveal();

  return (
    <section
      ref={sectionRef}
      aria-labelledby="section-06"
      className="relative py-20 sm:py-28 bg-cream-dark/50 dark:bg-night-card/40"
    >
      <SectionDivider />

      <div className="max-w-5xl mx-auto px-6 sm:px-8">
        <SectionHeader
          number="06"
          label="Learn"
          title="Learning in Public"
          visible={visible}
          align="right"
          annotation={
            <>
              fig. 06 &middot; {ARTIFACTS.length} explainers &middot;{" "}
              {ARTIFACTS.reduce((n, a) => n + a.sectionCount, 0)} sections
            </>
          }
          spark={{ data: [7, 4, 2.6, 1.9, 1.5, 1.3, 1.2], variant: "line" }}
        />

        <p
          className="text-sm sm:text-base font-[family-name:var(--font-body)]
            text-ink-subtle dark:text-night-muted leading-relaxed mb-8 max-w-2xl"
          style={{
            opacity: 0,
            ...(visible ? { animation: "fade-in-up 0.5s ease-out 150ms forwards" } : {}),
          }}
        >
          Interactive ML explainers, built while studying for my data mining coursework.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {teaserArtifacts.map((artifact, i) => (
            <Link
              key={artifact.slug}
              href={`/learn/${artifact.slug}`}
              className="group flex flex-col p-5 rounded-2xl
                bg-cream/80 dark:bg-night/60
                border border-cream-border/60 dark:border-night-border/60
                hover:border-mauve/50 dark:hover:border-mauve-dark/50
                hover:-translate-y-1 hover:shadow-card"
              style={{
                opacity: 0,
                transition:
                  "transform 300ms var(--ease-spring), box-shadow 300ms var(--ease-spring), border-color 300ms ease",
                ...(visible
                  ? { animation: `fade-in-up 0.5s ease-out ${250 + i * 100}ms forwards` }
                  : {}),
              }}
            >
              <span className="text-xs font-[family-name:var(--font-mono)] text-peach dark:text-peach-dark mb-2">
                {artifact.number}/
              </span>
              <h3 className="text-lg font-[family-name:var(--font-display)] text-ink dark:text-night-text leading-tight mb-2">
                {artifact.title}
              </h3>
              <p className="text-[13px] font-[family-name:var(--font-body)] text-ink-subtle dark:text-night-muted leading-relaxed mb-3 flex-1">
                {artifact.subtopics.slice(0, 4).join(" · ")}
              </p>
              <span className="text-xs font-[family-name:var(--font-mono)] text-ink-subtle dark:text-night-muted tracking-wide">
                {artifact.sectionCount} sections · interactive
              </span>
            </Link>
          ))}
        </div>

        <div
          className="text-center mt-10"
          style={{
            opacity: 0,
            ...(visible ? { animation: "fade-in 0.6s ease-out 700ms forwards" } : {}),
          }}
        >
          <Link
            href="/learn"
            className="inline-flex items-center gap-2 py-3 text-sm font-[family-name:var(--font-body)]
              text-ink-subtle dark:text-night-muted
              hover:text-ink dark:hover:text-night-text
              transition-colors duration-200"
          >
            Explore all {ARTIFACTS.length}
            <svg aria-hidden="true" focusable="false" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
