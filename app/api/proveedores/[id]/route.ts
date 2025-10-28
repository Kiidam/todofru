import { NextRequest } from 'next/server';
import { withAuth, withErrorHandling, successResponse, errorResponse } from '../../../../src/lib/api-utils';
import { prisma } from '../../../../src/lib/prisma';
import { logger } from '../../../../src/lib/logger';
import { Prisma } from '@prisma/client';
import { Session } from 'next-auth';
import { validateProveedorPayload } from '../../../../src/schemas/proveedor';

interface BaseProveedorData {
  tipoEntidad: string | null;
  email?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  updatedAt: Date;
  nombres?: string | null;
  apellidos?: string | null;
  numeroIdentificacion?: string | null;
  nombre?: string | null;
  razonSocial?: string | null;
  ruc?: string | null;
  representanteLegal?: string | null;
}

interface LogData {
  proveedorId: string;
  tipoEntidad: string;
  nombres?: string;
  apellidos?: string;
  numeroIdentificacion?: string;
  razonSocial?: string;
  ruc?: string;
}

// PUT /api/proveedores/[id] - Actualizar proveedor existente
export const PUT = withErrorHandling(withAuth(async (request: NextRequest, session: Session, { params }: { params: { id: string } }) => {
  const { id } = await params;
  
  if (!id) {
    return errorResponse('ID de proveedor requerido', 400);
  }

  const body = await request.json();
  
  // Validar usando el esquema existente
  const validation = validateProveedorPayload(body);
  if (!validation.success) {
    return errorResponse('Datos de validación inválidos', 400, validation.error.issues);
  }
  
  const validatedData = validation.data;

  // Verificar que el proveedor existe
  const existingProveedor = await prisma.proveedor.findFirst({
    where: { id, activo: true }
  });

  if (!existingProveedor) {
    return errorResponse('Proveedor no encontrado', 404);
  }

  // Verificar duplicados de identificación
  if (validatedData.numeroIdentificacion) {
    const whereCondition = validatedData.tipoEntidad === 'PERSONA_JURIDICA' 
      ? { 
          OR: [
            { ruc: validatedData.numeroIdentificacion },
            { numeroIdentificacion: validatedData.numeroIdentificacion }
          ],
          activo: true,
          NOT: { id }
        }
      : { 
          numeroIdentificacion: validatedData.numeroIdentificacion, 
          activo: true,
          NOT: { id }
        };

    const duplicateProveedor = await prisma.proveedor.findFirst({ where: whereCondition });

    if (duplicateProveedor) {
      const tipoDoc = validatedData.tipoEntidad === 'PERSONA_JURIDICA' ? 'RUC' : 'DNI';
      return errorResponse(`Ya existe otro proveedor con ese ${tipoDoc}`, 400);
    }
  }

  // Preparar datos según el tipo de entidad
  const baseData: BaseProveedorData = {
    tipoEntidad: validatedData.tipoEntidad,
    email: validatedData.email,
    telefono: validatedData.telefono,
    direccion: validatedData.direccion,
    updatedAt: new Date(),
  };

  // Agregar campos específicos según el tipo de entidad
  if (validatedData.tipoEntidad === 'PERSONA_NATURAL') {
    baseData.nombres = validatedData.nombres;
    baseData.apellidos = validatedData.apellidos;
    baseData.numeroIdentificacion = validatedData.numeroIdentificacion;
    // El campo 'nombre' es obligatorio - para persona natural usamos nombres + apellidos
    baseData.nombre = `${validatedData.nombres} ${validatedData.apellidos}`.trim();
    // Limpiar campos de persona jurídica
    baseData.razonSocial = null;
    baseData.representanteLegal = null;
    baseData.ruc = null;
  } else {
    baseData.razonSocial = validatedData.razonSocial;
    baseData.representanteLegal = validatedData.representanteLegal;
    // Mapear numeroIdentificacion a ambos campos para compatibilidad
    baseData.numeroIdentificacion = validatedData.numeroIdentificacion;
    baseData.ruc = validatedData.numeroIdentificacion || validatedData.ruc;
    // El campo 'nombre' es obligatorio - para persona jurídica usamos la razón social
    baseData.nombre = validatedData.razonSocial;
    // Limpiar campos de persona natural
    baseData.nombres = null;
    baseData.apellidos = null;
  }

  let updatedProveedor: unknown;

  try {
    // Construir payload evitando pasar nulls a campos enum/estrictos
    const updatePayload: Record<string, unknown> = {};
    Object.entries(baseData).forEach(([k, v]) => {
      if (v !== undefined) {
        updatePayload[k] = v;
      }
    });

    // Evitar pasar null para enums (tipoEntidad)
    if (updatePayload.tipoEntidad === null) delete updatePayload.tipoEntidad;

    updatedProveedor = await prisma.proveedor.update({
      where: { id },
      data: updatePayload as Prisma.ProveedorUpdateInput
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? String(err.message).toLowerCase() : '';
    let code: string | undefined;
    let missingColumn = '';
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      code = err.code;
      const meta = err.meta as { column?: string } | undefined;
      missingColumn = typeof meta?.column === 'string' ? meta.column.toLowerCase() : '';
    }
    
    // Fallback: si el cliente Prisma o la BD no tienen columnas nuevas, usar SQL crudo
    if (
      msg.includes('unknown arg') ||
      msg.includes('unknown column') ||
      code === 'P2022'
    ) {
      // Preparar datos para actualización con SQL crudo
      const updateObj: Record<string, unknown> = { ...baseData };
      
      // Filtrar solo las columnas que existen
      const availableCols = ['tipoEntidad', 'nombre', 'nombres', 'apellidos', 'numeroIdentificacion', 'fechaNacimiento', 
                            'razonSocial', 'ruc', 'representanteLegal', 'telefono', 'email', 'direccion'];
      const cols = availableCols.filter((k) => updateObj[k] !== undefined);
      
      // Agregar updatedAt
      updateObj['updatedAt'] = new Date();
      cols.push('updatedAt');
      
      const setClause = cols.map((k) => `${k} = ?`).join(',');
      const values = cols.map((k) => updateObj[k]);
      values.push(id); // Para la cláusula WHERE

      await prisma.$executeRawUnsafe(
        `UPDATE proveedor SET ${setClause} WHERE id = ?`,
        ...values
      );

      const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
        'SELECT id, tipoEntidad, nombre, nombres, apellidos, numeroIdentificacion, fechaNacimiento, razonSocial, ruc, representanteLegal, telefono, email, direccion, activo, createdAt, updatedAt FROM proveedor WHERE id = ?',
        id
      );
      const first = rows[0] as Record<string, unknown> | undefined;
      updatedProveedor = first ? { ...first, activo: !!first.activo } : first;
    } else {
      throw err;
    }
  }

  // Log información relevante según el tipo de entidad
  const logData: LogData = { 
    proveedorId: id, 
    tipoEntidad: validatedData.tipoEntidad
  };
  
  if (validatedData.tipoEntidad === 'PERSONA_NATURAL') {
    logData.nombres = validatedData.nombres;
    logData.apellidos = validatedData.apellidos;
    logData.numeroIdentificacion = validatedData.numeroIdentificacion;
  } else {
    logData.razonSocial = validatedData.razonSocial;
    logData.ruc = validatedData.ruc;
  }
  
  logger.info('Proveedor actualizado exitosamente', logData);

  return successResponse(updatedProveedor, 'Proveedor actualizado exitosamente');
}));

