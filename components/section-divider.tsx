interface SectionDividerProps {
  color?: "peach" | "rosewater";
  absolute?: boolean;
}

export function SectionDivider({ color = "peach", absolute = true }: SectionDividerProps) {
  const colorClass = color === "rosewater"
    ? "text-rosewater dark:text-rosewater-dark"
    : "text-peach dark:text-peach-dark";

  return (
    <div
      className={`flex items-center justify-center gap-3 ${
        absolute
          ? "absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2"
          : "mb-12"
      }`}
    >
      <div className="h-px w-12 bg-cream-border dark:bg-night-border" />
      <span className={`${colorClass} text-xs leading-none`}>&#9670;</span>
      <div className="h-px w-12 bg-cream-border dark:bg-night-border" />
    </div>
  );
}
