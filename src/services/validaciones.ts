// Servicio de validaciones para RUC/DNI y direcciones

import { DireccionCompleta, ValidacionDireccion } from '@/types/address';

export class ValidacionesService {
  
  /**
   * Valida formato de RUC (11 dígitos)
   */
  static validarRUC(ruc: string): { valido: boolean; mensaje?: string } {
    if (!ruc) {
      return { valido: false, mensaje: 'RUC es obligatorio' };
    }

    // Remover espacios y caracteres no numéricos
    const rucLimpio = ruc.replace(/\D/g, '');

    if (rucLimpio.length !== 11) {
      return { valido: false, mensaje: 'RUC debe tener 11 dígitos' };
    }

    // Validar que no sean todos ceros o números repetidos
    if (/^0+$/.test(rucLimpio) || /^(\d)\1{10}$/.test(rucLimpio)) {
      return { valido: false, mensaje: 'RUC no válido' };
    }

    // Validar dígito verificador usando algoritmo oficial
    const digitos = rucLimpio.split('').map(Number);
    const factores = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    
    let suma = 0;
    for (let i = 0; i < 10; i++) {
      suma += digitos[i] * factores[i];
    }
    
    const resto = suma % 11;
    const digitoVerificador = resto < 2 ? resto : 11 - resto;
    
    if (digitoVerificador !== digitos[10]) {
      return { valido: false, mensaje: 'RUC no válido (dígito verificador incorrecto)' };
    }

    return { valido: true };
  }

  /**
   * Valida formato de DNI (8 dígitos)
   */
  static validarDNI(dni: string): { valido: boolean; mensaje?: string } {
    if (!dni) {
      return { valido: false, mensaje: 'DNI es obligatorio' };
    }

    // Remover espacios y caracteres no numéricos
    const dniLimpio = dni.replace(/\D/g, '');

    if (dniLimpio.length !== 8) {
      return { valido: false, mensaje: 'DNI debe tener 8 dígitos' };
    }

    // Validar que no sean todos ceros o números repetidos
    if (/^0+$/.test(dniLimpio) || /^(\d)\1{7}$/.test(dniLimpio)) {
      return { valido: false, mensaje: 'DNI no válido' };
    }

    // Validar rango válido (DNI peruano)
    const numero = parseInt(dniLimpio);
    if (numero < 1000000 || numero > 99999999) {
      return { valido: false, mensaje: 'DNI fuera del rango válido' };
    }

    return { valido: true };
  }

  /**
   * Valida dirección completa
   */
  static validarDireccionCompleta(direccion: DireccionCompleta): ValidacionDireccion {
    const errores: { campo: string; mensaje: string }[] = [];

    // Validar dirección específica (obligatoria)
    if (!direccion.direccion_especifica || direccion.direccion_especifica.trim().length < 10) {
      errores.push({
        campo: 'direccion_especifica',
        mensaje: 'La dirección específica debe tener al menos 10 caracteres'
      });
    }

    // Validar que la dirección tenga información útil
    if (direccion.direccion_especifica && direccion.direccion_especifica.trim().length > 0) {
      const direccionLimpia = direccion.direccion_especifica.toLowerCase().trim();
      
      // Verificar que no sea solo texto genérico
      const textosGenericos = ['sin dirección', 'no tiene', 'n/a', 'ninguna', 'no aplica', 'sin datos'];
      if (textosGenericos.some(texto => direccionLimpia.includes(texto))) {
        errores.push({
          campo: 'direccion_especifica',
          mensaje: 'Ingrese una dirección específica válida'
        });
      }

      // Verificar que tenga al menos un número (dirección física)
      if (!/\d/.test(direccionLimpia)) {
        errores.push({
          campo: 'direccion_especifica',
          mensaje: 'La dirección debe incluir un número'
        });
      }
    }

    // Validar ubicación geográfica (recomendada pero no obligatoria)
    let ubicacion_valida = true;
    if (!direccion.departamento) {
      errores.push({
        campo: 'departamento',
        mensaje: 'Seleccione un departamento'
      });
      ubicacion_valida = false;
    }

    if (!direccion.provincia) {
      errores.push({
        campo: 'provincia',
        mensaje: 'Seleccione una provincia'
      });
      ubicacion_valida = false;
    }

    if (!direccion.distrito) {
      errores.push({
        campo: 'distrito',
        mensaje: 'Seleccione un distrito (recomendado)'
      });
      // No marcar como inválido si solo falta el distrito
    }

    return {
      ruc_dni_valido: true, // Se valida por separado
      direccion_completa: direccion.direccion_especifica.trim().length >= 10,
      ubicacion_valida,
      errores
    };
  }

