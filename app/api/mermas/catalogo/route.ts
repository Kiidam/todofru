import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const [productos, tipos, causas] = await Promise.all([
    prisma.producto.findMany({ where: { activo: true }, select: { id: true, nombre: true }, orderBy: { nombre: 'asc' } }),
    prisma.tipoMerma.findMany({ where: { activo: true }, select: { id: true, nombre: true }, orderBy: { nombre: 'asc' } }),
    prisma.causaMerma.findMany({ where: { activo: true }, select: { id: true, nombre: true, tipoMermaId: true }, orderBy: { nombre: 'asc' } }),
  ])
  return NextResponse.json({ success: true, data: { productos, tipos, causas } })
}

