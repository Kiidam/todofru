'use client';

import dynamic from 'next/dynamic';
import React, { useMemo, useState } from 'react';

const ProductList = dynamic(() => import('./components/ProductList'), {
  ssr: false,
  loading: () => <div>Cargando productos...</div>,
});

const Cart = dynamic(() => import('./components/Cart'), {
  ssr: false,
  loading: () => <div>Cargando carrito...</div>,
});

import ClientSelect from './components/ClientSelect';

type CartItem = {
  id: string;
  nombre: string;
  unidad: string;
  precio: number;
  cantidad: number;
  descuentoPct?: number;
};

export default function VentaPage() {
  const [clienteId, setClienteId] = useState<string>('');
  const [items, setItems] = useState<CartItem[]>([]);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const addToCart = (p: { id: string; nombre: string; precio: number; unidadMedida?: { simbolo: string } }) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === p.id);
      if (existing) {
        return prev.map((i) => (i.id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i));
      }
      return [
        ...prev,
        {
          id: p.id,
          nombre: p.nombre,
          unidad: p.unidadMedida?.simbolo ?? '',
          precio: p.precio,
          cantidad: 1,
        },
      ];
    });
  };

  const updateItem = (id: string, cantidad: number) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, cantidad: Math.max(1, cantidad) } : i)));
  };

  const updateDiscount = (id: string, descuentoPct: number) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, descuentoPct: Math.max(0, Math.min(100, descuentoPct)) } : i)));
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, it) => {
      const descFactor = 1 - (it.descuentoPct ?? 0) / 100;
      return sum + it.cantidad * it.precio * descFactor;
    }, 0);
    const impuestos = subtotal * 0.18;
    const total = subtotal + impuestos;
    return { subtotal, impuestos, total };
  }, [items]);

  const handleCreateOrder = async () => {
    setCreating(true);
    setMessage(null);
    try {
      const payload = {
        clienteId,
        items: items.map((i) => ({ productoId: i.id, cantidad: i.cantidad, precio: i.precio })),
      };

      const res = await fetch('/alt/venta/actions/createOrder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (res.ok && json?.success) {
        setMessage('Pedido de venta creado exitosamente');
        setItems([]);
        setClienteId('');
      } else {
        setMessage(json?.error || 'No se pudo crear el pedido');
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">Venta - Crear Pedido</h1>

      <div className="space-y-2">
        <label className="text-sm">Cliente</label>
        <ClientSelect value={clienteId} onChange={setClienteId} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h2 className="font-semibold mb-2">Productos</h2>
          <ProductList onAdd={addToCart} />
        </div>
        <div>
          <h2 className="font-semibold mb-2">Carrito</h2>
          <Cart
            items={items}
            onUpdate={updateItem}
            onUpdateDiscount={updateDiscount}
            onRemove={removeItem}
          />
          <div className="mt-3 space-y-1">
            <div className="flex justify-between"><span>Subtotal</span><span>{totals.subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Impuestos (IGV 18%)</span><span>{totals.impuestos.toFixed(2)}</span></div>
            <div className="flex justify-between font-semibold"><span>Total</span><span>{totals.total.toFixed(2)}</span></div>
          </div>
          <button onClick={handleCreateOrder} disabled={creating || items.length === 0 || !clienteId} className="w-full mt-3 px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-50">
            {creating ? 'Creando...' : 'Crear Pedido'}
          </button>
          {message && <div className="mt-2 text-sm">{message}</div>}
        </div>
      </div>
    </div>
  );
}