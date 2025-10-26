import { NextRequest } from 'next/server';
import { logger } from '../../../../src/lib/logger';
import { prisma, safeTransaction } from '../../../../src/lib/prisma';
import { withAuth, withErrorHandling, successResponse, errorResponse, validateActiveRecord } from '../../../../src/lib/api-utils';
import { Session } from 'next-auth';
import { z } from 'zod';

const categoriaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  descripcion: z.string().optional(),
});

// GET /api/categorias/[id] - Obtener categoría por ID
export const GET = withErrorHandling(withAuth(async (
  request: NextRequest,
  session: Session,
  context: { params: Promise<{ id: string }> }
) => {
  const { id } = await context.params;
  const categoria = await prisma.categoria.findUnique({
    where: { id },
    include: {
      productos: {
        where: { activo: true },
        select: {
          id: true,
          nombre: true,
          sku: true,
          stock: true
        }
      }
    }
  });

  if (!categoria) {
    return errorResponse('Categoría no encontrada', 404);
  }

  const response = successResponse(categoria);
  response.headers.set('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
  return response;
}));

// PUT /api/categorias/[id] - Actualizar categoría
export const PUT = withErrorHandling(withAuth(async (
  request: NextRequest,
  session: Session,
  context: { params: Promise<{ id: string }> }
) => {
  const { id } = await context.params;
  const body = await request.json();
  const validatedData = categoriaSchema.parse(body);

  // Verificar que la categoría existe
  const existingCategoria = await prisma.categoria.findUnique({
    where: { id }
  });

  if (!existingCategoria) {
    return errorResponse('Categoría no encontrada', 404);
  }

  // Verificar que no exista otra categoría con el mismo nombre
  const duplicateCategoria = await prisma.categoria.findFirst({
    where: { 
      nombre: validatedData.nombre,
      activo: true,
      id: { not: id }
    }
  });

  if (duplicateCategoria) {
    return errorResponse('Ya existe una categoría con ese nombre', 400);
  }

  const categoria = await prisma.categoria.update({
    where: { id },
    data: validatedData
  });

  logger.info('Categoría actualizada', { 
    id: categoria.id, 
    nombre: categoria.nombre 
  });

  return successResponse(
    categoria,
    'Categoría actualizada exitosamente'
  );
}));

// DELETE /api/categorias/[id] - Eliminar categoría (soft delete)
export const DELETE = withErrorHandling(withAuth(async (
  request: NextRequest,
  session: Session,
  context: { params: Promise<{ id: string }> }
) => {
  const { id } = await context.params;

  // Verificar que la categoría existe
  const existingCategoria = await prisma.categoria.findUnique({
    where: { id },
    include: {
      _count: {
        select: { productos: { where: { activo: true } } }
      }
    }
  });

  if (!existingCategoria) {
    return errorResponse('Categoría no encontrada', 404);
  }

  // No permitir eliminar si tiene productos activos
  if (existingCategoria._count.productos > 0) {
    return errorResponse('No se puede eliminar una categoría que tiene productos asociados', 400);
  }

  await prisma.categoria.update({
    where: { id },
    data: { activo: false }
  });

  logger.info('Categoría eliminada', { 
    id: existingCategoria.id, 
    nombre: existingCategoria.nombre 
  });

  return successResponse(
    null,
    'Categoría eliminada exitosamente'
  );
}));

// PATCH /api/categorias/[id] - Actualizar estado activo/inactivo
export const PATCH = withErrorHandling(withAuth(async (
  request: NextRequest,
  session: Session,
  context: { params: Promise<{ id: string }> }
) => {
  const { id } = await context.params;
  const body = await request.json();
  const activo = typeof body?.activo === 'boolean' ? body.activo : null;
  
  if (activo === null) {
    return errorResponse('Parámetro "activo" requerido', 400);
  }

  // Verificar existencia y conteo de productos activos
  const existingCategoria = await prisma.categoria.findUnique({
    where: { id },
    include: {
      _count: { select: { productos: { where: { activo: true } } } }
    }
  });

  if (!existingCategoria) {
    return errorResponse('Categoría no encontrada', 404);
  }

  // Al desactivar, impedir si tiene productos activos
  if (activo === false && existingCategoria._count.productos > 0) {
    return errorResponse('No se puede desactivar una categoría con productos activos', 400);
  }

  const updated = await prisma.categoria.update({
    where: { id },
    data: { activo }
  });

  logger.info('Estado de categoría actualizado', { 
    id: updated.id, 
    nombre: updated.nombre,
    activo: updated.activo 
  });

  return successResponse(
    updated,
    `Categoría ${activo ? 'activada' : 'desactivada'} exitosamente`
  );
}));
