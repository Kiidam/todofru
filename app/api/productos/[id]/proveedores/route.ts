/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Verificar que el producto existe
    const producto = await prisma.producto.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        activo: true
      }
    });

    if (!producto) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    if (!producto.activo) {
      return NextResponse.json(
        { error: 'Producto inactivo' },
        { status: 400 }
      );
    }

    // Obtener proveedores directamente relacionados (tabla ProductoProveedor)
    let proveedoresDirectos: unknown[] = [];
    try {
      proveedoresDirectos = await prisma.productoProveedor.findMany({
        where: {
          productoId: id,
          activo: true,
          proveedor: {
            activo: true
          }
        },
        include: {
          proveedor: {
            select: {
              id: true,
              nombre: true,
              nombres: true,
              apellidos: true,
              razonSocial: true,
              numeroIdentificacion: true,
              telefono: true,
              email: true,
              activo: true
            }
          }
        },
        orderBy: {
          proveedor: {
            nombre: 'asc'
          }
        }
      });
    } catch (error) {
      console.log('Error obteniendo proveedores directos:', error);
    }

    // Obtener proveedores históricos (de pedidos de compra)
    let proveedoresHistoricos: unknown[] = [];
    try {
      proveedoresHistoricos = await prisma.pedidoCompraItem.findMany({
        where: {
          productoId: id,
          pedido: {
            proveedor: {
              activo: true
            }
          }
        },
        include: {
          pedido: {
            include: {
              proveedor: {
                select: {
                  id: true,
                  nombre: true,
                  ruc: true,
                  numeroIdentificacion: true,
                  telefono: true,
                  email: true,
                  activo: true
                }
              }
            }
          }
        },
        distinct: ['pedidoId'],
        orderBy: {
          pedido: {
            fecha: 'desc'
          }
        }
      });
    } catch (error) {
      console.log('Error obteniendo proveedores históricos:', error);
    }

    // Combinar y deduplicar proveedores
    const proveedoresMap = new Map();

    // Agregar proveedores directos
    (proveedoresDirectos as unknown[]).forEach(ppRaw => {
      const pp = ppRaw as Record<string, unknown>;
      const proveedor = pp['proveedor'] as Record<string, unknown> | undefined;
      if (!proveedor) return;
      const provId = String(proveedor['id']);
      if (!proveedoresMap.has(provId)) {
        proveedoresMap.set(provId, {
          id: proveedor['id'],
          nombre: proveedor['razonSocial'] || `${String(proveedor['nombres'] || '')} ${String(proveedor['apellidos'] || '')}`.trim() || String(proveedor['nombre'] || 'Sin nombre'),
          razonSocial: proveedor['razonSocial'],
          numeroIdentificacion: proveedor['numeroIdentificacion'],
          telefono: proveedor['telefono'],
          email: proveedor['email'],
          activo: proveedor['activo'],
          relacion: {
            tipo: 'directo',
            precioCompra: pp['precioCompra'],
            tiempoEntrega: pp['tiempoEntrega'],
            cantidadMinima: pp['cantidadMinima'],
            fechaCreacion: pp['createdAt']
          }
        });
      }
    });

    // Agregar proveedores históricos que no estén ya incluidos
    (proveedoresHistoricos as unknown[]).forEach(pciRaw => {
      const pci = pciRaw as Record<string, unknown>;
      const pedido = pci['pedido'] as Record<string, unknown> | undefined;
      const proveedor = pedido?.['proveedor'] as Record<string, unknown> | undefined;
      if (!proveedor) return;
      const provId = String(proveedor['id']);
      if (!proveedoresMap.has(provId)) {
        proveedoresMap.set(provId, {
          id: proveedor['id'],
          nombre: proveedor['nombre'],
          ruc: proveedor['ruc'],
          numeroIdentificacion: proveedor['numeroIdentificacion'],
          telefono: proveedor['telefono'],
          email: proveedor['email'],
          activo: proveedor['activo'],
          relacion: {
            tipo: 'historico',
            ultimoPrecio: pci['precio'],
            ultimaCompra: pedido?.['fecha'],
            numeroPedido: pedido?.['numero']
          }
        });
      }
    });

    const proveedores = Array.from(proveedoresMap.values());

    // Estadísticas
    const estadisticas = {
      totalProveedores: proveedores.length,
      proveedoresDirectos: proveedoresDirectos.length,
      proveedoresHistoricos: proveedoresHistoricos.length,
      tieneRelacionesDirectas: proveedoresDirectos.length > 0
    };

    return NextResponse.json({
      success: true,
      producto: {
        id: producto.id,
        nombre: producto.nombre
      },
      proveedores,
      estadisticas
    });

  } catch (error) {
    console.error('Error al obtener proveedores del producto:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}