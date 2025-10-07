import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { EstadoPedido, Prisma } from '@prisma/client';

// Esquema de validación para pedidos de compra
const itemSchema = z.object({
  productoId: z.string().min(1, 'El producto es requerido'),
  cantidad: z.number().positive('La cantidad debe ser positiva'),
  precio: z.number().min(0, 'El precio debe ser mayor o igual a 0'),
});

const pedidoCompraSchema = z.object({
  proveedorId: z.string().min(1, 'El proveedor es requerido'),
  fechaEntrega: z.string().optional(),
  observaciones: z.string().optional(),
  numeroGuia: z.string().optional(),
  items: z.array(itemSchema).min(1, 'Debe incluir al menos un producto'),
});

// Función para generar número de pedido
async function generarNumeroPedido(): Promise<string> {
  const fecha = new Date();
  const year = fecha.getFullYear().toString().slice(-2);
  const month = (fecha.getMonth() + 1).toString().padStart(2, '0');
  
  const count = await prisma.pedidoCompra.count({
    where: {
      createdAt: {
        gte: new Date(fecha.getFullYear(), fecha.getMonth(), 1),
        lt: new Date(fecha.getFullYear(), fecha.getMonth() + 1, 1),
      }
    }
  });
  
  const numero = (count + 1).toString().padStart(4, '0');
  return `PC${year}${month}${numero}`;
}

// GET /api/pedidos-compra - Listar pedidos de compra
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado');
    const proveedorId = searchParams.get('proveedorId');
    const fechaDesde = searchParams.get('fechaDesde');
    const fechaHasta = searchParams.get('fechaHasta');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const where = {
      ...(estado && { estado: estado as EstadoPedido }),
      ...(proveedorId && { proveedorId }),
      ...(fechaDesde || fechaHasta) && {
        fecha: {
          ...(fechaDesde && { gte: new Date(fechaDesde) }),
          ...(fechaHasta && { lte: new Date(fechaHasta) })
        }
      }
    } as const;

    const [pedidos, total] = await Promise.all([
      prisma.pedidoCompra.findMany({
        where,
        include: {
          proveedor: { select: { id: true, nombre: true } },
          items: {
            include: {
              producto: { 
                select: { 
                  id: true, 
                  nombre: true, 
                  sku: true,
                  unidadMedida: { select: { simbolo: true } }
                } 
              }
            }
          },
          _count: { select: { movimientos: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.pedidoCompra.count({ where })
    ]);

    return NextResponse.json({ 
      success: true, 
      data: pedidos,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error al obtener pedidos de compra:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST /api/pedidos-compra - Crear nuevo pedido de compra
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = pedidoCompraSchema.parse(body);

    // Verificar que el proveedor existe
    const proveedor = await prisma.proveedor.findFirst({
      where: { id: validatedData.proveedorId, activo: true }
    });

    if (!proveedor) {
      return NextResponse.json(
        { success: false, error: 'Proveedor no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que todos los productos existen
    const productosIds = validatedData.items.map(item => item.productoId);
    const productos = await prisma.producto.findMany({
      where: { id: { in: productosIds }, activo: true }
    });

    if (productos.length !== productosIds.length) {
      return NextResponse.json(
        { success: false, error: 'Uno o más productos no fueron encontrados' },
        { status: 404 }
      );
    }

    // Calcular totales
    const subtotal = validatedData.items.reduce((sum, item) => sum + (item.cantidad * item.precio), 0);
    const impuestos = subtotal * 0.18; // IGV 18%
    const total = subtotal + impuestos;

    // Crear pedido en transacción
    const resultado = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Generar número de pedido
      const numero = await generarNumeroPedido();

      // Crear el pedido
      const pedido = await tx.pedidoCompra.create({
        data: {
          numero,
          proveedorId: validatedData.proveedorId,
          fechaEntrega: validatedData.fechaEntrega ? new Date(validatedData.fechaEntrega) : undefined,
          subtotal,
          impuestos,
          total,
          observaciones: validatedData.observaciones,
          numeroGuia: validatedData.numeroGuia,
          usuarioId: session.user.id,
        }
      });

      // Crear los items del pedido
      const items = await Promise.all(
        validatedData.items.map(item =>
          tx.pedidoCompraItem.create({
            data: {
              pedidoId: pedido.id,
              productoId: item.productoId,
              cantidad: item.cantidad,
              precio: item.precio,
              subtotal: item.cantidad * item.precio
            }
          })
        )
      );

      return { pedido, items };
    });

    // Obtener el pedido completo con relaciones
    const pedidoCompleto = await prisma.pedidoCompra.findUnique({
      where: { id: resultado.pedido.id },
      include: {
        proveedor: { select: { id: true, nombre: true } },
        items: {
          include: {
            producto: { 
              select: { 
                id: true, 
                nombre: true, 
                sku: true,
                unidadMedida: { select: { simbolo: true } }
              } 
            }
          }
        }
      }
    });

    return NextResponse.json({ 
      success: true, 
      data: pedidoCompleto,
      message: 'Pedido de compra creado exitosamente'
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error al crear pedido de compra:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
