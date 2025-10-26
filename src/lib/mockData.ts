/**
 * Módulo de datos de prueba para el sistema TodoFru
 * Incluye clientes, productos y transacciones de ejemplo
 * para testing y desarrollo sin dependencias de autenticación
 */

import { v4 as uuidv4 } from 'uuid';

// Tipos de datos
export type TipoEntidad = 'PERSONA_NATURAL' | 'PERSONA_JURIDICA';
export type TipoCliente = 'MAYORISTA' | 'MINORISTA';
export type EstadoPedido = 'PENDIENTE' | 'CONFIRMADO' | 'EN_PROCESO' | 'COMPLETADO' | 'ANULADO';

export interface MockCliente {
  id: string;
  nombre: string;
  tipoEntidad: TipoEntidad;
  tipoCliente: TipoCliente;
  numeroIdentificacion?: string;
  ruc?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  contacto?: string;
  nombres?: string;
  apellidos?: string;
  razonSocial?: string;
  mensajePersonalizado?: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    pedidos: number;
  };
}

export interface MockProducto {
  id: string;
  nombre: string;
  sku?: string;
  descripcion?: string;
  categoriaId?: string;
  unidadMedidaId: string;
  precio: number;
  porcentajeMerma: number;
  stockMinimo: number;
  perecedero: boolean;
  diasVencimiento?: number;
  tieneIGV: boolean;
  activo: boolean;
  version: number;
  lastModifiedBy?: string;
  createdAt: string;
  updatedAt: string;
  categoria?: {
    id: string;
    nombre: string;
  };
  unidadMedida: {
    id: string;
    nombre: string;
    simbolo: string;
  };
}

export interface MockTransaccion {
  id: string;
  numero: string;
  clienteId: string;
  fecha: string;
  subtotal: number;
  impuestos: number;
  total: number;
  estado: EstadoPedido;
  observaciones?: string;
  usuarioId: string;
  createdAt: string;
  updatedAt: string;
  items: {
    id: string;
    productoId: string;
    cantidad: number;
    precio: number;
    subtotal: number;
    producto: {
      nombre: string;
      sku?: string;
    };
  }[];
}

// Datos de prueba - Clientes
export const mockClientes: MockCliente[] = [
  {
    id: 'cliente-001',
    nombre: 'Juan Carlos Pérez García',
    tipoEntidad: 'PERSONA_NATURAL',
    tipoCliente: 'MINORISTA',
    numeroIdentificacion: '12345678',
    nombres: 'Juan Carlos',
    apellidos: 'Pérez García',
    telefono: '987654321',
    email: 'juan.perez@email.com',
    direccion: 'Av. Los Olivos 123, San Isidro, Lima',
    mensajePersonalizado: 'Cliente preferencial con descuentos especiales',
    activo: true,
    createdAt: '2024-01-15T10:30:00.000Z',
    updatedAt: '2024-01-20T14:45:00.000Z',
    _count: { pedidos: 15 }
  },
  {
    id: 'cliente-002',
    nombre: 'Supermercados La Canasta S.A.C.',
    tipoEntidad: 'PERSONA_JURIDICA',
    tipoCliente: 'MAYORISTA',
    numeroIdentificacion: '20123456789',
    ruc: '20123456789',
    razonSocial: 'Supermercados La Canasta S.A.C.',
    contacto: 'María González - Gerente de Compras',
    telefono: '014567890',
    email: 'compras@lacanasta.com',
    direccion: 'Jr. Comercio 456, Cercado de Lima',
    mensajePersonalizado: 'Mayorista con términos de pago a 30 días',
    activo: true,
    createdAt: '2024-01-10T08:00:00.000Z',
    updatedAt: '2024-01-25T16:20:00.000Z',
    _count: { pedidos: 45 }
  },
  {
    id: 'cliente-003',
    nombre: 'Ana Sofía Rodríguez Vega',
    tipoEntidad: 'PERSONA_NATURAL',
    tipoCliente: 'MINORISTA',
    numeroIdentificacion: '87654321',
    nombres: 'Ana Sofía',
    apellidos: 'Rodríguez Vega',
    telefono: '912345678',
    email: 'ana.rodriguez@gmail.com',
    direccion: 'Calle Las Flores 789, Miraflores, Lima',
    activo: false,
    createdAt: '2024-02-01T12:15:00.000Z',
    updatedAt: '2024-02-10T09:30:00.000Z',
    _count: { pedidos: 3 }
  },
  {
    id: 'cliente-004',
    nombre: 'Distribuidora Norte E.I.R.L.',
    tipoEntidad: 'PERSONA_JURIDICA',
    tipoCliente: 'MAYORISTA',
    numeroIdentificacion: '20987654321',
    ruc: '20987654321',
    razonSocial: 'Distribuidora Norte E.I.R.L.',
    contacto: 'Carlos Mendoza',
    telefono: '014123456',
    email: 'ventas@distribuidoranorte.com',
    direccion: 'Av. Industrial 321, Los Olivos, Lima',
    activo: true,
    createdAt: '2024-01-05T07:45:00.000Z',
    updatedAt: '2024-01-30T11:10:00.000Z',
    _count: { pedidos: 28 }
  },
  {
    id: 'cliente-005',
    nombre: 'Roberto Silva Castillo',
    tipoEntidad: 'PERSONA_NATURAL',
    tipoCliente: 'MINORISTA',
    numeroIdentificacion: '11223344',
    nombres: 'Roberto',
    apellidos: 'Silva Castillo',
    telefono: '998877665',
    email: 'roberto.silva@hotmail.com',
    direccion: 'Jr. Independencia 567, Breña, Lima',
    mensajePersonalizado: 'Cliente frecuente, prefiere entregas los martes',
    activo: true,
    createdAt: '2024-02-05T15:20:00.000Z',
    updatedAt: '2024-02-15T13:40:00.000Z',
    _count: { pedidos: 8 }
  }
];

