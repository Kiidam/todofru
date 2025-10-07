'use client';

import React, { useMemo } from 'react';

type CartItem = {
  id: string;
  nombre: string;
  unidad: string;
  precio: number;
  cantidad: number;
  descuentoPct?: number;
};

type CartProps = {
  items: CartItem[];
  onUpdate: (id: string, cantidad: number) => void;
  onUpdateDiscount: (id: string, descuentoPct: number) => void;
  onRemove: (id: string) => void;
};

export default function Cart({ items, onUpdate, onUpdateDiscount, onRemove }: CartProps) {
  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, it) => {
      const descFactor = 1 - (it.descuentoPct ?? 0) / 100;
      return sum + it.cantidad * it.precio * descFactor;
    }, 0);
    const impuestos = subtotal * 0.18;
    const total = subtotal + impuestos;
    return { subtotal, impuestos, total };
  }, [items]);

  return (
    <div className="space-y-3">
      {items.map((it) => (
        <div key={it.id} className="border rounded p-2">
          <div className="flex justify-between">
            <div>
              <div className="font-medium">{it.nombre}</div>
              <div className="text-sm text-gray-500">{it.unidad}</div>
              <div className="text-sm">Precio: {it.precio.toFixed(2)}</div>
            </div>
            <button className="text-red-600" onClick={() => onRemove(it.id)}>Eliminar</button>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <label className="text-sm">Cantidad</label>
            <input
              type="number"
              min={1}
              value={it.cantidad}
              onChange={(e) => onUpdate(it.id, Number(e.target.value))}
              className="border rounded px-2 py-1 w-24"
            />
            <label className="text-sm">Descuento (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={it.descuentoPct ?? 0}
              onChange={(e) => onUpdateDiscount(it.id, Number(e.target.value))}
              className="border rounded px-2 py-1 w-24"
            />
          </div>
        </div>
      ))}

      <div className="mt-4 border-t pt-3">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{totals.subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Impuestos (IGV 18%)</span>
          <span>{totals.impuestos.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-semibold">
          <span>Total</span>
          <span>{totals.total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}