'use client';

import React, { useRef } from 'react';
import { Download } from 'lucide-react';

interface DocumentoSUNATProps {
  tipo: 'BOLETA' | 'FACTURA';
  numero: string;
  fecha: string;
  emisor: {
    ruc: string;
    razonSocial: string;
    direccion: string;
    telefono?: string;
    email?: string;
  };
  cliente: {
    tipoDocumento: string;
    numeroDocumento: string;
    nombre: string;
    direccion: string;
  };
  items: Array<{
    cantidad: number;
    unidad: string;
    descripcion: string;
    precioUnitario: string;
    subtotal: string;
  }>;
  totales: {
    subtotal: string;
    igv: string;
    total: string;
    moneda: string;
  };
  observaciones?: string;
  condicionesPago?: string;
  formaPago?: string;
}

export default function DocumentoSUNAT({
  tipo,
  numero,
  fecha,
  emisor,
  cliente,
  items,
  totales,
  observaciones,
  condicionesPago = 'CONTADO',
  formaPago = 'EFECTIVO'
}: DocumentoSUNATProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    const element = printRef.current;
    if (!element) return;

    // Crear una nueva ventana con el contenido del documento
    const newWindow = window.open('', '_blank');
    if (!newWindow) {
      alert('Por favor, permita ventanas emergentes para descargar el PDF');
      return;
    }

    // Crear el HTML completo para la nueva ventana con estilos básicos
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${tipo === 'BOLETA' ? 'Boleta' : 'Factura'}_${numero.replace(/\//g, '-')}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: Arial, sans-serif;
            background: white;
            color: black;
            padding: 20px;
            line-height: 1.5;
          }
          .border { border: 1px solid black; }
          .border-2 { border: 2px solid black; }
          .border-black { border-color: black; }
          .p-4 { padding: 16px; }
          .p-2 { padding: 8px; }
          .mb-4 { margin-bottom: 16px; }
          .mb-2 { margin-bottom: 8px; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .text-sm { font-size: 14px; }
          .text-xs { font-size: 12px; }
          .text-lg { font-size: 18px; }
          .text-xl { font-size: 20px; }
          .text-2xl { font-size: 24px; }
          .grid { display: grid; }
          .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
          .grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
          .col-span-2 { grid-column: span 2; }
          .gap-2 { gap: 8px; }
          .gap-4 { gap: 16px; }
          .flex { display: flex; }
          .justify-between { justify-content: space-between; }
          .items-center { align-items: center; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid black; padding: 8px; text-align: left; }
          th { background: #f5f5f5; font-weight: bold; }
          @media print {
            @page { margin: 0.5cm; size: A4; }
            body { padding: 0; margin: 0; }
          }
        </style>
      </head>
      <body>
        ${element.innerHTML}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 250);
          };
        </script>
      </body>
      </html>
    `;

    newWindow.document.write(htmlContent);
    newWindow.document.close();
  };

  return (
    <div className="bg-white min-h-screen">
      {/* Botones de acción (no se imprimen) */}
      <div className="no-print sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm z-10">
        <h2 className="text-lg font-semibold text-gray-900">
          {tipo === 'BOLETA' ? 'Boleta de Venta Electrónica' : 'Factura Electrónica'}
        </h2>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          <Download className="h-4 w-4" />
          Descargar PDF
        </button>
      </div>

      {/* Documento imprimible */}
      <div ref={printRef} className="max-w-4xl mx-auto p-8 print:p-0 print:max-w-full">
        {/* Encabezado */}
        <div className="border-2 border-black mb-4">
          <div className="grid grid-cols-3 gap-4 p-4">
            {/* Logo y datos del emisor */}
            <div className="col-span-2">
              <div className="text-sm font-bold mb-2 text-black">{emisor.razonSocial}</div>
              <div className="text-xs space-y-1 text-black">
                <div>RUC: {emisor.ruc}</div>
                <div>{emisor.direccion}</div>
                {emisor.telefono && <div>Teléfono: {emisor.telefono}</div>}
                {emisor.email && <div>Email: {emisor.email}</div>}
              </div>
            </div>

            {/* RUC y número de documento */}
            <div className="border-l-2 border-black pl-4 flex flex-col items-center justify-center">
              <div className="text-xs font-semibold mb-1 text-black">RUC N° {emisor.ruc}</div>
              <div className="text-lg font-bold mb-1 text-black">
                {tipo === 'BOLETA' ? 'BOLETA DE VENTA' : 'FACTURA'}
              </div>
              <div className="text-lg font-bold text-black">{numero}</div>
            </div>
          </div>
        </div>

        {/* Datos del cliente */}
        <div className="border border-black mb-4 p-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-black">
            <div className="flex">
              <span className="font-semibold min-w-[120px]">Fecha de Emisión:</span>
              <span>{fecha}</span>
            </div>
            <div className="flex">
              <span className="font-semibold min-w-[120px]">Condición de Pago:</span>
              <span>{condicionesPago}</span>
            </div>
            <div className="flex col-span-2">
              <span className="font-semibold min-w-[120px]">Cliente:</span>
              <span>{cliente.nombre}</span>
            </div>
            <div className="flex">
              <span className="font-semibold min-w-[120px]">{cliente.tipoDocumento}:</span>
              <span>{cliente.numeroDocumento}</span>
            </div>
            <div className="flex">
              <span className="font-semibold min-w-[120px]">Forma de Pago:</span>
              <span>{formaPago}</span>
            </div>
            <div className="flex col-span-2">
              <span className="font-semibold min-w-[120px]">Dirección:</span>
              <span>{cliente.direccion}</span>
            </div>
          </div>
        </div>

        {/* Detalle de productos */}
        <table className="w-full border border-black mb-4 text-xs text-black">
          <thead>
            <tr className="bg-gray-200 border-b border-black print:bg-gray-200">
              <th className="border-r border-black p-2 text-center w-16 text-black">CANT.</th>
              <th className="border-r border-black p-2 text-center w-16 text-black">UND</th>
              <th className="border-r border-black p-2 text-left text-black">DESCRIPCIÓN</th>
              <th className="border-r border-black p-2 text-right w-24 text-black">P. UNIT</th>
              <th className="p-2 text-right w-24 text-black">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className="border-b border-black">
                <td className="border-r border-black p-2 text-center">{item.cantidad}</td>
                <td className="border-r border-black p-2 text-center">{item.unidad}</td>
                <td className="border-r border-black p-2">{item.descripcion}</td>
                <td className="border-r border-black p-2 text-right">{totales.moneda} {item.precioUnitario}</td>
                <td className="p-2 text-right">{totales.moneda} {item.subtotal}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totales */}
        <div className="flex justify-end mb-4">
          <div className="w-64 border border-black">
            <div className="flex justify-between p-2 border-b border-black text-xs text-black">
              <span className="font-semibold">SUB TOTAL:</span>
              <span>{totales.moneda} {totales.subtotal}</span>
            </div>
            <div className="flex justify-between p-2 border-b border-black text-xs text-black">
              <span className="font-semibold">IGV (18%):</span>
              <span>{totales.moneda} {totales.igv}</span>
            </div>
            <div className="flex justify-between p-2 bg-gray-200 font-bold text-sm text-black print:bg-gray-200">
              <span>TOTAL:</span>
              <span>{totales.moneda} {totales.total}</span>
            </div>
          </div>
        </div>

        {/* Observaciones */}
        {observaciones && (
          <div className="border border-black p-3 mb-4">
            <div className="text-xs font-semibold mb-1 text-black">OBSERVACIONES:</div>
            <div className="text-xs text-black">{observaciones}</div>
          </div>
        )}

        {/* Representación impresa */}
        <div className="text-center text-xs text-black mt-8 border-t border-black pt-4">
          <p>Representación impresa de la {tipo === 'BOLETA' ? 'Boleta' : 'Factura'} Electrónica</p>
          <p className="mt-1">Consulte su documento en www.sunat.gob.pe</p>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          .no-print {
            display: none !important;
          }
          
          /* Ocultar todo el contenido de la página excepto el documento */
          body > *:not(#__next) {
            display: none !important;
          }
          
          /* Ocultar sidebar, header y otros elementos del dashboard */
          nav, aside, header, footer, .sidebar, [role="navigation"] {
            display: none !important;
          }
          
          html, body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          @page {
            size: A4;
            margin: 1cm;
          }
        }
      `}</style>
    </div>
  );
}
