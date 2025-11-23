-- =====================================================
-- SCRIPT DE DATOS INICIALES
-- TodoFru - Sistema de Gestión
-- =====================================================
-- 
-- Este script inserta los datos básicos necesarios para el funcionamiento
-- inicial del sistema, incluyendo catálogos, configuraciones y datos de prueba
--
-- Fecha: 2024-12-25
-- Versión: 1.0
-- =====================================================

-- Configuración inicial
SET FOREIGN_KEY_CHECKS = 0;
SET @current_timestamp = NOW();
SET @admin_user_id = UUID();

-- =====================================================
-- PASO 1: DATOS DE USUARIOS INICIALES
-- =====================================================

-- Usuario administrador principal
INSERT INTO usuarios (
    id, username, email, password_hash, nombres, apellidos, 
    rol, activo, requiere_cambio_password, created_at
) VALUES (
    @admin_user_id,
    'admin',
    'admin@todofru.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsxq5S/kS', -- password: admin123
    'Administrador',
    'Sistema',
    'ADMIN',
    TRUE,
    TRUE,
    @current_timestamp
);

-- Usuario gerente de ejemplo
INSERT INTO usuarios (
    id, username, email, password_hash, nombres, apellidos, 
    rol, activo, requiere_cambio_password, created_at
) VALUES (
    UUID(),
    'gerente',
    'gerente@todofru.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsxq5S/kS', -- password: gerente123
    'Juan Carlos',
    'Pérez García',
    'GERENTE',
    TRUE,
    TRUE,
    @current_timestamp
);

-- Usuario vendedor de ejemplo
INSERT INTO usuarios (
    id, username, email, password_hash, nombres, apellidos, 
    rol, activo, requiere_cambio_password, created_at
) VALUES (
    UUID(),
    'vendedor',
    'vendedor@todofru.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsxq5S/kS', -- password: vendedor123
    'María Elena',
    'Rodríguez López',
    'VENDEDOR',
    TRUE,
    TRUE,
    @current_timestamp
);

-- =====================================================
-- PASO 2: UNIDADES DE MEDIDA
-- =====================================================

-- Unidades de peso
INSERT INTO unidades_medida (id, codigo, nombre, simbolo, tipo, factor_conversion, activo) VALUES
(UUID(), 'KG', 'Kilogramo', 'kg', 'PESO', 1.000000, TRUE),
(UUID(), 'GR', 'Gramo', 'g', 'PESO', 0.001000, TRUE),
(UUID(), 'LB', 'Libra', 'lb', 'PESO', 0.453592, TRUE),
(UUID(), 'OZ', 'Onza', 'oz', 'PESO', 0.028350, TRUE),
(UUID(), 'TON', 'Tonelada', 't', 'PESO', 1000.000000, TRUE);

-- Unidades de volumen
INSERT INTO unidades_medida (id, codigo, nombre, simbolo, tipo, factor_conversion, activo) VALUES
(UUID(), 'LT', 'Litro', 'L', 'VOLUMEN', 1.000000, TRUE),
(UUID(), 'ML', 'Mililitro', 'mL', 'VOLUMEN', 0.001000, TRUE),
(UUID(), 'GAL', 'Galón', 'gal', 'VOLUMEN', 3.785412, TRUE),
(UUID(), 'M3', 'Metro Cúbico', 'm³', 'VOLUMEN', 1000.000000, TRUE);

-- Unidades de longitud
INSERT INTO unidades_medida (id, codigo, nombre, simbolo, tipo, factor_conversion, activo) VALUES
(UUID(), 'M', 'Metro', 'm', 'LONGITUD', 1.000000, TRUE),
(UUID(), 'CM', 'Centímetro', 'cm', 'LONGITUD', 0.010000, TRUE),
(UUID(), 'MM', 'Milímetro', 'mm', 'LONGITUD', 0.001000, TRUE),
(UUID(), 'KM', 'Kilómetro', 'km', 'LONGITUD', 1000.000000, TRUE);

