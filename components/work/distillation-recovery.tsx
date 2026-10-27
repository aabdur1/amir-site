'use client'

import { useScrollReveal } from '@/lib/hooks'

// The capstone's headline as a chart: share of full-data macro-F1 recovered
// at 100 images per class on the CarDD held-out test split. Drawn from the
// four reported test numbers only — no dataset or distilled images, by rule.
// Used twice: the homepage featured card and the case study's results figure.
//
// Presented as a mounted print (the Spotify plate / mahjong tile precedent):
// a white panel with Catppuccin Latte marks in both themes. As bar fills,
// Mocha's pastels fail the dataviz lightness and chroma checks; the Latte
// pair passes every check on white, and peach's sub-3:1 contrast is relieved
// by the direct value label on every bar.
//
// Labels are HTML, not SVG <text>, so they stay at the site's 12px floor at
// every width instead of scaling with a viewBox.

const LATTE = {
  panel: '#ffffff',
  border: '#ccd0da', // surface0
  ink: '#4c4f69', // text
  muted: '#5c5f77', // subtext1
  rule: '#8c8fa1', // overlay1
  herding: '#209fb5', // sapphire
  distilled: '#fe640b', // peach
}

const SERIES = [
  { key: 'herding', label: 'Herding picks', color: LATTE.herding },
  { key: 'distilled', label: 'Distilled set', color: LATTE.distilled },
] as const

const GROUPS = [
  { network: 'ConvNet', herding: 78, distilled: 84 },
  { network: 'ResNet-18', herding: 80, distilled: 83 },
] as const

const DESCRIPTION =
  'Bar chart: share of full-data macro-F1 recovered at 100 images per class ' +
  'on the CarDD held-out test split. ConvNet: herding picks 78%, distilled ' +
  'set 84%. ResNet-18: herding picks 80%, distilled set 83%. Training on the ' +
  'full data is 100%.'

const MONO = 'font-[family-name:var(--font-mono)] text-[12px]'

export function DistillationRecovery() {
  const [ref, visible] = useScrollReveal()

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      role="img"
      aria-label={DESCRIPTION}
      className={`mx-auto w-full max-w-md rounded-md border px-4 pt-4 pb-3 ${visible ? 'is-drawn' : ''}`}
      style={{ backgroundColor: LATTE.panel, borderColor: LATTE.border }}
    >
      <div aria-hidden="true">
        {/* Legend — bar order left to right */}
        <div className={`flex flex-wrap gap-x-4 gap-y-1 mb-8 ${MONO}`} style={{ color: LATTE.ink }}>
          {SERIES.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[2px]" style={{ backgroundColor: s.color }} />
              {s.label}
            </span>
          ))}
        </div>

        {/* Plot: 0% baseline at the bottom, full data (100%) at the top */}
        <div className="relative h-44">
          <div
            className="absolute inset-x-0 top-0 border-t border-dashed"
            style={{ borderColor: LATTE.rule }}
          />
          <span className={`absolute right-0 -top-5 ${MONO}`} style={{ color: LATTE.muted }}>
            full data = 100%
          </span>
          <div className="absolute inset-x-0 bottom-0 border-t" style={{ borderColor: LATTE.border }} />

          <div className="absolute inset-0 grid grid-cols-2">
            {GROUPS.map((g, gi) => (
              <div key={g.network} className="flex h-full items-end justify-center gap-[3px]">
                {SERIES.map((s, si) => {
                  const value = g[s.key]
                  return (
                    <div
                      key={s.key}
                      className="relative w-10 sm:w-12"
                      style={{ height: `${value}%` }}
                      title={`${g.network} · ${s.label}: ${value}% of full-data macro-F1`}
                    >
                      <span
                        className={`absolute inset-x-0 -top-5 text-center tabular-nums ${MONO}`}
                        style={{ color: LATTE.ink }}
                      >
                        {value}%
                      </span>
                      <div
                        className="spark-bar h-full w-full rounded-t-[4px]"
                        style={{ backgroundColor: s.color, animationDelay: `${(gi * 2 + si) * 90}ms` }}
                      />
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Group labels share the plot's two equal columns, so they center under their bars */}
        <div className={`grid grid-cols-2 mt-2 text-center ${MONO}`} style={{ color: LATTE.ink }}>
          {GROUPS.map((g) => (
            <span key={g.network}>{g.network}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
