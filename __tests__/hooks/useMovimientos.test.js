/**
 * Pruebas unitarias para el hook useMovimientos
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useMovimientos } from '../../src/hooks/useMovimientos';

// Mock de fetch
global.fetch = jest.fn();

// Mock de toast
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('useMovimientos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('debería inicializar con estado por defecto', () => {
    const { result } = renderHook(() => useMovimientos());

    expect(result.current.movimientos).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.pagination).toBe(null);
    expect(result.current.estadisticas).toBe(null);
    expect(result.current.syncStatus).toBe('idle');
    expect(result.current.lastSync).toBe(null);
  });

  describe('fetchMovimientos', () => {
    it('debería cargar movimientos exitosamente', async () => {
      const mockResponse = {
        movimientos: [
          {
            id: '1',
            tipo: 'ENTRADA',
            cantidad: 10,
            producto: { nombre: 'Producto Test' },
            usuario: { name: 'Usuario Test' },
            createdAt: '2024-01-01T00:00:00Z',
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useMovimientos());

      await act(async () => {
        await result.current.fetchMovimientos();
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.movimientos).toHaveLength(1);
      expect(result.current.pagination).toEqual(mockResponse.pagination);
      expect(result.current.error).toBe(null);
    });

    it('debería manejar errores al cargar movimientos', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Error del servidor' }),
      });

      const { result } = renderHook(() => useMovimientos());

      await act(async () => {
        await result.current.fetchMovimientos();
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.movimientos).toEqual([]);
      expect(result.current.error).toBe('Error del servidor');
    });

    it('debería aplicar filtros correctamente', async () => {
      const mockResponse = {
        movimientos: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useMovimientos());

      const filters = {
        tipo: 'ENTRADA',
        fechaDesde: '2024-01-01',
        fechaHasta: '2024-01-31',
        productoId: 'prod1',
      };

      await act(async () => {
        await result.current.fetchMovimientos(filters);
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/movimientos-v2?tipo=ENTRADA&fechaDesde=2024-01-01&fechaHasta=2024-01-31&productoId=prod1')
      );
    });
  });

  describe('createMovimiento', () => {
    it('debería crear un movimiento exitosamente', async () => {
      const nuevoMovimiento = {
        id: '2',
        tipo: 'ENTRADA',
        cantidad: 5,
        producto: { nombre: 'Nuevo Producto' },
        usuario: { name: 'Usuario Test' },
        createdAt: '2024-01-01T00:00:00Z',
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ movimiento: nuevoMovimiento }),
      });

      const { result } = renderHook(() => useMovimientos());

      // Establecer movimientos iniciales
      await act(async () => {
        result.current.movimientos = [
          {
            id: '1',
            tipo: 'SALIDA',
            cantidad: 3,
            producto: { nombre: 'Producto Existente' },
            usuario: { name: 'Usuario Test' },
            createdAt: '2024-01-01T00:00:00Z',
          },
        ];
      });

      const movimientoData = {
        productoId: 'prod1',
        tipo: 'ENTRADA',
        cantidad: 5,
        motivo: 'Compra',
      };

      let success;
      await act(async () => {
        success = await result.current.createMovimiento(movimientoData);
      });

      expect(success).toBe(true);
      expect(fetch).toHaveBeenCalledWith('/api/movimientos-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(movimientoData),
      });
    });

    it('debería manejar errores al crear movimiento', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Datos inválidos' }),
      });

      const { result } = renderHook(() => useMovimientos());

      const movimientoData = {
        productoId: '',
        tipo: 'ENTRADA',
        cantidad: 0,
        motivo: '',
      };

      let success;
      await act(async () => {
        success = await result.current.createMovimiento(movimientoData);
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Datos inválidos');
    });
  });

  describe('updateMovimiento', () => {
    it('debería actualizar un movimiento exitosamente', async () => {
      const movimientoActualizado = {
        id: '1',
        tipo: 'ENTRADA',
        cantidad: 10,
        motivo: 'Motivo actualizado',
        producto: { nombre: 'Producto Test' },
        usuario: { name: 'Usuario Test' },
        createdAt: '2024-01-01T00:00:00Z',
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ movimiento: movimientoActualizado }),
      });

      const { result } = renderHook(() => useMovimientos());

      // Establecer movimientos iniciales
      await act(async () => {
        result.current.movimientos = [
          {
            id: '1',
            tipo: 'ENTRADA',
            cantidad: 10,
            motivo: 'Motivo original',
            producto: { nombre: 'Producto Test' },
            usuario: { name: 'Usuario Test' },
            createdAt: '2024-01-01T00:00:00Z',
          },
        ];
      });

      const updateData = { motivo: 'Motivo actualizado' };

      let success;
      await act(async () => {
        success = await result.current.updateMovimiento('1', updateData);
      });

      expect(success).toBe(true);
      expect(fetch).toHaveBeenCalledWith('/api/movimientos-v2/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
    });
  });

  describe('deleteMovimiento', () => {
    it('debería eliminar un movimiento exitosamente', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Movimiento eliminado' }),
      });

      const { result } = renderHook(() => useMovimientos());

      // Establecer movimientos iniciales
      await act(async () => {
        result.current.movimientos = [
          {
            id: '1',
            tipo: 'ENTRADA',
            cantidad: 10,
            producto: { nombre: 'Producto Test' },
            usuario: { name: 'Usuario Test' },
            createdAt: '2024-01-01T00:00:00Z',
          },
          {
            id: '2',
            tipo: 'SALIDA',
            cantidad: 5,
            producto: { nombre: 'Producto Test 2' },
            usuario: { name: 'Usuario Test' },
            createdAt: '2024-01-01T00:00:00Z',
          },
        ];
      });

      let success;
      await act(async () => {
        success = await result.current.deleteMovimiento('1');
      });

      expect(success).toBe(true);
      expect(fetch).toHaveBeenCalledWith('/api/movimientos-v2/1', {
        method: 'DELETE',
      });
    });
  });

  describe('getMovimiento', () => {
    it('debería obtener un movimiento específico', async () => {
      const movimiento = {
        id: '1',
        tipo: 'ENTRADA',
        cantidad: 10,
        producto: { nombre: 'Producto Test' },
        usuario: { name: 'Usuario Test' },
        createdAt: '2024-01-01T00:00:00Z',
        movimientosAnteriores: [],
        movimientosPosteriores: [],
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ movimiento }),
      });

      const { result } = renderHook(() => useMovimientos());

      let movimientoObtenido;
      await act(async () => {
        movimientoObtenido = await result.current.getMovimiento('1');
      });

      expect(movimientoObtenido).toEqual(movimiento);
      expect(fetch).toHaveBeenCalledWith('/api/movimientos-v2/1');
    });
  });

  describe('fetchEstadisticas', () => {
    it('debería cargar estadísticas exitosamente', async () => {
      const estadisticas = {
        resumen: { totalMovimientos: 100 },
        porTipo: [
          { tipo: 'ENTRADA', cantidad: 60, porcentaje: 60 },
          { tipo: 'SALIDA', cantidad: 40, porcentaje: 40 },
        ],
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => estadisticas,
      });

      const { result } = renderHook(() => useMovimientos());

      await act(async () => {
        await result.current.fetchEstadisticas();
      });

      expect(result.current.estadisticas).toEqual(estadisticas);
      expect(fetch).toHaveBeenCalledWith('/api/movimientos-v2/estadisticas');
    });
  });

  describe('refreshData', () => {
    it('debería refrescar los datos', async () => {
      const mockResponse = {
        movimientos: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
      };

      fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useMovimientos());

      await act(async () => {
        await result.current.refreshData();
      });

      expect(result.current.syncStatus).toBe('success');
      expect(result.current.lastSync).toBeInstanceOf(Date);
    });
  });

  describe('sincronización automática', () => {
    it('debería sincronizar automáticamente cada 30 segundos', async () => {
      jest.useFakeTimers();

      const mockResponse = {
        movimientos: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
      };

      fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useMovimientos());

      // Avanzar 30 segundos
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/movimientos-v2'));
      });

      jest.useRealTimers();
    });
  });

  describe('clearError', () => {
    it('debería limpiar el error', () => {
      const { result } = renderHook(() => useMovimientos());

      // Establecer un error
      act(() => {
        result.current.error = 'Error de prueba';
      });

      // Limpiar el error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBe(null);
    });
  });

  describe('resetFilters', () => {
    it('debería resetear los filtros y recargar datos', async () => {
      const mockResponse = {
        movimientos: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
      };

      fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useMovimientos());

      await act(async () => {
        await result.current.resetFilters();
      });

      expect(fetch).toHaveBeenCalledWith('/api/movimientos-v2?page=1&limit=20');
    });
  });
});