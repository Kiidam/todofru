import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ruc = (searchParams.get('ruc') || '').trim();
    
    if (!ruc || !/^\d{8}$|^\d{11}$/.test(ruc)) {
      return NextResponse.json(
        { success: false, error: 'Parámetro ruc inválido. Debe ser 8 o 11 dígitos.' },
        { status: 400 }
      );
    }

    const token = process.env.DECOLECTA_API_TOKEN;
    const isDev = process.env.NODE_ENV !== 'production';
    const forceMock = isDev && (searchParams.get('mock') === '1');
    const base = process.env.DECOLECTA_BASE_URL || 'https://api.decolecta.com/v1';



    // Fallback de desarrollo cuando no hay token o se fuerza mock=1
    if ((!token && isDev) || forceMock) {
      const mockIsDNI = ruc.length === 8;
      
      // Casos especiales para pruebas
      if (ruc === '20123456789') {
        return NextResponse.json({
          success: true,
          data: { 
            ruc, 
            razonSocial: 'Cliente Inactivo S.A.', 
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
        return NextResponse.json({
          success: false,
          error: 'RUC no encontrado en la base de datos'
        }, { status: 404 });
      }
      
      // Caso normal mock
      const mockRazonSocial = mockIsDNI ? 'María García López' : 'Cliente Demo S.A.';
      const mockDireccion = mockIsDNI ? 'Av. Cliente 123, Lima' : 'Calle Cliente 123, Lima';
      const mockTipoContribuyente = mockIsDNI ? 'Persona Natural (Mock)' : 'Sociedad Anónima (Mock)';
      const mockEsPersonaNatural = mockIsDNI;
      
      const mockData: any = { 
        ruc, 
        razonSocial: mockRazonSocial, 
        direccion: mockDireccion, 
        tipoContribuyente: mockTipoContribuyente, 
        esPersonaNatural: mockEsPersonaNatural 
      };
      
      if (!mockIsDNI) {
        mockData.estado = 'Activo';
        mockData.condicion = 'Habido';
        mockData.esActivo = true;
        mockData.fechaInscripcion = '2020-01-15';
        mockData.fechaInicioActividades = '2020-02-01';
      }
      
      if (mockIsDNI) {
        mockData.nombres = 'María';
        mockData.apellidos = 'García López';
      }
      
      return NextResponse.json({
        success: true,
        data: mockData,
        raw: { mock: true, source: 'dev-fallback' }
      });
    }

    // Llamada real a la API
    let url = '';
    let raw: Record<string, unknown> = {};
    
    if (ruc.length === 8) {
      // DNI via RENIEC
      url = `${base}/reniec/dni?numero=${ruc}`;
    } else {
      // RUC via SUNAT
      url = `${base}/sunat/ruc?numero=${ruc}`;
    }

    try {
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
        const msgUnknown = raw['message'] ?? raw['error'] ?? 'No se pudo consultar el documento';
        const msg = String(msgUnknown);
        return NextResponse.json(
          { success: false, error: msg, raw },
          { status: resp.status }
        );
      }
    } catch (fetchError) {
      console.error('Error making API call:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Error al conectar con la API de Decolecta' },
        { status: 500 }
      );
    }

    // Procesar respuesta
    let razonSocial = '';
    let direccion = '';
    let tipoContribuyente = '';
    let esPersonaNatural = false;

    if (ruc.length === 8) {
      // Procesar DNI
      const nombres = String(raw['first_name'] ?? raw['nombres'] ?? '');
      const apPat = String(raw['first_last_name'] ?? raw['apellido_paterno'] ?? raw['apellidoPaterno'] ?? '');
      const apMat = String(raw['second_last_name'] ?? raw['apellido_materno'] ?? raw['apellidoMaterno'] ?? '');
      razonSocial = `${nombres} ${apPat} ${apMat}`.trim().replace(/\s+/g, ' ');
      direccion = String(raw['address'] ?? raw['direccion'] ?? '');
      tipoContribuyente = 'Persona Natural (RENIEC)';
      esPersonaNatural = true;
    } else {
      // Procesar RUC
      razonSocial = String(raw['razon_social'] ?? raw['razonSocial'] ?? raw['nombre'] ?? raw['name'] ?? '');
      direccion = String(raw['direccion'] ?? raw['address'] ?? '');
      tipoContribuyente = String(raw['tipo_contribuyente'] ?? raw['tipo'] ?? '');
      esPersonaNatural = String(tipoContribuyente || '').toLowerCase().includes('persona');
    }

    const responseData: any = {
      ruc,
      razonSocial,
      direccion,
      tipoContribuyente,
      esPersonaNatural,
    };
    
    // Agregar información adicional para RUC
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
    console.error('Error en proxy RUC para clientes:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}