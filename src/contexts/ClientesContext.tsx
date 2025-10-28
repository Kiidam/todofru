"use client";

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { Cliente, ClientePayload, TipoCliente, TipoEntidad } from '../types/cliente';

// Tipos para el estado del contexto
interface ClientesState {
  clientes: Cliente[];
  loading: boolean;
  error: string | null;
  selectedCliente: Cliente | null;
  filters: {
    search: string;
    tipoCliente: TipoCliente | '';
    tipoEntidad: TipoEntidad | '';
    activo: boolean | null;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  cache: {
    lastFetch: number | null;
    isStale: boolean;
  };
}

// Tipos para las acciones
type ClientesAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CLIENTES'; payload: { clientes: Cliente[]; total: number; page: number; totalPages: number } }
  | { type: 'ADD_CLIENTE'; payload: Cliente }
  | { type: 'UPDATE_CLIENTE'; payload: Cliente }
  | { type: 'DELETE_CLIENTE'; payload: string }
  | { type: 'SET_SELECTED_CLIENTE'; payload: Cliente | null }
  | { type: 'SET_FILTERS'; payload: Partial<ClientesState['filters']> }
  | { type: 'SET_PAGINATION'; payload: Partial<ClientesState['pagination']> }
  | { type: 'INVALIDATE_CACHE' }
  | { type: 'RESET_STATE' };

// Estado inicial
const initialState: ClientesState = {
  clientes: [],
  loading: false,
  error: null,
  selectedCliente: null,
  filters: {
    search: '',
    tipoCliente: '',
    tipoEntidad: '',
    activo: null,
  },
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  },
  cache: {
    lastFetch: null,
    isStale: true,
  },
};

// Reducer para manejar las acciones
function clientesReducer(state: ClientesState, action: ClientesAction): ClientesState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    
    case 'SET_CLIENTES':
      return {
        ...state,
        clientes: action.payload.clientes,
        pagination: {
          ...state.pagination,
          total: action.payload.total,
          page: action.payload.page,
          totalPages: action.payload.totalPages,
        },
        loading: false,
        error: null,
        cache: {
          lastFetch: Date.now(),
          isStale: false,
        },
      };
    
    case 'ADD_CLIENTE':
      return {
        ...state,
        clientes: [action.payload, ...state.clientes],
        pagination: {
          ...state.pagination,
          total: state.pagination.total + 1,
        },
        cache: { ...state.cache, isStale: true },
      };
    
    case 'UPDATE_CLIENTE':
      return {
        ...state,
        clientes: state.clientes.map(cliente =>
          cliente.id === action.payload.id ? action.payload : cliente
        ),
        selectedCliente: state.selectedCliente?.id === action.payload.id ? action.payload : state.selectedCliente,
        cache: { ...state.cache, isStale: true },
      };
    
    case 'DELETE_CLIENTE':
      return {
        ...state,
        clientes: state.clientes.filter(cliente => cliente.id !== action.payload),
        selectedCliente: state.selectedCliente?.id === action.payload ? null : state.selectedCliente,
        pagination: {
          ...state.pagination,
          total: Math.max(0, state.pagination.total - 1),
        },
        cache: { ...state.cache, isStale: true },
      };
    
    case 'SET_SELECTED_CLIENTE':
      return { ...state, selectedCliente: action.payload };
    
    case 'SET_FILTERS':
      return {
        ...state,
        filters: { ...state.filters, ...action.payload },
        pagination: { ...state.pagination, page: 1 }, // Reset page when filters change
        cache: { ...state.cache, isStale: true },
      };
    
    case 'SET_PAGINATION':
      return {
        ...state,
        pagination: { ...state.pagination, ...action.payload },
        cache: { ...state.cache, isStale: true },
      };
    
    case 'INVALIDATE_CACHE':
      return {
        ...state,
        cache: { ...state.cache, isStale: true },
      };
    
    case 'RESET_STATE':
      return initialState;
    
    default:
      return state;
  }
}

