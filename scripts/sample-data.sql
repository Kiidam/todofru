-- TodaFru – Datos de ejemplo para MySQL Workbench
-- Este script pobla entidades clave: usuarios, unidades, categorías, productos,
-- proveedores, clientes, razones sociales, compras/ventas, movimientos e
-- integraciones financieras. Está alineado con el esquema Prisma actual.

-- IMPORTANTE:
-- 1) Selecciona tu base de datos antes de ejecutar:
--    USE <tu_base_de_datos>;
-- 2) Ejecuta en una BD limpia o una vez. Si lo corres nuevamente,
--    podrían surgir conflictos por claves únicas.

START TRANSACTION;

-- ==== USUARIOS ==============================================================
INSERT INTO `User` (id, name, email, role, createdAt, updatedAt)
VALUES 
('usr_admin', 'Administrador', 'admin@todafru.com', 'ADMIN', NOW(), NOW()),
('usr_oper',  'Operaciones',  'oper@todafru.com',  'USER',  NOW(), NOW());

-- ==== UNIDADES, CATEGORÍAS, MARCAS =========================================
INSERT INTO `UnidadMedida` (id, nombre, simbolo, activo, createdAt, updatedAt)
VALUES 
('um_kg', 'Kilogramo', 'kg', 1, NOW(), NOW()),
('um_un', 'Unidad',    'un', 1, NOW(), NOW());

INSERT INTO `Categoria` (id, nombre, activo, createdAt, updatedAt)
VALUES ('cat_verduras', 'Verduras', 1, NOW(), NOW());

INSERT INTO `Marca` (id, nombre, activo, createdAt, updatedAt)
VALUES ('mar_sinmarca', 'Sin Marca', 1, NOW(), NOW());

-- ==== PROVEEDOR Y CLIENTE ==================================================
INSERT INTO `Proveedor` (id, nombre, ruc, telefono, email, direccion, activo, createdAt, updatedAt)
VALUES ('prov_sanjose', 'Agrícola San José S.A.C.', '20123456789', '012-345678', 'contacto@san-jose.com', 'Av. Productores 123', 1, NOW(), NOW());

INSERT INTO `Cliente` (id, nombre, ruc, telefono, email, direccion, activo, createdAt, updatedAt)
VALUES ('cli_bazar', 'Bazar Las Flores', '10456789123', '987-654321', 'ventas@bazar.com', 'Jr. Comercio 456', 1, NOW(), NOW());

-- ==== RAZÓN SOCIAL DE LA EMPRESA ===========================================
INSERT INTO `RazonSocial` (id, nombre, ruc, direccion, telefono, email, tipoEmpresa, activo, createdAt, updatedAt)
VALUES ('rs_todafru', 'TodaFru S.A.C.', '20600123456', 'Av. Central 1000', '01-2345678', 'contacto@todafru.com', 'COMPANY', 1, NOW(), NOW());

-- ==== PRODUCTOS =============================================================
INSERT INTO `Producto` (
  id, nombre, sku, descripcion,
  categoriaId, unidadMedidaId, unidadCosteoId, marcaId,
  precio, porcentajeMerma, stock, stockMinimo, perecedero, tieneIGV,
  activo, createdAt, updatedAt
) VALUES
('prod_esp_baby', 'Espinaca Baby', 'ESP-BABY-001', 'Espinaca fresca baby',
 'cat_verduras', 'um_kg', 'um_kg', 'mar_sinmarca',
 8.50, 2.0, 0, 5, 1, 1,
 1, NOW(), NOW()),
('prod_tomate', 'Tomate', 'TOM-001', 'Tomate rojo fresco',
 'cat_verduras', 'um_kg', 'um_kg', 'mar_sinmarca',
 6.20, 3.0, 0, 8, 1, 1,
 1, NOW(), NOW());

-- ==== PRECIOS POR RAZÓN SOCIAL (OPCIONAL) ==================================
INSERT INTO `ProductoPrecioRazonSocial` (
  id, productoId, razonSocialId, precio, activo, createdAt, updatedAt
) VALUES
('pp_rs_esp', 'prod_esp_baby', 'rs_todafru', 9.00, 1, NOW(), NOW()),
('pp_rs_tom', 'prod_tomate',   'rs_todafru', 6.80, 1, NOW(), NOW());

-- ==== PEDIDO DE COMPRA + ITEMS + MOVIMIENTOS (ENTRADA) =====================
INSERT INTO `PedidoCompra` (
  id, numero, proveedorId, fechaEntrega, subtotal, impuestos, total,
  estado, observaciones, usuarioId, numeroGuia, archivoGuia, createdAt, updatedAt
) VALUES (
  'pc_0001', 'PC-0001', 'prov_sanjose', DATE_ADD(CURDATE(), INTERVAL 2 DAY),
  17.00, 0.00, 17.00, 'CONFIRMADO', 'Compra inicial de prueba',
  'usr_oper', NULL, NULL, NOW(), NOW()
);

INSERT INTO `PedidoCompraItem` (id, pedidoId, productoId, cantidad, precio, subtotal) VALUES
('pci_0001', 'pc_0001', 'prod_esp_baby', 2.0, 2.00, 4.00),
('pci_0002', 'pc_0001', 'prod_tomate',   2.0, 6.50, 13.00);

