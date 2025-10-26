import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '../../../src/lib/prisma';
import { logger } from '../../../src/lib/logger';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { Session } from 'next-auth';
import { 
  withAuth, 
  withErrorHandling, 
  validatePagination, 
  successResponse, 
  errorResponse,
  validateActiveRecord,
  validateUniqueness
} from '../../../src/lib/api-utils';

// Esquema de validación para productos
const productoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  sku: z.string().optional(),
  descripcion: z.string().optional(),
  categoriaId: z.string().min(1, 'La categoría es requerida'),
  unidadMedidaId: z.string().min(1, 'La unidad de medida es requerida'),
  precio: z.number().min(0, 'El precio debe ser mayor o igual a 0'),
  stockMinimo: z.number().min(0, 'El stock mínimo debe ser mayor o igual a 0'),
  perecedero: z.boolean(),
  diasVencimiento: z.number().optional(),
});

// GET /api/productos - Listar productos con filtros
export const GET = withErrorHandling(withAuth(async (request: NextRequest, session: Session) => {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const categoriaId = searchParams.get('categoriaId');
    const stockBajo = searchParams.get('stockBajo') === 'true';
    const { page, limit, skip } = validatePagination(searchParams);

    // Construir filtros (sin comparaciones entre campos para evitar errores de Prisma)
    const where = {
      activo: true,
      ...(search && {
        OR: [
          { nombre: { contains: search } },
          { sku: { contains: search } },
          { descripcion: { contains: search } }
        ]
      }),
      ...(categoriaId && { categoriaId }),
      // Filtrado de stock bajo se aplica en memoria para evitar errores y simplificar consulta
    };

    const [productosRaw, total] = await Promise.all([
      prisma.producto.findMany({
        where,
        include: {
          categoria: { select: { id: true, nombre: true } },
          unidadMedida: { select: { id: true, nombre: true, simbolo: true } },
          // Razón Social no se utiliza (el backend se simplifica según frontend)
        },
        orderBy: { nombre: 'asc' },
        skip,
        take: limit
      }),
      prisma.producto.count({ where })
    ]);

    // Normalizar datos y aplicar filtrado de stock bajo si es necesario
    const productos = (productosRaw || []).map((p) => ({
       ...p,
       precio: typeof p.precio === 'number' ? p.precio : 0,
       stock: typeof p.stock === 'number' ? p.stock : 0,
       stockMinimo: typeof p.stockMinimo === 'number' ? p.stockMinimo : 0
     }));

    const data = stockBajo
      ? productos.filter((p) => p.stock <= 0 || (p.stock > 0 && p.stock <= p.stockMinimo))
      : productos;

    const response = successResponse(data, `${data.length} productos encontrados`, {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });

    response.headers.set('Cache-Control', 'no-store');
    return response;
}));

// POST /api/productos - Crear nuevo producto
export const POST = withErrorHandling(withAuth(async (request: NextRequest, session: Session) => {
    const body = await request.json();
    const validatedData = productoSchema.parse(body);

    // Verificar que la categoría y unidad de medida existan
    await validateActiveRecord(prisma.categoria, validatedData.categoriaId, 'Categoría');
    await validateActiveRecord(prisma.unidadMedida, validatedData.unidadMedidaId, 'Unidad de medida');

    // Verificar SKU único si se proporciona
    if (validatedData.sku) {
      await validateUniqueness(prisma.producto, 'sku', validatedData.sku, 'producto');
    }

    // Crear producto
    const nuevoProducto = await prisma.producto.create({
      data: {
        id: randomUUID(),
        nombre: validatedData.nombre,
        sku: validatedData.sku || null,
        descripcion: validatedData.descripcion || null,
        precio: validatedData.precio,
        stockMinimo: validatedData.stockMinimo,
        porcentajeMerma: 0,
        perecedero: validatedData.perecedero,
        diasVencimiento: validatedData.diasVencimiento || null,
        tieneIGV: false,
        categoriaId: validatedData.categoriaId,
        unidadMedidaId: validatedData.unidadMedidaId,
        activo: true
      }
    });

    // Revalidar cualquier ruta que dependa de productos
    try {
      revalidatePath('/dashboard/productos');
      revalidatePath('/app/dashboard/productos');
    } catch {}

    const response = successResponse(nuevoProducto, 'Producto creado exitosamente');
    response.headers.set('Cache-Control', 'no-store');
    return new NextResponse(response.body, {
      status: 201,
      headers: response.headers
    });
}));
// Desactivar caché para este handler y sus respuestas
export const dynamic = 'force-dynamic';
export const revalidate = 0;
