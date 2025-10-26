// Servicio para manejar datos de ubicación geográfica del Perú (UBIGEO)

import { Departamento, Provincia, Distrito } from '@/types/address';

// Datos básicos de departamentos del Perú
const DEPARTAMENTOS: Departamento[] = [
  { codigo: '01', nombre: 'Amazonas' },
  { codigo: '02', nombre: 'Áncash' },
  { codigo: '03', nombre: 'Apurímac' },
  { codigo: '04', nombre: 'Arequipa' },
  { codigo: '05', nombre: 'Ayacucho' },
  { codigo: '06', nombre: 'Cajamarca' },
  { codigo: '07', nombre: 'Callao' },
  { codigo: '08', nombre: 'Cusco' },
  { codigo: '09', nombre: 'Huancavelica' },
  { codigo: '10', nombre: 'Huánuco' },
  { codigo: '11', nombre: 'Ica' },
  { codigo: '12', nombre: 'Junín' },
  { codigo: '13', nombre: 'La Libertad' },
  { codigo: '14', nombre: 'Lambayeque' },
  { codigo: '15', nombre: 'Lima' },
  { codigo: '16', nombre: 'Loreto' },
  { codigo: '17', nombre: 'Madre de Dios' },
  { codigo: '18', nombre: 'Moquegua' },
  { codigo: '19', nombre: 'Pasco' },
  { codigo: '20', nombre: 'Piura' },
  { codigo: '21', nombre: 'Puno' },
  { codigo: '22', nombre: 'San Martín' },
  { codigo: '23', nombre: 'Tacna' },
  { codigo: '24', nombre: 'Tumbes' },
  { codigo: '25', nombre: 'Ucayali' },
];

// Provincias principales (se puede expandir según necesidad)
const PROVINCIAS_PRINCIPALES: { [key: string]: Provincia[] } = {
  '15': [ // Lima
    { codigo: '1501', nombre: 'Lima', departamento_codigo: '15' },
    { codigo: '1502', nombre: 'Barranca', departamento_codigo: '15' },
    { codigo: '1503', nombre: 'Cajatambo', departamento_codigo: '15' },
    { codigo: '1504', nombre: 'Canta', departamento_codigo: '15' },
    { codigo: '1505', nombre: 'Cañete', departamento_codigo: '15' },
    { codigo: '1506', nombre: 'Huaral', departamento_codigo: '15' },
    { codigo: '1507', nombre: 'Huarochirí', departamento_codigo: '15' },
    { codigo: '1508', nombre: 'Huaura', departamento_codigo: '15' },
    { codigo: '1509', nombre: 'Oyón', departamento_codigo: '15' },
    { codigo: '1510', nombre: 'Yauyos', departamento_codigo: '15' },
  ],
  '07': [ // Callao
    { codigo: '0701', nombre: 'Callao', departamento_codigo: '07' },
  ],
  '04': [ // Arequipa
    { codigo: '0401', nombre: 'Arequipa', departamento_codigo: '04' },
    { codigo: '0402', nombre: 'Camaná', departamento_codigo: '04' },
    { codigo: '0403', nombre: 'Caravelí', departamento_codigo: '04' },
    { codigo: '0404', nombre: 'Castilla', departamento_codigo: '04' },
    { codigo: '0405', nombre: 'Caylloma', departamento_codigo: '04' },
    { codigo: '0406', nombre: 'Condesuyos', departamento_codigo: '04' },
    { codigo: '0407', nombre: 'Islay', departamento_codigo: '04' },
    { codigo: '0408', nombre: 'La Unión', departamento_codigo: '04' },
  ],
};

