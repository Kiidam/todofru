-- Migración para optimizar relaciones entre proveedores y productos
-- Fecha: 2024-12-25
-- Descripción: Mejora las relaciones entre entidades y agrega sistema de versionado

-- 1. Crear tabla de relación directa entre productos y proveedores
CREATE TABLE IF NOT EXISTS `productoproveedor` (
  `id` VARCHAR(191) NOT NULL,
  `productoId` VARCHAR(191) NOT NULL,
  `proveedorId` VARCHAR(191) NOT NULL,
  `precioCompra` DECIMAL(10,2) DEFAULT 0.00,
  `tiempoEntrega` INT DEFAULT NULL COMMENT 'Días de entrega',
  `cantidadMinima` DECIMAL(10,2) DEFAULT 0.00,
  `activo` BOOLEAN DEFAULT TRUE,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_producto_proveedor` (`productoId`, `proveedorId`),
  KEY `idx_pp_producto` (`productoId`),
  KEY `idx_pp_proveedor` (`proveedorId`),
  KEY `idx_pp_activo` (`activo`),
  
  CONSTRAINT `fk_pp_producto` FOREIGN KEY (`productoId`) REFERENCES `producto` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_pp_proveedor` FOREIGN KEY (`proveedorId`) REFERENCES `proveedor` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Crear tabla de versionado para cambios en entidades críticas
CREATE TABLE IF NOT EXISTS `auditoria` (
  `id` VARCHAR(191) NOT NULL,
  `tabla` VARCHAR(100) NOT NULL,
  `registroId` VARCHAR(191) NOT NULL,
  `accion` ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
  `datosAnteriores` JSON NULL,
  `datosNuevos` JSON NULL,
  `usuarioId` VARCHAR(191) NOT NULL,
  `ip` VARCHAR(45) NULL,
  `userAgent` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  
  PRIMARY KEY (`id`),
  KEY `idx_auditoria_tabla` (`tabla`),
  KEY `idx_auditoria_registro` (`registroId`),
  KEY `idx_auditoria_usuario` (`usuarioId`),
  KEY `idx_auditoria_fecha` (`createdAt`),
  KEY `idx_auditoria_accion` (`accion`),
  
  CONSTRAINT `fk_auditoria_usuario` FOREIGN KEY (`usuarioId`) REFERENCES `user` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Agregar campos de auditoría a tablas principales si no existen
ALTER TABLE `proveedor` 
ADD COLUMN IF NOT EXISTS `version` INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS `lastModifiedBy` VARCHAR(191) NULL,
ADD KEY IF NOT EXISTS `idx_proveedor_version` (`version`);

ALTER TABLE `producto` 
ADD COLUMN IF NOT EXISTS `version` INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS `lastModifiedBy` VARCHAR(191) NULL,
ADD KEY IF NOT EXISTS `idx_producto_version` (`version`);

ALTER TABLE `pedidocompra` 
ADD COLUMN IF NOT EXISTS `version` INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS `lastModifiedBy` VARCHAR(191) NULL,
ADD KEY IF NOT EXISTS `idx_pedidocompra_version` (`version`);

-- 4. Crear triggers para auditoría automática en proveedores
DELIMITER $$

CREATE TRIGGER IF NOT EXISTS `tr_proveedor_insert` 
AFTER INSERT ON `proveedor` 
FOR EACH ROW 
BEGIN
  INSERT INTO `auditoria` (`id`, `tabla`, `registroId`, `accion`, `datosNuevos`, `usuarioId`, `createdAt`)
  VALUES (UUID(), 'proveedor', NEW.id, 'INSERT', JSON_OBJECT(
    'id', NEW.id,
    'nombre', NEW.nombre,
    'tipoEntidad', NEW.tipoEntidad,
    'numeroIdentificacion', NEW.numeroIdentificacion,
    'activo', NEW.activo
  ), COALESCE(NEW.lastModifiedBy, 'system'), NOW(3));
END$$

CREATE TRIGGER IF NOT EXISTS `tr_proveedor_update` 
AFTER UPDATE ON `proveedor` 
FOR EACH ROW 
BEGIN
  UPDATE `proveedor` SET `version` = `version` + 1 WHERE `id` = NEW.id;
  
  INSERT INTO `auditoria` (`id`, `tabla`, `registroId`, `accion`, `datosAnteriores`, `datosNuevos`, `usuarioId`, `createdAt`)
  VALUES (UUID(), 'proveedor', NEW.id, 'UPDATE', 
    JSON_OBJECT(
      'id', OLD.id,
      'nombre', OLD.nombre,
      'tipoEntidad', OLD.tipoEntidad,
      'numeroIdentificacion', OLD.numeroIdentificacion,
      'activo', OLD.activo,
      'version', OLD.version
    ),
    JSON_OBJECT(
      'id', NEW.id,
      'nombre', NEW.nombre,
      'tipoEntidad', NEW.tipoEntidad,
      'numeroIdentificacion', NEW.numeroIdentificacion,
      'activo', NEW.activo,
      'version', NEW.version
    ), 
    COALESCE(NEW.lastModifiedBy, 'system'), NOW(3));
END$$

CREATE TRIGGER IF NOT EXISTS `tr_proveedor_delete` 
BEFORE DELETE ON `proveedor` 
FOR EACH ROW 
BEGIN
  INSERT INTO `auditoria` (`id`, `tabla`, `registroId`, `accion`, `datosAnteriores`, `usuarioId`, `createdAt`)
  VALUES (UUID(), 'proveedor', OLD.id, 'DELETE', JSON_OBJECT(
    'id', OLD.id,
    'nombre', OLD.nombre,
    'tipoEntidad', OLD.tipoEntidad,
    'numeroIdentificacion', OLD.numeroIdentificacion,
    'activo', OLD.activo,
    'version', OLD.version
  ), 'system', NOW(3));
END$$

DELIMITER ;

-- 5. Crear vista optimizada para consultas de proveedores con productos
CREATE OR REPLACE VIEW `v_proveedores_productos` AS
SELECT 
  p.id as proveedor_id,
  p.nombre as proveedor_nombre,
  p.tipoEntidad,
  p.numeroIdentificacion,
  p.telefono,
  p.email,
  p.activo as proveedor_activo,
  COUNT(DISTINCT pp.productoId) as productos_directos,
  COUNT(DISTINCT pci.productoId) as productos_comprados,
  MAX(pc.fecha) as ultima_compra,
  SUM(pc.total) as total_compras
FROM `proveedor` p
LEFT JOIN `productoproveedor` pp ON p.id = pp.proveedorId AND pp.activo = TRUE
LEFT JOIN `pedidocompra` pc ON p.id = pc.proveedorId
LEFT JOIN `pedidocompraitem` pci ON pc.id = pci.pedidoId
WHERE p.activo = TRUE
GROUP BY p.id, p.nombre, p.tipoEntidad, p.numeroIdentificacion, p.telefono, p.email, p.activo;

-- 6. Crear índices adicionales para optimizar consultas
CREATE INDEX IF NOT EXISTS `idx_pedidocompra_proveedor_fecha` ON `pedidocompra` (`proveedorId`, `fecha`);
CREATE INDEX IF NOT EXISTS `idx_pedidocompraitem_producto_precio` ON `pedidocompraitem` (`productoId`, `precio`);
CREATE INDEX IF NOT EXISTS `idx_movimientoinventario_tipo_fecha` ON `movimientoinventario` (`tipo`, `createdAt`);

-- 7. Insertar datos de ejemplo para la relación producto-proveedor (opcional)
-- Esto se puede ejecutar después de verificar que existen productos y proveedores
-- INSERT INTO `productoproveedor` (`id`, `productoId`, `proveedorId`, `precioCompra`, `activo`)
-- SELECT UUID(), p.id, pr.id, 0.00, TRUE
-- FROM `producto` p
-- CROSS JOIN `proveedor` pr
-- WHERE p.activo = TRUE AND pr.activo = TRUE
-- LIMIT 10;