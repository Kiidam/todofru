import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    
    // Parámetros de consulta
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const sortBy = searchParams.get('sortBy') || 'nombre';
    const sortOrder = searchParams.get('sortOrder') || 'asc';
    const categoria = searchParams.get('categoria') || '';
    const disponible = searchParams.get('disponible') === 'true' ? true : 
                      searchParams.get('disponible') === 'false' ? false : undefined;
    
    const skip = (page - 1) * limit;

    // Verificar que el proveedor existe
    const proveedor = await prisma.proveedor.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        nombres: true,
        apellidos: true,
        razonSocial: true,
        activo: true
      }
    });

    if (!proveedor) {
      return NextResponse.json(
        { error: 'Proveedor no encontrado' },
        { status: 404 }
      );
    }

    // Construir el nombre del proveedor si no existe
    if (!proveedor.nombre) {
      proveedor.nombre = proveedor.razonSocial || 
        `${proveedor.nombres || ''} ${proveedor.apellidos || ''}`.trim() || 
        'Sin nombre';
    }

    // Construir filtros de búsqueda
    const whereConditions: any = {
      proveedorId: id
    };

    if (!includeInactive) {
      whereConditions.activo = true;
      whereConditions.producto = {
        activo: true
      };
    }

    if (search) {
      whereConditions.producto = {
        ...whereConditions.producto,
        OR: [
          { nombre: { contains: search } },
          { sku: { contains: search } },
          { descripcion: { contains: search } }
        ]
      };
    }

    let productosDirectos: any[] = [];
    let hasDirectRelations = false;

    // Intentar obtener productos directamente relacionados (nueva tabla ProductoProveedor)
    try {
      productosDirectos = await prisma.productoProveedor.findMany({
        where: whereConditions,
        include: {
          producto: {
            include: {
              categoria: true,
              unidadMedida: true
            }
          }
        },
        orderBy: {
          producto: {
            [sortBy]: sortOrder as 'asc' | 'desc'
          }
        },
        skip,
        take: limit
      });
      hasDirectRelations = true;
      console.log(`Productos directos encontrados: ${productosDirectos.length}`);
    } catch (error) {
      // Si la tabla ProductoProveedor no existe o hay error, continuar con el método histórico
      console.log('Error en productos directos, usando método histórico:', error instanceof Error ? error.message : 'Error desconocido');
      hasDirectRelations = false;
    }

    // Obtener productos de pedidos de compra (relación histórica)
    let productosHistoricos: any[] = [];
    try {
      productosHistoricos = await prisma.pedidoCompraItem.findMany({
        where: {
          pedido: {
            proveedorId: id
          },
          ...(search && {
            producto: {
              OR: [
                { nombre: { contains: search } },
                { sku: { contains: search } }
              ]
            }
          }),
          ...(categoria && {
            producto: {
              categoriaId: categoria
            }
          }),
          ...(disponible !== undefined && {
            producto: {
              stock: disponible ? { gt: 0 } : { lte: 0 }
            }
          })
        },
        include: {
          producto: {
            include: {
              categoria: true,
              unidadMedida: true
            }
          },
          pedido: true
        },
        orderBy: {
          id: 'desc'
        }
      });
      console.log(`Productos históricos encontrados: ${productosHistoricos.length}`);
    } catch (error) {
      console.log('Error obteniendo productos históricos:', error instanceof Error ? error.message : 'Error desconocido');
      productosHistoricos = [];
    }

    // Combinar y formatear resultados
    const productosMap = new Map();

    // Agregar productos directos si están disponibles
    if (hasDirectRelations) {
      productosDirectos.forEach(pp => {
        const producto = pp.producto;
        productosMap.set(producto.id, {
          id: producto.id,
          nombre: producto.nombre,
          sku: producto.sku,
          descripcion: producto.descripcion,
          precio: producto.precio,
          stock: producto.stock,
          stockMinimo: producto.stockMinimo,
          activo: producto.activo,
          categoria: producto.categoria,
          unidadMedida: producto.unidadMedida,
          // Información de la relación directa
          relacion: {
            tipo: 'directo',
            precioCompra: pp.precioCompra,
            tiempoEntrega: pp.tiempoEntrega,
            cantidadMinima: pp.cantidadMinima,
            fechaCreacion: pp.createdAt,
            activo: pp.activo
          }
        });
      });
    }

    // Agregar productos históricos que no estén ya en la relación directa
    productosHistoricos.forEach(pci => {
      const producto = pci.producto;
      if (!productosMap.has(producto.id)) {
        productosMap.set(producto.id, {
          id: producto.id,
          nombre: producto.nombre,
          sku: producto.sku,
          descripcion: producto.descripcion,
          precio: producto.precio,
          stock: producto.stock,
          stockMinimo: producto.stockMinimo,
          activo: producto.activo,
          categoria: producto.categoria,
          unidadMedida: producto.unidadMedida,
          // Información de la relación histórica
          relacion: {
            tipo: 'historico',
            ultimoPrecio: pci.precio,
            ultimaCompra: pci.pedido.fecha,
            numeroPedido: pci.pedido.numero
          }
        });
      }
    });

    const productos = Array.from(productosMap.values());

    // Contar total para paginación
    let totalDirectos = 0;
    if (hasDirectRelations) {
      try {
        totalDirectos = await prisma.productoProveedor.count({
          where: whereConditions
        });
      } catch (error) {
        totalDirectos = 0;
      }
    }

    let totalHistoricos = 0;
    try {
      totalHistoricos = await prisma.pedidoCompraItem.count({
        where: {
          pedido: {
            proveedorId: id
          },
          ...(search && {
            producto: {
              OR: [
                { nombre: { contains: search } },
                { sku: { contains: search } }
              ]
            }
          }),
          ...(categoria && {
            producto: {
              categoriaId: categoria
            }
          }),
          ...(disponible !== undefined && {
            producto: {
              stock: disponible ? { gt: 0 } : { lte: 0 }
            }
          })
        }
      });
    } catch (error) {
      console.log('Error contando productos históricos:', error instanceof Error ? error.message : 'Error desconocido');
      totalHistoricos = 0;
    }

    const total = Math.max(totalDirectos, totalHistoricos);
    const totalPages = Math.ceil(total / limit);

    // Estadísticas adicionales
    const estadisticas = {
      totalProductos: productos.length,
      productosDirectos: productosDirectos.length,
      productosHistoricos: productosHistoricos.length,
      productosActivos: productos.filter(p => p.activo).length,
      valorInventario: productos.reduce((sum, p) => sum + (p.precio * p.stock), 0),
      tieneRelacionesDirectas: hasDirectRelations
    };

    return NextResponse.json({
      success: true,
      proveedor: {
        id: proveedor.id,
        nombre: proveedor.nombre,
        activo: proveedor.activo
      },
      productos,
      estadisticas,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      filters: {
        search,
        includeInactive,
        sortBy,
        sortOrder
      }
    });

  } catch (error: any) {
    console.error('Error al obtener productos del proveedor:', error);
    
    // Manejo específico de errores de Prisma
    if (error?.code === 'P2025') {
      return NextResponse.json(
        { error: 'Proveedor no encontrado' },
        { status: 404 }
      );
    }

    if (error?.code === 'P2021') {
      return NextResponse.json(
        { error: 'La tabla no existe. Ejecute las migraciones de base de datos.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Error desconocido') : undefined
      },
      { status: 500 }
    );
  }
}