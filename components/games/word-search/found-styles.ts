// Accent cycle for found words — bg tints the grid cells, dot marks the
// word-list entry (list text stays muted ink for AA contrast; the lighter
// accents fail AA as text). Own module: grid.tsx and word-list.tsx both
// need it and the container imports both of them.
export const FOUND_STYLES: { bg: string; dot: string }[] = [
  { bg: "bg-sapphire/20 dark:bg-sapphire-dark/25", dot: "bg-sapphire dark:bg-sapphire-dark" },
  { bg: "bg-mauve/20 dark:bg-mauve-dark/25", dot: "bg-mauve dark:bg-mauve-dark" },
  { bg: "bg-peach/20 dark:bg-peach-dark/25", dot: "bg-peach dark:bg-peach-dark" },
  { bg: "bg-lavender/20 dark:bg-lavender-dark/25", dot: "bg-lavender dark:bg-lavender-dark" },
  { bg: "bg-rosewater/20 dark:bg-rosewater-dark/25", dot: "bg-rosewater dark:bg-rosewater-dark" },
]
