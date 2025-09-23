import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { getProductosParaInventario, validateProductoInventarioSync } from '@/lib/producto-inventario-sync';
import { prisma } from '@/lib/prisma';

// GET /api/inventarios - Obtener productos y movimientos de inventario
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'productos';

    switch (action) {
      case 'productos':
        // Obtener productos para inventario
        try {
          const productos = await getProductosParaInventario();
          return NextResponse.json({ 
            productos,
            message: `${productos.length} productos encontrados`
          });
        } catch (productosError) {
          console.error('Error al obtener productos:', productosError);
          return NextResponse.json({ 
            productos: [],
            message: 'No se pudieron cargar los productos'
          });
        }

      case 'movimientos':
        // Obtener movimientos de inventario
        try {
          const movimientos = await prisma.movimientoInventario.findMany({
            include: {
              producto: {
                select: {
                  nombre: true,
                  sku: true
                }
              },
              usuario: {
                select: {
                  name: true
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            },
            take: 50 // Limitar a últimos 50 movimientos
          });
          
          return NextResponse.json({ 
            movimientos,
            message: `${movimientos.length} movimientos encontrados`
          });
        } catch (movimientosError) {
          console.error('Error al obtener movimientos:', movimientosError);
          return NextResponse.json({ 
            movimientos: [],
            message: 'No se pudieron cargar los movimientos'
          });
        }

      case 'sync-validation':
        // Validar sincronización producto-inventario
        const syncValidation = await validateProductoInventarioSync();
        return NextResponse.json({ syncValidation });

      case 'estadisticas':
        // Obtener estadísticas del inventario
        const totalProductos = await prisma.producto.count({
          where: { activo: true }
        });

        const productosStockBajo = await prisma.producto.count({
          where: {
            activo: true,
            stock: {
              lte: prisma.producto.fields.stockMinimo
            }
          }
        });

        const productosSinStock = await prisma.producto.count({
          where: {
            activo: true,
            stock: 0
          }
        });

        const valorTotalInventario = await prisma.producto.aggregate({
          where: { activo: true },
          _sum: {
            stock: true
          }
        });

        const estadisticas = {
          totalProductos,
          productosStockBajo,
          productosSinStock,
          valorTotalInventario: valorTotalInventario._sum.stock || 0
        };

        return NextResponse.json({ estadisticas });

      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error en API inventarios:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST /api/inventarios - Crear movimiento de inventario
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { productoId, tipo, cantidad, motivo, numeroGuia } = body;

    // Validar datos requeridos
    if (!productoId || !tipo || !cantidad) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos: productoId, tipo, cantidad' },
        { status: 400 }
      );
    }

    // Validar que el producto existe
    const producto = await prisma.producto.findUnique({
      where: { id: productoId }
    });

    if (!producto) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    // Obtener usuario
    const usuario = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!usuario) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Crear movimiento en transacción
    const result = await prisma.$transaction(async (tx) => {
      // Calcular nuevo stock
      const cantidadAnterior = producto.stock;
      let cantidadNueva;

      switch (tipo) {
        case 'ENTRADA':
          cantidadNueva = cantidadAnterior + cantidad;
          break;
        case 'SALIDA':
          cantidadNueva = Math.max(0, cantidadAnterior - cantidad);
          break;
        case 'AJUSTE':
          cantidadNueva = cantidad;
          break;
        default:
          throw new Error('Tipo de movimiento no válido');
      }

      // Crear movimiento
      const movimiento = await tx.movimientoInventario.create({
        data: {
          productoId,
          tipo,
          cantidad: tipo === 'AJUSTE' ? cantidadNueva - cantidadAnterior : cantidad,
          cantidadAnterior,
          cantidadNueva,
          motivo,
          numeroGuia,
          usuarioId: usuario.id
        },
        include: {
          producto: {
            select: {
              nombre: true,
              sku: true
            }
          },
          usuario: {
            select: {
              name: true
            }
          }
        }
      });

      // Actualizar stock del producto
      await tx.producto.update({
        where: { id: productoId },
        data: { stock: cantidadNueva }
      });

      return movimiento;
    });

    return NextResponse.json({ 
      success: true,
      movimiento: result,
      message: 'Movimiento de inventario creado exitosamente'
    });

  } catch (error) {
    console.error('Error creando movimiento:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}