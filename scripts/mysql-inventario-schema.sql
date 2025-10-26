-- MySQL Inventario: esquema, relaciones, triggers y procedimientos
-- Ejecutar en MySQL Workbench

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Crear base de datos
CREATE DATABASE IF NOT EXISTS `todofru` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE `todofru`;

-- Tablas básicas
CREATE TABLE IF NOT EXISTS `categorias` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(100) NOT NULL UNIQUE,
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `unidades_medida` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(50) NOT NULL,
  `simbolo` VARCHAR(10) NOT NULL UNIQUE,
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `productos` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(150) NOT NULL,
  `sku` VARCHAR(50) NULL UNIQUE,
  `categoria_id` BIGINT UNSIGNED NULL,
  `unidad_medida_id` BIGINT UNSIGNED NULL,
  `precio` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `stock_minimo` DECIMAL(10,3) NOT NULL DEFAULT 0,
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_productos_categoria` FOREIGN KEY (`categoria_id`) REFERENCES `categorias`(`id`) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT `fk_productos_um` FOREIGN KEY (`unidad_medida_id`) REFERENCES `unidades_medida`(`id`) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

-- Stock consolidado por producto
CREATE TABLE IF NOT EXISTS `inventarios` (
  `producto_id` BIGINT UNSIGNED NOT NULL,
  `stock` DECIMAL(10,3) NOT NULL DEFAULT 0,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`producto_id`),
  CONSTRAINT `fk_inventarios_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Movimientos de inventario (histórico)
CREATE TABLE IF NOT EXISTS `movimientos_inventario` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `producto_id` BIGINT UNSIGNED NOT NULL,
  `tipo` ENUM('ENTRADA','SALIDA','AJUSTE') NOT NULL,
  `cantidad` DECIMAL(10,3) NOT NULL,
  `motivo` VARCHAR(200) NULL,
  `usuario` VARCHAR(100) NULL,
  `fecha` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `stock_anterior` DECIMAL(10,3) NULL,
  `stock_nuevo` DECIMAL(10,3) NULL,
  `referencia_tipo` ENUM('COMPRA','VENTA','AJUSTE') NULL,
  `referencia_id` BIGINT UNSIGNED NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_mov_prod_fecha` (`producto_id`, `fecha`),
  CONSTRAINT `fk_movimientos_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Entidades comerciales mínimas
CREATE TABLE IF NOT EXISTS `proveedores` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(150) NOT NULL,
  `ruc` VARCHAR(20) NULL,
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `clientes` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(150) NOT NULL,
  `documento` VARCHAR(20) NULL,
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

