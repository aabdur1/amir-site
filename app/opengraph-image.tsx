import { ImageResponse } from 'next/og'

export const alt = 'Amir Abdur-Rahim'
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
        {/* Mauve accent line */}
        <div
          style={{
            width: 80,
            height: 3,
            backgroundColor: '#cba6f7',
            marginBottom: 40,
          }}
        />

        {/* Name */}
        <div
          style={{
            fontSize: 72,
            color: '#cdd6f4',
            lineHeight: 1.1,
            textAlign: 'center',
          }}
        >
          Amir Abdur-Rahim
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            color: '#a6adc8',
            marginTop: 20,
            fontFamily: 'sans-serif',
            letterSpacing: '0.02em',
          }}
        >
          Healthcare meets technology — Chicago.
        </div>

        {/* Diamond ornament */}
        <div
          style={{
            marginTop: 48,
            fontSize: 18,
            color: '#fab387',
          }}
        >
          ◆
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
