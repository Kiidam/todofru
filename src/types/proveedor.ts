// Tipos para el sistema de proveedores refactorizado

export type TipoEntidad = 'PERSONA_NATURAL' | 'PERSONA_JURIDICA';

// Campos base comunes a ambos tipos
export interface ProveedorBase {
  id?: string;
  tipoEntidad: TipoEntidad;
  telefono?: string;
  email?: string;
  direccion?: string;
  activo?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Campos específicos para persona natural
export interface PersonaNatural extends ProveedorBase {
  tipoEntidad: 'PERSONA_NATURAL';
  nombres: string;
  apellidos: string;
  numeroIdentificacion: string; // DNI de 8 dígitos
  // El campo 'nombre' se construirá como nombres + apellidos
}

// Campos específicos para persona jurídica
export interface PersonaJuridica extends ProveedorBase {
  tipoEntidad: 'PERSONA_JURIDICA';
  razonSocial: string;
  numeroIdentificacion: string; // RUC de 11 dígitos
  representanteLegal?: string;
  // El campo 'nombre' será igual a razonSocial
}

// Unión de tipos para el proveedor completo
export type Proveedor = PersonaNatural | PersonaJuridica;

// Tipo para el formulario (antes de enviar al API)
export interface ProveedorFormData {
  tipoEntidad: TipoEntidad;
  tipoIdentificacion?: 'DNI' | 'RUC'; // Tipo de identificación seleccionado
  
  // Campo unificado de identificación
  numeroIdentificacion?: string; // DNI (8 dígitos) o RUC (11 dígitos)
  
  // Campos específicos de identificación (para compatibilidad y sincronización)
  ruc?: string; // RUC de 11 dígitos
  dni?: string; // DNI de 8 dígitos
  
  // Campos para persona natural
  nombres?: string;
  apellidos?: string;
  
  // Campos para persona jurídica
  razonSocial?: string;
  representanteLegal?: string;
  
  // Campos comunes
  telefono?: string;
  email?: string;
  direccion?: string;
}

// Tipo para el payload que se envía al API
export interface ProveedorPayload {
  id?: string;
  tipoEntidad: TipoEntidad;
  nombre: string; // Campo calculado
  numeroIdentificacion?: string; // DNI (8 dígitos) o RUC (11 dígitos)
  telefono?: string;
  email?: string;
  direccion?: string;
  contacto?: string; // Representante legal o nombre completo
  
  // Campos adicionales para el nuevo schema
  nombres?: string;
  apellidos?: string;
  razonSocial?: string;
  representanteLegal?: string;
  
  // Campos de compatibilidad (deprecated)
  ruc?: string; // Para compatibilidad con código existente
}

// Funciones de utilidad para transformar datos
export function formDataToPayload(formData: ProveedorFormData): ProveedorPayload {
  const base: ProveedorPayload = {
    tipoEntidad: formData.tipoEntidad,
    telefono: formData.telefono,
    email: formData.email,
    direccion: formData.direccion,
    numeroIdentificacion: formData.numeroIdentificacion,
    nombre: '',
    contacto: '',
  };

  if (formData.tipoEntidad === 'PERSONA_NATURAL') {
    const nombres = formData.nombres?.trim() || '';
    const apellidos = formData.apellidos?.trim() || '';
    
    return {
      ...base,
      nombres: nombres,
      apellidos: apellidos,
      nombre: `${nombres} ${apellidos}`.trim(),
      contacto: `${nombres} ${apellidos}`.trim(),
      // Para compatibilidad con código existente - mapear a ambos campos
      ruc: formData.numeroIdentificacion,
      numeroIdentificacion: formData.numeroIdentificacion,
    };
  } else {
    return {
      ...base,
      razonSocial: formData.razonSocial,
      representanteLegal: formData.representanteLegal,
      nombre: formData.razonSocial || '',
      contacto: formData.representanteLegal || '',
      // Para compatibilidad con código existente - mapear a ambos campos
      ruc: formData.numeroIdentificacion,
      numeroIdentificacion: formData.numeroIdentificacion,
    };
  }
}

// Función para convertir payload del API a datos del formulario
export function payloadToFormData(payload: Record<string, unknown>): ProveedorFormData {
  const numeroIdentificacion = payload.numeroIdentificacion || payload.dni || payload.ruc || '';
  // Determinar tipoEntidad de forma segura desde un payload sin tipar
  const rawTipo = typeof payload['tipoEntidad'] === 'string' ? String(payload['tipoEntidad']) : '';
  const tipoEntidad: TipoEntidad = rawTipo === 'PERSONA_JURIDICA' ? 'PERSONA_JURIDICA' : 'PERSONA_NATURAL';
  const tipoIdentificacion = tipoEntidad === 'PERSONA_NATURAL' ? 'DNI' : 'RUC';

  return {
    tipoEntidad,
    tipoIdentificacion,
    numeroIdentificacion: String(numeroIdentificacion || ''),
    nombres: String(payload['nombres'] || ''),
    apellidos: String(payload['apellidos'] || ''),
    razonSocial: String(payload['razonSocial'] || ''),
    representanteLegal: String(payload['representanteLegal'] || ''),
    telefono: String(payload['telefono'] || ''),
    email: String(payload['email'] || ''),
    direccion: String(payload['direccion'] || ''),
  };
}

// Función para determinar el tipo de entidad basado en el número de identificación
export function determinarTipoEntidad(numeroIdentificacion: string): TipoEntidad {
  if (!numeroIdentificacion) return 'PERSONA_NATURAL';
  return numeroIdentificacion.length === 8 ? 'PERSONA_NATURAL' : 'PERSONA_JURIDICA';
}

// Función para validar el formato del número de identificación
export function validarNumeroIdentificacion(numero: string, tipoEntidad: TipoEntidad): boolean {
  if (!numero) return false;
  
  if (tipoEntidad === 'PERSONA_NATURAL') {
    return /^\d{8}$/.test(numero);
  } else {
    return /^\d{11}$/.test(numero);
  }
}