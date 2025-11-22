import { NextRequest, NextResponse } from 'next/server';
import { DecolectaError, fetchSunatByRuc } from '@/lib/decolecta';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ruc = (searchParams.get('ruc') || '').trim();

  if (!ruc) {
    return NextResponse.json({ error: 'Parámetro ruc es obligatorio' }, { status: 400 });
  }

  const endpoint = process.env.DECOLECTA_SUNAT_URL || '/sunat/ruc';
  if (!process.env.DECOLECTA_API_TOKEN) {
    return NextResponse.json({ error: 'Configura DECOLECTA_API_TOKEN en .env.local' }, { status: 500 });
  }

  try {
    const data = await fetchSunatByRuc(ruc);
    return NextResponse.json({ ok: true, data, source: endpoint });
  } catch (err: unknown) {
    if (err instanceof DecolectaError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: err.status || 502 });
    }
    return NextResponse.json({ ok: false, error: 'Error al consultar SUNAT' }, { status: 502 });
  }
}
