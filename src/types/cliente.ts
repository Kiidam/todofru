// Tipos para el sistema de clientes refactorizado

export type TipoEntidad = 'PERSONA_NATURAL' | 'PERSONA_JURIDICA';
export type TipoCliente = 'MAYORISTA' | 'MINORISTA';

// Campos base comunes a ambos tipos
export interface ClienteBase {
  id?: string;
  tipoEntidad: TipoEntidad;
  tipoCliente: TipoCliente;
  telefono?: string;
  email?: string;
  direccion?: string;
  mensajePersonalizado?: string;
  activo?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Campos específicos para persona natural
export interface ClientePersonaNatural extends ClienteBase {
  tipoEntidad: 'PERSONA_NATURAL';
  nombres: string;
  apellidos: string;
  numeroIdentificacion: string; // DNI de 8 dígitos
  // El campo 'nombre' se construirá como nombres + apellidos
}

// Campos específicos para persona jurídica
export interface ClientePersonaJuridica extends ClienteBase {
  tipoEntidad: 'PERSONA_JURIDICA';
  razonSocial: string;
  numeroIdentificacion: string; // RUC de 11 dígitos
  contacto?: string; // Persona de contacto en la empresa
  // El campo 'nombre' será igual a razonSocial
}

// Unión de tipos para el cliente completo
export type Cliente = ClientePersonaNatural | ClientePersonaJuridica;

// Tipo para el formulario (antes de enviar al API)
export interface ClienteFormData {
  tipoEntidad: TipoEntidad;
  tipoCliente: TipoCliente;
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
  contacto?: string; // Persona de contacto
  
  // Campos comunes
  telefono?: string;
  email?: string;
  direccion?: string;
  mensajePersonalizado?: string;
  activo?: boolean;
}

// Tipo para el payload que se envía al API
export interface ClientePayload {
  id?: string;
  tipoEntidad: TipoEntidad;
  tipoCliente: TipoCliente;
  nombre?: string; // Calculado en servidor o por helpers
  numeroIdentificacion?: string; // DNI (8 dígitos) o RUC (11 dígitos)
  telefono?: string;
  email?: string;
  direccion?: string;
  contacto?: string; // Persona de contacto o nombre completo
  mensajePersonalizado?: string;
  
  // Campos adicionales para el nuevo schema
  nombres?: string;
  apellidos?: string;
  razonSocial?: string;
  
  // Campos de compatibilidad (deprecated)
  ruc?: string; // Para compatibilidad con código existente
}

// Funciones de utilidad para transformar datos
export function clienteFormDataToPayload(formData: ClienteFormData): ClientePayload {
  const base: ClientePayload = {
    tipoEntidad: formData.tipoEntidad,
    tipoCliente: formData.tipoCliente,
    telefono: formData.telefono,
    email: formData.email,
    direccion: formData.direccion,
    mensajePersonalizado: formData.mensajePersonalizado,
    numeroIdentificacion: formData.numeroIdentificacion,
    contacto: '',
  };

  if (formData.tipoEntidad === 'PERSONA_NATURAL') {
    const nombres = formData.nombres?.trim() || '';
    const apellidos = formData.apellidos?.trim() || '';
    
    return {
      ...base,
      nombres,
      apellidos,
      nombre: `${nombres} ${apellidos}`.trim(),
      contacto: `${nombres} ${apellidos}`.trim(),
      // Compatibilidad: NO enviar ruc para PN
      ruc: undefined,
    };
  } else {
    return {
      ...base,
      razonSocial: formData.razonSocial,
      contacto: formData.contacto || '',
      nombre: (formData.razonSocial || '').trim(),
      // Compatibilidad: enviar ruc solo para PJ
      ruc: formData.numeroIdentificacion,
    };
  }
}

// Función para convertir payload del API a datos del formulario
export function clientePayloadToFormData(payload: any): ClienteFormData {
  const numeroIdentificacion = payload.numeroIdentificacion || payload.dni || payload.ruc || '';
  const tipoIdentificacion = payload.tipoEntidad === 'PERSONA_NATURAL' ? 'DNI' : 'RUC';
  
  return {
    tipoEntidad: payload.tipoEntidad || 'PERSONA_NATURAL',
    tipoCliente: payload.tipoCliente || 'MINORISTA',
    tipoIdentificacion,
    numeroIdentificacion,
    nombres: payload.nombres || '',
    apellidos: payload.apellidos || '',
    razonSocial: payload.razonSocial || '',
    contacto: payload.contacto || '',
    telefono: payload.telefono || '',
    email: payload.email || '',
    direccion: payload.direccion || '',
    mensajePersonalizado: payload.mensajePersonalizado || '',
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