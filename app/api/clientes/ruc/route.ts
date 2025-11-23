/**
 * API Endpoint: /api/clientes/ruc
 * Consulta información de RUC (SUNAT) o DNI (RENIEC) a través de Decolecta
 * Soporta tanto personas naturales (DNI 8 dígitos) como jurídicas (RUC 11 dígitos)
 */
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger'
import { fetchReniecByDni, fetchSunatByRuc, DecolectaError } from '@/lib/decolecta'
import { ValidacionesService } from '@/services/validaciones'
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Normaliza la respuesta de RENIEC (DNI - Persona Natural)
 */
function normalizeDniResponse(raw: unknown): Record<string, unknown> {
  const r = raw as Record<string, unknown>;
  
  // Extraer campos con diferentes nombres posibles
  const nombres = String(r.nombres || r.first_name || r.nombre || '').trim();
  const apellidoPaterno = String(r.apellido_paterno || r.first_last_name || r.apellidoPaterno || '').trim();
  const apellidoMaterno = String(r.apellido_materno || r.second_last_name || r.apellidoMaterno || '').trim();
  const dni = String(r.dni || r.numero_documento || r.numero || '').trim();
  const direccion = String(r.direccion || r.address || r.domicilio || '').trim();
  
  // Construir nombre completo
  const nombreCompleto = `${nombres} ${apellidoPaterno} ${apellidoMaterno}`
    .trim()
    .replace(/\s+/g, ' ');

  logger.info('[RENIEC] Datos normalizados', {
    dni,
    nombreCompleto,
    nombres,
    apellidoPaterno,
    apellidoMaterno
  });

  return {
    numeroIdentificacion: dni,
    tipoDocumento: 'DNI',
    tipoEntidad: 'PERSONA_NATURAL',
    razonSocial: nombreCompleto,
    nombres,
    apellidos: `${apellidoPaterno} ${apellidoMaterno}`.trim(),
    apellidoPaterno,
    apellidoMaterno,
    direccion,
    esPersonaNatural: true,
    estado: 'ACTIVO',
    condicion: 'HABIDO',
    esActivo: true,
    origen: 'RENIEC',
  };
}

/**
 * Normaliza la respuesta de SUNAT (RUC - Persona Jurídica o Natural con RUC)
 */
function normalizeRucResponse(raw: unknown): Record<string, unknown> {
  const r = raw as Record<string, unknown>;
  
  // Extraer campos con diferentes nombres posibles
  const ruc = String(r.ruc || r.numero || r.numero_documento || '').trim();
  const razonSocial = String(r.razon_social || r.razonSocial || r.nombre || r.nombre_comercial || '').trim();
  const direccion = String(r.direccion || r.direccion_completa || r.domicilio_fiscal || r.address || '').trim();
  const estado = String(r.estado || r.status || r.estado_contribuyente || '').trim();
  const condicion = String(r.condicion || r.condition || r.condicion_contribuyente || '').trim();
  const tipoContribuyente = String(r.tipo_contribuyente || r.tipo || r.tipoContribuyente || '').trim();
  
  // Determinar si es persona natural basado en el tipo de contribuyente
  const esPersonaNatural = 
    tipoContribuyente.toLowerCase().includes('natural') ||
    tipoContribuyente.toLowerCase().includes('persona') ||
    ruc.startsWith('10'); // RUCs que empiezan con 10 son personas naturales

  // Determinar si está activo
  const esActivo = 
    estado.toLowerCase().includes('activo') &&
    !estado.toLowerCase().includes('baja') &&
    !estado.toLowerCase().includes('suspendido') &&
    condicion.toLowerCase().includes('habido');

  logger.info('[SUNAT] Datos normalizados', {
    ruc,
    razonSocial,
    tipoContribuyente,
    esPersonaNatural,
    esActivo,
    estado,
    condicion
  });

  return {
    numeroIdentificacion: ruc,
    tipoDocumento: 'RUC',
    tipoEntidad: esPersonaNatural ? 'PERSONA_NATURAL' : 'PERSONA_JURIDICA',
    razonSocial,
    direccion,
    tipoContribuyente,
    estado,
    condicion,
    esPersonaNatural,
    esActivo,
    fechaInscripcion: String(r.fecha_inscripcion || r.fechaInscripcion || '').trim(),
    fechaInicioActividades: String(r.fecha_inicio_actividades || r.fechaInicioActividades || '').trim(),
    origen: 'SUNAT',
  };
}

