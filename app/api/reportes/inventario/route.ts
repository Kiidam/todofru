import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withErrorHandling } from '../../../../src/lib/api-utils';
import { prisma } from '../../../../src/lib/prisma';
import PDFDocument from 'pdfkit';

export const dynamic = 'force-dynamic';

function toDate(d?: string | null) {
  if (!d) return undefined;
  const t = new Date(d);
  return isNaN(t.getTime()) ? undefined : t;
}

type ColDef = {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date';
};

function formatDate(v: unknown) {
  if (!v) return '';
  const d = typeof v === 'string' ? new Date(v) : v instanceof Date ? v : undefined;
  if (!d || isNaN(d.getTime())) return String(v);
  return d.toISOString().slice(0, 10);
}

function toCSVWithColumns(columns: ColDef[], rows: Array<Record<string, unknown>>) {
  const header = columns.map(c => '"' + c.label + '"').join(',');
  if (!rows.length) return header + '\n';
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return '"' + s.replace(/"/g, '""') + '"';
  };
  const lines = [header];
  for (const r of rows) {
    const line = columns.map(c => esc((r as Record<string, unknown>)[c.key] ?? ''))
      .join(',');
    lines.push(line);
  }
  return lines.join('\n') + '\n';
}

async function toPDFBuffer(title: string, columns: ColDef[], rows: Array<Record<string, unknown>>) {
  return await new Promise<Buffer>((resolve) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (d: Buffer) => chunks.push(Buffer.isBuffer(d) ? d : Buffer.from(d)));
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    doc.fontSize(16).text(title, { align: 'left' });
    doc.moveDown();

    if (!rows.length) {
      doc.fontSize(12).text('Sin datos');
      doc.end();
      return;
    }

  const headers = columns.map(c => c.label);
  const colWidths = headers.map(() => 100);
    let y = doc.y;
    const startX = doc.x;
    const lineHeight = 18;

    // Header
    headers.forEach((h, i) => {
      doc.font('Helvetica-Bold').fontSize(10).text(String(h), startX + i * 110, y, { width: colWidths[i], continued: false });
    });
    y += lineHeight;

    // Rows
    rows.forEach((r) => {
      if (y > doc.page.height - 60) {
        doc.addPage();
        y = 40;
      }
      columns.forEach((c, i) => {
        const raw = (r as Record<string, unknown>)[c.key];
        const text = c.type === 'date' ? formatDate(raw) : String(raw ?? '');
        const align = c.type === 'number' ? 'right' : 'left';
        doc.font('Helvetica').fontSize(9).text(text, startX + i * 110, y, { width: colWidths[i], continued: false, align: align as any });
      });
      y += lineHeight;
    });

    doc.end();
  });
}

export const GET = withErrorHandling(withAuth(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const from = toDate(searchParams.get('from'));
  const to = toDate(searchParams.get('to'));
  const productoId = searchParams.get('productoId') || undefined;
  const format = (searchParams.get('format') || 'json').toLowerCase();

  // Base: movimientos por producto en rango
  const where: any = {
    ...(from && { createdAt: { gte: from } }),
    ...(to && { createdAt: { lte: to } }),
    ...(productoId && { productoId }),
  };

  const movimientos = await prisma.movimientoInventario.findMany({
    where,
    include: {
      producto: true,
      pedidoCompra: { select: { id: true, numero: true } },
      pedidoVenta: { select: { id: true, numero: true } },
      usuario: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  type InventarioRow = {
    fecha: string;
    productoId: string;
    producto: string;
    tipo: string;
    cantidad: number;
    cantidadAnterior: number;
    cantidadNueva: number;
    motivo: string;
    numeroGuia: string;
    pedidoCompra: string;
    pedidoVenta: string;
    usuario: string;
  };
  const rows: InventarioRow[] = movimientos.map(m => ({
    fecha: m.createdAt.toISOString().slice(0,10),
    productoId: m.productoId,
    producto: m.producto?.nombre || '',
    tipo: m.tipo,
    cantidad: m.cantidad,
    cantidadAnterior: m.cantidadAnterior,
    cantidadNueva: m.cantidadNueva,
    motivo: m.motivo || '',
    numeroGuia: m.numeroGuia || '',
    pedidoCompra: m.pedidoCompra?.numero || '',
    pedidoVenta: m.pedidoVenta?.numero || '',
    usuario: m.usuario?.name || '',
  }));

  const columns: ColDef[] = [
    { key: 'fecha', label: 'Fecha', type: 'date' },
    { key: 'producto', label: 'Producto' },
    { key: 'tipo', label: 'Tipo' },
    { key: 'cantidad', label: 'Cantidad', type: 'number' },
    { key: 'cantidadAnterior', label: 'Cantidad Anterior', type: 'number' },
    { key: 'cantidadNueva', label: 'Cantidad Nueva', type: 'number' },
    { key: 'numeroGuia', label: 'N° Guía' },
    { key: 'pedidoCompra', label: 'Pedido Compra' },
    { key: 'pedidoVenta', label: 'Pedido Venta' },
    { key: 'usuario', label: 'Usuario' },
    { key: 'motivo', label: 'Motivo' },
  ];

  if (format === 'csv' || format === 'excel') {
    const csv = toCSVWithColumns(columns, rows as Array<Record<string, unknown>>);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="reporte_inventario.csv"',
      }
    });
  }

  if (format === 'pdf') {
    const pdf = await toPDFBuffer('Reporte de Inventario', columns, rows as Array<Record<string, unknown>>);
    const body = new Uint8Array(pdf);
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="reporte_inventario.pdf"',
      }
    });
  }

  return NextResponse.json({ success: true, data: rows });
}));