// Distritos principales de Lima
const DISTRITOS_LIMA: { [key: string]: Distrito[] } = {
  '1501': [ // Provincia de Lima
    { codigo: '150101', nombre: 'Lima', provincia_codigo: '1501', departamento_codigo: '15' },
    { codigo: '150102', nombre: 'Ancón', provincia_codigo: '1501', departamento_codigo: '15' },
    { codigo: '150103', nombre: 'Ate', provincia_codigo: '1501', departamento_codigo: '15' },
    { codigo: '150104', nombre: 'Barranco', provincia_codigo: '1501', departamento_codigo: '15' },
    { codigo: '150105', nombre: 'Breña', provincia_codigo: '1501', departamento_codigo: '15' },
    { codigo: '150106', nombre: 'Carabayllo', provincia_codigo: '1501', departamento_codigo: '15' },
    { codigo: '150107', nombre: 'Chaclacayo', provincia_codigo: '1501', departamento_codigo: '15' },
    { codigo: '150108', nombre: 'Chorrillos', provincia_codigo: '1501', departamento_codigo: '15' },
    { codigo: '150109', nombre: 'Cieneguilla', provincia_codigo: '1501', departamento_codigo: '15' },
    { codigo: '150110', nombre: 'Comas', provincia_codigo: '1501', departamento_codigo: '15' },
    { codigo: '150111', nombre: 'El Agustino', provincia_codigo: '1501', departamento_codigo: '15' },
    { codigo: '150112', nombre: 'Independencia', provincia_codigo: '1501', departamento_codigo: '15' },
    { codigo: '150113', nombre: 'Jesús María', provincia_codigo: '1501', departamento_codigo: '15' },
    { codigo: '150114', nombre: 'La Molina', provincia_codigo: '1501', departamento_codigo: '15' },
    { codigo: '150115', nombre: 'La Victoria', provincia_codigo: '1501', departamento_codigo: '15' },
    { codigo: '150116', nombre: 'Lince', provincia_codigo: '1501', departamento_codigo: '15' },
    { codigo: '150117', nombre: 'Los Olivos', provincia_codigo: '1501', departamento_codigo: '15' },
    { codigo: '150118', nombre: 'Lurigancho', provincia_codigo: '1501', departamento_codigo: '15' },
    { codigo: '150119', nombre: 'Lurin', provincia_codigo: '1501', departamento_codigo: '15' },
    { codigo: '150120', nombre: 'Magdalena del Mar', provincia_codigo: '1501', departamento_codigo: '15' },
    { codigo: '150121', nombre: 'Pueblo Libre', provincia_codigo: '1501', departamento_codigo: '15' },
    { codigo: '150122', nombre: 'Miraflores', provincia_codigo: '1501', departamento_codigo: '15' },
    { codigo: '150123', nombre: 'Pachacamac', provincia_codigo: '1501', departamento_codigo: '15' },
    { codigo: '150124', nombre: 'Pucusana', provincia_codigo: '1501', departamento_codigo: '15' },
    { codigo: '150125', nombre: 'Puente Piedra', provincia_codigo: '1501', departamento_codigo: '15' },
    { codigo: '150126', nombre: 'Punta Hermosa', provincia_codigo: '1501', departamento_codigo: '15' },
    { codigo: '150127', nombre: 'Punta Negra', provincia_codigo: '1501', departamento_codigo: '15' },
    { codigo: '150128', nombre: 'Rímac', provincia_codigo: '1501', departamento_codigo: '15' },
    { codigo: '150129', nombre: 'San Bartolo', provincia_codigo: '1501', departamento_codigo: '15' },
    { codigo: '150130', nombre: 'San Borja', provincia_codigo: '1501', departamento_codigo: '15' },
    { codigo: '150131', nombre: 'San Isidro', provincia_codigo: '1501', departamento_codigo: '15' },
    { codigo: '150132', nombre: 'San Juan de Lurigancho', provincia_codigo: '1501', departamento_codigo: '15' },
    { codigo: '150133', nombre: 'San Juan de Miraflores', provincia_codigo: '1501', departamento_codigo: '15' },
    { codigo: '150134', nombre: 'San Luis', provincia_codigo: '1501', departamento_codigo: '15' },
    { codigo: '150135', nombre: 'San Martín de Porres', provincia_codigo: '1501', departamento_codigo: '15' },
    { codigo: '150136', nombre: 'San Miguel', provincia_codigo: '1501', departamento_codigo: '15' },
    { codigo: '150137', nombre: 'Santa Anita', provincia_codigo: '1501', departamento_codigo: '15' },
    { codigo: '150138', nombre: 'Santa María del Mar', provincia_codigo: '1501', departamento_codigo: '15' },
    { codigo: '150139', nombre: 'Santa Rosa', provincia_codigo: '1501', departamento_codigo: '15' },
    { codigo: '150140', nombre: 'Santiago de Surco', provincia_codigo: '1501', departamento_codigo: '15' },
    { codigo: '150141', nombre: 'Surquillo', provincia_codigo: '1501', departamento_codigo: '15' },
    { codigo: '150142', nombre: 'Villa El Salvador', provincia_codigo: '1501', departamento_codigo: '15' },
    { codigo: '150143', nombre: 'Villa María del Triunfo', provincia_codigo: '1501', departamento_codigo: '15' },
  ],
  '0701': [ // Callao
    { codigo: '070101', nombre: 'Callao', provincia_codigo: '0701', departamento_codigo: '07' },
    { codigo: '070102', nombre: 'Bellavista', provincia_codigo: '0701', departamento_codigo: '07' },
    { codigo: '070103', nombre: 'Carmen de la Legua Reynoso', provincia_codigo: '0701', departamento_codigo: '07' },
    { codigo: '070104', nombre: 'La Perla', provincia_codigo: '0701', departamento_codigo: '07' },
    { codigo: '070105', nombre: 'La Punta', provincia_codigo: '0701', departamento_codigo: '07' },
    { codigo: '070106', nombre: 'Ventanilla', provincia_codigo: '0701', departamento_codigo: '07' },
    { codigo: '070107', nombre: 'Mi Perú', provincia_codigo: '0701', departamento_codigo: '07' },
  ],
};

