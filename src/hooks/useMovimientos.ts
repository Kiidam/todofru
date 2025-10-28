import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import type { 
  MovimientoInventario, 
  TipoMovimiento
} from '../types/todafru';

interface MovimientoFilters {
  productoId?: string;
  tipo?: TipoMovimiento;
  fechaDesde?: string;
  fechaHasta?: string;
  motivo?: string;
  page?: number;
  limit?: number;
  [key: string]: unknown;
}

interface MovimientoCreate {
  productoId: string;
  tipo: TipoMovimiento;
  cantidad: number;
  precio?: number;
  motivo?: string;
  numeroGuia?: string;
}

interface MovimientoUpdate {
  motivo?: string;
  numeroGuia?: string;
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface EstadisticasMovimientos {
  resumen: {
    totalMovimientos: number;
    cantidadTotal: number;
    cantidadPromedio: number;
    periodo: {
      desde: string;
      hasta: string;
    };
  };
  porTipo: Array<{
    tipo: string;
    cantidad: number;
    cantidadTotal: number;
    cantidadPromedio: number;
    porcentaje: string;
  }>;
  porPeriodo?: unknown[];
  productosTop?: unknown[];
  usuariosTop?: unknown[];
  alertas?: unknown[];
  tendencias?: unknown;
}

interface UseMovimientosState {
  movimientos: MovimientoInventario[];
  loading: boolean;
  error: string | null;
  pagination: PaginationInfo | null;
  estadisticas: EstadisticasMovimientos | null;
  syncStatus: 'idle' | 'syncing' | 'error' | 'success';
  lastSync: Date | null;
}

interface UseMovimientosActions {
  fetchMovimientos: (filters?: MovimientoFilters) => Promise<void>;
  createMovimiento: (data: MovimientoCreate) => Promise<MovimientoInventario | null>;
  updateMovimiento: (id: string, data: MovimientoUpdate) => Promise<MovimientoInventario | null>;
  deleteMovimiento: (id: string) => Promise<boolean>;
  getMovimiento: (id: string) => Promise<MovimientoInventario | null>;
  fetchEstadisticas: (filters?: MovimientoFilters) => Promise<void>;
  refreshData: () => Promise<void>;
  clearError: () => void;
  resetFilters: () => void;
}

const API_BASE = '/api/movimientos-v2';
const SYNC_INTERVAL = 30000; // 30 segundos

export function useMovimientos(initialFilters?: MovimientoFilters): UseMovimientosState & UseMovimientosActions {
  const [state, setState] = useState<UseMovimientosState>({
    movimientos: [],
    loading: false,
    error: null,
    pagination: null,
    estadisticas: null,
    syncStatus: 'idle',
    lastSync: null
  });

  const [filters, setFilters] = useState<MovimientoFilters>(initialFilters || {});
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Función para realizar peticiones HTTP con manejo de errores
  const apiRequest = useCallback(async (url: string, options: RequestInit = {}) => {
    // Cancelar petición anterior si existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        signal: abortControllerRef.current.signal,
      });
  
      if (!response.ok) {
        let errorMessage = `Error ${response.status}: ${response.statusText}`;
        
        try {
          const errorData = await response.json();
          if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          // Si no se puede parsear el JSON, usar el mensaje por defecto
        }
        
        throw new Error(errorMessage);
      }
  
      return await response.json();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return null; // Petición cancelada, no es un error
      }
      
