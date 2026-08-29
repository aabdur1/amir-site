// app/games/page.tsx
// Deliberately unlisted: robots noindex, no sitemap entry, no nav pill.
// Anyone with the link plays; search engines that stumble on it don't index.
import type { Metadata } from 'next'
import { GAMES, type GameSlug } from '@/lib/games/games'
import { GameCard } from '@/components/games/game-card'
import { PageTransition } from '@/components/page-transition'

export const metadata: Metadata = {
  title: 'Games — Hand-Built & Ad-Free',
  description: 'A small collection of hand-built, ad-free browser games.',
  robots: { index: false },
}

// Drawn sudoku-grid motif in the learn-index illustration style: solid
// strokes carry draw-stroke (+pathLength) so they draw when the card's
// is-drawn container reveals.
function SudokuIllustration() {
  return (
    <svg width="80" height="64" viewBox="0 0 80 64" aria-hidden="true" focusable="false">
      <rect x="13" y="5" width="54" height="54" rx="2" fill="none" stroke="currentColor" strokeWidth="2"
        className="text-sapphire dark:text-sapphire-dark draw-stroke" pathLength={100} />
      <line x1="31" y1="5" x2="31" y2="59" stroke="currentColor" strokeWidth="1.5"
        className="text-sapphire dark:text-sapphire-dark draw-stroke" pathLength={100} style={{ animationDelay: '150ms' }} />
      <line x1="49" y1="5" x2="49" y2="59" stroke="currentColor" strokeWidth="1.5"
        className="text-sapphire dark:text-sapphire-dark draw-stroke" pathLength={100} style={{ animationDelay: '220ms' }} />
      <line x1="13" y1="23" x2="67" y2="23" stroke="currentColor" strokeWidth="1.5"
        className="text-sapphire dark:text-sapphire-dark draw-stroke" pathLength={100} style={{ animationDelay: '290ms' }} />
      <line x1="13" y1="41" x2="67" y2="41" stroke="currentColor" strokeWidth="1.5"
        className="text-sapphire dark:text-sapphire-dark draw-stroke" pathLength={100} style={{ animationDelay: '360ms' }} />
      <circle cx="40" cy="32" r="3.5" className="fill-peach dark:fill-peach-dark" />
      <circle cx="22" cy="14" r="3.5" className="fill-mauve dark:fill-mauve-dark" opacity="0.7" />
      <circle cx="58" cy="50" r="3.5" className="fill-lavender dark:fill-lavender-dark" opacity="0.7" />
    </svg>
  )
}

// Letter-grid motif with one found word: faint grid dots, a lavender
// diagonal draw-stroke run, accent dots at the ends.
function WordSearchIllustration() {
  return (
    <svg width="80" height="64" viewBox="0 0 80 64" aria-hidden="true" focusable="false">
      {Array.from({ length: 5 }, (_, r) =>
        Array.from({ length: 6 }, (_, c) => (
          <circle key={`${r}-${c}`} cx={15 + c * 10} cy={12 + r * 10} r="1.5"
            className="fill-ink-faint dark:fill-night-border" />
        ))
      )}
      <line x1="15" y1="12" x2="55" y2="52" stroke="currentColor" strokeWidth="2.5"
        strokeLinecap="round" className="text-lavender dark:text-lavender-dark draw-stroke"
        pathLength={100} />
      <circle cx="15" cy="12" r="3.5" className="fill-peach dark:fill-peach-dark" />
      <circle cx="55" cy="52" r="3.5" className="fill-mauve dark:fill-mauve-dark" opacity="0.7" />
    </svg>
  )
}

const ILLUSTRATIONS: Record<GameSlug, React.ReactNode> = {
  sudoku: <SudokuIllustration />,
  'word-search': <WordSearchIllustration />,
}

export default function GamesPage() {
  return (
    <PageTransition>
      <section className="pt-16 pb-24 mx-auto max-w-5xl px-6 sm:px-10 lg:px-12">
        <header className="mb-12">
          <p className="font-[family-name:var(--font-mono)] text-[13px] tracking-[0.3em] uppercase
            text-ink-subtle dark:text-night-muted mb-4">
            <span className="text-peach dark:text-peach-dark">fig. 00</span>
            <span className="mx-2 text-cream-border dark:text-night-border">·</span>
            0 ads · 0 tracking · 0 accounts
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl
            text-ink dark:text-night-text mb-4">
            Games
          </h1>
          <p className="max-w-xl text-[15px] leading-relaxed text-ink-subtle dark:text-night-muted">
            Hand-built browser games with nothing to sit through and nothing to buy.
            Made for my mom, who deserves to place a number without watching a
            15-second ad first.
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {GAMES.map((game, i) => (
            <GameCard key={game.slug} game={game} index={i} illustration={ILLUSTRATIONS[game.slug]} />
          ))}
        </div>

        <p className="mt-10 font-[family-name:var(--font-mono)] text-[12px]
          text-ink-subtle dark:text-night-muted">
          more games in the works —
        </p>
      </section>
    </PageTransition>
  )
}
