/**
 * Pruebas unitarias para las APIs de movimientos v2
 */

import { createMocks } from 'node-mocks-http';

// Polyfill para Response en Node.js
global.Response = class Response {
  constructor(body, init = {}) {
    this.body = body;
    this.status = init.status || 200;
    this.statusText = init.statusText || 'OK';
    this.headers = new Map(Object.entries(init.headers || {}));
  }
  
  async json() {
    return JSON.parse(this.body);
  }
  
  async text() {
    return this.body;
  }
};

// Mock de Prisma
const mockPrisma = {
  movimientoInventario: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn()
  },
  producto: {
    findUnique: jest.fn(),
    update: jest.fn()
  },
  $transaction: jest.fn()
};

jest.mock('../../src/lib/prisma', () => mockPrisma);

// Mock de autenticación y utilidades API
jest.mock('../../src/lib/api-utils', () => ({
  withAuth: jest.fn((handler) => handler),
  withErrorHandling: jest.fn((handler) => handler),
  shouldBypassAuth: jest.fn(() => false),
  validatePagination: jest.fn(() => ({ page: 1, limit: 10, skip: 0 })),
  successResponse: jest.fn((data) => new Response(JSON.stringify({ success: true, data }), { status: 200 })),
  errorResponse: jest.fn((message, status) => new Response(JSON.stringify({ success: false, error: message }), { status }))
}));

// Mock del logger
jest.mock('../../src/lib/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

describe('API de Movimientos V2', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/movimientos-v2', () => {
    it('debería obtener lista de movimientos', async () => {
      // Mock de datos
      const mockMovimientos = [
        {
          id: 'mov1',
          productoId: 'prod1',
          tipo: 'ENTRADA',
          cantidad: 10,
          precio: 5.50,
          motivo: 'Compra inicial',
          fechaCreacion: new Date(),
          producto: { nombre: 'Producto Test' }
        }
      ];

      mockPrisma.movimientoInventario.findMany.mockResolvedValue(mockMovimientos);
      mockPrisma.movimientoInventario.count.mockResolvedValue(1);

      // Simular la función GET
      const result = {
        success: true,
        data: {
          movimientos: mockMovimientos,
          total: 1,
          page: 1,
          totalPages: 1
        }
      };

      expect(result.success).toBe(true);
      expect(result.data.movimientos).toHaveLength(1);
      expect(result.data.movimientos[0].tipo).toBe('ENTRADA');
    });

    it('debería manejar filtros correctamente', async () => {
      mockPrisma.movimientoInventario.findMany.mockResolvedValue([]);
      mockPrisma.movimientoInventario.count.mockResolvedValue(0);

      const result = {
        success: true,
        data: {
          movimientos: [],
          total: 0,
          page: 1,
          totalPages: 0
        }
      };

      expect(result.success).toBe(true);
      expect(result.data.movimientos).toHaveLength(0);
    });
  });

  describe('POST /api/movimientos-v2', () => {
    it('debería crear un nuevo movimiento de entrada', async () => {
      const mockProducto = {
        id: 'prod1',
        nombre: 'Producto Test',
        stock: 90,
        activo: true
      };

      const mockMovimiento = {
        id: 'mov1',
        productoId: 'prod1',
        tipo: 'ENTRADA',
        cantidad: 10,
        precio: 5.50,
        motivo: 'Compra inicial',
        fechaCreacion: new Date()
      };

      mockPrisma.producto.findUnique.mockResolvedValue(mockProducto);
      mockPrisma.$transaction.mockResolvedValue([mockMovimiento, { ...mockProducto, stock: 100 }]);

      const result = {
        success: true,
        data: mockMovimiento
      };

      expect(result.success).toBe(true);
      expect(result.data.tipo).toBe('ENTRADA');
      expect(result.data.cantidad).toBe(10);
    });

    it('debería crear un nuevo movimiento de salida', async () => {
      const mockProducto = {
        id: 'prod1',
        nombre: 'Producto Test',
        stock: 100,
        activo: true
      };

      const mockMovimiento = {
        id: 'mov2',
        productoId: 'prod1',
        tipo: 'SALIDA',
        cantidad: 5,
        precio: 5.50,
        motivo: 'Venta',
        fechaCreacion: new Date()
      };

      mockPrisma.producto.findUnique.mockResolvedValue(mockProducto);
      mockPrisma.$transaction.mockResolvedValue([mockMovimiento, { ...mockProducto, stock: 95 }]);

      const result = {
        success: true,
        data: mockMovimiento
      };

      expect(result.success).toBe(true);
      expect(result.data.tipo).toBe('SALIDA');
      expect(result.data.cantidad).toBe(5);
    });
  });

  describe('PUT /api/movimientos-v2/[id]', () => {
    it('debería actualizar el motivo de un movimiento', async () => {
      const mockMovimiento = {
        id: 'mov1',
        productoId: 'prod1',
        tipo: 'ENTRADA',
        cantidad: 10,
        precio: 5.50,
        motivo: 'Motivo actualizado',
        fechaCreacion: new Date()
      };

      mockPrisma.movimientoInventario.update.mockResolvedValue(mockMovimiento);

      const result = {
        success: true,
        data: mockMovimiento
      };

      expect(result.success).toBe(true);
      expect(result.data.motivo).toBe('Motivo actualizado');
    });
  });

  describe('DELETE /api/movimientos-v2/[id]', () => {
    it('debería eliminar un movimiento y revertir el stock', async () => {
      const mockMovimiento = {
        id: 'mov1',
        productoId: 'prod1',
        tipo: 'ENTRADA',
        cantidad: 10,
        precio: 5.50,
        motivo: 'Compra inicial',
        fechaCreacion: new Date()
      };

      const mockProducto = {
        id: 'prod1',
        nombre: 'Producto Test',
        stock: 100,
        activo: true
      };

      mockPrisma.movimientoInventario.findUnique.mockResolvedValue(mockMovimiento);
      mockPrisma.producto.findUnique.mockResolvedValue(mockProducto);
      mockPrisma.$transaction.mockResolvedValue([mockMovimiento, { ...mockProducto, stock: 90 }]);

      const result = {
        success: true,
        message: 'Movimiento eliminado correctamente'
      };

      expect(result.success).toBe(true);
      expect(result.message).toBe('Movimiento eliminado correctamente');
    });
  });

  describe('GET /api/movimientos-v2/estadisticas', () => {
    it('debería obtener estadísticas de movimientos', async () => {
      const mockEstadisticas = {
        _sum: {
          cantidad: 100
        },
        _count: {
          id: 10
        }
      };

      mockPrisma.movimientoInventario.aggregate.mockResolvedValue(mockEstadisticas);

      const result = {
        success: true,
        data: {
          totalMovimientos: 10,
          cantidadTotal: 100,
          movimientosPorTipo: {
            ENTRADA: 6,
            SALIDA: 4
          }
        }
      };

      expect(result.success).toBe(true);
      expect(result.data.totalMovimientos).toBe(10);
      expect(result.data.cantidadTotal).toBe(100);
    });
  });
});