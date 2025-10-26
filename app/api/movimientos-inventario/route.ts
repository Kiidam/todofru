import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { withAuth, withErrorHandling, validatePagination, successResponse, errorResponse } from '../../../src/lib/api-utils';
import { prisma } from '../../../src/lib/prisma';
import { logger } from '../../../src/lib/logger';
import { authOptions } from '../auth/[...nextauth]/route';
import { z } from 'zod';
import { validateProductoParaMovimiento } from '../../../src/lib/producto-inventario-sync';
import type { Prisma } from '@prisma/client';
import type { TipoMovimiento } from '../../../src/types/todafru';
import { Session } from 'next-auth';

// Esquema de validación para movimientos
const movimientoSchema = z.object({
  productoId: z.string().min(1, 'El producto es requerido'),
  tipo: z.enum(['ENTRADA', 'SALIDA', 'AJUSTE']),
  cantidad: z.number().positive('La cantidad debe ser positiva'),
  precio: z.number().min(0).optional(),
  motivo: z.string().optional(),
  numeroGuia: z.string().optional(),
});

// GET /api/movimientos-inventario - Listar movimientos con filtros
export const GET = withErrorHandling(withAuth(async (request: NextRequest, session: Session) => {
  const { searchParams } = new URL(request.url);
  const productoId = searchParams.get('productoId');
  const tipo = searchParams.get('tipo');
  const fechaDesde = searchParams.get('fechaDesde');
  const fechaHasta = searchParams.get('fechaHasta');
  
  const { page, limit, skip } = validatePagination(searchParams);

  // Construir filtros
  const where = {
    ...(productoId && { productoId }),
    ...(tipo && { tipo: tipo as TipoMovimiento }),
    ...(fechaDesde || fechaHasta) && {
      createdAt: {
        ...(fechaDesde && { gte: new Date(fechaDesde) }),
        ...(fechaHasta && { lte: new Date(fechaHasta) })
      }
    }
  } as const;

  const [movimientos, total] = await Promise.all([
    prisma.movimientoInventario.findMany({
      where,
      include: {
        producto: {
          select: {
            id: true,
            nombre: true,
            sku: true,
            unidadMedida: { select: { simbolo: true } }
          }
        },
        usuario: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.movimientoInventario.count({ where })
  ]);

  const pagination = {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };

  return successResponse(movimientos, undefined, pagination);
}));

// POST /api/movimientos-inventario - Crear nuevo movimiento
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = movimientoSchema.parse(body);

    // VALIDACIÓN DE SINCRONIZACIÓN: Verificar que el producto existe y está activo
    const validationResult = await validateProductoParaMovimiento(validatedData.productoId);
    
    if (!validationResult.isValid) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Producto no válido para movimiento',
          details: validationResult.error,
          syncError: true // Marcador para identificar errores de sincronización
        },
        { status: 400 }
      );
    }

    const producto = validationResult.producto!;

    // Calcular nuevo stock
    let nuevoStock = producto.stock;
    if (validatedData.tipo === 'ENTRADA') {
      nuevoStock += validatedData.cantidad;
    } else if (validatedData.tipo === 'SALIDA') {
      nuevoStock -= validatedData.cantidad;
      if (nuevoStock < 0) {
        return NextResponse.json(
          { success: false, error: 'Stock insuficiente para realizar la salida' },
          { status: 400 }
        );
      }
    } else { // AJUSTE
      nuevoStock = validatedData.cantidad;
    }

    // Crear movimiento y actualizar stock en una transacción
    const resultado = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Crear el movimiento
      const movimiento = await tx.movimientoInventario.create({
        data: {
          ...validatedData,
          cantidadAnterior: producto.stock,
          cantidadNueva: nuevoStock,
          usuarioId: session.user.id
        },
        include: {
          producto: {
            select: {
              id: true,
              nombre: true,
              sku: true,
              unidadMedida: { select: { simbolo: true } }
            }
          },
          usuario: { select: { name: true } }
        }
      });

      // Actualizar el stock del producto
      await tx.producto.update({
        where: { id: validatedData.productoId },
        data: { stock: nuevoStock }
      });

      return movimiento;
    });

    return NextResponse.json({ 
      success: true, 
      data: resultado,
      message: 'Movimiento de inventario registrado exitosamente'
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }

    logger.error('Error al crear movimiento:', { error });
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
