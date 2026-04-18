// Este endpoint fue reemplazado por /api/onboarding/generate
// Se mantiene para no romper referencias existentes durante la migración.
import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    { error: 'Este endpoint fue reemplazado. Usa /api/onboarding/generate' },
    { status: 410 }
  )
}
