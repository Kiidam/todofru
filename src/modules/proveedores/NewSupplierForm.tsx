"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Nuevo formulario de Proveedores: autocompletado con RENIEC/SUNAT (Decolecta),
// validaciones, estados de carga, debounce y caché de resultados.

type TipoEntidad = "PERSONA_NATURAL" | "PERSONA_JURIDICA";

type FormData = {
  tipoEntidad: TipoEntidad;
  tipoIdentificacion: "DNI" | "RUC";
  numeroIdentificacion: string;
  nombres: string;
  apellidos: string;
  razonSocial: string;
  representanteLegal: string;
  telefono: string;
  email: string;
  direccion: string;
};

type LookupState = {
  loading: boolean;
  error: string | null;
  source: "RENIEC" | "SUNAT" | null;
};

type CacheEntry = {
  timestamp: number;
  payload: any;
};

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos
const DEBOUNCE_MS = 400;

function validateEmail(email: string): boolean {
  if (!email) return true;
  return /.+@.+\..+/.test(email);
}

function validatePhone(phone: string): boolean {
  if (!phone) return true;
  return /^[0-9+\-\s]{6,20}$/.test(phone);
}

function isDNI(value: string): boolean {
  return /^\d{8}$/.test(value);
}

function isRUC(value: string): boolean {
  return /^\d{11}$/.test(value);
}

function normalizeDoc(value: string, tipo: "DNI" | "RUC"): string {
  const digits = value.replace(/\D/g, "");
  return tipo === "DNI" ? digits.slice(0, 8) : digits.slice(0, 11);
}

interface NewSupplierFormProps {
  onCreated?: (supplier: any) => void;
  initialData?: {
    tipoIdentificacion: "DNI" | "RUC";
    numeroIdentificacion: string;
  };
}