// Contexto
interface ClientesContextType {
  state: ClientesState;
  actions: {
    fetchClientes: () => Promise<void>;
    createCliente: (clienteData: ClientePayload) => Promise<Cliente>;
    updateCliente: (id: string, clienteData: Partial<ClientePayload>) => Promise<Cliente>;
    deleteCliente: (id: string) => Promise<void>;
    toggleClienteStatus: (id: string) => Promise<void>;
    selectCliente: (cliente: Cliente | null) => void;
    setFilters: (filters: Partial<ClientesState['filters']>) => void;
    setPagination: (pagination: Partial<ClientesState['pagination']>) => void;
    refreshClientes: () => Promise<void>;
    clearError: () => void;
    resetState: () => void;
  };
}

const ClientesContext = createContext<ClientesContextType | undefined>(undefined);

// Hook para usar el contexto
export function useClientes() {
  const context = useContext(ClientesContext);
  if (context === undefined) {
    throw new Error('useClientes debe ser usado dentro de un ClientesProvider');
  }
  return context;
}

// Constantes de configuración
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 segundo

// Provider del contexto
interface ClientesProviderProps {
  children: React.ReactNode;
}

export function ClientesProvider({ children }: ClientesProviderProps) {
  const [state, dispatch] = useReducer(clientesReducer, initialState);

  // Función auxiliar para hacer peticiones con reintentos
  const fetchWithRetry = useCallback(async (url: string, options: RequestInit = {}, retries = MAX_RETRIES): Promise<Response> => {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return fetchWithRetry(url, options, retries - 1);
      }
      throw error;
    }
  }, []);

  // Función para construir URL con parámetros de consulta
  const buildQueryUrl = useCallback((baseUrl: string, params: Record<string, unknown>) => {
    const url = new URL(baseUrl, window.location.origin);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        url.searchParams.append(key, String(value));
      }
    });
    return url.toString();
  }, []);

  // Acción para obtener clientes
  const fetchClientes = useCallback(async () => {
    // Verificar si necesitamos hacer fetch
    const now = Date.now();
    const { lastFetch, isStale } = state.cache;
    
    if (!isStale && lastFetch && (now - lastFetch) < CACHE_DURATION) {
      return; // Usar datos en caché
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const queryParams = {
        page: state.pagination.page,
        limit: state.pagination.limit,
        search: state.filters.search,
        tipoCliente: state.filters.tipoCliente,
        tipoEntidad: state.filters.tipoEntidad,
        activo: state.filters.activo,
      };

      const url = buildQueryUrl('/api/clientes', queryParams);
      const response = await fetchWithRetry(url);
      const data = await response.json();

      if (data.success) {
        dispatch({
          type: 'SET_CLIENTES',
          payload: {
            clientes: data.data,
            total: data.pagination?.total || 0,
            page: data.pagination?.page || 1,
            totalPages: data.pagination?.totalPages || 1,
          },
        });
      } else {
        throw new Error(data.error || 'Error al cargar clientes');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido al cargar clientes';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    }
  }, [state.cache, state.pagination, state.filters, buildQueryUrl, fetchWithRetry]);

  // Acción para crear cliente
  const createCliente = useCallback(async (clienteData: ClientePayload): Promise<Cliente> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const response = await fetchWithRetry('/api/clientes', {
        method: 'POST',
        body: JSON.stringify(clienteData),
      });

      const data = await response.json();

      if (data.success) {
        // Use server-provided cliente but sanitize strings to avoid injected HTML/icons
        const raw = (data.data ?? {}) as Record<string, unknown>;

        const stripTags = (s: unknown) => {
          if (typeof s !== 'string') return '';
          // Basic strip tags and common icon characters
          return s.replace(/<[^>]*>/g, '').replace(/[\uE000-\uF8FF]/g, '').trim();
        };

        const mapString = (k: string) => stripTags(raw[k]);
        const mapOptional = (k: string) => {
          const v = raw[k];
          if (v === undefined || v === null) return undefined;
          const s = stripTags(v);
          return s === '' ? undefined : s;
        };

        const clientObj: Cliente = {
          id: String(raw.id ?? `c-${Date.now()}`),
          nombre: mapString('nombre') || mapString('razonSocial') || `${mapOptional('nombres') || ''} ${mapOptional('apellidos') || ''}`.trim() || 'Cliente',
          tipoEntidad: (raw.tipoEntidad as TipoEntidad) || 'PERSONA_JURIDICA',
          tipoCliente: (raw.tipoCliente as TipoCliente) || 'MINORISTA',
          numeroIdentificacion: String(raw.numeroIdentificacion ?? raw.ruc ?? ''),
          nombres: mapOptional('nombres') ?? undefined,
          apellidos: mapOptional('apellidos') ?? undefined,
          razonSocial: mapOptional('razonSocial') ?? undefined,
          contacto: mapOptional('contacto') ?? undefined,
          telefono: mapOptional('telefono') ?? undefined,
          email: mapOptional('email') ?? undefined,
          direccion: mapOptional('direccion') ?? undefined,
          mensajePersonalizado: mapOptional('mensajePersonalizado') ?? undefined,
          activo: typeof raw.activo === 'boolean' ? Boolean(raw.activo) : true,
          createdAt: raw.createdAt ? new Date(String(raw.createdAt)) : new Date(),
          updatedAt: raw.updatedAt ? new Date(String(raw.updatedAt)) : undefined,
        } as Cliente;

        dispatch({ type: 'ADD_CLIENTE', payload: clientObj });
        return clientObj;
      } else {
        throw new Error(data.error || 'Error al crear cliente');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido al crear cliente';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [fetchWithRetry]);

  // Acción para actualizar cliente
  const updateCliente = useCallback(async (id: string, clienteData: Partial<ClientePayload>): Promise<Cliente> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const response = await fetchWithRetry(`/api/clientes/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(clienteData),
      });

      const data = await response.json();

      if (data.success) {
        const clienteActualizado = data.data;
        dispatch({ type: 'UPDATE_CLIENTE', payload: clienteActualizado });
        return clienteActualizado;
      } else {
        throw new Error(data.error || 'Error al actualizar cliente');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido al actualizar cliente';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [fetchWithRetry]);

  // Acción para eliminar cliente
  const deleteCliente = useCallback(async (id: string): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const response = await fetchWithRetry(`/api/clientes/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        dispatch({ type: 'DELETE_CLIENTE', payload: id });
      } else {
        throw new Error(data.error || 'Error al eliminar cliente');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido al eliminar cliente';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [fetchWithRetry]);

  // Acción para alternar estado del cliente
  const toggleClienteStatus = useCallback(async (id: string): Promise<void> => {
    try {
      const cliente = state.clientes.find(c => c.id === id);
      if (!cliente) {
        dispatch({ type: 'SET_ERROR', payload: 'Cliente no encontrado' });
        return;
      }

      // Construir payload con tipo explícito
      const payload: Partial<ClientePayload> = { activo: !cliente.activo } as Partial<ClientePayload>;

      await updateCliente(id, payload);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al alternar estado del cliente';
      dispatch({ type: 'SET_ERROR', payload: message });
      // No relanzar para evitar que la UI principal reciba una excepción no manejada
      return;
    }
  }, [state.clientes, updateCliente]);

  // Acciones síncronas
  const selectCliente = useCallback((cliente: Cliente | null) => {
    dispatch({ type: 'SET_SELECTED_CLIENTE', payload: cliente });
  }, []);

  const setFilters = useCallback((filters: Partial<ClientesState['filters']>) => {
    dispatch({ type: 'SET_FILTERS', payload: filters });
  }, []);

  const setPagination = useCallback((pagination: Partial<ClientesState['pagination']>) => {
    dispatch({ type: 'SET_PAGINATION', payload: pagination });
  }, []);

  const refreshClientes = useCallback(async () => {
    dispatch({ type: 'INVALIDATE_CACHE' });
    await fetchClientes();
  }, [fetchClientes]);

  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  const resetState = useCallback(() => {
    dispatch({ type: 'RESET_STATE' });
  }, []);

  // Efecto para cargar clientes automáticamente cuando cambian filtros o paginación
  useEffect(() => {
    if (state.cache.isStale) {
      fetchClientes();
    }
  }, [state.filters, state.pagination.page, state.pagination.limit, fetchClientes, state.cache.isStale]);

  // Valor del contexto
  const contextValue: ClientesContextType = {
    state,
    actions: {
      fetchClientes,
      createCliente,
      updateCliente,
      deleteCliente,
      toggleClienteStatus,
      selectCliente,
      setFilters,
      setPagination,
      refreshClientes,
      clearError,
      resetState,
    },
  };

  return (
    <ClientesContext.Provider value={contextValue}>
      {children}
    </ClientesContext.Provider>
  );
}

export default ClientesContext;