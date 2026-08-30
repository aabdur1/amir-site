"use client"

// The 26 mahjong tile faces — small parametric editorial SVGs in a 40x40
// viewBox, rendered at ~44px on the board. Catppuccin Latte hexes hardcoded
// (learn-artifact pattern, confetti.tsx precedent): the tile GROUND stays
// cream in both themes (a physical tile face, not a themed UI surface), so
// these colors must not shift with dark mode — no Tailwind color classes or
// dark: variants inside any face.
//
// FACE_REGISTRY is a Record over the full Kind union: adding a kind to
// engine.ts's KINDS without adding a matching face here fails to compile
// (the /work FIGURES / /games ILLUSTRATIONS precedent).

import type { Kind } from '@/lib/games/mahjong/engine'

const SAPPHIRE = '#209fb5'
const PEACH = '#fe640b'
const TEAL = '#179299'
const GROUND = '#ffffff'
const INK = '#4c4f69'
const MAUVE = '#8839ef'
const LAVENDER = '#7287fd'
const RED = '#d20f39'
const INK_SUBTLE = '#5c5f77'

type Point = [number, number]

const DOT_CENTERS: Record<number, Point[]> = {
  1: [[20, 20]],
  2: [[14, 14], [26, 26]],
  3: [[12, 12], [20, 20], [28, 28]],
  4: [[13, 13], [27, 13], [13, 27], [27, 27]],
  5: [[13, 13], [27, 13], [13, 27], [27, 27], [20, 20]],
  6: [[13, 11], [27, 11], [13, 20], [27, 20], [13, 29], [27, 29]],
  7: [[12, 10], [20, 10], [28, 10], [13, 22], [27, 22], [13, 32], [27, 32]],
  8: [
    [13, 9], [27, 9],
    [13, 16.5], [27, 16.5],
    [13, 24], [27, 24],
    [13, 31.5], [27, 31.5],
  ],
}

// Dots — N sapphire circles (r=4), except dot-1: a single larger peach
// circle. dot-1 reads as "the ace", the visual anchor of the suit.
function Dots({ n }: { n: number }) {
  if (n === 1) {
    return <circle cx={20} cy={20} r={7} fill={PEACH} />
  }
  const r = n === 7 || n === 8 ? 3.5 : 4
  return (
    <>
      {DOT_CENTERS[n].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill={SAPPHIRE} />
      ))}
    </>
  )
}

const BAM_CENTERS: Record<number, Point[]> = {
  1: [[20, 20]],
  2: [[20, 13], [20, 27]],
  3: [[20, 12], [14, 28], [26, 28]],
  4: [[14, 13], [26, 13], [14, 27], [26, 27]],
  5: [[14, 13], [26, 13], [14, 27], [26, 27], [20, 20]],
  6: [[12, 13], [20, 13], [28, 13], [12, 27], [20, 27], [28, 27]],
  7: [[20, 10], [12, 22], [20, 22], [28, 22], [12, 32], [20, 32], [28, 32]],
  8: [
    [12, 10], [20, 10], [28, 10],
    [12, 20], [28, 20],
    [12, 30], [20, 30], [28, 30],
  ],
}

// Bamboo — N teal rounded-rect sticks, each with a 1px ground-color gap
// line at mid-height (the classic bamboo-node notch).
function Bamboo({ n }: { n: number }) {
  return (
    <>
      {BAM_CENTERS[n].map(([cx, cy], i) => (
        <g key={i}>
          <rect x={cx - 2} y={cy - 4} width={4} height={8} rx={1.5} fill={TEAL} />
          <rect x={cx - 2} y={cy - 0.5} width={4} height={1} fill={GROUND} />
        </g>
      ))}
    </>
  )
}

// Numerals (the 3-of-a-kind suit: One/Two/Three) — a mauve underline
// grounds the glyph so it doesn't float alone in the tile.
function Numeral({ n }: { n: number }) {
  return (
    <>
      <text
        x={20}
        y={26}
        textAnchor="middle"
        fontSize={22}
        fill={INK}
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {n}
      </text>
      <rect x={12} y={31} width={16} height={2} rx={1} fill={MAUVE} />
    </>
  )
}

