import { NextRequest, NextResponse } from 'next/server';
import { logger } from '../../../../src/lib/logger';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { prisma } from '../../../../src/lib/prisma';
import { z } from 'zod';

const unidadSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  simbolo: z.string().min(1, 'El símbolo es requerido'),
});

// GET /api/unidades-medida/[id]
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { id } = await context.params;
    const unidad = await prisma.unidadMedida.findUnique({
      where: { id },
      include: {
        _count: { select: { productos: true } }
      }
    });
    if (!unidad) return NextResponse.json({ success: false, error: 'Unidad no encontrada' }, { status: 404 });
    return NextResponse.json({ success: true, data: unidad });
  } catch (error) {
    logger.error('Error al obtener unidad de medida:', { error });
    return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}

// PUT /api/unidades-medida/[id] - actualizar nombre/símbolo
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { id } = await context.params;
    const body = await request.json();
    const validated = unidadSchema.parse(body);

    const exists = await prisma.unidadMedida.findUnique({ where: { id } });
    if (!exists) return NextResponse.json({ success: false, error: 'Unidad no encontrada' }, { status: 404 });

    // Evitar duplicados en nombre/símbolo
    const dup = await prisma.unidadMedida.findFirst({
      where: {
        OR: [{ nombre: validated.nombre }, { simbolo: validated.simbolo }],
        id: { not: id },
        activo: true,
      },
    });
    if (dup) return NextResponse.json({ success: false, error: 'Ya existe una unidad con ese nombre o símbolo' }, { status: 400 });

    const updated = await prisma.unidadMedida.update({ where: { id }, data: validated });
    return NextResponse.json({ success: true, data: updated, message: 'Unidad actualizada exitosamente' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Datos inválidos', details: error.issues }, { status: 400 });
    }
    logger.error('Error al actualizar unidad de medida:', { error });
    return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}

// PATCH /api/unidades-medida/[id] - cambiar activo
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { id } = await context.params;
    const body = await request.json();
    const activo = typeof body?.activo === 'boolean' ? body.activo : null;
    if (activo === null) return NextResponse.json({ success: false, error: 'Parámetro "activo" requerido' }, { status: 400 });

    const unidad = await prisma.unidadMedida.findUnique({
      where: { id },
      include: { _count: { select: { productos: true } } }
    });
    if (!unidad) return NextResponse.json({ success: false, error: 'Unidad no encontrada' }, { status: 404 });

    // Al desactivar, impedir si está usada por productos
    if (activo === false && unidad._count.productos > 0) {
      return NextResponse.json({ success: false, error: 'No se puede desactivar una unidad usada por productos' }, { status: 400 });
    }

    const updated = await prisma.unidadMedida.update({ where: { id }, data: { activo } });
    return NextResponse.json({ success: true, data: updated, message: `Unidad ${activo ? 'activada' : 'desactivada'} exitosamente` });
  } catch (error) {
    logger.error('Error al cambiar estado de unidad de medida:', { error });
    return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}

// DELETE /api/unidades-medida/[id] - soft delete (activo=false)
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { id } = await context.params;

    const unidad = await prisma.unidadMedida.findUnique({
      where: { id },
      include: { _count: { select: { productos: true } } }
    });
    if (!unidad) return NextResponse.json({ success: false, error: 'Unidad no encontrada' }, { status: 404 });
    if (unidad._count.productos > 0) {
      return NextResponse.json({ success: false, error: 'No se puede eliminar una unidad usada por productos' }, { status: 400 });
    }

    await prisma.unidadMedida.update({ where: { id }, data: { activo: false } });
    return NextResponse.json({ success: true, message: 'Unidad eliminada exitosamente' });
  } catch (error) {
    logger.error('Error al eliminar unidad de medida:', { error });
    return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}