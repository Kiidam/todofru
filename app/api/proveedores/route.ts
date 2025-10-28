import { NextRequest } from 'next/server';
import { withAuth, withErrorHandling, validatePagination as _validatePagination, successResponse, errorResponse, validateActiveRecord as _validateActiveRecord } from '../../../src/lib/api-utils';
import { safeTransaction as _safeTransaction } from '../../../src/lib/prisma';
import { prisma } from '../../../src/lib/prisma';
import { logger as _logger } from '../../../src/lib/logger';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import crypto from 'crypto';
import { validateProveedorPayload } from '../../../src/schemas/proveedor';
import { ProveedorPayload } from '../../../src/types/proveedor';

// Tipos para el contexto de autenticación
interface AuthContext {
  session: {
    user: {
      id: string;
      email?: string;
    };
  };
}

// GET /api/proveedores - Listar proveedores
export const GET = withErrorHandling(withAuth(async (request: NextRequest, context: AuthContext) => {
  const { session: _session } = context;
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const simple = searchParams.get('simple') === 'true';
  const { page, limit, skip } = _validatePagination(searchParams);

    const where = {
      activo: true,
      ...(search && {
        OR: [
          { nombres: { contains: search } },
        { apellidos: { contains: search } },
        { razonSocial: { contains: search } },
        { ruc: { contains: search } },
        { numeroIdentificacion: { contains: search } },
        ]
      })
    };

    try {
      // If caller requests a simple list, return a minimal, direct DB query to avoid any raw SQL fallbacks
      if (simple) {
        const direct = await prisma.proveedor.findMany({
          where: { activo: true },
          orderBy: [ { nombre: 'asc' }, { createdAt: 'desc' } ],
          select: {
            id: true,
            nombre: true,
            razonSocial: true,
            nombres: true,
            apellidos: true,
            numeroIdentificacion: true,
            ruc: true,
            telefono: true,
            email: true,
            direccion: true,
            representanteLegal: true,
            activo: true,
            createdAt: true
          },
          skip,
          take: limit
        });

        const total = await prisma.proveedor.count({ where: { activo: true } });
        const response = successResponse({ data: direct, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
        response.headers.set('Cache-Control', 'no-store');
        return response;
      }
      const [proveedores, total] = await Promise.all([
        prisma.proveedor.findMany({
          where,
          orderBy: [
            { nombre: 'asc' },
            { createdAt: 'desc' }
          ],
          skip,
          take: limit
        }),
        prisma.proveedor.count({ where })
      ]);

      // Obtener conteo de productos por proveedor basado en pedidos de compra
      let productosPorProveedor: Record<string, number> = {};
      const ids = proveedores.map(p => p.id).filter(Boolean) as string[];
      if (ids.length > 0) {
        const inList = ids.map(id => `'${id.replace(/'/g, "''")}'`).join(',');
        const rows = await prisma.$queryRawUnsafe<Array<{ proveedorId: string; productos: number }>>(
          `SELECT pc.proveedorId as proveedorId, COUNT(DISTINCT pci.productoId) as productos
           FROM pedidocompra pc
           JOIN pedidocompraitem pci ON pci.pedidoId = pc.id
           WHERE pc.proveedorId IN (${inList})
           GROUP BY pc.proveedorId`
        );
        productosPorProveedor = Object.fromEntries(rows.map(r => [r.proveedorId, Number(r.productos || 0)]));
      }

      const proveedoresConProductos = proveedores.map(p => ({
        ...p,
        nombre: p.nombre || p.razonSocial || `${p.nombres || ''} ${p.apellidos || ''}`.trim() || 'Sin nombre',
        productosCount: productosPorProveedor[p.id || ''] || 0,
      }));

        const response = successResponse(
        { 
          data: proveedoresConProductos,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
          }
        }
      );
      // Conditional debug logging: set LOG_PROVEEDORES=true in .env to enable
      try {
        if (process.env.LOG_PROVEEDORES === 'true') {
          const sample = proveedoresConProductos.slice(0, 10).map(p => ({ id: p.id, nombre: p.nombre, numeroIdentificacion: p.numeroIdentificacion, activo: p.activo, createdAt: p.createdAt }));
          // eslint-disable-next-line no-console
          console.debug('[LOG_PROVEEDORES] outgoing payload sample:', JSON.stringify(sample));
        }
      } catch (e) {
        // ignore logging errors
      }
      response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
      return response;
    } catch (err: unknown) {
      const msg = err instanceof Error ? String(err.message).toLowerCase() : '';
      let code: string | undefined;
      let missingColumn = '';
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        code = err.code;
        const meta = err.meta as { column?: string } | undefined;
        missingColumn = typeof meta?.column === 'string' ? meta.column.toLowerCase() : '';
      }
      const unknownColumn = msg.includes('unknown column');
      const validationError = err instanceof Prisma.PrismaClientValidationError || String((err as Error).name || '').includes('PrismaClientValidationError');
      const contactoMissing = (unknownColumn && msg.includes('contacto')) || (code === 'P2022' && (missingColumn.includes('contacto') || msg.includes('contacto')));
      const direccionMissing = (unknownColumn && msg.includes('direccion')) || (code === 'P2022' && (missingColumn.includes('direccion') || msg.includes('direccion')));

      if (validationError || contactoMissing || direccionMissing) {
         const safeSearch = (search || '').replace(/[^a-zA-Z0-9\s-]/g, '');
         const clauses: string[] = ['activo = 1'];
         if (safeSearch) {
           const like = `%${safeSearch}%`;
           clauses.push(`(nombres LIKE '${like}' OR apellidos LIKE '${like}' OR razonSocial LIKE '${like}' OR ruc LIKE '${like}' OR numeroIdentificacion LIKE '${like}')`);
         }
         const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
         const orderSql = `ORDER BY COALESCE(razonSocial, CONCAT(nombres, ' ', apellidos)) ASC`;
         const limitSql = `LIMIT ${Number(limit)} OFFSET ${Number(skip)}`;
     
         // Seleccionar únicamente columnas conocidas y presentes en la BD
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
          createdAt: Date; 
          activo: number 
        }>>(
        `SELECT id, tipoEntidad, nombre, nombres, apellidos, numeroIdentificacion, fechaNacimiento, razonSocial, ruc, representanteLegal, telefono, email, direccion, createdAt, activo FROM proveedor ${whereSql} ${orderSql} ${limitSql};`
        );
        const countRows = await prisma.$queryRawUnsafe<Array<{ total: number }>>(
        `SELECT COUNT(*) as total FROM proveedor ${whereSql};`
        );
        const total = Number(countRows?.[0]?.total || 0);
        const dataBase = rows.map(r => ({ ...r, activo: !!r.activo }));

        // Conteo de productos por proveedor (fallback SQL)
        let productosPorProveedor: Record<string, number> = {};
        if (dataBase.length > 0) {
          const ids = dataBase.map(r => r.id).filter(Boolean);
          const inList = ids.map(id => `'${String(id).replace(/'/g, "''")}'`).join(',');
          const prodRows = await prisma.$queryRawUnsafe<Array<{ proveedorId: string; productos: number }>>(
            `SELECT pc.proveedorId as proveedorId, COUNT(DISTINCT pci.productoId) as productos
             FROM pedidocompra pc
             JOIN pedidocompraitem pci ON pci.pedidoId = pc.id
             WHERE pc.proveedorId IN (${inList})
             GROUP BY pc.proveedorId`
          );
          productosPorProveedor = Object.fromEntries(prodRows.map(r => [r.proveedorId, Number(r.productos || 0)]));
        }

        const data = dataBase.map(r => ({ 
          ...r, 
          nombre: r.nombre || r.razonSocial || `${r.nombres || ''} ${r.apellidos || ''}`.trim() || 'Sin nombre',
          productosCount: productosPorProveedor[r.id] || 0 
        }));
     
         const response = successResponse(
           {
             data,
             pagination: {
               total,
               page,
               limit,
               totalPages: Math.ceil(total / limit)
             }
           }
         );
         response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
         return response;
      }

  _logger.error('Error inesperado en GET /api/proveedores:', { error: err });
      return errorResponse('Error interno del servidor', 500);
    }
}));

