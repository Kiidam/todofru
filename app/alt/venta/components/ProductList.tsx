'use client';

import React, { useEffect, useState } from 'react';

type Product = {
  id: string;
  nombre: string;
  precio: number;
  unidadMedida?: { simbolo: string };
};

type ProductListProps = {
  onAdd: (p: { id: string; nombre: string; precio: number; unidadMedida?: { simbolo: string } }) => void;
};

export default function ProductList({ onAdd }: ProductListProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/productos?limit=50');
        const json = await res.json();
        if (res.ok && json && typeof json === 'object' && 'data' in json) {
          const data = (json as { data: unknown }).data;
          if (Array.isArray(data)) {
            const list: Product[] = data
              .map((item) => {
                const rec = item as Record<string, unknown>;
                const id = typeof rec.id === 'string' ? rec.id : '';
                const nombre = typeof rec.nombre === 'string' ? rec.nombre : '';
                const precio = typeof rec.precio === 'number' ? rec.precio : 0;
                const unidadMedidaObj = rec.unidadMedida as Record<string, unknown> | undefined;
                const simbolo = unidadMedidaObj && typeof unidadMedidaObj.simbolo === 'string' ? unidadMedidaObj.simbolo : undefined;
                return { id, nombre, precio, unidadMedida: simbolo ? { simbolo } : undefined };
              })
              .filter((p) => p.id && p.nombre);
            setProducts(list);
          } else {
            setError('Formato de respuesta inválido');
          }
        } else {
          setError((json as Record<string, unknown>)?.error as string || 'No se pudieron cargar los productos');
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  if (loading) return <div className="p-4">Cargando productos...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  return (
    <div className="space-y-2">
      {products.map((p) => (
        <div key={p.id} className="flex items-center justify-between border rounded p-2">
          <div>
            <div className="font-medium">{p.nombre}</div>
            <div className="text-sm text-gray-500">
              Precio: {p.precio.toFixed(2)} {p.unidadMedida?.simbolo ? `/${p.unidadMedida.simbolo}` : ''}
            </div>
          </div>
          <button
            className="px-3 py-1 bg-green-600 text-white rounded"
            onClick={() => onAdd(p)}
          >
            Agregar
          </button>
        </div>
      ))}
      {products.length === 0 && (
        <div className="p-4 text-gray-500">No hay productos disponibles.</div>
      )}
    </div>
  );
}