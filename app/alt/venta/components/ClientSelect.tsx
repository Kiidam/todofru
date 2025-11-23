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
        const res = await fetch('/api/clientes?limit=50', { cache: 'no-store' });
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          setError((json && (json as Record<string, unknown>).error) ? String((json as Record<string, unknown>).error) : 'No se pudieron cargar los clientes');
          return;
        }
        const arr = json?.data?.data ?? json?.data ?? json?.clientes ?? json ?? [];
        if (!Array.isArray(arr)) {
          setError('Formato de respuesta inválido');
          return;
        }
        const list: Cliente[] = (arr as unknown[])
          .map((item) => {
            const rec = item as Record<string, unknown>;
            const id = typeof rec.id === 'string' ? rec.id : '';
            const razonSocial = typeof rec.razonSocial === 'string' ? rec.razonSocial : '';
            const nombres = typeof rec.nombres === 'string' ? rec.nombres : '';
            const apellidos = typeof rec.apellidos === 'string' ? rec.apellidos : '';
            const numeroIdentificacion = typeof rec.numeroIdentificacion === 'string' ? rec.numeroIdentificacion : '';
            const nombreFromParts = (nombres || apellidos) ? `${nombres} ${apellidos}`.trim() : '';
            const nombre = typeof rec.nombre === 'string' && rec.nombre ? rec.nombre : (razonSocial || nombreFromParts || numeroIdentificacion || '');
            const tipo = rec.tipoCliente;
            const tipoCliente = tipo === 'MAYORISTA' || tipo === 'MINORISTA' ? (tipo as 'MAYORISTA' | 'MINORISTA') : undefined;
            return { id, nombre, tipoCliente };
          })
          .filter((c) => c.id && c.nombre);
        setClientes(list);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };
    fetchClientes();

    const handler = (e: Event) => {
      try {
        const ev = e as CustomEvent;
        if (ev?.detail?.type === 'cliente') {
          fetchClientes();
        }
      } catch {}
    };
    if (typeof window !== 'undefined') window.addEventListener('entity:created', handler as EventListener);
    return () => { if (typeof window !== 'undefined') window.removeEventListener('entity:created', handler as EventListener); };
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