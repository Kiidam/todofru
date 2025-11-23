import { useCallback, useState } from 'react';
import { 
  validateClienteForm, 
  validateClienteByTipo,
  ClienteForm 
} from '../schemas/cliente';
import { ClienteFormData, TipoEntidad } from '../types/cliente';
import { validateDNI, validateRUC, validatePhone } from '../constants/validation';

// Tipos para los errores de validación
export interface ValidationErrors {
  [key: string]: string;
}

// Tipos para el resultado de validación
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationErrors;
  firstErrorField?: string;
}

// Hook para validación de clientes
export function useClienteValidation() {
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isValidating, setIsValidating] = useState(false);

  // Función para limpiar errores
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  // Función para limpiar error de un campo específico
  const clearFieldError = useCallback((field: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  // Función para establecer error de un campo
  const setFieldError = useCallback((field: string, message: string) => {
    setErrors(prev => ({
      ...prev,
      [field]: message,
    }));
  }, []);

  // Validación en tiempo real de un campo
  const validateField = useCallback((field: string, value: unknown, formData?: Partial<ClienteFormData>): string | null => {
    // Normalizar value a string para validaciones que esperan cadena
    const v = typeof value === 'string' ? value : (value === undefined || value === null ? '' : String(value));
    try {
      switch (field) {
        case 'numeroIdentificacion':
          if (!v) return 'El número de identificación es requerido';

          // Determinar tipo basado en longitud o contexto
          const tipoEntidad = formData?.tipoEntidad || (v.length === 8 ? 'PERSONA_NATURAL' : 'PERSONA_JURIDICA');

          if (tipoEntidad === 'PERSONA_NATURAL') {
            if (v.length !== 8) return 'El DNI debe tener 8 dígitos';
            if (!validateDNI(v)) return 'DNI inválido';
          } else {
            if (v.length !== 11) return 'El RUC debe tener 11 dígitos';
            if (!validateRUC(v)) return 'RUC inválido';
          }
          break;

        case 'nombres':
          if (formData?.tipoEntidad === 'PERSONA_NATURAL') {
            if (!v || v.trim().length < 2) return 'Los nombres deben tener al menos 2 caracteres';
            if (v.length > 100) return 'Los nombres no pueden exceder 100 caracteres';
            if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(v)) return 'Los nombres solo pueden contener letras y espacios';
          }
          break;

        case 'apellidos':
          if (formData?.tipoEntidad === 'PERSONA_NATURAL') {
            if (!v || v.trim().length < 2) return 'Los apellidos deben tener al menos 2 caracteres';
            if (v.length > 100) return 'Los apellidos no pueden exceder 100 caracteres';
            if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(v)) return 'Los apellidos solo pueden contener letras y espacios';
          }
          break;

        case 'razonSocial':
          if (formData?.tipoEntidad === 'PERSONA_JURIDICA') {
            if (!v || v.trim().length < 3) return 'La razón social debe tener al menos 3 caracteres';
            if (v.length > 255) return 'La razón social no puede exceder 255 caracteres';
          }
          break;

        case 'email':
          if (v && v.trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(v)) return 'Email inválido';
          }
          break;

        case 'telefono':
          if (v && v.trim()) {
            if (!validatePhone(v)) return 'Teléfono inválido';
          }
          break;

        case 'direccion':
          if (v && v.length > 255) return 'Dirección muy larga';
          break;

        case 'contacto':
          if (v && v.length > 255) return 'Nombre del contacto muy largo';
          break;

        case 'mensajePersonalizado':
          if (v && v.length > 500) return 'Mensaje muy largo';
          break;


        case 'tipoEntidad':
          if (!v) return 'Debe seleccionar un tipo de entidad';
          if (!['PERSONA_NATURAL', 'PERSONA_JURIDICA'].includes(v)) return 'Tipo de entidad inválido';
          break;

        default:
          return null;
      }

      return null;
    } catch (error) {
      return 'Error de validación';
    }
  }, []);

  // Validación completa del formulario
  const validateForm = useCallback((formData: ClienteFormData): ValidationResult => {
    setIsValidating(true);
    
    try {
      // Usar el esquema de validación apropiado
      const validation = validateClienteByTipo(formData, formData.tipoEntidad);
      
      if (validation.success) {
        setErrors({});
        return {
          isValid: true,
          errors: {},
        };
      }

      // Procesar errores de Zod
      const validationErrors: ValidationErrors = {};
      let firstErrorField: string | undefined;

      validation.error.issues.forEach((issue, index) => {
        const field = issue.path[0] as string;
        if (!firstErrorField) firstErrorField = field;
        validationErrors[field] = issue.message;
      });

      setErrors(validationErrors);
      
      return {
        isValid: false,
        errors: validationErrors,
        firstErrorField,
      };
    } catch (error) {
      const generalError = { general: 'Error de validación del formulario' };
      setErrors(generalError);
      
      return {
        isValid: false,
        errors: generalError,
        firstErrorField: 'general',
      };
    } finally {
      setIsValidating(false);
    }
  }, []);

  // Validación asíncrona (para verificar duplicados, etc.)
  const validateAsync = useCallback(async (formData: ClienteFormData, clienteId?: string): Promise<ValidationResult> => {
    setIsValidating(true);
    
    try {
      // Primero validar localmente
      const localValidation = validateForm(formData);
      if (!localValidation.isValid) {
        return localValidation;
      }

      // Validar duplicados en el servidor
      if (formData.numeroIdentificacion) {
        const response = await fetch('/api/clientes/validate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            numeroIdentificacion: formData.numeroIdentificacion,
            excludeId: clienteId, // Para edición
          }),
        });

        if (response.ok) {
          const result = await response.json();
          if (!result.isUnique) {
            const tipoDoc = formData.tipoEntidad === 'PERSONA_NATURAL' ? 'DNI' : 'RUC';
            const error = { numeroIdentificacion: `Ya existe un cliente con este ${tipoDoc}` };
            setErrors(error);
            
            return {
              isValid: false,
              errors: error,
              firstErrorField: 'numeroIdentificacion',
            };
          }
        }
      }

      return {
        isValid: true,
        errors: {},
      };
    } catch (error) {
      const networkError = { general: 'Error de conexión al validar datos' };
      setErrors(networkError);
      
      return {
        isValid: false,
        errors: networkError,
        firstErrorField: 'general',
      };
    } finally {
      setIsValidating(false);
    }
  }, [validateForm]);

  // Función para obtener el error de un campo
  const getFieldError = useCallback((field: string): string | undefined => {
    return errors[field];
  }, [errors]);

  // Función para verificar si un campo tiene error
  const hasFieldError = useCallback((field: string): boolean => {
    return Boolean(errors[field]);
  }, [errors]);

  // Función para obtener el primer campo con error
  const getFirstErrorField = useCallback((): string | undefined => {
    const errorFields = Object.keys(errors);
    return errorFields.length > 0 ? errorFields[0] : undefined;
  }, [errors]);

  // Función para verificar si hay errores
  const hasErrors = useCallback((): boolean => {
    return Object.keys(errors).length > 0;
  }, [errors]);

  // Función para obtener el conteo de errores
  const getErrorCount = useCallback((): number => {
    return Object.keys(errors).length;
  }, [errors]);

  // Función para validar múltiples campos
  const validateFields = useCallback((fields: { [field: string]: unknown }, formData?: Partial<ClienteFormData>): ValidationErrors => {
    const fieldErrors: ValidationErrors = {};

    Object.entries(fields).forEach(([field, value]) => {
      const error = validateField(field, value, formData);
      if (error) {
        fieldErrors[field] = error;
      }
    });

    // Actualizar errores solo para los campos validados
    setErrors(prev => ({
      ...prev,
      ...fieldErrors,
    }));

    return fieldErrors;
  }, [validateField]);

  return {
    // Estado
    errors,
    isValidating,
    
    // Funciones de validación
    validateField,
    validateForm,
    validateAsync,
    validateFields,
    
    // Funciones de manejo de errores
    clearErrors,
    clearFieldError,
    setFieldError,
    getFieldError,
    hasFieldError,
    getFirstErrorField,
    hasErrors,
    getErrorCount,
  };
}

export default useClienteValidation;