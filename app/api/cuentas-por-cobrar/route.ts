import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { EstadoCuenta } from '@prisma/client';

// Esquema de validación para cuentas por cobrar
const cuentaPorCobrarSchema = z.object({
  clienteId: z.string().min(1, 'El cliente es requerido'),
  pedidoVentaId: z.string().optional(),
  monto: z.number().positive('El monto debe ser positivo'),
  fechaVencimiento: z.string().min(1, 'La fecha de vencimiento es requerida'),
  observaciones: z.string().optional(),
});

// Función para generar número de cuenta
async function generarNumeroCuentaCobrar(): Promise<string> {
  const fecha = new Date();
  const year = fecha.getFullYear().toString().slice(-2);
  const month = (fecha.getMonth() + 1).toString().padStart(2, '0');
  
  const count = await prisma.cuentaPorCobrar.count({
    where: {
      createdAt: {
        gte: new Date(fecha.getFullYear(), fecha.getMonth(), 1),
        lt: new Date(fecha.getFullYear(), fecha.getMonth() + 1, 1),
      }
    }
  });
  
  const numero = (count + 1).toString().padStart(4, '0');
  return `CC${year}${month}${numero}`;
}

// GET /api/cuentas-por-cobrar - Listar cuentas por cobrar
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado');
    const clienteId = searchParams.get('clienteId');
    const vencidas = searchParams.get('vencidas') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const where = {
      ...(estado && { estado: estado as EstadoCuenta }),
      ...(clienteId && { clienteId }),
      ...(vencidas && {
        fechaVencimiento: { lt: new Date() },
        estado: { in: [EstadoCuenta.PENDIENTE, EstadoCuenta.PARCIAL] }
      })
    } as const;

    const [cuentas, total] = await Promise.all([
      prisma.cuentaPorCobrar.findMany({
        where,
        include: {
          cliente: { select: { id: true, nombre: true, tipoCliente: true } },
          pedidoVenta: { select: { id: true, numero: true } },
          pagos: {
            orderBy: { fechaPago: 'desc' },
            take: 5
          }
        },
        orderBy: { fechaVencimiento: 'asc' },
        skip,
        take: limit
      }),
      prisma.cuentaPorCobrar.count({ where })
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
    console.error('Error al obtener cuentas por cobrar:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST /api/cuentas-por-cobrar - Crear nueva cuenta por cobrar
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = cuentaPorCobrarSchema.parse(body);

    // Verificar que el cliente existe
    const cliente = await prisma.cliente.findFirst({
      where: { id: validatedData.clienteId, activo: true }
    });

    if (!cliente) {
      return NextResponse.json(
        { success: false, error: 'Cliente no encontrado' },
        { status: 404 }
      );
    }

    // Verificar pedido de venta si se proporciona
    if (validatedData.pedidoVentaId) {
      const pedidoVenta = await prisma.pedidoVenta.findFirst({
        where: { 
          id: validatedData.pedidoVentaId,
          clienteId: validatedData.clienteId 
        }
      });

      if (!pedidoVenta) {
        return NextResponse.json(
          { success: false, error: 'Pedido de venta no encontrado' },
          { status: 404 }
        );
      }

      // Verificar que no exista ya una cuenta para este pedido
      const cuentaExistente = await prisma.cuentaPorCobrar.findFirst({
        where: { pedidoVentaId: validatedData.pedidoVentaId }
      });

      if (cuentaExistente) {
        return NextResponse.json(
          { success: false, error: 'Ya existe una cuenta por cobrar para este pedido' },
          { status: 400 }
        );
      }
    }

    // Crear cuenta por cobrar
    const numero = await generarNumeroCuentaCobrar();
    
    const cuenta = await prisma.cuentaPorCobrar.create({
      data: {
        numero,
        clienteId: validatedData.clienteId,
        pedidoVentaId: validatedData.pedidoVentaId,
        monto: validatedData.monto,
        saldo: validatedData.monto,
        fechaVencimiento: new Date(validatedData.fechaVencimiento),
        observaciones: validatedData.observaciones,
        usuarioId: session.user.id,
      },
      include: {
        cliente: { select: { id: true, nombre: true, tipoCliente: true } },
        pedidoVenta: { select: { id: true, numero: true } }
      }
    });

    return NextResponse.json({ 
      success: true, 
      data: cuenta,
      message: 'Cuenta por cobrar creada exitosamente'
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error al crear cuenta por cobrar:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
