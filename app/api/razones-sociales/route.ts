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
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search') || '';
    const activo = searchParams.get('activo');

    const where: any = {};
    
    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { ruc: { contains: search, mode: 'insensitive' } },
        { sector: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (activo !== null && activo !== '') {
      where.activo = activo === 'true';
    }

    const [razonesSociales, total] = await Promise.all([
      prisma.razonSocial.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { nombre: 'asc' },
        include: {
          _count: {
            select: {
              preciosProductos: true,
              pedidosVenta: true,
              cuentasPorCobrar: true
            }
          }
        }
      }),
      prisma.razonSocial.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      data: razonesSociales,
      pagination: {
        total,
        limit,
        offset,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error al obtener razones sociales:', error);
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
      nombre, 
      ruc, 
      direccion, 
      telefono, 
      email, 
      website, 
      tipoEmpresa, 
      sector, 
      descripcion 
    } = body;

    // Validaciones
    if (!nombre) {
      return NextResponse.json(
        { success: false, error: 'El nombre es requerido' },
        { status: 400 }
      );
    }

    // Verificar si ya existe una razón social con el mismo nombre
    const existingByName = await prisma.razonSocial.findUnique({
      where: { nombre }
    });

    if (existingByName) {
      return NextResponse.json(
        { success: false, error: 'Ya existe una razón social con este nombre' },
        { status: 400 }
      );
    }

    // Verificar RUC si se proporciona
    if (ruc) {
      const existingByRuc = await prisma.razonSocial.findUnique({
        where: { ruc }
      });

      if (existingByRuc) {
        return NextResponse.json(
          { success: false, error: 'Ya existe una razón social con este RUC' },
          { status: 400 }
        );
      }
    }

    const razonSocial = await prisma.razonSocial.create({
      data: {
        nombre,
        ruc: ruc || null,
        direccion: direccion || null,
        telefono: telefono || null,
        email: email || null,
        website: website || null,
        tipoEmpresa: tipoEmpresa || 'COMPANY',
        sector: sector || null,
        descripcion: descripcion || null,
      }
    });

    return NextResponse.json({
      success: true,
      data: razonSocial,
      message: 'Razón social creada exitosamente'
    });

  } catch (error) {
    console.error('Error al crear razón social:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
