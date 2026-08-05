'use client'

import { useScrollReveal } from '@/lib/hooks'

// The enforcement path for the DocDefend+ agent (/work/docdefend-agent).
//
// The whole visual argument is carried by mark shape: every deterministic
// stage is a hard-edged rectangle, and the model is the single rounded one.
// Strokes self-draw on scroll reveal through the shared .draw-stroke /
// .is-drawn pair, so the sitewide prefers-reduced-motion override in
// globals.css renders them fully drawn without any extra handling here.
//
// The viewBox is 272 wide because the article column is max-w-5xl px-6, so a
// 320px viewport leaves a 272px content box. Rendering 1:1 there keeps the
// 12px labels at exactly 12px — the site's readable floor. A wider viewBox
// would scale them below it.

const GATE_STROKE = 'stroke-sapphire dark:stroke-sapphire-dark draw-stroke'
const MODEL_STROKE = 'stroke-mauve dark:stroke-mauve-dark draw-stroke'
const OVERRIDE_STROKE = 'stroke-peach dark:stroke-peach-dark draw-stroke'
const CONNECTOR = 'stroke-ink-faint dark:stroke-night-border draw-stroke'

const TITLE = 'fill-ink dark:fill-night-text'
const SUBTITLE = 'fill-ink-subtle dark:fill-night-muted'

const BOX_X = 10
const BOX_W = 252
const CENTER = 136

const DESCRIPTION =
  'Pipeline diagram. A note and its claimed codes enter a deterministic PII ' +
  'firewall that masks identifiers before the model. Gemini at temperature ' +
  'zero is the only probabilistic stage. Its tool calls pass a structural ' +
  'gate that allowlists tools and scrubs identifiers a second time, then ' +
  'reach NLM and CMS terminology lookups. Finally reconcile_grounding ' +
  'compares the report against what the tools actually verified and ' +
  'downgrades any unbacked claim to NOT_SUPPORTED.'

/** One stage box: hard-edged for deterministic code, rounded for the model. */
function Stage({
  y,
  height,
  rx,
  stroke,
  title,
  subtitle,
}: {
  y: number
  height: number
  rx: number
  stroke: string
  title: string
  subtitle: string
}) {
  return (
    <g>
      <rect
        x={BOX_X}
        y={y}
        width={BOX_W}
        height={height}
        rx={rx}
        fill="none"
        strokeWidth={1.5}
        className={stroke}
        pathLength={100}
      />
      <text
        x={CENTER}
        y={y + 22}
        textAnchor="middle"
        fontSize={13}
        className={`${TITLE} font-[family-name:var(--font-mono)]`}
      >
        {title}
      </text>
      <text
        x={CENTER}
        y={y + 40}
        textAnchor="middle"
        fontSize={12}
        className={`${SUBTITLE} font-[family-name:var(--font-mono)]`}
      >
        {subtitle}
      </text>
    </g>
  )
}

/** Vertical connector between two stages. */
function Connector({ from, to }: { from: number; to: number }) {
  return (
    <line
      x1={CENTER}
      y1={from}
      x2={CENTER}
      y2={to}
      strokeWidth={1}
      className={CONNECTOR}
      pathLength={100}
    />
  )
}

export function GroundingPipeline() {
  const [ref, visible] = useScrollReveal()

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`mx-auto max-w-md ${visible ? 'is-drawn' : ''}`}
    >
      <svg
        viewBox="0 0 272 430"
        className="w-full h-auto"
        role="img"
        aria-label={`Grounding pipeline. ${DESCRIPTION}`}
      >
        <text
          x={CENTER}
          y={14}
          textAnchor="middle"
          fontSize={12}
          className={`${SUBTITLE} font-[family-name:var(--font-mono)]`}
        >
          note + claimed codes
        </text>

        <Connector from={22} to={40} />

        <Stage
          y={40}
          height={56}
          rx={2}
          stroke={GATE_STROKE}
          title="mask identifiers"
          subtitle="boundary 1 — before the model"
        />

        <Connector from={96} to={114} />

        <Stage
          y={114}
          height={56}
          rx={28}
          stroke={MODEL_STROKE}
          title="Gemini"
          subtitle="temperature 0 — the only guess"
        />

        <Connector from={170} to={188} />

        <Stage
          y={188}
          height={56}
          rx={2}
          stroke={GATE_STROKE}
          title="tool gate + scrub"
          subtitle="boundary 2 — outgoing args"
        />

        <Connector from={244} to={262} />

        <Stage
          y={262}
          height={56}
          rx={2}
          stroke={GATE_STROKE}
          title="NLM / CMS lookup"
          subtitle="real terminology data"
        />

        <Connector from={318} to={336} />

        <Stage
          y={336}
          height={56}
          rx={2}
          stroke={OVERRIDE_STROKE}
          title="reconcile_grounding()"
          subtitle="unbacked → NOT_SUPPORTED"
        />

        <Connector from={392} to={410} />

        <text
          x={CENTER}
          y={424}
          textAnchor="middle"
          fontSize={12}
          className={`${SUBTITLE} font-[family-name:var(--font-mono)]`}
        >
          defensibility report
        </text>
      </svg>
    </div>
  )
}
