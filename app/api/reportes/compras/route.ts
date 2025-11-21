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
  label: string; // For PDF header (human-friendly)
  csvLabel?: string; // Optional CSV header label (defaults to label without currency symbols)
  type?: 'text' | 'number' | 'currency' | 'date';
};

function formatCurrency(n: unknown) {
  const num = typeof n === 'number' ? n : Number(n);
  if (!isFinite(num)) return '';
  return `S/ ${num.toFixed(2)}`;
}

function formatDate(v: unknown) {
  if (!v) return '';
  const d = typeof v === 'string' ? new Date(v) : v instanceof Date ? v : undefined;
  if (!d || isNaN(d.getTime())) return String(v);
  return d.toISOString().slice(0, 10);
}

function toCSVWithColumns(columns: ColDef[], rows: Array<Record<string, unknown>>) {
  const header = columns.map(c => '"' + (c.csvLabel || c.label.replace(/\s*\(S\/\)\s*/g, '')) + '"').join(',');
  if (!rows.length) return header + '\n';
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return '"' + s.replace(/"/g, '""') + '"';
  };
  const lines = [header];
  for (const r of rows) {
    const line = columns.map(c => {
      const raw = (r as Record<string, unknown>)[c.key];
      return esc(raw ?? '');
    }).join(',');
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
        let text: string = '';
        if (c.type === 'currency') text = formatCurrency(raw);
        else if (c.type === 'date') text = formatDate(raw);
        else text = String(raw ?? '');
        const align = c.type === 'number' || c.type === 'currency' ? 'right' : 'left';
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
  const usuarioId = searchParams.get('usuarioId') || undefined;
  const proveedorId = searchParams.get('proveedorId') || undefined;
  const format = (searchParams.get('format') || 'json').toLowerCase();

  const where: any = {
    ...(from && { fecha: { gte: from } }),
    ...(to && { fecha: { lte: to } }),
    ...(usuarioId && { usuarioId }),
    ...(proveedorId && { proveedorId }),
  };

  const compras = await prisma.pedidoCompra.findMany({
    where,
    include: {
      items: productoId ? { where: { productoId }, include: { producto: true } } : { include: { producto: true } },
      proveedor: true,
      usuario: { select: { id: true, name: true, email: true } },
    },
    orderBy: { fecha: 'desc' },
  });

  type CompraRow = {
    compraId: string;
    numero: string;
    fecha: string;
    proveedor: string;
    usuario: string;
    productoId: string;
    producto: string;
    cantidad: number;
    precio: number;
    subtotal: number;
    totalCompra: number;
    motivo: string;
  };
  const rows: CompraRow[] = compras.flatMap(p => p.items.map(it => ({
    compraId: p.id,
    numero: p.numero,
    fecha: p.fecha.toISOString().slice(0,10),
    proveedor: p.proveedor?.nombre || '',
    usuario: p.usuario?.name || '',
    productoId: it.productoId,
    producto: it.producto?.nombre || '',
    cantidad: it.cantidad,
    precio: it.precio,
    subtotal: it.subtotal,
    totalCompra: p.total,
    motivo: p.observaciones || '',
  })));

  const columns: ColDef[] = [
    { key: 'numero', label: 'Número' },
    { key: 'fecha', label: 'Fecha', type: 'date' },
    { key: 'proveedor', label: 'Proveedor' },
    { key: 'usuario', label: 'Usuario' },
    { key: 'producto', label: 'Producto' },
    { key: 'cantidad', label: 'Cantidad', type: 'number' },
    { key: 'precio', label: 'Precio (S/)', csvLabel: 'Precio', type: 'currency' },
    { key: 'subtotal', label: 'Subtotal (S/)', csvLabel: 'Subtotal', type: 'currency' },
    { key: 'totalCompra', label: 'Total (S/)', csvLabel: 'Total', type: 'currency' },
    { key: 'motivo', label: 'Motivo' },
  ];

  if (format === 'csv' || format === 'excel') {
    const csv = toCSVWithColumns(columns, rows as Array<Record<string, unknown>>);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="reporte_compras.csv"',
      }
    });
  }

  if (format === 'pdf') {
    const pdf = await toPDFBuffer('Reporte de Compras', columns, rows as Array<Record<string, unknown>>);
    const body = new Uint8Array(pdf);
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="reporte_compras.pdf"',
      }
    });
  }

  return NextResponse.json({ success: true, data: rows });
}));
