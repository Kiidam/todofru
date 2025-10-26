/**
 * Servicio de autocompletado optimizado para la API de Decolecta
 * Incluye caché, debouncing, manejo de errores y optimizaciones de rendimiento
 */

import { 
  DecolectaResponse, 
  MappedSupplierData, 
  validateDocumentNumber, 
  mapDecolectaToSupplier, 
  validateMappedData 
} from '../utils/decolecta-utils';

export interface AutocompleteResult {
  success: boolean;
  data?: MappedSupplierData;
  error?: string;
  warnings?: string[];
  cached?: boolean;
  responseTime?: number;
}

export interface AutocompleteOptions {
  timeout?: number;
  useCache?: boolean;
  cacheExpiry?: number;
  retries?: number;
  retryDelay?: number;
}

// Cache para resultados de la API
interface CacheEntry {
  data: MappedSupplierData;
  timestamp: number;
  expiry: number;
}

class DecolectaAutocompleteService {
  private cache = new Map<string, CacheEntry>();
  private pendingRequests = new Map<string, Promise<AutocompleteResult>>();
  private abortControllers = new Map<string, AbortController>();
  
  private readonly defaultOptions: Required<AutocompleteOptions> = {
    timeout: 15000,
    useCache: true,
    cacheExpiry: 5 * 60 * 1000, // 5 minutos
    retries: 2,
    retryDelay: 1000
  };

  /**
   * Limpia el caché de entradas expiradas
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Obtiene datos del caché si están disponibles y no han expirado
   */
  private getCachedData(numero: string): MappedSupplierData | null {
    this.cleanExpiredCache();
    const entry = this.cache.get(numero);
    
    if (entry && Date.now() < entry.expiry) {
      return entry.data;
    }
    
    return null;
  }

  /**
   * Guarda datos en el caché
   */
  private setCachedData(numero: string, data: MappedSupplierData, expiry: number): void {
    this.cache.set(numero, {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + expiry
    });
  }

