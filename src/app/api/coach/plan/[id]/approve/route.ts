import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json() as {
    action: 'approve' | 'request_adjustment'
    comment?: string
  }

  const { action, comment } = body

  if (action === 'approve') {
    return NextResponse.json({ ok: true, status: 'APROBADO', planId: id })
  }

  if (action === 'request_adjustment') {
    return NextResponse.json({
      ok: true,
      status: 'AJUSTE_SOLICITADO',
      planId: id,
      comment: comment ?? '',
    })
  }

  return NextResponse.json({ ok: false, error: 'Acción inválida' }, { status: 400 })
}
