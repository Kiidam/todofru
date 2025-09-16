# Sistema de Sincronización Productos-Inventario TODAFRU

## Descripción General

El sistema TODAFRU implementa una sincronización completa entre el módulo de **Productos** y el módulo de **Inventario** para garantizar la consistencia de datos y evitar productos "fantasma" o inconsistencias entre ambos módulos.

## Principios Fundamentales

### 1. Fuente Única de Productos
- El **catálogo de productos** es la única fuente válida de productos en el sistema
- Solo los productos activos en el catálogo pueden tener movimientos de inventario
- No se permiten productos en inventario que no existan en el catálogo

### 2. Sincronización Automática
- Al crear un producto en el catálogo, automáticamente está disponible para inventario (con stock 0)
- Los productos inactivos no pueden tener nuevos movimientos de inventario
- Las eliminaciones de productos se validan contra movimientos existentes

### 3. Validaciones Estrictas
- Todo movimiento de inventario valida que el producto exista y esté activo
- No se permiten operaciones con productos "fantasma"
- Se previenen inconsistencias antes de que ocurran

## Arquitectura del Sistema

### Archivo Principal: `src/lib/producto-inventario-sync.ts`

Este archivo contiene todas las funciones de sincronización:

#### Funciones de Validación
```typescript
validateProductoInventarioSync(): Promise<SyncValidationResult>
```
- Valida la consistencia completa entre productos e inventario
- Identifica productos huérfanos y productos sin movimientos
- Retorna un reporte detallado de inconsistencias

```typescript
validateProductoParaMovimiento(productoId: string)
```
- Valida si un producto específico puede tener movimientos
- Verifica existencia y estado activo
- Usada antes de cada movimiento de inventario

#### Funciones de Obtención de Datos
```typescript
getProductosParaInventario(): Promise<ProductoInventarioSync[]>
```
- Obtiene solo productos válidos para inventario
- Filtra automáticamente productos inactivos
- Formato estandardizado para interfaces

#### Funciones de Migración y Limpieza
```typescript
migrarProductosHuerfanos()
```
- Crea entradas en catálogo para productos huérfanos en inventario
- Migración segura con productos marcados como inactivos para revisión

```typescript
limpiarProductosHuerfanos()
```
- **⚠️ PELIGROSO**: Elimina movimientos de productos huérfanos
- Solo usar después de análisis exhaustivo

#### Hooks de Sincronización
```typescript
ProductoInventarioHooks.beforeDeleteProducto(productoId)
```
- Valida si un producto puede ser eliminado
- Previene eliminación si tiene movimientos asociados

## Endpoints API

### `/api/productos/sync-validation`

#### GET - Validar Sincronización
```bash
GET /api/productos/sync-validation
```

Retorna un reporte completo de la sincronización:
```json
{
  "success": true,
  "data": {
    "isValid": false,
    "errors": ["Encontrados 3 productos en inventario sin referencia en catálogo"],
    "warnings": ["5 productos en catálogo sin movimientos"],
    "orphanedInventory": ["prod-id-1", "prod-id-2"],
    "missingInventory": ["prod-id-3", "prod-id-4"]
  }
}
```

#### POST - Ejecutar Acciones de Sincronización
```bash
POST /api/productos/sync-validation
Content-Type: application/json

{
  "action": "migrate" | "clean"
}
```

### `/api/movimientos-inventario` (Modificado)

Ahora incluye validación automática:
- Valida producto antes de crear movimiento
- Retorna errores específicos de sincronización
- Campo `syncError: true` en respuestas de error de sincronización

## Interfaz de Usuario

### Módulo de Productos
- **Eliminación Protegida**: Muestra advertencia si el producto tiene movimientos
- **Validación en Tiempo Real**: Previene eliminaciones problemáticas

### Módulo de Inventario
- **Panel de Advertencias**: Muestra problemas de sincronización detectados
- **Lista Filtrada**: Solo muestra productos válidos del catálogo
- **Reportes Detallados**: Información completa sobre inconsistencias

## Casos de Uso y Flujos

### 1. Creación de Producto Nuevo
```
Usuario crea producto → Producto activo en catálogo → Disponible para inventario
```

### 2. Movimiento de Inventario
```
Usuario intenta movimiento → Validación de producto → Movimiento permitido/rechazado
```

### 3. Eliminación de Producto
```
Usuario intenta eliminar → Validación de movimientos → Eliminación permitida/bloqueada
```

### 4. Detección de Inconsistencias
```
Sistema detecta problemas → Muestra advertencias → Ofrece acciones correctivas
```

## Casos de Error y Soluciones

### Error: "Producto no válido para movimiento"
**Causa**: Intentar mover un producto inactivo o inexistente
**Solución**: 
1. Verificar que el producto exista en el catálogo
2. Activar el producto si está inactivo
3. Crear el producto en el catálogo si no existe

### Error: "Problemas de Sincronización Detectados"
**Causa**: Productos huérfanos en inventario
**Soluciones**:
1. **Migrar**: Crear entradas en catálogo para productos huérfanos
2. **Limpiar**: Eliminar movimientos huérfanos (⚠️ irreversible)

### Error: "No se puede eliminar el producto"
**Causa**: Producto tiene movimientos de inventario asociados
**Solución**:
1. Revisar movimientos del producto
2. Decidir si mantener histórico o limpiar
3. Inactivar en lugar de eliminar si es necesario

## Migración de Sistemas Existentes

### Paso 1: Evaluación
```bash
GET /api/productos/sync-validation
```

### Paso 2: Decisión sobre Productos Huérfanos
- **Opción A**: Migrar a catálogo
- **Opción B**: Eliminar movimientos huérfanos

### Paso 3: Ejecución
```bash
POST /api/productos/sync-validation
{
  "action": "migrate"  // o "clean"
}
```

### Paso 4: Verificación
Repetir evaluación hasta que `isValid: true`

## Configuración y Mantenimiento

### Variables de Entorno
No requiere configuración adicional, usa la misma base de datos.

### Monitoreo
- Revisar panel de inventario regularmente
- Ejecutar validación periódicamente
- Atender advertencias de sincronización

### Backup y Recuperación
- Hacer backup antes de acciones de limpieza
- Los reportes de validación pueden ayudar en recuperación
- Mantener logs de migraciones realizadas

## Mejores Prácticas

1. **Prevención**: Usar siempre las funciones de validación
2. **Monitoreo**: Revisar regularmente el estado de sincronización
3. **Precaución**: Nunca eliminar datos sin backup
4. **Documentación**: Registrar cambios y migraciones realizadas
5. **Capacitación**: Entrenar usuarios en el nuevo flujo

## Limitaciones Conocidas

1. **Rendimiento**: Validaciones adicionales pueden impactar ligeramente el rendimiento
2. **Migración**: Productos migrados requieren revisión manual
3. **Reversibilidad**: Limpiezas de productos huérfanos son irreversibles

## Soporte y Debugging

### Logs Importantes
- Errores de validación en console del navegador
- Logs de API en servidor para errores de sincronización
- Reportes de validación para análisis histórico

### Debugging Common Issues
1. **Funciones no encontradas**: Verificar import de `producto-inventario-sync.ts`
2. **Errores de API**: Revisar permisos y autenticación
3. **Validaciones fallando**: Verificar estado de base de datos

## Roadmap Futuro

1. **Dashboard de Sincronización**: Panel dedicado para administradores
2. **Alertas Automáticas**: Notificaciones cuando se detectan problemas
3. **Reportes Programados**: Validaciones automáticas periódicas
4. **Auditoría Completa**: Tracking de todos los cambios de sincronización