// Datos de prueba - Productos
export const mockProductos: MockProducto[] = [
  {
    id: 'producto-001',
    nombre: 'Manzana Red Delicious',
    sku: 'MANZ-RD-001',
    descripcion: 'Manzanas rojas frescas de primera calidad',
    categoriaId: 'cat-frutas',
    unidadMedidaId: 'kg',
    precio: 8.50,
    porcentajeMerma: 5.0,
    stockMinimo: 50.0,
    perecedero: true,
    diasVencimiento: 15,
    tieneIGV: true,
    activo: true,
    version: 1,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-15T10:30:00.000Z',
    categoria: { id: 'cat-frutas', nombre: 'Frutas' },
    unidadMedida: { id: 'kg', nombre: 'Kilogramo', simbolo: 'kg' }
  },
  {
    id: 'producto-002',
    nombre: 'Plátano de Seda',
    sku: 'PLAT-SED-002',
    descripcion: 'Plátanos maduros ideales para consumo directo',
    categoriaId: 'cat-frutas',
    unidadMedidaId: 'kg',
    precio: 4.20,
    porcentajeMerma: 8.0,
    stockMinimo: 30.0,
    perecedero: true,
    diasVencimiento: 7,
    tieneIGV: true,
    activo: true,
    version: 1,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-20T14:45:00.000Z',
    categoria: { id: 'cat-frutas', nombre: 'Frutas' },
    unidadMedida: { id: 'kg', nombre: 'Kilogramo', simbolo: 'kg' }
  },
  {
    id: 'producto-003',
    nombre: 'Naranja Valencia',
    sku: 'NAR-VAL-003',
    descripcion: 'Naranjas jugosas para jugo y consumo',
    categoriaId: 'cat-frutas',
    unidadMedidaId: 'kg',
    precio: 6.80,
    porcentajeMerma: 6.0,
    stockMinimo: 40.0,
    perecedero: true,
    diasVencimiento: 20,
    tieneIGV: true,
    activo: true,
    version: 1,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-25T16:20:00.000Z',
    categoria: { id: 'cat-frutas', nombre: 'Frutas' },
    unidadMedida: { id: 'kg', nombre: 'Kilogramo', simbolo: 'kg' }
  },
  {
    id: 'producto-004',
    nombre: 'Tomate Cherry',
    sku: 'TOM-CHE-004',
    descripcion: 'Tomates cherry frescos para ensaladas',
    categoriaId: 'cat-verduras',
    unidadMedidaId: 'kg',
    precio: 12.50,
    porcentajeMerma: 10.0,
    stockMinimo: 20.0,
    perecedero: true,
    diasVencimiento: 10,
    tieneIGV: true,
    activo: true,
    version: 1,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-02-01T12:15:00.000Z',
    categoria: { id: 'cat-verduras', nombre: 'Verduras' },
    unidadMedida: { id: 'kg', nombre: 'Kilogramo', simbolo: 'kg' }
  },
  {
    id: 'producto-005',
    nombre: 'Lechuga Hidropónica',
    sku: 'LEC-HID-005',
    descripcion: 'Lechuga fresca cultivada hidropónicamente',
    categoriaId: 'cat-verduras',
    unidadMedidaId: 'unidad',
    precio: 3.50,
    porcentajeMerma: 15.0,
    stockMinimo: 25.0,
    perecedero: true,
    diasVencimiento: 5,
    tieneIGV: true,
    activo: true,
    version: 1,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-02-05T15:20:00.000Z',
    categoria: { id: 'cat-verduras', nombre: 'Verduras' },
    unidadMedida: { id: 'unidad', nombre: 'Unidad', simbolo: 'und' }
  },
  {
    id: 'producto-006',
    nombre: 'Zanahoria Baby',
    sku: 'ZAN-BAB-006',
    descripcion: 'Zanahorias baby tiernas y dulces',
    categoriaId: 'cat-verduras',
    unidadMedidaId: 'kg',
    precio: 7.20,
    porcentajeMerma: 5.0,
    stockMinimo: 35.0,
    perecedero: true,
    diasVencimiento: 25,
    tieneIGV: true,
    activo: false,
    version: 1,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-02-10T09:30:00.000Z',
    categoria: { id: 'cat-verduras', nombre: 'Verduras' },
    unidadMedida: { id: 'kg', nombre: 'Kilogramo', simbolo: 'kg' }
  },
  {
    id: 'producto-007',
    nombre: 'Palta Hass',
    sku: 'PAL-HAS-007',
    descripcion: 'Paltas Hass maduras listas para consumo',
    categoriaId: 'cat-frutas',
    unidadMedidaId: 'kg',
    precio: 15.80,
    porcentajeMerma: 12.0,
    stockMinimo: 15.0,
    perecedero: true,
    diasVencimiento: 8,
    tieneIGV: true,
    activo: true,
    version: 1,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-02-15T13:40:00.000Z',
    categoria: { id: 'cat-frutas', nombre: 'Frutas' },
    unidadMedida: { id: 'kg', nombre: 'Kilogramo', simbolo: 'kg' }
  },
  {
    id: 'producto-008',
    nombre: 'Limón Tahití',
    sku: 'LIM-TAH-008',
    descripcion: 'Limones Tahití jugosos y ácidos',
    categoriaId: 'cat-frutas',
    unidadMedidaId: 'kg',
    precio: 5.60,
    porcentajeMerma: 7.0,
    stockMinimo: 45.0,
    perecedero: true,
    diasVencimiento: 30,
    tieneIGV: true,
    activo: true,
    version: 1,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-02-20T11:25:00.000Z',
    categoria: { id: 'cat-frutas', nombre: 'Frutas' },
    unidadMedida: { id: 'kg', nombre: 'Kilogramo', simbolo: 'kg' }
  },
  {
    id: 'producto-009',
    nombre: 'Brócoli Fresco',
    sku: 'BRO-FRE-009',
    descripcion: 'Brócoli fresco rico en vitaminas',
    categoriaId: 'cat-verduras',
    unidadMedidaId: 'kg',
    precio: 9.40,
    porcentajeMerma: 8.0,
    stockMinimo: 20.0,
    perecedero: true,
    diasVencimiento: 12,
    tieneIGV: true,
    activo: true,
    version: 1,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-02-25T16:50:00.000Z',
    categoria: { id: 'cat-verduras', nombre: 'Verduras' },
    unidadMedida: { id: 'kg', nombre: 'Kilogramo', simbolo: 'kg' }
  },
  {
    id: 'producto-010',
    nombre: 'Uva Red Globe',
    sku: 'UVA-RED-010',
    descripcion: 'Uvas rojas sin semilla de exportación',
    categoriaId: 'cat-frutas',
    unidadMedidaId: 'kg',
    precio: 18.90,
    porcentajeMerma: 4.0,
    stockMinimo: 10.0,
    perecedero: true,
    diasVencimiento: 14,
    tieneIGV: true,
    activo: true,
    version: 1,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-03-01T08:15:00.000Z',
    categoria: { id: 'cat-frutas', nombre: 'Frutas' },
    unidadMedida: { id: 'kg', nombre: 'Kilogramo', simbolo: 'kg' }
  }
];

