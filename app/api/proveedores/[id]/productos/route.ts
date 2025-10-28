/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface WhereConditions {
  proveedorId: string;
  activo?: boolean;
  producto?: {
    activo?: boolean;
    OR?: Array<{
      nombre?: { contains: string };
      sku?: { contains: string };
      descripcion?: { contains: string };
    }>;
  };
}

export async function GET(request: NextRequest, context: unknown) {
  // context.params can be a Promise or an object depending on Next internals
  const rawParams = (context as Record<string, unknown>)?.params ?? {};
  const paramsResolved = typeof rawParams === 'object' && 'then' in rawParams ? await (rawParams as Promise<Record<string, unknown>>) : rawParams as Record<string, unknown>;
  const { id } = paramsResolved as { id?: string };
  try {
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Id de proveedor inválido' }, { status: 400 });
    }
    // use id from paramsResolved
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
    const whereConditions: WhereConditions = {
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

  let productosDirectos: unknown[] = [];
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
    let productosHistoricos: unknown[] = [];
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
      (productosDirectos as unknown[]).forEach(ppRaw => {
        const pp = ppRaw as Record<string, unknown>;
        const producto = pp['producto'] as Record<string, unknown> | undefined;
        if (!producto) return;
        productosMap.set(String(producto['id']), {
          id: producto['id'],
          nombre: producto['nombre'],
          sku: producto['sku'],
          descripcion: producto['descripcion'],
          precio: producto['precio'],
          stock: producto['stock'],
          stockMinimo: producto['stockMinimo'],
          activo: producto['activo'],
          categoria: producto['categoria'],
          unidadMedida: producto['unidadMedida'],
          // Información de la relación directa
          relacion: {
            tipo: 'directo',
            precioCompra: pp['precioCompra'],
            tiempoEntrega: pp['tiempoEntrega'],
            cantidadMinima: pp['cantidadMinima'],
            fechaCreacion: pp['createdAt'],
            activo: pp['activo']
          }
        });
      });
    }

    // Agregar productos históricos que no estén ya en la relación directa
    (productosHistoricos as unknown[]).forEach(pciRaw => {
      const pci = pciRaw as Record<string, unknown>;
      const producto = pci['producto'] as Record<string, unknown> | undefined;
      if (!producto) return;
      const prodId = String(producto['id']);
      if (!productosMap.has(prodId)) {
        const pedido = pci['pedido'] as Record<string, unknown> | undefined;
        productosMap.set(prodId, {
          id: producto['id'],
          nombre: producto['nombre'],
          sku: producto['sku'],
          descripcion: producto['descripcion'],
          precio: producto['precio'],
          stock: producto['stock'],
          stockMinimo: producto['stockMinimo'],
          activo: producto['activo'],
          categoria: producto['categoria'],
          unidadMedida: producto['unidadMedida'],
          // Información de la relación histórica
          relacion: {
            tipo: 'historico',
            ultimoPrecio: pci['precio'],
            ultimaCompra: pedido?.['fecha'],
            numeroPedido: pedido?.['numero']
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

  } catch (error: unknown) {
    console.error('Error al obtener productos del proveedor:', error);
    
    // Manejo específico de errores de Prisma
  const e = error as any;
  if (e?.code === 'P2025') {
      return NextResponse.json(
        { error: 'Proveedor no encontrado' },
        { status: 404 }
      );
    }

  if (e?.code === 'P2021') {
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