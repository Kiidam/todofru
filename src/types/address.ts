// Tipos para el sistema de autocompletado de direcciones

export interface UbigeoLocation {
  codigo: string;
  nombre: string;
}

export interface Departamento extends UbigeoLocation {
  provincias?: Provincia[];
}

export interface Provincia extends UbigeoLocation {
  departamento_codigo: string;
  distritos?: Distrito[];
}

export interface Distrito extends UbigeoLocation {
  provincia_codigo: string;
  departamento_codigo: string;
}

export interface DireccionCompleta {
  // Ubicación geográfica jerárquica
  departamento?: Departamento;
  provincia?: Provincia;
  distrito?: Distrito;
  
  // Dirección específica
  direccion_especifica: string; // Calle, número, urbanización, etc.
  referencia?: string;
  codigo_postal?: string;
  
  // Metadatos
  es_autocompletado: boolean;
  fuente_datos?: 'RENIEC' | 'SUNAT' | 'MANUAL';
  validado: boolean;
}

export interface ApiAddressResponse {
  // Respuesta de RENIEC (DNI)
  first_name?: string;
  nombres?: string;
  first_last_name?: string;
  apellido_paterno?: string;
  apellidoPaterno?: string;
  second_last_name?: string;
  apellido_materno?: string;
  apellidoMaterno?: string;
  address?: string;
  direccion?: string;
  
  // Respuesta de SUNAT (RUC)
  razon_social?: string;
  razonSocial?: string;
  nombre?: string;
  name?: string;
  tipo_contribuyente?: string;
  tipo?: string;
  
  // Campos adicionales que podrían venir de la API
  departamento?: string;
  provincia?: string;
  distrito?: string;
  ubigeo?: string;
  codigo_postal?: string;
  referencia?: string;
}

export interface FormularioModo {
  tipo: 'automatico' | 'manual';
  puede_editar: boolean;
  campos_bloqueados: string[];
}

export interface EstadoCarga {
  consultando_api: boolean;
  error_api?: string;
  datos_encontrados: boolean;
  mensaje_estado?: string;
}

export interface ValidacionDireccion {
  ruc_dni_valido: boolean;
  direccion_completa: boolean;
  ubicacion_valida: boolean;
  errores: {
    campo: string;
    mensaje: string;
  }[];
}

// Tipos para el componente de autocompletado
export interface AutocompletadoProps {
  valor_inicial?: DireccionCompleta;
  modo_inicial?: 'automatico' | 'manual';
  en_cambio: (direccion: DireccionCompleta) => void;
  en_cambio_modo: (modo: 'automatico' | 'manual') => void;
  validacion?: ValidacionDireccion;
  deshabilitado?: boolean;
}

// Tipos para la integración con el formulario de proveedores
export interface ProveedorDireccion extends DireccionCompleta {
  // Campos específicos del proveedor
  es_direccion_fiscal: boolean;
  es_direccion_entrega: boolean;
}