export default function NewSupplierForm({ onCreated, initialData }: NewSupplierFormProps) {
  const [form, setForm] = useState<FormData>(() => {
    const tipoIdentificacion = initialData?.tipoIdentificacion || "RUC";
    const tipoEntidad: TipoEntidad = tipoIdentificacion === "DNI" ? "PERSONA_NATURAL" : "PERSONA_JURIDICA";
    
    return {
      tipoEntidad,
      tipoIdentificacion,
      numeroIdentificacion: initialData?.numeroIdentificacion || "",
      nombres: "",
      apellidos: "",
      razonSocial: "",
      representanteLegal: "",
      telefono: "",
      email: "",
      direccion: "",
    };
  });

  const [lookup, setLookup] = useState<LookupState>({ loading: false, error: null, source: null });
  const [autocompletedFields, setAutocompletedFields] = useState<Set<string>>(new Set());
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Caché en memoria para resultados de Decolecta
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const numeroDocValido = useMemo(() => {
    return form.tipoIdentificacion === "DNI" ? isDNI(form.numeroIdentificacion) : isRUC(form.numeroIdentificacion);
  }, [form.tipoIdentificacion, form.numeroIdentificacion]);

  // Manejar cambio de tipo de identificación
  const handleTipoIdentificacionChange = useCallback((tipo: "DNI" | "RUC") => {
    setLookup({ loading: false, error: null, source: null });
    setAutocompletedFields(new Set());

    const tipoEntidad: TipoEntidad = tipo === "DNI" ? "PERSONA_NATURAL" : "PERSONA_JURIDICA";
    setForm(prev => ({
      ...prev,
      tipoIdentificacion: tipo,
      tipoEntidad,
      numeroIdentificacion: "",
      // limpiar campos específicos
      nombres: "",
      apellidos: "",
      razonSocial: "",
      representanteLegal: "",
    }));
  }, []);

  // Manejar cambios del número de identificación con normalización
  const handleNumeroIdentificacionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = normalizeDoc(e.target.value, form.tipoIdentificacion);
    if (value !== form.numeroIdentificacion) {
      setAutocompletedFields(new Set());
      setLookup({ loading: false, error: null, source: null });
    }
    setForm(prev => ({ ...prev, numeroIdentificacion: value }));
  }, [form.tipoIdentificacion, form.numeroIdentificacion]);

  // Debounce + consulta a APIs internas (proxies a Decolecta)
  useEffect(() => {
    if (!numeroDocValido || !form.numeroIdentificacion) return;

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        // Cancelar solicitud previa
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        const doc = form.numeroIdentificacion;
        const isDni = isDNI(doc);
        const cacheKey = `${isDni ? "DNI" : "RUC"}:${doc}`;

        // Intentar caché
        const cached = cacheRef.current.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
          applyLookupResult(cached.payload, isDni);
          return;
        }

        setLookup({ loading: true, error: null, source: null });
        const endpoint = isDni
          ? `/api/integrations/decolecta/reniec?dni=${doc}`
          : `/api/integrations/decolecta/sunat?ruc=${doc}`;

        const resp = await fetch(endpoint, {
          method: "GET",
          signal: abortControllerRef.current.signal,
          headers: { Accept: "application/json" },
          cache: "no-store",
        });

        const payload = await resp.json().catch(() => ({ ok: false, error: "Error parseando respuesta" }));
        if (!resp.ok || payload?.ok === false) {
          const message = payload?.error || `Error ${resp.status} en la consulta`;
          const service = isDni ? "RENIEC" : "SUNAT";
          setLookup({ loading: false, error: `${service}: ${message}`, source: null });
          return;
        }

        const data = payload?.data || payload; // rutas devuelven {ok,data}
        cacheRef.current.set(cacheKey, { timestamp: Date.now(), payload: data });
        applyLookupResult(data, isDni);
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        const service = isDNI(form.numeroIdentificacion) ? "RENIEC" : "SUNAT";
        setLookup({ loading: false, error: `${service}: Error de conexión`, source: null });
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [form.numeroIdentificacion, numeroDocValido, form.tipoIdentificacion]);

  const applyLookupResult = useCallback((data: any, isDni: boolean) => {
    const newAutocompleted = new Set<string>();
    if (isDni) {
      const nombres = String(data?.nombres || data?.first_name || "");
      const apellidos = String(data?.apellidos || `${data?.first_last_name || ""} ${data?.second_last_name || ""}`.trim());
      const direccion = String(data?.direccion || data?.address || "");
      setForm(prev => ({
        ...prev,
        tipoEntidad: "PERSONA_NATURAL",
        tipoIdentificacion: "DNI",
        nombres: nombres || prev.nombres,
        apellidos: apellidos || prev.apellidos,
        razonSocial: "",
        representanteLegal: "",
        direccion: direccion || prev.direccion,
      }));
      if (nombres) newAutocompleted.add("nombres");
      if (apellidos) newAutocompleted.add("apellidos");
      if (direccion) newAutocompleted.add("direccion");
      setLookup({ loading: false, error: null, source: "RENIEC" });
    } else {
      const razonSocial = String(
        data?.razonSocial || data?.razon_social || data?.nombre || data?.name || ""
      );
      const direccion = String(data?.direccion || data?.address || "");
      setForm(prev => ({
        ...prev,
        tipoEntidad: "PERSONA_JURIDICA",
        tipoIdentificacion: "RUC",
        razonSocial: razonSocial || prev.razonSocial,
        nombres: "",
        apellidos: "",
        direccion: direccion || prev.direccion,
      }));
      if (razonSocial) newAutocompleted.add("razonSocial");
      if (direccion) newAutocompleted.add("direccion");
      setLookup({ loading: false, error: null, source: "SUNAT" });
    }
    setAutocompletedFields(newAutocompleted);
  }, []);

  // Activar búsqueda automática cuando se proporcionan datos iniciales
  useEffect(() => {
    if (initialData?.numeroIdentificacion && numeroDocValido) {
      // Simular el trigger de búsqueda automática
      const timer = setTimeout(() => {
        // La búsqueda se activará automáticamente por el useEffect existente
        // que monitorea form.numeroIdentificacion
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [initialData, numeroDocValido]);

  const canSubmit = useMemo(() => {
    // Validaciones mínimas
    if (form.tipoIdentificacion === "DNI") {
      if (!isDNI(form.numeroIdentificacion)) return false;
      if (!form.nombres || !form.apellidos) return false;
    } else {
      if (!isRUC(form.numeroIdentificacion)) return false;
      if (!form.razonSocial) return false;
    }
    if (!validateEmail(form.email)) return false;
    if (!validatePhone(form.telefono)) return false;
    return true;
  }, [form]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);
    setSubmitLoading(true);

    const payload: any = {
      tipoEntidad: form.tipoEntidad,
      telefono: form.telefono || undefined,
      email: form.email || undefined,
      direccion: form.direccion || undefined,
    };

    if (form.tipoEntidad === "PERSONA_NATURAL") {
      payload.nombres = form.nombres.trim();
      payload.apellidos = form.apellidos.trim();
      payload.numeroIdentificacion = form.numeroIdentificacion;
    } else {
      payload.razonSocial = form.razonSocial.trim();
      payload.representanteLegal = form.representanteLegal.trim() || undefined;
      payload.numeroIdentificacion = form.numeroIdentificacion;
    }

    try {
      const resp = await fetch("/api/proveedores", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await resp.json();
      if (!resp.ok) {
        const msg = result?.message || result?.error || "Error al crear proveedor";
        setSubmitError(msg);
      } else {
        setSubmitSuccess("Proveedor creado exitosamente");
        onCreated?.(result?.data ?? result);
        // Reset parcial manteniendo tipo
        setForm(prev => ({
          ...prev,
          numeroIdentificacion: "",
          nombres: "",
          apellidos: "",
          razonSocial: "",
          representanteLegal: "",
          telefono: "",
          email: "",
          direccion: "",
        }));
        setAutocompletedFields(new Set());
      }
    } catch (err: any) {
      setSubmitError("Error de conexión al crear proveedor");
    } finally {
      setSubmitLoading(false);
    }
  }, [form, onCreated]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Selector de tipo de identificación */}
      <div className="flex gap-4 items-center">
        <label className="text-sm font-semibold text-black">Tipo</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleTipoIdentificacionChange("DNI")}
            className={`px-3 py-1 rounded border font-medium ${form.tipoIdentificacion === "DNI" ? "bg-blue-600 text-white" : "bg-white text-black border-gray-300"}`}
          >DNI</button>
          <button
            type="button"
            onClick={() => handleTipoIdentificacionChange("RUC")}
            className={`px-3 py-1 rounded border font-medium ${form.tipoIdentificacion === "RUC" ? "bg-blue-600 text-white" : "bg-white text-black border-gray-300"}`}
          >RUC</button>
        </div>
      </div>

      {/* Número de identificación con autocompletado */}
      <div>
        <label className="block text-sm font-semibold text-black mb-1">
          {form.tipoIdentificacion === "DNI" ? "DNI (8 dígitos)" : "RUC (11 dígitos)"}
        </label>
        <div className="relative">
          <input
            value={form.numeroIdentificacion}
            onChange={handleNumeroIdentificacionChange}
            placeholder={form.tipoIdentificacion === "DNI" ? "Ej: 46027897" : "Ej: 20601030013"}
            className="w-full border border-gray-300 rounded px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {lookup.loading && (
            <div className="absolute right-2 top-2 text-sm text-black">Buscando...</div>
          )}
        </div>
        {lookup.error && (
          <p className="mt-1 text-sm text-red-600 font-medium">{lookup.error}</p>
        )}
        {lookup.source && (
          <p className="mt-1 text-xs text-green-600 font-medium">Autocompletado desde {lookup.source}</p>
        )}
      </div>

      {/* Campos del proveedor */}
      {form.tipoEntidad === "PERSONA_NATURAL" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-black mb-1">Nombres</label>
            <input
              value={form.nombres}
              onChange={(e) => setForm(prev => ({ ...prev, nombres: e.target.value }))}
              className={`w-full border border-gray-300 rounded px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${autocompletedFields.has("nombres") ? "bg-green-50" : ""}`}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-black mb-1">Apellidos</label>
            <input
              value={form.apellidos}
              onChange={(e) => setForm(prev => ({ ...prev, apellidos: e.target.value }))}
              className={`w-full border border-gray-300 rounded px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${autocompletedFields.has("apellidos") ? "bg-green-50" : ""}`}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-black mb-1">Razón Social</label>
            <input
              value={form.razonSocial}
              onChange={(e) => setForm(prev => ({ ...prev, razonSocial: e.target.value }))}
              className={`w-full border border-gray-300 rounded px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${autocompletedFields.has("razonSocial") ? "bg-green-50" : ""}`}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-black mb-1">Representante Legal (opcional)</label>
            <input
              value={form.representanteLegal}
              onChange={(e) => setForm(prev => ({ ...prev, representanteLegal: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      )}

      {/* Contacto */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-semibold text-black mb-1">Teléfono</label>
          <input
            value={form.telefono}
            onChange={(e) => setForm(prev => ({ ...prev, telefono: e.target.value }))}
            className="w-full border border-gray-300 rounded px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {!validatePhone(form.telefono) && (
            <p className="mt-1 text-xs text-red-600 font-medium">Teléfono inválido</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-semibold text-black mb-1">Email</label>
          <input
            value={form.email}
            onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
            className="w-full border border-gray-300 rounded px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {!validateEmail(form.email) && (
            <p className="mt-1 text-xs text-red-600 font-medium">Email inválido</p>
          )}
        </div>
        <div className="md:col-span-1">
          <label className="block text-sm font-semibold text-black mb-1">Dirección</label>
          <input
            value={form.direccion}
            onChange={(e) => setForm(prev => ({ ...prev, direccion: e.target.value }))}
            className={`w-full border border-gray-300 rounded px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${autocompletedFields.has("direccion") ? "bg-green-50" : ""}`}
          />
        </div>
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!canSubmit || submitLoading}
          className="px-4 py-2 rounded bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >{submitLoading ? "Guardando..." : "Guardar proveedor"}</button>
        {submitError && <span className="text-sm text-red-600 font-medium">{submitError}</span>}
        {submitSuccess && <span className="text-sm text-green-600 font-medium">{submitSuccess}</span>}
      </div>
    </form>
  );
}