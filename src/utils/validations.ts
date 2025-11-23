/**
 * Utilidades de validación para el módulo de compras y proveedores
 * Implementa validaciones para evitar errores en la visualización de datos
 */

// Tipos para datos de entrada sin validar
interface ProductoInput {
  id?: unknown;
  nombre?: unknown;
  sku?: unknown;
  stock?: unknown;
  stockMinimo?: unknown;
  precio?: unknown;
  activo?: unknown;
  [key: string]: unknown;
}

interface ProveedorInput {
  id?: unknown;
  nombre?: unknown;
  razonSocial?: unknown;
  numeroIdentificacion?: unknown;
  activo?: unknown;
  [key: string]: unknown;
}

interface RelacionInput {
  tipo?: unknown;
  precioCompra?: unknown;
  tiempoEntrega?: unknown;
  cantidadMinima?: unknown;
  fechaCreacion?: unknown;
  ultimoPrecio?: unknown;
  ultimaCompra?: unknown;
  [key: string]: unknown;
}

// Validación de datos de producto
export interface ProductoValidation {
  id: string;
  nombre: string;
  sku?: string | null;
  stock: number;
  stockMinimo: number;
  precio: number;
  activo: boolean;
}

// Validación de datos de proveedor
export interface ProveedorValidation {
  id: string;
  nombre: string;
  razonSocial?: string;
  numeroIdentificacion?: string;
  activo: boolean;
}

// Validación de relación producto-proveedor
export interface RelacionProductoProveedorValidation {
  tipo: 'directo' | 'historico';
  precioCompra?: number;
  tiempoEntrega?: number;
  cantidadMinima?: number;
  fechaCreacion?: string;
  ultimoPrecio?: number;
  ultimaCompra?: string;
}

/**
 * Valida que un producto tenga todos los campos requeridos
 */
export function validateProducto(producto: ProductoInput): ProductoValidation | null {
  try {
    if (!producto || typeof producto !== 'object') {
      console.warn('Producto inválido: no es un objeto', producto);
      return null;
    }

    const validated: ProductoValidation = {
      id: String(producto.id || ''),
      nombre: String(producto.nombre || 'Producto sin nombre'),
      sku: producto.sku ? String(producto.sku) : null,
      stock: Number(producto.stock) || 0,
      stockMinimo: Number(producto.stockMinimo) || 0,
      precio: Number(producto.precio) || 0,
      activo: Boolean(producto.activo)
    };

    // Validar campos obligatorios
    if (!validated.id) {
      console.warn('Producto sin ID válido', producto);
      return null;
    }

    if (!validated.nombre.trim()) {
      console.warn('Producto sin nombre válido', producto);
      return null;
    }

    // Validar valores numéricos
    if (validated.stock < 0) {
      console.warn('Stock negativo detectado, corrigiendo a 0', producto);
      validated.stock = 0;
    }

    if (validated.stockMinimo < 0) {
      console.warn('Stock mínimo negativo detectado, corrigiendo a 0', producto);
      validated.stockMinimo = 0;
    }

    if (validated.precio < 0) {
      console.warn('Precio negativo detectado, corrigiendo a 0', producto);
      validated.precio = 0;
    }

    return validated;
  } catch (error) {
    console.error('Error al validar producto:', error, producto);
    return null;
  }
}

/**
 * Valida que un proveedor tenga todos los campos requeridos
 */
export function validateProveedor(proveedor: ProveedorInput): ProveedorValidation | null {
  try {
    if (!proveedor || typeof proveedor !== 'object') {
      console.warn('Proveedor inválido: no es un objeto', proveedor);
      return null;
    }

    const validated: ProveedorValidation = {
      id: String(proveedor.id || ''),
      nombre: String(proveedor.nombre || 'Proveedor sin nombre'),
      razonSocial: proveedor.razonSocial ? String(proveedor.razonSocial) : undefined,
      numeroIdentificacion: proveedor.numeroIdentificacion ? String(proveedor.numeroIdentificacion) : undefined,
      activo: Boolean(proveedor.activo)
    };

    // Validar campos obligatorios
    if (!validated.id) {
      console.warn('Proveedor sin ID válido', proveedor);
      return null;
    }

    if (!validated.nombre.trim()) {
      console.warn('Proveedor sin nombre válido', proveedor);
      return null;
    }

    return validated;
  } catch (error) {
    console.error('Error al validar proveedor:', error, proveedor);
    return null;
  }
}

/**
 * Valida la relación entre producto y proveedor
 */