// POST /api/proveedores - Crear proveedor
export const POST = withErrorHandling(withAuth(async (request: NextRequest, context: AuthContext) => {
  const { session: _session } = context;
  const body = await request.json();

  // Validar payload usando el esquema existente
  const validation = validateProveedorPayload(body);
  if (!validation.success) {
    return errorResponse('Datos de validación inválidos', 400, validation.error.issues);
  }

  const data = validation.data;

  // Verificar unicidad de RUC si es persona jurídica
  if (data.tipoEntidad === 'PERSONA_JURIDICA' && data.numeroIdentificacion) {
    const existingRuc = await prisma.proveedor.findFirst({
      where: { numeroIdentificacion: data.numeroIdentificacion }
    });
    if (existingRuc) {
      return errorResponse('El RUC ya está registrado para otro proveedor', 409);
    }
  }

  try {
    const created = await prisma.proveedor.create({
      data: {
        id: crypto.randomUUID(),
        tipoEntidad: data.tipoEntidad,
        nombre: data.nombre,
        numeroIdentificacion: data.numeroIdentificacion,
        telefono: data.telefono,
        email: data.email,
        direccion: data.direccion,
        contacto: data.contacto,
        // Campos específicos
        nombres: data.nombres,
        apellidos: data.apellidos,
        razonSocial: data.razonSocial,
        representanteLegal: data.representanteLegal,
        // Compatibilidad
        ruc: data.ruc,
      }
    });

    return successResponse(created, 'Proveedor creado exitosamente');
  } catch (error) {
  _logger.error('Error al crear proveedor:', { error });
    return errorResponse('Error interno del servidor', 500);
  }
}));
