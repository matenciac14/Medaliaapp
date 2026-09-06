import { NextResponse } from 'next/server'
import { auth } from '@/auth'

// Downgrade is a no-op — kept as a stub to avoid 404s from existing links.
export async function POST() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'ATHLETE') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  return NextResponse.json({ ok: true })
}
