/**
 * Pruebas de integración para el módulo de movimientos
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MovimientosPage from '../../app/dashboard/movimientos-v2/page';

// Mock de next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
}));

// Mock de react-hot-toast
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock de fetch
global.fetch = jest.fn();

// Mock de datos de prueba
const mockProductos = [
  {
    id: 'prod1',
    nombre: 'Manzana Roja',
    sku: 'MAN001',
    categoria: 'Frutas',
    unidadMedida: 'kg',
    stock: 100,
    activo: true,
  },
  {
    id: 'prod2',
    nombre: 'Banana',
    sku: 'BAN001',
    categoria: 'Frutas',
    unidadMedida: 'kg',
    stock: 50,
    activo: true,
  },
];

const mockMovimientos = [
  {
    id: 'mov1',
    tipo: 'ENTRADA',
    cantidad: 20,
    stockAnterior: 80,
    stockNuevo: 100,
    motivo: 'Compra',
    createdAt: '2024-01-01T10:00:00Z',
    producto: mockProductos[0],
    usuario: { name: 'Juan Pérez' },
  },
  {
    id: 'mov2',
    tipo: 'SALIDA',
    cantidad: 10,
    stockAnterior: 60,
    stockNuevo: 50,
    motivo: 'Venta',
    createdAt: '2024-01-01T11:00:00Z',
    producto: mockProductos[1],
    usuario: { name: 'María García' },
  },
];

const mockPagination = {
  page: 1,
  limit: 20,
  total: 2,
  totalPages: 1,
  hasNext: false,
  hasPrev: false,
};

const mockEstadisticas = {
  resumen: {
    totalMovimientos: 2,
    totalEntradas: 1,
    totalSalidas: 1,
    valorTotalMovimientos: 1500,
  },
  porTipo: [
    { tipo: 'ENTRADA', cantidad: 1, porcentaje: 50 },
    { tipo: 'SALIDA', cantidad: 1, porcentaje: 50 },
  ],
  porPeriodo: [
    { fecha: '2024-01-01', entradas: 1, salidas: 1 },
  ],
  productosTop: [
    { producto: mockProductos[0], totalMovimientos: 1 },
    { producto: mockProductos[1], totalMovimientos: 1 },
  ],
  usuariosTop: [
    { usuario: { name: 'Juan Pérez' }, totalMovimientos: 1 },
    { usuario: { name: 'María García' }, totalMovimientos: 1 },
  ],
  alertas: {
    stockBajo: [],
    movimientosRecientes: 2,
  },
  tendencias: {
    crecimientoSemanal: 0,
    crecimientoMensual: 0,
  },
};

describe('Integración del Módulo de Movimientos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
  });

  const setupMocks = () => {
    // Mock para obtener productos
    fetch.mockImplementation((url) => {
      if (url.includes('/api/productos')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ productos: mockProductos }),
        });
      }
      
      if (url.includes('/api/movimientos-v2/estadisticas')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockEstadisticas),
        });
      }
      
      if (url.includes('/api/movimientos-v2')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            movimientos: mockMovimientos,
            pagination: mockPagination,
          }),
        });
      }
      
      return Promise.reject(new Error('URL no mockeada'));
    });
  };

  it('debería cargar y mostrar la página de movimientos correctamente', async () => {
    setupMocks();

    render(<MovimientosPage />);

    // Verificar que se muestra el título
    expect(screen.getByText('Movimientos de Inventario')).toBeInTheDocument();

    // Verificar que se muestran las pestañas
    expect(screen.getByText('Movimientos')).toBeInTheDocument();
    expect(screen.getByText('Estadísticas')).toBeInTheDocument();

    // Esperar a que se carguen los datos
    await waitFor(() => {
      expect(screen.getByText('Manzana Roja')).toBeInTheDocument();
      expect(screen.getByText('Banana')).toBeInTheDocument();
    });

    // Verificar que se muestran los movimientos
    expect(screen.getByText('ENTRADA')).toBeInTheDocument();
    expect(screen.getByText('SALIDA')).toBeInTheDocument();
    expect(screen.getByText('Compra')).toBeInTheDocument();
    expect(screen.getByText('Venta')).toBeInTheDocument();
  });

  it('debería permitir filtrar movimientos por tipo', async () => {
    setupMocks();

    const user = userEvent.setup();
    render(<MovimientosPage />);

    // Esperar a que se carguen los datos iniciales
    await waitFor(() => {
      expect(screen.getByText('Manzana Roja')).toBeInTheDocument();
    });

    // Buscar y hacer clic en el filtro de tipo
    const tipoFilter = screen.getByDisplayValue('Todos los tipos');
    await user.click(tipoFilter);

    // Seleccionar solo entradas
    const entradaOption = screen.getByText('Entradas');
    await user.click(entradaOption);

    // Verificar que se hace la llamada con el filtro
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('tipo=ENTRADA')
      );
    });
  });

  it('debería abrir el modal de creación al hacer clic en "Nuevo Movimiento"', async () => {
    setupMocks();

    const user = userEvent.setup();
    render(<MovimientosPage />);

    // Esperar a que se carguen los productos
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/productos');
    });

    // Hacer clic en el botón de nuevo movimiento
    const nuevoButton = screen.getByText('Nuevo Movimiento');
    await user.click(nuevoButton);

    // Verificar que se abre el modal
    await waitFor(() => {
      expect(screen.getByText('Crear Movimiento')).toBeInTheDocument();
    });

    // Verificar que se muestran los campos del formulario
    expect(screen.getByText('Producto')).toBeInTheDocument();
    expect(screen.getByText('Tipo de Movimiento')).toBeInTheDocument();
    expect(screen.getByText('Cantidad')).toBeInTheDocument();
    expect(screen.getByText('Motivo')).toBeInTheDocument();
  });

  it('debería crear un nuevo movimiento exitosamente', async () => {
    setupMocks();

    // Mock para la creación del movimiento
    fetch.mockImplementationOnce((url, options) => {
      if (url.includes('/api/movimientos-v2') && options.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            movimiento: {
              id: 'mov3',
              tipo: 'ENTRADA',
              cantidad: 15,
              stockAnterior: 100,
              stockNuevo: 115,
              motivo: 'Reposición',
              createdAt: '2024-01-01T12:00:00Z',
              producto: mockProductos[0],
              usuario: { name: 'Admin' },
            },
          }),
        });
      }
      return setupMocks();
    });

    const user = userEvent.setup();
    render(<MovimientosPage />);

    // Esperar a que se carguen los datos
    await waitFor(() => {
      expect(screen.getByText('Nuevo Movimiento')).toBeInTheDocument();
    });

    // Abrir el modal de creación
    const nuevoButton = screen.getByText('Nuevo Movimiento');
    await user.click(nuevoButton);

    await waitFor(() => {
      expect(screen.getByText('Crear Movimiento')).toBeInTheDocument();
    });

    // Llenar el formulario
    const productoSelect = screen.getByDisplayValue('Seleccionar producto');
    await user.click(productoSelect);
    
    const manzanaOption = screen.getByText('Manzana Roja');
    await user.click(manzanaOption);

    const tipoSelect = screen.getByDisplayValue('Seleccionar tipo');
    await user.click(tipoSelect);
    
    const entradaOption = screen.getByText('Entrada');
    await user.click(entradaOption);

    const cantidadInput = screen.getByPlaceholderText('Ingrese la cantidad');
    await user.type(cantidadInput, '15');

    const motivoInput = screen.getByPlaceholderText('Ingrese el motivo del movimiento');
    await user.type(motivoInput, 'Reposición');

    // Enviar el formulario
    const guardarButton = screen.getByText('Guardar');
    await user.click(guardarButton);

    // Verificar que se hace la llamada POST
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/movimientos-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productoId: 'prod1',
          tipo: 'ENTRADA',
          cantidad: 15,
          motivo: 'Reposición',
        }),
      });
    });
  });

  it('debería mostrar estadísticas al cambiar a la pestaña correspondiente', async () => {
    setupMocks();

    const user = userEvent.setup();
    render(<MovimientosPage />);

    // Cambiar a la pestaña de estadísticas
    const estadisticasTab = screen.getByText('Estadísticas');
    await user.click(estadisticasTab);

    // Verificar que se cargan las estadísticas
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/movimientos-v2/estadisticas');
    });

    // Verificar que se muestran las estadísticas
    await waitFor(() => {
      expect(screen.getByText('Total de Movimientos')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  it('debería manejar errores de red correctamente', async () => {
    // Mock de error de red
    fetch.mockRejectedValue(new Error('Error de red'));

    render(<MovimientosPage />);

    // Verificar que se muestra el mensaje de error
    await waitFor(() => {
      expect(screen.getByText(/Error de red/)).toBeInTheDocument();
    });
  });

  it('debería sincronizar datos automáticamente', async () => {
    jest.useFakeTimers();
    setupMocks();

    render(<MovimientosPage />);

    // Verificar la carga inicial
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/productos');
    });

    // Limpiar las llamadas anteriores
    fetch.mockClear();

    // Avanzar 30 segundos para activar la sincronización automática
    jest.advanceTimersByTime(30000);

    // Verificar que se hace la sincronización
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/movimientos-v2')
      );
    });

    jest.useRealTimers();
  });

  it('debería mostrar indicadores de estado de sincronización', async () => {
    setupMocks();

    render(<MovimientosPage />);

    // Verificar que se muestra el estado de sincronización
    await waitFor(() => {
      expect(screen.getByText(/Última sincronización/)).toBeInTheDocument();
    });
  });

  it('debería permitir ver detalles de un movimiento', async () => {
    setupMocks();

    const user = userEvent.setup();
    render(<MovimientosPage />);

    // Esperar a que se carguen los movimientos
    await waitFor(() => {
      expect(screen.getByText('Manzana Roja')).toBeInTheDocument();
    });

    // Buscar y hacer clic en el botón de ver detalles
    const verButton = screen.getAllByText('Ver')[0];
    await user.click(verButton);

    // Verificar que se abre el modal de detalles
    await waitFor(() => {
      expect(screen.getByText('Detalles del Movimiento')).toBeInTheDocument();
    });

    // Verificar que se muestran los detalles
    expect(screen.getByText('ENTRADA')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('Compra')).toBeInTheDocument();
  });

  it('debería validar stock suficiente para movimientos de salida', async () => {
    setupMocks();

    const user = userEvent.setup();
    render(<MovimientosPage />);

    // Abrir el modal de creación
    await waitFor(() => {
      expect(screen.getByText('Nuevo Movimiento')).toBeInTheDocument();
    });

    const nuevoButton = screen.getByText('Nuevo Movimiento');
    await user.click(nuevoButton);

    await waitFor(() => {
      expect(screen.getByText('Crear Movimiento')).toBeInTheDocument();
    });

    // Seleccionar producto con stock limitado
    const productoSelect = screen.getByDisplayValue('Seleccionar producto');
    await user.click(productoSelect);
    
    const bananaOption = screen.getByText('Banana');
    await user.click(bananaOption);

    // Seleccionar salida
    const tipoSelect = screen.getByDisplayValue('Seleccionar tipo');
    await user.click(tipoSelect);
    
    const salidaOption = screen.getByText('Salida');
    await user.click(salidaOption);

    // Intentar ingresar cantidad mayor al stock
    const cantidadInput = screen.getByPlaceholderText('Ingrese la cantidad');
    await user.type(cantidadInput, '100'); // Stock actual es 50

    // Verificar que se muestra el mensaje de error
    await waitFor(() => {
      expect(screen.getByText(/Stock insuficiente/)).toBeInTheDocument();
    });
  });
});