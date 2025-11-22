import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, withErrorHandling, successResponse, errorResponse } from '@/lib/api-utils'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'

const updateSchema = z.object({
  nombre: z.string().min(1).optional(),
  sku: z.string().optional().nullable(),
  descripcion: z.string().optional().nullable(),
  categoriaId: z.string().min(1).optional(),
  unidadMedidaId: z.string().min(1).optional(),
  precio: z.number().min(0).optional(),
  stockMinimo: z.number().min(0).optional(),
  activo: z.boolean().optional()
})

export const GET = withErrorHandling(withAuth(async (req: NextRequest, _ctx) => {
  const { pathname } = new URL(req.url)
  const id = pathname.split('/').slice(-1)[0]
  const prod = await prisma.producto.findUnique({
    where: { id },
    include: { categoria: { select: { id: true, nombre: true } }, unidadMedida: { select: { id: true, nombre: true, simbolo: true } } }
  })
  if (!prod) return NextResponse.json({ success: false, error: 'Producto no encontrado' }, { status: 404 })
  return successResponse(prod)
}))

export const PATCH = withErrorHandling(withAuth(async (req: NextRequest, ctx) => {
  const { pathname } = new URL(req.url)
  const id = pathname.split('/').slice(-1)[0]
  const body = await req.json().catch(() => null)
  if (!body) return errorResponse('Body inválido', 400)
  const data = updateSchema.parse(body)

  const existing = await prisma.producto.findUnique({ where: { id } })
  if (!existing) return errorResponse('Producto no encontrado', 404)

  // Uniqueness: SKU si cambia
  if (data.sku !== undefined && data.sku !== null && data.sku !== existing.sku) {
    const dup = await prisma.producto.findFirst({ where: { sku: data.sku } })
    if (dup) return errorResponse('SKU ya está en uso por otro producto', 409)
  }

  // FK checks si cambian
  if (data.categoriaId) {
    const cat = await prisma.categoria.findUnique({ where: { id: data.categoriaId } })
    if (!cat || cat.activo === false) return errorResponse('Categoría inválida', 400)
  }
  if (data.unidadMedidaId) {
    const um = await prisma.unidadMedida.findUnique({ where: { id: data.unidadMedidaId } })
    if (!um || um.activo === false) return errorResponse('Unidad de medida inválida', 400)
  }

  const updated = await prisma.producto.update({
    where: { id },
    data: {
      ...data,
      updatedAt: new Date()
    }
  })

  try { revalidatePath('/dashboard/productos') } catch {}
  return successResponse(updated, 'Producto actualizado')
}))

export const PUT = PATCH

export const DELETE = withErrorHandling(withAuth(async (req: NextRequest) => {
  const { pathname } = new URL(req.url)
  const id = pathname.split('/').slice(-1)[0]
  await prisma.producto.update({ where: { id }, data: { activo: false, updatedAt: new Date() } })
  try { revalidatePath('/dashboard/productos') } catch {}
  return successResponse({ id }, 'Producto desactivado')
}))

