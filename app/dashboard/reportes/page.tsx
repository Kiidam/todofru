"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { Search, FileDown, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';

function formatDate(d: Date) { return d.toISOString().slice(0,10); }

export default function ReportesPage() {
  const [from, setFrom] = useState(() => formatDate(new Date(new Date().setDate(new Date().getDate() - 7))));
  const [to, setTo] = useState(() => formatDate(new Date()));
  const [usuarioId, setUsuarioId] = useState<string>('');
  const [productoId, setProductoId] = useState<string>('');
  type Usuario = { id: string; name: string; email: string | null };
  type Producto = { id: string; nombre: string };
  type Row = Record<string, string | number | null>;
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [proveedores, setProveedores] = useState<{id:string;nombre:string}[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'ventas'|'compras'|'inventario'>('ventas');
  const [proveedorId, setProveedorId] = useState<string>('');
  
  // Helper: unwrap common API shapes { success, data: { data: [...] } }
  function unwrapData(input: any): any {
    let cur = input;
    // If top-level is ApiResponse
    if (cur && typeof cur === 'object' && 'data' in cur && cur.success !== undefined) {
      cur = (cur as any).data;
    }
    let guard = 0;
    while (guard < 3 && cur && typeof cur === 'object' && !Array.isArray(cur) && 'data' in cur) {
      cur = (cur as any).data;
      guard++;
    }
    return cur;
  }

  useEffect(() => {
    // Load filters
    fetch('/api/usuarios/simple')
      .then(r => r.json())
      .then((d) => {
        const arr = unwrapData(d);
        setUsuarios(Array.isArray(arr) ? (arr as Usuario[]) : []);
      })
  .catch(() => { toast.error('No se pudieron cargar los usuarios'); });

    fetch('/api/public/productos')
      .then(r => r.json())
      .then((d) => {
        const arr = unwrapData(d);
        const p = Array.isArray(arr)
          ? (arr as Array<Record<string, unknown>>).map((x) => ({
              id: String((x as any).id ?? ''),
              nombre: String((x as any).nombre ?? (x as any).name ?? '')
            }))
          : [];
        setProductos(p);
      })
  .catch(() => { toast.error('No se pudieron cargar los productos'); });

    fetch('/api/proveedores?simple=true&limit=1000')
      .then(r => r.json())
      .then((d) => {
        const arr = unwrapData(d);
        const prov = Array.isArray(arr) ? arr as Array<any> : [];
        setProveedores(prov.map(p => ({ id: String(p.id), nombre: String(p.nombre ?? p.razonSocial ?? '') })));
      })
  .catch(() => { toast.error('No se pudieron cargar los proveedores'); });
  }, []);

  const q = useMemo(() => {
    const s = new URLSearchParams();
    if (from) s.set('from', from);
    if (to) s.set('to', to);
    if (usuarioId) s.set('usuarioId', usuarioId);
    if (productoId) s.set('productoId', productoId);
    if (tab==='compras' && proveedorId) s.set('proveedorId', proveedorId);
    return s.toString();
  }, [from,to,usuarioId,productoId,proveedorId,tab]);

  const load = async () => {
    setLoading(true);
    try {
      const url = `/api/reportes/${tab}?${q}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Error al cargar reportes (${res.status})`);
      }
      const data = await res.json();
      const arr = unwrapData(data);
      setRows(Array.isArray(arr) ? (arr as Row[]) : []);
    } catch (err) {
      toast.error('No se pudo cargar el reporte');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(()=>{ load(); }, [q, tab]);

  const exportCsv = () => {
    const url = `/api/reportes/${tab}?${q}&format=csv`;
    window.open(url, '_blank');
  };
  const exportPdf = () => {
    const url = `/api/reportes/${tab}?${q}&format=pdf`;
    window.open(url, '_blank');
  };

  // Table headers derived from first row
  const headerKeys = useMemo(() => (rows && rows[0] ? Object.keys(rows[0]) : []), [rows]);
  const isNumericKey = (k: string) => /^(cantidad|cantidadAnterior|cantidadNueva|precio|subtotal|total|totalPedido|monto|importe|stock|valor|totalcompra|totalventa|costo|igv|descuento|saldo|precioVenta|precioCompra)$/i.test(k)

  // Decide which keys to hide (technical IDs) when a friendly column exists
  const shouldHideKey = (k: string, keys: string[]) => {
    const kk = k.toLowerCase();
    const has = (s: string) => keys.some(h => h.toLowerCase() === s.toLowerCase());
    // Hide generic internal ids
    if (['id', 'uuid'].includes(kk)) return true;
    // Hide relational ids if friendly name exists in same row
    if (kk === 'pedidoid' && (has('numero') || has('cliente'))) return true;
    if ((kk === 'productoid' || kk === 'producto_id' || kk === 'productoId'.toLowerCase()) && has('producto')) return true;
    if ((kk === 'usuarioid' || kk === 'usuario_id' || kk === 'usuarioId'.toLowerCase()) && has('usuario')) return true;
    if ((kk === 'proveedorid' || kk === 'proveedor_id' || kk === 'proveedorId'.toLowerCase()) && has('proveedor')) return true;
    if ((kk === 'clienteid' || kk === 'cliente_id' || kk === 'clienteId'.toLowerCase()) && has('cliente')) return true;
    // Hide common technical ids in report rows
    if (/(^|_)?(venta|compra|inventario|movimiento|detalle)s?(_)?id$/.test(kk)) return true;
    if (/^(idventa|idcompra|idinventario|idmovimiento|iddetalle)$/.test(kk)) return true;
    return false;
  };

  const displayKeys = useMemo(() => headerKeys.filter(k => !shouldHideKey(k, headerKeys)), [headerKeys]);

  // Preferred column order per tab
  const preferredOrder: Record<typeof tab, string[]> = {
    ventas: ['fecha','numero','cliente','usuario','producto','cantidad','precio','subtotal','total','totalpedido','observaciones'],
    compras: ['fecha','numero','proveedor','usuario','producto','cantidad','precio','subtotal','total','motivo','observaciones'],
    // For Inventario, match UI: Fecha, Producto, Tipo, Cantidad, Usuario, Cantidad Anterior, Cantidad Nueva, Motivo, N° Guía, Pedido Compra, Pedido Venta
    inventario: ['fecha','producto','tipo','cantidad','usuario','cantidadAnterior','cantidadNueva','motivo','numeroGuia','pedidoCompra','pedidoVenta']
  };
  const orderIndex = (key: string) => {
    const idx = preferredOrder[tab].findIndex(k => k.toLowerCase() === key.toLowerCase());
    return idx === -1 ? 999 : idx;
  };
  const displayKeysSorted = useMemo(() => {
    const keys = [...displayKeys];
    keys.sort((a,b) => {
      const ai = orderIndex(a);
      const bi = orderIndex(b);
      if (ai !== bi) return ai - bi;
      // Stable fallback alphabetical to keep deterministic ordering for unknown keys
      return a.localeCompare(b);
    });
    return keys;
  }, [displayKeys, tab]);

  // Human-friendly header labels
  const headerLabelMap: Record<string, string> = {
    pedidoid: 'Pedido',
    numero: 'Número',
    fecha: 'Fecha',
    cliente: 'Cliente',
    usuario: 'Usuario',
    productoid: 'Producto ID',
    producto: 'Producto',
    cantidad: 'Cantidad',
    cantidadanterior: 'Cant. Ant.',
    cantidadnueva: 'Cant. Nva.',
    precio: 'Precio (S/)',
    subtotal: 'Subtotal (S/)',
    total: 'Total (S/)',
    totalpedido: 'Total (S/)',
    proveedor: 'Proveedor',
    proveedorid: 'Proveedor ID',
    usuarioid: 'Usuario ID',
    clienteid: 'Cliente ID',
  numeroguia: 'N° Guía',
  pedidocompra: 'Pedido Compra',
  pedidoventa: 'Pedido Venta',
    observaciones: 'Observaciones',
    motivo: 'Motivo',
    tipo: 'Tipo',
    movimiento: 'Movimiento'
  } as any;

  const toTitle = (s: string) => s
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/^\w|\s\w/g, (m) => m.toUpperCase());

  const getHeaderLabel = (k: string) => headerLabelMap[k.toLowerCase()] ?? toTitle(k);

  // Cell value formatting
  const formatCurrency = (v: unknown) => {
    const num = Number(v);
    if (!Number.isFinite(num)) return String(v ?? '');
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(num);
  };
  const formatNumber = (v: unknown) => {
    const num = Number(v);
    if (!Number.isFinite(num)) return String(v ?? '');
    return num.toLocaleString('es-PE');
  };
  const isDateLikeKey = (k: string) => /fecha|createdat|updatedat/i.test(k);
  const formatDateLike = (v: unknown) => {
    if (!v) return '';
    const d = new Date(String(v));
    if (isNaN(d.getTime())) return String(v);
    return d.toLocaleDateString('es-PE');
  };
  const formatCell = (k: string, v: unknown) => {
    if (isDateLikeKey(k)) return formatDateLike(v);
    if (/^(precio|subtotal|total|totalpedido|monto|importe|valor|totalcompra|totalventa)$/i.test(k)) return formatCurrency(v);
    if (/^(cantidad|stock)$/i.test(k)) return formatNumber(v);
    return String(v ?? '');
  };

  // Layout helpers for compact, readable Inventario grid
  const isInventory = tab === 'inventario'
  const colClassFor = (key: string) => {
    const k = key.toLowerCase();
    // Narrow numeric and code-like columns; give Producto and Motivo more room
    if (k === 'fecha') return 'sm:w-28'
    if (k === 'numero') return 'sm:w-32'
    if (k === 'producto') return 'sm:w-56'
    if (k === 'proveedor' || k === 'cliente') return 'sm:w-56'
    if (k === 'tipo') return 'sm:w-24'
    if (k === 'cantidad' || k === 'cantidadanterior' || k === 'cantidadnueva') return 'sm:w-32'
    if (k === 'usuario') return 'sm:w-44'
    if (k === 'motivo') return 'lg:w-[32rem]'
    if (k === 'numeroguia') return 'sm:w-32'
    if (k === 'pedidocompra' || k === 'pedidoventa') return 'sm:w-36'
    return 'sm:w-32'
  }

  const visibilityClassFor = (key: string) => {
    const k = key.toLowerCase()
    if (isInventory) {
      if (['numeroguia','pedidocompra','pedidoventa'].includes(k)) return 'hidden lg:table-cell'
    }
    if (tab === 'compras') {
      if (k === 'observaciones') return 'hidden md:table-cell'
      if (k === 'motivo') return 'hidden md:table-cell'
    }
    if (tab === 'ventas') {
      if (k === 'observaciones') return 'hidden md:table-cell'
    }
    return 'table-cell'
  }

  const whitespaceFor = (key: string) => {
    const k = key.toLowerCase()
    if (['fecha','numero','usuario','cantidad','cantidadanterior','cantidadnueva','precio','subtotal','total','numeroguia','tipo','proveedor','cliente'].includes(k)) {
      return 'whitespace-nowrap'
    }
    return 'whitespace-normal break-words truncate'
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 text-gray-900">
      <h1 className="text-2xl font-semibold text-gray-900">Reportes</h1>

      <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
        <div className="flex flex-wrap gap-2">
          <button onClick={()=>setTab('ventas')} className={`px-3 py-1 rounded ${tab==='ventas'?'bg-blue-600 text-white':'bg-gray-200'}`}>Ventas</button>
          <button onClick={()=>setTab('compras')} className={`px-3 py-1 rounded ${tab==='compras'?'bg-blue-600 text-white':'bg-gray-200'}`}>Compras</button>
          <button onClick={()=>setTab('inventario')} className={`px-3 py-1 rounded ${tab==='inventario'?'bg-blue-600 text-white':'bg-gray-200'}`}>Inventario</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-2">
        <button
          onClick={load}
          disabled={loading}
          aria-label="Buscar"
          className="inline-flex items-center gap-2 h-10 px-4 bg-white border text-gray-900 rounded-md shadow-sm hover:bg-gray-100 active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1 disabled:opacity-60"
        >
          <Search className="h-4 w-4" />
          {loading ? 'Buscando…' : 'Buscar'}
        </button>
        <button
          onClick={exportCsv}
          disabled={loading}
          aria-label="Exportar CSV"
          className="inline-flex items-center gap-2 h-10 px-4 bg-green-600 text-white rounded-md shadow-sm hover:bg-green-700 active:bg-green-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-1 disabled:opacity-60"
        >
          <FileDown className="h-4 w-4" />
          Exportar CSV
        </button>
        <button
          onClick={exportPdf}
          disabled={loading}
          aria-label="Exportar PDF"
          className="inline-flex items-center gap-2 h-10 px-4 bg-red-600 text-white rounded-md shadow-sm hover:bg-red-700 active:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-1 disabled:opacity-60"
        >
          <FileText className="h-4 w-4" />
          Exportar PDF
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
        <div>
          <label className="text-sm text-gray-800">Desde</label>
          <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="w-full border rounded px-2 py-1 text-gray-900 placeholder-gray-500" />
        </div>
        <div>
          <label className="text-sm text-gray-800">Hasta</label>
          <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="w-full border rounded px-2 py-1 text-gray-900 placeholder-gray-500" />
        </div>
        <div>
          <label className="text-sm text-gray-800">Producto</label>
          <select value={productoId} onChange={e=>setProductoId(e.target.value)} className="w-full border rounded px-2 py-1 text-gray-900">
            <option value="">Todos</option>
            {productos.map(p=> <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
        {(tab==='ventas' || tab==='compras') && (
          <div>
            <label className="text-sm text-gray-800">Usuario</label>
            <select value={usuarioId} onChange={e=>setUsuarioId(e.target.value)} className="w-full border rounded px-2 py-1 text-gray-900">
              <option value="">Todos</option>
              {usuarios.map(u=> <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
        )}
        {tab==='compras' && (
          <div>
            <label className="text-sm text-gray-800">Proveedor</label>
            <select value={proveedorId} onChange={e=>setProveedorId(e.target.value)} className="w-full border rounded px-2 py-1 text-gray-900">
              <option value="">Todos</option>
              {proveedores.map(p=> <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
        )}
      </div>


      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Tabla para pantallas medianas y grandes */}
        <div className="hidden sm:block w-full overflow-x-auto">
          <table className="table-fixed min-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {displayKeysSorted.map((h:string)=> (
                  <th
                    key={h}
                    className={`px-4 lg:px-6 py-3 ${isNumericKey(h)?'text-right':'text-left'} ${visibilityClassFor(h)} ${colClassFor(h)} ${whitespaceFor(h)} text-[11px] sm:text-xs font-semibold text-gray-900 uppercase tracking-wider`}
                  >
                    {getHeaderLabel(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={Math.max(displayKeys.length, 1)} className="px-6 py-4 text-sm text-gray-700">Cargando...</td>
                </tr>
              ) : rows.length ? rows.map((r,i)=> (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  {displayKeysSorted.map((h)=> (
                    <td
                      key={h}
                      className={`px-4 lg:px-6 py-3 text-[12px] sm:text-sm text-gray-900 ${visibilityClassFor(h)} ${isNumericKey(h) ? 'text-right tabular-nums whitespace-nowrap' : `text-left ${whitespaceFor(h)}`}`} title={String(r[h] ?? '')}
                    >
                      {formatCell(h, r[h])}
                    </td>
                  ))}
                </tr>
              )) : (
                <tr>
                  <td colSpan={Math.max(displayKeys.length, 1)} className="px-6 py-4 text-sm text-gray-700">Sin datos</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Vista tipo tarjetas para móvil */}
        <div className="sm:hidden p-2 space-y-3">
          {loading ? (
            <div className="px-2 py-3 text-sm text-gray-700">Cargando...</div>
          ) : rows.length ? (
            rows.map((r, i) => (
              <div key={i} className="rounded border border-gray-200 bg-white p-3 shadow-sm">
                <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                  {displayKeysSorted.map((h) => (
                    <React.Fragment key={h}>
                      <div className="text-[11px] font-semibold text-gray-700">{getHeaderLabel(h)}</div>
                      <div className={`text-[12px] text-gray-900 ${isNumericKey(h) ? 'text-right tabular-nums' : 'text-left break-words'}`}>{formatCell(h, r[h])}</div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="px-2 py-3 text-sm text-gray-700">Sin datos</div>
          )}
        </div>
      </div>
    </div>
  );
}
