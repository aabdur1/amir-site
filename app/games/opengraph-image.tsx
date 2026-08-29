// app/games/opengraph-image.tsx
import { ImageResponse } from 'next/og'

export const alt = 'Games — Hand-Built & Ad-Free'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

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

export default async function Image() {
  const fontData = await loadFont()

  // 3×3 grid motif — two accent cells, drawn with plain bordered divs
  const cells = Array.from({ length: 9 }, (_, i) => i)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1e1e2e',
          fontFamily: 'DM Serif',
        }}
      >
        <div
          style={{
            fontSize: 16,
            color: '#74c7ec',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            fontFamily: 'monospace',
            marginBottom: 28,
          }}
        >
          0 ads · 0 tracking
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            width: 132,
            height: 132,
            marginBottom: 36,
            border: '3px solid #74c7ec',
            borderRadius: 6,
          }}
        >
          {cells.map((i) => (
            <div
              key={i}
              style={{
                width: 42,
                height: 42,
                border: '1px solid #313244',
                backgroundColor: i === 4 ? '#fab387' : i === 2 ? '#cba6f7' : 'transparent',
              }}
            />
          ))}
        </div>

        <div style={{ fontSize: 72, color: '#cdd6f4', lineHeight: 1.1, textAlign: 'center' }}>
          Games
        </div>

        <div
          style={{
            fontSize: 24,
            color: '#a6adc8',
            marginTop: 20,
            fontFamily: 'sans-serif',
            letterSpacing: '0.02em',
          }}
        >
          Amir Abdur-Rahim
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
