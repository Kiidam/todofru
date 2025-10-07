'use client';

import React, { useEffect, useState } from 'react';

type Cliente = {
  id: string;
  nombre: string;
  tipoCliente?: 'MAYORISTA' | 'MINORISTA';
};

type ClientSelectProps = {
  value?: string;
  onChange: (id: string) => void;
};

export default function ClientSelect({ value, onChange }: ClientSelectProps) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClientes = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/clientes?limit=50');
        const json = await res.json();
        if (res.ok && json && typeof json === 'object' && 'data' in json) {
          const data = (json as { data: unknown }).data;
          if (Array.isArray(data)) {
            const list: Cliente[] = data
              .map((item) => {
                const rec = item as Record<string, unknown>;
                const id = typeof rec.id === 'string' ? rec.id : '';
                const nombre = typeof rec.nombre === 'string' ? rec.nombre : '';
                const tipo = rec.tipoCliente;
                const tipoCliente = tipo === 'MAYORISTA' || tipo === 'MINORISTA' ? (tipo as 'MAYORISTA' | 'MINORISTA') : undefined;
                return { id, nombre, tipoCliente };
              })
              .filter((c) => c.id && c.nombre);
            setClientes(list);
          } else {
            setError('Formato de respuesta inválido');
          }
        } else {
          setError((json as Record<string, unknown>)?.error as string || 'No se pudieron cargar los clientes');
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };
    fetchClientes();
  }, []);

  if (loading) return <div className="p-2">Cargando clientes...</div>;
  if (error) return <div className="p-2 text-red-600">{error}</div>;

  return (
    <select
      className="border rounded px-2 py-1"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Selecciona un cliente</option>
      {clientes.map((c) => (
        <option key={c.id} value={c.id}>
          {c.nombre} {c.tipoCliente ? `(${c.tipoCliente})` : ''}
        </option>
      ))}
    </select>
  );
}