// Datos de prueba - Transacciones
export const mockTransacciones: MockTransaccion[] = [
  {
    id: 'trans-001',
    numero: 'PV-2024-001',
    clienteId: 'cliente-001',
    fecha: '2024-02-20T10:30:00.000Z',
    subtotal: 85.00,
    impuestos: 15.30,
    total: 100.30,
    estado: 'COMPLETADO',
    observaciones: 'Entrega programada para mañana',
    usuarioId: 'user-001',
    createdAt: '2024-02-20T10:30:00.000Z',
    updatedAt: '2024-02-20T15:45:00.000Z',
    items: [
      {
        id: 'item-001',
        productoId: 'producto-001',
        cantidad: 5.0,
        precio: 8.50,
        subtotal: 42.50,
        producto: { nombre: 'Manzana Red Delicious', sku: 'MANZ-RD-001' }
      },
      {
        id: 'item-002',
        productoId: 'producto-002',
        cantidad: 10.0,
        precio: 4.20,
        subtotal: 42.00,
        producto: { nombre: 'Plátano de Seda', sku: 'PLAT-SED-002' }
      }
    ]
  },
  {
    id: 'trans-002',
    numero: 'PV-2024-002',
    clienteId: 'cliente-002',
    fecha: '2024-02-21T14:15:00.000Z',
    subtotal: 450.00,
    impuestos: 81.00,
    total: 531.00,
    estado: 'EN_PROCESO',
    observaciones: 'Pedido mayorista - entrega en almacén',
    usuarioId: 'user-001',
    createdAt: '2024-02-21T14:15:00.000Z',
    updatedAt: '2024-02-22T09:20:00.000Z',
    items: [
      {
        id: 'item-003',
        productoId: 'producto-003',
        cantidad: 30.0,
        precio: 6.80,
        subtotal: 204.00,
        producto: { nombre: 'Naranja Valencia', sku: 'NAR-VAL-003' }
      },
      {
        id: 'item-004',
        productoId: 'producto-007',
        cantidad: 15.0,
        precio: 15.80,
        subtotal: 237.00,
        producto: { nombre: 'Palta Hass', sku: 'PAL-HAS-007' }
      }
    ]
  },
  {
    id: 'trans-003',
    numero: 'PV-2024-003',
    clienteId: 'cliente-005',
    fecha: '2024-02-22T11:45:00.000Z',
    subtotal: 67.20,
    impuestos: 12.10,
    total: 79.30,
    estado: 'PENDIENTE',
    observaciones: 'Cliente prefiere entrega los martes',
    usuarioId: 'user-001',
    createdAt: '2024-02-22T11:45:00.000Z',
    updatedAt: '2024-02-22T11:45:00.000Z',
    items: [
      {
        id: 'item-005',
        productoId: 'producto-004',
        cantidad: 2.0,
        precio: 12.50,
        subtotal: 25.00,
        producto: { nombre: 'Tomate Cherry', sku: 'TOM-CHE-004' }
      },
      {
        id: 'item-006',
        productoId: 'producto-005',
        cantidad: 12.0,
        precio: 3.50,
        subtotal: 42.00,
        producto: { nombre: 'Lechuga Hidropónica', sku: 'LEC-HID-005' }
      }
    ]
  }
];

