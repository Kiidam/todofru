-- Script SQL para verificar y optimizar la base de datos de Ventas
-- Base de datos: todofru
-- Fecha: 2025-01-29

-- ========================================
-- 1. VERIFICACIÓN DE DATOS EXISTENTES
-- ========================================

-- Ver todas las tablas relacionadas con ventas
SELECT 'PedidoVenta' as tabla, COUNT(*) as total FROM pedidoventa
UNION ALL
SELECT 'PedidoVentaItem' as tabla, COUNT(*) as total FROM pedidoventaitem
UNION ALL
SELECT 'MovimientoInventario (Ventas)' as tabla, COUNT(*) as total FROM movimientoinventario WHERE tipo = 'SALIDA' AND motivo = 'Venta';

-- Ver los últimos 10 pedidos de venta
SELECT 
    pv.id,
    pv.numero,
    pv.fecha,
    pv.total,
    pv.estado,
    c.nombre as cliente_nombre,
    u.name as usuario_nombre,
    COUNT(pvi.id) as cantidad_items
FROM pedidoventa pv
LEFT JOIN cliente c ON pv.clienteId = c.id
LEFT JOIN user u ON pv.usuarioId = u.id
LEFT JOIN pedidoventaitem pvi ON pvi.pedidoId = pv.id
GROUP BY pv.id
ORDER BY pv.createdAt DESC
LIMIT 10;

-- Verificar integridad de items de pedidos
SELECT 
    pvi.id,
    pvi.pedidoId,
    pv.numero as pedido_numero,
    pvi.productoId,
    p.nombre as producto_nombre,
    pvi.cantidad,
    pvi.precio,
    pvi.subtotal
FROM pedidoventaitem pvi
LEFT JOIN pedidoventa pv ON pvi.pedidoId = pv.id
LEFT JOIN producto p ON pvi.productoId = p.id
ORDER BY pv.createdAt DESC
LIMIT 20;

-- ========================================
-- 2. VERIFICACIÓN DE INTEGRIDAD
-- ========================================

-- Pedidos de venta sin cliente (datos huérfanos)
SELECT 
    pv.id,
    pv.numero,
    pv.clienteId,
    'Cliente no encontrado' as problema
FROM pedidoventa pv
LEFT JOIN cliente c ON pv.clienteId = c.id
WHERE c.id IS NULL;

-- Pedidos de venta sin usuario (datos huérfanos)
SELECT 
    pv.id,
    pv.numero,
    pv.usuarioId,
    'Usuario no encontrado' as problema
FROM pedidoventa pv
LEFT JOIN user u ON pv.usuarioId = u.id
WHERE u.id IS NULL;

-- Items de pedido sin producto (datos huérfanos)
SELECT 
    pvi.id,
    pvi.pedidoId,
    pvi.productoId,
    'Producto no encontrado' as problema
FROM pedidoventaitem pvi
LEFT JOIN producto p ON pvi.productoId = p.id
WHERE p.id IS NULL;

-- Items de pedido sin pedido padre (datos huérfanos)
SELECT 
    pvi.id,
    pvi.pedidoId,
    'Pedido padre no encontrado' as problema
FROM pedidoventaitem pvi
LEFT JOIN pedidoventa pv ON pvi.pedidoId = pv.id
WHERE pv.id IS NULL;

-- ========================================
-- 3. VERIFICACIÓN DE CONSISTENCIA DE DATOS
-- ========================================

-- Verificar que los subtotales de items coincidan con cantidad * precio
SELECT 
    pvi.id,
    pvi.pedidoId,
    pv.numero,
    pvi.cantidad,
    pvi.precio,
    pvi.subtotal as subtotal_registrado,
    (pvi.cantidad * pvi.precio) as subtotal_calculado,
    ROUND(ABS(pvi.subtotal - (pvi.cantidad * pvi.precio)), 2) as diferencia
FROM pedidoventaitem pvi
JOIN pedidoventa pv ON pvi.pedidoId = pv.id
WHERE ROUND(ABS(pvi.subtotal - (pvi.cantidad * pvi.precio)), 2) > 0.01
ORDER BY diferencia DESC;

-- Verificar que los totales de pedidos coincidan con la suma de items
SELECT 
    pv.id,
    pv.numero,
    pv.total as total_registrado,
    COALESCE(SUM(pvi.subtotal), 0) as total_calculado,
    ROUND(ABS(pv.total - COALESCE(SUM(pvi.subtotal), 0)), 2) as diferencia
FROM pedidoventa pv
LEFT JOIN pedidoventaitem pvi ON pvi.pedidoId = pv.id
GROUP BY pv.id
HAVING ROUND(ABS(pv.total - COALESCE(SUM(pvi.subtotal), 0)), 2) > 0.01
ORDER BY diferencia DESC;

-- ========================================
-- 4. ESTADÍSTICAS DE VENTAS
-- ========================================

-- Resumen general
SELECT 
    COUNT(DISTINCT pv.id) as total_pedidos,
    COUNT(DISTINCT pv.clienteId) as total_clientes,
    COUNT(DISTINCT pvi.productoId) as total_productos_vendidos,
    SUM(pv.total) as ventas_totales,
    AVG(pv.total) as venta_promedio,
    MIN(pv.total) as venta_minima,
    MAX(pv.total) as venta_maxima
FROM pedidoventa pv
LEFT JOIN pedidoventaitem pvi ON pvi.pedidoId = pv.id;

