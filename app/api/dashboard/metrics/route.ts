import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function fmt(n: number) {
  return Number.isFinite(n) ? Number(n.toFixed(2)) : 0
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const toParam = searchParams.get('to')
  const fromParam = searchParams.get('from')
  const now = toParam ? new Date(toParam) : new Date()
  const from30 = fromParam ? new Date(fromParam) : new Date(now)
  if (!fromParam) from30.setDate(from30.getDate() - 30)

  const [
    ventas, compras, clientesCount, proveedoresCount, lowStock, topProductos, ultimasVentas
  ] = await Promise.all([
    prisma.pedidoVenta.findMany({
      where: { fecha: { gte: from30, lte: now } },
      select: { id: true, total: true }
    }),
    prisma.pedidoCompra.findMany({
      where: { fecha: { gte: from30, lte: now } },
      select: { id: true, total: true }
    }),
    prisma.cliente.count(),
    prisma.proveedor.count(),
    prisma.producto.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, stock: true, stockMinimo: true },
      orderBy: { stock: 'asc' },
      take: 5
    }),
    prisma.pedidoVentaItem.groupBy({
      by: ['productoId'],
      _sum: { cantidad: true, subtotal: true },
      where: { pedido: { fecha: { gte: from30, lte: now } } },
    }),
    prisma.pedidoVenta.findMany({
      where: { fecha: { gte: from30, lte: now } },
      select: { numero: true, fecha: true, total: true, cliente: { select: { nombre: true } } },
      orderBy: { fecha: 'desc' },
      take: 10
    })
  ])

  const totalVentasSoles = fmt(ventas.reduce((a, v) => a + (v.total || 0), 0))
  const totalComprasSoles = fmt(compras.reduce((a, c) => a + (c.total || 0), 0))

  // Map top productos to include nombres
  const productoIds = topProductos.map(t => t.productoId)
  const productos = await prisma.producto.findMany({
    where: { id: { in: productoIds } },
    select: { id: true, nombre: true }
  })
  const nombreMap = new Map(productos.map(p => [p.id, p.nombre]))
  const top = topProductos
    .map(t => ({
      productoId: t.productoId,
      producto: nombreMap.get(t.productoId) || t.productoId,
      cantidad: t._sum.cantidad || 0,
      ventas: fmt((t._sum.subtotal || 0))
    }))
    .sort((a,b) => (b.cantidad - a.cantidad))
    .slice(0, 5)

  const low = lowStock
    .filter(p => (p.stock ?? 0) < (p.stockMinimo ?? 0))
    .map(p => ({ id: p.id, nombre: p.nombre, stock: p.stock ?? 0, minimo: p.stockMinimo ?? 0 }))

  // Tendencia mensual (últimos 6 meses, incluyendo periodo actual)
  const months: Array<{ key: string, label: string }> = []
  const base = new Date(now)
  for (let i = 5; i >= 0; i--) {
    const d = new Date(base)
    d.setMonth(base.getMonth() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    const label = d.toLocaleString('es-PE', { month: 'short' }) + ' ' + String(d.getFullYear())
    months.push({ key, label })
  }
  const ventasMes = await prisma.pedidoVenta.findMany({
    where: { fecha: { lte: now } },
    select: { fecha: true, total: true }
  })
  const comprasMes = await prisma.pedidoCompra.findMany({
    where: { fecha: { lte: now } },
    select: { fecha: true, total: true }
  })
  const sumByMonth = (list: Array<{ fecha: Date, total: number }>) => {
    const m = new Map<string, number>()
    for (const it of list) {
      const key = `${it.fecha.getFullYear()}-${String(it.fecha.getMonth()+1).padStart(2,'0')}`
      m.set(key, (m.get(key) || 0) + (it.total || 0))
    }
    return m
  }
  const vMap = sumByMonth(ventasMes)
  const cMap = sumByMonth(comprasMes)
  const trend = months.map(m => ({
    month: m.label,
    ventas: fmt(vMap.get(m.key) || 0),
    compras: fmt(cMap.get(m.key) || 0)
  }))

  return NextResponse.json({
    success: true,
    data: {
      period: { from: from30.toISOString(), to: now.toISOString() },
      ventas: { totalSoles: totalVentasSoles, ordenes: ventas.length },
      compras: { totalSoles: totalComprasSoles, ordenes: compras.length },
      clientes: { total: clientesCount },
      proveedores: { total: proveedoresCount },
      inventario: { lowStock: low },
      topProductos: top,
      ultimasVentas: ultimasVentas.map(v => ({ numero: v.numero, fecha: v.fecha.toISOString().slice(0,10), cliente: v.cliente?.nombre || '', total: fmt(v.total || 0) })),
      trend
    }
  })
}
