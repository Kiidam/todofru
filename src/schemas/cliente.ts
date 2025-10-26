import { z } from 'zod';
import { VALIDATION_CONSTANTS, validatePhone, validateDNI, validateRUC } from '../constants/validation';

// Schema base común
const clienteBaseSchema = z.object({
  tipoCliente: z.enum(['MAYORISTA', 'MINORISTA'], {
    message: 'Debe seleccionar un tipo de cliente válido'
  }),
  telefono: z.string().optional().refine(
    (val) => !val || validatePhone(val),
    { message: VALIDATION_CONSTANTS.ERROR_MESSAGES.PHONE_INVALID }
  ),
  email: z.string().email(VALIDATION_CONSTANTS.ERROR_MESSAGES.EMAIL_INVALID).optional().or(z.literal('')),
  direccion: z.string().max(255, 'Dirección muy larga').optional(),
  mensajePersonalizado: z.string().max(500, 'Mensaje muy largo').optional(),
});

// Schema para persona natural
export const clientePersonaNaturalSchema = clienteBaseSchema.extend({
  tipoEntidad: z.literal('PERSONA_NATURAL'),
  nombres: z.string()
    .min(2, 'Los nombres deben tener al menos 2 caracteres')
    .max(100, 'Los nombres no pueden exceder 100 caracteres')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, 'Los nombres solo pueden contener letras y espacios'),
  apellidos: z.string()
    .min(2, 'Los apellidos deben tener al menos 2 caracteres')
    .max(100, 'Los apellidos no pueden exceder 100 caracteres')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, 'Los apellidos solo pueden contener letras y espacios'),
  numeroIdentificacion: z.string()
    .length(VALIDATION_CONSTANTS.DNI_LENGTH, VALIDATION_CONSTANTS.ERROR_MESSAGES.DNI_INVALID_LENGTH)
    .refine(validateDNI, VALIDATION_CONSTANTS.ERROR_MESSAGES.DNI_INVALID_FORMAT),
});

// Schema para persona jurídica
export const clientePersonaJuridicaSchema = clienteBaseSchema.extend({
  tipoEntidad: z.literal('PERSONA_JURIDICA'),
  razonSocial: z.string()
    .min(3, 'La razón social debe tener al menos 3 caracteres')
    .max(255, 'La razón social no puede exceder 255 caracteres'),
  contacto: z.string()
    .max(255, 'El nombre del contacto no puede exceder 255 caracteres')
    .optional(),
  numeroIdentificacion: z.string()
    .length(VALIDATION_CONSTANTS.RUC_LENGTH, VALIDATION_CONSTANTS.ERROR_MESSAGES.RUC_INVALID_LENGTH)
    .refine(validateRUC, VALIDATION_CONSTANTS.ERROR_MESSAGES.RUC_INVALID_FORMAT),
});

// Schema discriminado para el formulario
export const clienteFormSchema = z.discriminatedUnion('tipoEntidad', [
  clientePersonaNaturalSchema,
  clientePersonaJuridicaSchema,
]);

// Schema para el payload que se envía al API
export const clientePayloadSchema = z.object({
  id: z.string().optional(),
  tipoEntidad: z.enum(['PERSONA_NATURAL', 'PERSONA_JURIDICA']),
  tipoCliente: z.enum(['MAYORISTA', 'MINORISTA']),
  // nombre es calculado en el servidor; no exigirlo en el payload
  nombre: z.string().optional(),
  numeroIdentificacion: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  direccion: z.string().optional(),
  contacto: z.string().optional(),
  // Campos adicionales para nueva estructura
  nombres: z.string().optional(),
  apellidos: z.string().optional(),
  razonSocial: z.string().optional(),
  // Compatibilidad
  ruc: z.string().optional(),
});

// Funciones de validación
export function validateClienteForm(data: unknown) {
  return clienteFormSchema.safeParse(data);
}

export function validateClientePayload(data: unknown) {
  return clientePayloadSchema.safeParse(data);
}

// Función para validar según el tipo de entidad
export function validateClienteByTipo(data: unknown, tipoEntidad: 'PERSONA_NATURAL' | 'PERSONA_JURIDICA') {
  if (tipoEntidad === 'PERSONA_NATURAL') {
    return clientePersonaNaturalSchema.safeParse(data);
  } else {
    return clientePersonaJuridicaSchema.safeParse(data);
  }
}

// Tipos inferidos de los schemas
export type ClientePersonaNaturalForm = z.infer<typeof clientePersonaNaturalSchema>;
export type ClientePersonaJuridicaForm = z.infer<typeof clientePersonaJuridicaSchema>;
export type ClienteForm = z.infer<typeof clienteFormSchema>;
export type ClientePayload = z.infer<typeof clientePayloadSchema>;