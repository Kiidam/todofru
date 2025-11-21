"use client";

import { useMemo, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Eye, Printer, Edit2, CheckCircle } from 'lucide-react';
import { MovimientosFiltersState } from '../../../../src/components/dashboard/movimientos/Filters';
import { useAuth } from '../../../../src/hooks/useAuth';

const Modal = dynamic(() => import('../../../../src/components/ui/Modal'), { ssr: false });

type ProductoOption = {
  id: string;
  nombre: string;
  sku: string | null;
  unidadMedida?: unknown | null;
};

type ProveedorOption = {
  id: string;
  nombre: string;
  ruc?: string | null;
};

type PurchaseItem = {
  productoId: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  unidad?: string | null;
};

type Purchase = {
  id: string;
  numero: string;
  fecha: string; // ISO
  proveedorId: string;
  proveedorNombre: string;
  usuario: string;
  items: PurchaseItem[];
  total: number;
};

function formatDateTimeLocal(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mi = pad(date.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function formatDateLocal(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  return `${yyyy}-${mm}-${dd}`;
}

function currency(num: number) {
  try {
    return num.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' });
  } catch {
    return `S/ ${num.toFixed(2)}`;
  }
}

function GuiaRemisionPreview({
  fecha,
  producto,
  precio,
  cantidad,
  usuario,
}: {
  fecha: string;
  producto: ProductoOption | null;
  precio: number;
  cantidad: number;
  usuario?: string | null;
}) {
  const total = precio * cantidad;
  return (
    <div className="bg-white rounded-lg shadow border" id="print-area">
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold text-gray-900">Guía de Remisión - Compra</h2>
        <p className="text-gray-600">Documento de remisión para ingreso por compras</p>
      </div>
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-medium text-gray-800 mb-2">Datos del Movimiento</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-gray-600">Fecha</dt><dd className="text-gray-900">{new Date(fecha).toLocaleString()}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-600">Responsable</dt><dd className="text-gray-900">{usuario ?? '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-600">Producto</dt><dd className="text-gray-900">{producto ? producto.nombre : '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-600">SKU</dt><dd className="text-gray-900">{producto?.sku ?? '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-600">Unidad</dt><dd className="text-gray-900">{getUnidadSimbolo(producto?.unidadMedida) ?? '—'}</dd></div>
          </dl>
        </div>
        <div>
          <h3 className="font-medium text-gray-800 mb-2">Detalle</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-gray-600">Precio de Compra</dt><dd className="text-gray-900">{currency(precio)}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-600">Cantidad</dt><dd className="text-gray-900">{cantidad}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-600">Total</dt><dd className="text-gray-900 font-semibold">{currency(total)}</dd></div>
          </dl>
        </div>
      </div>
      <div className="px-6 pb-6">
        <p className="text-xs text-gray-500">Nota: Este documento es una representación de guía de remisión para registro interno de compras.</p>
      </div>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
}

export default function MovimientosComprasPage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<MovimientosFiltersState>({
    searchTerm: '',
    fechaDesde: '',
    fechaHasta: '',
    pageSize: 10,
  });

  // Compras registradas (mock inicial + registros locales)
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loadingPurchases, setLoadingPurchases] = useState(true);

  // Selectores
  const [productos, setProductos] = useState<ProductoOption[]>([]);
  const [proveedores, setProveedores] = useState<ProveedorOption[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [loadingProveedores, setLoadingProveedores] = useState(false);

  // Formulario principal de compra
  const [form, setForm] = useState({
    fecha: formatDateLocal(new Date()),
    proveedorId: '',
    motivo: '',
  });

  // Entrada de ítem actual
  const [entry, setEntry] = useState({
    productoId: '',
    cantidad: 1,
    precioCompraTotal: 0,
    precioUnitario: 0,
  });

  // Ítems agregados a la compra actual
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);

  // Estado del modal
  const [registerOpen, setRegisterOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [successData, setSuccessData] = useState<{ numero: string; total: number } | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);

  // Formulario simple de orden (solo los campos solicitados)
  const [simpleEntry, setSimpleEntry] = useState({
    productoId: '',
    cantidad: 1,
    precioCompraTotal: 0,
    precioUnitario: 0,
    calcularAutomatico: true,
  });
  const [simpleOrders, setSimpleOrders] = useState<PurchaseItem[]>([]);

  // Función para cargar pedidos de compra
  const fetchPurchases = async (showLoading = true) => {
    try {
      if (showLoading) setLoadingPurchases(true);
      // Cache-busting: agregar timestamp único a cada request
      const timestamp = new Date().getTime();
      const res = await fetch(`/api/pedidos-compra?page=1&limit=50&_t=${timestamp}`, { 
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });
      
      if (!res.ok) {
        console.error('❌ Error al cargar pedidos de compra:', res.status, res.statusText);
        return;
      }
      
      const json = await res.json();
      console.log('📦 Respuesta API pedidos-compra:', json);
      console.log('📦 Estructura completa:', JSON.stringify(json, null, 2));
      
      // Normalizar respuesta del API
      const arr = Array.isArray(json?.data?.data) 
        ? json.data.data 
        : Array.isArray(json?.data) 
          ? json.data 
          : [];
      
      console.log('📊 Pedidos encontrados:', arr.length);
      console.log('📊 Primer pedido:', arr[0]);
      
      const purchasesList: Purchase[] = arr.map((p: unknown) => {
        const o = p as Record<string, unknown>;
        const itemsArr = Array.isArray(o.items) ? (o.items as unknown[]) : [];
        const items: PurchaseItem[] = itemsArr.map((item: unknown) => {
          const it = item as Record<string, unknown>;
          const producto = it.producto as Record<string, unknown> | undefined;
          return {
            productoId: String(it.productoId ?? ''),
            nombre: String(producto?.nombre ?? 'Producto'),
            cantidad: Number(it.cantidad ?? 0),
            precioUnitario: Number(it.precio ?? 0),
            unidad: String(getUnidadSimbolo(producto?.unidadMedida) ?? 'unidad'),
          };
        });

        const proveedorObj = o.proveedor as Record<string, unknown> | undefined;
        const purchase = {
          id: String(o.id ?? ''),
          numero: String(o.numero ?? `PC-${String(o.id ?? '')}`),
          fecha: String(o.fecha ?? new Date().toISOString()),
          proveedorId: String(o.proveedorId ?? ''),
          proveedorNombre: String(proveedorObj?.nombre ?? proveedorObj?.razonSocial ?? 'Proveedor'),
          usuario: 'Sistema',
          items,
          total: Number(o.total ?? 0),
        };
        
        console.log('🛒 Compra procesada:', purchase.numero, 'Proveedor:', purchase.proveedorNombre, 'Items:', purchase.items.length);
        return purchase;
      });
      
      setPurchases(purchasesList);
      console.log('✅ Total compras cargadas:', purchasesList.length);
    } catch (error) {
      console.error('❌ Error al cargar pedidos de compra:', error);
    } finally {
      if (showLoading) setLoadingPurchases(false);
    }
  };

  useEffect(() => {

    const fetchProductos = async () => {
      try {
        setLoadingProductos(true);
        const res = await fetch('/api/inventario?action=productos', { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json().catch(() => null);
          // Normalize different shapes: { productos: [...] } | { data: { productos: [...] } } | { data: [...] } | [...]
          const arr = Array.isArray(json?.productos)
            ? json.productos
            : Array.isArray(json?.data?.productos)
              ? json.data.productos
              : Array.isArray(json?.data)
                ? json.data
                : Array.isArray(json)
                  ? json
                  : [];

          const opts: ProductoOption[] = (arr as unknown[]).map((p: unknown) => {
            const o = p as Record<string, unknown>;
            return {
              id: String(o.id ?? o.ID ?? ''),
              nombre: String(o.nombre ?? o.name ?? ''),
              sku: (o.sku ?? null) as string | null,
              unidadMedida: (o.unidadMedida ?? o.unidad ?? null) as { simbolo: string } | null,
            };
          }).filter(x => x.id && x.nombre);

          // If no products were returned (unexpected shape or auth issue), try legacy endpoint as fallback
          if (opts.length === 0) {
            try {
              const fb = await fetch('/api/productos?simple=true&limit=1000', { cache: 'no-store' });
              if (fb.ok) {
                const raw = await fb.json().catch(() => null);
                const list = raw?.data?.data ?? raw?.data ?? raw ?? [];
                const fbOpts: ProductoOption[] = (Array.isArray(list) ? list : []).map((p: unknown) => {
                  const o = p as Record<string, unknown>;
                  return {
                    id: String(o.id ?? o.ID ?? ''),
                    nombre: String(o.nombre ?? o.name ?? ''),
                    sku: (o.sku ?? null) as string | null,
                    unidadMedida: (o.unidadMedida ?? o.unidad ?? null) as { simbolo: string } | null,
                  };
                }).filter(x => x.id && x.nombre);
                if (fbOpts.length > 0) {
                  setProductos(fbOpts);
                  return;
                }
              }
            } catch (err) {
              console.warn('Fallback /api/productos failed', err);
            }
          }

          setProductos(opts);
        } else {
          // Mock mínimo si no hay API
          setProductos([
            { id: 'p1', nombre: 'Manzana Fuji', sku: 'MAN-001', unidadMedida: { simbolo: 'kg' } },
            { id: 'p2', nombre: 'Naranja Valencia', sku: 'NAR-001', unidadMedida: { simbolo: 'kg' } },
          ]);
        }
      } catch {
        setProductos([
          { id: 'p1', nombre: 'Manzana Fuji', sku: 'MAN-001', unidadMedida: { simbolo: 'kg' } },
          { id: 'p2', nombre: 'Naranja Valencia', sku: 'NAR-001', unidadMedida: { simbolo: 'kg' } },
        ]);
      } finally {
        setLoadingProductos(false);
      }
  };
    const fetchProveedores = async () => {
      try {
        setLoadingProveedores(true);
        const res = await fetch('/api/proveedores?page=1&limit=100&simple=true', { cache: 'no-store' });
        if (!res.ok) {
          console.error('Error al cargar proveedores:', res.status, res.statusText);
          setProveedores([]);
          return;
        }
        const json = await res.json().catch(() => null);
        
        // El API devuelve: { success: true, data: { data: [...], pagination: {...} } }
        const arr = Array.isArray(json?.data?.data)
          ? json.data.data
          : Array.isArray(json?.data)
            ? json.data
            : [];

        const opts: ProveedorOption[] = (arr as unknown[]).map((p: unknown) => {
          const o = p as Record<string, unknown>;
          const nombre = String(
            o.nombre ?? 
            o.razonSocial ?? 
            (`${o.nombres || ''} ${o.apellidos || ''}`.trim() || 'Sin nombre')
          );
          return { 
            id: String(o.id ?? ''), 
            nombre: nombre, 
            ruc: (o.ruc ?? o.numeroIdentificacion ?? null) as string | null 
          };
        }).filter(x => x.id && x.nombre);

        console.log('Proveedores cargados:', opts.length);
        setProveedores(opts);
      } catch (err) {
        console.error('fetchProveedores error', err);
        setProveedores([]);
      } finally {
        setLoadingProveedores(false);
      }
    };
    fetchPurchases();
    fetchProductos();
    fetchProveedores();

    // Live-refresh: if a provider is created elsewhere in the app, refresh the providers list
    const handler = (e: Event) => {
      try {
        const ev = e as CustomEvent;
        if (ev?.detail?.type === 'proveedor') {
          fetchProveedores();
        }
      } catch {}
    };
    if (typeof window !== 'undefined') window.addEventListener('entity:created', handler as EventListener);
    return () => { if (typeof window !== 'undefined') window.removeEventListener('entity:created', handler as EventListener); };
  }, []);

  const selectedProducto = useMemo(
    () => productos.find(p => p.id === entry.productoId) || null,
    [productos, entry.productoId]
  );

  function getUnidadSimbolo(unidad: unknown | null | undefined) {
    if (!unidad || typeof unidad !== 'object') return undefined;
    const anyU = unidad as Record<string, unknown>;
    if (typeof anyU['simbolo'] === 'string') return String(anyU['simbolo']);
    return undefined;
  }

  const selectedProveedor = useMemo(
    () => proveedores.find(p => p.id === form.proveedorId) || null,
    [proveedores, form.proveedorId]
  );

  const selectedSimpleProducto = useMemo(
    () => productos.find(p => p.id === simpleEntry.productoId) || null,
    [productos, simpleEntry.productoId]
  );


  // Actualización en línea de ítems
  const updateItemQty = (idx: number, qty: number) => {
    setPurchaseItems(prev => prev.map((it, i) => i === idx ? { ...it, cantidad: Math.max(1, qty) } : it));
  };
  const updateItemPrice = (idx: number, price: number) => {
    setPurchaseItems(prev => prev.map((it, i) => i === idx ? { ...it, precioUnitario: Math.max(0, Number(price)) } : it));
  };
  const updateItemUnit = (idx: number, unidad: string) => {
    setPurchaseItems(prev => prev.map((it, i) => i === idx ? { ...it, unidad } : it));
  };

  const purchaseTotalTemp = useMemo(() => purchaseItems.reduce((sum, it) => sum + (it.cantidad * it.precioUnitario), 0), [purchaseItems]);

  const canRegisterPurchase = Boolean(form.fecha && form.proveedorId && purchaseItems.length > 0);

  const [registering, setRegistering] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Cálculo automático para el formulario simple
  useEffect(() => {
    if (simpleEntry.calcularAutomatico) {
      const unit = simpleEntry.cantidad > 0 ? (simpleEntry.precioCompraTotal / simpleEntry.cantidad) : 0;
      setSimpleEntry(s => ({ ...s, precioUnitario: Number.isFinite(unit) ? Number(unit.toFixed(4)) : 0 }));
    }
  }, [simpleEntry.precioCompraTotal, simpleEntry.cantidad, simpleEntry.calcularAutomatico]);

  const canSaveSimple = Boolean(simpleEntry.productoId && simpleEntry.cantidad > 0 && (simpleEntry.calcularAutomatico ? simpleEntry.precioCompraTotal > 0 : simpleEntry.precioUnitario > 0));

  // Filtrar compras directamente
  const filteredPurchases = useMemo(() => {
    let rs = purchases;
    const { searchTerm, fechaDesde, fechaHasta } = filters;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      rs = rs.filter(purchase => 
        purchase.numero.toLowerCase().includes(term) ||
        purchase.proveedorNombre.toLowerCase().includes(term) ||
        purchase.items.some(item => item.nombre.toLowerCase().includes(term))
      );
    }
    
    if (fechaDesde) {
      const desde = new Date(fechaDesde).getTime();
      rs = rs.filter(purchase => new Date(purchase.fecha).getTime() >= desde);
    }
    
    if (fechaHasta) {
      const hasta = new Date(fechaHasta).getTime();
      rs = rs.filter(purchase => new Date(purchase.fecha).getTime() <= hasta);
    }
    
    return rs;
  }, [purchases, filters]);

  const totalPages = useMemo(() => {
    const size = Math.max(1, Number(filters.pageSize || 10));
    return Math.max(1, Math.ceil(filteredPurchases.length / size));
  }, [filteredPurchases.length, filters.pageSize]);

  const pagedPurchases = useMemo(() => {
    const size = Math.max(1, Number(filters.pageSize || 10));
    const page = Math.max(1, Math.min(currentPage, Math.ceil(filteredPurchases.length / size) || 1));
    const start = (page - 1) * size;
    return filteredPurchases.slice(start, start + size);
  }, [filteredPurchases, currentPage, filters.pageSize]);

  // Auto-agregar item al seleccionar producto
  const autoAddFromSelection = (prod: ProductoOption) => {
    const unidad = getUnidadSimbolo(prod?.unidadMedida) ?? 'unidad';
    const item: PurchaseItem = {
      productoId: prod.id,
      nombre: prod.nombre,
      cantidad: 1,
      precioUnitario: 0,
      unidad,
    };
    setPurchaseItems(prev => [...prev, item]);
    setEntry(e => ({ ...e, productoId: '', cantidad: 1, precioCompraTotal: 0, precioUnitario: 0 }));
  };

  const removeItemAt = (idx: number) => {
    setPurchaseItems(prev => prev.filter((_, i) => i !== idx));
  };

  const registerPurchase = async () => {
    if (!canRegisterPurchase || registering) return;
    setSubmitError(null);
    setRegistering(true);
    try {
      const payload = {
        proveedorId: form.proveedorId,
        fecha: form.fecha,
        observaciones: undefined,
        items: purchaseItems.map(it => ({
          productoId: it.productoId,
          cantidad: it.cantidad,
          precioUnitario: it.precioUnitario,
          unidad: it.unidad ?? undefined,
        })),
      };

      let res: Response;
      try {
        res = await fetch('/api/pedidos-compra', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err ?? 'Error de red al contactar el servidor');
        setSubmitError(msg);
        alert(`No se pudo registrar la compra: ${msg}`);
        return;
      }

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) {
        const msg = json?.error || `Error ${res.status}`;
        setSubmitError(msg);
        alert(`No se pudo registrar la compra: ${msg}`);
        return;
      }

      console.log('✅ Compra registrada exitosamente:', json?.data);

      // Guardar datos para el modal de éxito
      setSuccessData({
        numero: json?.data?.numero || 'N/A',
        total: json?.data?.total || 0
      });

      // Emitir eventos de inventario por cada ítem (ENTRADA) para refrescos locales
      try {
        purchaseItems.forEach((it: PurchaseItem) => {
          try {
            if (it.productoId && it.cantidad > 0) {
              ((globalThis as unknown) as { emitirInventarioEvento?: (p: { tipo: 'SALIDA' | 'ENTRADA'; productoId: string; delta: number }) => void }).emitirInventarioEvento?.({ tipo: 'ENTRADA', productoId: it.productoId, delta: it.cantidad });
            }
          } catch {}
        });
      } catch {}

  // Limpiar formulario
  setPurchaseItems([]);
  setForm({ fecha: formatDateLocal(new Date()), proveedorId: '', motivo: '' });
      
      // Cerrar modal de registro
      setRegisterOpen(false);

      // Recargar la lista de compras con cache-busting
      console.log('🔄 Recargando lista de compras...');
      await fetchPurchases(true);

      // Mostrar modal de éxito después de recargar
      setSuccessModalOpen(true);
    } finally {
      setRegistering(false);
    }
  };

  // Función para ver detalles de una compra
  const viewPurchase = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setViewModalOpen(true);
  };

  // Función para imprimir una compra específica
  const printPurchase = (purchase: Purchase) => {
    // Preparar datos para impresión
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, habilite las ventanas emergentes para imprimir');
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Compra ${purchase.numero}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 20px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
          .info-item { padding: 5px 0; }
          .info-label { font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f4f4f4; font-weight: bold; }
          .total { text-align: right; font-size: 18px; font-weight: bold; margin-top: 20px; }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>ORDEN DE COMPRA</h1>
          <p><strong>${purchase.numero}</strong></p>
        </div>
        
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Proveedor:</span> ${purchase.proveedorNombre}
          </div>
          <div class="info-item">
            <span class="info-label">Fecha:</span> ${new Date(purchase.fecha).toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <div class="info-item">
            <span class="info-label">Usuario:</span> ${purchase.usuario}
          </div>
          <div class="info-item">
            <span class="info-label">Hora:</span> ${new Date(purchase.fecha).toLocaleTimeString('es-PE')}
          </div>
        </div>

        <h3>Detalle de Productos</h3>
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Unidad</th>
              <th>Precio Unit.</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${purchase.items.map(item => `
              <tr>
                <td>${item.nombre}</td>
                <td>${item.cantidad}</td>
                <td>${item.unidad || 'unidad'}</td>
                <td>S/ ${item.precioUnitario.toFixed(2)}</td>
                <td>S/ ${(item.cantidad * item.precioUnitario).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="total">
          TOTAL: S/ ${purchase.total.toFixed(2)}
        </div>

        <div style="margin-top: 40px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px;">
            Imprimir
          </button>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Función para editar una compra
  const editPurchase = (purchase: Purchase) => {
    console.log('📝 [EDIT] Abriendo modal de edición:', {
      id: purchase.id,
      numero: purchase.numero,
      proveedorId: purchase.proveedorId,
      itemsCount: purchase.items.length
    });
    
    // Cargar datos de la compra en el formulario
    setForm({
      fecha: formatDateLocal(new Date(purchase.fecha)),
      proveedorId: purchase.proveedorId,
      motivo: purchase?.numero ? `Compra ${purchase.numero}` : '',
    });
    setPurchaseItems(purchase.items);
    setEditingPurchase(purchase);
    setEditModalOpen(true);
  };

  // Función para actualizar una compra editada
  const updatePurchase = async () => {
    if (!editingPurchase) return;

    try {
      setRegistering(true);
      setSubmitError(null);

      console.log('🔄 [UPDATE] Iniciando actualización:', {
        editingPurchaseId: editingPurchase.id,
        editingPurchaseNumero: editingPurchase.numero,
        proveedorId: form.proveedorId,
        itemsCount: purchaseItems.length
      });

      // Validación de datos antes de enviar
      if (!form.proveedorId) {
        throw new Error('Debe seleccionar un proveedor');
      }

      if (purchaseItems.length === 0) {
        throw new Error('Debe agregar al menos un producto');
      }

      // Validar que todos los items tengan datos válidos
      for (const item of purchaseItems) {
        if (!item.productoId || !item.nombre) {
          throw new Error('Producto inválido en la lista');
        }
        if (!item.cantidad || item.cantidad <= 0 || isNaN(item.cantidad)) {
          throw new Error(`Cantidad inválida para ${item.nombre}. Debe ser un número mayor a 0`);
        }
        if (item.precioUnitario < 0 || isNaN(item.precioUnitario)) {
          throw new Error(`Precio inválido para ${item.nombre}. Debe ser un número mayor o igual a 0`);
        }
      }

      const body = {
        proveedorId: form.proveedorId,
        fecha: new Date(form.fecha).toISOString(),
        motivo: form.motivo || undefined,
        items: purchaseItems.map(it => ({
          productoId: it.productoId,
          cantidad: Number(it.cantidad),
          precioUnitario: Number(it.precioUnitario),
        })),
      };

      console.log('📦 [UPDATE] Body a enviar:', JSON.stringify(body, null, 2));
      console.log('🔗 [UPDATE] URL:', `/api/pedidos-compra/${editingPurchase.id}`);

      const res = await fetch(`/api/pedidos-compra/${editingPurchase.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Error desconocido' }));
        throw new Error(errorData.message || `Error ${res.status}`);
      }

      const result = await res.json();
      console.log('✅ Compra actualizada:', result);

      // Mostrar éxito
      setSuccessData({
        numero: result.data?.numero || editingPurchase.numero,
        total: purchaseItems.reduce((sum, it) => sum + (it.cantidad * it.precioUnitario), 0),
      });

  // Limpiar formulario
  setForm({ fecha: formatDateLocal(new Date()), proveedorId: '', motivo: '' });
      setPurchaseItems([]);
      setEditingPurchase(null);

      // Cerrar modal de edición
      setEditModalOpen(false);

      // Recargar lista
      await fetchPurchases(true);

      // Mostrar modal de éxito
      setSuccessModalOpen(true);
    } catch (error) {
      console.error('❌ Error al actualizar compra:', error);
      setSubmitError(error instanceof Error ? error.message : 'Error al actualizar la compra');
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Movimientos - Compras</h1>
        <p className="text-gray-600">Entradas al inventario derivadas de compras</p>
      </div>

      {/* Acción principal: solo el botón */}
      <div className="flex justify-end mb-3">
        <button
          type="button"
          onClick={() => {
            setEntry({ productoId: '', cantidad: 1, precioCompraTotal: 0, precioUnitario: 0 });
            // Iniciar sin ítems predefinidos; el usuario agregará productos manualmente
            setPurchaseItems([]);
            setForm({ fecha: formatDateLocal(new Date()), proveedorId: '', motivo: '' });
            setRegisterOpen(true);
          }}
          className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700"
        >
          Registrar compra
        </button>
      </div>

      {/* Lista y filtros (atributos solicitados) */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-3 md:space-y-0">
            <div className="relative w-full md:max-w-sm">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M12.9 14.32a8 8 0 111.414-1.414l4.387 4.387a1 1 0 01-1.414 1.414l-4.387-4.387zM14 8a6 6 0 11-12 0 6 6 0 0112 0z" clipRule="evenodd" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Buscar compras"
                aria-label="Buscar compras por número, proveedor o producto"
                value={filters.searchTerm}
                onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500 w-full"
              />
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">Desde</label>
              <input
                type="date"
                value={filters.fechaDesde}
                onChange={(e) => { setFilters(prev => ({ ...prev, fechaDesde: e.target.value })); setCurrentPage(1); }}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">Hasta</label>
              <input
                type="date"
                value={filters.fechaHasta}
                onChange={(e) => { setFilters(prev => ({ ...prev, fechaHasta: e.target.value })); setCurrentPage(1); }}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">Por página</label>
              <select
                value={filters.pageSize}
                onChange={(e) => { setFilters(prev => ({ ...prev, pageSize: parseInt(e.target.value, 10) })); setCurrentPage(1); }}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">Proveedor</label>
              <select
                value={form.proveedorId}
                onChange={(e) => setForm({ ...form, proveedorId: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">Todos</option>
                {proveedores.map(p => (<option key={p.id} value={p.id}>{p.nombre}</option>))}
              </select>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-max w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">N° Compra</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proveedor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha de compra</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total de la compra</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loadingPurchases ? (
                <tr>
                  <td className="px-4 py-2 text-sm text-gray-600" colSpan={5}>Cargando compras...</td>
                </tr>
              ) : filteredPurchases.length === 0 ? (
                <tr>
                  <td className="px-4 py-2 text-sm text-gray-600" colSpan={5}>
                    {purchases.length === 0 ? 'Sin compras registradas' : 'No se encontraron compras con los filtros aplicados'}
                  </td>
                </tr>
              ) : pagedPurchases.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{c.numero}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{c.proveedorNombre}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(c.fecha).toLocaleDateString('es-PE')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right tabular-nums">{new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(c.total)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center gap-3">
                      <button type="button" title="Ver detalles" onClick={() => viewPurchase(c)} className="text-green-600 hover:text-green-800 transition-colors">
                        <Eye className="h-5 w-5" />
                      </button>
                      <button type="button" title="Imprimir" onClick={() => printPurchase(c)} className="text-gray-700 hover:text-gray-900 transition-colors">
                        <Printer className="h-5 w-5" />
                      </button>
                      <button type="button" title="Editar" onClick={() => editPurchase(c)} className="text-blue-600 hover:text-blue-800 transition-colors">
                        <Edit2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 flex items-center justify-between border-t bg-gray-50">
          <div className="text-sm text-gray-600">Mostrando {pagedPurchases.length} de {filteredPurchases.length}</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="px-3 py-1 rounded border text-gray-700 disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="text-sm text-gray-700">{currentPage} / {totalPages}</span>
            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-3 py-1 rounded border text-gray-700 disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Registrar Compra */}
      <Modal isOpen={registerOpen} onClose={() => setRegisterOpen(false)} ariaLabel="Registrar compra">
        <form className="w-full" onSubmit={(e) => { e.preventDefault(); registerPurchase(); }}>
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="text-lg font-bold text-gray-900">Registrar Compra</h3>
          </div>

          {/* Datos generales */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de compra</label>
              <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" required />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
              <select value={form.proveedorId} onChange={(e) => setForm({ ...form, proveedorId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" required>
                <option value="" disabled>
                  {loadingProveedores 
                    ? 'Cargando proveedores...' 
                    : proveedores.length === 0 
                      ? 'No hay proveedores disponibles' 
                      : 'Seleccione un proveedor'
                  }
                </option>
                {proveedores.map(p => (<option key={p.id} value={p.id}>{p.nombre}</option>))}
              </select>
              {!loadingProveedores && proveedores.length === 0 && (
                <p className="mt-1 text-sm text-amber-600">
                  No se encontraron proveedores. <a href="/dashboard/proveedores" className="text-blue-600 hover:text-blue-800 underline">Agregar proveedor</a>
                </p>
              )}
            </div>
          </div>

          {/* Ítem de compra - selector de producto con botón */}
          <div className="mt-6 p-4 bg-green-50 rounded-lg border-2 border-green-200">
            <h4 className="text-sm font-semibold text-green-900 mb-3 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Agregar Producto a la Compra
            </h4>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Seleccione el producto <span className="text-red-500">*</span>
                </label>
                <select
                  value={entry.productoId}
                  onChange={(e) => setEntry({ ...entry, productoId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">{loadingProductos ? 'Cargando productos...' : '-- Seleccione un producto --'}</option>
                  {productos.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} {p.sku ? `(${p.sku})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!entry.productoId) {
                    alert('⚠️ Seleccione un producto primero');
                    return;
                  }
                  const prod = productos.find(p => p.id === entry.productoId);
                  if (!prod) {
                    alert('❌ Producto no encontrado');
                    return;
                  }

                  // Verificar si ya existe
                  const exists = purchaseItems.find(item => item.productoId === prod.id);
                  if (exists) {
                    const confirm = window.confirm(
                      `El producto "${prod.nombre}" ya está en la lista.\n¿Desea agregarlo nuevamente?`
                    );
                    if (!confirm) return;
                  }

                  const unidad = getUnidadSimbolo(prod?.unidadMedida) ?? 'unidad';
                  const item: PurchaseItem = {
                    productoId: prod.id,
                    nombre: prod.nombre,
                    cantidad: 1,
                    precioUnitario: 0,
                    unidad,
                  };
                  setPurchaseItems(prev => [...prev, item]);
                  setEntry({ productoId: '', cantidad: 1, precioCompraTotal: 0, precioUnitario: 0 });
                  console.log('✅ Producto agregado:', item);
                }}
                disabled={!entry.productoId}
                className="px-6 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 active:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium shadow-sm hover:shadow transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Agregar
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-600">
              💡 Seleccione un producto y haga clic en "Agregar". Luego edite la cantidad y precio en la tabla.
            </p>
          </div>

          {/* Items agregados */}
          <div className="mt-6">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cant.</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unidad</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">P. Unitario</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subtotal</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {purchaseItems.length === 0 ? (
                  <tr>
                    <td className="px-4 py-2 text-sm text-gray-600" colSpan={6}>Sin productos agregados</td>
                  </tr>
                ) : purchaseItems.map((it, idx) => (
                  <tr key={`it-${idx}`}>
                    <td className="px-4 py-2 text-sm text-gray-900">{it.nombre}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={it.cantidad}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => updateItemQty(idx, Number(e.target.value))}
                        className="w-24 px-2 py-1 border border-gray-300 rounded-md focus:ring-1 focus:ring-green-500 focus:border-transparent"
                      />
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      <select
                        value={it.unidad ?? 'unidad'}
                        onChange={(e) => updateItemUnit(idx, e.target.value)}
                        className="px-2 py-1 border border-gray-300 rounded-md focus:ring-1 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="unidad">unidad</option>
                        <option value="kg">kg</option>
                        <option value="g">g</option>
                        <option value="t">t</option>
                        <option value="lt">lt</option>
                        <option value="ml">ml</option>
                      </select>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      <input
                        type="number"
                        min={0}
                        step={0.0001}
                        value={it.precioUnitario}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => updateItemPrice(idx, Number(e.target.value))}
                        className="w-32 px-2 py-1 border border-gray-300 rounded-md focus:ring-1 focus:ring-green-500 focus:border-transparent"
                      />
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">{new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(it.cantidad * it.precioUnitario)}</td>
                    <td className="px-4 py-2 text-sm">
                      <button type="button" onClick={() => removeItemAt(idx)} className="text-red-600 hover:text-red-800">Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 flex justify-end">
              <div className="text-sm text-gray-700">Total compra: <span className="font-semibold">{new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(purchaseTotalTemp)}</span></div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={() => setRegisterOpen(false)} className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100">Cancelar</button>
            <button type="submit" disabled={!canRegisterPurchase || registering} className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
              {registering ? 'Registrando…' : 'Registrar compra'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de éxito */}
      <Modal isOpen={successModalOpen} onClose={() => setSuccessModalOpen(false)} ariaLabel="Compra registrada">
        <div className="text-center py-6">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">¡Compra registrada exitosamente!</h3>
          {successData && (
            <div className="mt-4 bg-gray-50 rounded-lg p-4 text-left">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">N° de Compra:</span>
                <span className="text-sm font-semibold text-gray-900">{successData.numero}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600">Total:</span>
                <span className="text-sm font-semibold text-green-600">
                  {new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(successData.total)}
                </span>
              </div>
            </div>
          )}
          <button
            onClick={() => setSuccessModalOpen(false)}
            className="mt-6 px-6 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 font-medium"
          >
            Aceptar
          </button>
        </div>
      </Modal>

      {/* Modal: Ver Detalles */}
      <Modal isOpen={viewModalOpen} onClose={() => setViewModalOpen(false)} ariaLabel="Ver detalles de compra">
        {selectedPurchase && (
          <div className="w-full max-w-3xl">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="text-xl font-bold text-gray-900">Detalles de Compra</h3>
              <span className="text-sm font-semibold text-green-600">{selectedPurchase.numero}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-600 mb-1">Proveedor</p>
                <p className="text-base font-semibold text-gray-900">{selectedPurchase.proveedorNombre}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-600 mb-1">Fecha de Compra</p>
                <p className="text-base font-semibold text-gray-900">
                  {new Date(selectedPurchase.fecha).toLocaleDateString('es-PE', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-600 mb-1">Usuario</p>
                <p className="text-base font-semibold text-gray-900">{selectedPurchase.usuario}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-600 mb-1">Hora</p>
                <p className="text-base font-semibold text-gray-900">
                  {new Date(selectedPurchase.fecha).toLocaleTimeString('es-PE')}
                </p>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Productos</h4>
              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unidad</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">P. Unit.</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedPurchase.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-3 text-sm text-gray-900">{item.nombre}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{item.cantidad}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{item.unidad || 'unidad'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(item.precioUnitario)}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                          {new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(item.cantidad * item.precioUnitario)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between items-center border-t pt-4">
              <span className="text-lg font-semibold text-gray-900">TOTAL:</span>
              <span className="text-2xl font-bold text-green-600">
                {new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(selectedPurchase.total)}
              </span>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  printPurchase(selectedPurchase);
                  setViewModalOpen(false);
                }}
                className="px-4 py-2 rounded-md bg-gray-600 text-white hover:bg-gray-700 flex items-center gap-2"
              >
                <Printer className="h-4 w-4" />
                Imprimir
              </button>
              <button
                onClick={() => setViewModalOpen(false)}
                className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Editar Compra */}
      <Modal isOpen={editModalOpen} onClose={() => {
        setEditModalOpen(false);
        setEditingPurchase(null);
        setPurchaseItems([]);
      }} ariaLabel="Editar compra">
        <form className="w-full" onSubmit={(e) => { e.preventDefault(); updatePurchase(); }}>
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="text-lg font-bold text-gray-900">Editar Compra</h3>
            {editingPurchase && (
              <span className="text-sm font-semibold text-blue-600">{editingPurchase.numero}</span>
            )}
          </div>

          {submitError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{submitError}</p>
            </div>
          )}

          {/* Datos generales */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de compra</label>
              <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
              <select value={form.proveedorId} onChange={(e) => setForm({ ...form, proveedorId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required>
                <option value="" disabled>Seleccione un proveedor</option>
                {proveedores.map(p => (<option key={p.id} value={p.id}>{p.nombre}</option>))}
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
              <input
                type="text"
                value={form.motivo}
                onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Opcional: descripción breve para la compra"
              />
            </div>
          </div>

          {/* Productos en la compra */}
          <div className="mt-4">
            <h4 className="text-sm font-semibold text-gray-800 mb-2">Productos</h4>
            {purchaseItems.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No hay productos en esta compra</p>
            ) : (
              <div className="border rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Producto</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Cantidad</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">P. Unit.</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Subtotal</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {purchaseItems.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 text-sm text-gray-900">{item.nombre}</td>
                        <td className="px-3 py-2 text-sm">
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={item.cantidad || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              const newItems = [...purchaseItems];
                              // Solo actualizar si es un número válido mayor a 0
                              if (value === '' || value === '0') {
                                newItems[idx].cantidad = 0;
                              } else {
                                const parsed = parseFloat(value);
                                newItems[idx].cantidad = !isNaN(parsed) && parsed > 0 ? parsed : newItems[idx].cantidad;
                              }
                              setPurchaseItems(newItems);
                            }}
                            onBlur={(e) => {
                              // Al perder el foco, asegurar que haya un valor válido
                              if (!e.target.value || parseFloat(e.target.value) <= 0) {
                                const newItems = [...purchaseItems];
                                newItems[idx].cantidad = 1; // Valor por defecto
                                setPurchaseItems(newItems);
                              }
                            }}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </td>
                        <td className="px-3 py-2 text-sm">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.precioUnitario || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              const newItems = [...purchaseItems];
                              if (value === '') {
                                newItems[idx].precioUnitario = 0;
                              } else {
                                const parsed = parseFloat(value);
                                newItems[idx].precioUnitario = !isNaN(parsed) && parsed >= 0 ? parsed : newItems[idx].precioUnitario;
                              }
                              setPurchaseItems(newItems);
                            }}
                            onBlur={(e) => {
                              // Al perder el foco, asegurar que haya un valor válido
                              if (!e.target.value || parseFloat(e.target.value) < 0) {
                                const newItems = [...purchaseItems];
                                newItems[idx].precioUnitario = 0;
                                setPurchaseItems(newItems);
                              }
                            }}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </td>
                        <td className="px-3 py-2 text-sm font-medium">
                          S/ {(item.cantidad * item.precioUnitario).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-sm">
                          <button
                            type="button"
                            onClick={() => setPurchaseItems(purchaseItems.filter((_, i) => i !== idx))}
                            className="text-red-600 hover:text-red-800 text-xs font-medium"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Agregar nuevo producto */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
            <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Agregar Producto a la Compra
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Producto <span className="text-red-500">*</span>
                </label>
                <select
                  value={entry.productoId}
                  onChange={(e) => {
                    const prod = productos.find(p => p.id === e.target.value);
                    setEntry({ ...entry, productoId: e.target.value });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">-- Seleccione un producto --</option>
                  {productos.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} {p.sku ? `(${p.sku})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Cantidad <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={entry.cantidad || ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setEntry({ ...entry, cantidad: isNaN(val) ? 0 : val });
                  }}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  P. Unitario <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={entry.precioUnitario || ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setEntry({ ...entry, precioUnitario: isNaN(val) ? 0 : val });
                  }}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-gray-600">
                Complete los campos y haga clic en el botón para agregar
              </p>
              <button
                type="button"
                onClick={() => {
                  // Validación
                  if (!entry.productoId) {
                    alert('⚠️ Seleccione un producto');
                    return;
                  }
                  if (!entry.cantidad || entry.cantidad <= 0) {
                    alert('⚠️ Ingrese una cantidad válida mayor a 0');
                    return;
                  }
                  if (entry.precioUnitario < 0 || isNaN(entry.precioUnitario)) {
                    alert('⚠️ Ingrese un precio unitario válido');
                    return;
                  }

                  const prod = productos.find(p => p.id === entry.productoId);
                  if (!prod) {
                    alert('❌ Producto no encontrado');
                    return;
                  }

                  // Verificar si el producto ya está en la lista
                  const exists = purchaseItems.find(item => item.productoId === prod.id);
                  if (exists) {
                    const confirm = window.confirm(
                      `El producto "${prod.nombre}" ya está en la lista.\n¿Desea agregarlo nuevamente?`
                    );
                    if (!confirm) return;
                  }

                  const newItem: PurchaseItem = {
                    productoId: prod.id,
                    nombre: prod.nombre,
                    cantidad: entry.cantidad,
                    precioUnitario: entry.precioUnitario,
                    unidad: getUnidadSimbolo(prod.unidadMedida) || 'unidad',
                  };

                  setPurchaseItems([...purchaseItems, newItem]);
                  
                  // Limpiar formulario
                  setEntry({ productoId: '', cantidad: 1, precioCompraTotal: 0, precioUnitario: 0 });
                  
                  console.log('✅ Producto agregado:', newItem);
                }}
                className="px-6 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 text-sm font-medium shadow-sm hover:shadow transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Agregar Producto
              </button>
            </div>
          </div>

          {/* Total */}
          <div className="mt-4 flex justify-between items-center text-lg font-bold">
            <span className="text-gray-800">TOTAL:</span>
            <span className="text-blue-600">
              S/ {purchaseItems.reduce((sum, it) => sum + (it.cantidad * it.precioUnitario), 0).toFixed(2)}
            </span>
          </div>

          {/* Acciones */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setEditModalOpen(false);
                setEditingPurchase(null);
                setPurchaseItems([]);
              }}
              className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
              disabled={registering}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={registering || purchaseItems.length === 0}
              className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {registering ? 'Actualizando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </Modal>

      {/* El formulario simple se ha eliminado para evitar duplicidad y confusión */}

    </div>
  );
}

function getUnidadSimbolo(unidad: unknown | null | undefined) {
  if (!unidad || typeof unidad !== 'object') return undefined;
  const anyU = unidad as Record<string, unknown>;
  if (typeof anyU['simbolo'] === 'string') return String(anyU['simbolo']);
  return undefined;
}