-- Ventas por estado
SELECT 
    estado,
    COUNT(*) as cantidad,
    SUM(total) as total_ventas,
    AVG(total) as promedio
FROM pedidoventa
GROUP BY estado
ORDER BY cantidad DESC;

-- Top 10 clientes por volumen de compras
SELECT 
    c.id,
    c.nombre,
    c.razonSocial,
    COUNT(pv.id) as total_pedidos,
    SUM(pv.total) as total_comprado,
    AVG(pv.total) as promedio_pedido
FROM cliente c
JOIN pedidoventa pv ON pv.clienteId = c.id
GROUP BY c.id
ORDER BY total_comprado DESC
LIMIT 10;

-- Top 10 productos más vendidos
SELECT 
    p.id,
    p.nombre,
    p.sku,
    COUNT(pvi.id) as veces_vendido,
    SUM(pvi.cantidad) as cantidad_total,
    SUM(pvi.subtotal) as ingresos_totales
FROM producto p
JOIN pedidoventaitem pvi ON pvi.productoId = p.id
GROUP BY p.id
ORDER BY cantidad_total DESC
LIMIT 10;

-- Ventas por mes (últimos 6 meses)
SELECT 
    DATE_FORMAT(fecha, '%Y-%m') as mes,
    COUNT(*) as total_pedidos,
    SUM(total) as total_ventas,
    AVG(total) as promedio_venta
FROM pedidoventa
WHERE fecha >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
GROUP BY DATE_FORMAT(fecha, '%Y-%m')
ORDER BY mes DESC;

-- ========================================
-- 5. LIMPIEZA DE DATOS (USAR CON PRECAUCIÓN)
-- ========================================

-- NOTA: Ejecutar estos comandos SOLO si se encontraron problemas en las verificaciones anteriores
-- IMPORTANTE: Hacer backup de la base de datos antes de ejecutar estas operaciones

-- Eliminar items huérfanos (sin pedido padre) - COMENTADO POR SEGURIDAD
-- DELETE FROM pedidoventaitem 
-- WHERE pedidoId NOT IN (SELECT id FROM pedidoventa);

-- Eliminar items con productos inexistentes - COMENTADO POR SEGURIDAD
-- DELETE FROM pedidoventaitem 
-- WHERE productoId NOT IN (SELECT id FROM producto);

-- Actualizar subtotales incorrectos de items - COMENTADO POR SEGURIDAD
-- UPDATE pedidoventaitem 
-- SET subtotal = cantidad * precio
-- WHERE ROUND(ABS(subtotal - (cantidad * precio)), 2) > 0.01;

-- Actualizar totales incorrectos de pedidos - COMENTADO POR SEGURIDAD
-- UPDATE pedidoventa pv
-- SET total = (
--     SELECT COALESCE(SUM(subtotal), 0)
--     FROM pedidoventaitem pvi
--     WHERE pvi.pedidoId = pv.id
-- )
-- WHERE pv.id IN (
--     SELECT id FROM (
--         SELECT pv2.id
--         FROM pedidoventa pv2
--         LEFT JOIN pedidoventaitem pvi2 ON pvi2.pedidoId = pv2.id
--         GROUP BY pv2.id
--         HAVING ROUND(ABS(pv2.total - COALESCE(SUM(pvi2.subtotal), 0)), 2) > 0.01
--     ) as subquery
-- );

-- ========================================
-- 6. OPTIMIZACIÓN DE ÍNDICES
-- ========================================

-- Verificar índices existentes
SHOW INDEX FROM pedidoventa;
SHOW INDEX FROM pedidoventaitem;
SHOW INDEX FROM movimientoinventario;

-- Verificar uso de índices en consultas comunes
EXPLAIN SELECT * FROM pedidoventa WHERE clienteId = 'some-uuid' ORDER BY fecha DESC LIMIT 10;
EXPLAIN SELECT * FROM pedidoventa WHERE numero = 'PV-2025-123456';
EXPLAIN SELECT * FROM pedidoventaitem WHERE pedidoId = 'some-uuid';

-- ========================================
-- 7. MANTENIMIENTO DE BASE DE DATOS
-- ========================================

-- Analizar tablas para optimizar rendimiento
ANALYZE TABLE pedidoventa;
ANALYZE TABLE pedidoventaitem;
ANALYZE TABLE movimientoinventario;

-- Verificar fragmentación de tablas
SELECT 
    table_name,
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS "Tamaño (MB)",
    ROUND((data_free / 1024 / 1024), 2) AS "Fragmentación (MB)",
    ROUND((data_free / (data_length + index_length + data_free)) * 100, 2) AS "% Fragmentación"
FROM information_schema.tables
WHERE table_schema = 'todofru'
    AND table_name IN ('pedidoventa', 'pedidoventaitem', 'movimientoinventario')
ORDER BY (data_free / (data_length + index_length + data_free)) DESC;

-- ========================================
-- 8. BACKUP Y RESTAURACIÓN
-- ========================================

-- Comando para hacer backup (ejecutar en terminal, NO en MySQL)
-- mysqldump -u root -p todofru pedidoventa pedidoventaitem movimientoinventario > backup_ventas_$(date +%Y%m%d_%H%M%S).sql

-- Comando para restaurar backup (ejecutar en terminal, NO en MySQL)
-- mysql -u root -p todofru < backup_ventas_YYYYMMDD_HHMMSS.sql

-- ========================================
-- FIN DEL SCRIPT
-- ========================================

-- Resumen de verificación
SELECT 
    'Script de verificación completado' as mensaje,
    NOW() as fecha_ejecucion;