/**
 * GET /api/clientes/ruc?ruc=XXXXXXXX
 * Consulta RUC (11 dígitos) o DNI (8 dígitos)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const rawNumero = (searchParams.get('ruc') || searchParams.get('numero') || '').trim()
  const numeroDocumento = rawNumero.replace(/[^0-9]/g, '')

  if (!numeroDocumento) {
    logger.warn('[API /clientes/ruc] Número de documento vacío', { rawNumero })
    return NextResponse.json(
      { success: false, error: 'Número de documento es requerido' },
      { status: 400 }
    )
  }

  const isDni = numeroDocumento.length === 8
  const tipoDocumento = isDni ? 'DNI' : 'RUC'
  const isDev = process.env.NODE_ENV !== 'production'

  if (!/^\d{8}$|^\d{11}$/.test(numeroDocumento)) {
    logger.warn('[API /clientes/ruc] Formato inválido', { numeroDocumento, tipoDocumentoDetectado: tipoDocumento })
    return NextResponse.json(
      { success: false, error: 'Número de documento inválido. Debe ser DNI (8 dígitos) o RUC (11 dígitos).' },
      { status: 400 }
    )
  }

  const validacion = isDni
    ? ValidacionesService.validarDNI(numeroDocumento)
    : ValidacionesService.validarRUC(numeroDocumento)

  if (!validacion.valido) {
    logger.warn('[API /clientes/ruc] Validación de documento fallida', { numeroDocumento, tipoDocumento, mensaje: validacion.mensaje })
    return NextResponse.json(
      { success: false, error: validacion.mensaje || `Documento ${tipoDocumento} inválido` },
      { status: 400 }
    )
  }

  logger.info(`[API /clientes/ruc] Consultando ${tipoDocumento}`, { numeroDocumento, rawNumero })

  try {
    // 1) Intentar resolver desde la base de datos primero (evita llamadas externas innecesarias)
    const existente = await prisma.cliente.findFirst({
      where: {
        activo: true,
        OR: [
          { numeroIdentificacion: numeroDocumento },
          { ruc: numeroDocumento }, // compatibilidad con esquema legado
        ],
      },
    });

    if (existente) {
      const esPersonaNatural = existente.tipoEntidad === 'PERSONA_NATURAL' || (numeroDocumento.length === 8);
      const data = {
        numeroIdentificacion: numeroDocumento,
        tipoDocumento,
        tipoEntidad: esPersonaNatural ? 'PERSONA_NATURAL' : 'PERSONA_JURIDICA',
        razonSocial: esPersonaNatural
          ? `${(existente.nombres || '').trim()} ${(existente.apellidos || '').trim()}`.trim().replace(/\s+/g, ' ')
          : (existente.razonSocial || existente.nombre || '').trim(),
        nombres: existente.nombres || undefined,
        apellidos: existente.apellidos || undefined,
        direccion: existente.direccion || undefined,
        esPersonaNatural,
        estado: 'ACTIVO',
        condicion: 'HABIDO',
        esActivo: true,
        origen: 'DB',
      } as Record<string, unknown>;

      logger.info('[API /clientes/ruc] Resuelto desde BD local', { numeroDocumento, id: existente.id });
      return NextResponse.json({ success: true, data });
    }

    // Consultar según el tipo de documento
    if (isDni) {
      // Consulta a RENIEC
      const rawData = await fetchReniecByDni(numeroDocumento)
      const normalizedData = normalizeDniResponse(rawData);
      
      logger.info('[API /clientes/ruc] Consulta DNI exitosa', { numeroDocumento });
      
      return NextResponse.json({
        success: true,
        data: normalizedData,
        raw: isDev ? rawData : undefined, // Solo en desarrollo mostramos el raw
      });
    } else {
      // Consulta a SUNAT
      const rawData = await fetchSunatByRuc(numeroDocumento)
      const normalizedData = normalizeRucResponse(rawData);
      
      logger.info('[API /clientes/ruc] Consulta RUC exitosa', { numeroDocumento });
      
      return NextResponse.json({
        success: true,
        data: normalizedData,
        raw: isDev ? rawData : undefined, // Solo en desarrollo mostramos el raw
      });
    }

  } catch (err: unknown) {
    // Manejo de errores de Decolecta
    if (err instanceof DecolectaError) {
      logger.error('[API /clientes/ruc] Error de Decolecta', {
        numeroDocumento,
        tipoDocumento,
        error: err.message,
        status: err.status
      });

      // No retornar datos ficticios: exigir configuración correcta o permitir ingreso manual
      const statusCode = err.status === 401 || err.status === 403 ? 502 : err.status;
      const message = err.status === 401 || err.status === 403
        ? 'Servicio externo no autorizado. Configure el token de integración.'
        : err.message;
      return NextResponse.json({ success: false, error: message }, { status: statusCode });
    }

    // Error genérico no esperado
    logger.error('[API /clientes/ruc] Error inesperado', {
      numeroDocumento,
      tipoDocumento,
      error: err instanceof Error ? err.message : 'Error desconocido'
    });

    return NextResponse.json({ success: false, error: 'Error interno del servidor al consultar el documento' }, { status: 500 });
  }
}
