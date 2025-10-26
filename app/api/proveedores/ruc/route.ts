import { NextRequest, NextResponse } from 'next/server';
import { logger } from '../../../../src/lib/logger';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = process.env.DECOLECTA_API_TOKEN;
    const isDev = process.env.NODE_ENV !== 'production';

    const { searchParams } = new URL(request.url);
    const ruc = (searchParams.get('ruc') || '').trim();
    const forceMock = isDev && (searchParams.get('mock') === '1');

    if (!ruc || !/^\d{8}$|^\d{11}$/.test(ruc)) {
      return NextResponse.json(
        { success: false, error: 'Parámetro ruc inválido. Debe ser 8 o 11 dígitos.' },
        { status: 400 }
      );
    }

    const base = process.env.DECOLECTA_BASE_URL || 'https://api.decolecta.com/v1';

    let url = '';
    let raw: Record<string, unknown> = {};
    let razonSocial = '';
    let direccion = '';
    let tipoContribuyente = '';
    let esPersonaNatural = false;

    // Determinar si usar mock: en desarrollo sin token o cuando se fuerza
    const shouldUseMock = !token || forceMock;

    // Fallback de desarrollo cuando no hay token, se fuerza mock=1, o cuando la API externa falla
    if (shouldUseMock) {
      const mockIsDNI = ruc.length === 8;
      
      // Casos especiales para pruebas
      if (ruc === '20123456789') {
        // RUC inactivo
        return NextResponse.json({
          success: true,
          data: { 
            ruc, 
            razonSocial: 'Empresa Inactiva S.A.', 
            direccion: 'Av. Inactiva 456, Lima', 
            tipoContribuyente: 'Sociedad Anónima', 
            esPersonaNatural: false,
            estado: 'Inactivo',
            condicion: 'Suspendido',
            esActivo: false
          },
          raw: { mock: true, source: 'dev-fallback-inactive' }
        });
      }
      
      if (ruc === '20999999999') {
        // RUC no encontrado
        return NextResponse.json({
          success: false,
          error: 'RUC no encontrado en la base de datos'
        }, { status: 404 });
      }
      
      // Caso normal
      const mockRazonSocial = mockIsDNI ? 'Juan Pérez Gómez' : 'Empresa Demo S.A.';
      const mockDireccion = mockIsDNI ? 'Av. Prueba 123, Lima' : 'Calle Falsa 123, Lima';
      const mockTipoContribuyente = mockIsDNI ? 'Persona Natural (Mock)' : 'Sociedad Anónima (Mock)';
      const mockEsPersonaNatural = mockIsDNI;
      
      const mockData: any = { 
        ruc, 
        razonSocial: mockRazonSocial, 
        direccion: mockDireccion, 
        tipoContribuyente: mockTipoContribuyente, 
        esPersonaNatural: mockEsPersonaNatural 
      };
      
      // Agregar información adicional para RUC
      if (!mockIsDNI) {
        mockData.estado = 'Activo';
        mockData.condicion = 'Habido';
        mockData.esActivo = true;
        mockData.fechaInscripcion = '2020-01-15';
        mockData.fechaInicioActividades = '2020-02-01';
      }
      
      // Para DNI, agregar nombres separados
      if (mockIsDNI) {
        mockData.nombres = 'Juan';
        mockData.apellidos = 'Pérez Gómez';
      }
      
      return NextResponse.json({
        success: true,
        data: mockData,
        raw: { mock: true, source: 'dev-fallback' }
      });
    }

    if (ruc.length === 8) {
      // DNI via RENIEC
      const reniecEndpoint = process.env.DECOLECTA_RENIEC_URL || '/reniec/dni';
      const reniecParam = process.env.DECOLECTA_RENIEC_PARAM || 'numero';
      url = `${base}${reniecEndpoint}?${reniecParam}=${ruc}`;
      const resp = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        cache: 'no-store',
        next: { revalidate: 0 },
      });
      raw = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const msgUnknown = raw['message'] ?? raw['error'] ?? 'No se pudo consultar el DNI (RENIEC)';
        const msg = String(msgUnknown);
        
        // En desarrollo, usar mock como fallback cuando la API externa falla
        if (isDev) {
          logger.info('API RENIEC falló, usando mock como fallback');
          const mockData = { 
            ruc, 
            razonSocial: 'Juan Pérez Gómez', 
            direccion: 'Av. Prueba 123, Lima', 
            tipoContribuyente: 'Persona Natural (Mock)', 
            esPersonaNatural: true,
            nombres: 'Juan',
            apellidos: 'Pérez Gómez'
          };
          
          return NextResponse.json({
            success: true,
            data: mockData,
            raw: { mock: true, source: 'reniec-error-fallback' }
          });
        }
        
        return NextResponse.json(
          {
            success: false,
            error: msg,
            raw,
          },
          { status: resp.status }
        );
      }
      const nombres = String(raw['first_name'] ?? raw['nombres'] ?? '');
      const apPat = String(raw['first_last_name'] ?? raw['apellido_paterno'] ?? raw['apellidoPaterno'] ?? '');
      const apMat = String(raw['second_last_name'] ?? raw['apellido_materno'] ?? raw['apellidoMaterno'] ?? '');
      razonSocial = `${nombres} ${apPat} ${apMat}`.trim().replace(/\s+/g, ' ');
      direccion = String(raw['address'] ?? raw['direccion'] ?? '');
      tipoContribuyente = 'Persona Natural (RENIEC)';
      esPersonaNatural = true;
      
      // Para personas naturales, incluir campos separados
      const apellidos = `${apPat} ${apMat}`.trim();
    } else {
      // RUC (SUNAT via Decolecta)
      // Usar el endpoint correcto configurado en las variables de entorno
      const sunatEndpoint = process.env.DECOLECTA_SUNAT_URL || '/sunat/ruc';
      const sunatParam = process.env.DECOLECTA_SUNAT_PARAM || 'numero';
      url = `${base}${sunatEndpoint}?${sunatParam}=${ruc}`;
      const resp = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        cache: 'no-store',
        next: { revalidate: 0 },
      });
      raw = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const msgUnknown = raw['message'] ?? raw['error'] ?? 'No se pudo consultar el RUC (SUNAT)';
        const msg = String(msgUnknown);
        const friendly = /microservice/i.test(String(msg))
          ? 'Servicio RUC de Decolecta no disponible temporalmente'
          : msg;
        

        
        // En desarrollo, usar mock como fallback cuando la API externa falla
        if (isDev) {
          logger.info('API SUNAT falló, usando mock como fallback');
          const mockData = { 
            ruc, 
            razonSocial: 'Empresa Demo S.A.', 
            direccion: 'Calle Falsa 123, Lima', 
            tipoContribuyente: 'Sociedad Anónima (Mock)', 
            esPersonaNatural: false,
            estado: 'Activo',
            condicion: 'Habido',
            esActivo: true,
            fechaInscripcion: '2020-01-15',
            fechaInicioActividades: '2020-02-01'
          };
          
          return NextResponse.json({
            success: true,
            data: mockData,
            raw: { mock: true, source: 'sunat-error-fallback' }
          });
        }
        
        return NextResponse.json(
          { success: false, error: friendly, raw },
          { status: resp.status }
        );
      }
      razonSocial = String(raw['razon_social'] ?? raw['razonSocial'] ?? raw['nombre'] ?? raw['name'] ?? '');
      direccion = String(raw['direccion'] ?? raw['address'] ?? '');
      tipoContribuyente = String(raw['tipo_contribuyente'] ?? raw['tipo'] ?? '');
      esPersonaNatural = String(tipoContribuyente || '').toLowerCase().includes('persona');
      
      // Información adicional del contribuyente
      const estado = String(raw['estado'] ?? raw['status'] ?? '');
      const condicion = String(raw['condicion'] ?? raw['condition'] ?? '');
      const fechaInscripcion = String(raw['fecha_inscripcion'] ?? raw['fechaInscripcion'] ?? '');
      const fechaInicioActividades = String(raw['fecha_inicio_actividades'] ?? raw['fechaInicioActividades'] ?? '');
      
      // Determinar si está activo basado en múltiples campos
      const esActivo = !estado.toLowerCase().includes('inactivo') && 
                      !estado.toLowerCase().includes('suspendido') &&
                      !estado.toLowerCase().includes('baja') &&
                      !condicion.toLowerCase().includes('inactivo') &&
                      !condicion.toLowerCase().includes('suspendido') &&
                      !tipoContribuyente.toLowerCase().includes('inactivo');
    }

    const responseData: any = {
      ruc,
      razonSocial,
      direccion,
      tipoContribuyente,
      esPersonaNatural,
    };
    
    // Agregar información adicional para RUC (no para DNI)
    if (ruc.length === 11) {
      const estado = String(raw['estado'] ?? raw['status'] ?? '');
      const condicion = String(raw['condicion'] ?? raw['condition'] ?? '');
      const fechaInscripcion = String(raw['fecha_inscripcion'] ?? raw['fechaInscripcion'] ?? '');
      const fechaInicioActividades = String(raw['fecha_inicio_actividades'] ?? raw['fechaInicioActividades'] ?? '');
      
      const esActivo = !estado.toLowerCase().includes('inactivo') && 
                      !estado.toLowerCase().includes('suspendido') &&
                      !estado.toLowerCase().includes('baja') &&
                      !condicion.toLowerCase().includes('inactivo') &&
                      !condicion.toLowerCase().includes('suspendido') &&
                      !tipoContribuyente.toLowerCase().includes('inactivo');
      
      responseData.estado = estado;
      responseData.condicion = condicion;
      responseData.fechaInscripcion = fechaInscripcion;
      responseData.fechaInicioActividades = fechaInicioActividades;
      responseData.esActivo = esActivo;
    }

    // Para personas naturales, incluir campos separados
    if (esPersonaNatural && ruc.length === 8) {
      const nombres = String(raw['first_name'] ?? raw['nombres'] ?? '');
      const apPat = String(raw['first_last_name'] ?? raw['apellido_paterno'] ?? raw['apellidoPaterno'] ?? '');
      const apMat = String(raw['second_last_name'] ?? raw['apellido_materno'] ?? raw['apellidoMaterno'] ?? '');
      const apellidos = `${apPat} ${apMat}`.trim();
      
      responseData.nombres = nombres;
      responseData.apellidos = apellidos;
    }

    return NextResponse.json({
      success: true,
      data: responseData,
      raw,
    });
  } catch (error) {
    logger.error('Error en proxy RUC:', { error });
    
    // En desarrollo, usar mock como fallback cuando la API externa falla
    const isDev = process.env.NODE_ENV !== 'production';
    const { searchParams } = new URL(request.url);
    const ruc = (searchParams.get('ruc') || '').trim();
    
    if (isDev && ruc) {
      logger.info('Usando mock como fallback debido a error en API externa');
      const mockIsDNI = ruc.length === 8;
      const mockRazonSocial = mockIsDNI ? 'Juan Pérez Gómez' : 'Empresa Demo S.A.';
      const mockDireccion = mockIsDNI ? 'Av. Prueba 123, Lima' : 'Calle Falsa 123, Lima';
      const mockTipoContribuyente = mockIsDNI ? 'Persona Natural (Mock)' : 'Sociedad Anónima (Mock)';
      const mockEsPersonaNatural = mockIsDNI;
      
      const mockData: any = { 
        ruc, 
        razonSocial: mockRazonSocial, 
        direccion: mockDireccion, 
        tipoContribuyente: mockTipoContribuyente, 
        esPersonaNatural: mockEsPersonaNatural 
      };
      
      // Agregar información adicional para RUC
      if (!mockIsDNI) {
        mockData.estado = 'Activo';
        mockData.condicion = 'Habido';
        mockData.esActivo = true;
        mockData.fechaInscripcion = '2020-01-15';
        mockData.fechaInicioActividades = '2020-02-01';
      }
      
      // Para DNI, agregar nombres separados
      if (mockIsDNI) {
        mockData.nombres = 'Juan';
        mockData.apellidos = 'Pérez Gómez';
      }
      
      return NextResponse.json({
        success: true,
        data: mockData,
        raw: { mock: true, source: 'error-fallback' }
      });
    }
    
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}