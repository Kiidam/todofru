import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

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
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const categoriaId = searchParams.get('categoriaId');
    const razonSocialId = searchParams.get('razonSocialId'); // Nuevo parámetro
    const stockBajo = searchParams.get('stockBajo') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Construir filtros
    const where: any = {
      activo: true,
      ...(search && {
        OR: [
          { nombre: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { descripcion: { contains: search, mode: 'insensitive' } }
        ]
      }),
      ...(categoriaId && { categoriaId }),
      ...(stockBajo && {
        OR: [
          { stock: { lte: 0 } },
          {
            AND: [
              { stock: { gt: 0 } },
              { stock: { lte: { field: 'stockMinimo' } as any } }
            ]
          }
        ]
      })
    };

    const [productos, total] = await Promise.all([
      prisma.producto.findMany({
        where,
        include: {
          categoria: { select: { id: true, nombre: true } },
          unidadMedida: { select: { id: true, nombre: true, simbolo: true } },
          // Incluir precios por razón social
          preciosRazonSocial: {
            where: {
              activo: true,
              ...(razonSocialId && { razonSocialId })
            },
            include: {
              razonSocial: {
                select: { id: true, nombre: true, tipoEmpresa: true }
              }
            }
          }
        },
        orderBy: { nombre: 'asc' },
        skip,
        take: limit
      }),
      prisma.producto.count({ where })
    ]);

    return NextResponse.json({ 
      success: true, 
      data: productos,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error al obtener productos:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST /api/productos - Crear nuevo producto
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = productoSchema.parse(body);

    // Verificar que la categoría y unidad de medida existan
    const [categoria, unidadMedida] = await Promise.all([
      prisma.categoria.findFirst({
        where: { id: validatedData.categoriaId, activo: true }
      }),
      prisma.unidadMedida.findFirst({
        where: { id: validatedData.unidadMedidaId, activo: true }
      })
    ]);

    if (!categoria) {
      return NextResponse.json(
        { success: false, error: 'Categoría no encontrada' },
        { status: 400 }
      );
    }

    if (!unidadMedida) {
      return NextResponse.json(
        { success: false, error: 'Unidad de medida no encontrada' },
        { status: 400 }
      );
    }

    // Verificar SKU único si se proporciona
    if (validatedData.sku) {
      const existingProduct = await prisma.producto.findFirst({
        where: { sku: validatedData.sku, activo: true }
      });

      if (existingProduct) {
        return NextResponse.json(
          { success: false, error: 'Ya existe un producto con ese SKU' },
          { status: 400 }
        );
      }
    }

    const producto = await prisma.producto.create({
      data: validatedData,
      include: {
        categoria: { select: { id: true, nombre: true } },
        unidadMedida: { select: { id: true, nombre: true, simbolo: true } }
      }
    });

    return NextResponse.json({ 
      success: true, 
      data: producto,
      message: 'Producto creado exitosamente'
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error al crear producto:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
