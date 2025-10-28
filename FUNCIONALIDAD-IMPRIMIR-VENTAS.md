# Funcionalidad de Impresión en Ventas

## 📋 Resumen
Se ha agregado la funcionalidad de impresión en el módulo de ventas, manteniendo el mismo estándar y diseño que el módulo de compras.

## 🎯 Objetivo
Permitir a los usuarios imprimir las órdenes de venta con un formato profesional y estructurado, con toda la información relevante.

## ✅ Cambios Implementados

### 1. Función `printSale` (Líneas 368-470)
Se agregó una nueva función que:
- Abre una nueva ventana con el formato de impresión
- Genera un documento HTML completo con estilos profesionales
- Incluye toda la información de la venta:
  - Número de pedido
  - Cliente
  - Fechas (pedido y entrega)
  - Estado
  - Detalle de productos con precios
  - Total de la venta
- Botón de impresión dentro del documento
- Estilos responsive con reglas `@media print`

### 2. Botón "Imprimir" en Modal de Detalle (Líneas 948-958)
Se agregó un botón "Imprimir" en el footer del modal de detalle:
- Botón con estilo verde (`bg-green-600`) para consistencia visual
- Ubicado antes del botón "Cerrar"
- Llama a la función `printSale` con los datos de la venta actual
- Incluye validación para asegurar que `detailSale` existe

## 🎨 Estructura del Documento de Impresión

```
┌─────────────────────────────────┐
│     ORDEN DE VENTA              │
│     [Número de Pedido]          │
├─────────────────────────────────┤
│ Cliente: [Nombre]               │
│ Fecha de pedido: [Fecha]        │
│ Fecha de entrega: [Fecha]       │
│ Hora: [Hora]                    │
│ Estado: [Estado]                │
├─────────────────────────────────┤
│ Detalle de Productos            │
├────┬────────┬────────┬──────────┤
│ Producto │ Cant │ P.Unit │ Sub │
│    ...   │  ... │  ...   │ ... │
├─────────────────────────────────┤
│              TOTAL: S/ [Total]  │
├─────────────────────────────────┤
│        [Botón Imprimir]         │
└─────────────────────────────────┘
```

## 🔧 Características Técnicas

### Ventana de Impresión
- Se abre en una nueva pestaña (`window.open`)
- Incluye validación para ventanas emergentes bloqueadas
- Genera HTML completo con charset UTF-8
- Auto-cierra el stream de escritura para completar el documento

### Estilos CSS
- Diseño profesional con tipografía Arial
- Grid de 2 columnas para información
- Tabla con bordes y encabezados destacados
- Total destacado en tamaño grande
- Botón oculto al imprimir (`@media print`)
- Color verde corporativo (#16a34a) en botón

### Formato de Datos
- Fechas en formato largo español ('es-PE')
- Montos en soles peruanos (S/)
- Decimales con 2 posiciones
- Manejo de valores opcionales con operador `??`

## 📊 Datos Mostrados

### Información de la Venta
1. **Número de Pedido**: `numeroPedido` o extraído de `motivo`
2. **Cliente**: Nombre del cliente
3. **Fecha de Pedido**: Formato completo (día, mes, año)
4. **Fecha de Entrega**: Si existe, sino "No especificada"
5. **Hora**: Hora de creación del pedido
6. **Estado**: Estado actual de la venta

### Detalle de Productos
Para cada producto:
- Nombre del producto
- Cantidad vendida
- Precio unitario
- Subtotal (cantidad × precio)

### Totales
- **Total General**: Suma de todos los subtotales

## 🎯 Integración con el Sistema

### Consistencia con Módulo de Compras
- Misma estructura HTML
- Mismos estilos CSS base
- Mismo comportamiento de ventana emergente
- Mismo botón de impresión en el documento

### Diferencias Específicas de Ventas
- Título: "ORDEN DE VENTA" (vs "ORDEN DE COMPRA")
- Campo "Cliente" (vs "Proveedor")
- Incluye "Fecha de entrega"
- No incluye campo "Unidad" en productos
- Color verde corporativo (#16a34a vs #4CAF50)

## 🔒 Validaciones

1. **Ventana Emergente**: Alert si está bloqueada por el navegador
2. **Datos de Venta**: Validación de existencia con `detailSale &&`
3. **Items**: Manejo seguro con operador `??` para arrays vacíos
4. **Fechas Opcionales**: Validación de `fechaEntrega` antes de formatear

## 🚀 Flujo de Uso

1. Usuario hace clic en "Ver" en una venta de la lista
2. Se abre el modal de detalle con toda la información
3. Usuario hace clic en el botón "Imprimir" (verde)
4. Se abre una nueva ventana con el documento formateado
5. Usuario puede:
   - Ver la vista previa del documento
   - Hacer clic en "Imprimir" para abrir el diálogo de impresión
   - Usar Ctrl+P para imprimir
   - Cerrar la ventana cuando termine

## ✨ Beneficios

1. **Profesionalismo**: Documentos con formato limpio y estructurado
2. **Usabilidad**: Un solo clic para imprimir desde el detalle
3. **Consistencia**: Misma experiencia que en el módulo de compras
4. **Flexibilidad**: Vista previa antes de imprimir físicamente
5. **Accesibilidad**: Formato responsive para diferentes tamaños de página

## 📝 Notas de Implementación

- No se modificó la base de datos
- No se agregaron nuevas dependencias
- Cambios solo en el frontend (`page.tsx`)
- Compatible con todos los navegadores modernos
- Funciona offline (no requiere conexión después de cargar la página)

## 🧪 Casos de Prueba Sugeridos

1. Imprimir venta con múltiples productos
2. Imprimir venta sin fecha de entrega
3. Imprimir venta con caracteres especiales en nombres
4. Probar en diferentes navegadores
5. Verificar formato en diferentes tamaños de papel
6. Verificar que el botón se oculta al imprimir

## 📂 Archivos Modificados

```
app/dashboard/movimientos/ventas/page.tsx
  - Líneas 368-470: Función printSale()
  - Líneas 948-958: Botón Imprimir en modal de detalle
```

## 🎉 Estado Actual

✅ **COMPLETADO** - La funcionalidad está implementada y lista para usar
✅ Sin errores de compilación
✅ Consistente con el diseño del sistema
✅ Documentación completa

---

**Fecha de Implementación**: 2025-01-29  
**Módulo**: Movimientos → Ventas  
**Tipo**: Feature - Funcionalidad de Impresión
