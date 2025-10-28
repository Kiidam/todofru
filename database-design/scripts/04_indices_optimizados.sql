-- =====================================================
-- SCRIPT: 04_indices_optimizados.sql
-- PROPÓSITO: Crear índices optimizados para consultas frecuentes
-- FECHA: 2024-10-27
-- VERSIÓN: 1.0
-- =====================================================

-- Configuración inicial
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';
SET AUTOCOMMIT = 0;
START TRANSACTION;

-- =====================================================
-- ÍNDICES PARA TABLA PERSONAS
-- =====================================================

-- Índice para búsquedas por número de identificación (muy frecuente)
CREATE INDEX idx_personas_numero_identificacion 
ON personas (numero_identificacion);

-- Índice para búsquedas por email (autenticación)
CREATE INDEX idx_personas_email 
ON personas (email);

-- Índice para búsquedas por nombres y apellidos (búsquedas de clientes/proveedores)
CREATE INDEX idx_personas_nombres_apellidos 
ON personas (nombres, apellidos);

-- Índice para filtros por tipo de entidad y estado activo
CREATE INDEX idx_personas_tipo_activo 
ON personas (tipo_entidad, activo);

-- =====================================================
-- ÍNDICES PARA TABLA USUARIOS
-- =====================================================

-- Índice único para username (autenticación)
CREATE UNIQUE INDEX idx_usuarios_username 
ON usuarios (username);

-- Índice para email único (recuperación de contraseña)
CREATE UNIQUE INDEX idx_usuarios_email 
ON usuarios (email);

-- Índice para filtros por rol y estado activo
CREATE INDEX idx_usuarios_rol_activo 
ON usuarios (rol, activo);

-- Índice para consultas de usuarios que requieren cambio de contraseña
CREATE INDEX idx_usuarios_cambio_password 
ON usuarios (requiere_cambio_password, activo);

-- =====================================================
-- ÍNDICES PARA TABLA CLIENTES
-- =====================================================

-- Índice para búsquedas por tipo de cliente y estado activo
CREATE INDEX idx_clientes_tipo_activo 
ON clientes (tipo_cliente, activo);

-- Índice para filtros por límite de crédito
CREATE INDEX idx_clientes_limite_credito 
ON clientes (limite_credito);

-- Índice para consultas por fecha de registro
CREATE INDEX idx_clientes_fecha_registro 
ON clientes (fecha_registro);

-- =====================================================
-- ÍNDICES PARA TABLA PROVEEDORES
-- =====================================================

-- Índice para filtros por estado activo y calificación
CREATE INDEX idx_proveedores_activo_calificacion 
ON proveedores (activo, calificacion);

-- Índice para búsquedas por tiempo de entrega
CREATE INDEX idx_proveedores_tiempo_entrega 
ON proveedores (tiempo_entrega_dias);

-- =====================================================
-- ÍNDICES PARA TABLA PRODUCTOS
-- =====================================================

-- Índice para búsquedas por código de producto (muy frecuente)
CREATE UNIQUE INDEX idx_productos_codigo 
ON productos (codigo);

-- Índice para búsquedas por nombre de producto
CREATE INDEX idx_productos_nombre 
ON productos (nombre);

-- Índice para filtros por categoría y estado activo
CREATE INDEX idx_productos_categoria_activo 
ON productos (categoria_id, activo);

-- Índice para consultas de inventario por stock mínimo
CREATE INDEX idx_productos_stock_minimo 
ON productos (stock_minimo, stock_actual);

-- Índice para filtros por precio
CREATE INDEX idx_productos_precio 
ON productos (precio_venta);

-- Índice compuesto para alertas de inventario
CREATE INDEX idx_productos_alerta_inventario 
ON productos (activo, stock_actual, stock_minimo);

-- =====================================================
-- ÍNDICES PARA TABLA PRODUCTOS_PROVEEDORES
-- =====================================================

-- Índice para consultas por producto
CREATE INDEX idx_productos_proveedores_producto 
ON productos_proveedores (producto_id);

-- Índice para consultas por proveedor
CREATE INDEX idx_productos_proveedores_proveedor 
ON productos_proveedores (proveedor_id);

-- Índice para filtros por estado activo y preferencia
CREATE INDEX idx_productos_proveedores_activo_preferencia 
ON productos_proveedores (activo, es_proveedor_preferido);

