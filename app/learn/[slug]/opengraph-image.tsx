// app/learn/[slug]/opengraph-image.tsx
// Per-artifact OG card: number + title + subtopics on the left, the
// artifact's index-card illustration (Mocha-hardcoded) on the right.
import { ImageResponse } from 'next/og'
import { getArtifact } from '@/lib/learn/artifacts'

export const alt = 'Interactive data mining explainer — Amir Abdur-Rahim'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Catppuccin Mocha, matching the site's dark palette (OG images are always dark)
const C = {
  base: '#1e1e2e',
  mantle: '#181825',
  border: '#313244',
  line: '#45475a', // Surface1 — faint strokes need a step up at OG scale
  text: '#cdd6f4',
  subtext: '#a6adc8',
  mauve: '#cba6f7',
  peach: '#fab387',
  sapphire: '#74c7ec',
  lavender: '#b4befe',
  teal: '#94e2d5',
}

async function loadFont(): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(
      'https://fonts.gstatic.com/s/dmserifdisplay/v17/-nFnOHM81r4j6k0gjAW3mujVU2B2K_c.ttf'
    )
    if (!res.ok) return null
    return res.arrayBuffer()
  } catch {
    return null
  }
}

// The learn index-card illustrations (app/learn/page.tsx) scaled up 2.75x
// with the Mocha palette baked in — satori renders inline SVG as-is.
function Illustration({ slug }: { slug: string }) {
  const w = 220
  const h = 176
  const common = { width: w, height: h, viewBox: '0 0 80 64' }

  switch (slug) {
    case 'gradient-descent':
      return (
        <svg {...common}>
          <path d="M8 56 Q20 12 40 30 Q60 48 72 8" stroke={C.mauve} fill="none" strokeWidth="2.5" />
          <circle cx="40" cy="30" r="4" fill={C.peach} />
          <line x1="40" y1="30" x2="40" y2="16" stroke={C.peach} strokeWidth="1.5" strokeDasharray="3" />
        </svg>
      )
    case 'log-loss-cross-entropy':
      return (
        <svg {...common}>
          <path d="M10 8 Q10 56 40 56" stroke={C.sapphire} fill="none" strokeWidth="2.5" />
          <path d="M70 8 Q70 56 40 56" stroke={C.peach} fill="none" strokeWidth="2.5" strokeDasharray="4" />
          <line x1="10" y1="56" x2="70" y2="56" stroke={C.line} strokeWidth="1" />
        </svg>
      )
    case 'pca':
      return (
        <svg {...common}>
          <rect x="10" y="38" width="10" height="18" rx="2" fill={C.sapphire} opacity="0.8" />
          <rect x="24" y="18" width="10" height="38" rx="2" fill={C.mauve} opacity="0.8" />
          <rect x="38" y="28" width="10" height="28" rx="2" fill={C.peach} opacity="0.8" />
          <rect x="52" y="10" width="10" height="46" rx="2" fill={C.lavender} opacity="0.8" />
          <line x1="8" y1="56" x2="68" y2="56" stroke={C.line} strokeWidth="1" />
        </svg>
      )
    case 'regularization':
      return (
        <svg {...common}>
          <rect x="12" y="8" width="6" height="48" rx="3" fill={C.sapphire} opacity="0.25" />
          <rect x="12" y="22" width="6" height="34" rx="3" fill={C.sapphire} />
          <rect x="26" y="8" width="6" height="48" rx="3" fill={C.mauve} opacity="0.25" />
          <rect x="26" y="30" width="6" height="26" rx="3" fill={C.mauve} />
          <rect x="40" y="8" width="6" height="48" rx="3" fill={C.peach} opacity="0.25" />
          <rect x="40" y="42" width="6" height="14" rx="3" fill={C.peach} />
          <rect x="54" y="8" width="6" height="48" rx="3" fill={C.lavender} opacity="0.25" />
          <rect x="54" y="50" width="6" height="6" rx="3" fill={C.lavender} />
        </svg>
      )
    case 'clustering':
      return (
        <svg {...common}>
          <circle cx="22" cy="20" r="8" fill="none" stroke={C.sapphire} strokeWidth="1.5" />
          <circle cx="22" cy="20" r="2.5" fill={C.sapphire} />
          <circle cx="56" cy="38" r="8" fill="none" stroke={C.peach} strokeWidth="1.5" />
          <circle cx="56" cy="38" r="2.5" fill={C.peach} />
          <circle cx="40" cy="50" r="6" fill="none" stroke={C.mauve} strokeWidth="1.5" />
          <circle cx="40" cy="50" r="2" fill={C.mauve} />
        </svg>
      )
    case 'shap':
      return (
        <svg {...common}>
          <rect x="12" y="12" width="22" height="8" rx="1" fill={C.sapphire} />
          <rect x="38" y="12" width="14" height="8" rx="1" fill={C.peach} opacity="0.7" />
          <rect x="12" y="26" width="30" height="8" rx="1" fill={C.sapphire} opacity="0.6" />
          <rect x="12" y="40" width="18" height="8" rx="1" fill={C.peach} />
          <rect x="12" y="54" width="40" height="4" rx="1" fill={C.mauve} />
        </svg>
      )
    case 'neural-networks':
      return (
        <svg {...common}>
          <g stroke={C.line} strokeWidth="1.2">
            <line x1="16" y1="14" x2="40" y2="22" />
            <line x1="16" y1="32" x2="40" y2="22" />
            <line x1="16" y1="50" x2="40" y2="22" />
            <line x1="16" y1="14" x2="40" y2="44" />
            <line x1="16" y1="32" x2="40" y2="44" />
            <line x1="16" y1="50" x2="40" y2="44" />
            <line x1="40" y1="22" x2="64" y2="32" />
            <line x1="40" y1="44" x2="64" y2="32" />
          </g>
          <circle cx="16" cy="14" r="4" fill={C.sapphire} opacity="0.85" />
          <circle cx="16" cy="32" r="4" fill={C.sapphire} opacity="0.85" />
          <circle cx="16" cy="50" r="4" fill={C.sapphire} opacity="0.85" />
          <circle cx="40" cy="22" r="4.5" fill={C.teal} />
          <circle cx="40" cy="44" r="4.5" fill={C.teal} />
          <circle cx="64" cy="32" r="4.5" fill={C.peach} />
        </svg>
      )
    default:
      return (
        <svg {...common}>
          <path d="M8 52 L24 36 L40 44 L56 20 L72 28" stroke={C.mauve} fill="none" strokeWidth="2.5" />
          <line x1="8" y1="56" x2="72" y2="56" stroke={C.line} strokeWidth="1" />
        </svg>
      )
  }
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const artifact = getArtifact(slug)
  const fontData = await loadFont()

  const number = artifact?.number ?? '00'
  const title = artifact?.title ?? 'Data Mining Concepts'
  const subtopics = artifact?.subtopics.join(' · ') ?? 'Interactive explainers'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: C.base,
          padding: 64,
          fontFamily: 'DM Serif',
        }}
      >
        {/* Top label row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              fontSize: 17,
              color: C.mauve,
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              fontFamily: 'monospace',
            }}
          >
            Interactive Explainer
          </div>
          {/* Diamond ornament drawn as a rotated square — the ◆ glyph would
              need a runtime font fallback fetch that can fail in production */}
          <div
            style={{
              width: 13,
              height: 13,
              backgroundColor: C.peach,
              transform: 'rotate(45deg)',
            }}
          />
        </div>

        {/* Middle: title block + illustration card */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 48,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 700 }}>
            <div
              style={{
                fontSize: 26,
                color: C.peach,
                fontFamily: 'monospace',
                marginBottom: 12,
              }}
            >
              {number}/
            </div>
            <div
              style={{
                fontSize: 60,
                color: C.text,
                lineHeight: 1.12,
              }}
            >
              {title}
            </div>
            <div
              style={{
                width: 80,
                height: 3,
                backgroundColor: C.mauve,
                marginTop: 26,
                marginBottom: 22,
              }}
            />
            <div
              style={{
                fontSize: 22,
                color: C.subtext,
                fontFamily: 'sans-serif',
                lineHeight: 1.45,
              }}
            >
              {subtopics}
            </div>
          </div>

          {/* Index-card illustration plate */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 310,
              height: 264,
              backgroundColor: C.mantle,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              flexShrink: 0,
            }}
          >
            <Illustration slug={slug} />
          </div>
        </div>

        {/* Bottom byline */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: 22, color: C.subtext, fontFamily: 'sans-serif' }}>
            Amir Abdur-Rahim
          </div>
          <div
            style={{
              fontSize: 17,
              color: C.subtext,
              fontFamily: 'monospace',
              letterSpacing: '0.08em',
            }}
          >
            amirabdurrahim.com/learn/{slug}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fontData
        ? [{ name: 'DM Serif', data: fontData, style: 'normal' as const, weight: 400 as const }]
        : [],
    }
  )
}
