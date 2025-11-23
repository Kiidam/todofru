import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const GET = withErrorHandling(withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const productoId = searchParams.get('productoId') || undefined
  const tipoMermaId = searchParams.get('tipoMermaId') || undefined
  const clas = searchParams.get('clasificacion') || undefined
  const format = (searchParams.get('format') || 'json').toLowerCase()

  const where: any = {
    ...(from && { fecha: { gte: new Date(from) } }),
    ...(to && { fecha: { lte: new Date(to) } }),
    ...(productoId && { productoId }),
    ...(tipoMermaId && { tipoMermaId }),
    ...(clas && { clasificacion: clas })
  }

  const rows = await prisma.merma.findMany({
    where,
    include: {
      producto: { select: { nombre: true } },
      tipo: { select: { nombre: true } },
      causa: { select: { nombre: true } },
      usuario: { select: { name: true } }
    },
    orderBy: { fecha: 'desc' }
  })

  const data = rows.map(m => ({
    fecha: m.fecha.toISOString().slice(0,10),
    producto: m.producto?.nombre || '',
    tipo: m.tipo?.nombre || '',
    causa: m.causa?.nombre || '',
    cantidad: m.cantidad,
    clasificacion: m.clasificacion,
    usuario: m.usuario?.name || '',
    observaciones: m.observaciones || ''
  }))

  if (format === 'csv') {
    const header = ['Fecha','Producto','Tipo','Causa','Cantidad','Clasificación','Usuario','Observaciones']
    const esc = (s: unknown) => '"' + String(s ?? '').replace(/"/g,'""') + '"'
    const lines = [header.map(esc).join(',')]
    for (const r of data) lines.push([r.fecha,r.producto,r.tipo,r.causa,r.cantidad,r.clasificacion,r.usuario,r.observaciones].map(esc).join(','))
    const csv = lines.join('\n') + '\n'
    return new NextResponse(csv, { status: 200, headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="reporte_mermas.csv"' } })
  }

  return NextResponse.json({ success: true, data })
}))