      console.error('API Request Error:', error);
      throw error;
    }
  }, []);

  // Función para construir URL con parámetros de consulta
  const buildQueryString = useCallback((params: Record<string, unknown>): string => {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });

    return searchParams.toString();
  }, []);

  // Obtener movimientos con filtros
  const fetchMovimientos = useCallback(async (newFilters?: MovimientoFilters) => {
    setState(prev => ({ ...prev, loading: true, error: null, syncStatus: 'syncing' }));

    try {
      const currentFilters = { ...filters, ...newFilters };
      const queryString = buildQueryString(currentFilters);
      const url = `${API_BASE}${queryString ? `?${queryString}` : ''}`;

      const response = await apiRequest(url);

      if (response?.success) {
        setState(prev => ({
          ...prev,
          movimientos: response.data.movimientos,
          estadisticas: response.data.estadisticas,
          pagination: response.pagination || null,
          syncStatus: 'success',
          lastSync: new Date(),
          error: null
        }));

        if (newFilters) {
          setFilters(currentFilters);
        }
      } else {
        throw new Error(response?.message || 'Error al cargar movimientos');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        syncStatus: 'error'
      }));
      toast.error(`Error al cargar movimientos: ${errorMessage}`);
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [filters, apiRequest, buildQueryString]);

  // Crear nuevo movimiento
  const createMovimiento = useCallback(async (data: MovimientoCreate): Promise<MovimientoInventario | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await apiRequest(API_BASE, {
        method: 'POST',
        body: JSON.stringify(data),
      });

      if (response?.success) {
        const nuevoMovimiento = response.data.movimiento;
        
        setState(prev => ({
          ...prev,
          movimientos: [nuevoMovimiento, ...prev.movimientos],
          error: null
        }));

        // Mostrar alertas si existen
        if (response.data.alertas && response.data.alertas.length > 0) {
          response.data.alertas.forEach((alerta: string) => {
            toast.error(alerta);
          });
        }

        toast.success('Movimiento creado exitosamente');
        
        // Refrescar datos para mantener sincronización
        await fetchMovimientos();
        
        return nuevoMovimiento;
      } else {
        throw new Error(response?.message || 'Error al crear movimiento');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setState(prev => ({ ...prev, error: errorMessage }));
      toast.error(`Error al crear movimiento: ${errorMessage}`);
      return null;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [apiRequest, fetchMovimientos]);

  // Actualizar movimiento existente
  const updateMovimiento = useCallback(async (id: string, data: MovimientoUpdate): Promise<MovimientoInventario | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await apiRequest(`${API_BASE}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });

      if (response?.success) {
        const movimientoActualizado = response.data;
        
        setState(prev => ({
          ...prev,
          movimientos: prev.movimientos.map(mov => 
            mov.id === id ? movimientoActualizado : mov
          ),
          error: null
        }));

        toast.success('Movimiento actualizado exitosamente');
        return movimientoActualizado;
      } else {
        throw new Error(response?.message || 'Error al actualizar movimiento');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setState(prev => ({ ...prev, error: errorMessage }));
      toast.error(`Error al actualizar movimiento: ${errorMessage}`);
      return null;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [apiRequest]);

  // Eliminar movimiento
  const deleteMovimiento = useCallback(async (id: string): Promise<boolean> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await apiRequest(`${API_BASE}/${id}`, {
        method: 'DELETE',
      });

      if (response?.success) {
        setState(prev => ({
          ...prev,
          movimientos: prev.movimientos.filter(mov => mov.id !== id),
          error: null
        }));

        toast.success('Movimiento eliminado exitosamente');
        
        // Refrescar datos para mantener sincronización
        await fetchMovimientos();
        
        return true;
      } else {
        throw new Error(response?.message || 'Error al eliminar movimiento');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setState(prev => ({ ...prev, error: errorMessage }));
      toast.error(`Error al eliminar movimiento: ${errorMessage}`);
      return false;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [apiRequest, fetchMovimientos]);

  // Obtener movimiento específico
  const getMovimiento = useCallback(async (id: string): Promise<MovimientoInventario | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await apiRequest(`${API_BASE}/${id}`);

      if (response?.success) {
        setState(prev => ({ ...prev, error: null }));
        return response.data.movimiento;
      } else {
        throw new Error(response?.message || 'Error al obtener movimiento');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setState(prev => ({ ...prev, error: errorMessage }));
      toast.error(`Error al obtener movimiento: ${errorMessage}`);
      return null;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [apiRequest]);

  // Obtener estadísticas
  const fetchEstadisticas = useCallback(async (statsFilters?: MovimientoFilters) => {
    try {
      const queryString = buildQueryString(statsFilters || {});
      const url = `${API_BASE}/estadisticas${queryString ? `?${queryString}` : ''}`;

      const response = await apiRequest(url);

      if (response?.success) {
        setState(prev => ({
          ...prev,
          estadisticas: response.data,
          error: null
        }));
      } else {
        throw new Error(response?.message || 'Error al cargar estadísticas');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      console.error('Error al cargar estadísticas:', errorMessage);
      // No mostramos toast para estadísticas para evitar spam
    }
  }, [apiRequest, buildQueryString]);

  // Refrescar todos los datos
  const refreshData = useCallback(async () => {
    await Promise.all([
      fetchMovimientos(),
      fetchEstadisticas()
    ]);
  }, [fetchMovimientos, fetchEstadisticas]);

  // Limpiar error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Resetear filtros
  const resetFilters = useCallback(() => {
    setFilters({});
    fetchMovimientos({});
  }, [fetchMovimientos]);

  // Configurar sincronización automática
  useEffect(() => {
    // Cargar datos iniciales
    fetchMovimientos();
    fetchEstadisticas();

    // Configurar sincronización automática
    syncIntervalRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshData();
      }
    }, SYNC_INTERVAL);

    // Sincronizar cuando la página vuelve a ser visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchMovimientos, fetchEstadisticas, refreshData]);

  return {
    // Estado
    ...state,
    
    // Acciones
    fetchMovimientos,
    createMovimiento,
    updateMovimiento,
    deleteMovimiento,
    getMovimiento,
    fetchEstadisticas,
    refreshData,
    clearError,
    resetFilters
  };
}