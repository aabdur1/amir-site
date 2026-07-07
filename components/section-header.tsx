import { SparkRule } from "@/components/spark-rule";

/*
 * Living Ledger section header: a horizontal tick line draws across the page
 * toward the numbered mono label, the peach dot "commits" with a spring pop,
 * and a spark rule (real data, drawn stroke) replaces the static accent rule.
 * Sections alternate `align` left/right at sm+ for editorial rhythm; below sm
 * everything is left-aligned. Server component — no hooks, animation is CSS
 * driven by the `visible` prop from each section's useScrollReveal.
 */

interface SectionHeaderProps {
  number: string;
  label: string;
  title: string;
  visible: boolean;
  align?: "left" | "right";
  annotation?: React.ReactNode;
  spark?: { data: number[]; variant?: "line" | "step" | "bars" };
}

export function SectionHeader({
  number,
  label,
  title,
  visible,
  align = "left",
  annotation,
  spark,
}: SectionHeaderProps) {
  const right = align === "right";

  return (
    <div className={`mb-14 ${right ? "sm:text-right" : ""}`}>
      {/* Tick row: dot + numbered label + hairline drawing away from it */}
      <div
        className={`flex items-center gap-3 mb-4 ${right ? "sm:flex-row-reverse" : ""}`}
        aria-hidden="true"
      >
        <span
          className={`tick-dot w-1.5 h-1.5 rounded-full bg-peach dark:bg-peach-dark shrink-0 ${
            visible ? "is-committed" : ""
          }`}
        />
        <p className="text-[13px] tracking-[0.3em] uppercase font-[family-name:var(--font-mono)] text-ink-subtle dark:text-night-muted whitespace-nowrap">
          <span className="text-peach dark:text-peach-dark">{number}</span>
          <span className="mx-2 text-cream-border dark:text-night-border">/</span>
          {label}
        </p>
        <div
          className={`tick-line flex-1 h-px bg-cream-border dark:bg-night-border ${
            right ? "origin-left sm:origin-right" : "origin-left"
          } ${visible ? "is-drawn" : ""}`}
        />
      </div>

      <div
        style={{ opacity: 0, ...(visible ? { animation: "fade-in-up 0.6s ease-out 0.1s forwards" } : {}) }}
      >
        <h2
          id={`section-${number}`}
          className="text-[length:var(--step-3)] sm:text-[length:var(--step-4)] leading-[1.05] font-[family-name:var(--font-display)] text-ink dark:text-night-text"
        >
          {title}
        </h2>
        {annotation && <p className="annotation mt-3">{annotation}</p>}
      </div>

      <div className={`mt-4 flex ${right ? "sm:justify-end" : ""}`}>
        {spark ? (
          <SparkRule
            data={spark.data}
            variant={spark.variant}
            visible={visible}
            delay={350}
          />
        ) : (
          <div
            className="h-px w-12 bg-mauve dark:bg-mauve-dark origin-left"
            style={{ transform: "scaleX(0)", ...(visible ? { animation: "line-grow 0.8s ease-out 0.3s forwards" } : {}) }}
          />
        )}
      </div>
    </div>
  );
}
