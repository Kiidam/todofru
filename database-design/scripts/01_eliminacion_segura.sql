-- =====================================================
-- SCRIPT DE ELIMINACIÓN SEGURA DE BASE DE DATOS
-- TodoFru - Sistema de Gestión
-- =====================================================
-- 
-- ADVERTENCIA: Este script eliminará COMPLETAMENTE la base de datos actual
-- Asegúrese de tener un respaldo antes de ejecutar
--
-- Fecha: 2024-12-25
-- Versión: 1.0
-- =====================================================

-- Configuración de seguridad
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_SAFE_UPDATES = 0;

-- =====================================================
-- PASO 1: VERIFICACIÓN DE CONEXIÓN Y PERMISOS
-- =====================================================

-- Verificar que estamos conectados a la base de datos correcta
SELECT 
    DATABASE() as base_datos_actual,
    USER() as usuario_actual,
    NOW() as fecha_hora_ejecucion;

-- Mostrar información de la base de datos antes de eliminar
SELECT 
    TABLE_SCHEMA as base_datos,
    COUNT(*) as total_tablas,
    SUM(TABLE_ROWS) as total_registros_aprox,
    ROUND(SUM(DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) as tamaño_mb
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE()
GROUP BY TABLE_SCHEMA;

-- =====================================================
-- PASO 2: RESPALDO DE METADATOS CRÍTICOS
-- =====================================================

-- Crear tabla temporal para guardar información de respaldo
CREATE TEMPORARY TABLE IF NOT EXISTS backup_metadata (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tabla VARCHAR(100),
    registros INT,
    tamaño_mb DECIMAL(10,2),
    fecha_backup TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar información de todas las tablas
INSERT INTO backup_metadata (tabla, registros, tamaño_mb)
SELECT 
    TABLE_NAME,
    IFNULL(TABLE_ROWS, 0),
    ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2)
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_TYPE = 'BASE TABLE';

-- Mostrar resumen del respaldo de metadatos
SELECT 
    'RESUMEN DE RESPALDO' as tipo,
    COUNT(*) as tablas_respaldadas,
    SUM(registros) as total_registros,
    SUM(tamaño_mb) as total_mb
FROM backup_metadata;

-- =====================================================
-- PASO 3: ELIMINACIÓN DE TRIGGERS Y PROCEDIMIENTOS
-- =====================================================

-- Eliminar todos los triggers
SET @sql = NULL;
SELECT GROUP_CONCAT(
    'DROP TRIGGER IF EXISTS ', TRIGGER_NAME, ';'
    SEPARATOR ' '
) INTO @sql
FROM information_schema.TRIGGERS
WHERE TRIGGER_SCHEMA = DATABASE();

SET @sql = IFNULL(@sql, 'SELECT "No hay triggers para eliminar" as mensaje;');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Eliminar todos los procedimientos almacenados
SET @sql = NULL;
SELECT GROUP_CONCAT(
    'DROP PROCEDURE IF EXISTS ', ROUTINE_NAME, ';'
    SEPARATOR ' '
) INTO @sql
FROM information_schema.ROUTINES
WHERE ROUTINE_SCHEMA = DATABASE()
AND ROUTINE_TYPE = 'PROCEDURE';

SET @sql = IFNULL(@sql, 'SELECT "No hay procedimientos para eliminar" as mensaje;');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Eliminar todas las funciones
SET @sql = NULL;
SELECT GROUP_CONCAT(
    'DROP FUNCTION IF EXISTS ', ROUTINE_NAME, ';'
    SEPARATOR ' '
) INTO @sql
FROM information_schema.ROUTINES
WHERE ROUTINE_SCHEMA = DATABASE()
AND ROUTINE_TYPE = 'FUNCTION';

SET @sql = IFNULL(@sql, 'SELECT "No hay funciones para eliminar" as mensaje;');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- PASO 4: ELIMINACIÓN DE VISTAS
-- =====================================================

-- Eliminar todas las vistas
SET @sql = NULL;
SELECT GROUP_CONCAT(
    'DROP VIEW IF EXISTS ', TABLE_NAME, ';'
    SEPARATOR ' '
) INTO @sql
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_TYPE = 'VIEW';

SET @sql = IFNULL(@sql, 'SELECT "No hay vistas para eliminar" as mensaje;');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- PASO 5: ELIMINACIÓN DE TABLAS EN ORDEN CORRECTO
-- =====================================================

-- Deshabilitar verificación de claves foráneas temporalmente
SET FOREIGN_KEY_CHECKS = 0;

-- Lista de tablas en orden de dependencias (de menor a mayor dependencia)
-- Tablas de auditoría y logs (sin dependencias críticas)
DROP TABLE IF EXISTS auditoria;

-- Tablas de detalles de transacciones
DROP TABLE IF EXISTS pedidocompraitem;
DROP TABLE IF EXISTS pedidoventaitem;

-- Tablas de movimientos
DROP TABLE IF EXISTS movimientoinventario;

-- Tablas de transacciones principales
DROP TABLE IF EXISTS pedidocompra;
DROP TABLE IF EXISTS pedidoventa;

-- Tablas de relaciones
DROP TABLE IF EXISTS productoproveedor;

-- Tablas principales de entidades
DROP TABLE IF EXISTS producto;
DROP TABLE IF EXISTS cliente;
DROP TABLE IF EXISTS proveedor;

-- Tablas de catálogos
DROP TABLE IF EXISTS categoria;
DROP TABLE IF EXISTS unidadmedida;

-- Tabla de usuarios
DROP TABLE IF EXISTS user;

-- Tablas de sistema (si existen)
DROP TABLE IF EXISTS configuracion;
DROP TABLE IF EXISTS parametros;

-- =====================================================
-- PASO 6: ELIMINACIÓN DE ESQUEMAS PRISMA
-- =====================================================

-- Eliminar tabla de migraciones de Prisma
DROP TABLE IF EXISTS _prisma_migrations;

-- =====================================================
-- PASO 7: VERIFICACIÓN DE ELIMINACIÓN COMPLETA
-- =====================================================

-- Verificar que no queden tablas
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN 'ÉXITO: Todas las tablas han sido eliminadas'
        ELSE CONCAT('ADVERTENCIA: Quedan ', COUNT(*), ' tablas sin eliminar')
    END as resultado,
    GROUP_CONCAT(TABLE_NAME) as tablas_restantes
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_TYPE = 'BASE TABLE';

-- Verificar que no queden vistas
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN 'ÉXITO: Todas las vistas han sido eliminadas'
        ELSE CONCAT('ADVERTENCIA: Quedan ', COUNT(*), ' vistas sin eliminar')
    END as resultado,
    GROUP_CONCAT(TABLE_NAME) as vistas_restantes
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_TYPE = 'VIEW';

-- Verificar que no queden procedimientos
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN 'ÉXITO: Todos los procedimientos han sido eliminados'
        ELSE CONCAT('ADVERTENCIA: Quedan ', COUNT(*), ' procedimientos sin eliminar')
    END as resultado,
    GROUP_CONCAT(ROUTINE_NAME) as procedimientos_restantes
FROM information_schema.ROUTINES
WHERE ROUTINE_SCHEMA = DATABASE();

-- =====================================================
-- PASO 8: LIMPIEZA FINAL
-- =====================================================

-- Mostrar resumen final
SELECT 
    'ELIMINACIÓN COMPLETADA' as estado,
    DATABASE() as base_datos,
    USER() as usuario,
    NOW() as fecha_hora_finalizacion;

-- Mostrar información del respaldo de metadatos para referencia
SELECT 
    'INFORMACIÓN DE RESPALDO' as tipo,
    tabla,
    registros,
    tamaño_mb,
    fecha_backup
FROM backup_metadata
ORDER BY registros DESC;

-- Restaurar configuraciones de seguridad
SET FOREIGN_KEY_CHECKS = 1;
SET SQL_SAFE_UPDATES = 1;

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================
/*
1. Este script ha eliminado COMPLETAMENTE la base de datos actual
2. Se ha guardado información de metadatos en la tabla temporal backup_metadata
3. Para recuperar datos, será necesario restaurar desde un respaldo externo
4. El siguiente paso es ejecutar el script de creación de la nueva estructura
5. Asegúrese de actualizar las variables de entorno si es necesario

PRÓXIMOS PASOS:
- Ejecutar 02_creacion_nueva_estructura.sql
- Ejecutar 03_datos_iniciales.sql
- Actualizar configuración de Prisma
- Ejecutar migraciones de Prisma
- Verificar funcionamiento de la aplicación
*/

-- Mensaje final
SELECT 
    '¡ATENCIÓN!' as mensaje,
    'La base de datos ha sido eliminada completamente.' as detalle,
    'Proceda con la creación de la nueva estructura.' as siguiente_paso;