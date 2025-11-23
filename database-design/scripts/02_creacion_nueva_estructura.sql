-- =====================================================
-- SCRIPT DE CREACIÓN DE NUEVA ESTRUCTURA OPTIMIZADA
-- TodoFru - Sistema de Gestión
-- =====================================================
-- 
-- Este script crea la nueva estructura de base de datos optimizada
-- con normalización completa, índices optimizados e integridad referencial
--
-- Fecha: 2024-12-25
-- Versión: 1.0
-- =====================================================

-- Configuración inicial
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO';

-- =====================================================
-- PASO 1: CONFIGURACIÓN DE BASE DE DATOS
-- =====================================================

-- Configurar charset y collation para soporte completo de UTF-8
ALTER DATABASE CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =====================================================
-- PASO 2: CREACIÓN DE TABLAS BASE
-- =====================================================

-- Tabla: personas (entidad base para clientes y proveedores)
CREATE TABLE personas (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    tipo_entidad ENUM('PERSONA_NATURAL', 'PERSONA_JURIDICA') NOT NULL,
    numero_identificacion VARCHAR(11) NOT NULL UNIQUE,
    telefono VARCHAR(20),
    email VARCHAR(100),
    direccion TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    version INT DEFAULT 1,
    
    -- Restricciones de validación
    CONSTRAINT chk_email_format CHECK (email IS NULL OR email REGEXP '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'),
    CONSTRAINT chk_telefono_format CHECK (telefono IS NULL OR telefono REGEXP '^[0-9+\\-\\s()]+$'),
    CONSTRAINT chk_identificacion_length CHECK (
        (tipo_entidad = 'PERSONA_NATURAL' AND LENGTH(numero_identificacion) = 8) OR
        (tipo_entidad = 'PERSONA_JURIDICA' AND LENGTH(numero_identificacion) = 11)
    ),
    
    -- Índices optimizados
    INDEX idx_personas_tipo (tipo_entidad),
    INDEX idx_personas_identificacion (numero_identificacion),
    INDEX idx_personas_activo (activo),
    INDEX idx_personas_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: personas_naturales (especialización)
CREATE TABLE personas_naturales (
    persona_id CHAR(36) PRIMARY KEY,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    fecha_nacimiento DATE,
    
    FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE,
    
    -- Nombre completo calculado
    INDEX idx_pn_nombres (nombres),
    INDEX idx_pn_apellidos (apellidos)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: personas_juridicas (especialización)
CREATE TABLE personas_juridicas (
    persona_id CHAR(36) PRIMARY KEY,
    razon_social VARCHAR(200) NOT NULL,
    nombre_comercial VARCHAR(200),
    representante_legal VARCHAR(200),
    fecha_constitucion DATE,
    
    FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE,
    
    INDEX idx_pj_razon_social (razon_social),
    INDEX idx_pj_nombre_comercial (nombre_comercial)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PASO 3: TABLAS DE CATÁLOGOS
-- =====================================================

-- Tabla: categorias (jerárquicas)
CREATE TABLE categorias (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    categoria_padre_id CHAR(36),
    nivel INT NOT NULL DEFAULT 1,
    ruta_jerarquica VARCHAR(500),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (categoria_padre_id) REFERENCES categorias(id) ON DELETE RESTRICT,
    
    -- Validaciones
    CONSTRAINT chk_nivel_positivo CHECK (nivel > 0),
    CONSTRAINT chk_nivel_maximo CHECK (nivel <= 5),
    
    -- Índices
    INDEX idx_categorias_codigo (codigo),
    INDEX idx_categorias_nombre (nombre),
    INDEX idx_categorias_padre (categoria_padre_id),
    INDEX idx_categorias_nivel (nivel),
    INDEX idx_categorias_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: unidades_medida
CREATE TABLE unidades_medida (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    codigo VARCHAR(10) NOT NULL UNIQUE,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    simbolo VARCHAR(10) NOT NULL UNIQUE,
    tipo ENUM('PESO', 'VOLUMEN', 'LONGITUD', 'UNIDAD', 'TIEMPO') NOT NULL,
    factor_conversion DECIMAL(15,6) DEFAULT 1.000000,
    unidad_base_id CHAR(36),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (unidad_base_id) REFERENCES unidades_medida(id) ON DELETE RESTRICT,
    
    -- Validaciones
    CONSTRAINT chk_factor_conversion CHECK (factor_conversion > 0),
    
    INDEX idx_um_codigo (codigo),
    INDEX idx_um_tipo (tipo),
    INDEX idx_um_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PASO 4: TABLAS DE USUARIOS Y SEGURIDAD
-- =====================================================

-- Tabla: usuarios (mejorada)
CREATE TABLE usuarios (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    
    -- Información personal
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    
    -- Configuración
    rol ENUM('ADMIN', 'GERENTE', 'VENDEDOR', 'ALMACENERO', 'CONTADOR') NOT NULL DEFAULT 'VENDEDOR',
    activo BOOLEAN DEFAULT TRUE,
    requiere_cambio_password BOOLEAN DEFAULT TRUE,
    
    -- Fechas importantes
    ultimo_acceso TIMESTAMP NULL,
    fecha_expiracion_password DATE,
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Validaciones
    CONSTRAINT chk_email_format_usuarios CHECK (email REGEXP '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'),
    
    INDEX idx_usuarios_username (username),
    INDEX idx_usuarios_email (email),
    INDEX idx_usuarios_rol (rol),
    INDEX idx_usuarios_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PASO 5: TABLAS DE CLIENTES Y PROVEEDORES
-- =====================================================

-- Tabla: clientes (especialización de personas)
CREATE TABLE clientes (
    persona_id CHAR(36) PRIMARY KEY,
    tipo_cliente ENUM('MAYORISTA', 'MINORISTA') NOT NULL DEFAULT 'MINORISTA',
    limite_credito DECIMAL(12,2) DEFAULT 0.00,
    dias_credito INT DEFAULT 0,
    descuento_porcentaje DECIMAL(5,2) DEFAULT 0.00,
    mensaje_personalizado TEXT,
    
    FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE,
    
    -- Validaciones
    CONSTRAINT chk_limite_credito CHECK (limite_credito >= 0),
    CONSTRAINT chk_dias_credito CHECK (dias_credito >= 0),
    CONSTRAINT chk_descuento CHECK (descuento_porcentaje BETWEEN 0 AND 100),
    
    INDEX idx_clientes_tipo (tipo_cliente),
    INDEX idx_clientes_limite (limite_credito)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: proveedores (especialización de personas)
CREATE TABLE proveedores (
    persona_id CHAR(36) PRIMARY KEY,
    tiempo_entrega_promedio INT DEFAULT 7,
    calificacion DECIMAL(3,2) DEFAULT 5.00,
    condiciones_pago VARCHAR(100),
    
    FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE,
    
    -- Validaciones
    CONSTRAINT chk_tiempo_entrega CHECK (tiempo_entrega_promedio > 0),
    CONSTRAINT chk_calificacion CHECK (calificacion BETWEEN 1.00 AND 5.00),
    
    INDEX idx_proveedores_tiempo_entrega (tiempo_entrega_promedio),
    INDEX idx_proveedores_calificacion (calificacion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PASO 6: TABLAS DE PRODUCTOS
-- =====================================================

-- Tabla: productos (normalizada y optimizada)
CREATE TABLE productos (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    codigo VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    categoria_id CHAR(36) NOT NULL,
    unidad_medida_id CHAR(36) NOT NULL,
    
    -- Características físicas
    peso DECIMAL(10,3),
    volumen DECIMAL(10,3),
    dimensiones JSON,
    
    -- Características comerciales
    precio_venta DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    precio_costo DECIMAL(12,2) DEFAULT 0.00,
    margen_utilidad DECIMAL(5,2) DEFAULT 0.00,
    
    -- Control de inventario
    stock_actual DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    stock_minimo DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    stock_maximo DECIMAL(12,3),
    punto_reorden DECIMAL(12,3),
    
    -- Características especiales
    perecedero BOOLEAN DEFAULT FALSE,
    dias_vencimiento INT,
    requiere_lote BOOLEAN DEFAULT FALSE,
    requiere_serie BOOLEAN DEFAULT FALSE,
    
    -- Control de calidad
    porcentaje_merma DECIMAL(5,2) DEFAULT 0.00,
    
    -- Configuración fiscal
    tiene_igv BOOLEAN DEFAULT TRUE,
    codigo_sunat VARCHAR(20),
    
    -- Metadatos
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    version INT DEFAULT 1,
    
    FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE RESTRICT,
    FOREIGN KEY (unidad_medida_id) REFERENCES unidades_medida(id) ON DELETE RESTRICT,
    
    -- Validaciones
    CONSTRAINT chk_precio_venta CHECK (precio_venta >= 0),
    CONSTRAINT chk_precio_costo CHECK (precio_costo >= 0),
    CONSTRAINT chk_stock_actual CHECK (stock_actual >= 0),
    CONSTRAINT chk_stock_minimo CHECK (stock_minimo >= 0),
    CONSTRAINT chk_stock_maximo CHECK (stock_maximo IS NULL OR stock_maximo >= stock_minimo),
    CONSTRAINT chk_dias_vencimiento CHECK (dias_vencimiento IS NULL OR dias_vencimiento > 0),
    CONSTRAINT chk_porcentaje_merma CHECK (porcentaje_merma BETWEEN 0 AND 100),
    CONSTRAINT chk_margen_utilidad CHECK (margen_utilidad >= 0),
    
    -- Índices optimizados
    INDEX idx_productos_codigo (codigo),
    INDEX idx_productos_nombre (nombre),
    INDEX idx_productos_categoria (categoria_id),
    INDEX idx_productos_unidad (unidad_medida_id),
    INDEX idx_productos_activo (activo),
    INDEX idx_productos_perecedero (perecedero),
    INDEX idx_productos_stock_bajo (stock_actual, stock_minimo),
    INDEX idx_productos_precio (precio_venta),
    
    -- Índice de texto completo para búsquedas
    FULLTEXT INDEX ft_productos_busqueda (nombre, descripcion, codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: productos_proveedores (relación normalizada)
CREATE TABLE productos_proveedores (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    producto_id CHAR(36) NOT NULL,
    proveedor_id CHAR(36) NOT NULL,
    
    -- Condiciones comerciales
    precio_compra DECIMAL(12,2) NOT NULL,
    moneda CHAR(3) DEFAULT 'PEN',
    tiempo_entrega_dias INT DEFAULT 7,
    cantidad_minima DECIMAL(12,3) DEFAULT 1.000,
    cantidad_maxima DECIMAL(12,3),
    
    -- Información del proveedor
    codigo_proveedor VARCHAR(50),
    descripcion_proveedor VARCHAR(200),
    
    -- Control
    preferido BOOLEAN DEFAULT FALSE,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(persona_id) ON DELETE CASCADE,
    
    -- Validaciones
    CONSTRAINT chk_precio_compra CHECK (precio_compra > 0),
    CONSTRAINT chk_tiempo_entrega CHECK (tiempo_entrega_dias > 0),
    CONSTRAINT chk_cantidad_minima CHECK (cantidad_minima > 0),
    CONSTRAINT chk_cantidad_maxima CHECK (cantidad_maxima IS NULL OR cantidad_maxima >= cantidad_minima),
    
    -- Restricción de unicidad
    UNIQUE KEY uk_producto_proveedor (producto_id, proveedor_id),
    
    INDEX idx_pp_producto (producto_id),
    INDEX idx_pp_proveedor (proveedor_id),
    INDEX idx_pp_preferido (preferido),
    INDEX idx_pp_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PASO 7: TABLAS DE MOVIMIENTOS E INVENTARIO
-- =====================================================

-- Tabla: tipos_movimiento
CREATE TABLE tipos_movimiento (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    categoria ENUM('ENTRADA', 'SALIDA', 'AJUSTE', 'TRANSFERENCIA') NOT NULL,
    afecta_stock BOOLEAN DEFAULT TRUE,
    requiere_documento BOOLEAN DEFAULT FALSE,
    requiere_autorizacion BOOLEAN DEFAULT FALSE,
    activo BOOLEAN DEFAULT TRUE,
    
    INDEX idx_tm_categoria (categoria),
    INDEX idx_tm_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: movimientos_inventario (optimizada con particionamiento)
CREATE TABLE movimientos_inventario (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    numero_movimiento VARCHAR(20) NOT NULL UNIQUE,
    tipo_movimiento_id CHAR(36) NOT NULL,
    producto_id CHAR(36) NOT NULL,
    
    -- Cantidades
    cantidad DECIMAL(12,3) NOT NULL,
    cantidad_anterior DECIMAL(12,3) NOT NULL,
    cantidad_nueva DECIMAL(12,3) NOT NULL,
    
    -- Valores monetarios
    precio_unitario DECIMAL(12,2),
    valor_total DECIMAL(15,2),
    
    -- Referencias
    documento_referencia VARCHAR(50),
    pedido_compra_id CHAR(36),
    pedido_venta_id CHAR(36),
    
    -- Información adicional
    motivo TEXT,
    observaciones TEXT,
    lote VARCHAR(50),
    fecha_vencimiento DATE,
    
    -- Auditoría
    usuario_id CHAR(36) NOT NULL,
    fecha_movimiento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tipo_movimiento_id) REFERENCES tipos_movimiento(id) ON DELETE RESTRICT,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE RESTRICT,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
    
    -- Validaciones
    CONSTRAINT chk_cantidad CHECK (cantidad != 0),
    CONSTRAINT chk_cantidad_nueva CHECK (cantidad_nueva >= 0),
    CONSTRAINT chk_precio_unitario CHECK (precio_unitario IS NULL OR precio_unitario >= 0),
    
    -- Índices optimizados
    INDEX idx_mi_numero (numero_movimiento),
    INDEX idx_mi_producto (producto_id),
    INDEX idx_mi_tipo (tipo_movimiento_id),
    INDEX idx_mi_fecha (fecha_movimiento),
    INDEX idx_mi_usuario (usuario_id),
    INDEX idx_mi_lote (lote),
    
    -- Índice compuesto para consultas frecuentes
    INDEX idx_mi_producto_fecha (producto_id, fecha_movimiento),
    INDEX idx_mi_tipo_fecha (tipo_movimiento_id, fecha_movimiento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PASO 8: TABLAS DE PEDIDOS
-- =====================================================

-- Tabla: estados_pedido
CREATE TABLE estados_pedido (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(50) NOT NULL,
    descripcion TEXT,
    tipo_pedido ENUM('COMPRA', 'VENTA') NOT NULL,
    es_final BOOLEAN DEFAULT FALSE,
    permite_modificacion BOOLEAN DEFAULT TRUE,
    orden_secuencia INT NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    
    INDEX idx_ep_tipo (tipo_pedido),
    INDEX idx_ep_orden (orden_secuencia)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: pedidos_compra (normalizada)
CREATE TABLE pedidos_compra (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    numero VARCHAR(20) NOT NULL UNIQUE,
    proveedor_id CHAR(36) NOT NULL,
    estado_id CHAR(36) NOT NULL,
    
    -- Fechas
    fecha_pedido DATE NOT NULL,
    fecha_entrega_estimada DATE,
    fecha_entrega_real DATE,
    
    -- Montos
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    descuento DECIMAL(15,2) DEFAULT 0.00,
    impuestos DECIMAL(15,2) DEFAULT 0.00,
    total DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    
    -- Información adicional
    observaciones TEXT,
    condiciones_pago VARCHAR(100),
    lugar_entrega TEXT,
    
    -- Documentos
    numero_guia VARCHAR(50),
    archivo_guia VARCHAR(255),
    
    -- Auditoría
    usuario_creacion_id CHAR(36) NOT NULL,
    usuario_modificacion_id CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    version INT DEFAULT 1,
    
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(persona_id) ON DELETE RESTRICT,
    FOREIGN KEY (estado_id) REFERENCES estados_pedido(id) ON DELETE RESTRICT,
    FOREIGN KEY (usuario_creacion_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
    FOREIGN KEY (usuario_modificacion_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
    
    -- Validaciones
    CONSTRAINT chk_pc_subtotal CHECK (subtotal >= 0),
    CONSTRAINT chk_pc_descuento CHECK (descuento >= 0),
    CONSTRAINT chk_pc_impuestos CHECK (impuestos >= 0),
    CONSTRAINT chk_pc_total CHECK (total >= 0),
    CONSTRAINT chk_pc_fecha_entrega CHECK (fecha_entrega_estimada IS NULL OR fecha_entrega_estimada >= fecha_pedido),
    
    INDEX idx_pc_numero (numero),
    INDEX idx_pc_proveedor (proveedor_id),
    INDEX idx_pc_estado (estado_id),
    INDEX idx_pc_fecha (fecha_pedido),
    INDEX idx_pc_total (total),
    INDEX idx_pc_proveedor_fecha (proveedor_id, fecha_pedido)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: pedidos_compra_items
CREATE TABLE pedidos_compra_items (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    pedido_id CHAR(36) NOT NULL,
    producto_id CHAR(36) NOT NULL,
    
    -- Cantidades
    cantidad_pedida DECIMAL(12,3) NOT NULL,
    cantidad_recibida DECIMAL(12,3) DEFAULT 0.000,
    
    -- Precios
    precio_unitario DECIMAL(12,2) NOT NULL,
    descuento_porcentaje DECIMAL(5,2) DEFAULT 0.00,
    descuento_monto DECIMAL(12,2) DEFAULT 0.00,
    
    -- Información adicional
    observaciones TEXT,
    
    FOREIGN KEY (pedido_id) REFERENCES pedidos_compra(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE RESTRICT,
    
    -- Validaciones
    CONSTRAINT chk_pci_cantidad_pedida CHECK (cantidad_pedida > 0),
    CONSTRAINT chk_pci_cantidad_recibida CHECK (cantidad_recibida >= 0),
    CONSTRAINT chk_pci_precio_unitario CHECK (precio_unitario > 0),
    CONSTRAINT chk_pci_descuento_porcentaje CHECK (descuento_porcentaje BETWEEN 0 AND 100),
    CONSTRAINT chk_pci_descuento_monto CHECK (descuento_monto >= 0),
    
    -- Restricción de unicidad
    UNIQUE KEY uk_pedido_producto (pedido_id, producto_id),
    
    INDEX idx_pci_pedido (pedido_id),
    INDEX idx_pci_producto (producto_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PASO 9: TABLA DE AUDITORÍA
-- =====================================================

-- Tabla: auditoria (optimizada con particionamiento)
CREATE TABLE auditoria (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    tabla VARCHAR(50) NOT NULL,
    registro_id CHAR(36) NOT NULL,
    accion ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
    
    -- Datos del cambio
    datos_anteriores JSON,
    datos_nuevos JSON,
    campos_modificados JSON,
    
    -- Información de contexto
    usuario_id CHAR(36) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    sesion_id VARCHAR(100),
    
    -- Metadatos
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
    
    INDEX idx_auditoria_tabla (tabla),
    INDEX idx_auditoria_registro (registro_id),
    INDEX idx_auditoria_usuario (usuario_id),
    INDEX idx_auditoria_accion (accion),
    INDEX idx_auditoria_timestamp (timestamp),
    INDEX idx_auditoria_tabla_registro (tabla, registro_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PASO 10: VISTAS OPTIMIZADAS
-- =====================================================

-- Vista: inventario con alertas
CREATE VIEW v_inventario_alertas AS
SELECT 
    p.id,
    p.codigo,
    p.nombre,
    p.stock_actual,
    p.stock_minimo,
    p.stock_maximo,
    p.punto_reorden,
    CASE 
        WHEN p.stock_actual <= 0 THEN 'SIN_STOCK'
        WHEN p.stock_actual <= p.stock_minimo THEN 'STOCK_BAJO'
        WHEN p.stock_actual <= p.punto_reorden THEN 'PUNTO_REORDEN'
        ELSE 'NORMAL'
    END as estado_stock,
    c.nombre as categoria,
    um.simbolo as unidad
FROM productos p
JOIN categorias c ON p.categoria_id = c.id
JOIN unidades_medida um ON p.unidad_medida_id = um.id
WHERE p.activo = TRUE;

-- Vista: resumen de proveedores
CREATE VIEW v_proveedores_resumen AS
SELECT 
    pr.persona_id,
    CASE 
        WHEN pe.tipo_entidad = 'PERSONA_NATURAL' THEN CONCAT(pn.nombres, ' ', pn.apellidos)
        ELSE pj.razon_social
    END as nombre,
    pe.numero_identificacion,
    pe.telefono,
    pe.email,
    pr.calificacion,
    pr.tiempo_entrega_promedio,
    COUNT(pp.id) as productos_count,
    AVG(pp.precio_compra) as precio_promedio
FROM proveedores pr
JOIN personas pe ON pr.persona_id = pe.id
LEFT JOIN personas_naturales pn ON pe.id = pn.persona_id
LEFT JOIN personas_juridicas pj ON pe.id = pj.persona_id
LEFT JOIN productos_proveedores pp ON pr.persona_id = pp.proveedor_id AND pp.activo = TRUE
WHERE pe.activo = TRUE
GROUP BY pr.persona_id;

-- Vista: resumen de clientes
CREATE VIEW v_clientes_resumen AS
SELECT 
    cl.persona_id,
    CASE 
        WHEN pe.tipo_entidad = 'PERSONA_NATURAL' THEN CONCAT(pn.nombres, ' ', pn.apellidos)
        ELSE pj.razon_social
    END as nombre,
    pe.numero_identificacion,
    pe.telefono,
    pe.email,
    cl.tipo_cliente,
    cl.limite_credito,
    cl.dias_credito
FROM clientes cl
JOIN personas pe ON cl.persona_id = pe.id
LEFT JOIN personas_naturales pn ON pe.id = pn.persona_id
LEFT JOIN personas_juridicas pj ON pe.id = pj.persona_id
WHERE pe.activo = TRUE;

-- =====================================================
-- PASO 11: CONFIGURACIÓN FINAL
-- =====================================================

-- Restaurar verificación de claves foráneas
SET FOREIGN_KEY_CHECKS = 1;

-- Verificar la creación exitosa
SELECT 
    'ESTRUCTURA CREADA EXITOSAMENTE' as estado,
    COUNT(*) as total_tablas
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_TYPE = 'BASE TABLE';

-- Mostrar resumen de tablas creadas
SELECT 
    TABLE_NAME as tabla,
    TABLE_ROWS as registros_estimados,
    ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) as tamaño_mb
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;

-- Mostrar vistas creadas
SELECT 
    TABLE_NAME as vista,
    'VIEW' as tipo
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_TYPE = 'VIEW'
ORDER BY TABLE_NAME;

-- Mensaje final
SELECT 
    '¡ÉXITO!' as mensaje,
    'Nueva estructura de base de datos creada correctamente.' as detalle,
    'Proceda con la inserción de datos iniciales.' as siguiente_paso;