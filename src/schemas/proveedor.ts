import { z } from 'zod';
import { VALIDATION_CONSTANTS, validatePhone, validateDNI, validateRUC } from '../constants/validation';

// Schema base común
const proveedorBaseSchema = z.object({
  telefono: z.string().optional().refine(
    (val) => !val || validatePhone(val),
    { message: VALIDATION_CONSTANTS.ERROR_MESSAGES.PHONE_INVALID }
  ),
  email: z.string().email(VALIDATION_CONSTANTS.ERROR_MESSAGES.EMAIL_INVALID).optional().or(z.literal('')),
  direccion: z.string().max(255, 'Dirección muy larga').optional(),
});

// Schema para persona natural
export const personaNaturalSchema = proveedorBaseSchema.extend({
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
export const personaJuridicaSchema = proveedorBaseSchema.extend({
  tipoEntidad: z.literal('PERSONA_JURIDICA'),
  razonSocial: z.string()
    .min(1, 'La razón social es requerida')
    .max(255, 'La razón social no puede exceder 255 caracteres'),
  numeroIdentificacion: z.string()
    .length(VALIDATION_CONSTANTS.RUC_LENGTH, VALIDATION_CONSTANTS.ERROR_MESSAGES.RUC_INVALID_LENGTH)
    .refine(validateRUC, VALIDATION_CONSTANTS.ERROR_MESSAGES.RUC_INVALID_FORMAT),
  representanteLegal: z.string()
    .max(255, 'El nombre del representante legal no puede exceder 255 caracteres')
    .optional(),
});

// Schema discriminado para el formulario
export const proveedorFormSchema = z.discriminatedUnion('tipoEntidad', [
  personaNaturalSchema,
  personaJuridicaSchema,
]);

// Schema para el payload del API (después de transformación)
export const proveedorPayloadSchema = z.object({
  id: z.string().optional(),
  tipoEntidad: z.enum(['PERSONA_NATURAL', 'PERSONA_JURIDICA']),
  nombre: z.string().min(1, 'El nombre es requerido'),
  numeroIdentificacion: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  direccion: z.string().optional(),
  contacto: z.string().optional(),
  
  // Campos específicos para persona natural
  nombres: z.string().optional(),
  apellidos: z.string().optional(),
  
  // Campos específicos para persona jurídica
  razonSocial: z.string().optional(),
  representanteLegal: z.string().optional(),
  
  // Campos de compatibilidad (deprecated)
  ruc: z.string().optional(),
});

// Funciones de validación
export function validatePersonaNatural(data: unknown) {
  return personaNaturalSchema.safeParse(data);
}

export function validatePersonaJuridica(data: unknown) {
  return personaJuridicaSchema.safeParse(data);
}

export function validateProveedorForm(data: unknown) {
  return proveedorFormSchema.safeParse(data);
}

export function validateProveedorPayload(data: unknown) {
  return proveedorPayloadSchema.safeParse(data);
}

// Tipos inferidos de los schemas
export type PersonaNaturalForm = z.infer<typeof personaNaturalSchema>;
export type PersonaJuridicaForm = z.infer<typeof personaJuridicaSchema>;
export type ProveedorForm = z.infer<typeof proveedorFormSchema>;
export type ProveedorPayload = z.infer<typeof proveedorPayloadSchema>;