-- Unidades de cantidad
INSERT INTO unidades_medida (id, codigo, nombre, simbolo, tipo, factor_conversion, activo) VALUES
(UUID(), 'UND', 'Unidad', 'und', 'UNIDAD', 1.000000, TRUE),
(UUID(), 'PAR', 'Par', 'par', 'UNIDAD', 2.000000, TRUE),
(UUID(), 'DOC', 'Docena', 'doc', 'UNIDAD', 12.000000, TRUE),
(UUID(), 'CEN', 'Centena', 'cen', 'UNIDAD', 100.000000, TRUE),
(UUID(), 'MIL', 'Millar', 'mil', 'UNIDAD', 1000.000000, TRUE);

-- Unidades de tiempo
INSERT INTO unidades_medida (id, codigo, nombre, simbolo, tipo, factor_conversion, activo) VALUES
(UUID(), 'DIA', 'Día', 'día', 'TIEMPO', 1.000000, TRUE),
(UUID(), 'SEM', 'Semana', 'sem', 'TIEMPO', 7.000000, TRUE),
(UUID(), 'MES', 'Mes', 'mes', 'TIEMPO', 30.000000, TRUE),
(UUID(), 'AÑO', 'Año', 'año', 'TIEMPO', 365.000000, TRUE);

-- =====================================================
-- PASO 3: CATEGORÍAS JERÁRQUICAS
-- =====================================================

-- Categorías principales (Nivel 1)
SET @cat_frutas = UUID();
SET @cat_verduras = UUID();
SET @cat_lacteos = UUID();
SET @cat_carnes = UUID();
SET @cat_granos = UUID();
SET @cat_bebidas = UUID();
SET @cat_panaderia = UUID();
SET @cat_limpieza = UUID();

INSERT INTO categorias (id, codigo, nombre, descripcion, categoria_padre_id, nivel, ruta_jerarquica, activo) VALUES
(@cat_frutas, 'FRUT', 'Frutas', 'Frutas frescas y procesadas', NULL, 1, 'FRUT', TRUE),
(@cat_verduras, 'VERD', 'Verduras', 'Verduras y hortalizas frescas', NULL, 1, 'VERD', TRUE),
(@cat_lacteos, 'LACT', 'Lácteos', 'Productos lácteos y derivados', NULL, 1, 'LACT', TRUE),
(@cat_carnes, 'CARN', 'Carnes', 'Carnes rojas, blancas y embutidos', NULL, 1, 'CARN', TRUE),
(@cat_granos, 'GRAN', 'Granos y Cereales', 'Granos, cereales y legumbres', NULL, 1, 'GRAN', TRUE),
(@cat_bebidas, 'BEB', 'Bebidas', 'Bebidas alcohólicas y no alcohólicas', NULL, 1, 'BEB', TRUE),
(@cat_panaderia, 'PAN', 'Panadería', 'Productos de panadería y pastelería', NULL, 1, 'PAN', TRUE),
(@cat_limpieza, 'LIMP', 'Limpieza', 'Productos de limpieza e higiene', NULL, 1, 'LIMP', TRUE);

-- Subcategorías de Frutas (Nivel 2)
INSERT INTO categorias (id, codigo, nombre, descripcion, categoria_padre_id, nivel, ruta_jerarquica, activo) VALUES
(UUID(), 'FRUT-CIT', 'Cítricos', 'Naranjas, limones, mandarinas', @cat_frutas, 2, 'FRUT/FRUT-CIT', TRUE),
(UUID(), 'FRUT-TRO', 'Tropicales', 'Mango, piña, papaya, maracuyá', @cat_frutas, 2, 'FRUT/FRUT-TRO', TRUE),
(UUID(), 'FRUT-TEM', 'Templadas', 'Manzanas, peras, uvas', @cat_frutas, 2, 'FRUT/FRUT-TEM', TRUE),
(UUID(), 'FRUT-BER', 'Berries', 'Fresas, arándanos, frambuesas', @cat_frutas, 2, 'FRUT/FRUT-BER', TRUE);