// Winds — the same glyph treatment in lavender, plus a small diamond
// "compass tick" above the letter.
function Wind({ letter }: { letter: string }) {
  return (
    <>
      <text
        x={20}
        y={26}
        textAnchor="middle"
        fontSize={22}
        fill={LAVENDER}
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {letter}
      </text>
      <rect x={18} y={4} width={4} height={4} fill={LAVENDER} transform="rotate(45 20 6)" />
    </>
  )
}

// Red dragon — an outlined rounded square (a chop/seal) with a filled
// center diamond.
function DragonRed() {
  return (
    <>
      <rect x={10} y={10} width={20} height={20} rx={4} fill="none" stroke={RED} strokeWidth={3} />
      <rect x={16} y={16} width={8} height={8} fill={RED} transform="rotate(45 20 20)" />
    </>
  )
}

// Green dragon — a filled circle inside a ring, teal (the suit color it
// echoes, per the brief).
function DragonGreen() {
  return (
    <>
      <circle cx={20} cy={20} r={12} fill="none" stroke={TEAL} strokeWidth={2.5} />
      <circle cx={20} cy={20} r={8} fill={TEAL} />
    </>
  )
}

// White dragon — the traditional "blank" tile: an empty nested frame,
// ink-subtle so it reads as deliberately unmarked rather than unfinished.
function DragonWhite() {
  return (
    <>
      <rect x={9} y={9} width={22} height={22} rx={3} fill="none" stroke={INK_SUBTLE} strokeWidth={2.5} />
      <rect x={14} y={14} width={12} height={12} rx={2} fill="none" stroke={INK_SUBTLE} strokeWidth={1.5} />
    </>
  )
}

export const FACE_REGISTRY: Record<Kind, () => React.JSX.Element> = {
  'dot-1': () => <Dots n={1} />,
  'dot-2': () => <Dots n={2} />,
  'dot-3': () => <Dots n={3} />,
  'dot-4': () => <Dots n={4} />,
  'dot-5': () => <Dots n={5} />,
  'dot-6': () => <Dots n={6} />,
  'dot-7': () => <Dots n={7} />,
  'dot-8': () => <Dots n={8} />,
  'bam-1': () => <Bamboo n={1} />,
  'bam-2': () => <Bamboo n={2} />,
  'bam-3': () => <Bamboo n={3} />,
  'bam-4': () => <Bamboo n={4} />,
  'bam-5': () => <Bamboo n={5} />,
  'bam-6': () => <Bamboo n={6} />,
  'bam-7': () => <Bamboo n={7} />,
  'bam-8': () => <Bamboo n={8} />,
  'num-1': () => <Numeral n={1} />,
  'num-2': () => <Numeral n={2} />,
  'num-3': () => <Numeral n={3} />,
  'wind-e': () => <Wind letter="E" />,
  'wind-s': () => <Wind letter="S" />,
  'wind-w': () => <Wind letter="W" />,
  'wind-n': () => <Wind letter="N" />,
  'dragon-r': () => <DragonRed />,
  'dragon-g': () => <DragonGreen />,
  'dragon-w': () => <DragonWhite />,
}

export const FACE_NAMES: Record<Kind, string> = {
  'dot-1': 'One of dots',
  'dot-2': 'Two of dots',
  'dot-3': 'Three of dots',
  'dot-4': 'Four of dots',
  'dot-5': 'Five of dots',
  'dot-6': 'Six of dots',
  'dot-7': 'Seven of dots',
  'dot-8': 'Eight of dots',
  'bam-1': 'One of bamboo',
  'bam-2': 'Two of bamboo',
  'bam-3': 'Three of bamboo',
  'bam-4': 'Four of bamboo',
  'bam-5': 'Five of bamboo',
  'bam-6': 'Six of bamboo',
  'bam-7': 'Seven of bamboo',
  'bam-8': 'Eight of bamboo',
  'num-1': 'One',
  'num-2': 'Two',
  'num-3': 'Three',
  'wind-e': 'East wind',
  'wind-s': 'South wind',
  'wind-w': 'West wind',
  'wind-n': 'North wind',
  'dragon-r': 'Red dragon',
  'dragon-g': 'Green dragon',
  'dragon-w': 'White dragon',
}

export function TileFace({ kind }: { kind: Kind }): React.JSX.Element {
  const Face = FACE_REGISTRY[kind]
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true">
      <Face />
    </svg>
  )
}
