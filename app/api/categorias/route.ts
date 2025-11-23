import { NextRequest } from 'next/server';
import { withAuth, withErrorHandling, successResponse, errorResponse } from '../../../src/lib/api-utils';
import { logger as _logger } from '../../../src/lib/logger';
import { prisma } from '../../../src/lib/prisma';
import { z } from 'zod';
import { Session as _Session } from 'next-auth';
import * as crypto from 'crypto';

// Esquema de validación para categorías
const categoriaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  descripcion: z.string().optional(),
  activo: z.boolean().optional().default(true),
});

// GET /api/categorias - Listar categorías (activos por defecto; admite status=all|active|inactive)
export const GET = withErrorHandling(withAuth(async (request: NextRequest, _session: _Session) => {
  const { searchParams } = new URL(request.url);
  const status = (searchParams.get('status') || 'active').toLowerCase();

  const where =
    status === 'inactive' ? { activo: false } :
    status === 'all' ? {} : { activo: true };

  const categorias = await prisma.categoria.findMany({
    where,
    orderBy: { nombre: 'asc' },
    include: {
      _count: {
        select: { productos: true }
      }
    }
  });

  const response = successResponse(categorias);
  response.headers.set('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
  return response;
}));

// POST /api/categorias - Crear nueva categoría
export const POST = withErrorHandling(withAuth(async (request: NextRequest, _session: _Session) => {
  const body = await request.json();
  const validatedData = categoriaSchema.parse(body);

  // Verificar que no exista una categoría con el mismo nombre
  const existingCategoria = await prisma.categoria.findFirst({
    where: { 
      nombre: validatedData.nombre,
      activo: true 
    }
  });

  if (existingCategoria) {
    return errorResponse('Ya existe una categoría con ese nombre', 400);
  }

  const categoria = await prisma.categoria.create({
    data: {
      id: crypto.randomUUID(),
      ...validatedData
    }
  });

  _logger.info('Categoría creada exitosamente', { 
    categoriaId: categoria.id, 
    nombre: validatedData.nombre 
  });

  return successResponse(categoria, 'Categoría creada exitosamente');
}));