// Funciones de utilidad para simular APIs
export class MockDataService {
  // Simular delay de red
  private static async delay(ms: number = 100): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Obtener todos los clientes
  static async getClientes(filters?: {
    search?: string;
    status?: 'all' | 'active' | 'inactive';
    tipo?: 'all' | 'MAYORISTA' | 'MINORISTA';
  }): Promise<{ success: boolean; data: MockCliente[]; total: number }> {
    await this.delay();
    
    let filteredClientes = [...mockClientes];
    
    if (filters?.search) {
      const search = filters.search.toLowerCase();
      filteredClientes = filteredClientes.filter(cliente =>
        cliente.nombre.toLowerCase().includes(search) ||
        (cliente.numeroIdentificacion || '').includes(search) ||
        (cliente.email || '').toLowerCase().includes(search) ||
        (cliente.telefono || '').includes(search)
      );
    }
    
    if (filters?.status && filters.status !== 'all') {
      filteredClientes = filteredClientes.filter(cliente =>
        filters.status === 'active' ? cliente.activo : !cliente.activo
      );
    }
    
    if (filters?.tipo && filters.tipo !== 'all') {
      filteredClientes = filteredClientes.filter(cliente =>
        cliente.tipoCliente === filters.tipo
      );
    }
    
    return {
      success: true,
      data: filteredClientes,
      total: filteredClientes.length
    };
  }