export class UbigeoService {
  static obtenerDepartamentos(): Departamento[] {
    return DEPARTAMENTOS;
  }

  static obtenerProvinciasPorDepartamento(codigoDepartamento: string): Provincia[] {
    return PROVINCIAS_PRINCIPALES[codigoDepartamento] || [];
  }

  static obtenerDistritosPorProvincia(codigoProvincia: string): Distrito[] {
    return DISTRITOS_LIMA[codigoProvincia] || [];
  }

  static buscarDepartamento(codigo: string): Departamento | undefined {
    return DEPARTAMENTOS.find(dep => dep.codigo === codigo);
  }

  static buscarProvincia(codigo: string): Provincia | undefined {
    for (const provincias of Object.values(PROVINCIAS_PRINCIPALES)) {
      const provincia = provincias.find(prov => prov.codigo === codigo);
      if (provincia) return provincia;
    }
    return undefined;
  }

  static buscarDistrito(codigo: string): Distrito | undefined {
    for (const distritos of Object.values(DISTRITOS_LIMA)) {
      const distrito = distritos.find(dist => dist.codigo === codigo);
      if (distrito) return distrito;
    }
    return undefined;
  }

  static filtrarDepartamentos(termino: string): Departamento[] {
    const terminoLower = termino.toLowerCase();
    return DEPARTAMENTOS.filter(dep => 
      dep.nombre.toLowerCase().includes(terminoLower)
    );
  }

  static filtrarProvincias(codigoDepartamento: string, termino: string): Provincia[] {
    const provincias = this.obtenerProvinciasPorDepartamento(codigoDepartamento);
    const terminoLower = termino.toLowerCase();
    return provincias.filter(prov => 
      prov.nombre.toLowerCase().includes(terminoLower)
    );
  }

  static filtrarDistritos(codigoProvincia: string, termino: string): Distrito[] {
    const distritos = this.obtenerDistritosPorProvincia(codigoProvincia);
    const terminoLower = termino.toLowerCase();
    return distritos.filter(dist => 
      dist.nombre.toLowerCase().includes(terminoLower)
    );
  }

  // Método para parsear dirección de la API y extraer ubicación si es posible
  static parsearDireccionAPI(direccionCompleta: string): {
    direccion_especifica: string;
    posible_distrito?: string;
    posible_provincia?: string;
  } {
    if (!direccionCompleta) {
      return { direccion_especifica: '' };
    }

    // Buscar patrones comunes en direcciones peruanas
    const patrones = {
      distrito: /(?:distrito|dist\.?)\s+([^,]+)/i,
      provincia: /(?:provincia|prov\.?)\s+([^,]+)/i,
      lima: /lima/i,
      callao: /callao/i,
    };

    let direccion_especifica = direccionCompleta;
    let posible_distrito: string | undefined;
    let posible_provincia: string | undefined;

    // Intentar extraer distrito
    const matchDistrito = direccionCompleta.match(patrones.distrito);
    if (matchDistrito) {
      posible_distrito = matchDistrito[1].trim();
      direccion_especifica = direccionCompleta.replace(matchDistrito[0], '').trim();
    }

    // Intentar extraer provincia
    const matchProvincia = direccionCompleta.match(patrones.provincia);
    if (matchProvincia) {
      posible_provincia = matchProvincia[1].trim();
      direccion_especifica = direccion_especifica.replace(matchProvincia[0], '').trim();
    }

    // Detectar Lima o Callao en la dirección
    if (patrones.lima.test(direccionCompleta)) {
      posible_provincia = posible_provincia || 'Lima';
    }
    if (patrones.callao.test(direccionCompleta)) {
      posible_provincia = posible_provincia || 'Callao';
    }

    return {
      direccion_especifica: direccion_especifica.replace(/,\s*$/, '').trim(),
      posible_distrito,
      posible_provincia,
    };
  }
}