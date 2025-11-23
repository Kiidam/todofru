'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import DocumentoSUNAT from '@/components/ventas/DocumentoSUNAT';

export default function DocumentoCompraPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const compraId = params.id as string;
  const tipo = (searchParams.get('tipo') || 'BOLETA') as 'BOLETA' | 'FACTURA';

  const [documento, setDocumento] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocumento = async () => {
      try {
        const response = await fetch('/api/compras/documento', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ compraId, tipo })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Error al generar documento');
        }

        setDocumento(data.data);
      } catch (err: any) {
        setError(err.message || 'Error al cargar documento');
      } finally {
        setLoading(false);
      }
    };

    if (compraId) {
      fetchDocumento();
    }
  }, [compraId, tipo]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Generando documento...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg font-semibold">{error}</div>
          <button
            onClick={() => window.close()}
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  if (!documento) {
    return null;
  }

  return (
    <DocumentoSUNAT
      tipo={documento.tipo}
      numero={documento.numero}
      fecha={documento.fecha}
      emisor={documento.emisor}
      cliente={{
        tipoDocumento: documento.proveedor.tipoDocumento,
        numeroDocumento: documento.proveedor.numeroDocumento,
        nombre: documento.proveedor.nombre,
        direccion: documento.proveedor.direccion
      }}
      items={documento.items}
      totales={documento.totales}
      condicionesPago={documento.condicionesPago}
      formaPago={documento.formaPago}
    />
  );
}
