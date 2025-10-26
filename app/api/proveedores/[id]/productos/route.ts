import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Construir filtros de búsqueda para ProductoProveedor
    const whereConditions: any = {
      proveedorId: id
    };

    // Filtros para la relación ProductoProveedor
    if (!includeInactive) {
      whereConditions.activo = true;
      whereConditions.producto = {
        activo: true
      };
    }

    // Filtros de búsqueda en el producto
    if (search) {
      whereConditions.producto = {
        ...whereConditions.producto,
        OR: [
          { nombre: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { descripcion: { contains: search, mode: 'insensitive' } }
        ]
      };
    }

    // Filtro por categoría
    if (categoria) {
      whereConditions.producto = {
        ...whereConditions.producto,
        categoriaId: categoria
      };
    }

    // Filtro por disponibilidad (stock)
    if (disponible !== undefined) {
      whereConditions.producto = {
        ...whereConditions.producto,
        stock: disponible ? { gt: 0 } : { lte: 0 }
      };
    }

    let productosDirectos: any[] = [];
    let hasDirectRelations = false;

    // Intentar obtener productos directamente relacionados (nueva tabla ProductoProveedor)
    try {
      // Validar campo de ordenamiento
      const validSortFields = ['nombre', 'sku', 'precio', 'stock', 'createdAt'];
      const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'nombre';
      const safeSortOrder = sortOrder === 'desc' ? 'desc' : 'asc';

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
            [safeSortBy]: safeSortOrder
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
      // Construir filtros para productos históricos
       const historicalWhere: any = {
         pedidoCompra: {
           proveedorId: id
         }
       };

      // Aplicar filtros de búsqueda
      if (search || categoria || disponible !== undefined || !includeInactive) {
        historicalWhere.producto = {};
        
        if (search) {
          historicalWhere.producto.OR = [
            { nombre: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } },
            { descripcion: { contains: search, mode: 'insensitive' } }
          ];
        }
        
        if (categoria) {
          historicalWhere.producto.categoriaId = categoria;
        }
        
        if (disponible !== undefined) {
          historicalWhere.producto.stock = disponible ? { gt: 0 } : { lte: 0 };
        }
        
        if (!includeInactive) {
          historicalWhere.producto.activo = true;
        }
      }

      productosHistoricos = await prisma.pedidoCompraItem.findMany({
        where: historicalWhere,
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
          producto: {
            [safeSortBy]: safeSortOrder
          }
        },
        skip,
        take: limit
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

    // Contar total de productos
    let total = 0;

    if (hasDirectRelations) {
      try {
        total = await prisma.productoProveedor.count({
          where: whereConditions
        });
      } catch (error) {
        console.log('Error contando productos directos:', error);
        total = productosDirectos.length;
      }
    } else {
      try {
        // Usar los mismos filtros que para la consulta histórica
         const historicalCountWhere: any = {
           pedidoCompra: {
             proveedorId: id
           }
         };

        if (search || categoria || disponible !== undefined || !includeInactive) {
          historicalCountWhere.producto = {};
          
          if (search) {
            historicalCountWhere.producto.OR = [
              { nombre: { contains: search, mode: 'insensitive' } },
              { sku: { contains: search, mode: 'insensitive' } },
              { descripcion: { contains: search, mode: 'insensitive' } }
            ];
          }
          
          if (categoria) {
            historicalCountWhere.producto.categoriaId = categoria;
          }
          
          if (disponible !== undefined) {
            historicalCountWhere.producto.stock = disponible ? { gt: 0 } : { lte: 0 };
          }
          
          if (!includeInactive) {
            historicalCountWhere.producto.activo = true;
          }
        }

        // Contar productos únicos en el historial
        const uniqueProductIds = await prisma.pedidoCompraItem.findMany({
          where: historicalCountWhere,
          select: {
            productoId: true
          },
          distinct: ['productoId']
        });
        
        total = uniqueProductIds.length;
      } catch (error) {
        console.log('Error contando productos históricos:', error instanceof Error ? error.message : 'Error desconocido');
        total = productosHistoricos.length;
      }
    }
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
        { 
          success: false,
          error: 'Proveedor no encontrado',
          code: 'PROVEEDOR_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    if (error?.code === 'P2021') {
      return NextResponse.json(
        { 
          success: false,
          error: 'La tabla no existe. Ejecute las migraciones de base de datos.',
          code: 'TABLE_NOT_EXISTS'
        },
        { status: 500 }
      );
    }

    if (error?.code === 'P2002') {
      return NextResponse.json(
        { 
          success: false,
          error: 'Conflicto de datos únicos',
          code: 'UNIQUE_CONSTRAINT_VIOLATION'
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { 
        success: false,
        error: 'Error interno del servidor',
        code: 'INTERNAL_SERVER_ERROR',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Error desconocido') : undefined
      },
      { status: 500 }
    );
  }
}