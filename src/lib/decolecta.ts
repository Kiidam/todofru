type JsonPrimitive = string | number | boolean | null;
export type Json = JsonPrimitive | { [key: string]: Json } | Json[];

const BASE_URL = process.env.DECOLECTA_BASE_URL || 'https://api.decolecta.pe';
const API_TOKEN = process.env.DECOLECTA_API_TOKEN || '';
const SUNAT_PARAM = process.env.DECOLECTA_SUNAT_PARAM || 'numero';
const RENIEC_PARAM = process.env.DECOLECTA_RENIEC_PARAM || 'numero';

export class DecolectaError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = 'DecolectaError';
    this.status = status;
  }
}

function buildUrl(endpointUrl: string, params?: Record<string, string | number | undefined>): URL {
  const isAbsolute = /^https?:\/\//i.test(endpointUrl);
  const url = new URL(isAbsolute ? endpointUrl : `${BASE_URL}${endpointUrl.startsWith('/') ? '' : '/'}${endpointUrl}`);
  const existing = new URLSearchParams(url.search);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) existing.set(k, String(v));
    }
  }
  url.search = existing.toString();
  return url;
}

export async function decolectaFetch<T = Json>(endpointUrl: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  if (!API_TOKEN) {
    throw new DecolectaError('Falta DECOLECTA_API_TOKEN en el entorno', 500);
  }

  const url = buildUrl(endpointUrl, params);
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Accept': 'application/json',
    },
    cache: 'no-store',
  });

  const contentType = res.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const body: unknown = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const msg = isJson && typeof body === 'object' && body !== null && 'message' in (body as Record<string, unknown>)
      ? String((body as Record<string, unknown>).message)
      : `Error ${res.status}`;
    throw new DecolectaError(msg, res.status);
  }

  return body as T;
}

export async function fetchSunatByRuc<T = Json>(ruc: string): Promise<T> {
  const endpoint = process.env.DECOLECTA_SUNAT_URL || '/sunat/ruc';
  // La API puede esperar 'numero' o 'ruc', configurable por entorno
  return decolectaFetch<T>(endpoint, { [SUNAT_PARAM]: ruc });
}

export async function fetchReniecByDni<T = Json>(dni: string): Promise<T> {
  const endpoint = process.env.DECOLECTA_RENIEC_URL || '/reniec/dni';
  // La API puede esperar 'numero' o 'dni', configurable por entorno
  return decolectaFetch<T>(endpoint, { [RENIEC_PARAM]: dni });
}