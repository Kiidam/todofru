'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import DocumentoSUNAT from '@/src/components/ventas/DocumentoSUNAT';
import { Loader2 } from 'lucide-react';

export default function DocumentoVentaPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const pedidoId = params.id as string;
  const tipo = (searchParams.get('tipo') || 'BOLETA') as 'BOLETA' | 'FACTURA';

  const [documento, setDocumento] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocumento = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/ventas/documento', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ pedidoId, tipo })
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

    if (pedidoId) {
      fetchDocumento();
    }
  }, [pedidoId, tipo]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Generando documento...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 font-semibold mb-2">Error</div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!documento) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">No se pudo cargar el documento</p>
      </div>
    );
  }

  return (
    <DocumentoSUNAT
      tipo={documento.tipo}
      numero={documento.numero}
      fecha={documento.fecha}
      emisor={documento.emisor}
      cliente={documento.cliente}
      items={documento.items}
      totales={documento.totales}
      observaciones={documento.observaciones}
      condicionesPago={documento.condicionesPago}
      formaPago={documento.formaPago}
    />
  );
}