  /**
   * Cancela una solicitud pendiente
   */
  public cancelRequest(numero: string): void {
    const controller = this.abortControllers.get(numero);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(numero);
      this.pendingRequests.delete(numero);
    }
  }

  /**
   * Realiza una solicitud HTTP con reintentos
   */
  private async makeRequest(
    url: string, 
    options: RequestInit, 
    retries: number, 
    retryDelay: number
  ): Promise<Response> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, options);
        
        if (response.ok) {
          return response;
        }
        
        // Si es un error 4xx, no reintentar
        if (response.status >= 400 && response.status < 500) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error) {
        lastError = error as Error;
        
        // Si es el último intento o es un error de cancelación, lanzar el error
        if (attempt === retries || error instanceof DOMException && error.name === 'AbortError') {
          throw lastError;
        }
        
        // Esperar antes del siguiente intento
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
      }
    }
    
    throw lastError!;
  }

  /**
   * Función principal de autocompletado
   */
  public async autocomplete(
    numeroDocumento: string, 
    options: AutocompleteOptions = {}
  ): Promise<AutocompleteResult> {
    const startTime = Date.now();
    const opts = { ...this.defaultOptions, ...options };
    
    try {
      // Validar el número de documento
      const validation = validateDocumentNumber(numeroDocumento);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', '),
          responseTime: Date.now() - startTime
        };
      }

      const numero = validation.formatted;

      // Verificar caché si está habilitado
      if (opts.useCache) {
        const cachedData = this.getCachedData(numero);
        if (cachedData) {
          return {
            success: true,
            data: cachedData,
            cached: true,
            responseTime: Date.now() - startTime
          };
        }
      }

      // Verificar si ya hay una solicitud pendiente para este número
      const pendingRequest = this.pendingRequests.get(numero);
      if (pendingRequest) {
        return await pendingRequest;
      }

      // Crear nueva solicitud
      const requestPromise = this.performRequest(numero, opts, startTime);
      this.pendingRequests.set(numero, requestPromise);

      try {
        const result = await requestPromise;
        return result;
      } finally {
        this.pendingRequests.delete(numero);
        this.abortControllers.delete(numero);
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Realiza la solicitud a la API de Decolecta
   */
  private async performRequest(
    numero: string, 
    opts: Required<AutocompleteOptions>, 
    startTime: number
  ): Promise<AutocompleteResult> {
    // Crear AbortController para esta solicitud
    const controller = new AbortController();
    this.abortControllers.set(numero, controller);

    // Configurar timeout
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, opts.timeout);

    try {
      // Usar endpoints internos de Next.js para no exponer el token
      const isRUC = numero.length === 11;
      const endpoint = isRUC 
        ? `/api/integrations/decolecta/sunat?ruc=${numero}` 
        : `/api/integrations/decolecta/reniec?dni=${numero}`;
      
      const response = await this.makeRequest(
        endpoint,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        },
        opts.retries,
        opts.retryDelay
      );

      clearTimeout(timeoutId);

      const payload = await response.json();
      
      // El API interno devuelve { ok, data, error }. Adaptar al formato esperado.
      if (!response.ok || (typeof payload === 'object' && payload && 'ok' in payload && payload.ok === false)) {
        const message = (payload && typeof payload === 'object' && 'error' in payload) ? String(payload.error) : `Error ${response.status}`;
        throw new Error(message);
      }
      
      const rawData: DecolectaResponse = (payload && typeof payload === 'object' && 'data' in payload) ? payload.data : payload;

      // Mapear los datos al formato interno
      const mappedData = mapDecolectaToSupplier(rawData);
      
      // Validar los datos mapeados
      const validation = validateMappedData(mappedData);
      
      // Guardar en caché si está habilitado
      if (opts.useCache) {
        this.setCachedData(numero, mappedData, opts.cacheExpiry);
      }

      return {
        success: validation.isValid,
        data: mappedData,
        warnings: validation.warnings.length > 0 ? validation.warnings : undefined,
        error: validation.isValid ? undefined : validation.errors.join(', '),
        responseTime: Date.now() - startTime
      };

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('Solicitud cancelada por timeout');
      }
      
      if (error instanceof Error) {
        // Si hay datos en caché, devolverlos como fallback
        const cachedData = this.getCachedData(numero);
        if (cachedData) {
          return {
            success: true,
            data: cachedData,
            cached: true,
            warnings: ['Servicio no disponible, retornando datos del caché'],
            responseTime: Date.now() - startTime
          };
        }
        
        // Mapear errores comunes
        if (error.message.includes('404')) {
          throw new Error('Número de documento no encontrado en SUNAT/RENIEC');
        }
        if (error.message.includes('500') || error.message.includes('502') || error.message.includes('503')) {
          throw new Error('Servicio de Decolecta/SUNAT/RENIEC temporalmente no disponible');
        }
        if (error.message.includes('Failed to fetch') || error.message.toLowerCase().includes('network')) {
          throw new Error('Error de conexión. Verifique su conexión a internet');
        }
      }
      
      throw error;
    }
  }

  /**
   * Limpia todo el caché
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Obtiene estadísticas del caché
   */
  public getCacheStats(): {
    size: number;
    entries: Array<{ numero: string; timestamp: number; expiry: number }>;
  } {
    this.cleanExpiredCache();
    
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([numero, entry]) => ({
        numero,
        timestamp: entry.timestamp,
        expiry: entry.expiry
      }))
    };
  }

  /**
   * Precarga datos para un conjunto de números de documento
   */
  public async preloadData(numeros: string[], options?: AutocompleteOptions): Promise<void> {
    const promises = numeros.map(numero => 
      this.autocomplete(numero, { ...options, useCache: true })
        .catch(() => {}) // Ignorar errores en precarga
    );
    
    await Promise.allSettled(promises);
  }
}

// Instancia singleton del servicio
export const decolectaService = new DecolectaAutocompleteService();

// Hook personalizado para React (opcional)
export function useDecolectaAutocomplete() {
  return {
    autocomplete: decolectaService.autocomplete.bind(decolectaService),
    cancelRequest: decolectaService.cancelRequest.bind(decolectaService),
    clearCache: decolectaService.clearCache.bind(decolectaService),
    getCacheStats: decolectaService.getCacheStats.bind(decolectaService),
    preloadData: decolectaService.preloadData.bind(decolectaService)
  };
}

// Función de conveniencia para uso directo
export async function autocompleteSupplier(
  numeroDocumento: string, 
  options?: AutocompleteOptions
): Promise<AutocompleteResult> {
  return decolectaService.autocomplete(numeroDocumento, options);
}