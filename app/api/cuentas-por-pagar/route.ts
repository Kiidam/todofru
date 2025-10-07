import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { EstadoCuenta } from '@prisma/client';

// Esquema de validación para cuentas por pagar
const cuentaPorPagarSchema = z.object({
  proveedorId: z.string().min(1, 'El proveedor es requerido'),
  pedidoCompraId: z.string().optional(),
  monto: z.number().positive('El monto debe ser positivo'),
  fechaVencimiento: z.string().min(1, 'La fecha de vencimiento es requerida'),
  observaciones: z.string().optional(),
});

// Función para generar número de cuenta por pagar
async function generarNumeroCuentaPagar(): Promise<string> {
  const fecha = new Date();
  const year = fecha.getFullYear().toString().slice(-2);
  const month = (fecha.getMonth() + 1).toString().padStart(2, '0');
  
  const count = await prisma.cuentaPorPagar.count({
    where: {
      createdAt: {
        gte: new Date(fecha.getFullYear(), fecha.getMonth(), 1),
        lt: new Date(fecha.getFullYear(), fecha.getMonth() + 1, 1),
      }
    }
  });
  
  const numero = (count + 1).toString().padStart(4, '0');
  return `CP${year}${month}${numero}`;
}

// GET /api/cuentas-por-pagar - Listar cuentas por pagar
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado');
    const proveedorId = searchParams.get('proveedorId');
    const vencidas = searchParams.get('vencidas') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const where = {
      ...(estado && { estado: estado as EstadoCuenta }),
      ...(proveedorId && { proveedorId }),
      ...(vencidas && {
        fechaVencimiento: { lt: new Date() },
        estado: { in: [EstadoCuenta.PENDIENTE, EstadoCuenta.PARCIAL] }
      })
    } as const;

    const [cuentas, total] = await Promise.all([
      prisma.cuentaPorPagar.findMany({
        where,
        include: {
          proveedor: { select: { id: true, nombre: true } },
          pedidoCompra: { select: { id: true, numero: true } },
          pagos: {
            orderBy: { fechaPago: 'desc' },
            take: 5
          }
        },
        orderBy: { fechaVencimiento: 'asc' },
        skip,
        take: limit
      }),
      prisma.cuentaPorPagar.count({ where })
    ]);

    return NextResponse.json({ 
      success: true, 
      data: cuentas,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error al obtener cuentas por pagar:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST /api/cuentas-por-pagar - Crear nueva cuenta por pagar
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = cuentaPorPagarSchema.parse(body);

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

    // Verificar pedido de compra si se proporciona
    if (validatedData.pedidoCompraId) {
      const pedidoCompra = await prisma.pedidoCompra.findFirst({
        where: { 
          id: validatedData.pedidoCompraId,
          proveedorId: validatedData.proveedorId 
        }
      });

      if (!pedidoCompra) {
        return NextResponse.json(
          { success: false, error: 'Pedido de compra no encontrado' },
          { status: 404 }
        );
      }

      // Verificar que no exista ya una cuenta para este pedido
      const cuentaExistente = await prisma.cuentaPorPagar.findFirst({
        where: { pedidoCompraId: validatedData.pedidoCompraId }
      });

      if (cuentaExistente) {
        return NextResponse.json(
          { success: false, error: 'Ya existe una cuenta por pagar para este pedido' },
          { status: 400 }
        );
      }
    }

    // Crear cuenta por pagar
    const numero = await generarNumeroCuentaPagar();
    
    const cuenta = await prisma.cuentaPorPagar.create({
      data: {
        numero,
        proveedorId: validatedData.proveedorId,
        pedidoCompraId: validatedData.pedidoCompraId,
        monto: validatedData.monto,
        saldo: validatedData.monto,
        fechaVencimiento: new Date(validatedData.fechaVencimiento),
        observaciones: validatedData.observaciones,
        usuarioId: session.user.id,
      },
      include: {
        proveedor: { select: { id: true, nombre: true } },
        pedidoCompra: { select: { id: true, numero: true } }
      }
    });

    return NextResponse.json({ 
      success: true, 
      data: cuenta,
      message: 'Cuenta por pagar creada exitosamente'
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error al crear cuenta por pagar:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
