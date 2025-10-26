import { NextRequest } from 'next/server';
import { withAuth, withErrorHandling, successResponse, errorResponse } from '../../../../src/lib/api-utils';
import { prisma } from '../../../../src/lib/prisma';
import { logger } from '../../../../src/lib/logger';
import { Prisma } from '@prisma/client';
import { Session } from 'next-auth';
import { validateProveedorPayload } from '../../../../src/schemas/proveedor';
import { validateDocument, sanitizeNumericInput } from '../../../../src/utils/documentValidation';

// PUT /api/proveedores/[id] - Actualizar proveedor existente
export const PUT = withErrorHandling(withAuth(async (request: NextRequest, session: Session, { params }: { params: { id: string } }) => {
  const { id } = params;
  
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

  // Sanitizar número de identificación
  if (validatedData.numeroIdentificacion) {
    validatedData.numeroIdentificacion = sanitizeNumericInput(validatedData.numeroIdentificacion);
  }

  // Validaciones adicionales de seguridad
  if (validatedData.numeroIdentificacion) {
    // Validar documento usando algoritmo checksum
    const documentValidation = validateDocument(validatedData.numeroIdentificacion);
    if (!documentValidation.isValid) {
      logger.warn('Intento de actualización con documento inválido', {
        proveedorId: id,
        numeroIdentificacion: validatedData.numeroIdentificacion,
        tipoEntidad: validatedData.tipoEntidad,
        error: documentValidation.error,
        sessionUserId: session.user?.id
      });
      return errorResponse(documentValidation.error || 'El número de documento no es válido', 400);
    }

    // Verificar que el tipo de documento coincida con el tipo de entidad
    const documentLength = validatedData.numeroIdentificacion.length;
    if (validatedData.tipoEntidad === 'PERSONA_NATURAL' && documentLength !== 8) {
      return errorResponse('Para persona natural se requiere un DNI de 8 dígitos', 400);
    }
    if (validatedData.tipoEntidad === 'PERSONA_JURIDICA' && documentLength !== 11) {
      return errorResponse('Para persona jurídica se requiere un RUC de 11 dígitos', 400);
    }
  }

  // Verificar que el proveedor existe
  const existingProveedor = await prisma.proveedor.findFirst({
    where: { id, activo: true }
  });

  if (!existingProveedor) {
    return errorResponse('Proveedor no encontrado', 404);
  }

  // Verificar unicidad del documento (optimizado en una sola consulta)
  if (validatedData.numeroIdentificacion) {
    const duplicateProveedor = await prisma.proveedor.findFirst({
      where: { 
        OR: [
          { ruc: validatedData.numeroIdentificacion },
          { numeroIdentificacion: validatedData.numeroIdentificacion }
        ],
        activo: true,
        NOT: { id } // Excluir el proveedor actual
      }
    });

    if (duplicateProveedor) {
      const documentType = validatedData.tipoEntidad === 'PERSONA_JURIDICA' ? 'RUC' : 'DNI';
      logger.warn('Intento de actualización con documento duplicado', {
        proveedorId: id,
        numeroIdentificacion: validatedData.numeroIdentificacion,
        tipoEntidad: validatedData.tipoEntidad,
        duplicateProveedorId: duplicateProveedor.id,
        sessionUserId: session.user?.id
      });
      return errorResponse(`Ya existe otro proveedor con ese ${documentType}`, 400);
    }
  }

  // Preparar datos según el tipo de entidad
  const baseData: any = {
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
    updatedProveedor = await prisma.proveedor.update({
      where: { id },
      data: baseData
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

      const rows = await prisma.$queryRawUnsafe<Array<{
        id: string;
        tipoEntidad: string | null;
        nombre: string | null;
        nombres: string | null;
        apellidos: string | null;
        numeroIdentificacion: string | null;
        fechaNacimiento: Date | null;
        razonSocial: string | null;
        ruc: string | null;
        representanteLegal: string | null;
        telefono: string | null;
        email: string | null;
        direccion: string | null;
        activo: number;
        createdAt: Date;
        updatedAt: Date;
      }>>(
        'SELECT id, tipoEntidad, nombre, nombres, apellidos, numeroIdentificacion, fechaNacimiento, razonSocial, ruc, representanteLegal, telefono, email, direccion, activo, createdAt, updatedAt FROM proveedor WHERE id = ?',
        id
      );
      updatedProveedor = rows[0] ? { ...rows[0], activo: !!rows[0].activo } : rows[0];
    } else {
      throw err;
    }
  }

  // Log información relevante según el tipo de entidad
  const logData: any = { 
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
  const { id } = params;
  
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

      const rows = await prisma.$queryRawUnsafe<Array<{
        id: string;
        tipoEntidad: string | null;
        nombre: string | null;
        nombres: string | null;
        apellidos: string | null;
        numeroIdentificacion: string | null;
        fechaNacimiento: Date | null;
        razonSocial: string | null;
        ruc: string | null;
        representanteLegal: string | null;
        telefono: string | null;
        email: string | null;
        direccion: string | null;
        activo: number;
        createdAt: Date;
        updatedAt: Date;
      }>>(
        'SELECT id, tipoEntidad, nombre, nombres, apellidos, numeroIdentificacion, fechaNacimiento, razonSocial, ruc, representanteLegal, telefono, email, direccion, activo, createdAt, updatedAt FROM proveedor WHERE id = ?',
        id
      );
      
      const deletedProveedor = rows[0] ? { ...rows[0], activo: !!rows[0].activo } : rows[0];
      
      logger.info('Proveedor eliminado exitosamente (fallback)', { proveedorId: id });
      
      return successResponse(deletedProveedor, 'Proveedor eliminado exitosamente');
    } else {
      throw err;
    }
  }
}));

// GET /api/proveedores/[id] - Obtener proveedor por ID
export const GET = withErrorHandling(withAuth(async (request: NextRequest, session: Session, { params }: { params: { id: string } }) => {
  const { id } = params;
  
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
      const rows = await prisma.$queryRawUnsafe<Array<{
        id: string;
        tipoEntidad: string | null;
        nombre: string | null;
        nombres: string | null;
        apellidos: string | null;
        numeroIdentificacion: string | null;
        fechaNacimiento: Date | null;
        razonSocial: string | null;
        ruc: string | null;
        representanteLegal: string | null;
        telefono: string | null;
        email: string | null;
        direccion: string | null;
        activo: number;
        createdAt: Date;
        updatedAt: Date;
      }>>(
        'SELECT id, tipoEntidad, nombre, nombres, apellidos, numeroIdentificacion, fechaNacimiento, razonSocial, ruc, representanteLegal, telefono, email, direccion, activo, createdAt, updatedAt FROM proveedor WHERE id = ? AND activo = 1',
        id
      );
      
      const proveedor = rows[0] ? { ...rows[0], activo: !!rows[0].activo } : null;
      
      if (!proveedor) {
        return errorResponse('Proveedor no encontrado', 404);
      }

      return successResponse(proveedor);
    } else {
      throw err;
    }
  }
}));