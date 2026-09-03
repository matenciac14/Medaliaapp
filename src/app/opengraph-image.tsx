import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Medaliq — Coaching y tracking deportivo'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#1e3a5f',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
          fontFamily: 'sans-serif',
          padding: '60px 80px',
        }}
      >
        {/* Logo text */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
          <div
            style={{
              width: 64,
              height: 64,
              background: 'linear-gradient(135deg, #ea580c, #ea580c)',
              borderRadius: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
              fontWeight: 800,
              color: 'white',
            }}
          >
            M
          </div>
          <span style={{ fontSize: 56, fontWeight: 800, color: 'white', letterSpacing: '-1px' }}>
            Medaliq
          </span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            color: '#93c5fd',
            textAlign: 'center',
            maxWidth: 700,
            lineHeight: 1.4,
          }}
        >
          Coaching y tracking deportivo para LatAm
        </div>

        {/* Pills */}
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          {['Running', 'Fuerza', 'Nutrición'].map((label) => (
            <div
              key={label}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 9999,
                padding: '8px 20px',
                fontSize: 18,
                color: 'rgba(255,255,255,0.85)',
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* URL */}
        <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.4)', marginTop: 12 }}>
          medaliq.com
        </div>
      </div>
    ),
    { ...size }
  )
}
