import { NextRequest, NextResponse } from 'next/server';
import { logger } from '../../../src/lib/logger';
import { getServerSession } from 'next-auth/next';
import authOptions from '../../../src/lib/nextauth';
import { prisma } from '../../../src/lib/prisma';
import { z } from 'zod';
import { randomUUID } from 'crypto';

// Esquema de validación para unidades de medida
const unidadMedidaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  simbolo: z.string().min(1, 'El símbolo es requerido'),
});

// GET /api/unidades-medida - Listar todas las unidades de medida
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const unidades = await prisma.unidadMedida.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' },
      include: {
        _count: {
          select: { productos: true }
        }
      }
    });

    return NextResponse.json({ 
      success: true, 
      data: unidades 
    });
  } catch (error) {
    logger.error('Error al obtener unidades de medida:', { error });
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST /api/unidades-medida - Crear nueva unidad de medida
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

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
      return NextResponse.json(
        { success: false, error: 'Ya existe una unidad de medida con ese nombre o símbolo' },
        { status: 400 }
      );
    }

    const unidad = await prisma.unidadMedida.create({
      data: {
        id: randomUUID(),
        ...validatedData
      }
    });

    return NextResponse.json({ 
      success: true, 
      data: unidad,
      message: 'Unidad de medida creada exitosamente'
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }

    logger.error('Error al crear unidad de medida:', { error });
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
