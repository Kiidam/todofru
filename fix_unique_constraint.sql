-- Eliminar la restricción única problemática en MovimientoInventario
-- Esta restricción impide crear múltiples movimientos para el mismo producto
-- en el mismo segundo, causando errores al editar compras

USE todofru;

-- Verificar si la restricción existe
SHOW INDEX FROM movimientoinventario WHERE Key_name = 'uq_mi_producto_fecha';

-- Eliminar la restricción única
ALTER TABLE movimientoinventario DROP INDEX uq_mi_producto_fecha;

-- Verificar que se eliminó
SHOW INDEX FROM movimientoinventario;

SELECT 'Restricción única eliminada exitosamente' AS resultado;
