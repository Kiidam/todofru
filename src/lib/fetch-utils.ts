/**
 * Utilidades para realizar llamadas fetch con manejo de autenticación
 */

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

/**
 * Función fetch mejorada con manejo automático de autenticación
 * @param url - URL a la que hacer la petición
 * @param options - Opciones de fetch (se agregan credenciales automáticamente)
 * @returns Promise<Response>
 */
export async function authenticatedFetch(url: string, options: FetchOptions = {}): Promise<Response> {
  const { skipAuth = false, ...fetchOptions } = options;
  
  // Configuración por defecto para autenticación
  const defaultOptions: RequestInit = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
    ...fetchOptions,
  };

  // Si se especifica skipAuth, no agregar credenciales
  if (skipAuth) {
    delete defaultOptions.credentials;
  }

  const response = await fetch(url, defaultOptions);

  // Manejo automático de errores de autenticación
  if (response.status === 401 && !skipAuth) {
    console.error(`Error de autenticación en ${url}. Redirigiendo al login...`);
    window.location.href = '/login';
    throw new Error('Error de autenticación');
  }

  return response;
}

/**
 * Función fetch que devuelve directamente el JSON parseado
 * @param url - URL a la que hacer la petición
 * @param options - Opciones de fetch
 * @returns Promise<T> - Respuesta JSON parseada
 */
export async function fetchJson<T = unknown>(url: string, options: FetchOptions = {}): Promise<T> {
  const response = await authenticatedFetch(url, options);
  
  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Función para realizar peticiones GET con manejo de errores
 * @param url - URL a la que hacer la petición
 * @param options - Opciones adicionales
 * @returns Promise<T> - Respuesta tipada
 */
export async function apiGet<T = unknown>(url: string, options: FetchOptions = {}): Promise<T> {
  try {
    return await fetchJson<T>(url, { ...options, method: 'GET' });
  } catch (error) {
    console.error(`Error en GET ${url}:`, error);
    throw error;
  }
}

/**
 * Función para realizar peticiones POST con manejo de errores
 * @param url - URL a la que hacer la petición
 * @param data - Datos a enviar
 * @param options - Opciones adicionales
 * @returns Promise<T> - Respuesta tipada
 */
export async function apiPost<T = unknown>(url: string, data?: unknown, options: FetchOptions = {}): Promise<T> {
  try {
    const requestOptions: FetchOptions = {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    };
    
    return await fetchJson<T>(url, requestOptions);
  } catch (error) {
    console.error(`Error en POST ${url}:`, error);
    throw error;
  }
}

/**
 * Función para realizar peticiones PUT con manejo de errores
 * @param url - URL a la que hacer la petición
 * @param data - Datos a enviar
 * @param options - Opciones adicionales
 * @returns Promise<T> - Respuesta tipada
 */
export async function apiPut<T = unknown>(url: string, data?: unknown, options: FetchOptions = {}): Promise<T> {
  try {
    const requestOptions: FetchOptions = {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    };
    
    return await fetchJson<T>(url, requestOptions);
  } catch (error) {
    console.error(`Error en PUT ${url}:`, error);
    throw error;
  }
}

/**
 * Función para realizar peticiones DELETE con manejo de errores
 * @param url - URL a la que hacer la petición
 * @param options - Opciones adicionales
 * @returns Promise<T> - Respuesta tipada
 */
export async function apiDelete<T = unknown>(url: string, options: FetchOptions = {}): Promise<T> {
  try {
    return await fetchJson<T>(url, { ...options, method: 'DELETE' });
  } catch (error) {
    console.error(`Error en DELETE ${url}:`, error);
    throw error;
  }
}