-- Subcategorías de Verduras (Nivel 2)
INSERT INTO categorias (id, codigo, nombre, descripcion, categoria_padre_id, nivel, ruta_jerarquica, activo) VALUES
(UUID(), 'VERD-HOJ', 'Hoja Verde', 'Lechuga, espinaca, acelga', @cat_verduras, 2, 'VERD/VERD-HOJ', TRUE),
(UUID(), 'VERD-RAI', 'Raíces', 'Zanahoria, rábano, betarraga', @cat_verduras, 2, 'VERD/VERD-RAI', TRUE),
(UUID(), 'VERD-TUB', 'Tubérculos', 'Papa, camote, yuca', @cat_verduras, 2, 'VERD/VERD-TUB', TRUE),
(UUID(), 'VERD-FRU', 'Frutos', 'Tomate, pimiento, calabaza', @cat_verduras, 2, 'VERD/VERD-FRU', TRUE);

-- Subcategorías de Lácteos (Nivel 2)
INSERT INTO categorias (id, codigo, nombre, descripcion, categoria_padre_id, nivel, ruta_jerarquica, activo) VALUES
(UUID(), 'LACT-LEC', 'Leches', 'Leche fresca, evaporada, en polvo', @cat_lacteos, 2, 'LACT/LACT-LEC', TRUE),
(UUID(), 'LACT-QUE', 'Quesos', 'Quesos frescos y madurados', @cat_lacteos, 2, 'LACT/LACT-QUE', TRUE),
(UUID(), 'LACT-YOG', 'Yogures', 'Yogures naturales y saborizados', @cat_lacteos, 2, 'LACT/LACT-YOG', TRUE),
(UUID(), 'LACT-MAN', 'Mantequillas', 'Mantequilla y margarinas', @cat_lacteos, 2, 'LACT/LACT-MAN', TRUE);

-- =====================================================
-- PASO 4: TIPOS DE MOVIMIENTO DE INVENTARIO
-- =====================================================

INSERT INTO tipos_movimiento (id, codigo, nombre, categoria, afecta_stock, requiere_documento, requiere_autorizacion, activo) VALUES
(UUID(), 'COMP', 'Compra', 'ENTRADA', TRUE, TRUE, FALSE, TRUE),
(UUID(), 'VENT', 'Venta', 'SALIDA', TRUE, TRUE, FALSE, TRUE),
(UUID(), 'AJUS-POS', 'Ajuste Positivo', 'AJUSTE', TRUE, FALSE, TRUE, TRUE),
(UUID(), 'AJUS-NEG', 'Ajuste Negativo', 'AJUSTE', TRUE, FALSE, TRUE, TRUE),
(UUID(), 'MERM', 'Merma', 'SALIDA', TRUE, FALSE, FALSE, TRUE),
(UUID(), 'VENC', 'Vencimiento', 'SALIDA', TRUE, FALSE, FALSE, TRUE),
(UUID(), 'DEVO-PROV', 'Devolución a Proveedor', 'SALIDA', TRUE, TRUE, FALSE, TRUE),
(UUID(), 'DEVO-CLI', 'Devolución de Cliente', 'ENTRADA', TRUE, TRUE, FALSE, TRUE),
(UUID(), 'TRAS-ENT', 'Transferencia Entrada', 'TRANSFERENCIA', TRUE, TRUE, FALSE, TRUE),
(UUID(), 'TRAS-SAL', 'Transferencia Salida', 'TRANSFERENCIA', TRUE, TRUE, FALSE, TRUE);

-- =====================================================
-- PASO 5: ESTADOS DE PEDIDOS
-- =====================================================

