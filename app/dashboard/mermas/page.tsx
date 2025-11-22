"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, Loader2, AlertTriangle } from "lucide-react";

type MermaRow = {
  id: string;
  fecha: string;
  productoId: string;
  producto: string;
  tipo: string;
  causa: string;
  cantidad: number;
  clasificacion: string;
  usuario: string;
  observaciones: string;
};

export default function MermasPage() {
  const [rows, setRows] = useState<MermaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [productoId, setProductoId] = useState<string>("");
  const [tipoMermaId, setTipoMermaId] = useState<string>("");
  const [clasificacion, setClasificacion] = useState<string>("");

  const [form, setForm] = useState({ productoId: "", cantidad: 0, tipoMermaId: "", causaMermaId: "", clasificacion: "NORMAL", observaciones: "" });
  const [submitting, setSubmitting] = useState(false);
  const [catalogo, setCatalogo] = useState<{ productos: Array<{id:string,nombre:string}>, tipos: Array<{id:string,nombre:string}>, causas: Array<{id:string,nombre:string,tipoMermaId:string}> } | null>(null)

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const qs = new URLSearchParams();
      if (from) qs.set("from", from);
      if (to) qs.set("to", to);
      if (productoId) qs.set("productoId", productoId);
      if (tipoMermaId) qs.set("tipoMermaId", tipoMermaId);
      if (clasificacion) qs.set("clasificacion", clasificacion);
      const r = await fetch(`/api/mermas${qs.toString() ? `?${qs.toString()}` : ""}`, { cache: "no-store" });
      const j = await r.json().catch(() => ({ success: false, error: "Respuesta inválida" }));
      if (!r.ok || j?.success === false) throw new Error(String(j?.error || `Error ${r.status}`));
      setRows(j.data || []);
    } catch (e: any) {
      setError(e?.message || "Error al cargar mermas");
    } finally {
      setLoading(false);
    }
  }, [from,to,productoId,tipoMermaId,clasificacion]);

  useEffect(() => { fetchRows(); }, [fetchRows]);
  useEffect(() => {
    (async () => {
      const r = await fetch('/api/mermas/catalogo', { cache: 'no-store' })
      const j = await r.json().catch(() => ({ success:false }))
      if (r.ok && j?.success) setCatalogo(j.data)
    })()
  }, [])

  const submitMerma = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const r = await fetch('/api/mermas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const j = await r.json().catch(() => ({ success: false, error: 'Respuesta inválida' }));
      if (!r.ok || j?.success === false) throw new Error(String(j?.error || `Error ${r.status}`));
      setForm({ productoId: "", cantidad: 0, tipoMermaId: "", causaMermaId: "", clasificacion: "NORMAL", observaciones: "" });
      await fetchRows();
    } catch (e: any) {
      setError(e?.message || 'Error al registrar merma');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-black">Mermas</h1>
          <p className="text-black mt-1">Registro y consulta de mermas</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <form onSubmit={submitMerma} className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <select value={form.productoId} onChange={e=>setForm(prev=>({ ...prev, productoId: e.target.value }))} className="px-3 py-2 border rounded-md" required>
            <option value="">Producto</option>
            {catalogo?.productos?.map(p => (<option key={p.id} value={p.id}>{p.nombre}</option>))}
          </select>
          <select value={form.tipoMermaId} onChange={e=>setForm(prev=>({ ...prev, tipoMermaId: e.target.value }))} className="px-3 py-2 border rounded-md" required>
            <option value="">Tipo de Merma</option>
            {catalogo?.tipos?.map(t => (<option key={t.id} value={t.id}>{t.nombre}</option>))}
          </select>
          <select value={form.causaMermaId} onChange={e=>setForm(prev=>({ ...prev, causaMermaId: e.target.value }))} className="px-3 py-2 border rounded-md">
            <option value="">Causa (opcional)</option>
            {catalogo?.causas?.filter(c => !form.tipoMermaId || c.tipoMermaId === form.tipoMermaId).map(c => (<option key={c.id} value={c.id}>{c.nombre}</option>))}
          </select>
          <input type="number" step="0.01" value={form.cantidad} onChange={e=>setForm(prev=>({ ...prev, cantidad: parseFloat(e.target.value) || 0 }))} placeholder="Cantidad" className="px-3 py-2 border rounded-md" />
          <select value={form.clasificacion} onChange={e=>setForm(prev=>({ ...prev, clasificacion: e.target.value }))} className="px-3 py-2 border rounded-md">
            <option value="NORMAL">Normal</option>
            <option value="EXTRAORDINARIA">Extraordinaria</option>
          </select>
          <div className="md:col-span-5 flex gap-2">
            <input value={form.observaciones} onChange={e=>setForm(prev=>({ ...prev, observaciones: e.target.value }))} placeholder="Observaciones" className="flex-1 px-3 py-2 border rounded-md" />
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-green-600 text-white rounded-md flex items-center gap-2">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Plus className="w-4 h-4"/>}
              <span>Registrar</span>
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div>
            <label className="text-sm text-gray-600">Desde</label>
            <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="px-3 py-2 border rounded-md" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Hasta</label>
            <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="px-3 py-2 border rounded-md" />
          </div>
          <div className="flex gap-2">
            <button onClick={fetchRows} className="px-4 py-2 bg-gray-100 rounded-md border">Buscar</button>
            <a href={`/api/reportes/mermas?from=${from || ''}&to=${to || ''}&format=csv`} className="px-4 py-2 bg-green-600 text-white rounded-md">Exportar CSV</a>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-600">Cargando...</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Causa</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clasificación</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rows.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{r.fecha}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{r.producto}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{r.tipo}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{r.causa}</td>
                  <td className="px-4 py-3 text-sm text-right">{r.cantidad}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{r.clasificacion}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{r.usuario}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td className="px-4 py-3 text-sm text-gray-600" colSpan={7}>Sin registros</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
