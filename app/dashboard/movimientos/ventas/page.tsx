"use client";

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
// Filtros personalizados locales para ventas
import { Eye, Printer, Edit2 } from 'lucide-react';
import { emitirInventarioEvento } from '@/lib/inventory-channel';
import { MovimientoRow } from '@/components/dashboard/movimientos/Table';
import { useAuth } from '@/hooks/useAuth';

const Modal = dynamic(() => import('@/components/ui/Modal'), { ssr: false });

type ProductoOption = {
  id: string;
  nombre: string;
  sku: string | null;
  unidadMedida?: { simbolo: string } | null;
};

type ClienteOption = {
  id: string;
  nombre: string;
  email?: string | null;
};

type SaleItem = {
  productoId: string;
  nombre: string;
  cantidad: number;
  precio: number;
  unidad?: string | null;
};

type Sale = {
  id: string;
  fecha: string; // ISO
  clienteId: string;
  clienteNombre: string;
  motivo: string;
  usuario: string;
  items: SaleItem[];
  numeroPedido?: string;
  fechaEntrega?: string;
  estado?: 'PENDIENTE' | 'ENTREGADO';
};

type VentasFiltersState = {
  searchTerm: string;
  fechaDesde: string;
  fechaHasta: string;
  pageSize: number;
  estado: 'all' | 'PENDIENTE' | 'ENTREGADO';
};

