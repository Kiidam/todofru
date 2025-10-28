type JsonPrimitive = string | number | boolean | null;
export type Json = JsonPrimitive | { [key: string]: Json } | Json[];

// Configuración de Decolecta con valores por defecto
const BASE_URL = process.env.DECOLECTA_BASE_URL || 'https://api.decolecta.pe/v1';
const API_TOKEN = process.env.DECOLECTA_API_TOKEN || '';
const SUNAT_PARAM = process.env.DECOLECTA_SUNAT_PARAM || 'numero';
const RENIEC_PARAM = process.env.DECOLECTA_RENIEC_PARAM || 'numero';

// Clase de error personalizada para Decolecta
export class DecolectaError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = 'DecolectaError';
    this.status = status;
  }
}

/**
 * Construye una URL completa con parámetros de query
 */
function buildUrl(endpointUrl: string, params?: Record<string, string | number | undefined>): URL {
  const isAbsolute = /^https?:\/\//i.test(endpointUrl);
  const baseUrl = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
  const endpoint = endpointUrl.startsWith('/') ? endpointUrl : `/${endpointUrl}`;
  
  const url = new URL(isAbsolute ? endpointUrl : `${baseUrl}${endpoint}`);
  
  // Agregar parámetros al query string
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  
  return url;
}

/**
 * Realiza una petición a la API de Decolecta
 */
export async function decolectaFetch<T = Json>(
  endpointUrl: string, 
  params: Record<string, string | number | undefined> = {}
): Promise<T> {
  // Validar que exista el token
  if (!API_TOKEN) {
    throw new DecolectaError('Token de Decolecta no configurado. Configure DECOLECTA_API_TOKEN en las variables de entorno.', 500);
  }

  const url = buildUrl(endpointUrl, params);
  
  console.log('🔍 [Decolecta] Petición:', {
    url: url.toString(),
    endpoint: endpointUrl,
    params,
    hasToken: !!API_TOKEN
  });

  try {
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const contentType = res.headers.get('content-type') ?? '';
    const isJson = contentType.includes('application/json');
    
    let body: unknown;
    try {
      body = isJson ? await res.json() : await res.text();
    } catch (parseError) {
      console.error('❌ [Decolecta] Error al parsear respuesta:', parseError);
      throw new DecolectaError('Error al procesar la respuesta de Decolecta', res.status);
    }

    console.log('📥 [Decolecta] Respuesta:', {
      status: res.status,
      ok: res.ok,
      contentType,
      body: typeof body === 'string' ? body.substring(0, 200) : body
    });

    if (!res.ok) {
      // Intentar extraer el mensaje de error
      let errorMessage = `Error ${res.status}`;
      
      if (isJson && typeof body === 'object' && body !== null) {
        const errorBody = body as Record<string, unknown>;
        errorMessage = String(
          errorBody.message || 
          errorBody.error || 
          errorBody.detail || 
          errorBody.msg ||
          errorMessage
        );
      } else if (typeof body === 'string') {
        errorMessage = body.substring(0, 200);
      }

      console.error('❌ [Decolecta] Error en petición:', {
        status: res.status,
        message: errorMessage,
        body
      });

      throw new DecolectaError(errorMessage, res.status);
    }

    console.log('✅ [Decolecta] Petición exitosa');
    return body as T;

  } catch (error) {
    if (error instanceof DecolectaError) {
      throw error;
    }

    console.error('❌ [Decolecta] Error de red o conexión:', error);
    throw new DecolectaError(
      `Error de conexión con Decolecta: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      500
    );
  }
}

/**
 * Consulta información de RUC en SUNAT a través de Decolecta
 */
export async function fetchSunatByRuc<T = Json>(ruc: string): Promise<T> {
  const endpoint = process.env.DECOLECTA_SUNAT_URL || '/sunat/ruc';
  
  console.log('🏢 [Decolecta] Consultando RUC:', ruc);
  
  // Validar formato de RUC (11 dígitos)
  if (!/^\d{11}$/.test(ruc)) {
    throw new DecolectaError('RUC inválido. Debe tener 11 dígitos numéricos.', 400);
  }
  
  return decolectaFetch<T>(endpoint, { [SUNAT_PARAM]: ruc });
}

/**
 * Consulta información de DNI en RENIEC a través de Decolecta
 */
export async function fetchReniecByDni<T = Json>(dni: string): Promise<T> {
  const endpoint = process.env.DECOLECTA_RENIEC_URL || '/reniec/dni';
  
  console.log('👤 [Decolecta] Consultando DNI:', dni);
  
  // Validar formato de DNI (8 dígitos)
  if (!/^\d{8}$/.test(dni)) {
    throw new DecolectaError('DNI inválido. Debe tener 8 dígitos numéricos.', 400);
  }
  
  return decolectaFetch<T>(endpoint, { [RENIEC_PARAM]: dni });
}