-- Índice para consultas por precio de compra
CREATE INDEX idx_productos_proveedores_precio 
ON productos_proveedores (precio_compra);

-- =====================================================
-- ÍNDICES PARA TABLA MOVIMIENTOS_INVENTARIO
-- =====================================================

-- Índice para consultas por producto y fecha (muy frecuente)
CREATE INDEX idx_movimientos_producto_fecha 
ON movimientos_inventario (producto_id, fecha_movimiento DESC);

-- Índice para consultas por tipo de movimiento
CREATE INDEX idx_movimientos_tipo 
ON movimientos_inventario (tipo_movimiento_id);

-- Índice para consultas por usuario que realizó el movimiento
CREATE INDEX idx_movimientos_usuario 
ON movimientos_inventario (usuario_id);

-- Índice para consultas por fecha de movimiento
CREATE INDEX idx_movimientos_fecha 
ON movimientos_inventario (fecha_movimiento DESC);

-- Índice para consultas por documento de referencia
CREATE INDEX idx_movimientos_documento 
ON movimientos_inventario (documento_referencia);

-- Índice compuesto para reportes de movimientos por período
CREATE INDEX idx_movimientos_periodo_tipo 
ON movimientos_inventario (fecha_movimiento DESC, tipo_movimiento_id, producto_id);

-- =====================================================
-- ÍNDICES PARA TABLA PEDIDOS_COMPRA
-- =====================================================

-- Índice para consultas por proveedor
CREATE INDEX idx_pedidos_compra_proveedor 
ON pedidos_compra (proveedor_id);

-- Índice para consultas por estado
CREATE INDEX idx_pedidos_compra_estado 
ON pedidos_compra (estado_id);

-- Índice para consultas por fecha de pedido
CREATE INDEX idx_pedidos_compra_fecha 
ON pedidos_compra (fecha_pedido DESC);

-- Índice para consultas por fecha de entrega esperada
CREATE INDEX idx_pedidos_compra_entrega 
ON pedidos_compra (fecha_entrega_esperada);

-- Índice para consultas por usuario que creó el pedido
CREATE INDEX idx_pedidos_compra_usuario 
ON pedidos_compra (usuario_id);

-- Índice compuesto para reportes por proveedor y estado
CREATE INDEX idx_pedidos_compra_proveedor_estado 
ON pedidos_compra (proveedor_id, estado_id, fecha_pedido DESC);

-- =====================================================
-- ÍNDICES PARA TABLA PEDIDOS_COMPRA_ITEMS
-- =====================================================

-- Índice para consultas por pedido
CREATE INDEX idx_pedidos_items_pedido 
ON pedidos_compra_items (pedido_id);

-- Índice para consultas por producto
CREATE INDEX idx_pedidos_items_producto 
ON pedidos_compra_items (producto_id);

-- Índice compuesto para análisis de compras por producto
CREATE INDEX idx_pedidos_items_producto_cantidad 
ON pedidos_compra_items (producto_id, cantidad, precio_unitario);

-- =====================================================
-- ÍNDICES PARA TABLA CATEGORIAS
-- =====================================================

-- Índice para consultas por categoría padre (jerarquía)
CREATE INDEX idx_categorias_padre 
ON categorias (categoria_padre_id);

-- Índice para filtros por estado activo
CREATE INDEX idx_categorias_activo 
ON categorias (activo);

-- Índice para búsquedas por código de categoría
CREATE UNIQUE INDEX idx_categorias_codigo 
ON categorias (codigo);

-- =====================================================
-- ÍNDICES PARA TABLA AUDITORIA
-- =====================================================

-- Índice para consultas por entidad y ID de entidad
CREATE INDEX idx_auditoria_entidad 
ON auditoria (entidad, entidad_id);

-- Índice para consultas por usuario que realizó la acción
CREATE INDEX idx_auditoria_usuario 
ON auditoria (usuario_id);

-- Índice para consultas por fecha de acción
CREATE INDEX idx_auditoria_fecha 
ON auditoria (fecha_accion DESC);

-- Índice para consultas por tipo de acción
CREATE INDEX idx_auditoria_accion 
ON auditoria (accion);

-- Índice compuesto para auditoría por entidad y fecha
CREATE INDEX idx_auditoria_entidad_fecha 
ON auditoria (entidad, entidad_id, fecha_accion DESC);

