"use client";

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import dynamic from 'next/dynamic';
// Filtros personalizados locales para ventas
import { Eye, Printer, Edit2 } from 'lucide-react';
import { MovimientoRow } from '../../../../src/components/dashboard/movimientos/Table';
import { useAuth } from '../../../../src/hooks/useAuth';

const Modal = dynamic(() => import('../../../../src/components/ui/Modal'), { ssr: false });

type ProductoOption = {
  id: string;
nombre: string;
// preserve original fields for defensive display
razonSocial?: string | null;
nombres?: string | null;
apellidos?: string | null;
numeroIdentificacion?: string | null;
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
  estado?: 'PENDIENTE' | 'CONFIRMADO' | 'EN_PROCESO' | 'ENTREGADO' | 'CANCELADO';
};

type VentasFiltersState = {
  searchTerm: string;
  fechaDesde: string;
  fechaHasta: string;
  pageSize: number;
  estado: 'all' | 'PENDIENTE' | 'CONFIRMADO' | 'EN_PROCESO' | 'ENTREGADO' | 'CANCELADO';
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

// Reglas de validación para cantidades
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

  // Ventas con múltiples productos (mock inicial + registros locales)
  const [sales, setSales] = useState<Sale[]>([]);

  // Selectores
  const [productos, setProductos] = useState<ProductoOption[]>([]);
  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [loadingVentas, setLoadingVentas] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Formulario principal (atributos de la venta)
  const [form, setForm] = useState({
    fecha: formatDateTimeLocal(new Date()),
    motivo: '',
    clienteId: '',
  });

  // Entrada de ítem actual (solo selección de producto)
  const [entry, setEntry] = useState({
    productoId: '',
  });

  // Ítems agregados a la venta actual
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);

  // Estado del modal y fechas del pedido (debe inicializarse antes de su uso)
  const [registerOpen, setRegisterOpen] = useState(false);
  const [orderInfo, setOrderInfo] = useState({
    fechaPedido: formatDateLocal(new Date()),
    fechaEntrega: formatDateLocal(new Date()),
  });

  // Estados para modal de éxito
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successOrderInfo, setSuccessOrderInfo] = useState<{ numero: string; total: number } | null>(null);

  // Edición de venta
  const [editOpen, setEditOpen] = useState(false);
  const [editSale, setEditSale] = useState<Sale | null>(null);
  const [editOrderInfo, setEditOrderInfo] = useState({
    fechaPedido: formatDateLocal(new Date()),
    fechaEntrega: '' as string | undefined,
    motivo: ''
  });
  const [editItems, setEditItems] = useState<SaleItem[]>([]);
  const [editEntry, setEditEntry] = useState({ productoId: '' });
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Eliminado: total del ítem anterior, ahora se calcula sobre saleItems

  const saleTotal = useMemo(() => {
    return saleItems.reduce((sum, it) => sum + it.cantidad * it.precio, 0);
  }, [saleItems]);

  useEffect(() => {
    const fetchProductos = async () => {
      try {
        setLoadingProductos(true);
  console.log('🔍 Cargando productos desde /api/productos...');
        const res = await fetch('/api/productos?limit=1000', { cache: 'no-store' });
        console.log('📡 Respuesta de productos:', res.status, res.ok);
        if (res.ok) {
          const json = await res.json().catch(() => null);
          console.log('📦 JSON recibido:', json);
          
          // La API devuelve directamente el array de productos en json.data
          const arr = Array.isArray(json?.data)
            ? json.data
            : Array.isArray(json)
              ? json
              : [];
          
          console.log('📋 Array de productos:', arr.length, 'productos');
          
          const opts: ProductoOption[] = (arr as unknown[]).map((p: unknown) => {
            const o = p as Record<string, unknown>;
            return {
              id: String(o.id ?? ''),
              nombre: String(o.nombre ?? ''),
              sku: (o.sku ?? null) as string | null,
              unidadMedida: (o.unidadMedida ?? null) as { simbolo: string } | null,
            };
          });
          console.log('✅ Productos cargados:', opts.length);
          setProductos(opts);
        } else {
          console.error('❌ Error al cargar productos:', res.status);
          toast.error('No se pudieron cargar los productos');
        }
      } catch (error) {
        console.error('❌ Error en fetchProductos:', error);
        toast.error('Error al cargar productos');
      } finally {
        setLoadingProductos(false);
      }
    };

    const fetchClientes = async () => {
      try {
        setLoadingClientes(true);
  console.log('🔍 Cargando clientes desde /api/clientes...');
        const res = await fetch('/api/clientes?limit=1000', { cache: 'no-store' });
        console.log('📡 Respuesta de clientes:', res.status, res.ok);
        if (res.ok) {
          const json = await res.json().catch(() => null);
          console.log('📦 JSON de clientes recibido:', json);
          
          const arr = json?.data?.data ?? json?.data ?? json?.clientes ?? json ?? [];
          console.log('📋 Array de clientes:', Array.isArray(arr) ? arr.length : 'no es array');
          
          const opts: ClienteOption[] = (Array.isArray(arr) ? arr : []).map((c: unknown) => {
            const o = c as Record<string, unknown>;
            const razonSocial = typeof o.razonSocial === 'string' ? o.razonSocial : null;
            const nombres = typeof o.nombres === 'string' ? o.nombres : null;
            const apellidos = typeof o.apellidos === 'string' ? o.apellidos : null;
            const numeroIdentificacion = typeof o.numeroIdentificacion === 'string' ? o.numeroIdentificacion : null;
            const nombreFromParts = (nombres || apellidos) ? `${(nombres || '')} ${(apellidos || '')}`.trim() : '';
            const nombreCalc = String(o.nombre ?? razonSocial ?? nombreFromParts ?? numeroIdentificacion ?? '');
            return {
              id: String(o.id ?? ''),
              nombre: nombreCalc,
              razonSocial,
              nombres,
              apellidos,
              numeroIdentificacion,
              email: (o.email ?? null) as string | null,
            } as ClienteOption;
          });
          console.log('✅ Clientes cargados:', opts.length);
          setClientes(opts);
        } else {
          console.error('❌ Error al cargar clientes:', res.status);
          toast.error('No se pudieron cargar los clientes');
        }
      } catch (error) {
        console.error('❌ Error en fetchClientes:', error);
        toast.error('Error al cargar clientes');
      } finally {
        setLoadingClientes(false);
      }
    };

    const fetchVentas = async () => {
      try {
        setLoadingVentas(true);
  console.log('🔍 Cargando ventas desde /api/pedidos-venta...');
        const res = await fetch('/api/pedidos-venta?limit=100', { cache: 'no-store' });
        console.log('📡 Respuesta de ventas:', res.status, res.ok);
        if (res.ok) {
          const json = await res.json().catch(() => null);
          console.log('📦 JSON de ventas recibido:', json);
          
          const arr = json?.data ?? [];
          console.log('📋 Array de ventas:', Array.isArray(arr) ? arr.length : 'no es array', arr);
          
          const ventas: Sale[] = (Array.isArray(arr) ? arr : []).map((v: any) => ({
            id: v.id,
            fecha: v.fecha,
            clienteId: v.clienteId,
            clienteNombre: v.cliente?.nombre || v.cliente?.razonSocial || 'Cliente',
            motivo: v.observaciones || v.motivo || `Pedido #${v.numero}`,
            usuario: v.usuario?.name || v.usuario?.email || 'usuario',
            numeroPedido: v.numero,
            fechaEntrega: v.fechaEntrega,
            estado: v.estado,
            items: (v.items || []).map((item: any) => ({
              productoId: item.productoId,
              nombre: item.producto?.nombre || 'Producto',
              cantidad: item.cantidad,
              precio: item.precio,
              unidad: item.producto?.unidadMedida?.simbolo || 'unidad',
            })),
          }));
          
          console.log('✅ Ventas cargadas:', ventas.length);
          setSales(ventas);
        } else {
          console.error('❌ Error al cargar ventas:', res.status);
          toast.error('No se pudieron cargar las ventas');
        }
      } catch (error) {
        console.error('❌ Error en fetchVentas:', error);
        toast.error('Error al cargar ventas');
      } finally {
        setLoadingVentas(false);
      }
    };

    fetchProductos();
    fetchClientes();
    fetchVentas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedCliente = useMemo(
    () => clientes.find(c => c.id === form.clienteId) || null,
    [clientes, form.clienteId]
  );

  // Función para recargar ventas
  const recargarVentas = async () => {
    try {
      setLoadingVentas(true);
      console.log('🔄 Recargando ventas...');
      const res = await fetch('/api/pedidos-venta?limit=100', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json().catch(() => null);
        const arr = json?.data ?? [];
        
        const ventas: Sale[] = (Array.isArray(arr) ? arr : []).map((v: any) => ({
          id: v.id,
          fecha: v.fecha,
          clienteId: v.clienteId,
          clienteNombre: v.cliente?.nombre || v.cliente?.razonSocial || 'Cliente',
          motivo: v.observaciones || v.motivo || `Pedido #${v.numero}`,
          usuario: v.usuario?.name || v.usuario?.email || 'usuario',
          numeroPedido: v.numero,
          fechaEntrega: v.fechaEntrega,
          estado: v.estado,
          items: (v.items || []).map((item: any) => ({
            productoId: item.productoId,
            nombre: item.producto?.nombre || 'Producto',
            cantidad: item.cantidad,
            precio: item.precio,
            unidad: item.producto?.unidadMedida?.simbolo || 'unidad',
          })),
        }));
        
        console.log('✅ Ventas recargadas:', ventas.length);
        setSales(ventas);
      }
    } catch (error) {
      console.error('❌ Error al recargar ventas:', error);
    } finally {
      setLoadingVentas(false);
    }
  };

  // unidad symbol helper removed — not used in this file

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

  // Eliminado: flujo de agregar manual, ahora se gestiona desde la tabla de productos

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
      const id = data?.id || `s-${Date.now()}`;
      const fechaIso = new Date(form.fecha).toISOString();
      const nuevaSale: Sale = {
        id,
        fecha: fechaIso,
        clienteId: selectedCliente?.id || form.clienteId,
        clienteNombre: selectedCliente?.nombre || 'Cliente',
        motivo: payload.motivo,
        usuario: user?.name ?? 'usuario',
        items: saleItems,
      };
      setSales(prev => [nuevaSale, ...prev]);
            // No inventory emitter call here by design — keep registration flow
            // focused on persisting the sale and updating UI state only.
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
  const firstItem = s.items[0];
  const productoNombreLookup = firstItem ? (firstItem.nombre || productos.find(p => p.id === firstItem.productoId)?.nombre) : undefined;
  const productoLabel = count === 1 ? (productoNombreLookup ?? 'Producto') : `${productoNombreLookup ?? firstItem?.nombre ?? 'Producto'} (+${count - 1})`;
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

  const totalPages = useMemo(() => {
    const size = Math.max(1, Number(filters.pageSize || 10));
    return Math.max(1, Math.ceil(filtered.length / size));
  }, [filtered.length, filters.pageSize]);

  const paged = useMemo(() => {
    const size = Math.max(1, Number(filters.pageSize || 10));
    const page = Math.max(1, Math.min(currentPage, Math.ceil(filtered.length / size) || 1));
    const start = (page - 1) * size;
    return filtered.slice(start, start + size);
  }, [filtered, currentPage, filters.pageSize]);

  // Modal de detalle
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailSale, setDetailSale] = useState<Sale | null>(null);

  const openDetail = (saleId: string) => {
    const sale = sales.find(s => s.id === saleId) || null;
    setDetailSale(sale);
    setDetailOpen(true);
  };

  const openEdit = (saleId: string) => {
    const s = sales.find(x => x.id === saleId);
    if (!s) return;
    setEditSale(s);
    setEditOrderInfo({
      fechaPedido: formatDateLocal(new Date(s.fecha)),
      fechaEntrega: s.fechaEntrega ? formatDateLocal(new Date(s.fechaEntrega)) : '',
      motivo: s.motivo || ''
    });
    // Clonar items
    setEditItems(s.items.map(it => ({ ...it })));
    setEditEntry({ productoId: '' });
    setEditOpen(true);
  };

  // Función para imprimir una venta específica
  const printSale = (sale: Sale) => {
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
        <title>Venta ${sale.numeroPedido ?? sale.motivo ?? 'N/A'}</title>
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
          <h1>ORDEN DE VENTA</h1>
          <p><strong>${sale.numeroPedido ?? (sale.motivo?.includes('#') ? sale.motivo.split('#')[1] : 'N/A')}</strong></p>
        </div>
        
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Cliente:</span> ${sale.clienteNombre ?? 'N/A'}
          </div>
          <div class="info-item">
            <span class="info-label">Fecha de pedido:</span> ${new Date(sale.fecha).toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <div class="info-item">
            <span class="info-label">Fecha de entrega:</span> ${sale.fechaEntrega ? new Date(sale.fechaEntrega).toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' }) : 'No especificada'}
          </div>
          <div class="info-item">
            <span class="info-label">Hora:</span> ${new Date(sale.fecha).toLocaleTimeString('es-PE')}
          </div>
          <div class="info-item">
            <span class="info-label">Estado:</span> ${sale.estado ?? 'PENDIENTE'}
          </div>
        </div>

        <h3>Detalle de Productos</h3>
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Precio Unit.</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${sale.items?.map(item => `
              <tr>
                <td>${item.nombre}</td>
                <td>${item.cantidad}</td>
                <td>S/ ${item.precio.toFixed(2)}</td>
                <td>S/ ${(item.cantidad * item.precio).toFixed(2)}</td>
              </tr>
            `).join('') ?? ''}
          </tbody>
        </table>

        <div class="total">
          TOTAL: S/ ${(sale.items?.reduce((sum, item) => sum + (item.cantidad * item.precio), 0) ?? 0).toFixed(2)}
        </div>

        <div style="margin-top: 40px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #16a34a; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px;">
            Imprimir
          </button>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
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
      
      console.log('📤 Enviando pedido de venta:', payload);
      
      const res = await fetch('/api/pedidos-venta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      console.log('📡 Respuesta del servidor:', res.status, res.ok);
      
      const json = await res.json().catch(() => ({}));
      console.log('📦 JSON de respuesta:', json);
      
      if (!res.ok || !json?.success) {
        const msg = json?.error || json?.message || `Error ${res.status}`;
  setSubmitError(`No se pudo registrar la venta: ${msg}`);
  // Mantenemos log para diagnóstico pero sin alert bloqueante
  console.error('❌ Error al registrar venta:', msg);
        return;
      }
      
      const { data } = json;
      const id = data?.id || `s-${Date.now()}`;
      const fechaIso = new Date(orderInfo.fechaPedido).toISOString();
      const nuevaSale: Sale = {
        id,
        fecha: fechaIso,
        clienteId: selectedCliente?.id || form.clienteId,
        clienteNombre: selectedCliente?.nombre || 'Cliente',
        motivo: payload.motivo,
        usuario: user?.name ?? 'usuario',
        items: saleItems,
        numeroPedido: payload.numeroPedido,
        fechaEntrega: payload.fechaEntrega ? new Date(payload.fechaEntrega).toISOString() : undefined,
        estado: 'PENDIENTE',
      };
      
      console.log('✅ Venta registrada exitosamente:', nuevaSale);
      
      // No agregamos a la lista local, sino que recargamos desde la BD
      setSaleItems([]);
      setForm(f => ({ ...f, motivo: '' }));
      setRegisterOpen(false);
      
      // Mostrar modal de éxito con la información del pedido
      setSuccessOrderInfo({
        numero: data?.numero || payload.numeroPedido,
        total: saleTotal,
      });
      setSuccessModalOpen(true);
      
      // Recargar ventas desde la base de datos
      await recargarVentas();
    } catch (error) {
      console.error('❌ Error al registrar venta:', error);
      alert(`Error al registrar venta: ${error}`);
    } finally {
      setRegistering(false);
    }
  };

  return (
  <div className="p-6 space-y-6 overflow-x-hidden">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Movimientos - Ventas</h1>
        <p className="text-gray-600">Salidas de inventario derivadas de ventas</p>
      </div>

  {/* Acción principal: registrar venta */}
  <div className="flex justify-end mb-3">
    <button
      type="button"
      onClick={() => {
        // Reset form and items to defaults before opening
        setEntry({ productoId: '' });
        setSaleItems([]);
        setForm({ fecha: formatDateTimeLocal(new Date()), motivo: '', clienteId: '' });
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
                aria-label="Buscar ventas por número, cliente o motivo"
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
                onChange={(e) => setFilters(prev => ({ ...prev, estado: e.target.value as VentasFiltersState['estado'] }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="all">Todos</option>
                <option value="PENDIENTE">Pendiente</option>
                <option value="CONFIRMADO">Confirmado</option>
                <option value="EN_PROCESO">En Proceso</option>
                <option value="ENTREGADO">Entregado</option>
                <option value="CANCELADO">Cancelado</option>
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
              <label htmlFor="page-size" className="text-sm text-gray-600">Por página</label>
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
        <div className="w-full overflow-x-auto">
          <table className="min-w-max w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">N° Pedido</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha de pedido</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha de entrega</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total de la venta</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loadingVentas ? (
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
              ) : (
                sales
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
          const numero = s.numeroPedido || (s.motivo?.includes('#') ? s.motivo.split('#')[1] : '') || '-';
                  return (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{numero}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{s.clienteNombre}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(s.fecha).toLocaleDateString('es-PE')}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{s.fechaEntrega ? new Date(s.fechaEntrega).toLocaleDateString('es-PE') : '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          s.estado === 'ENTREGADO' ? 'bg-green-100 text-green-800' :
                          s.estado === 'CONFIRMADO' ? 'bg-blue-100 text-blue-800' :
                          s.estado === 'EN_PROCESO' ? 'bg-purple-100 text-purple-800' :
                          s.estado === 'CANCELADO' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {s.estado ?? 'PENDIENTE'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right tabular-nums">
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
                            onClick={() => openEdit(s.id)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit2 className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 flex items-center justify-between border-t bg-gray-50">
          <div className="text-sm text-gray-600">Mostrando {paged.length} de {filtered.length}</div>
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
            <button 
              type="button" 
              onClick={() => detailSale && printSale(detailSale)} 
              className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors"
            >
              Imprimir
            </button>
            <button 
              type="button" 
              onClick={() => setDetailOpen(false)} 
              className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              Cerrar
            </button>
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

          {/* Datos generales */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha del pedido</label>
              <input
                type="date"
                value={orderInfo.fechaPedido}
                onChange={(e) => setOrderInfo(prev => ({ ...prev, fechaPedido: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
              {!isOrderDateValid && (
                <p className="mt-1 text-xs text-red-600">{errors.orderDate || 'La fecha del pedido no puede ser anterior a la fecha de creación.'}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de entrega</label>
              <input
                type="date"
                value={orderInfo.fechaEntrega}
                onChange={(e) => setOrderInfo(prev => ({ ...prev, fechaEntrega: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
              <select
                value={form.clienteId}
                onChange={(e) => setForm(prev => ({ ...prev, clienteId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              >
                <option value="" disabled>
                  {loadingClientes 
                    ? 'Cargando clientes...' 
                    : clientes.length === 0 
                      ? 'No hay clientes disponibles' 
                      : 'Seleccione un cliente'
                  }
                </option>
                {clientes.map(c => (<option key={c.id} value={c.id}>{c.nombre}</option>))}
              </select>
              {!loadingClientes && clientes.length === 0 && (
                <p className="mt-1 text-sm text-amber-600">
                  No se encontraron clientes. <a href="/dashboard/clientes" className="text-blue-600 hover:text-blue-800 underline">Agregar cliente</a>
                </p>
              )}
            </div>
          </div>

          {/* Ítem de venta - selector de producto con botón */}
          <div className="mt-6 p-4 bg-green-50 rounded-lg border-2 border-green-200">
            <h4 className="text-sm font-semibold text-green-900 mb-3 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Agregar Producto a la Venta
            </h4>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Seleccione el producto <span className="text-red-500">*</span>
                </label>
                <select
                  value={entry.productoId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setEntry(prev => ({ ...prev, productoId: id }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">{loadingProductos ? 'Cargando productos...' : '-- Seleccione un producto --'}</option>
                  {productos.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} {p.sku ? `(${p.sku})` : ''} {p.unidadMedida?.simbolo ? `- ${p.unidadMedida.simbolo}` : ''}
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
                  const exists = saleItems.find(item => item.productoId === prod.id);
                  if (exists) {
                    const confirm = window.confirm(
                      `El producto "${prod.nombre}" ya está en la lista.\n¿Desea agregarlo nuevamente?`
                    );
                    if (!confirm) return;
                  }

                  const item: SaleItem = {
                    productoId: prod.id,
                    nombre: prod.nombre,
                    cantidad: 1,
                    precio: 0,
                    unidad: prod.unidadMedida?.simbolo ?? null,
                  };
                  setSaleItems(prev => [...prev, item]);
                  setEntry({ productoId: '' });
                  console.log('✅ Producto agregado a la venta:', item);
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
                {saleItems.length === 0 ? (
                  <tr>
                    <td className="px-4 py-2 text-sm text-gray-600" colSpan={6}>Sin productos agregados</td>
                  </tr>
                ) : saleItems.map((it, idx) => (
                  <tr key={`it-${idx}`}>
                    <td className="px-4 py-2 text-sm text-gray-900">{it.nombre}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      <input
                        type="number"
                        min={MIN_QTY}
                        max={MAX_QTY}
                        step={1}
                        value={it.cantidad}
                        onFocus={(e) => e.target.select()}
                        onKeyDown={(e) => { if (["e","E","+","-","."].includes(e.key)) e.preventDefault(); }}
                        onChange={(e) => {
                          const n = clamp(Number(e.target.value || 0), MIN_QTY, MAX_QTY);
                          setSaleItems(prev => prev.map((p, i2) => i2 === idx ? ({ ...p, cantidad: n }) : p));
                        }}
                        className="w-24 px-2 py-1 border border-gray-300 rounded-md focus:ring-1 focus:ring-green-500 focus:border-transparent"
                      />
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      <select
                        value={it.unidad ?? (productos.find(p => p.id === it.productoId)?.unidadMedida?.simbolo ?? 'unidad')}
                        disabled
                        className="px-2 py-1 border border-gray-300 rounded-md bg-gray-50"
                      >
                        <option value={it.unidad ?? (productos.find(p => p.id === it.productoId)?.unidadMedida?.simbolo ?? 'unidad')}>
                          {it.unidad ?? (productos.find(p => p.id === it.productoId)?.unidadMedida?.simbolo ?? 'unidad')}
                        </option>
                      </select>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={it.precio}
                        onFocus={(e) => e.target.select()}
                        onKeyDown={(e) => { if (["e","E","+","-"].includes(e.key)) e.preventDefault(); }}
                        onChange={(e) => {
                          const n = Number(e.target.value || 0);
                          setSaleItems(prev => prev.map((p, i2) => i2 === idx ? ({ ...p, precio: n }) : p));
                        }}
                        className="w-32 px-2 py-1 border border-gray-300 rounded-md focus:ring-1 focus:ring-green-500 focus:border-transparent"
                      />
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">{new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(it.cantidad * it.precio)}</td>
                    <td className="px-4 py-2 text-sm">
                      <button
                        type="button"
                        onClick={() => setSaleItems(prev => prev.filter((_, i) => i !== idx))}
                        className="text-red-600 hover:text-red-800"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 flex justify-end">
              <div className="text-sm text-gray-700">Total venta: <span className="font-semibold">{new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(saleTotal)}</span></div>
            </div>
          </div>

          {/* Footer acciones */}
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={() => setRegisterOpen(false)} className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100">Cancelar</button>
            <button
              type="submit"
              disabled={!canRegisterSale || registering}
              className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
            >
              {registering ? 'Registrando…' : 'Registrar venta'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de edición de venta */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} ariaLabel="Editar venta">
        <form
          className="w-full"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!editSale) return;
            setEditError(null);
            // Validaciones
            const validQty = editItems.every(it => it.cantidad >= MIN_QTY && it.cantidad <= MAX_QTY);
            if (!validQty) { setEditError(`La cantidad debe estar entre ${MIN_QTY} y ${MAX_QTY}.`); return; }
            if (!editOrderInfo.fechaPedido) { setEditError('Fecha de pedido requerida'); return; }
            if (editItems.length === 0) { setEditError('Debe incluir al menos un producto'); return; }

            setEditing(true);
            try {
              const payload = {
                fecha: editOrderInfo.fechaPedido,
                fechaEntrega: editOrderInfo.fechaEntrega || undefined,
                motivo: editOrderInfo.motivo || undefined,
                items: editItems.map(it => ({ productoId: it.productoId, cantidad: it.cantidad, precio: it.precio })),
              };
              const res = await fetch(`/api/pedidos-venta/${editSale.id}` , {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              });
              const json = await res.json().catch(() => ({} as any));
              if (!res.ok || !json?.success) {
                const raw = json?.error || json?.message || '';
                const msg = typeof raw === 'string' ? raw.replace(/\x1b\[[0-9;]*m/g, '').slice(0, 300) : `Error ${res.status}`;
                setEditError(msg);
                alert(`No se pudo actualizar la venta: ${msg}`);
                return;
              }
              setEditOpen(false);
              await recargarVentas();
              alert('Venta actualizada exitosamente');
            } catch (err) {
              setEditError(String(err));
            } finally {
              setEditing(false);
            }
          }}
        >
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="text-lg font-bold text-gray-900">Editar Venta</h3>
          </div>

          {/* Datos generales */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Fecha del pedido</label>
              <input
                type="date"
                value={editOrderInfo.fechaPedido}
                onChange={(e) => setEditOrderInfo(prev => ({ ...prev, fechaPedido: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Fecha de entrega</label>
              <input
                type="date"
                value={editOrderInfo.fechaEntrega || ''}
                onChange={(e) => setEditOrderInfo(prev => ({ ...prev, fechaEntrega: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-900 mb-1">Motivo</label>
              <input
                type="text"
                value={editOrderInfo.motivo}
                onChange={(e) => setEditOrderInfo(prev => ({ ...prev, motivo: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Opcional"
              />
            </div>
          </div>

          {/* Agregar nuevo producto a la edición */}
          <div className="mt-6 p-4 bg-green-50 rounded-lg border-2 border-green-200">
            <h4 className="text-sm font-semibold text-green-900 mb-3">Agregar producto</h4>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">Producto</label>
                <select
                  value={editEntry.productoId}
                  onChange={(e) => setEditEntry({ productoId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">-- Seleccione un producto --</option>
                  {productos.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre} {p.sku ? `(${p.sku})` : ''}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!editEntry.productoId) { alert('Seleccione un producto'); return; }
                  const prod = productos.find(p => p.id === editEntry.productoId);
                  if (!prod) { alert('Producto no encontrado'); return; }
                  setEditItems(prev => ([...prev, { productoId: prod.id, nombre: prod.nombre, cantidad: 1, precio: 0, unidad: prod.unidadMedida?.simbolo ?? null }]));
                  setEditEntry({ productoId: '' });
                }}
                disabled={!editEntry.productoId}
                className="px-6 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
              >
                Agregar
              </button>
            </div>
          </div>

          {/* Items editables */}
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
                {editItems.length === 0 ? (
                  <tr><td className="px-4 py-2 text-sm text-gray-600" colSpan={6}>Sin productos</td></tr>
                ) : editItems.map((it, idx) => (
                  <tr key={`edit-${idx}`}>
                    <td className="px-4 py-2 text-sm text-gray-900">{it.nombre}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      <input
                        type="number"
                        min={MIN_QTY}
                        max={MAX_QTY}
                        step={1}
                        value={it.cantidad}
                        onChange={(e) => {
                          const n = clamp(Number(e.target.value || 0), MIN_QTY, MAX_QTY);
                          setEditItems(prev => prev.map((p, i2) => i2 === idx ? ({ ...p, cantidad: n }) : p));
                        }}
                        className="w-24 px-2 py-1 border border-gray-300 rounded-md focus:ring-1 focus:ring-green-500 focus:border-transparent"
                      />
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      <input
                        type="text"
                        disabled
                        value={it.unidad ?? (productos.find(p => p.id === it.productoId)?.unidadMedida?.simbolo ?? 'unidad')}
                        className="px-2 py-1 border border-gray-300 rounded-md bg-gray-50"
                      />
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={it.precio}
                        onChange={(e) => {
                          const n = Number(e.target.value || 0);
                          setEditItems(prev => prev.map((p, i2) => i2 === idx ? ({ ...p, precio: n }) : p));
                        }}
                        className="w-32 px-2 py-1 border border-gray-300 rounded-md focus:ring-1 focus:ring-green-500 focus:border-transparent"
                      />
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">{new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(it.cantidad * it.precio)}</td>
                    <td className="px-4 py-2 text-sm">
                      <button type="button" onClick={() => setEditItems(prev => prev.filter((_, i) => i !== idx))} className="text-red-600 hover:text-red-800">Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 flex justify-between items-center">
              <div className="text-sm text-gray-700">
                Total: <span className="font-semibold">{new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(editItems.reduce((s, it) => s + it.cantidad * it.precio, 0))}</span>
              </div>
              {editError && <div className="text-sm text-gray-900">{editError}</div>}
            </div>
          </div>

          {/* Footer acciones */}
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={() => setEditOpen(false)} className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100">Cancelar</button>
            <button type="submit" disabled={editing} className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">{editing ? 'Guardando…' : 'Guardar cambios'}</button>
          </div>
        </form>
      </Modal>

      {/* Modal de éxito */}
      <Modal isOpen={successModalOpen} onClose={() => setSuccessModalOpen(false)} ariaLabel="Venta registrada exitosamente">
        <div className="flex flex-col items-center justify-center p-6 space-y-6">
          {/* Ícono de éxito */}
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          {/* Título */}
          <h3 className="text-xl font-bold text-gray-900">
            ¡Venta registrada exitosamente!
          </h3>

          {/* Información del pedido */}
          <div className="w-full space-y-3">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-sm text-gray-600">Nº de Venta:</span>
              <span className="text-base font-semibold text-gray-900">{successOrderInfo?.numero}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total:</span>
              <span className="text-lg font-bold text-green-600">
                {new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(successOrderInfo?.total || 0)}
              </span>
            </div>
          </div>

          {/* Botón de aceptar */}
          <button
            onClick={() => setSuccessModalOpen(false)}
            className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
          >
            Aceptar
          </button>
        </div>
      </Modal>
    </div>
  );
}
