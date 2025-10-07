import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';

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
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validated = createOrderSchema.parse(body);

    // Delegar al endpoint oficial de pedidos-venta para mantener la lógica existente
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/pedidos-venta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validated),
    });

    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error en createOrder:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}