  // Obtener cliente por ID
  static async getClienteById(id: string): Promise<{ success: boolean; data?: MockCliente; error?: string }> {
    await this.delay();
    
    const cliente = mockClientes.find(c => c.id === id);
    if (!cliente) {
      return { success: false, error: 'Cliente no encontrado' };
    }
    
    return { success: true, data: cliente };
  }

  // Actualizar estado de cliente
  static async toggleClienteStatus(id: string, activo: boolean): Promise<{ success: boolean; data?: MockCliente; error?: string }> {
    await this.delay();
    
    const clienteIndex = mockClientes.findIndex(c => c.id === id);
    if (clienteIndex === -1) {
      return { success: false, error: 'Cliente no encontrado' };
    }
    
    // Simular posibles errores
    if (Math.random() < 0.05) { // 5% de probabilidad de error
      return { success: false, error: 'Error de conexión con el servidor' };
    }
    
    mockClientes[clienteIndex] = {
      ...mockClientes[clienteIndex],
      activo,
      updatedAt: new Date().toISOString()
    };
    
    return { success: true, data: mockClientes[clienteIndex] };
  }

  // Crear nuevo cliente
  static async createCliente(clienteData: Partial<MockCliente>): Promise<{ success: boolean; data?: MockCliente; error?: string }> {
    await this.delay(200);
    
    // Validaciones básicas
    if (!clienteData.nombre) {
      return { success: false, error: 'El nombre es requerido' };
    }
    
    if (!clienteData.tipoEntidad) {
      return { success: false, error: 'El tipo de entidad es requerido' };
    }
    
    const nuevoCliente: MockCliente = {
      id: uuidv4(),
      nombre: clienteData.nombre,
      tipoEntidad: clienteData.tipoEntidad || 'PERSONA_NATURAL',
      tipoCliente: clienteData.tipoCliente || 'MINORISTA',
      numeroIdentificacion: clienteData.numeroIdentificacion,
      ruc: clienteData.ruc,
      telefono: clienteData.telefono,
      email: clienteData.email,
      direccion: clienteData.direccion,
      contacto: clienteData.contacto,
      nombres: clienteData.nombres,
      apellidos: clienteData.apellidos,
      razonSocial: clienteData.razonSocial,
      mensajePersonalizado: clienteData.mensajePersonalizado,
      activo: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      _count: { pedidos: 0 }
    };
    
    mockClientes.push(nuevoCliente);
    
    return { success: true, data: nuevoCliente };
  }

  // Obtener productos
  static async getProductos(): Promise<{ success: boolean; data: MockProducto[] }> {
    await this.delay();
    return { success: true, data: mockProductos };
  }

  // Obtener transacciones por cliente
  static async getTransaccionesByCliente(clienteId: string): Promise<{ success: boolean; data: MockTransaccion[] }> {
    await this.delay();
    const transacciones = mockTransacciones.filter(t => t.clienteId === clienteId);
    return { success: true, data: transacciones };
  }
}

// Casos de prueba específicos
export const testCases = {
  // Cliente activo con muchos pedidos
  clienteActivoConPedidos: mockClientes[1], // Supermercados La Canasta
  
  // Cliente inactivo
  clienteInactivo: mockClientes[2], // Ana Sofía Rodríguez
  
  // Cliente persona natural
  clientePersonaNatural: mockClientes[0], // Juan Carlos Pérez
  
  // Cliente persona jurídica
  clientePersonaJuridica: mockClientes[1], // Supermercados La Canasta
  
  // Producto activo
  productoActivo: mockProductos[0], // Manzana Red Delicious
  
  // Producto inactivo
  productoInactivo: mockProductos[5], // Zanahoria Baby
  
  // Transacción completada
  transaccionCompletada: mockTransacciones[0],
  
  // Transacción pendiente
  transaccionPendiente: mockTransacciones[2],
  
  // Escenarios de error
  errorScenarios: {
    clienteNoEncontrado: 'cliente-999',
    errorConexion: () => Math.random() < 0.05, // 5% probabilidad
    datosInvalidos: {
      nombreVacio: '',
      emailInvalido: 'email-invalido',
      telefonoInvalido: '123'
    }
  }
};

export default MockDataService;