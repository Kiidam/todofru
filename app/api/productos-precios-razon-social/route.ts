import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';


export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productoId = searchParams.get('productoId');
    const razonSocialId = searchParams.get('razonSocialId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where = {
      activo: true,
      ...(productoId ? { productoId: { equals: productoId } } : {}),
      ...(razonSocialId ? { razonSocialId: { equals: razonSocialId } } : {})
    };

    const [precios, total] = await Promise.all([
      prisma.productoPrecioRazonSocial.findMany({
        where,
        take: limit,
        skip: offset,
        include: {
          producto: {
            select: {
              nombre: true,
              sku: true,
              precio: true // precio base
            }
          },
          razonSocial: {
            select: {
              nombre: true,
              sector: true
            }
          }
        },
        orderBy: [
          { producto: { nombre: 'asc' } },
          { razonSocial: { nombre: 'asc' } }
        ]
      }),
      prisma.productoPrecioRazonSocial.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      data: precios,
      pagination: {
        total,
        limit,
        offset,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error al obtener precios por razón social:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      productoId,
      razonSocialId,
      precio,
      precioMinimo,
      descuento,
      margen,
      vigenciaDesde,
      vigenciaHasta
    } = body;

    // Validaciones
    if (!productoId || !razonSocialId || !precio) {
      return NextResponse.json(
        { success: false, error: 'Producto, razón social y precio son requeridos' },
        { status: 400 }
      );
    }

    if (precio <= 0) {
      return NextResponse.json(
        { success: false, error: 'El precio debe ser mayor a 0' },
        { status: 400 }
      );
    }

    // Verificar si ya existe un precio para esta combinación
    const existingPrice = await prisma.productoPrecioRazonSocial.findUnique({
      where: {
        productoId_razonSocialId: {
          productoId,
          razonSocialId
        }
      }
    });

    if (existingPrice) {
      return NextResponse.json(
        { success: false, error: 'Ya existe un precio configurado para este producto y razón social' },
        { status: 400 }
      );
    }

    // Verificar que producto y razón social existan
    const [producto, razonSocial] = await Promise.all([
      prisma.producto.findUnique({ where: { id: productoId } }),
      prisma.razonSocial.findUnique({ where: { id: razonSocialId } })
    ]);

    if (!producto) {
      return NextResponse.json(
        { success: false, error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    if (!razonSocial) {
      return NextResponse.json(
        { success: false, error: 'Razón social no encontrada' },
        { status: 404 }
      );
    }

    const precioRazonSocial = await prisma.productoPrecioRazonSocial.create({
      data: {
        productoId,
        razonSocialId,
        precio: parseFloat(precio),
        precioMinimo: precioMinimo ? parseFloat(precioMinimo) : null,
        descuento: descuento ? parseFloat(descuento) : null,
        margen: margen ? parseFloat(margen) : null,
        vigenciaDesde: vigenciaDesde ? new Date(vigenciaDesde) : null,
        vigenciaHasta: vigenciaHasta ? new Date(vigenciaHasta) : null,
      },
      include: {
        producto: {
          select: {
            nombre: true,
            sku: true
          }
        },
        razonSocial: {
          select: {
            nombre: true,
            sector: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: precioRazonSocial,
      message: 'Precio por razón social creado exitosamente'
    });

  } catch (error) {
    console.error('Error al crear precio por razón social:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