  /**
   * Valida dirección física (que sea una dirección real)
   */
  static validarDireccionFlexible(direccion: string): { valida: boolean; mensaje?: string } {
    if (!direccion || direccion.trim().length === 0) {
      return { valida: true }; // Dirección vacía es válida (opcional)
    }

    const direccionLimpia = direccion.toLowerCase().trim();

    // Solo rechazar direcciones obviamente inválidas
    const patronesInvalidos = [
      /^[.\-\s]*$/, // Solo puntos, guiones o espacios
      /^(x{3,}|z{3,}|a{3,}|1{3,}|0{3,})$/i, // Más de 2 caracteres repetidos
      /^\s*$/ // Solo espacios en blanco
    ];

    if (patronesInvalidos.some(patron => patron.test(direccionLimpia))) {
      return { valida: false, mensaje: 'Ingrese una dirección válida' };
    }

    // Verificar longitud mínima razonable
    if (direccionLimpia.length < 3) {
      return { valida: false, mensaje: 'La dirección debe tener al menos 3 caracteres' };
    }

    return { valida: true };
  }

  static validarDireccionFisica(direccion: string): { valida: boolean; mensaje?: string } {
    if (!direccion || direccion.trim().length === 0) {
      return { valida: false, mensaje: 'Dirección es obligatoria' };
    }

    const direccionLimpia = direccion.toLowerCase().trim();

    // Patrones que indican una dirección física válida
    const patronesValidos = [
      /\b(av|avenida|jr|jirón|calle|ca|psje|pasaje|mz|manzana|lt|lote|urb|urbanización|pueblo|villa|sector|zona)\b/,
      /\d+/, // Debe tener al menos un número
      /\b(cuadra|cdra|km|kilómetro|metro|mts)\b/
    ];

    // Verificar que tenga al menos algunos patrones válidos
    const patronesEncontrados = patronesValidos.filter(patron => patron.test(direccionLimpia));
    
    if (patronesEncontrados.length < 2) {
      return { 
        valida: false, 
        mensaje: 'La dirección debe incluir información específica (calle, número, urbanización, etc.)' 
      };
    }

    // Patrones que indican direcciones no válidas
    const patronesInvalidos = [
      /\b(sin dirección|no tiene|n\/a|ninguna|no aplica|sin datos|desconocido|no especifica)\b/,
      /^[.\-\s]*$/, // Solo puntos, guiones o espacios
      /^(x+|z+|a+|1+|0+)$/i // Caracteres repetidos
    ];

    if (patronesInvalidos.some(patron => patron.test(direccionLimpia))) {
      return { valida: false, mensaje: 'Ingrese una dirección específica válida' };
    }

    return { valida: true };
  }

  /**
   * Valida formato de email
   */
  static validarEmail(email: string): { valido: boolean; mensaje?: string } {
    if (!email) {
      return { valido: true }; // Email es opcional
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { valido: false, mensaje: 'Formato de email inválido' };
    }

    return { valido: true };
  }

  /**
   * Valida formato de teléfono peruano
   */
  static validarTelefono(telefono: string): { valido: boolean; mensaje?: string } {
    if (!telefono) {
      return { valido: true }; // Teléfono es opcional
    }

    // Remover espacios, guiones y paréntesis
    const telefonoLimpio = telefono.replace(/[\s\-\(\)]/g, '');

    // Patrones válidos para Perú
    const patronesValidos = [
      /^\+51\d{9}$/, // +51 seguido de 9 dígitos
      /^51\d{9}$/, // 51 seguido de 9 dígitos
      /^9\d{8}$/, // Celular: 9 seguido de 8 dígitos
      /^[1-7]\d{6,7}$/, // Fijo: 7-8 dígitos empezando con 1-7
    ];

    const esValido = patronesValidos.some(patron => patron.test(telefonoLimpio));

    if (!esValido) {
      return { 
        valido: false, 
        mensaje: 'Formato de teléfono inválido. Use formato peruano (+51XXXXXXXXX o 9XXXXXXXX)' 
      };
    }

    return { valido: true };
  }

