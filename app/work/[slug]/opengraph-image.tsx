// app/work/[slug]/opengraph-image.tsx
// Per-case-study OG card: number + title + tech on the left, a chart-motif
// illustration plate (Mocha hardcoded) on the right — the learn per-slug
// OG pattern applied to /work.
import { ImageResponse } from 'next/og'
import { getCaseStudy } from '@/lib/work/case-studies'

export const alt = 'Case study — Amir Abdur-Rahim'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Catppuccin Mocha, matching the site's dark palette (OG images are always dark)
const C = {
  base: '#1e1e2e',
  mantle: '#181825',
  border: '#313244',
  line: '#45475a',
  text: '#cdd6f4',
  subtext: '#a6adc8',
  mauve: '#cba6f7',
  peach: '#fab387',
  sapphire: '#74c7ec',
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

// Story-points motif shared with the embed placeholder: line chart,
// highlight table, scatter with trend.
function Illustration() {
  return (
    <svg width={264} height={176} viewBox="0 0 120 80">
      <path d="M8 34 L20 26 L32 30 L44 22" fill="none" stroke={C.peach} strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="40" x2="44" y2="40" stroke={C.line} strokeWidth="1" />
      <rect x="56" y="18" width="10" height="6" rx="1" fill={C.sapphire} opacity="0.9" />
      <rect x="68" y="18" width="10" height="6" rx="1" fill={C.sapphire} opacity="0.55" />
      <rect x="56" y="27" width="10" height="6" rx="1" fill={C.sapphire} opacity="0.4" />
      <rect x="68" y="27" width="10" height="6" rx="1" fill={C.sapphire} opacity="0.7" />
      <rect x="56" y="36" width="10" height="6" rx="1" fill={C.sapphire} opacity="0.25" />
      <rect x="68" y="36" width="10" height="6" rx="1" fill={C.sapphire} opacity="0.45" />
      <line x1="88" y1="40" x2="112" y2="18" stroke={C.line} strokeWidth="1" strokeDasharray="3" />
      <circle cx="92" cy="36" r="2.2" fill={C.mauve} />
      <circle cx="98" cy="31" r="2.2" fill={C.mauve} />
      <circle cx="103" cy="27" r="2.2" fill={C.mauve} />
      <circle cx="108" cy="24" r="2.2" fill={C.mauve} />
      <circle cx="97" cy="20" r="2.6" fill={C.peach} />
      <line x1="8" y1="64" x2="112" y2="64" stroke={C.line} strokeWidth="1" />
      <circle cx="60" cy="64" r="2" fill={C.peach} />
    </svg>
  )
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const study = getCaseStudy(slug)
  const fontData = await loadFont()

  const number = study?.number ?? '00'
  const title = study?.title ?? 'Case Study'
  const tech = study?.tech.join(' · ') ?? 'Case study'

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
            Case Study
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
              {`${number}/`}
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
              {tech}
            </div>
          </div>

          {/* Illustration plate */}
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
            <Illustration />
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
            {`amirabdurrahim.com/work/${slug}`}
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
