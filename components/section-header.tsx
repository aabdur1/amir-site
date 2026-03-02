interface SectionHeaderProps {
  number: string;
  label: string;
  title: string;
  visible: boolean;
}

export function SectionHeader({ number, label, title, visible }: SectionHeaderProps) {
  return (
    <div
      className="text-center mb-14"
      style={{ opacity: 0, ...(visible ? { animation: "fade-in-up 0.6s ease-out forwards" } : {}) }}
    >
      <p className="text-[13px] tracking-[0.3em] uppercase font-[family-name:var(--font-mono)] text-ink-subtle dark:text-night-muted mb-3">
        <span className="text-peach dark:text-peach-dark">{number}</span>
        <span className="mx-2 text-cream-border dark:text-night-border">/</span>
        {label}
      </p>
      <h2 className="text-3xl sm:text-4xl font-[family-name:var(--font-display)] text-ink dark:text-night-text">
        {title}
      </h2>
      <div
        className="mt-4 mx-auto h-px w-12 bg-mauve dark:bg-mauve-dark origin-center"
        style={{ transform: "scaleX(0)", ...(visible ? { animation: "line-grow 0.8s ease-out 0.3s forwards" } : {}) }}
      />
    </div>
  );
}
