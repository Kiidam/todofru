type JsonPrimitive = string | number | boolean | null;
export type Json = JsonPrimitive | { [key: string]: Json } | Json[];

import { logger } from '../lib/logger'

const BASE_URL = process.env.DECOLECTA_BASE_URL || 'https://api.decolecta.com/v1'
const API_TOKEN = process.env.DECOLECTA_API_TOKEN || ''
const SUNAT_PARAM = process.env.DECOLECTA_SUNAT_PARAM || 'numero'
const RENIEC_PARAM = process.env.DECOLECTA_RENIEC_PARAM || 'numero'
const TIMEOUT_MS = parseInt(process.env.DECOLECTA_TIMEOUT_MS || '8000', 10)
const RETRIES = parseInt(process.env.DECOLECTA_RETRIES || '2', 10)

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
  const isAbsolute = /^https?:\/\//i.test(endpointUrl)
  const baseUrl = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL
  const endpoint = endpointUrl.startsWith('/') ? endpointUrl : `/${endpointUrl}`
  const url = new URL(isAbsolute ? endpointUrl : `${baseUrl}${endpoint}`)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value))
      }
    }
  }
  return url
}

/**
 * Realiza una petición a la API de Decolecta
 */
export async function decolectaFetch<T = Json>(
  endpointUrl: string,
  params: Record<string, string | number | undefined> = {}
): Promise<T> {
  if (!API_TOKEN) {
    throw new DecolectaError('Token de Decolecta no configurado. Configure DECOLECTA_API_TOKEN en las variables de entorno.', 500)
  }
  const url = buildUrl(endpointUrl, params)
  logger.info('[Decolecta] Petición', { url: url.toString(), endpoint: endpointUrl, params, hasToken: !!API_TOKEN })
  const attemptFetch = async (): Promise<Response> => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        cache: 'no-store',
        signal: controller.signal
      })
      return res
    } finally {
      clearTimeout(timer)
    }
  }
  try {
    let res: Response | null = null
    let lastError: unknown
    for (let i = 0; i <= RETRIES; i++) {
      try {
        res = await attemptFetch()
        break
      } catch (e) {
        lastError = e
        logger.warn('[Decolecta] Intento fallido', { attempt: i + 1, error: e instanceof Error ? e.message : String(e) })
        if (i === RETRIES) throw e
      }
    }
    if (!res) {
      throw lastError instanceof Error ? lastError : new Error('fetch failed')
    }
    const contentType = res.headers.get('content-type') ?? ''
    const isJson = contentType.includes('application/json')
    let body: unknown
    try {
      body = isJson ? await res.json() : await res.text()
    } catch (parseError) {
      logger.error('[Decolecta] Error al parsear respuesta', parseError)
      throw new DecolectaError('Error al procesar la respuesta de Decolecta', res.status)
    }
    logger.info('[Decolecta] Respuesta', {
      status: res.status,
      ok: res.ok,
      contentType,
      body: typeof body === 'string' ? body.substring(0, 200) : body
    })
    if (!res.ok) {
      let errorMessage = `Error ${res.status}`
      if (isJson && typeof body === 'object' && body !== null) {
        const errorBody = body as Record<string, unknown>
        errorMessage = String(errorBody.message || errorBody.error || errorBody.detail || errorBody.msg || errorMessage)
      } else if (typeof body === 'string') {
        errorMessage = body.substring(0, 200)
      }
      logger.error('[Decolecta] Error en petición', { status: res.status, message: errorMessage, body })
      throw new DecolectaError(errorMessage, res.status)
    }
    logger.info('[Decolecta] Petición exitosa')
    return body as T
  } catch (error) {
    if (error instanceof DecolectaError) {
      throw error
    }
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    const isNetwork = /fetch failed|network|ECONN|ENOTFOUND|ETIMEDOUT|abort/i.test(msg)
    logger.error('[Decolecta] Error de red o conexión', { message: msg })
    throw new DecolectaError(
      isNetwork
        ? 'No se pudo establecer conexión con Decolecta. Verifique BASE_URL, conectividad a Internet y firewalls.'
        : `Error de conexión con Decolecta: ${msg}`,
      500
    )
  }
}

/**
 * Consulta información de RUC en SUNAT a través de Decolecta
 */
export async function fetchSunatByRuc<T = Json>(ruc: string): Promise<T> {
  const endpoint = process.env.DECOLECTA_SUNAT_URL || '/sunat/ruc'
  const cleaned = String(ruc || '').replace(/\D/g, '')
  logger.info('[Decolecta] Consultando RUC', { input: ruc, cleaned })
  if (!/^\d{11}$/.test(cleaned)) {
    throw new DecolectaError('RUC inválido. Debe tener 11 dígitos numéricos.', 400)
  }
  return decolectaFetch<T>(endpoint, { [SUNAT_PARAM]: cleaned })
}

/**
 * Consulta información de DNI en RENIEC a través de Decolecta
 */
export async function fetchReniecByDni<T = Json>(dni: string): Promise<T> {
  const endpoint = process.env.DECOLECTA_RENIEC_URL || '/reniec/dni'
  const cleaned = String(dni || '').replace(/\D/g, '')
  logger.info('[Decolecta] Consultando DNI', { input: dni, cleaned })
  if (!/^\d{8}$/.test(cleaned)) {
    throw new DecolectaError('DNI inválido. Debe tener 8 dígitos numéricos.', 400)
  }
  return decolectaFetch<T>(endpoint, { [RENIEC_PARAM]: cleaned })
}