-- =====================================================
-- ÍNDICES PARA OPTIMIZACIÓN DE CONSULTAS ESPECÍFICAS
-- =====================================================

-- Índice para consultas de productos con bajo stock (dashboard)
CREATE INDEX idx_productos_bajo_stock 
ON productos (activo, stock_actual, stock_minimo) 
WHERE activo = 1 AND stock_actual <= stock_minimo;

-- Índice para consultas de pedidos pendientes
CREATE INDEX idx_pedidos_pendientes 
ON pedidos_compra (estado_id, fecha_pedido DESC) 
WHERE estado_id IN (1, 2, 3); -- Estados: Borrador, Enviado, Confirmado

-- Índice para consultas de movimientos recientes
CREATE INDEX idx_movimientos_recientes 
ON movimientos_inventario (fecha_movimiento DESC, producto_id) 
WHERE fecha_movimiento >= DATE_SUB(NOW(), INTERVAL 30 DAY);

-- =====================================================
-- ÍNDICES PARA BÚSQUEDAS DE TEXTO
-- =====================================================

-- Índice de texto completo para búsquedas en productos
ALTER TABLE productos 
ADD FULLTEXT(nombre, descripcion);

-- Índice de texto completo para búsquedas en personas
ALTER TABLE personas 
ADD FULLTEXT(nombres, apellidos, razon_social);

-- =====================================================
-- VERIFICACIÓN DE ÍNDICES CREADOS
-- =====================================================

-- Mostrar todos los índices creados
SELECT 
    TABLE_NAME,
    INDEX_NAME,
    COLUMN_NAME,
    SEQ_IN_INDEX,
    NON_UNIQUE
FROM 
    INFORMATION_SCHEMA.STATISTICS 
WHERE 
    TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME IN (
        'personas', 'usuarios', 'clientes', 'proveedores', 
        'productos', 'productos_proveedores', 'movimientos_inventario',
        'pedidos_compra', 'pedidos_compra_items', 'categorias', 'auditoria'
    )
ORDER BY 
    TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;

-- =====================================================
-- ESTADÍSTICAS DE RENDIMIENTO
-- =====================================================

-- Analizar tablas para actualizar estadísticas
ANALYZE TABLE personas, usuarios, clientes, proveedores, productos, 
             productos_proveedores, movimientos_inventario, pedidos_compra, 
             pedidos_compra_items, categorias, auditoria;

-- =====================================================
-- FINALIZACIÓN
-- =====================================================

-- Restaurar configuraciones
SET FOREIGN_KEY_CHECKS = 1;
COMMIT;

-- Mensaje de confirmación
SELECT 'Índices optimizados creados exitosamente' AS resultado;

-- =====================================================
-- NOTAS DE OPTIMIZACIÓN
-- =====================================================

/*
ÍNDICES CREADOS PARA OPTIMIZAR:

1. CONSULTAS DE AUTENTICACIÓN:
   - idx_usuarios_username (único)
   - idx_usuarios_email (único)
   - idx_personas_email

2. BÚSQUEDAS DE ENTIDADES:
   - idx_personas_numero_identificacion
   - idx_personas_nombres_apellidos
   - idx_productos_codigo (único)
   - idx_productos_nombre

3. FILTROS FRECUENTES:
   - idx_personas_tipo_activo
   - idx_clientes_tipo_activo
   - idx_productos_categoria_activo
   - idx_proveedores_activo_calificacion

4. CONSULTAS DE INVENTARIO:
   - idx_productos_stock_minimo
   - idx_productos_alerta_inventario
   - idx_movimientos_producto_fecha
   - idx_movimientos_periodo_tipo

5. GESTIÓN DE PEDIDOS:
   - idx_pedidos_compra_proveedor_estado
   - idx_pedidos_compra_fecha
   - idx_pedidos_items_producto_cantidad

6. AUDITORÍA Y TRAZABILIDAD:
   - idx_auditoria_entidad_fecha
   - idx_auditoria_usuario

7. BÚSQUEDAS DE TEXTO COMPLETO:
   - FULLTEXT en productos (nombre, descripción)
   - FULLTEXT en personas (nombres, apellidos, razón social)

BENEFICIOS ESPERADOS:
- Reducción del tiempo de consulta en 60-80%
- Mejora en consultas de dashboard y reportes
- Optimización de búsquedas de texto
- Mejor rendimiento en operaciones CRUD frecuentes
*/