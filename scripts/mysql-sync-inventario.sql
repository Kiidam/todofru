-- =============================================================
-- Sistema integral de inventario TODAFRU - Sincronización MySQL
-- Ejecutar en MySQL Workbench para alinear la BD con el frontend
-- Incluye:
--  1) Tablas principales (IF NOT EXISTS)
--  2) Triggers para actualizar inventario en movimientos
--  3) Procedimientos almacenados para registrar compras/ventas (JSON)
--  4) Índices y vistas optimizadas para el frontend
--  5) Mecanismos para evitar inventario negativo
-- =============================================================

-- Ajusta el nombre de base de datos si fuera distinto
USE todofru;

-- =============================================================
-- 1. TABLAS PRINCIPALES (creación defensiva)
-- Nota: Si ya existen por Prisma, estas sentencias no alteran nada
--       Se incluyen para entornos limpios o Workbench standalone
-- =============================================================

CREATE TABLE IF NOT EXISTS proveedor (
  id           VARCHAR(191) PRIMARY KEY,
  nombre       VARCHAR(255) NOT NULL,
  ruc          VARCHAR(11) UNIQUE NULL,
  telefono     VARCHAR(50) NULL,
  email        VARCHAR(191) NULL,
  direccion    VARCHAR(255) NULL,
  activo       BOOLEAN NOT NULL DEFAULT TRUE,
  createdAt    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cliente (
  id           VARCHAR(191) PRIMARY KEY,
  nombre       VARCHAR(255) NOT NULL,
  ruc          VARCHAR(11) UNIQUE NULL,
  telefono     VARCHAR(50) NULL,
  email        VARCHAR(191) NULL,
  direccion    VARCHAR(255) NULL,
  contacto     VARCHAR(255) NULL,
  tipoCliente  ENUM('MAYORISTA','MINORISTA') NOT NULL DEFAULT 'MINORISTA',
  activo       BOOLEAN NOT NULL DEFAULT TRUE,
  createdAt    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS producto (
  id               VARCHAR(191) PRIMARY KEY,
  nombre           VARCHAR(255) NOT NULL,
  sku              VARCHAR(191) UNIQUE NULL,
  precio           DOUBLE NOT NULL DEFAULT 0,
  stock            DOUBLE NOT NULL DEFAULT 0,
  stockMinimo      DOUBLE NOT NULL DEFAULT 0,
  tieneIGV         BOOLEAN NOT NULL DEFAULT TRUE,
  activo           BOOLEAN NOT NULL DEFAULT TRUE,
  createdAt        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pedidocompra (
  id            VARCHAR(191) PRIMARY KEY,
  numero        VARCHAR(191) NOT NULL UNIQUE,
  proveedorId   VARCHAR(191) NOT NULL,
  fecha         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fechaEntrega  DATETIME NULL,
  subtotal      DOUBLE NOT NULL DEFAULT 0,
  impuestos     DOUBLE NOT NULL DEFAULT 0,
  total         DOUBLE NOT NULL DEFAULT 0,
  observaciones TEXT NULL,
  numeroGuia    VARCHAR(191) NULL,
  archivoGuia   VARCHAR(191) NULL,
  usuarioId     VARCHAR(191) NOT NULL,
  createdAt     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pc_proveedor FOREIGN KEY (proveedorId) REFERENCES proveedor(id),
  INDEX idx_pc_proveedor (proveedorId),
  INDEX idx_pc_fecha (fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pedidocompraitem (
  id          VARCHAR(191) PRIMARY KEY,
  pedidoId    VARCHAR(191) NOT NULL,
  productoId  VARCHAR(191) NOT NULL,
  cantidad    DOUBLE NOT NULL,
  precio      DOUBLE NOT NULL,
  subtotal    DOUBLE NOT NULL,
  CONSTRAINT fk_pci_pedido FOREIGN KEY (pedidoId) REFERENCES pedidocompra(id) ON DELETE CASCADE,
  CONSTRAINT fk_pci_producto FOREIGN KEY (productoId) REFERENCES producto(id),
  UNIQUE KEY uq_pci_pedido_producto (pedidoId, productoId),
  INDEX idx_pci_pedido (pedidoId),
  INDEX idx_pci_producto (productoId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pedidoventa (
  id            VARCHAR(191) PRIMARY KEY,
  numero        VARCHAR(191) NOT NULL UNIQUE,
  clienteId     VARCHAR(191) NOT NULL,
  fecha         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  subtotal      DOUBLE NOT NULL DEFAULT 0,
  impuestos     DOUBLE NOT NULL DEFAULT 0,
  total         DOUBLE NOT NULL DEFAULT 0,
  estado        ENUM('PENDIENTE','CONFIRMADO','EN_PROCESO','COMPLETADO','ANULADO') NOT NULL DEFAULT 'PENDIENTE',
  observaciones TEXT NULL,
  numeroGuia    VARCHAR(191) NULL,
  archivoGuia   VARCHAR(191) NULL,
  usuarioId     VARCHAR(191) NOT NULL,
  createdAt     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pv_cliente FOREIGN KEY (clienteId) REFERENCES cliente(id),
  INDEX idx_pv_cliente (clienteId),
  INDEX idx_pv_fecha (fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pedidoventaitem (
  id          VARCHAR(191) PRIMARY KEY,
  pedidoId    VARCHAR(191) NOT NULL,
  productoId  VARCHAR(191) NOT NULL,
  cantidad    DOUBLE NOT NULL,
  precio      DOUBLE NOT NULL,
  subtotal    DOUBLE NOT NULL,
  CONSTRAINT fk_pvi_pedido FOREIGN KEY (pedidoId) REFERENCES pedidoventa(id) ON DELETE CASCADE,
  CONSTRAINT fk_pvi_producto FOREIGN KEY (productoId) REFERENCES producto(id),
  UNIQUE KEY uq_pvi_pedido_producto (pedidoId, productoId),
  INDEX idx_pvi_pedido (pedidoId),
  INDEX idx_pvi_producto (productoId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla de movimientos (si ya existe por Prisma, esto no se ejecuta)
CREATE TABLE IF NOT EXISTS movimientoinventario (
  productoId       VARCHAR(191) NOT NULL,
  tipo             ENUM('ENTRADA','SALIDA','AJUSTE') NOT NULL,
  cantidad         DOUBLE NOT NULL,
  cantidadAnterior DOUBLE NOT NULL,
  cantidadNueva    DOUBLE NOT NULL,
  precio           DOUBLE NULL,
  motivo           VARCHAR(255) NULL,
  numeroGuia       VARCHAR(191) NULL,
  pedidoCompraId   VARCHAR(191) NULL,
  pedidoVentaId    VARCHAR(191) NULL,
  usuarioId        VARCHAR(191) NOT NULL,
  createdAt        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_mi_producto (productoId),
  INDEX idx_mi_tipo (tipo),
  INDEX idx_mi_created (createdAt),
  CONSTRAINT fk_mi_producto FOREIGN KEY (productoId) REFERENCES producto(id),
  CONSTRAINT fk_mi_pc FOREIGN KEY (pedidoCompraId) REFERENCES pedidocompra(id),
  CONSTRAINT fk_mi_pv FOREIGN KEY (pedidoVentaId) REFERENCES pedidoventa(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================
-- 2. FUNCIONES Y TRIGGERS DE INVENTARIO
-- =============================================================

-- Función para generar número de pedido único estilo PV-YYYY-XXXXXX / PC-YYYY-XXXXXX
DROP FUNCTION IF EXISTS fn_generar_numero_pedido;
DELIMITER $$
CREATE FUNCTION fn_generar_numero_pedido(prefix VARCHAR(10))
RETURNS VARCHAR(50)
DETERMINISTIC
BEGIN
  RETURN CONCAT(prefix, '-', YEAR(CURDATE()), '-', LPAD(FLOOR(RAND() * 1000000), 6, '0'));
END $$
DELIMITER ;

-- Evitar inventario negativo y validar cantidad antes de insertar movimiento
DROP TRIGGER IF EXISTS bi_movimiento_inventario_validate;
DELIMITER $$
CREATE TRIGGER bi_movimiento_inventario_validate
BEFORE INSERT ON movimientoinventario
FOR EACH ROW
BEGIN
  IF NEW.cantidad < 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cantidad negativa no permitida';
  END IF;

  IF NEW.tipo = 'SALIDA' AND NEW.cantidadNueva < 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Inventario no puede ser negativo';
  END IF;
END $$
DELIMITER ;

-- Actualizar stock de producto basado en la nueva cantidad del movimiento
DROP TRIGGER IF EXISTS ai_movimiento_inventario_update_stock;
DELIMITER $$
CREATE TRIGGER ai_movimiento_inventario_update_stock
AFTER INSERT ON movimientoinventario
FOR EACH ROW
BEGIN
  UPDATE producto SET stock = NEW.cantidadNueva WHERE id = NEW.productoId;
END $$
DELIMITER ;

-- =============================================================
-- 3. PROCEDIMIENTOS ALMACENADOS (JSON) PARA COMPRAS Y VENTAS
--    Estos procedimientos registran pedidos + items + movimientos
--    y se apoyan en triggers para actualizar el stock
-- =============================================================

-- Registrar compra con items en JSON
-- Formato items_json: 
--   [ { "productoId": "...", "cantidad": 5, "precio": 3.5 }, ... ]
DROP PROCEDURE IF EXISTS sp_registrar_compra;
DELIMITER $$
CREATE PROCEDURE sp_registrar_compra(
  IN p_proveedorId VARCHAR(191),
  IN p_fecha DATE,
  IN p_observaciones TEXT,
  IN p_items_json JSON,
  IN p_usuarioId VARCHAR(191),
  OUT p_pedidoId VARCHAR(191)
)
BEGIN
  DECLARE v_pedidoId VARCHAR(191);
  DECLARE v_numero VARCHAR(50);
  DECLARE v_subtotal DOUBLE DEFAULT 0;
  DECLARE v_impuestos DOUBLE DEFAULT 0;
  DECLARE v_total DOUBLE DEFAULT 0;

  SET v_pedidoId = REPLACE(UUID(), '-', '');
  SET v_numero = fn_generar_numero_pedido('PC');

  START TRANSACTION;

  INSERT INTO pedidocompra (
    id, numero, proveedorId, fecha, subtotal, impuestos, total, observaciones, usuarioId, createdAt, updatedAt
  ) VALUES (
    v_pedidoId, v_numero, p_proveedorId, COALESCE(p_fecha, CURDATE()), 0, 0, 0, p_observaciones, p_usuarioId, NOW(), NOW()
  );

  -- Calcular totales usando JSON_TABLE y si el producto tiene IGV
  SELECT 
    COALESCE(SUM(jt.cantidad * jt.precio), 0) AS subtotal_calc,
    COALESCE(SUM(CASE WHEN prod.tieneIGV THEN jt.cantidad * jt.precio * 0.18 ELSE 0 END), 0) AS impuestos_calc
  INTO v_subtotal, v_impuestos
  FROM JSON_TABLE(p_items_json, '$[*]'
    COLUMNS (
      productoId VARCHAR(191) PATH '$.productoId',
      cantidad   DOUBLE       PATH '$.cantidad',
      precio     DOUBLE       PATH '$.precio'
    )
  ) jt
  JOIN producto prod ON prod.id = jt.productoId;

  SET v_total = ROUND(v_subtotal + v_impuestos, 2);

  UPDATE pedidocompra SET subtotal = ROUND(v_subtotal,2), impuestos = ROUND(v_impuestos,2), total = v_total
  WHERE id = v_pedidoId;

  -- Insertar items
  INSERT INTO pedidocompraitem (id, pedidoId, productoId, cantidad, precio, subtotal)
  SELECT REPLACE(UUID(), '-', ''), v_pedidoId, jt.productoId, jt.cantidad, jt.precio, ROUND(jt.cantidad * jt.precio, 2)
  FROM JSON_TABLE(p_items_json, '$[*]'
    COLUMNS (
      productoId VARCHAR(191) PATH '$.productoId',
      cantidad   DOUBLE       PATH '$.cantidad',
      precio     DOUBLE       PATH '$.precio'
    )
  ) jt;

  -- Insertar movimientos (ENTRADA) y dejar que el trigger actualice el stock
  INSERT INTO movimientoinventario (
    productoId, tipo, cantidad, cantidadAnterior, cantidadNueva, precio, motivo, pedidoCompraId, usuarioId, createdAt
  )
  SELECT 
    jt.productoId,
    'ENTRADA',
    jt.cantidad,
    prod.stock,
    prod.stock + jt.cantidad,
    jt.precio,
    'Compra',
    v_pedidoId,
    p_usuarioId,
    NOW()
  FROM JSON_TABLE(p_items_json, '$[*]'
    COLUMNS (
      productoId VARCHAR(191) PATH '$.productoId',
      cantidad   DOUBLE       PATH '$.cantidad',
      precio     DOUBLE       PATH '$.precio'
    )
  ) jt
  JOIN producto prod ON prod.id = jt.productoId;

  COMMIT;
  SET p_pedidoId = v_pedidoId;
END $$
DELIMITER ;

-- Registrar venta con items en JSON
-- Formato items_json:
--   [ { "productoId": "...", "cantidad": 3, "precio": 5.0 }, ... ]
DROP PROCEDURE IF EXISTS sp_registrar_venta;
DELIMITER $$
CREATE PROCEDURE sp_registrar_venta(
  IN p_clienteId VARCHAR(191),
  IN p_fecha DATE,
  IN p_motivo VARCHAR(255),
  IN p_items_json JSON,
  IN p_usuarioId VARCHAR(191),
  OUT p_pedidoId VARCHAR(191)
)
BEGIN
  DECLARE v_pedidoId VARCHAR(191);
  DECLARE v_numero VARCHAR(50);
  DECLARE v_subtotal DOUBLE DEFAULT 0;
  DECLARE v_impuestos DOUBLE DEFAULT 0;
  DECLARE v_total DOUBLE DEFAULT 0;
  DECLARE v_insuficientes INT DEFAULT 0;

  SET v_pedidoId = REPLACE(UUID(), '-', '');
  SET v_numero = fn_generar_numero_pedido('PV');

  -- Pre-validación de stock suficiente
  SELECT COUNT(*) INTO v_insuficientes
  FROM JSON_TABLE(p_items_json, '$[*]'
    COLUMNS (
      productoId VARCHAR(191) PATH '$.productoId',
      cantidad   DOUBLE       PATH '$.cantidad'
    )
  ) jt
  JOIN producto prod ON prod.id = jt.productoId
  WHERE prod.stock < jt.cantidad;

  IF v_insuficientes > 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Stock insuficiente para uno o más productos';
  END IF;

  START TRANSACTION;

  INSERT INTO pedidoventa (
    id, numero, clienteId, fecha, subtotal, impuestos, total, estado, observaciones, usuarioId, createdAt, updatedAt
  ) VALUES (
    v_pedidoId, v_numero, p_clienteId, COALESCE(p_fecha, CURDATE()), 0, 0, 0, 'PENDIENTE', p_motivo, p_usuarioId, NOW(), NOW()
  );

  -- Calcular totales (IGV 18% para productos con tieneIGV)
  SELECT 
    COALESCE(SUM(jt.cantidad * jt.precio), 0) AS subtotal_calc,
    COALESCE(SUM(CASE WHEN prod.tieneIGV THEN jt.cantidad * jt.precio * 0.18 ELSE 0 END), 0) AS impuestos_calc
  INTO v_subtotal, v_impuestos
  FROM JSON_TABLE(p_items_json, '$[*]'
    COLUMNS (
      productoId VARCHAR(191) PATH '$.productoId',
      cantidad   DOUBLE       PATH '$.cantidad',
      precio     DOUBLE       PATH '$.precio'
    )
  ) jt
  JOIN producto prod ON prod.id = jt.productoId;

  SET v_total = ROUND(v_subtotal + v_impuestos, 2);

  UPDATE pedidoventa SET subtotal = ROUND(v_subtotal,2), impuestos = ROUND(v_impuestos,2), total = v_total
  WHERE id = v_pedidoId;

  -- Insertar items
  INSERT INTO pedidoventaitem (id, pedidoId, productoId, cantidad, precio, subtotal)
  SELECT REPLACE(UUID(), '-', ''), v_pedidoId, jt.productoId, jt.cantidad, jt.precio, ROUND(jt.cantidad * jt.precio, 2)
  FROM JSON_TABLE(p_items_json, '$[*]'
    COLUMNS (
      productoId VARCHAR(191) PATH '$.productoId',
      cantidad   DOUBLE       PATH '$.cantidad',
      precio     DOUBLE       PATH '$.precio'
    )
  ) jt;

  -- Insertar movimientos (SALIDA) y dejar que el trigger actualice el stock
  INSERT INTO movimientoinventario (
    productoId, tipo, cantidad, cantidadAnterior, cantidadNueva, precio, motivo, pedidoVentaId, usuarioId, createdAt
  )
  SELECT 
    jt.productoId,
    'SALIDA',
    jt.cantidad,
    prod.stock,
    prod.stock - jt.cantidad,
    jt.precio,
    'Venta',
    v_pedidoId,
    p_usuarioId,
    NOW()
  FROM JSON_TABLE(p_items_json, '$[*]'
    COLUMNS (
      productoId VARCHAR(191) PATH '$.productoId',
      cantidad   DOUBLE       PATH '$.cantidad',
      precio     DOUBLE       PATH '$.precio'
    )
  ) jt
  JOIN producto prod ON prod.id = jt.productoId;

  COMMIT;
  SET p_pedidoId = v_pedidoId;
END $$
DELIMITER ;

-- =============================================================
-- 4. ÍNDICES Y VISTAS OPTIMIZADAS PARA EL FRONTEND
-- =============================================================

-- Índices útiles (idempotentes)
CREATE INDEX IF NOT EXISTS idx_producto_activo ON producto(activo);
CREATE INDEX IF NOT EXISTS idx_producto_sku ON producto(sku);
CREATE INDEX IF NOT EXISTS idx_proveedor_nombre ON proveedor(nombre);
CREATE INDEX IF NOT EXISTS idx_cliente_nombre ON cliente(nombre);

-- Vista de inventario para el dashboard
CREATE OR REPLACE VIEW vista_inventario_producto AS
SELECT 
  p.id,
  p.nombre,
  p.sku,
  p.precio,
  p.stock,
  p.stockMinimo,
  p.tieneIGV,
  p.activo,
  CASE 
    WHEN p.stock = 0 THEN 'Agotado'
    WHEN p.stock <= p.stockMinimo THEN 'Stock Bajo'
    ELSE 'Normal'
  END AS estado,
  (p.stock * p.precio) AS valorStock,
  p.updatedAt
FROM producto p;

-- Vista de resumen de compras
CREATE OR REPLACE VIEW vista_pedidos_compra_resumen AS
SELECT 
  pc.id,
  pc.numero,
  pc.fecha,
  pr.id AS proveedorId,
  pr.nombre AS proveedor,
  pc.subtotal,
  pc.impuestos,
  pc.total,
  COUNT(pci.id) AS items
FROM pedidocompra pc
JOIN proveedor pr ON pr.id = pc.proveedorId
LEFT JOIN pedidocompraitem pci ON pci.pedidoId = pc.id
GROUP BY pc.id;

-- Vista de resumen de ventas
CREATE OR REPLACE VIEW vista_pedidos_venta_resumen AS
SELECT 
  pv.id,
  pv.numero,
  pv.fecha,
  cl.id AS clienteId,
  cl.nombre AS cliente,
  pv.subtotal,
  pv.impuestos,
  pv.total,
  pv.estado,
  COUNT(pvi.id) AS items
FROM pedidoventa pv
JOIN cliente cl ON cl.id = pv.clienteId
LEFT JOIN pedidoventaitem pvi ON pvi.pedidoId = pv.id
GROUP BY pv.id;

-- =============================================================
-- 5. CONSULTAS DE PRUEBA (ejecuta según necesidad)
-- =============================================================

-- Inventario: refleja inmediatamente cambios
-- SELECT * FROM vista_inventario_producto ORDER BY nombre;

-- Compras recientes
-- SELECT * FROM vista_pedidos_compra_resumen ORDER BY fecha DESC LIMIT 20;

-- Ventas recientes
-- SELECT * FROM vista_pedidos_venta_resumen ORDER BY fecha DESC LIMIT 20;

-- =============================================================
-- 6. NOTAS DE INTEGRACIÓN
-- - Los triggers actualizan el stock usando la cantidadNueva del movimiento
--   para no duplicar la lógica ya presente en el backend.
-- - Los procedimientos aceptan arrays JSON (MySQL 8+) y realizan
--   validaciones de stock, cálculos de IGV y creación de movimientos.
-- - Si tu backend usa Prisma (ya lo hace), estos objetos son compatibles
--   con las tablas existentes; los CREATE IF NOT EXISTS son seguros.
-- - Evitamos inventario negativo con validación y SIGNAL en triggers/ventas.
-- =============================================================