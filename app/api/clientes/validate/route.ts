import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../src/lib/prisma';
import { z } from 'zod';
import { withAuth, withErrorHandling } from '../../../../src/lib/api-utils';

// Schema para validación de entrada
const validateRequestSchema = z.object({
  numeroIdentificacion: z.string().min(1, 'Número de identificación requerido'),
  excludeId: z.string().optional(), // Para excluir un cliente específico (útil en edición)
});

// POST /api/clientes/validate - Validar unicidad de datos
export const POST = withErrorHandling(withAuth(async (request: NextRequest, _session: { user: { id: string } }) => {
  try {
    const body = await request.json();
    
    // Validar entrada
    const validation = validateRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Datos de validación inválidos',
          details: validation.error.issues 
        },
        { status: 400 }
      );
    }

    const { numeroIdentificacion, excludeId } = validation.data;

    // Buscar clientes existentes con el mismo número de identificación
    const existingCliente = await prisma.cliente.findFirst({
      where: {
        AND: [
          {
            OR: [
              { numeroIdentificacion: numeroIdentificacion },
              { ruc: numeroIdentificacion }, // Compatibilidad con campo legacy
            ]
          },
          { activo: true },
          ...(excludeId ? [{ id: { not: excludeId } }] : []),
        ]
      },
      select: {
        id: true,
        nombre: true,
        numeroIdentificacion: true,
        ruc: true,
        tipoEntidad: true,
      }
    });

    const isUnique = !existingCliente;

    // Respuesta con información detallada
    const response = {
      success: true,
      isUnique,
      ...(existingCliente && {
        conflictingClient: {
          id: existingCliente.id,
          nombre: existingCliente.nombre,
          numeroIdentificacion: existingCliente.numeroIdentificacion || existingCliente.ruc,
          tipoEntidad: existingCliente.tipoEntidad,
        }
      })
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error en validación de cliente:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor al validar cliente' 
      },
      { status: 500 }
    );
  }
}));