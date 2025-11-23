-- Script de depuración para verificar ventas
-- Ejecutar: mysql -u root -p"martin" todofru < scripts/verificar-ventas-debug.sql

-- 1. Contar total de ventas
SELECT '=== TOTAL DE VENTAS ===' as info;
SELECT COUNT(*) as total_ventas FROM pedidoventa;

-- 2. Verificar últimas 5 ventas con todos sus datos
SELECT '=== ÚLTIMAS 5 VENTAS ===' as info;
SELECT 
    pv.id,
    pv.numero,
    pv.clienteId,
    c.nombre as cliente_nombre,
    c.razonSocial as cliente_razon_social,
    pv.fecha,
    pv.subtotal,
    pv.impuestos,
    pv.total,
    pv.estado,
    pv.observaciones,
    pv.usuarioId,
    u.name as usuario_nombre,
    u.email as usuario_email,
    pv.createdAt,
    pv.updatedAt
FROM pedidoventa pv
LEFT JOIN cliente c ON pv.clienteId = c.id
LEFT JOIN user u ON pv.usuarioId = u.id
ORDER BY pv.createdAt DESC
LIMIT 5;

-- 3. Verificar items de las últimas ventas
SELECT '=== ITEMS DE ÚLTIMAS VENTAS ===' as info;
SELECT 
    pvi.id,
    pvi.pedidoId,
    pv.numero as pedido_numero,
    pvi.productoId,
    p.nombre as producto_nombre,
    pvi.cantidad,
    pvi.precio,
    pvi.subtotal,
    um.nombre as unidad_medida,
    um.simbolo as unidad_simbolo
FROM pedidoventaitem pvi
INNER JOIN pedidoventa pv ON pvi.pedidoId = pv.id
INNER JOIN producto p ON pvi.productoId = p.id
LEFT JOIN unidadmedida um ON p.unidadMedidaId = um.id
WHERE pv.id IN (
    SELECT id FROM pedidoventa ORDER BY createdAt DESC LIMIT 5
)
ORDER BY pv.createdAt DESC, pvi.id;

-- 4. Verificar integridad referencial
SELECT '=== VERIFICACIÓN DE INTEGRIDAD ===' as info;

SELECT 'Ventas sin cliente' as tipo, COUNT(*) as cantidad
FROM pedidoventa pv
LEFT JOIN cliente c ON pv.clienteId = c.id
WHERE c.id IS NULL;

SELECT 'Ventas sin usuario' as tipo, COUNT(*) as cantidad
FROM pedidoventa pv
LEFT JOIN user u ON pv.usuarioId = u.id
WHERE u.id IS NULL;

SELECT 'Items sin pedido padre' as tipo, COUNT(*) as cantidad
FROM pedidoventaitem pvi
LEFT JOIN pedidoventa pv ON pvi.pedidoId = pv.id
WHERE pv.id IS NULL;

SELECT 'Items sin producto' as tipo, COUNT(*) as cantidad
FROM pedidoventaitem pvi
LEFT JOIN producto p ON pvi.productoId = p.id
WHERE p.id IS NULL;

-- 5. Verificar constraint UNIQUE que puede estar causando problemas
SELECT '=== CONSTRAINT UNIQUE DE ITEMS ===' as info;
SELECT 
    pedidoId,
    productoId,
    COUNT(*) as veces_repetido
FROM pedidoventaitem
GROUP BY pedidoId, productoId
HAVING COUNT(*) > 1;

-- 6. Verificar si hay ventas con totales inconsistentes
SELECT '=== VERIFICACIÓN DE TOTALES ===' as info;
SELECT 
    pv.id,
    pv.numero,
    pv.subtotal as subtotal_registrado,
    SUM(pvi.subtotal) as subtotal_calculado,
    pv.total as total_registrado,
    SUM(pvi.subtotal) + pv.impuestos as total_calculado,
    CASE 
        WHEN ABS(pv.subtotal - SUM(pvi.subtotal)) > 0.01 THEN 'INCONSISTENTE'
        ELSE 'OK'
    END as estado_subtotal,
    CASE 
        WHEN ABS(pv.total - (SUM(pvi.subtotal) + pv.impuestos)) > 0.01 THEN 'INCONSISTENTE'
        ELSE 'OK'
    END as estado_total
FROM pedidoventa pv
LEFT JOIN pedidoventaitem pvi ON pv.id = pvi.pedidoId
GROUP BY pv.id, pv.numero, pv.subtotal, pv.total, pv.impuestos
HAVING estado_subtotal = 'INCONSISTENTE' OR estado_total = 'INCONSISTENTE';