-- Estados para Pedidos de Compra
INSERT INTO estados_pedido (id, codigo, nombre, descripcion, tipo_pedido, es_final, permite_modificacion, orden_secuencia, activo) VALUES
(UUID(), 'PC-BORR', 'Borrador', 'Pedido en elaboración', 'COMPRA', FALSE, TRUE, 1, TRUE),
(UUID(), 'PC-PEND', 'Pendiente', 'Pedido enviado al proveedor', 'COMPRA', FALSE, TRUE, 2, TRUE),
(UUID(), 'PC-CONF', 'Confirmado', 'Pedido confirmado por proveedor', 'COMPRA', FALSE, FALSE, 3, TRUE),
(UUID(), 'PC-PARC', 'Parcialmente Recibido', 'Recepción parcial de productos', 'COMPRA', FALSE, FALSE, 4, TRUE),
(UUID(), 'PC-COMP', 'Completado', 'Pedido completamente recibido', 'COMPRA', TRUE, FALSE, 5, TRUE),
(UUID(), 'PC-CANC', 'Cancelado', 'Pedido cancelado', 'COMPRA', TRUE, FALSE, 6, TRUE);

-- Estados para Pedidos de Venta
INSERT INTO estados_pedido (id, codigo, nombre, descripcion, tipo_pedido, es_final, permite_modificacion, orden_secuencia, activo) VALUES
(UUID(), 'PV-BORR', 'Borrador', 'Pedido en elaboración', 'VENTA', FALSE, TRUE, 1, TRUE),
(UUID(), 'PV-PEND', 'Pendiente', 'Pedido pendiente de confirmación', 'VENTA', FALSE, TRUE, 2, TRUE),
(UUID(), 'PV-CONF', 'Confirmado', 'Pedido confirmado', 'VENTA', FALSE, FALSE, 3, TRUE),
(UUID(), 'PV-PREP', 'En Preparación', 'Pedido en preparación', 'VENTA', FALSE, FALSE, 4, TRUE),
(UUID(), 'PV-ENTR', 'Entregado', 'Pedido entregado al cliente', 'VENTA', TRUE, FALSE, 5, TRUE),
(UUID(), 'PV-CANC', 'Cancelado', 'Pedido cancelado', 'VENTA', TRUE, FALSE, 6, TRUE);

-- =====================================================
-- PASO 6: DATOS DE EJEMPLO - PERSONAS Y PROVEEDORES
-- =====================================================

-- Proveedor Persona Jurídica - Distribuidora de Frutas SAC
SET @prov1_id = UUID();
INSERT INTO personas (id, tipo_entidad, numero_identificacion, telefono, email, direccion, activo) VALUES
(@prov1_id, 'PERSONA_JURIDICA', '20123456789', '+51-1-234-5678', 'ventas@frutassac.com', 'Av. Los Frutales 123, Lima', TRUE);

INSERT INTO personas_juridicas (persona_id, razon_social, nombre_comercial, representante_legal, fecha_constitucion) VALUES
(@prov1_id, 'Distribuidora de Frutas SAC', 'FrutasSAC', 'Carlos Mendoza Pérez', '2015-03-15');

INSERT INTO proveedores (persona_id, tiempo_entrega_promedio, calificacion, condiciones_pago) VALUES
(@prov1_id, 3, 4.50, 'Pago a 30 días');

-- Proveedor Persona Natural - Juan Pérez (Agricultor)
SET @prov2_id = UUID();
INSERT INTO personas (id, tipo_entidad, numero_identificacion, telefono, email, direccion, activo) VALUES
(@prov2_id, 'PERSONA_NATURAL', '12345678', '+51-987-654-321', 'juan.perez@email.com', 'Fundo San José, Cañete', TRUE);

INSERT INTO personas_naturales (persona_id, nombres, apellidos, fecha_nacimiento) VALUES
(@prov2_id, 'Juan Carlos', 'Pérez García', '1975-08-20');

INSERT INTO proveedores (persona_id, tiempo_entrega_promedio, calificacion, condiciones_pago) VALUES
(@prov2_id, 2, 4.80, 'Pago al contado');