  /**
   * Validación completa de proveedor
   */
  static validarProveedor(datos: {
    tipoEntidad: 'PERSONA_NATURAL' | 'PERSONA_JURIDICA';
    numeroIdentificacion?: string;
    razonSocial?: string;
    nombres?: string;
    apellidos?: string;
    email?: string;
    telefono?: string;
    direccion: DireccionCompleta | string;
  }): {
    valido: boolean;
    errores: { campo: string; mensaje: string }[];
  } {
    const errores: { campo: string; mensaje: string }[] = [];

    // Validar número de identificación obligatorio
    if (!datos.numeroIdentificacion || datos.numeroIdentificacion.trim().length === 0) {
      errores.push({ campo: 'numeroIdentificacion', mensaje: 'El número de identificación es obligatorio' });
    } else {
      // Validar documento según tipo de entidad
      if (datos.tipoEntidad === 'PERSONA_JURIDICA') {
        const validacionRUC = this.validarRUC(datos.numeroIdentificacion);
        if (!validacionRUC.valido) {
          errores.push({ campo: 'numeroIdentificacion', mensaje: validacionRUC.mensaje || 'RUC inválido' });
        }
      } else {
        const validacionDNI = this.validarDNI(datos.numeroIdentificacion);
        if (!validacionDNI.valido) {
          errores.push({ campo: 'numeroIdentificacion', mensaje: validacionDNI.mensaje || 'DNI inválido' });
        }
      }
    }

    // Validar campos específicos según tipo de entidad
    if (datos.tipoEntidad === 'PERSONA_JURIDICA') {
      if (!datos.razonSocial || datos.razonSocial.trim().length === 0) {
        errores.push({ campo: 'razonSocial', mensaje: 'La razón social es requerida' });
      }
    } else {
      if (!datos.nombres || datos.nombres.trim().length < 2) {
        errores.push({ campo: 'nombres', mensaje: 'Nombres debe tener al menos 2 caracteres' });
      }

      if (!datos.apellidos || datos.apellidos.trim().length < 2) {
        errores.push({ campo: 'apellidos', mensaje: 'Apellidos debe tener al menos 2 caracteres' });
      }
    }

    // Validar email si se proporciona
    if (datos.email && datos.email.trim().length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(datos.email)) {
        errores.push({ campo: 'email', mensaje: 'El formato del email no es válido' });
      }
    }

    // Validar teléfono si se proporciona
    if (datos.telefono && datos.telefono.trim().length > 0) {
      const phoneRegex = /^[\+]?[0-9\s\-\(\)]{7,15}$/;
      if (!phoneRegex.test(datos.telefono)) {
        errores.push({ campo: 'telefono', mensaje: 'El formato del teléfono no es válido' });
      }
    }

    // Validar dirección (opcional) - solo validar si se proporciona
    if (datos.direccion && typeof datos.direccion === 'string' && datos.direccion.trim().length > 0) {
      // Validación flexible para dirección - solo verificar que no sea obviamente inválida
      const validacionDireccionFisica = this.validarDireccionFlexible(datos.direccion);
      if (!validacionDireccionFisica.valida) {
        errores.push({ campo: 'direccion', mensaje: validacionDireccionFisica.mensaje || 'Dirección inválida' });
      }
    } else if (datos.direccion && typeof datos.direccion === 'object') {
      // Si es DireccionCompleta, usar validación completa
      const validacionDireccion = this.validarDireccionCompleta(datos.direccion);
      errores.push(...validacionDireccion.errores);
    }

    return {
      valido: errores.length === 0,
      errores
    };
  }
}