// DELETE /api/proveedores/[id] - Eliminar proveedor (soft delete)
export const DELETE = withErrorHandling(withAuth(async (request: NextRequest, session: Session, { params }: { params: { id: string } }) => {
  const { id } = await params;
  
  if (!id) {
    return errorResponse('ID de proveedor requerido', 400);
  }

  // Verificar que el proveedor existe
  const existingProveedor = await prisma.proveedor.findFirst({
    where: { id, activo: true }
  });

  if (!existingProveedor) {
    return errorResponse('Proveedor no encontrado', 404);
  }

  try {
    // Soft delete - marcar como inactivo
    const deletedProveedor = await prisma.proveedor.update({
      where: { id },
      data: { 
        activo: false,
        updatedAt: new Date()
      }
    });

    logger.info('Proveedor eliminado exitosamente', { proveedorId: id });

    return successResponse(deletedProveedor, 'Proveedor eliminado exitosamente');
  } catch (err: unknown) {
    const msg = err instanceof Error ? String(err.message).toLowerCase() : '';
    let code: string | undefined;
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      code = err.code;
    }
    
    // Fallback para soft delete con SQL crudo
    if (
      msg.includes('unknown arg') ||
      msg.includes('unknown column') ||
      code === 'P2022'
    ) {
      await prisma.$executeRawUnsafe(
        'UPDATE proveedor SET activo = 0, updatedAt = ? WHERE id = ?',
        new Date(),
        id
      );

      const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
        'SELECT id, tipoEntidad, nombre, nombres, apellidos, numeroIdentificacion, fechaNacimiento, razonSocial, ruc, representanteLegal, telefono, email, direccion, activo, createdAt, updatedAt FROM proveedor WHERE id = ?',
        id
      );
      const firstRow = rows[0] as Record<string, unknown> | undefined;
      const deletedProveedor = firstRow ? { ...firstRow, activo: !!firstRow.activo } : firstRow;
      
      logger.info('Proveedor eliminado exitosamente (fallback)', { proveedorId: id });
      
      return successResponse(deletedProveedor, 'Proveedor eliminado exitosamente');
    } else {
      throw err;
    }
  }
}));

