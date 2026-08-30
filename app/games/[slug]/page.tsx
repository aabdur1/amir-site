// app/games/[slug]/page.tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { GAMES, getGame, type GameSlug } from '@/lib/games/games'
import { GameErrorBoundary } from '@/components/games/game-error-boundary'
import { PageTransition } from '@/components/page-transition'
import { Sudoku, WordSearch, WordScramble, Mahjong } from '@/components/games/dynamic-games'

export function generateStaticParams() {
  return GAMES.map((g) => ({ slug: g.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const game = getGame(slug)
  if (!game) return {}
  return {
    title: `${game.title} — Games`,
    description: game.description,
    robots: { index: false },
  }
}

const GAME_COMPONENTS: Record<GameSlug, React.ComponentType> = {
  sudoku: Sudoku,
  'word-search': WordSearch,
  'word-scramble': WordScramble,
  mahjong: Mahjong,
}

export default async function GamePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const game = getGame(slug)
  if (!game) notFound()

  const GameComponent = GAME_COMPONENTS[game.slug]

  return (
    <PageTransition>
      <article className="relative pt-8 pb-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-10 lg:px-12">
          <Link
            href="/games"
            className="inline-flex items-center gap-2 text-ink-subtle dark:text-night-muted
              hover:text-mauve dark:hover:text-mauve-dark transition-colors mb-6
              font-[family-name:var(--font-mono)] text-[12px] tracking-wide uppercase"
          >
            <svg
              aria-hidden="true"
              focusable="false"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3 w-3"
            >
              <path d="M10 6H2M5 9L2 6l3-3" />
            </svg>
            Back to Games
          </Link>
        </div>

        <GameErrorBoundary>
          <GameComponent />
        </GameErrorBoundary>
      </article>
    </PageTransition>
  )
}