function formatDateTimeLocal(date: Date) {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

// Fecha local sin hora para inputs tipo "date" (formato YYYY-MM-DD)
function formatDateLocal(date: Date) {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  return `${yyyy}-${mm}-${dd}`;
}

// Reglas de validaciÃ³n para cantidades
const MIN_QTY = 1;
const MAX_QTY = 10000;
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export default function MovimientosVentasPage() {
  const { user } = useAuth();

  const [filters, setFilters] = useState<VentasFiltersState>({
    searchTerm: '',
    fechaDesde: '',
    fechaHasta: '',
    pageSize: 10,
    estado: 'all',
  });

  // Ventas cargadas desde la API
  const [sales, setSales] = useState<Sale[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);

  // Selectores
  const [productos, setProductos] = useState<ProductoOption[]>([]);
  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [loadingClientes, setLoadingClientes] = useState(false);

  // Formulario principal (atributos de la venta)
  const [form, setForm] = useState({
    fecha: formatDateTimeLocal(new Date()),
    motivo: '',
    clienteId: '',
  });

  // Entrada de Ã­tem actual (solo seleccion de producto)
  const [entry, setEntry] = useState({
    productoId: '',
  });

  // Ãtems agregados a la venta actual
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);

  // Estado del modal y fechas del pedido (debe inicializarse antes de su uso)
  const [registerOpen, setRegisterOpen] = useState(false);
  const [orderInfo, setOrderInfo] = useState({
    fechaPedido: formatDateLocal(new Date()),
    fechaEntrega: formatDateLocal(new Date()),
  });

  // Eliminado: total del Ã­tem anterior, ahora se calcula sobre saleItems

  const saleTotal = useMemo(() => {
    return saleItems.reduce((sum, it) => sum + it.cantidad * it.precio, 0);
  }, [saleItems]);

  useEffect(() => {
    // Cargar datos iniciales
    fetchSales();
    
    const fetchProductos = async () => {
      try {
        setLoadingProductos(true);
        const res = await fetch('/api/inventario?action=productos');
        if (res.ok) {
          const json = await res.json();
          const arr = json?.productos || [];
          const opts: ProductoOption[] = arr.map((p: any) => ({
            id: p.id,
            nombre: p.nombre,
            sku: p.sku ?? null,
            unidadMedida: p.unidadMedida ?? null,
          }));
          setProductos(opts);
        }
      } catch {
        // noop
      } finally {
        setLoadingProductos(false);
      }
    };

    const fetchClientes = async () => {
      try {
        setLoadingClientes(true);
        const res = await fetch('/api/clientes?limit=50');
        if (res.ok) {
          const json = await res.json();
          const arr = json?.data || [];
          const opts: ClienteOption[] = arr.map((c: any) => ({
            id: c.id,
            nombre: c.nombre,
            email: c.email ?? null,
          }));
          setClientes(opts);
        }
      } catch {
        // noop
      } finally {
        setLoadingClientes(false);
      }
    };

    fetchProductos();
    fetchClientes();
  }, []);

  const selectedProducto = useMemo(
    () => productos.find(p => p.id === entry.productoId) || null,
    [productos, entry.productoId]
  );

  const selectedCliente = useMemo(
    () => clientes.find(c => c.id === form.clienteId) || null,
    [clientes, form.clienteId]
  );

  // Estado de validaciÃ³n
  const [creationDate, setCreationDate] = useState<string>(formatDateLocal(new Date()));
  const [errors, setErrors] = useState<{ orderDate?: string; quantity?: string }>({});

  // Eliminado: agregar a la lista se realiza automaticamente al seleccionar producto

  const isOrderDateValid = useMemo(() => {
    const pedido = new Date(orderInfo.fechaPedido);
    const creado = new Date(creationDate);
    return pedido.getTime() >= creado.getTime();
  }, [orderInfo.fechaPedido, creationDate]);

  const areItemQuantitiesValid = useMemo(() => (
    saleItems.every(it => it.cantidad >= MIN_QTY && it.cantidad <= MAX_QTY)
  ), [saleItems]);

  const canRegisterSale = Boolean(form.fecha && form.clienteId && saleItems.length > 0 && isOrderDateValid && areItemQuantitiesValid);
  const [registering, setRegistering] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Función para cargar pedidos de venta
  const fetchSales = async (showLoading = true) => {
    try {
      if (showLoading) setLoadingSales(true);
      const res = await fetch('/api/pedidos-venta?page=1&limit=50');
      if (res.ok) {
        const json = await res.json();
        const arr = Array.isArray(json?.data) ? json.data : [];
        const salesList: Sale[] = arr.map((p: any) => ({
          id: p.id,
          numero: p.numero || `PV-${p.id}`,
          fecha: p.fecha || new Date().toISOString(),
          clienteId: p.clienteId || '',
          clienteNombre: p.cliente?.nombre || 'Cliente',
          usuario: p.usuario?.name || 'Sistema',
          items: Array.isArray(p.items) ? p.items.map((item: any) => ({
            productoId: item.productoId || '',
            nombre: item.producto?.nombre || 'Producto',
            cantidad: Number(item.cantidad) || 0,
            precio: Number(item.precio) || 0,
            unidad: item.producto?.unidadMedida?.simbolo || 'unidad',
          })) : [],
          total: Number(p.total) || 0,
          subtotal: Number(p.subtotal) || 0,
          impuestos: Number(p.impuestos) || 0,
          observaciones: p.observaciones || '',
          motivo: p.observaciones || `Venta #${p.numero || p.id}`,
          estado: p.estado || 'PENDIENTE',
          fechaEntrega: p.fechaEntrega || null,
        }));
        setSales(salesList);
      }
    } catch (error) {
      console.error('Error al cargar pedidos de venta:', error);
    } finally {
      if (showLoading) setLoadingSales(false);
    }
  };

  const handleRegisterSale = async () => {
    if (!canRegisterSale || registering) return;
    setSubmitError(null);
    setRegistering(true);
    try {
      const payload = {
        clienteId: selectedCliente?.id || form.clienteId,
        fecha: form.fecha,
        motivo: form.motivo || `Venta a ${selectedCliente?.nombre ?? 'Cliente'}`,
        items: saleItems.map(it => ({ productoId: it.productoId, cantidad: it.cantidad, precio: it.precio })),
      };
      const res = await fetch('/api/pedidos-venta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) {
        const msg = json?.error || `Error ${res.status}`;
        setSubmitError(msg);
        alert(`No se pudo registrar la venta: ${msg}`);
        return;
      }
      const { data } = json;
      
      // Recargar datos desde la API para mostrar la venta actualizada
      await fetchSales(false);
      
      try {
        saleItems.forEach(it => {
          if (it.productoId && it.cantidad > 0) {
            emitirInventarioEvento({ tipo: 'SALIDA', productoId: it.productoId, delta: it.cantidad });
          }
        });
      } catch {}
      setSaleItems([]);
      setForm(f => ({ ...f, motivo: '' }));
    } finally {
      setRegistering(false);
    }
  };

  // Derivar filas para la tabla desde sales
  const rows = useMemo<MovimientoRow[]>(() => {
    return sales.map((s) => {
      const count = s.items.length;
      const productoLabel = count === 1 ? s.items[0].nombre : `${s.items[0].nombre} (+${count - 1})`;
      const cantidadTotal = s.items.reduce((acc, it) => acc + it.cantidad, 0);
      return {
        id: s.id,
        fecha: s.fecha,
        producto: productoLabel,
        tipo: 'VENTA',
        cantidad: cantidadTotal,
        motivo: s.motivo,
        usuario: s.usuario,
      } as MovimientoRow;
    });
  }, [sales]);

  const filtered = useMemo(() => {
    let rs = rows;
    const { searchTerm, fechaDesde, fechaHasta } = filters;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      rs = rs.filter(r =>
        r.producto.toLowerCase().includes(term) ||
        (r.motivo ?? '').toLowerCase().includes(term)
      );
    }

    if (fechaDesde) {
      const desde = new Date(fechaDesde).getTime();
      rs = rs.filter(r => new Date(r.fecha).getTime() >= desde);
    }
    if (fechaHasta) {
      const hasta = new Date(fechaHasta).getTime();
      rs = rs.filter(r => new Date(r.fecha).getTime() <= hasta);
    }

    return rs;
  }, [rows, filters]);

  // Modal de detalle
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailSale, setDetailSale] = useState<Sale | null>(null);

  const openDetail = (saleId: string) => {
    const sale = sales.find(s => s.id === saleId) || null;
    setDetailSale(sale);
    setDetailOpen(true);
  };

  // Modal adicional para registrar venta con vista detallada

  const previewCurrentSale = () => {
    // Construir venta temporal para previsualizaciÃ³n
    const tmp: Sale = {
      id: 'preview',
      fecha: new Date(form.fecha).toISOString(),
      clienteId: selectedCliente?.id || form.clienteId,
      clienteNombre: selectedCliente?.nombre || 'Cliente',
      motivo: form.motivo || 'Venta',
      usuario: user?.name ?? 'usuario',
      items: saleItems,
    };
    setDetailSale(tmp);
    setDetailOpen(true);
  };

  const handleConfirmRegisterFromModal = async () => {
    // Reutiliza handleRegisterSale pero dentro del contexto del modal
    if (!isOrderDateValid) {
      setErrors(prev => ({ ...prev, orderDate: 'La fecha del pedido no puede ser anterior a la fecha de creaciÃ³n.' }));
      return;
    } else {
      setErrors(prev => ({ ...prev, orderDate: '' }));
    }
    if (!areItemQuantitiesValid) {
      setErrors(prev => ({ ...prev, quantity: `La cantidad debe estar entre ${MIN_QTY} y ${MAX_QTY}.` }));
      return;
    } else {
      setErrors(prev => ({ ...prev, quantity: '' }));
    }
    if (!canRegisterSale || registering) return;
    setSubmitError(null);
    setRegistering(true);
    try {
      const numeroPedido = `PV-${String(Date.now()).slice(-6)}`;
      const payload = {
        clienteId: selectedCliente?.id || form.clienteId,
        fecha: orderInfo.fechaPedido,
        motivo: form.motivo || `Pedido de venta #${numeroPedido}`,
        numeroPedido,
        fechaEntrega: orderInfo.fechaEntrega || undefined,
        items: saleItems.map(it => ({ productoId: it.productoId, cantidad: it.cantidad, precio: it.precio })),
      };
      const res = await fetch('/api/pedidos-venta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) {
        const msg = json?.error || `Error ${res.status}`;
        setSubmitError(msg);
        alert(`No se pudo registrar la venta: ${msg}`);
        return;
      }
      const { data } = json;
      
      // Recargar datos desde la API para mostrar la venta actualizada
      await fetchSales(false);
      
      try {
        saleItems.forEach(it => {
          if (it.productoId && it.cantidad > 0) {
            emitirInventarioEvento({ tipo: 'SALIDA', productoId: it.productoId, delta: it.cantidad });
          }
        });
      } catch {}
      setSaleItems([]);
      setForm(f => ({ ...f, motivo: '' }));
      setRegisterOpen(false);
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Movimientos - Ventas</h1>
        <p className="text-gray-600">Salidas de inventario derivadas de ventas</p>
      </div>

      {/* AcciÃ³n principal: solo el botÃ³n */}
      <div className="flex justify-end mb-3">
        <button
          type="button"
          onClick={() => {
            // Reinicia el estado del formulario exclusivo del modal
            setEntry({ productoId: '' });
            setSaleItems([]);
            setForm({ fecha: formatDateTimeLocal(new Date()), motivo: '', clienteId: '' });
            setOrderInfo({ fechaPedido: formatDateLocal(new Date()), fechaEntrega: formatDateLocal(new Date()) });
            setCreationDate(formatDateLocal(new Date()));
            setErrors({ orderDate: '', quantity: '' });
            setRegisterOpen(true);
          }}
          className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700"
        >
          Registrar venta
        </button>
      </div>

      {/* Lista y filtros (atributos solicitados) */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Barra de filtros personalizada para ventas */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-3 md:space-y-0">
            {/* Buscador */}
            <div className="relative w-full md:max-w-sm">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M12.9 14.32a8 8 0 111.414-1.414l4.387 4.387a1 1 0 01-1.414 1.414l-4.387-4.387zM14 8a6 6 0 11-12 0 6 6 0 0112 0z" clipRule="evenodd" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Buscar ventas"
                aria-label="Buscar ventas por nÃºmero, cliente o motivo"
                value={filters.searchTerm}
                onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500 w-full"
              />
            </div>

            {/* Estado de pedido */}
            <div className="flex items-center space-x-2">
              <label htmlFor="estado-filter" className="text-sm text-gray-600">Estado</label>
              <select
                id="estado-filter"
                value={filters.estado}
                onChange={(e) => setFilters(prev => ({ ...prev, estado: e.target.value as 'all' | 'PENDIENTE' | 'ENTREGADO' }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="all">Todos</option>
                <option value="PENDIENTE">Pendiente</option>
                <option value="ENTREGADO">Entregado</option>
              </select>
            </div>

            {/* Fecha desde */}
            <div className="flex items-center space-x-2">
              <label htmlFor="fecha-desde" className="text-sm text-gray-600">Desde</label>
              <input
                id="fecha-desde"
                type="date"
                value={filters.fechaDesde}
                onChange={(e) => setFilters(prev => ({ ...prev, fechaDesde: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            {/* Fecha hasta */}
            <div className="flex items-center space-x-2">
              <label htmlFor="fecha-hasta" className="text-sm text-gray-600">Hasta</label>
              <input
                id="fecha-hasta"
                type="date"
                value={filters.fechaHasta}
                onChange={(e) => setFilters(prev => ({ ...prev, fechaHasta: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            {/* TamaÃ±o de pÃ¡gina */}
            <div className="flex items-center space-x-2">
              <label htmlFor="page-size" className="text-sm text-gray-600">Por pÃ¡gina</label>
              <select
                id="page-size"
                value={filters.pageSize}
                onChange={(e) => setFilters(prev => ({ ...prev, pageSize: parseInt(e.target.value, 10) }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NÂ° Pedido</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha de pedido</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha de entrega</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total de la venta</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loadingSales ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    Cargando ventas...
                  </td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    No hay ventas registradas
                  </td>
                </tr>
              ) : sales
                .filter((s) => {
                  const { searchTerm, fechaDesde, fechaHasta } = filters;
                  let ok = true;
                  if (searchTerm) {
                    const term = searchTerm.toLowerCase();
                    const numero = s.numeroPedido ?? (s.motivo?.split('#')[1] ?? '');
                    ok = ok && (
                      (numero?.toLowerCase().includes(term)) ||
                      (s.clienteNombre?.toLowerCase().includes(term)) ||
                      (s.motivo?.toLowerCase().includes(term))
                    );
                  }
                  if (fechaDesde) {
                    ok = ok && (new Date(s.fecha).getTime() >= new Date(fechaDesde).getTime());
                  }
                  if (fechaHasta) {
                    ok = ok && (new Date(s.fecha).getTime() <= new Date(fechaHasta).getTime());
                  }
                  if (filters.estado && filters.estado !== 'all') {
                    ok = ok && ((s.estado ?? 'PENDIENTE') === filters.estado);
                  }
                  return ok;
                })
                .map((s) => {
                  const total = s.items.reduce((acc, it) => acc + it.cantidad * it.precio, 0);
                  const numero = s.numeroPedido ?? (s.motivo?.includes('#') ? s.motivo.split('#')[1] : '-');
                  return (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{numero}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{s.clienteNombre}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(s.fecha).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{s.fechaEntrega ? new Date(s.fechaEntrega).toLocaleDateString() : '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${s.estado === 'ENTREGADO' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {s.estado ?? 'PENDIENTE'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(total)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            title="Ver"
                            onClick={() => openDetail(s.id)}
                            className="text-green-600 hover:text-green-800"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            title="Imprimir"
                            onClick={() => { openDetail(s.id); setTimeout(() => window.print(), 300); }}
                            className="text-gray-700 hover:text-gray-900"
                          >
                            <Printer className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            title="Editar"
                            onClick={() => alert('Edición de venta pendiente')}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit2 className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de detalle de venta (rediseÃ±ado) */}
      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} ariaLabel="Detalle de venta">
        <div className="w-full">
          {/* Encabezado: NÂ° Pedido + Estado + Datestamp */}
          <div className="px-2">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Pedido {detailSale ? (detailSale.numeroPedido ?? (detailSale.motivo?.includes('#') ? detailSale.motivo.split('#')[1] : 'â€”')) : 'â€”'}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Creado el {detailSale ? new Date(detailSale.fecha).toLocaleDateString() : 'â€”'}
                </p>
              </div>
              {detailSale && (
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${detailSale.estado === 'ENTREGADO' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {detailSale.estado ?? 'PENDIENTE'}
                </span>
              )}
            </div>
          </div>

          {/* InformaciÃ³n de la venta + Totales */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 bg-white">
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-36 text-gray-500">Cliente</span>
                  <span className="font-medium text-gray-900">{detailSale?.clienteNombre ?? 'â€”'}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-36 text-gray-500">Fecha de pedido</span>
                  <span>{detailSale ? new Date(detailSale.fecha).toLocaleDateString() : 'â€”'}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-36 text-gray-500">Fecha de entrega</span>
                  <span>{detailSale?.fechaEntrega ? new Date(detailSale.fechaEntrega).toLocaleDateString() : 'â€”'}</span>
                </div>
              </div>
            </div>
            <div className="md:col-span-1">
              <div className="bg-gray-50 border rounded-lg p-4">
                <div className="flex items-center justify-between text-sm text-gray-700">
                  <span>Subtotal</span>
                  <span>{new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(detailSale?.items?.reduce((s, it) => s + it.cantidad * it.precio, 0) || 0)}</span>
                </div>
                <div className="mt-2 pt-2 border-t flex items-center justify-between text-sm font-semibold text-green-700">
                  <span>Total</span>
                  <span>{new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(detailSale?.items?.reduce((s, it) => s + it.cantidad * it.precio, 0) || 0)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Productos */}
          <div className="mt-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Productos</h4>
            {detailSale?.items?.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio Unit.</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {detailSale.items.map((it, idx) => (
                      <tr key={`${detailSale.id}-${idx}`}>
                        <td className="px-4 py-2 text-sm text-gray-900">{it.nombre}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{it.cantidad}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(it.precio)}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(it.cantidad * it.precio)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-sm text-gray-600">No hay productos en esta venta.</div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={() => setDetailOpen(false)} className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100">Cerrar</button>
          </div>
        </div>
      </Modal>

      {/* Modal adicional: Registrar Venta (vista ampliada) */}
      <Modal isOpen={registerOpen} onClose={() => setRegisterOpen(false)} ariaLabel="Registrar venta">
        <form className="w-full" onSubmit={(e) => { e.preventDefault(); handleConfirmRegisterFromModal(); }}>
          {/* Encabezado */}
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="text-lg font-bold text-gray-900">Registrar Venta</h3>
          </div>

          {/* SecciÃ³n 1: Formulario de venta */}
          <div className="mt-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Productos y datos del cliente</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Producto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Producto</label>
                <select
                  value={entry.productoId}
                  onChange={(e) => {
                    const id = e.target.value;
                    // Establece selección y agrega automáticamente a la lista
                    setEntry(prev => ({ ...prev, productoId: id }));
                    if (id) {
                      const prod = productos.find(p => p.id === id);
                      setSaleItems(prev => ([
                        ...prev,
                        {
                          productoId: id,
                          nombre: prod?.nombre ?? 'Producto',
                          cantidad: 1,
                          precio: 0,
                          unidad: prod?.unidadMedida?.simbolo ?? null,
                        },
                      ]));
                      // Limpia la selecciÃ³n para permitir nuevas adiciones
                      setEntry(prev => ({ ...prev, productoId: '' }));
                    }
                  }}
                  className="w-full px-3 py-2 rounded-md border border-gray-300 focus:border-green-600 focus:ring-2 focus:ring-green-200"
                >
                  <option value="" disabled>{loadingProductos ? 'Cargando productos...' : 'Seleccione un producto'}</option>
                  {productos.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}{p.unidadMedida?.simbolo ? ` (${p.unidadMedida.simbolo})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cliente */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                <select
                  value={form.clienteId}
                  onChange={(e) => setForm(prev => ({ ...prev, clienteId: e.target.value }))}
                  className="w-full px-3 py-2 rounded-md border border-gray-300 focus:border-green-600 focus:ring-2 focus:ring-green-200"
                >
                  <option value="" disabled>{loadingClientes ? 'Cargando clientes...' : 'Seleccione un cliente'}</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Campos eliminados: precio de venta y cantidad.
                  Ahora se editan directamente por fila en la lista de productos. */}
              
              {/* Campos eliminados: precio de venta, cantidad y precio unitario.
                  Ahora se editan directamente en la lista de productos. */}
            </div>

            {/* Resumen de total */}
            <div className="mt-3 flex items-center">
              <div className="ml-auto text-sm">
                Total venta: <span className="font-semibold text-indigo-700">{new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(saleTotal || 0)}</span>
              </div>
            </div>

            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">PRODUCTO</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">CANT.</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">UNIDAD</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">P. UNITARIO</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">SUBTOTAL</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {saleItems.length === 0 ? (
                    <tr>
                      <td className="px-4 py-2 text-sm text-gray-600" colSpan={5}>Sin productos agregados</td>
                    </tr>
                  ) : saleItems.map((it, idx) => (
                    <tr key={`itm-${idx}`}>
                      <td className="px-4 py-2 text-sm text-gray-900">{it.nombre}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={MIN_QTY}
                            max={MAX_QTY}
                            step={1}
                            value={it.cantidad}
                            onKeyDown={(e) => { if (["e","E","+","-","."].includes(e.key)) e.preventDefault(); }}
                            onChange={(e) => {
                              const n = clamp(Number(e.target.value || 0), MIN_QTY, MAX_QTY);
                              setSaleItems(prev => prev.map((p, i2) => i2 === idx ? ({ ...p, cantidad: n }) : p));
                            }}
                            className="w-24 px-2 py-1 rounded-md border border-gray-300 focus:border-green-600 focus:ring-2 focus:ring-green-200"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        <select
                          value={it.unidad ?? (productos.find(p => p.id === it.productoId)?.unidadMedida?.simbolo ?? '')}
                          disabled
                          className="w-24 px-2 py-1 rounded-md border border-gray-300 bg-gray-50"
                        >
                          <option value={it.unidad ?? (productos.find(p => p.id === it.productoId)?.unidadMedida?.simbolo ?? '')}>
                            {it.unidad ?? (productos.find(p => p.id === it.productoId)?.unidadMedida?.simbolo ?? '')}
                          </option>
                        </select>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={it.precio}
                            onKeyDown={(e) => { if (["e","E","+","-"].includes(e.key)) e.preventDefault(); }}
                            onChange={(e) => {
                              const n = Number(e.target.value || 0);
                              setSaleItems(prev => prev.map((p, i2) => i2 === idx ? ({ ...p, precio: n }) : p));
                            }}
                            className="w-28 px-2 py-1 rounded-md border border-gray-300 focus:border-green-600 focus:ring-2 focus:ring-green-200"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        <div className="flex items-center justify-between">
                          <span>{new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(it.cantidad * it.precio)}</span>
                          <button
                            type="button"
                            onClick={() => setSaleItems(prev => prev.filter((_, i) => i !== idx))}
                            className="text-red-600 hover:text-red-800"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SecciÃ³n 2: Datos del pedido */}
          <div className="mt-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Datos del pedido</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha del pedido</label>
            <input
              type="date"
              value={orderInfo.fechaPedido}
              onChange={(e) => setOrderInfo(prev => ({ ...prev, fechaPedido: e.target.value }))}
              className="w-full px-3 py-2 rounded-md border border-gray-300 focus:border-green-600 focus:ring-2 focus:ring-green-200"
            />
            {!isOrderDateValid && (
              <p className="mt-1 text-xs text-red-600">{errors.orderDate || 'La fecha del pedido no puede ser anterior a la fecha de creaciÃ³n.'}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de entrega</label>
            <input
              type="date"
              value={orderInfo.fechaEntrega}
              onChange={(e) => setOrderInfo(prev => ({ ...prev, fechaEntrega: e.target.value }))}
              className="w-full px-3 py-2 rounded-md border border-gray-300 focus:border-green-600 focus:ring-2 focus:ring-green-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Total</label>
            <input
              type="text"
              value={new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(saleTotal || 0)}
              readOnly
              className="w-full px-3 py-2 rounded-md border border-gray-300 bg-gray-50"
            />
          </div>
        </div>
          </div>

          {/* Footer acciones */}
          <div className="mt-6 flex justify-end gap-3 border-t pt-4">
            <button type="button" onClick={() => setRegisterOpen(false)} className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100">Cancelar</button>
            <button
              type="submit"
              disabled={!canRegisterSale}
              className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
            >
              Confirmar registro
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