// GET /api/proveedores/[id] - Obtener proveedor por ID
export const GET = withErrorHandling(withAuth(async (request: NextRequest, session: Session, { params }: { params: { id: string } }) => {
  const { id } = await params;
  
  if (!id) {
    return errorResponse('ID de proveedor requerido', 400);
  }

  try {
    const proveedor = await prisma.proveedor.findFirst({
      where: { id, activo: true }
    });

    if (!proveedor) {
      return errorResponse('Proveedor no encontrado', 404);
    }

    return successResponse(proveedor);
  } catch (err: unknown) {
    const msg = err instanceof Error ? String(err.message).toLowerCase() : '';
    let code: string | undefined;
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      code = err.code;
    }
    
    // Fallback con SQL crudo
    if (
      msg.includes('unknown arg') ||
      msg.includes('unknown column') ||
      code === 'P2022'
    ) {
      const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
        'SELECT id, tipoEntidad, nombre, nombres, apellidos, numeroIdentificacion, fechaNacimiento, razonSocial, ruc, representanteLegal, telefono, email, direccion, activo, createdAt, updatedAt FROM proveedor WHERE id = ? AND activo = 1',
        id
      );
      const first = rows[0] as Record<string, unknown> | undefined;
      const proveedor = first ? { ...first, activo: !!first.activo } : null;
      
      if (!proveedor) {
        return errorResponse('Proveedor no encontrado', 404);
      }

      return successResponse(proveedor);
    } else {
      throw err;
    }
  }
}));

// PATCH /api/proveedores/[id] - Alternar estado activo/inactivo
export const PATCH = withErrorHandling(withAuth(async (request: NextRequest, session: Session, { params }: { params: { id: string } }) => {
  const { id } = await params;

  if (!id) {
    return errorResponse('ID de proveedor requerido', 400);
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

  // Verificar que el proveedor existe
  const existingProveedor = await prisma.proveedor.findUnique({ where: { id } });
  if (!existingProveedor) {
    return errorResponse('Proveedor no encontrado', 404);
  }

  try {
    const updated = await prisma.proveedor.update({
      where: { id },
      data: { activo: activoProvided, updatedAt: new Date() }
    });

    return successResponse(updated, `Proveedor ${activoProvided ? 'activado' : 'desactivado'} exitosamente`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? String(err.message).toLowerCase() : '';
    let code: string | undefined;
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      code = err.code;
    }

    // Fallback a SQL crudo para errores de esquema/columna
    if (msg.includes('unknown arg') || msg.includes('unknown column') || code === 'P2022') {
      await prisma.$executeRawUnsafe('UPDATE proveedor SET activo = ?, updatedAt = ? WHERE id = ?', activoProvided ? 1 : 0, new Date(), id);

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>('SELECT * FROM proveedor WHERE id = ?', id);
  const firstRow = rows[0] as Record<string, unknown> | undefined;
  const updatedProveedor = firstRow ? { ...firstRow, activo: !!firstRow.activo } : firstRow;

      logger.info('Proveedor actualizado exitosamente (fallback PATCH)', { proveedorId: id });
      return successResponse(updatedProveedor, `Proveedor ${activoProvided ? 'activado' : 'desactivado'} exitosamente`);
    }

    throw err;
  }
}));