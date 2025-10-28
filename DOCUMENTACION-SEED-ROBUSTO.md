# Documentación del Sistema de Generación de Datos Robusto

## Resumen Ejecutivo

Se ha desarrollado un sistema robusto de generación de datos (`seed-robusto-v2.js`) que resuelve completamente el problema de la clave primaria compuesta en el modelo `MovimientoInventario` y proporciona una solución confiable para la inicialización de datos del sistema TODAFRU.

## Problema Original

El sistema original tenía un problema crítico con la clave primaria compuesta `@@id([productoId, createdAt])` en el modelo `MovimientoInventario`, que causaba errores de validación y impedía la creación correcta de movimientos de inventario.

### Errores Identificados:
- `PrismaClientUnknownRequestError`: Query no encontraba registros en operaciones `upsert`
- Conflictos de timestamp en la clave primaria compuesta
- Validaciones de campos faltantes en el modelo `Producto`

## Solución Implementada

### 1. Script Robusto de Generación de Datos

**Archivo:** `scripts/seed-robusto-v2.js`

**Características principales:**
- Sistema de logging detallado con timestamps
- Manejo robusto de errores con reintentos automáticos
- Validaciones de integridad de datos
- Generación de timestamps únicos para evitar conflictos
- Uso de `createMany` para operaciones batch eficientes

### 2. Estructura de Datos Generados

El script genera los siguientes datos de prueba:

#### Usuarios (3 registros)
- Admin principal del sistema
- Usuario de compras
- Usuario de ventas

#### Categorías (8 registros)
- Frutas Frescas
- Verduras de Hoja
- Tubérculos
- Cítricos
- Frutas Tropicales
- Verduras de Raíz
- Hierbas Aromáticas
- Frutos Secos

#### Unidades de Medida (8 registros)
- Kilogramo (kg)
- Gramo (g)
- Unidad (und)
- Caja (caja)
- Saco (saco)
- Bandeja (bandeja)
- Atado (atado)
- Docena (doc)

#### Proveedores (3 registros)
- Distribuidora Tropical
- Frutas del Valle S.A.C.
- Verduras Frescas EIRL

#### Clientes (3 registros)
- María González (persona natural)
- Restaurant El Buen Sabor
- Supermercado Fresh Market

#### Productos (5 registros)
- Naranja Valencia
- Lechuga Americana
- Papa Blanca
- Manzana Red Delicious
- Piña Golden

#### Movimientos de Inventario (8 registros)
- 5 movimientos de ENTRADA (stock inicial)
- 3 movimientos de SALIDA (simulación de ventas)

### 3. Soluciones Técnicas Implementadas

#### A. Manejo de Clave Primaria Compuesta
```javascript
// Solución: Timestamps únicos con separación de 1 segundo
const timestamp = new Date(Date.now() + (i * 1000));

// Uso de createMany en lugar de upsert individual
const resultado = await prisma.movimientoInventario.createMany({
  data: movimientosData,
  skipDuplicates: true
});
```

#### B. Sistema de Reintentos
```javascript
async function retryOperation(operation, description, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await delay(1000 * attempt);
    }
  }
}
```

#### C. Validaciones de Campos
- Corrección de `precioVenta` → `precio` en modelo Producto
- Adición de campos requeridos: `sku`, `perecedero`, `diasVencimiento`
- Inclusión de campos obligatorios en MovimientoInventario: `cantidadAnterior`, `cantidadNueva`

## Guía de Uso

### Requisitos Previos
1. Base de datos MySQL configurada
2. Prisma Client instalado y configurado
3. Variables de entorno configuradas en `.env`

### Ejecución del Script

#### Opción 1: Ejecución Directa
```bash
node scripts/seed-robusto-v2.js
```

#### Opción 2: Con Reset de Base de Datos
```bash
# Limpiar base de datos
npx prisma db push --force-reset

# Ejecutar seed robusto
node scripts/seed-robusto-v2.js
```

### Verificación de Datos
```bash
# Verificar datos generados
node scripts/verificar-datos.js

# Abrir Prisma Studio para inspección visual
npx prisma studio --browser none
```

## Resultados Esperados

### Salida Exitosa del Script
```
🎉 SEED COMPLETADO EXITOSAMENTE
============================================================
✅ Usuarios creados: 3
✅ Categorías creadas: 8
✅ Unidades de medida creadas: 8
✅ Proveedores creados: 3
✅ Clientes creados: 3
✅ Productos creados: 5
✅ Movimientos de inventario creados: 8
✅ Tiempo total: ~4-5 segundos
```

### Verificación de Integridad
- Todas las relaciones entre entidades funcionan correctamente
- Los movimientos de inventario se crean sin errores
- Las claves primarias compuestas funcionan adecuadamente
- No hay datos duplicados o inconsistentes

## Archivos Relacionados

### Scripts Principales
- `scripts/seed-robusto-v2.js` - Script principal de generación de datos
- `scripts/verificar-datos.js` - Script de verificación y validación

### Archivos de Configuración
- `prisma/schema.prisma` - Esquema de base de datos
- `.env` - Variables de entorno

### Documentación
- `DOCUMENTACION-SEED-ROBUSTO.md` - Este documento
- Logs del sistema en consola durante ejecución

## Mantenimiento y Actualizaciones

### Para Agregar Nuevos Datos
1. Modificar las constantes de datos en `seed-robusto-v2.js`
2. Asegurar que los timestamps sean únicos
3. Validar relaciones entre entidades
4. Probar con `verificar-datos.js`

### Para Modificar Estructura
1. Actualizar `prisma/schema.prisma`
2. Ejecutar `npx prisma db push`
3. Actualizar script de seed según nuevos campos
4. Probar generación completa

## Troubleshooting

### Error: "Query createOneMovimientoInventario is required to return data"
**Solución:** Verificar que todos los campos requeridos estén incluidos y que los timestamps sean únicos.

### Error: "Unique constraint failed"
**Solución:** Limpiar base de datos con `npx prisma db push --force-reset` antes de ejecutar el seed.

### Error: "Invalid argument"
**Solución:** Verificar que los nombres de campos coincidan exactamente con el esquema de Prisma.

## Conclusiones

El sistema de generación de datos robusto proporciona:
- ✅ Solución completa al problema de clave primaria compuesta
- ✅ Generación confiable y reproducible de datos de prueba
- ✅ Manejo robusto de errores y validaciones
- ✅ Documentación completa para mantenimiento futuro
- ✅ Verificación automática de integridad de datos

Este sistema garantiza que el entorno de desarrollo y pruebas del sistema TODAFRU tenga datos consistentes y confiables para todas las funcionalidades.