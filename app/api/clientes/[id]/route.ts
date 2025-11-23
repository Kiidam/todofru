import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../src/lib/prisma';
import { z } from 'zod';
import { 
  withAuth, 
  withErrorHandling, 
  successResponse, 
  errorResponse
} from '../../../../src/lib/api-utils';
import { validateClientePayload } from '../../../../src/schemas/cliente';

// Esquema de validación para clientes (estructura antigua - retrocompatibilidad)
const clienteSchemaLegacy = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  ruc: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  direccion: z.string().optional(),
  contacto: z.string().optional(),
  tipoCliente: z.enum(['MAYORISTA', 'MINORISTA']),
});

// Tipos para la estructura de datos
interface ClienteData {
  tipoEntidad?: 'PERSONA_NATURAL' | 'PERSONA_JURIDICA';
  numeroIdentificacion?: string;
  nombres?: string;
  apellidos?: string;
  razonSocial?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  contacto?: string;
  tipoCliente?: 'MAYORISTA' | 'MINORISTA';
  mensajePersonalizado?: string;
  nombre?: string;
  ruc?: string;
  updatedAt?: Date;
}

// Función para detectar si es estructura nueva o antigua
function isNewStructure(data: ClienteData): boolean {
  return data.tipoEntidad !== undefined || data.numeroIdentificacion !== undefined;
}

// GET /api/clientes/[id] - Obtener cliente por ID
export const GET = withErrorHandling(withAuth(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const { id } = params;

  if (!id) {
    return errorResponse('ID de cliente requerido', 400);
  }

  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: {
      _count: {
        select: { 
          pedidos: true
        }
      }
    }
  });

  if (!cliente) {
    return errorResponse('Cliente no encontrado', 404);
  }

  return successResponse(cliente, 'Cliente encontrado');
}));

// PUT /api/clientes/[id] - Actualizar cliente
export const PUT = withErrorHandling(withAuth(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const { id } = params;
  const body = await request.json() as ClienteData;

  if (!id) {
    return errorResponse('ID de cliente requerido', 400);
  }

  // Verificar que el cliente existe
  const existingCliente = await prisma.cliente.findUnique({
    where: { id }
  });

  if (!existingCliente) {
    return errorResponse('Cliente no encontrado', 404);
  }

  let validatedData: z.infer<typeof clienteSchemaLegacy> | ReturnType<typeof validateClientePayload>['data'];
  let clienteData: Record<string, unknown>;
  
  if (isNewStructure(body)) {
    // Nueva estructura (formularios refactorizados)
    const validation = validateClientePayload(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: validation.error.issues },
        { status: 400 }
      );
    }
    validatedData = validation.data;
    
    // Verificar número de identificación único (excluyendo el cliente actual)
    if (validatedData.numeroIdentificacion) {
      const duplicateCliente = await prisma.cliente.findFirst({
        where: { 
          OR: [
            { ruc: validatedData.numeroIdentificacion },
            { numeroIdentificacion: validatedData.numeroIdentificacion }
          ],
          activo: true,
          NOT: { id }
        }
      });

      if (duplicateCliente) {
        const tipoDoc = validatedData.numeroIdentificacion.length === 8 ? 'DNI' : 'RUC';
        return errorResponse(`Ya existe otro cliente con ese ${tipoDoc}`, 400);
      }
    }
    
    // Calcular nombre según tipo de entidad
    const nombreCalculado = validatedData.tipoEntidad === 'PERSONA_NATURAL'
      ? `${(validatedData.nombres || '').trim()} ${(validatedData.apellidos || '').trim()}`.trim().replace(/\s+/g, ' ')
      : (validatedData.razonSocial || '').trim();
    
    // Preparar datos para la base de datos
    clienteData = {
      nombre: nombreCalculado,
      // Guardar RUC solo para persona jurídica (compatibilidad)
      ruc: validatedData.tipoEntidad === 'PERSONA_JURIDICA' ? validatedData.numeroIdentificacion : undefined,
      numeroIdentificacion: validatedData.numeroIdentificacion,
      telefono: validatedData.telefono,
      email: validatedData.email,
      direccion: validatedData.direccion,
      contacto: validatedData.contacto,
      tipoCliente: validatedData.tipoCliente,
      updatedAt: new Date(),
      // Campos adicionales para nueva estructura
      tipoEntidad: validatedData.tipoEntidad,
      nombres: validatedData.nombres,
      apellidos: validatedData.apellidos,
      razonSocial: validatedData.razonSocial,
    };

    // Añadir opcionalmente campos no garantizados por el tipo (manejar como registro genérico)
    const validatedRecord = validatedData as Record<string, unknown>;
    if (validatedRecord.mensajePersonalizado) {
      (clienteData as Record<string, unknown>).mensajePersonalizado = String(validatedRecord.mensajePersonalizado);
    }
  } else {
    // Estructura antigua (retrocompatibilidad)
    validatedData = clienteSchemaLegacy.parse(body);
    
    // Verificar RUC único si se proporciona (excluyendo el cliente actual)
    if (validatedData.ruc) {
      const duplicateCliente = await prisma.cliente.findFirst({
        where: { 
          ruc: validatedData.ruc, 
          activo: true,
          NOT: { id }
        }
      });

      if (duplicateCliente) {
        return errorResponse('Ya existe otro cliente con ese RUC', 400);
      }
    }
    
    clienteData = {
      ...validatedData,
      updatedAt: new Date(),
    };
  }

  const cliente = await prisma.cliente.update({
    where: { id },
    data: clienteData
  });

  return successResponse(cliente, 'Cliente actualizado exitosamente');
}));