INSERT INTO `MovimientoInventario` (
  id, productoId, tipo, cantidad, cantidadAnterior, cantidadNueva,
  precio, motivo, numeroGuia, archivoGuia, pedidoCompraId, usuarioId, createdAt
) VALUES
('mov_in_esp_0001', 'prod_esp_baby', 'ENTRADA', 2.0, 0.0, 2.0, 2.00, 'Compra PC-0001', NULL, NULL, 'pc_0001', 'usr_oper', NOW()),
('mov_in_tom_0001', 'prod_tomate',   'ENTRADA', 2.0, 0.0, 2.0, 6.50, 'Compra PC-0001', NULL, NULL, 'pc_0001', 'usr_oper', NOW());

-- ==== CUENTA POR PAGAR (OPCIONAL) ==========================================
INSERT INTO `CuentaPorPagar` (
  id, numero, proveedorId, pedidoCompraId, monto, montoAbonado, saldo,
  fechaEmision, fechaVencimiento, estado, usuarioId, createdAt, updatedAt
) VALUES (
  'cpp_0001', 'CP-0001', 'prov_sanjose', 'pc_0001', 17.00, 0.00, 17.00,
  NOW(), DATE_ADD(CURDATE(), INTERVAL 15 DAY), 'PENDIENTE', 'usr_oper', NOW(), NOW()
);

-- ==== PEDIDO DE VENTA + ITEMS + MOVIMIENTOS (SALIDA) =======================
INSERT INTO `PedidoVenta` (
  id, numero, clienteId, fechaEntrega, subtotal, impuestos, total,
  estado, observaciones, usuarioId, numeroGuia, archivoGuia, createdAt, updatedAt
) VALUES (
  'pv_0001', 'PV-0001', 'cli_bazar', DATE_ADD(CURDATE(), INTERVAL 1 DAY),
  12.00, 0.00, 12.00, 'CONFIRMADO', 'Venta de prueba',
  'usr_oper', NULL, NULL, NOW(), NOW()
);

INSERT INTO `PedidoVentaItem` (id, pedidoId, productoId, cantidad, subtotal) VALUES
('pvi_0001', 'pv_0001', 'prod_esp_baby', 1.0, 9.00),
('pvi_0002', 'pv_0001', 'prod_tomate',   0.5, 3.00);

INSERT INTO `MovimientoInventario` (
  id, productoId, tipo, cantidad, cantidadAnterior, cantidadNueva,
  precio, motivo, numeroGuia, archivoGuia, pedidoVentaId, usuarioId, createdAt
) VALUES
('mov_out_esp_0001', 'prod_esp_baby', 'SALIDA', 1.0, 2.0, 1.0, 9.00, 'Venta PV-0001', NULL, NULL, 'pv_0001', 'usr_oper', NOW()),
('mov_out_tom_0001', 'prod_tomate',   'SALIDA', 0.5, 2.0, 1.5, 6.00, 'Venta PV-0001', NULL, NULL, 'pv_0001', 'usr_oper', NOW());

-- ==== CUENTA POR COBRAR (OPCIONAL) =========================================
INSERT INTO `CuentaPorCobrar` (
  id, numero, clienteId, pedidoVentaId, monto, montoAbonado, saldo,
  fechaEmision, fechaVencimiento, estado, usuarioId, createdAt, updatedAt
) VALUES (
  'cpc_0001', 'CC-0001', 'cli_bazar', 'pv_0001', 12.00, 0.00, 12.00,
  NOW(), DATE_ADD(CURDATE(), INTERVAL 10 DAY), 'PENDIENTE', 'usr_oper', NOW(), NOW()
);

COMMIT;

-- FIN DEL SCRIPT
-- VALIDACIONES RÁPIDAS (opcionales para verificar datos)

-- Inventario y valor de stock
SELECT id, nombre, stock, precio, ROUND(stock * precio, 2) AS valorStock
FROM `Producto`
ORDER BY nombre;

-- Últimos movimientos
SELECT id, productoId, tipo, cantidad, precio, createdAt
FROM `MovimientoInventario`
ORDER BY createdAt DESC
LIMIT 10;

-- Compras con sus items
SELECT pc.numero, pc.total, p.nombre AS proveedor,
       pci.productoId, pr.nombre AS producto,
       pci.cantidad, pci.precio, pci.subtotal
FROM `PedidoCompra` pc
JOIN `Proveedor` p ON p.id = pc.proveedorId
JOIN `PedidoCompraItem` pci ON pci.pedidoId = pc.id
JOIN `Producto` pr ON pr.id = pci.productoId
ORDER BY pc.createdAt DESC;

-- Ventas con sus items
SELECT pv.numero, pv.total, c.nombre AS cliente,
       pvi.productoId, pr.nombre AS producto,
       pvi.cantidad, pvi.subtotal
FROM `PedidoVenta` pv
JOIN `Cliente` c ON c.id = pv.clienteId
JOIN `PedidoVentaItem` pvi ON pvi.pedidoId = pv.id
JOIN `Producto` pr ON pr.id = pvi.productoId
ORDER BY pv.createdAt DESC;

-- Cuentas por pagar y por cobrar
SELECT numero, proveedorId, monto, saldo, estado
FROM `CuentaPorPagar`
ORDER BY createdAt DESC;

SELECT numero, clienteId, monto, saldo, estado
FROM `CuentaPorCobrar`
ORDER BY createdAt DESC;