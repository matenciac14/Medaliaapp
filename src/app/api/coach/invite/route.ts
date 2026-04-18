import { NextResponse } from 'next/server'

export async function POST() {
  const suffix = Math.random().toString(36).substr(2, 4).toUpperCase()
  const code = `MEDAL-${suffix}`

  return NextResponse.json({
    code,
    url: `medaliq.com/join/${code}`,
  })
}