-- =====================================================
-- PASO 7: DATOS DE EJEMPLO - CLIENTES
-- =====================================================

-- Cliente Persona Jurídica - Supermercado Los Andes SAC
SET @cli1_id = UUID();
INSERT INTO personas (id, tipo_entidad, numero_identificacion, telefono, email, direccion, activo) VALUES
(@cli1_id, 'PERSONA_JURIDICA', '20987654321', '+51-1-987-6543', 'compras@losandes.com', 'Av. Los Andes 456, Lima', TRUE);

INSERT INTO personas_juridicas (persona_id, razon_social, nombre_comercial, representante_legal, fecha_constitucion) VALUES
(@cli1_id, 'Supermercado Los Andes SAC', 'Los Andes', 'María González López', '2010-06-10');

INSERT INTO clientes (persona_id, tipo_cliente, limite_credito, dias_credito, descuento_porcentaje) VALUES
(@cli1_id, 'MAYORISTA', 50000.00, 45, 5.00);

-- Cliente Persona Natural - Ana Rodríguez
SET @cli2_id = UUID();
INSERT INTO personas (id, tipo_entidad, numero_identificacion, telefono, email, direccion, activo) VALUES
(@cli2_id, 'PERSONA_NATURAL', '87654321', '+51-999-888-777', 'ana.rodriguez@email.com', 'Jr. Las Flores 789, Lima', TRUE);

INSERT INTO personas_naturales (persona_id, nombres, apellidos, fecha_nacimiento) VALUES
(@cli2_id, 'Ana María', 'Rodríguez López', '1985-12-05');

INSERT INTO clientes (persona_id, tipo_cliente, limite_credito, dias_credito, descuento_porcentaje) VALUES
(@cli2_id, 'MINORISTA', 5000.00, 15, 2.00);

-- =====================================================
-- PASO 8: PRODUCTOS DE EJEMPLO
-- =====================================================

-- Obtener IDs de categorías y unidades para los productos
SET @cat_citricos = (SELECT id FROM categorias WHERE codigo = 'FRUT-CIT' LIMIT 1);
SET @cat_tropicales = (SELECT id FROM categorias WHERE codigo = 'FRUT-TRO' LIMIT 1);
SET @cat_hoja_verde = (SELECT id FROM categorias WHERE codigo = 'VERD-HOJ' LIMIT 1);
SET @unidad_kg = (SELECT id FROM unidades_medida WHERE codigo = 'KG' LIMIT 1);
SET @unidad_und = (SELECT id FROM unidades_medida WHERE codigo = 'UND' LIMIT 1);

-- Producto 1: Naranja Valencia
SET @prod1_id = UUID();
INSERT INTO productos (
    id, codigo, nombre, descripcion, categoria_id, unidad_medida_id,
    precio_venta, precio_costo, stock_actual, stock_minimo, stock_maximo,
    punto_reorden, perecedero, dias_vencimiento, activo
) VALUES (
    @prod1_id, 'NAR-VAL-001', 'Naranja Valencia', 'Naranja Valencia fresca, calibre grande',
    @cat_citricos, @unidad_kg, 4.50, 2.80, 150.000, 20.000, 500.000,
    50.000, TRUE, 15, TRUE
);

-- Producto 2: Mango Kent
SET @prod2_id = UUID();
INSERT INTO productos (
    id, codigo, nombre, descripcion, categoria_id, unidad_medida_id,
    precio_venta, precio_costo, stock_actual, stock_minimo, stock_maximo,
    punto_reorden, perecedero, dias_vencimiento, activo
) VALUES (
    @prod2_id, 'MAN-KEN-001', 'Mango Kent', 'Mango Kent extra, primera calidad',
    @cat_tropicales, @unidad_und, 3.20, 1.80, 200.000, 30.000, 400.000,
    80.000, TRUE, 10, TRUE
);

