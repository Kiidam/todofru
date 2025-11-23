-- Migración para eliminar restricción UNIQUE que impide agregar el mismo producto múltiples veces
-- Esta restricción causa errores cuando se intenta agregar el mismo producto con diferentes cantidades

-- 1. Verificar si la restricción existe
SELECT CONSTRAINT_NAME, CONSTRAINT_TYPE 
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
WHERE TABLE_SCHEMA = 'todofru' 
  AND TABLE_NAME = 'pedidoventaitem' 
  AND CONSTRAINT_NAME = 'uq_pvi_pedido_producto';

-- 2. Eliminar la restricción UNIQUE
ALTER TABLE pedidoventaitem DROP INDEX uq_pvi_pedido_producto;

-- 3. Verificar que se eliminó
SELECT CONSTRAINT_NAME, CONSTRAINT_TYPE 
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
WHERE TABLE_SCHEMA = 'todofru' 
  AND TABLE_NAME = 'pedidoventaitem';

-- 4. Mostrar estructura actualizada
SHOW CREATE TABLE pedidoventaitem;

SELECT 'Restricción UNIQUE eliminada exitosamente. Ahora se puede agregar el mismo producto múltiples veces en una venta.' as mensaje;