export function validateRelacionProductoProveedor(relacion: RelacionInput): RelacionProductoProveedorValidation | null {
  try {
    if (!relacion || typeof relacion !== 'object') {
      console.warn('Relación inválida: no es un objeto', relacion);
      return null;
    }

    const validated: RelacionProductoProveedorValidation = {
      tipo: relacion.tipo === 'directo' ? 'directo' : 'historico'
    };

    // Validar campos opcionales para relación directa
    if (validated.tipo === 'directo') {
      if (relacion.precioCompra !== undefined) {
        const precio = Number(relacion.precioCompra);
        if (precio >= 0) {
          validated.precioCompra = precio;
        } else {
          console.warn('Precio de compra negativo detectado, ignorando', relacion);
        }
      }

      if (relacion.tiempoEntrega !== undefined) {
        const tiempo = Number(relacion.tiempoEntrega);
        if (tiempo >= 0) {
          validated.tiempoEntrega = tiempo;
        } else {
          console.warn('Tiempo de entrega negativo detectado, ignorando', relacion);
        }
      }

      if (relacion.cantidadMinima !== undefined) {
        const cantidad = Number(relacion.cantidadMinima);
        if (cantidad >= 0) {
          validated.cantidadMinima = cantidad;
        } else {
          console.warn('Cantidad mínima negativa detectada, ignorando', relacion);
        }
      }

      if (relacion.fechaCreacion) {
        const fecha = validateDate(relacion.fechaCreacion);
        if (fecha) {
          validated.fechaCreacion = String(relacion.fechaCreacion);
        } else {
          console.warn('Fecha de creación inválida detectada, ignorando', relacion);
        }
      }
    }

    // Validar campos opcionales para relación histórica
    if (validated.tipo === 'historico') {
      if (relacion.ultimoPrecio !== undefined) {
        const precio = Number(relacion.ultimoPrecio);
        if (precio >= 0) {
          validated.ultimoPrecio = precio;
        } else {
          console.warn('Último precio negativo detectado, ignorando', relacion);
        }
      }

      if (relacion.ultimaCompra) {
        const fecha = validateDate(relacion.ultimaCompra);
        if (fecha) {
          validated.ultimaCompra = String(relacion.ultimaCompra);
        } else {
          console.warn('Fecha de última compra inválida detectada, ignorando', relacion);
        }
      }
    }

    return validated;
  } catch (error) {
    console.error('Error al validar relación producto-proveedor:', error, relacion);
    return null;
  }
}

/**
 * Valida una lista de productos y filtra los inválidos
 */
export function validateProductosList(productos: unknown[]): ProductoValidation[] {
  if (!Array.isArray(productos)) {
    console.warn('Lista de productos no es un array', productos);
    return [];
  }

  const validados = productos
    .map((producto: unknown) => validateProducto(producto as ProductoInput))
    .filter((producto): producto is ProductoValidation => producto !== null);

  if (validados.length !== productos.length) {
    console.warn(`Se filtraron ${productos.length - validados.length} productos inválidos`);
  }

  return validados;
}

/**
 * Valida una lista de proveedores y filtra los inválidos
 */
export function validateProveedoresList(proveedores: unknown[]): ProveedorValidation[] {
  if (!Array.isArray(proveedores)) {
    console.warn('Lista de proveedores no es un array', proveedores);
    return [];
  }

  const validados = proveedores
    .map((proveedor: unknown) => validateProveedor(proveedor as ProveedorInput))
    .filter((proveedor): proveedor is ProveedorValidation => proveedor !== null);

  if (validados.length !== proveedores.length) {
    console.warn(`Se filtraron ${proveedores.length - validados.length} proveedores inválidos`);
  }

  return validados;
}

/**
 * Valida que un valor sea un número válido para precios
 */
export function validatePrice(value: unknown): number {
  const num = Number(value);
  if (isNaN(num) || num < 0) {
    return 0;
  }
  return Math.round(num * 100) / 100; // Redondear a 2 decimales
}

/**
 * Valida que un valor sea un número entero válido para cantidades
 */
export function validateQuantity(value: unknown): number {
  const num = Number(value);
  if (isNaN(num) || num < 0) {
    return 0;
  }
  return Math.floor(num); // Redondear hacia abajo para cantidades enteras
}

/**
 * Valida que una fecha sea válida
 */
export function validateDate(value: unknown): Date | null {
  try {
    if (value === null || value === undefined) {
      return null;
    }
    
    // Convertir a string, number o Date según el tipo
    let dateValue: string | number | Date;
    if (value instanceof Date) {
      dateValue = value;
    } else if (typeof value === 'string' || typeof value === 'number') {
      dateValue = value;
    } else {
      dateValue = String(value);
    }
    
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      return null;
    }
    return date;
  } catch {
    return null;
  }
}

/**
 * Formatea un valor de moneda de manera segura
 */
export function formatCurrencySafe(value: unknown): string {
  const num = validatePrice(value);
  try {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(num);
  } catch {
    return `S/ ${num.toFixed(2)}`;
  }
}

/**
 * Formatea una cantidad de manera segura
 */
export function formatQuantitySafe(value: unknown): string {
  const num = validateQuantity(value);
  return num.toLocaleString('es-PE');
}

/**
 * Formatea una fecha de manera segura
 */
export function formatDateSafe(value: unknown): string {
  const date = validateDate(value);
  if (!date) {
    return 'Fecha inválida';
  }
  
  try {
    return date.toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return date.toISOString().split('T')[0];
  }
}