import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withErrorHandling, successResponse, errorResponse } from '../../../src/lib/api-utils';
import { prisma } from '../../../src/lib/prisma';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { Session } from 'next-auth';

// Esquema de validación para unidades de medida
const unidadMedidaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  simbolo: z.string().min(1, 'El símbolo es requerido'),
});

// GET /api/unidades-medida - Listar todas las unidades de medida
export const GET = withErrorHandling(withAuth(async (request: NextRequest, session: Session) => {
  const unidades = await prisma.unidadMedida.findMany({
    where: { activo: true },
    orderBy: { nombre: 'asc' },
    include: {
      _count: {
        select: { productos: true }
      }
    }
  });

  return successResponse(unidades);
}));

// POST /api/unidades-medida - Crear nueva unidad de medida
export const POST = withErrorHandling(withAuth(async (request: NextRequest, session: Session) => {
  const body = await request.json();
  const validatedData = unidadMedidaSchema.parse(body);

  // Verificar que no exista una unidad con el mismo nombre o símbolo
  const existingUnidad = await prisma.unidadMedida.findFirst({
    where: { 
      OR: [
        { nombre: validatedData.nombre },
        { simbolo: validatedData.simbolo }
      ],
      activo: true 
    }
  });

  if (existingUnidad) {
    return errorResponse('Ya existe una unidad de medida con ese nombre o símbolo', 400);
  }

  const unidad = await prisma.unidadMedida.create({
    data: {
      id: randomUUID(),
      ...validatedData
    }
  });

  return successResponse(unidad, 'Unidad de medida creada exitosamente');
}));