-- Producto 3: Lechuga Americana
SET @prod3_id = UUID();
INSERT INTO productos (
    id, codigo, nombre, descripcion, categoria_id, unidad_medida_id,
    precio_venta, precio_costo, stock_actual, stock_minimo, stock_maximo,
    punto_reorden, perecedero, dias_vencimiento, activo
) VALUES (
    @prod3_id, 'LEC-AME-001', 'Lechuga Americana', 'Lechuga americana fresca, hidropónica',
    @cat_hoja_verde, @unidad_und, 2.80, 1.50, 80.000, 15.000, 200.000,
    40.000, TRUE, 7, TRUE
);

-- =====================================================
-- PASO 9: RELACIONES PRODUCTO-PROVEEDOR
-- =====================================================

-- Naranja Valencia - Distribuidora de Frutas SAC
INSERT INTO productos_proveedores (
    id, producto_id, proveedor_id, precio_compra, tiempo_entrega_dias,
    cantidad_minima, codigo_proveedor, preferido, activo
) VALUES (
    UUID(), @prod1_id, @prov1_id, 2.80, 3, 50.000, 'NAR-001', TRUE, TRUE
);

-- Mango Kent - Juan Pérez (Agricultor)
INSERT INTO productos_proveedores (
    id, producto_id, proveedor_id, precio_compra, tiempo_entrega_dias,
    cantidad_minima, codigo_proveedor, preferido, activo
) VALUES (
    UUID(), @prod2_id, @prov2_id, 1.80, 2, 100.000, 'MAN-001', TRUE, TRUE
);

-- Lechuga Americana - Distribuidora de Frutas SAC
INSERT INTO productos_proveedores (
    id, producto_id, proveedor_id, precio_compra, tiempo_entrega_dias,
    cantidad_minima, codigo_proveedor, preferido, activo
) VALUES (
    UUID(), @prod3_id, @prov1_id, 1.50, 2, 20.000, 'LEC-001', FALSE, TRUE
);

-- =====================================================
-- PASO 10: CONFIGURACIÓN FINAL
-- =====================================================

-- Restaurar verificación de claves foráneas
SET FOREIGN_KEY_CHECKS = 1;

-- Verificar la inserción exitosa
SELECT 'DATOS INICIALES INSERTADOS EXITOSAMENTE' as estado;

-- Resumen de datos insertados
SELECT 
    'RESUMEN DE DATOS INSERTADOS' as seccion,
    (SELECT COUNT(*) FROM usuarios) as usuarios,
    (SELECT COUNT(*) FROM unidades_medida) as unidades_medida,
    (SELECT COUNT(*) FROM categorias) as categorias,
    (SELECT COUNT(*) FROM tipos_movimiento) as tipos_movimiento,
    (SELECT COUNT(*) FROM estados_pedido) as estados_pedido,
    (SELECT COUNT(*) FROM personas) as personas,
    (SELECT COUNT(*) FROM proveedores) as proveedores,
    (SELECT COUNT(*) FROM clientes) as clientes,
    (SELECT COUNT(*) FROM productos) as productos,
    (SELECT COUNT(*) FROM productos_proveedores) as productos_proveedores;

-- Mostrar usuarios creados
SELECT 
    'USUARIOS CREADOS' as seccion,
    username,
    CONCAT(nombres, ' ', apellidos) as nombre_completo,
    email,
    rol,
    activo
FROM usuarios
ORDER BY rol, username;

-- Mostrar productos creados
SELECT 
    'PRODUCTOS CREADOS' as seccion,
    p.codigo,
    p.nombre,
    c.nombre as categoria,
    um.simbolo as unidad,
    p.precio_venta,
    p.stock_actual
FROM productos p
JOIN categorias c ON p.categoria_id = c.id
JOIN unidades_medida um ON p.unidad_medida_id = um.id
ORDER BY p.codigo;

-- Mensaje final
SELECT 
    '¡ÉXITO!' as mensaje,
    'Datos iniciales insertados correctamente.' as detalle,
    'El sistema está listo para usar.' as estado;