-- Compras
CREATE TABLE IF NOT EXISTS `compras` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `proveedor_id` BIGINT UNSIGNED NULL,
  `fecha` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `estado` ENUM('REGISTRADA','ANULADA') NOT NULL DEFAULT 'REGISTRADA',
  `total` DECIMAL(12,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_compras_proveedor` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores`(`id`) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `compra_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `compra_id` BIGINT UNSIGNED NOT NULL,
  `producto_id` BIGINT UNSIGNED NOT NULL,
  `cantidad` DECIMAL(10,3) NOT NULL,
  `precio_unitario` DECIMAL(10,2) NOT NULL,
  `total` DECIMAL(12,2) GENERATED ALWAYS AS (`cantidad` * `precio_unitario`) STORED,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_citems_compra` FOREIGN KEY (`compra_id`) REFERENCES `compras`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_citems_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Ventas
CREATE TABLE IF NOT EXISTS `ventas` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `cliente_id` BIGINT UNSIGNED NULL,
  `fecha` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `estado` ENUM('REGISTRADA','ANULADA') NOT NULL DEFAULT 'REGISTRADA',
  `total` DECIMAL(12,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_ventas_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `venta_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `venta_id` BIGINT UNSIGNED NOT NULL,
  `producto_id` BIGINT UNSIGNED NOT NULL,
  `cantidad` DECIMAL(10,3) NOT NULL,
  `precio_unitario` DECIMAL(10,2) NOT NULL,
  `total` DECIMAL(12,2) GENERATED ALWAYS AS (`cantidad` * `precio_unitario`) STORED,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_vitems_venta` FOREIGN KEY (`venta_id`) REFERENCES `ventas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_vitems_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

-- Procedimiento para aplicar movimientos al inventario y registrar histórico
DROP PROCEDURE IF EXISTS `sp_movimiento_inventario`;
DELIMITER $$
CREATE PROCEDURE `sp_movimiento_inventario`(
  IN p_producto_id BIGINT UNSIGNED,
  IN p_tipo ENUM('ENTRADA','SALIDA','AJUSTE'),
  IN p_cantidad DECIMAL(10,3),
  IN p_motivo VARCHAR(200),
  IN p_referencia_tipo ENUM('COMPRA','VENTA','AJUSTE'),
  IN p_referencia_id BIGINT UNSIGNED
)
BEGIN
  DECLARE v_stock_anterior DECIMAL(10,3) DEFAULT 0;
  DECLARE v_stock_nuevo DECIMAL(10,3) DEFAULT 0;

  -- asegurar fila en inventarios
  INSERT IGNORE INTO `inventarios`(`producto_id`, `stock`) VALUES (p_producto_id, 0);
  SELECT `stock` INTO v_stock_anterior FROM `inventarios` WHERE `producto_id` = p_producto_id FOR UPDATE;

  IF p_tipo = 'ENTRADA' THEN
    SET v_stock_nuevo = v_stock_anterior + p_cantidad;
  ELSEIF p_tipo = 'SALIDA' THEN
    SET v_stock_nuevo = v_stock_anterior - p_cantidad;
    IF v_stock_nuevo < 0 THEN
      SET v_stock_nuevo = 0; -- evita negativos; ajustar según reglas de negocio
    END IF;
  ELSEIF p_tipo = 'AJUSTE' THEN
    SET v_stock_nuevo = p_cantidad; -- AJUSTE interpreta cantidad como nuevo stock
  END IF;

  UPDATE `inventarios` SET `stock` = v_stock_nuevo WHERE `producto_id` = p_producto_id;

  INSERT INTO `movimientos_inventario`(
    `producto_id`, `tipo`, `cantidad`, `motivo`, `usuario`, `fecha`, `stock_anterior`, `stock_nuevo`, `referencia_tipo`, `referencia_id`
  ) VALUES (
    p_producto_id, p_tipo, p_cantidad, p_motivo, NULL, NOW(), v_stock_anterior, v_stock_nuevo, p_referencia_tipo, p_referencia_id
  );
END$$
DELIMITER ;

-- Triggers de compras: ajustan inventario y total
DROP TRIGGER IF EXISTS trg_compra_items_ai;
DELIMITER $$
CREATE TRIGGER trg_compra_items_ai AFTER INSERT ON `compra_items`
FOR EACH ROW
BEGIN
  CALL `sp_movimiento_inventario`(NEW.producto_id, 'ENTRADA', NEW.cantidad, CONCAT('Compra #', NEW.compra_id), 'COMPRA', NEW.compra_id);
  UPDATE `compras` SET `total` = (SELECT COALESCE(SUM(`total`),0) FROM `compra_items` WHERE `compra_id` = NEW.compra_id) WHERE `id` = NEW.compra_id;
END$$
DELIMITER ;

DROP TRIGGER IF EXISTS trg_compra_items_au;
DELIMITER $$
CREATE TRIGGER trg_compra_items_au AFTER UPDATE ON `compra_items`
FOR EACH ROW
BEGIN
  IF NEW.cantidad <> OLD.cantidad THEN
    CALL `sp_movimiento_inventario`(NEW.producto_id, 'ENTRADA', NEW.cantidad - OLD.cantidad, CONCAT('Ajuste compra #', NEW.compra_id), 'COMPRA', NEW.compra_id);
  END IF;
  UPDATE `compras` SET `total` = (SELECT COALESCE(SUM(`total`),0) FROM `compra_items` WHERE `compra_id` = NEW.compra_id) WHERE `id` = NEW.compra_id;
END$$
DELIMITER ;

DROP TRIGGER IF EXISTS trg_compra_items_ad;
DELIMITER $$
CREATE TRIGGER trg_compra_items_ad AFTER DELETE ON `compra_items`
FOR EACH ROW
BEGIN
  CALL `sp_movimiento_inventario`(OLD.producto_id, 'SALIDA', OLD.cantidad, CONCAT('Eliminación item compra #', OLD.compra_id), 'COMPRA', OLD.compra_id);
  UPDATE `compras` SET `total` = (SELECT COALESCE(SUM(`total`),0) FROM `compra_items` WHERE `compra_id` = OLD.compra_id) WHERE `id` = OLD.compra_id;
END$$
DELIMITER ;

-- Triggers de ventas: ajustan inventario y total
DROP TRIGGER IF EXISTS trg_venta_items_ai;
DELIMITER $$
CREATE TRIGGER trg_venta_items_ai AFTER INSERT ON `venta_items`
FOR EACH ROW
BEGIN
  CALL `sp_movimiento_inventario`(NEW.producto_id, 'SALIDA', NEW.cantidad, CONCAT('Venta #', NEW.venta_id), 'VENTA', NEW.venta_id);
  UPDATE `ventas` SET `total` = (SELECT COALESCE(SUM(`total`),0) FROM `venta_items` WHERE `venta_id` = NEW.venta_id) WHERE `id` = NEW.venta_id;
END$$
DELIMITER ;

DROP TRIGGER IF EXISTS trg_venta_items_au;
DELIMITER $$
CREATE TRIGGER trg_venta_items_au AFTER UPDATE ON `venta_items`
FOR EACH ROW
BEGIN
  IF NEW.cantidad <> OLD.cantidad THEN
    IF NEW.cantidad > OLD.cantidad THEN
      CALL `sp_movimiento_inventario`(NEW.producto_id, 'SALIDA', NEW.cantidad - OLD.cantidad, CONCAT('Ajuste venta #', NEW.venta_id), 'VENTA', NEW.venta_id);
    ELSE
      CALL `sp_movimiento_inventario`(NEW.producto_id, 'ENTRADA', OLD.cantidad - NEW.cantidad, CONCAT('Ajuste venta #', NEW.venta_id), 'VENTA', NEW.venta_id);
    END IF;
  END IF;
  UPDATE `ventas` SET `total` = (SELECT COALESCE(SUM(`total`),0) FROM `venta_items` WHERE `venta_id` = NEW.venta_id) WHERE `id` = NEW.venta_id;
END$$
DELIMITER ;

DROP TRIGGER IF EXISTS trg_venta_items_ad;
DELIMITER $$
CREATE TRIGGER trg_venta_items_ad AFTER DELETE ON `venta_items`
FOR EACH ROW
BEGIN
  CALL `sp_movimiento_inventario`(OLD.producto_id, 'ENTRADA', OLD.cantidad, CONCAT('Eliminación item venta #', OLD.venta_id), 'VENTA', OLD.venta_id);
  UPDATE `ventas` SET `total` = (SELECT COALESCE(SUM(`total`),0) FROM `venta_items` WHERE `venta_id` = OLD.venta_id) WHERE `id` = OLD.venta_id;
END$$
DELIMITER ;

-- Datos iniciales mínimos
INSERT INTO `categorias` (`nombre`) VALUES 
  ('Frutas') ON DUPLICATE KEY UPDATE `nombre`=VALUES(`nombre`);
INSERT INTO `categorias` (`nombre`) VALUES 
  ('Verduras') ON DUPLICATE KEY UPDATE `nombre`=VALUES(`nombre`);

INSERT INTO `unidades_medida` (`nombre`, `simbolo`) VALUES 
  ('Kilogramo','kg') ON DUPLICATE KEY UPDATE `simbolo`=VALUES(`simbolo`);
INSERT INTO `unidades_medida` (`nombre`, `simbolo`) VALUES 
  ('Unidad','und') ON DUPLICATE KEY UPDATE `simbolo`=VALUES(`simbolo`);

-- Productos de ejemplo
INSERT INTO `productos`(`nombre`,`sku`,`categoria_id`,`unidad_medida_id`,`precio`,`stock_minimo`,`activo`)
SELECT 'Manzana Roja','APP-RED-001', c.id, u.id, 3.50, 10, 1 FROM `categorias` c, `unidades_medida` u 
WHERE c.nombre='Frutas' AND u.simbolo='kg'
ON DUPLICATE KEY UPDATE `nombre`=VALUES(`nombre`);

INSERT INTO `productos`(`nombre`,`sku`,`categoria_id`,`unidad_medida_id`,`precio`,`stock_minimo`,`activo`)
SELECT 'Plátano','BAN-STD-010', c.id, u.id, 2.20, 12, 1 FROM `categorias` c, `unidades_medida` u 
WHERE c.nombre='Frutas' AND u.simbolo='kg'
ON DUPLICATE KEY UPDATE `nombre`=VALUES(`nombre`);

INSERT INTO `productos`(`nombre`,`sku`,`categoria_id`,`unidad_medida_id`,`precio`,`stock_minimo`,`activo`)
SELECT 'Lechuga','VEG-LEC-005', c.id, u.id, 1.80, 5, 1 FROM `categorias` c, `unidades_medida` u 
WHERE c.nombre='Verduras' AND u.simbolo='und'
ON DUPLICATE KEY UPDATE `nombre`=VALUES(`nombre`);

-- Inicializar inventario en 0 para productos existentes
INSERT IGNORE INTO `inventarios`(`producto_id`,`stock`)
SELECT `id`, 0 FROM `productos`;

-- Proveedor y cliente de prueba
INSERT INTO `proveedores`(`nombre`,`ruc`) VALUES ('Proveedor Demo','20123456789') ON DUPLICATE KEY UPDATE `nombre`=VALUES(`nombre`);
INSERT INTO `clientes`(`nombre`,`documento`) VALUES ('Cliente Demo','12345678') ON DUPLICATE KEY UPDATE `nombre`=VALUES(`nombre`);

-- Transacciones de prueba
-- Compra: aumenta stock
INSERT INTO `compras`(`proveedor_id`) SELECT `id` FROM `proveedores` WHERE `nombre`='Proveedor Demo';
SET @compraId = LAST_INSERT_ID();
INSERT INTO `compra_items`(`compra_id`,`producto_id`,`cantidad`,`precio_unitario`)
SELECT @compraId, p.id, 25, p.precio FROM `productos` p WHERE p.sku='APP-RED-001';

-- Venta: reduce stock
INSERT INTO `ventas`(`cliente_id`) SELECT `id` FROM `clientes` WHERE `nombre`='Cliente Demo';
SET @ventaId = LAST_INSERT_ID();
INSERT INTO `venta_items`(`venta_id`,`producto_id`,`cantidad`,`precio_unitario`)
SELECT @ventaId, p.id, 5, p.precio FROM `productos` p WHERE p.sku='APP-RED-001';

-- Verificación rápida
SELECT p.sku, i.stock AS stock_actual
FROM `productos` p
JOIN `inventarios` i ON i.producto_id = p.id
ORDER BY p.sku;