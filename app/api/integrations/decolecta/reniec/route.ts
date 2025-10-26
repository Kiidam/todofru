import { NextRequest, NextResponse } from 'next/server';
import { DecolectaError, fetchReniecByDni } from '../../../../../src/lib/decolecta'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const dni = (searchParams.get('dni') || '').trim()

  if (!dni) {
    return NextResponse.json({ error: 'Parámetro dni es obligatorio' }, { status: 400 })
  }
  if (!/^\d{8}$/.test(dni)) {
    return NextResponse.json({ error: 'DNI inválido: debe tener 8 dígitos' }, { status: 400 })
  }

  if (!process.env.DECOLECTA_API_TOKEN) {
    return NextResponse.json({ error: 'Configura DECOLECTA_API_TOKEN en .env.local' }, { status: 500 })
  }

  try {
    const data = await fetchReniecByDni(dni)
    return NextResponse.json({ ok: true, data })
  } catch (err: unknown) {
    if (err instanceof DecolectaError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: err.status || 502 })
    }
    return NextResponse.json({ ok: false, error: 'Error al consultar RENIEC' }, { status: 502 })
  }
}