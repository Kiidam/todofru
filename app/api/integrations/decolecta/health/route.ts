import { NextResponse } from 'next/server'
import { decolectaFetch } from '@/lib/decolecta'

export async function GET() {
  const hasToken = !!process.env.DECOLECTA_API_TOKEN
  const baseUrl = process.env.DECOLECTA_BASE_URL || 'https://api.decolecta.pe/v1'
  try {
    // Intento de conectividad: hacer una llamada con número inválido y considerar conectividad si responde
    await decolectaFetch('/reniec/dni', { numero: '00000000' })
    // Si retornara 200 (poco probable), igual es conectividad
    return NextResponse.json({ success: true, reachable: true, hasToken, baseUrl })
  } catch (err: any) {
    const status = Number(err?.status || 0)
    const msg = String(err?.message || 'Unknown error')
    const networkIssue = /conexin|No se pudo establecer conexin|fetch failed|ENOTFOUND|ETIMEDOUT|abort/i.test(msg)
    if (status >= 400 && status < 500 && !networkIssue) {
      // Respuesta del servicio con error de negocio: conectividad OK
      return NextResponse.json({ success: true, reachable: true, hasToken, baseUrl, note: msg })
    }
    return NextResponse.json({ success: false, reachable: false, hasToken, baseUrl, error: msg, status })
  }
}