// DELETE /api/clientes/[id] - Eliminar cliente (soft delete)
export const DELETE = withErrorHandling(withAuth(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const { id } = params;

  if (!id) {
    return errorResponse('ID de cliente requerido', 400);
  }

  // Verificar que el cliente existe
  const existingCliente = await prisma.cliente.findUnique({
    where: { id }
  });

  if (!existingCliente) {
    return errorResponse('Cliente no encontrado', 404);
  }

  // Verificar si el cliente tiene pedidos asociados
  const pedidosCount = await prisma.pedidoVenta.count({
    where: { clienteId: id }
  });

  if (pedidosCount > 0) {
    return errorResponse('No se puede eliminar el cliente porque tiene pedidos asociados', 400);
  }

  // Soft delete - marcar como inactivo
  const cliente = await prisma.cliente.update({
    where: { id },
    data: { 
      activo: false,
      updatedAt: new Date()
    }
  });

  return successResponse(cliente, 'Cliente eliminado exitosamente');
}));

// PATCH /api/clientes/[id] - Alternar estado activo/inactivo
export const PATCH = withErrorHandling(withAuth(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const { id } = params;

  if (!id) {
    return errorResponse('ID de cliente requerido', 400);
  }

  let body: { activo?: boolean } = {};
  try {
    body = await request.json() as { activo?: boolean };
  } catch {
    return errorResponse('Cuerpo de solicitud inválido', 400);
  }

  const activoProvided = typeof body?.activo === 'boolean' ? body.activo : null;
  if (activoProvided === null) {
    return errorResponse('Parámetro "activo" requerido', 400);
  }

  // Verificar que el cliente existe
  const existingCliente = await prisma.cliente.findUnique({
    where: { id }
  });

  if (!existingCliente) {
    return errorResponse('Cliente no encontrado', 404);
  }

  try {
    const updated = await prisma.cliente.update({
      where: { id },
      data: { activo: activoProvided, updatedAt: new Date() }
    });

    return successResponse(updated, `Cliente ${activoProvided ? 'activado' : 'desactivado'} exitosamente`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? String(err.message).toLowerCase() : '';
    // Si el error es por columna desconocida o P2022, intentar fallback SQL crudo
    const errObj = err as { code?: string };
    if (msg.includes('unknown arg') || msg.includes('unknown column') || errObj.code === 'P2022') {
      await prisma.$executeRawUnsafe('UPDATE cliente SET activo = ?, updatedAt = ? WHERE id = ?', activoProvided ? 1 : 0, new Date(), id);
      const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>('SELECT * FROM cliente WHERE id = ?', id);
      const firstRow = rows[0];
      const updated = firstRow ? { ...firstRow, activo: !!(firstRow as Record<string, unknown>).activo } : firstRow;
      return successResponse(updated, `Cliente ${activoProvided ? 'activado' : 'desactivado'} exitosamente`);
    }

    throw err;
  }
}));