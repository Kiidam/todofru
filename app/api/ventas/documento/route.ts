import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withErrorHandling, successResponse, errorResponse } from '@/lib/api-utils';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Formato SUNAT para Boleta de Venta
// Resolución de Superintendencia N° 097-2012/SUNAT

export const POST = withErrorHandling(withAuth(async (req: NextRequest) => {
  const body = await req.json().catch(() => ({}));
  const { pedidoId, tipo = 'BOLETA' } = body;

  if (!pedidoId) {
    return errorResponse('Número de pedido requerido', 400);
  }

  // Obtener datos del pedido por numero
  const pedido = await prisma.pedidoVenta.findFirst({
    where: { numero: pedidoId },
    include: {
      cliente: true,
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

  if (!pedido) {
    return errorResponse('Pedido no encontrado', 404);
  }

  // Calcular totales
  const subtotal = pedido.items.reduce((sum: number, item: any) => {
    return sum + (item.cantidad * item.precio);
  }, 0);

  const igv = subtotal * 0.18; // 18% IGV
  const total = subtotal + igv;

  // Generar número correlativo (formato: B001-00000001 para boleta, F001-00000001 para factura)
  const prefix = tipo === 'BOLETA' ? 'B' : 'F';
  const serie = '001';
  
  // Obtener último número de esta serie - simplificado
  const timestamp = Date.now();
  const numeroDocumento = `${prefix}${serie}-${String(timestamp).slice(-8)}`;

  // Generar datos del documento
  const documento = {
    tipo,
    numero: numeroDocumento,
    fecha: new Date().toLocaleString('es-PE', { 
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone: 'America/Lima'
    }),
    
    // Datos del emisor (tu empresa)
    emisor: {
      ruc: process.env.EMPRESA_RUC || '20123456789',
      razonSocial: process.env.EMPRESA_RAZON_SOCIAL || 'TU EMPRESA S.A.C.',
      direccion: process.env.EMPRESA_DIRECCION || 'Av. Principal 123, Lima',
      telefono: process.env.EMPRESA_TELEFONO || '(01) 123-4567',
      email: process.env.EMPRESA_EMAIL || 'ventas@tuempresa.com'
    },

    // Datos del cliente
    cliente: {
      tipoDocumento: pedido.cliente.numeroIdentificacion?.length === 8 ? 'DNI' : 'RUC',
      numeroDocumento: pedido.cliente.numeroIdentificacion || pedido.cliente.ruc || 'SIN DOCUMENTO',
      nombre: pedido.cliente.tipoEntidad === 'PERSONA_JURIDICA' 
        ? (pedido.cliente.razonSocial || pedido.cliente.nombre)
        : pedido.cliente.nombres && pedido.cliente.apellidos
          ? `${pedido.cliente.nombres} ${pedido.cliente.apellidos}`
          : pedido.cliente.nombre,
      direccion: pedido.cliente.direccion || 'NO ESPECIFICADA'
    },

    // Detalle de productos
    items: pedido.items.map((item: any) => ({
      cantidad: item.cantidad,
      unidad: item.producto.unidadMedida?.simbolo || 'UND',
      descripcion: item.producto.nombre,
      precioUnitario: item.precio.toFixed(2),
      subtotal: (item.cantidad * item.precio).toFixed(2)
    })),

    // Totales
    totales: {
      subtotal: subtotal.toFixed(2),
      igv: igv.toFixed(2),
      total: total.toFixed(2),
      moneda: 'PEN' // Soles peruanos
    },

    // Información adicional
    observaciones: '',
    condicionesPago: 'CONTADO',
    formaPago: 'EFECTIVO'
  };

  return successResponse(documento);
}));
