import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

// Esquema de validación para pagos
const pagoSchema = z.object({
  monto: z.number().positive('El monto debe ser positivo'),
  metodoPago: z.enum(['EFECTIVO', 'TRANSFERENCIA', 'CHEQUE', 'TARJETA', 'YAPE', 'PLIN', 'OTRO']),
  numeroTransaccion: z.string().optional(),
  observaciones: z.string().optional(),
});

// POST /api/cuentas-por-cobrar/[id]/pagos - Registrar pago
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = pagoSchema.parse(body);

    // Verificar que la cuenta existe y está en estado válido
    const cuenta = await prisma.cuentaPorCobrar.findUnique({
      where: { id },
      include: {
        cliente: { select: { nombre: true } }
      }
    });

    if (!cuenta) {
      return NextResponse.json(
        { success: false, error: 'Cuenta por cobrar no encontrada' },
        { status: 404 }
      );
    }

    if (cuenta.estado === 'PAGADO') {
      return NextResponse.json(
        { success: false, error: 'La cuenta ya está pagada completamente' },
        { status: 400 }
      );
    }

    if (cuenta.estado === 'ANULADO') {
      return NextResponse.json(
        { success: false, error: 'No se puede registrar pagos en una cuenta anulada' },
        { status: 400 }
      );
    }

    // Verificar que el monto no exceda el saldo pendiente
    if (validatedData.monto > cuenta.saldo) {
      return NextResponse.json(
        { success: false, error: 'El monto del pago no puede exceder el saldo pendiente' },
        { status: 400 }
      );
    }

    // Registrar pago y actualizar cuenta en transacción
    const resultado = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Crear el pago
      const pago = await tx.pagoCuentaPorCobrar.create({
        data: {
          cuentaPorCobrarId: id,
          monto: validatedData.monto,
          metodoPago: validatedData.metodoPago,
          numeroTransaccion: validatedData.numeroTransaccion,
          observaciones: validatedData.observaciones,
          usuarioId: session.user.id,
        }
      });

      // Calcular nuevo saldo y estado
      const nuevoMontoAbonado = cuenta.montoAbonado + validatedData.monto;
      const nuevoSaldo = cuenta.monto - nuevoMontoAbonado;
      
      let nuevoEstado: 'PENDIENTE' | 'PARCIAL' | 'PAGADO' = 'PENDIENTE';
      if (nuevoSaldo === 0) {
        nuevoEstado = 'PAGADO';
      } else if (nuevoMontoAbonado > 0) {
        nuevoEstado = 'PARCIAL';
      }

      // Actualizar la cuenta
      const cuentaActualizada = await tx.cuentaPorCobrar.update({
        where: { id },
        data: {
          montoAbonado: nuevoMontoAbonado,
          saldo: nuevoSaldo,
          estado: nuevoEstado
        }
      });

      return { pago, cuenta: cuentaActualizada };
    });

    // Obtener la cuenta actualizada con sus relaciones
    const cuentaCompleta = await prisma.cuentaPorCobrar.findUnique({
      where: { id },
      include: {
        cliente: { select: { id: true, nombre: true, tipoCliente: true } },
        pedidoVenta: { select: { id: true, numero: true } },
        pagos: {
          orderBy: { fechaPago: 'desc' },
          include: {
            usuario: { select: { name: true } }
          }
        }
      }
    });

    return NextResponse.json({ 
      success: true, 
      data: cuentaCompleta,
      message: 'Pago registrado exitosamente'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error al registrar pago:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
