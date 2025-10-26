'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, MapPin, Check, AlertCircle, Loader2 } from 'lucide-react';
import { 
  DireccionCompleta, 
  Departamento, 
  Provincia, 
  Distrito, 
  EstadoCarga,
  ValidacionDireccion 
} from '../../types/address';
import { UbigeoService } from '../../services/ubigeo';
import { ValidacionesService } from '../../services/validaciones';

interface AddressAutocompleteProps {
  valor_inicial?: DireccionCompleta;
  en_cambio: (direccion: DireccionCompleta) => void;
  validacion?: ValidacionDireccion;
  deshabilitado?: boolean;
  ruc_dni?: string;
  tipo_entidad: 'persona_natural' | 'persona_juridica';
  onConsultarAPI?: (ruc_dni: string) => Promise<any>;
}

export default function AddressAutocomplete({
  valor_inicial,
  en_cambio,
  validacion,
  deshabilitado = false,
  ruc_dni,
  tipo_entidad,
  onConsultarAPI
}: AddressAutocompleteProps) {
  const [direccion, setDireccion] = useState<DireccionCompleta>(
    valor_inicial || {
      direccion_especifica: '',
      es_autocompletado: false,
      validado: false
    }
  );

  const [estadoCarga, setEstadoCarga] = useState<EstadoCarga>({
    consultando_api: false,
    datos_encontrados: false
  });

  const [departamentos] = useState<Departamento[]>(UbigeoService.obtenerDepartamentos());
  const [provincias, setProvincias] = useState<Provincia[]>([]);
  const [distritos, setDistritos] = useState<Distrito[]>([]);
  
  // Ref para evitar bucles infinitos en notificaciones al padre
  const lastNotifiedDireccion = useRef<DireccionCompleta | null>(null);

  const [busquedas, setBusquedas] = useState({
    departamento: '',
    provincia: '',
    distrito: ''
  });

  const [mostrarDropdowns, setMostrarDropdowns] = useState({
    departamento: false,
    provincia: false,
    distrito: false
  });

  // Actualizar provincias cuando cambia el departamento
  useEffect(() => {
    if (direccion.departamento) {
      const nuevasProvincias = UbigeoService.obtenerProvinciasPorDepartamento(direccion.departamento.codigo);
      setProvincias(nuevasProvincias);
      
      // Limpiar provincia y distrito si no son válidos para el nuevo departamento
      if (direccion.provincia && !nuevasProvincias.find(p => p.codigo === direccion.provincia?.codigo)) {
        setDireccion(prev => ({
          ...prev,
          provincia: undefined,
          distrito: undefined
        }));
      }
    } else {
      setProvincias([]);
      setDistritos([]);
    }
  }, [direccion.departamento]);

  // Actualizar distritos cuando cambia la provincia
  useEffect(() => {
    if (direccion.provincia) {
      const nuevosDistritos = UbigeoService.obtenerDistritosPorProvincia(direccion.provincia.codigo);
      setDistritos(nuevosDistritos);
      
      // Limpiar distrito si no es válido para la nueva provincia
      if (direccion.distrito && !nuevosDistritos.find(d => d.codigo === direccion.distrito?.codigo)) {
        setDireccion(prev => ({
          ...prev,
          distrito: undefined
        }));
      }
    } else {
      setDistritos([]);
    }
  }, [direccion.provincia]);

  // Notificar cambios al componente padre (evitando bucles infinitos)
  useEffect(() => {
    // Solo notificar si la dirección realmente cambió
    if (JSON.stringify(direccion) !== JSON.stringify(lastNotifiedDireccion.current)) {
      lastNotifiedDireccion.current = direccion;
      en_cambio(direccion);
    }
  }, [direccion, en_cambio]);

  // Consultar API automáticamente cuando hay RUC/DNI válido
  const consultarAPI = useCallback(async () => {
    if (!ruc_dni || !onConsultarAPI) return;

    setEstadoCarga({
      consultando_api: true,
      datos_encontrados: false,
      mensaje_estado: 'Consultando datos...'
    });

    try {
      const respuesta = await onConsultarAPI(ruc_dni);
      
      if (respuesta.success && respuesta.direccion) {
        const direccionParseada = UbigeoService.parsearDireccionAPI(respuesta.direccion);
        
        // Intentar encontrar ubicaciones coincidentes
        let departamento: Departamento | undefined;
        let provincia: Provincia | undefined;
        let distrito: Distrito | undefined;

        if (direccionParseada.posible_provincia) {
          // Buscar provincia por nombre
          const provinciasEncontradas = departamentos.flatMap(dep => 
            UbigeoService.obtenerProvinciasPorDepartamento(dep.codigo)
          );
          provincia = provinciasEncontradas.find(p => 
            p.nombre.toLowerCase().includes(direccionParseada.posible_provincia!.toLowerCase())
          );
          
          if (provincia) {
            departamento = departamentos.find(d => d.codigo === provincia!.departamento_codigo);
          }
        }

        if (provincia && direccionParseada.posible_distrito) {
          const distritosDisponibles = UbigeoService.obtenerDistritosPorProvincia(provincia.codigo);
          distrito = distritosDisponibles.find(d => 
            d.nombre.toLowerCase().includes(direccionParseada.posible_distrito!.toLowerCase())
          );
        }

        const nuevaDireccion: DireccionCompleta = {
          departamento,
          provincia,
          distrito,
          direccion_especifica: direccionParseada.direccion_especifica,
          es_autocompletado: true,
          fuente_datos: respuesta.esPersonaNatural ? 'RENIEC' : 'SUNAT',
          validado: true
        };

        setDireccion(nuevaDireccion);
        setEstadoCarga({
          consultando_api: false,
          datos_encontrados: true,
          mensaje_estado: 'Datos cargados automáticamente'
        });
      } else {
        setEstadoCarga({
          consultando_api: false,
          datos_encontrados: false,
          error_api: respuesta.error || 'No se encontraron datos',
          mensaje_estado: 'No se pudieron cargar los datos automáticamente'
        });
      }
    } catch (error) {
      setEstadoCarga({
        consultando_api: false,
        datos_encontrados: false,
        error_api: 'Error de conexión',
        mensaje_estado: 'Error al consultar la API'
      });
    }
  }, [ruc_dni, onConsultarAPI, departamentos]);

  // Ejecutar consulta automática cuando cambia el RUC/DNI
  useEffect(() => {
    if (ruc_dni && ruc_dni.length >= 8) {
      consultarAPI();
    }
  }, [ruc_dni, consultarAPI]);

  // Validar dirección en tiempo real
  useEffect(() => {
    if (direccion.direccion_especifica) {
      const validacionDireccion = ValidacionesService.validarDireccionCompleta(direccion);
      const validacionFisica = ValidacionesService.validarDireccionFisica(direccion.direccion_especifica);
      
      // Actualizar validación con los resultados
      const nuevaValidacion: ValidacionDireccion = {
        ruc_dni_valido: validacion?.ruc_dni_valido || false,
        direccion_completa: validacionDireccion.direccion_completa && validacionFisica.valida,
        ubicacion_valida: validacionDireccion.ubicacion_valida,
        errores: [
          ...validacionDireccion.errores,
          ...(validacionFisica.valida ? [] : [{ campo: 'direccion_especifica', mensaje: validacionFisica.mensaje || 'Dirección inválida' }])
        ]
      };
      
      // Solo actualizar si hay cambios
      if (JSON.stringify(nuevaValidacion) !== JSON.stringify(validacion)) {
        // Notificar al componente padre sobre la validación actualizada
        en_cambio({
          ...direccion,
          validado: nuevaValidacion.direccion_completa && nuevaValidacion.ubicacion_valida
        });
      }
    }
  }, [direccion.direccion_especifica, direccion.departamento, direccion.provincia, direccion.distrito]);

  const actualizarDireccion = (campo: keyof DireccionCompleta, valor: any) => {
    setDireccion(prev => ({
      ...prev,
      [campo]: valor,
      validado: false // Revalidar cuando se hacen cambios manuales
    }));
  };

  const departamentosFiltrados = busquedas.departamento 
    ? UbigeoService.filtrarDepartamentos(busquedas.departamento)
    : departamentos;

  const provinciasFiltradas = busquedas.provincia && direccion.departamento
    ? UbigeoService.filtrarProvincias(direccion.departamento.codigo, busquedas.provincia)
    : provincias;

  const distritosFiltrados = busquedas.distrito && direccion.provincia
    ? UbigeoService.filtrarDistritos(direccion.provincia.codigo, busquedas.distrito)
    : distritos;

  const obtenerIconoEstado = () => {
    if (estadoCarga.consultando_api) return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
    if (direccion.es_autocompletado) return <Check className="w-4 h-4 text-green-500" />;
    if (estadoCarga.error_api) return <AlertCircle className="w-4 h-4 text-red-500" />;
    return <MapPin className="w-4 h-4 text-gray-400" />;
  };

  const obtenerClaseInput = (tieneError: boolean = false) => {
    let clases = "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ";
    
    if (deshabilitado) {
      clases += "bg-gray-100 text-gray-500 cursor-not-allowed ";
    } else if (tieneError) {
      clases += "border-red-300 focus:ring-red-500 focus:border-red-500 ";
    } else if (direccion.es_autocompletado) {
      clases += "border-green-300 bg-green-50 focus:ring-green-500 focus:border-green-500 ";
    } else {
      clases += "border-gray-300 focus:ring-blue-500 focus:border-blue-500 ";
    }
    
    return clases;
  };

  return (
    <div className="space-y-4">
      {/* Header con estado */}
      <div className="flex items-center space-x-2">
        {obtenerIconoEstado()}
        <span className="text-sm font-medium text-gray-700">
          Dirección {direccion.es_autocompletado ? '(Autocompletada)' : ''}
        </span>
      </div>

      {/* Mensaje de estado */}
      {estadoCarga.mensaje_estado && (
        <div className={`p-3 rounded-md text-sm ${
          estadoCarga.error_api 
            ? 'bg-red-50 text-red-700 border border-red-200'
            : estadoCarga.datos_encontrados
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-blue-50 text-blue-700 border border-blue-200'
        }`}>
          {estadoCarga.mensaje_estado}
        </div>
      )}

      {/* Campos de ubicación jerárquica */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Departamento */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Departamento
          </label>
          <div className="relative">
            <input
              type="text"
              value={direccion.departamento?.nombre || busquedas.departamento}
              onChange={(e) => {
                setBusquedas(prev => ({ ...prev, departamento: e.target.value }));
                setMostrarDropdowns(prev => ({ ...prev, departamento: true }));
                if (!e.target.value) {
                  actualizarDireccion('departamento', undefined);
                }
              }}
              onFocus={() => setMostrarDropdowns(prev => ({ ...prev, departamento: true }))}
              onBlur={() => setTimeout(() => setMostrarDropdowns(prev => ({ ...prev, departamento: false })), 200)}
              placeholder="Buscar departamento..."
              disabled={deshabilitado}
              className={obtenerClaseInput(validacion?.errores.some(e => e.campo === 'departamento'))}
            />
            <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
            
            {validacion?.errores.filter(e => e.campo === 'departamento').map((error, index) => (
              <p key={index} className="mt-1 text-sm text-red-600">
                {error.mensaje}
              </p>
            ))}
            {mostrarDropdowns.departamento && departamentosFiltrados.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                {departamentosFiltrados.map((dep) => (
                  <button
                    key={dep.codigo}
                    type="button"
                    onClick={() => {
                      actualizarDireccion('departamento', dep);
                      setBusquedas(prev => ({ ...prev, departamento: '' }));
                      setMostrarDropdowns(prev => ({ ...prev, departamento: false }));
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                  >
                    {dep.nombre}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Provincia */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Provincia
          </label>
          <div className="relative">
            <input
              type="text"
              value={direccion.provincia?.nombre || busquedas.provincia}
              onChange={(e) => {
                setBusquedas(prev => ({ ...prev, provincia: e.target.value }));
                setMostrarDropdowns(prev => ({ ...prev, provincia: true }));
                if (!e.target.value) {
                  actualizarDireccion('provincia', undefined);
                }
              }}
              onFocus={() => setMostrarDropdowns(prev => ({ ...prev, provincia: true }))}
              onBlur={() => setTimeout(() => setMostrarDropdowns(prev => ({ ...prev, provincia: false })), 200)}
              placeholder="Buscar provincia..."
              disabled={deshabilitado || !direccion.departamento}
              className={obtenerClaseInput(validacion?.errores.some(e => e.campo === 'provincia'))}
            />
            <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
            
            {validacion?.errores.filter(e => e.campo === 'provincia').map((error, index) => (
              <p key={index} className="mt-1 text-sm text-red-600">
                {error.mensaje}
              </p>
            ))}
            {mostrarDropdowns.provincia && provinciasFiltradas.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                {provinciasFiltradas.map((prov) => (
                  <button
                    key={prov.codigo}
                    type="button"
                    onClick={() => {
                      actualizarDireccion('provincia', prov);
                      setBusquedas(prev => ({ ...prev, provincia: '' }));
                      setMostrarDropdowns(prev => ({ ...prev, provincia: false }));
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                  >
                    {prov.nombre}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Distrito */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Distrito
          </label>
          <div className="relative">
            <input
              type="text"
              value={direccion.distrito?.nombre || busquedas.distrito}
              onChange={(e) => {
                setBusquedas(prev => ({ ...prev, distrito: e.target.value }));
                setMostrarDropdowns(prev => ({ ...prev, distrito: true }));
                if (!e.target.value) {
                  actualizarDireccion('distrito', undefined);
                }
              }}
              onFocus={() => setMostrarDropdowns(prev => ({ ...prev, distrito: true }))}
              onBlur={() => setTimeout(() => setMostrarDropdowns(prev => ({ ...prev, distrito: false })), 200)}
              placeholder="Buscar distrito..."
              disabled={deshabilitado || !direccion.provincia}
              className={obtenerClaseInput(validacion?.errores.some(e => e.campo === 'distrito'))}
            />
            <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
            
            {validacion?.errores.filter(e => e.campo === 'distrito').map((error, index) => (
              <p key={index} className="mt-1 text-sm text-red-600">
                {error.mensaje}
              </p>
            ))}
            {mostrarDropdowns.distrito && distritosFiltrados.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                {distritosFiltrados.map((dist) => (
                  <button
                    key={dist.codigo}
                    type="button"
                    onClick={() => {
                      actualizarDireccion('distrito', dist);
                      setBusquedas(prev => ({ ...prev, distrito: '' }));
                      setMostrarDropdowns(prev => ({ ...prev, distrito: false }));
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                  >
                    {dist.nombre}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dirección específica */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Dirección específica *
        </label>
        <textarea
          value={direccion.direccion_especifica}
          onChange={(e) => actualizarDireccion('direccion_especifica', e.target.value)}
          placeholder="Ej: Av. Javier Prado Este 123, Urb. Los Jardines, Mz. A Lt. 5"
          disabled={deshabilitado}
          rows={3}
          className={obtenerClaseInput(validacion?.errores.some(e => e.campo === 'direccion_especifica'))}
        />
        {validacion?.errores.filter(e => e.campo === 'direccion_especifica').map((error, index) => (
          <p key={index} className="mt-1 text-sm text-red-600">
            {error.mensaje}
          </p>
        ))}
      </div>

      {/* Referencia */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Referencia (opcional)
        </label>
        <input
          type="text"
          value={direccion.referencia || ''}
          onChange={(e) => actualizarDireccion('referencia', e.target.value)}
          placeholder="Ej: Frente al parque, cerca del mercado"
          disabled={deshabilitado}
          className={obtenerClaseInput()}
        />
      </div>

      {/* Errores de validación */}
      {validacion?.errores && validacion.errores.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <div className="flex items-center space-x-2 mb-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium text-red-700">Errores de validación:</span>
          </div>
          <ul className="text-sm text-red-600 space-y-1">
            {validacion.errores.map((error, index) => (
              <li key={index}>• {error.mensaje}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}