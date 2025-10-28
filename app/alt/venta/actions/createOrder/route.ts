/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '../../../../../src/lib/nextauth';
import { z } from 'zod';
import { prisma } from '../../../../../src/lib/prisma';
import type { PrismaClient } from '@prisma/client';

const itemSchema = z.object({
  productoId: z.string().min(1),
  cantidad: z.number().positive(),
  precio: z.number().min(0),
});

const createOrderSchema = z.object({
  clienteId: z.string().min(1),
  items: z.array(itemSchema).min(1),
});

export async function POST(request: NextRequest) {
  try {
  const session = await getServerSession(authOptions as any);
  if (!(session as any)?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validated = createOrderSchema.parse(body);
    
    // Validar cliente
    const cliente = await prisma.cliente.findUnique({
      where: { id: validated.clienteId },
    });

    if (!cliente) {
      return NextResponse.json({ success: false, error: 'Cliente no encontrado' }, { status: 404 });
    }

    // Validar productos y stock
    for (const item of validated.items) {
      const producto = await prisma.producto.findUnique({
        where: { id: item.productoId },
      });

      if (!producto) {
        return NextResponse.json(
          { success: false, error: `Producto ${item.productoId} no encontrado` },
          { status: 404 }
        );
      }

      if (producto.stock < item.cantidad) {
        return NextResponse.json(
          { success: false, error: `Stock insuficiente para ${producto.nombre}` },
          { status: 400 }
        );
      }
    }

    // Obtener usuarioId
    const usuarioId = (session as any)?.user?.id;
    
    // Crear el pedido con transacción
    const result = await prisma.$transaction(async (tx) => {
      const total = validated.items.reduce((sum, it) => sum + it.cantidad * it.precio, 0);

      // Generar número único de pedido
      const count = await tx.pedidoVenta.count();
      const numero = `PV-${String(count + 1).padStart(5, '0')}`;

      const pedido = await tx.pedidoVenta.create({
        data: {
          id: `pv_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          numero,
          clienteId: validated.clienteId,
          fecha: new Date(),
          total,
          subtotal: total / 1.18,
          impuestos: total - (total / 1.18),
          estado: 'PENDIENTE',
          usuarioId,
        },
      });

      // Crear items del pedido
      for (const item of validated.items) {
        await tx.pedidoVentaItem.create({
          data: {
            id: `pvi_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            pedidoId: pedido.id,
            productoId: item.productoId,
            cantidad: item.cantidad,
            precio: item.precio,
            subtotal: item.cantidad * item.precio,
          },
        });

        // Actualizar stock
        const prod = await tx.producto.findUnique({ where: { id: item.productoId } });
        if (!prod) throw new Error('Producto no encontrado');
        
        const antes = prod.stock;
        const despues = Number((antes - item.cantidad).toFixed(4));

        await tx.producto.update({
          where: { id: item.productoId },
          data: { stock: despues },
        });

        // Crear movimiento de inventario
        await tx.movimientoInventario.create({
          data: {
            productoId: item.productoId,
            tipo: 'SALIDA',
            cantidad: item.cantidad,
            cantidadAnterior: antes,
            cantidadNueva: despues,
            precio: item.precio,
            motivo: 'Venta',
            pedidoVentaId: pedido.id,
            usuarioId,
          },
        });
      }

      return pedido;
    });

    return NextResponse.json({
      success: true,
      data: {
        id: result.id,
        numero: result.numero,
        numeroPedido: result.numero,
        total: result.total,
      },
      message: 'Pedido de venta creado exitosamente',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error en createOrder:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error interno del servidor' },
      { status: 500 }
    );
  }
}