import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withErrorHandling, successResponse, errorResponse } from '@/lib/api-utils';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export const POST = withErrorHandling(withAuth(async (req: NextRequest) => {
  const body = await req.json().catch(() => ({}));
  const { compraId, tipo = 'BOLETA' } = body;

  if (!compraId) {
    return errorResponse('Número de orden requerido', 400);
  }

  // Obtener datos de la compra por numero
  const compra = await prisma.pedidoCompra.findFirst({
    where: { numero: compraId },
    include: {
      proveedor: true,
      items: {
        include: {
          producto: {
            include: {
              unidadMedida: true
            }
          }
        }
      }
    }
  });

  if (!compra) {
    return errorResponse('Compra no encontrada', 404);
  }

  // Calcular totales
  const subtotal = compra.items.reduce((sum: number, item: any) => {
    return sum + (item.cantidad * item.precio);
  }, 0);

  const igv = subtotal * 0.18;
  const total = subtotal + igv;

  // Generar número correlativo
  const prefix = tipo === 'BOLETA' ? 'BC' : 'FC'; // BC = Boleta Compra, FC = Factura Compra
  const serie = '001';
  
  const ultimoNumero = await prisma.$queryRaw<Array<{ numero: number }>>`
    SELECT CAST(SUBSTRING_INDEX(numero, '-', -1) AS UNSIGNED) as numero
    FROM pedidocompra
    WHERE numero LIKE CONCAT(${prefix}, ${serie}, '-%')
    ORDER BY numero DESC
    LIMIT 1
  `;

  const siguienteNumero = (ultimoNumero[0]?.numero || 0) + 1;
  const numeroDocumento = `${prefix}${serie}-${String(siguienteNumero).padStart(8, '0')}`;

  // Datos del emisor (empresa)
  const emisor = {
    ruc: process.env.EMPRESA_RUC || '20123456789',
    razonSocial: process.env.EMPRESA_RAZON_SOCIAL || 'TU EMPRESA S.A.C.',
    direccion: process.env.EMPRESA_DIRECCION || 'Av. Principal 123, Lima, Perú',
    telefono: process.env.EMPRESA_TELEFONO,
    email: process.env.EMPRESA_EMAIL
  };

  // Datos del proveedor
  const proveedor = {
    tipoDocumento: compra.proveedor.ruc ? 'RUC' : 'DNI',
    numeroDocumento: compra.proveedor.ruc || compra.proveedor.dni || 'N/A',
    nombre: compra.proveedor.nombre,
    direccion: compra.proveedor.direccion || 'Sin dirección'
  };

  // Items
  const items = compra.items.map((item: any) => ({
    cantidad: item.cantidad,
    unidad: item.producto.unidadMedida?.abreviacion || 'und',
    descripcion: item.producto.nombre,
    precioUnitario: Number(item.precio).toFixed(2),
    subtotal: Number(item.cantidad * item.precio).toFixed(2)
  }));

  // Totales
  const totales = {
    subtotal: subtotal.toFixed(2),
    igv: igv.toFixed(2),
    total: total.toFixed(2),
    moneda: 'PEN'
  };

  // Fecha formateada
  const fechaEmision = new Date(compra.fecha).toLocaleDateString('es-PE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  return successResponse({
    tipo,
    numero: numeroDocumento,
    fecha: fechaEmision,
    emisor,
    proveedor,
    items,
    totales,
    condicionesPago: 'CONTADO',
    formaPago: 'EFECTIVO'
  });
}));
