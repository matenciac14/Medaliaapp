import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size: sizeParam } = await params
  const size = parseInt(sizeParam) || 192
  const radius = Math.round(size * 0.2)
  const innerSize = Math.round(size * 0.6)
  const innerRadius = Math.round(innerSize * 0.2)
  const fontSize = Math.round(size * 0.36)

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          background: '#1e3a5f',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: innerSize,
            height: innerSize,
            borderRadius: innerRadius,
            background: '#ea580c',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize,
            fontWeight: 900,
            fontFamily: 'sans-serif',
            lineHeight: 1,
          }}
        >
          M
        </div>
      </div>
    ),
    { width: size, height: size }
  )
}
