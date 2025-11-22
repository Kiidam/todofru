import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withErrorHandling, errorResponse, successResponse } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

export const GET = withErrorHandling(withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const productoId = searchParams.get('productoId') || undefined
  const tipoMermaId = searchParams.get('tipoMermaId') || undefined
  const clasRaw = searchParams.get('clasificacion') || undefined
  const clas = clasRaw ? z.enum(['NORMAL','EXTRAORDINARIA']).parse(clasRaw) : undefined

  const where: any = {
    ...(from && { fecha: { gte: new Date(from) } }),
    ...(to && { fecha: { lte: new Date(to) } }),
    ...(productoId && { productoId }),
    ...(tipoMermaId && { tipoMermaId }),
    ...(clas && { clasificacion: clas })
  }

  const list = await prisma.merma.findMany({
    where,
    include: {
      producto: { select: { id: true, nombre: true, unidadMedidaId: true } },
      tipo: { select: { id: true, nombre: true } },
      causa: { select: { id: true, nombre: true } },
      usuario: { select: { id: true, name: true } }
    },
    orderBy: { fecha: 'desc' }
  })

  const rows = list.map(m => ({
    id: m.id,
    fecha: m.fecha.toISOString().slice(0,10),
    productoId: m.productoId,
    producto: m.producto?.nombre || '',
    tipo: m.tipo?.nombre || '',
    causa: m.causa?.nombre || '',
    cantidad: m.cantidad,
    clasificacion: m.clasificacion,
    usuario: m.usuario?.name || '',
    observaciones: m.observaciones || ''
  }))
  return successResponse(rows)
}))

export const POST = withErrorHandling(withAuth(async (req: NextRequest, ctx) => {
  const schema = z.object({
    productoId: z.string().min(1),
    cantidad: z.number().positive(),
    tipoMermaId: z.string().min(1),
    causaMermaId: z.string().optional(),
    clasificacion: z.enum(['NORMAL','EXTRAORDINARIA']).optional(),
    observaciones: z.string().optional(),
  })

  const parsed = schema.safeParse(await req.json().catch(()=>({})))
  if (!parsed.success) return errorResponse('Datos inválidos', 400, parsed.error.flatten())
  const { productoId, cantidad: cantidadRaw, tipoMermaId, causaMermaId, clasificacion, observaciones } = parsed.data
  const cantidad = Math.round(cantidadRaw * 100) / 100
  const userId = ctx.user?.id
  if (!userId) return errorResponse('Usuario no encontrado', 404)

  const now = new Date()
  const result = await prisma.$transaction(async (tx) => {
    const prod = await tx.producto.findUnique({ where: { id: productoId }, select: { id: true, stock: true, stockMinimo: true } })
    if (!prod) throw new Error('Producto no encontrado')
    if ((prod.stock || 0) < cantidad) return { error: 'Stock insuficiente' }

    const nuevoStockRaw = (prod.stock || 0) - cantidad
    const nuevoStock = Math.max(0, Math.round(nuevoStockRaw * 100) / 100)

    const mov = await tx.movimientoInventario.create({
      data: {
        productoId,
        tipo: 'SALIDA',
        cantidad,
        cantidadAnterior: prod.stock || 0,
        cantidadNueva: nuevoStock,
        motivo: 'Merma',
        usuarioId: userId,
        createdAt: now
      }
    })
    await tx.producto.update({ where: { id: productoId }, data: { stock: nuevoStock, updatedAt: now } })
    const merma = await tx.merma.create({
      data: {
        id: randomUUID(),
        fecha: now,
        productoId,
        usuarioId: userId,
        tipoMermaId,
        causaMermaId: causaMermaId || null,
        cantidad,
        clasificacion: (clasificacion || 'NORMAL'),
        observaciones: observaciones || null,
        movimientoId: mov.id,
        createdAt: now,
        updatedAt: now
      }
    })
    const warning = prod.stockMinimo !== undefined && nuevoStock < (prod.stockMinimo || 0) ? 'El nuevo stock queda por debajo del mínimo' : undefined
    return { merma, mov, warning }
  })

  if ((result as any)?.error) return errorResponse((result as any).error, 400)
  logger.info('Merma registrada', { mermaId: result.merma.id, productoId, cantidad })
  return successResponse({ id: result.merma.id, warning: result.warning })
}))
