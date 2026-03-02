export const ACCENT_STYLES = {
  sapphire: {
    bg: "bg-sapphire/10 dark:bg-sapphire-dark/12",
    border: "border-sapphire/25 dark:border-sapphire-dark/25",
    hoverBorder: "hover:border-sapphire/50 dark:hover:border-sapphire-dark/50",
    dot: "bg-sapphire dark:bg-sapphire-dark",
    text: "text-ink dark:text-night-text/80",
  },
  mauve: {
    bg: "bg-mauve/10 dark:bg-mauve-dark/12",
    border: "border-mauve/25 dark:border-mauve-dark/25",
    hoverBorder: "hover:border-mauve/50 dark:hover:border-mauve-dark/50",
    dot: "bg-mauve dark:bg-mauve-dark",
    text: "text-ink dark:text-night-text/80",
  },
  peach: {
    bg: "bg-peach/10 dark:bg-peach-dark/12",
    border: "border-peach/25 dark:border-peach-dark/25",
    hoverBorder: "hover:border-peach/50 dark:hover:border-peach-dark/50",
    dot: "bg-peach dark:bg-peach-dark",
    text: "text-ink dark:text-night-text/80",
  },
  lavender: {
    bg: "bg-lavender/10 dark:bg-lavender-dark/12",
    border: "border-lavender/25 dark:border-lavender-dark/25",
    hoverBorder: "hover:border-lavender/50 dark:hover:border-lavender-dark/50",
    dot: "bg-lavender dark:bg-lavender-dark",
    text: "text-ink dark:text-night-text/80",
  },
} as const;

export type AccentColor = keyof typeof ACCENT_STYLES;
