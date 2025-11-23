# 📊 Documentación Completa del Esquema de Base de Datos

## 📋 Índice
1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura General](#arquitectura-general)
3. [Diagrama Entidad-Relación](#diagrama-entidad-relación)
4. [Descripción Detallada de Tablas](#descripción-detallada-de-tablas)
5. [Relaciones y Restricciones](#relaciones-y-restricciones)
6. [Índices y Optimizaciones](#índices-y-optimizaciones)
7. [Procedimientos y Vistas](#procedimientos-y-vistas)
8. [Guía de Uso](#guía-de-uso)

---

## 🎯 Resumen Ejecutivo

### Propósito del Sistema
Sistema de gestión integral para empresa de distribución de frutas y verduras que incluye:
- Gestión de inventario y productos
- Administración de clientes y proveedores
- Control de pedidos de compra
- Auditoría y trazabilidad completa

### Características Principales
- **Normalización**: Cumple con 3FN (Tercera Forma Normal)
- **Escalabilidad**: Diseño preparado para crecimiento
- **Performance**: Índices optimizados para consultas frecuentes
- **Integridad**: Restricciones y validaciones robustas
- **Auditoría**: Trazabilidad completa de cambios

---

## 🏗️ Arquitectura General

### Capas del Sistema
```
┌─────────────────────────────────────┐
│           APLICACIÓN                │
├─────────────────────────────────────┤
│           PRISMA ORM                │
├─────────────────────────────────────┤
│         BASE DE DATOS               │
│         (MySQL 8.0+)                │
└─────────────────────────────────────┘
```

### Módulos Principales
1. **Gestión de Personas** (personas, clientes, proveedores)
2. **Catálogos** (categorías, unidades de medida, tipos de movimiento)
3. **Productos e Inventario** (productos, movimientos, stock)
4. **Pedidos** (pedidos de compra, items)
5. **Seguridad** (usuarios, roles)
6. **Auditoría** (trazabilidad de cambios)

---

## 🔗 Diagrama Entidad-Relación

### Diagrama Principal (ASCII)
```
                    ┌─────────────────┐
                    │    PERSONAS     │
                    │ ─────────────── │
                    │ id (PK)         │
                    │ numero_identif. │
                    │ nombres         │
                    │ apellidos       │
                    │ razon_social    │
                    │ tipo_entidad    │
                    │ email           │
                    │ telefono        │
                    │ direccion       │
                    │ activo          │
                    └─────────┬───────┘
                              │
                    ┌─────────┴───────┐
                    │                 │
          ┌─────────▼─────────┐ ┌─────▼─────────┐
          │ PERSONAS_NATURALES│ │PERSONAS_JURID.│
          │ ─────────────────  │ │ ─────────────  │
          │ persona_id (PK,FK) │ │ persona_id (PK)│
          │ fecha_nacimiento   │ │ nit            │
          │ genero            │ │ tipo_sociedad  │
          │ estado_civil      │ │ fecha_constit. │
          └───────────────────┘ └───────────────┘
                    │                 │
          ┌─────────▼─────────┐ ┌─────▼─────────┐
          │     CLIENTES      │ │   PROVEEDORES │
          │ ─────────────────  │ │ ─────────────  │
          │ id (PK)           │ │ id (PK)       │
          │ persona_id (FK)   │ │ persona_id(FK)│
          │ tipo_cliente      │ │ calificacion  │
          │ limite_credito    │ │ tiempo_entrega│
          │ descuento_habitual│ │ condiciones   │
          └───────────────────┘ └───────────────┘

┌─────────────────┐         ┌─────────────────┐
│   CATEGORIAS    │         │ UNIDADES_MEDIDA │
│ ─────────────── │         │ ─────────────── │
│ id (PK)         │         │ id (PK)         │
│ codigo          │         │ codigo          │
│ nombre          │         │ nombre          │
│ descripcion     │         │ simbolo         │
│ categoria_padre │         │ tipo            │
│ activo          │         │ factor_conv.    │
└─────────┬───────┘         └─────────┬───────┘
          │                           │
          │         ┌─────────────────▼─────────────────┐
          │         │            PRODUCTOS             │
          │         │ ─────────────────────────────────  │
          │         │ id (PK)                          │
          │         │ codigo (UNIQUE)                  │
          │         │ nombre                           │
          │         │ descripcion                      │
          └─────────▶ categoria_id (FK)                │
                    │ unidad_medida_id (FK)            │
                    │ precio_venta                     │
                    │ stock_actual                     │
                    │ stock_minimo                     │
                    │ stock_maximo                     │
                    │ activo                           │
                    └─────────┬───────────────┬─────────┘
                              │               │
                    ┌─────────▼─────────┐     │
                    │PRODUCTOS_PROVEED. │     │
                    │ ─────────────────  │     │
                    │ id (PK)           │     │
                    │ producto_id (FK)  │     │
                    │ proveedor_id (FK) │     │
                    │ precio_compra     │     │
                    │ tiempo_entrega    │     │
                    │ es_preferido      │     │
                    │ activo            │     │
                    └───────────────────┘     │
                                              │
┌─────────────────┐                          │
│ TIPOS_MOVIMIENTO│                          │
│ ─────────────── │                          │
│ id (PK)         │                          │
│ codigo          │                          │
│ nombre          │                          │
│ categoria       │                          │
│ afecta_stock    │                          │
│ requiere_doc    │                          │
└─────────┬───────┘                          │
          │                                  │
          │         ┌────────────────────────▼─────────────────────────┐
          │         │           MOVIMIENTOS_INVENTARIO                │
          │         │ ─────────────────────────────────────────────── │
          │         │ id (PK)                                        │
          │         │ producto_id (FK)                               │
          └─────────▶ tipo_movimiento_id (FK)                        │
                    │ cantidad                                       │
                    │ precio_unitario                                │
                    │ fecha_movimiento                               │
                    │ documento_referencia                           │
                    │ observaciones                                  │
                    │ usuario_id (FK)                                │
                    └────────────────────────────────────────────────┘

┌─────────────────┐         ┌─────────────────┐
│ ESTADOS_PEDIDO  │         │   USUARIOS      │
│ ─────────────── │         │ ─────────────── │
│ id (PK)         │         │ id (PK)         │
│ codigo          │         │ username (UQ)   │
│ nombre          │         │ email (UQ)      │
│ descripcion     │         │ password_hash   │
│ tipo_pedido     │         │ nombres         │
│ activo          │         │ apellidos       │
└─────────┬───────┘         │ rol             │
          │                 │ activo          │
          │                 └─────────┬───────┘
          │                           │
          │         ┌─────────────────▼─────────────────┐
          │         │          PEDIDOS_COMPRA          │
          │         │ ─────────────────────────────────  │
          │         │ id (PK)                          │
          │         │ numero_pedido (UQ)               │
          │         │ proveedor_id (FK)                │
          └─────────▶ estado_id (FK)                   │
                    │ fecha_pedido                     │
                    │ fecha_entrega_esperada           │
                    │ total                            │
                    │ observaciones                    │
                    │ usuario_id (FK)                  │
                    └─────────┬───────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │PEDIDOS_COMPRA_ITEM│
                    │ ─────────────────  │
                    │ id (PK)           │
                    │ pedido_id (FK)    │
                    │ producto_id (FK)  │
                    │ cantidad          │
                    │ precio_unitario   │
                    │ subtotal          │
                    └───────────────────┘

                    ┌─────────────────┐
                    │    AUDITORIA    │
                    │ ─────────────── │
                    │ id (PK)         │
                    │ entidad         │
                    │ entidad_id      │
                    │ accion          │
                    │ valores_antes   │
                    │ valores_despues │
                    │ usuario_id (FK) │
                    │ fecha_accion    │
                    │ ip_address      │
                    └─────────────────┘
```

---

## 📋 Descripción Detallada de Tablas

### 👥 PERSONAS
**Propósito**: Tabla base para almacenar información común de personas naturales y jurídicas.

| Campo | Tipo | Descripción | Restricciones |
|-------|------|-------------|---------------|
| id | UUID | Identificador único | PK, NOT NULL |
| numero_identificacion | VARCHAR(50) | Cédula, NIT, pasaporte | UNIQUE, NOT NULL |
| nombres | VARCHAR(100) | Nombres de la persona | NOT NULL |
| apellidos | VARCHAR(100) | Apellidos (opcional para jurídicas) | NULL |
| razon_social | VARCHAR(200) | Razón social (para jurídicas) | NULL |
| tipo_entidad | ENUM | NATURAL, JURIDICA | NOT NULL |
| email | VARCHAR(150) | Correo electrónico | UNIQUE |
| telefono | VARCHAR(20) | Número de teléfono | NULL |
| direccion | TEXT | Dirección completa | NULL |
| activo | BOOLEAN | Estado activo/inactivo | DEFAULT TRUE |
| created_at | TIMESTAMP | Fecha de creación | DEFAULT NOW() |
| updated_at | TIMESTAMP | Fecha de actualización | ON UPDATE NOW() |

**Índices**:
- `idx_personas_numero_identificacion`: Búsquedas por identificación
- `idx_personas_email`: Búsquedas por email
- `idx_personas_nombres_apellidos`: Búsquedas por nombre
- `idx_personas_tipo_activo`: Filtros por tipo y estado

### 👤 PERSONAS_NATURALES
**Propósito**: Especialización para personas naturales con campos específicos.

| Campo | Tipo | Descripción | Restricciones |
|-------|------|-------------|---------------|
| persona_id | UUID | Referencia a personas | PK, FK, NOT NULL |
| fecha_nacimiento | DATE | Fecha de nacimiento | NULL |
| genero | ENUM | MASCULINO, FEMENINO, OTRO | NULL |
| estado_civil | ENUM | SOLTERO, CASADO, DIVORCIADO, VIUDO | NULL |

### 🏢 PERSONAS_JURIDICAS
**Propósito**: Especialización para personas jurídicas con campos específicos.

| Campo | Tipo | Descripción | Restricciones |
|-------|------|-------------|---------------|
| persona_id | UUID | Referencia a personas | PK, FK, NOT NULL |
| nit | VARCHAR(20) | Número de identificación tributaria | UNIQUE |
| tipo_sociedad | VARCHAR(50) | Tipo de sociedad | NULL |
| fecha_constitucion | DATE | Fecha de constitución | NULL |

### 🛒 CLIENTES
**Propósito**: Gestión de clientes con información comercial específica.

| Campo | Tipo | Descripción | Restricciones |
|-------|------|-------------|---------------|
| id | UUID | Identificador único | PK, NOT NULL |
| persona_id | UUID | Referencia a personas | FK, NOT NULL |
| tipo_cliente | ENUM | MAYORISTA, MINORISTA, DISTRIBUIDOR | NOT NULL |
| limite_credito | DECIMAL(15,2) | Límite de crédito | DEFAULT 0 |
| descuento_habitual | DECIMAL(5,2) | Descuento porcentual | DEFAULT 0 |
| fecha_registro | DATE | Fecha de registro como cliente | DEFAULT TODAY() |
| activo | BOOLEAN | Estado activo/inactivo | DEFAULT TRUE |

**Índices**:
- `idx_clientes_tipo_activo`: Filtros por tipo y estado
- `idx_clientes_limite_credito`: Consultas por límite de crédito
- `idx_clientes_fecha_registro`: Consultas por fecha de registro

### 🏭 PROVEEDORES
**Propósito**: Gestión de proveedores con información comercial específica.

| Campo | Tipo | Descripción | Restricciones |
|-------|------|-------------|---------------|
| id | UUID | Identificador único | PK, NOT NULL |
| persona_id | UUID | Referencia a personas | FK, NOT NULL |
| calificacion | DECIMAL(3,2) | Calificación del proveedor (1-5) | CHECK (1-5) |
| tiempo_entrega_dias | INT | Tiempo promedio de entrega | DEFAULT 0 |
| condiciones_pago | TEXT | Condiciones de pago | NULL |
| activo | BOOLEAN | Estado activo/inactivo | DEFAULT TRUE |

**Índices**:
- `idx_proveedores_activo_calificacion`: Filtros por estado y calificación
- `idx_proveedores_tiempo_entrega`: Consultas por tiempo de entrega

### 🏷️ CATEGORIAS
**Propósito**: Clasificación jerárquica de productos.

| Campo | Tipo | Descripción | Restricciones |
|-------|------|-------------|---------------|
| id | UUID | Identificador único | PK, NOT NULL |
| codigo | VARCHAR(20) | Código único de categoría | UNIQUE, NOT NULL |
| nombre | VARCHAR(100) | Nombre de la categoría | NOT NULL |
| descripcion | TEXT | Descripción detallada | NULL |
| categoria_padre_id | UUID | Categoría padre (jerarquía) | FK, NULL |
| activo | BOOLEAN | Estado activo/inactivo | DEFAULT TRUE |

**Índices**:
- `idx_categorias_codigo`: Búsquedas por código
- `idx_categorias_padre`: Consultas jerárquicas
- `idx_categorias_activo`: Filtros por estado

### 📏 UNIDADES_MEDIDA
**Propósito**: Catálogo de unidades de medida para productos.

| Campo | Tipo | Descripción | Restricciones |
|-------|------|-------------|---------------|
| id | UUID | Identificador único | PK, NOT NULL |
| codigo | VARCHAR(10) | Código único (kg, lt, un) | UNIQUE, NOT NULL |
| nombre | VARCHAR(50) | Nombre completo | NOT NULL |
| simbolo | VARCHAR(10) | Símbolo de la unidad | NOT NULL |
| tipo | ENUM | PESO, VOLUMEN, LONGITUD, CANTIDAD | NOT NULL |
| factor_conversion | DECIMAL(10,6) | Factor de conversión a unidad base | DEFAULT 1 |
| activo | BOOLEAN | Estado activo/inactivo | DEFAULT TRUE |

### 🥕 PRODUCTOS
**Propósito**: Catálogo principal de productos.

| Campo | Tipo | Descripción | Restricciones |
|-------|------|-------------|---------------|
| id | UUID | Identificador único | PK, NOT NULL |
| codigo | VARCHAR(50) | Código único del producto | UNIQUE, NOT NULL |
| nombre | VARCHAR(200) | Nombre del producto | NOT NULL |
| descripcion | TEXT | Descripción detallada | NULL |
| categoria_id | UUID | Categoría del producto | FK, NOT NULL |
| unidad_medida_id | UUID | Unidad de medida | FK, NOT NULL |
| precio_venta | DECIMAL(15,2) | Precio de venta actual | NOT NULL |
| stock_actual | DECIMAL(15,3) | Stock actual | DEFAULT 0 |
| stock_minimo | DECIMAL(15,3) | Stock mínimo (alerta) | DEFAULT 0 |
| stock_maximo | DECIMAL(15,3) | Stock máximo | DEFAULT 0 |
| activo | BOOLEAN | Estado activo/inactivo | DEFAULT TRUE |

**Índices**:
- `idx_productos_codigo`: Búsquedas por código
- `idx_productos_nombre`: Búsquedas por nombre
- `idx_productos_categoria_activo`: Filtros por categoría y estado
- `idx_productos_stock_minimo`: Alertas de inventario
- `idx_productos_precio`: Consultas por precio
- `idx_productos_alerta_inventario`: Productos con bajo stock

### 🔗 PRODUCTOS_PROVEEDORES
**Propósito**: Relación muchos-a-muchos entre productos y proveedores.

| Campo | Tipo | Descripción | Restricciones |
|-------|------|-------------|---------------|
| id | UUID | Identificador único | PK, NOT NULL |
| producto_id | UUID | Referencia al producto | FK, NOT NULL |
| proveedor_id | UUID | Referencia al proveedor | FK, NOT NULL |
| precio_compra | DECIMAL(15,2) | Precio de compra | NOT NULL |
| tiempo_entrega_dias | INT | Tiempo de entrega específico | DEFAULT 0 |
| es_proveedor_preferido | BOOLEAN | Proveedor preferido | DEFAULT FALSE |
| activo | BOOLEAN | Relación activa | DEFAULT TRUE |

**Índices**:
- `idx_productos_proveedores_producto`: Consultas por producto
- `idx_productos_proveedores_proveedor`: Consultas por proveedor
- `idx_productos_proveedores_activo_preferencia`: Filtros por estado y preferencia
- `idx_productos_proveedores_precio`: Consultas por precio

### 📦 TIPOS_MOVIMIENTO
**Propósito**: Catálogo de tipos de movimientos de inventario.

| Campo | Tipo | Descripción | Restricciones |
|-------|------|-------------|---------------|
| id | UUID | Identificador único | PK, NOT NULL |
| codigo | VARCHAR(20) | Código único (ENT, SAL, AJU) | UNIQUE, NOT NULL |
| nombre | VARCHAR(100) | Nombre del tipo | NOT NULL |
| categoria | ENUM | ENTRADA, SALIDA, AJUSTE | NOT NULL |
| afecta_stock | BOOLEAN | Si afecta el stock | DEFAULT TRUE |
| requiere_documento | BOOLEAN | Si requiere documento | DEFAULT FALSE |
| requiere_autorizacion | BOOLEAN | Si requiere autorización | DEFAULT FALSE |
| activo | BOOLEAN | Estado activo/inactivo | DEFAULT TRUE |

### 📊 MOVIMIENTOS_INVENTARIO
**Propósito**: Registro de todos los movimientos de inventario.

| Campo | Tipo | Descripción | Restricciones |
|-------|------|-------------|---------------|
| id | UUID | Identificador único | PK, NOT NULL |
| producto_id | UUID | Producto afectado | FK, NOT NULL |
| tipo_movimiento_id | UUID | Tipo de movimiento | FK, NOT NULL |
| cantidad | DECIMAL(15,3) | Cantidad del movimiento | NOT NULL |
| precio_unitario | DECIMAL(15,2) | Precio unitario | NULL |
| fecha_movimiento | TIMESTAMP | Fecha y hora del movimiento | DEFAULT NOW() |
| documento_referencia | VARCHAR(100) | Documento de referencia | NULL |
| observaciones | TEXT | Observaciones adicionales | NULL |
| usuario_id | UUID | Usuario que registró | FK, NOT NULL |

**Índices**:
- `idx_movimientos_producto_fecha`: Consultas por producto y fecha
- `idx_movimientos_tipo`: Filtros por tipo de movimiento
- `idx_movimientos_usuario`: Consultas por usuario
- `idx_movimientos_fecha`: Consultas por fecha
- `idx_movimientos_documento`: Búsquedas por documento
- `idx_movimientos_periodo_tipo`: Reportes por período

### 📋 ESTADOS_PEDIDO
**Propósito**: Catálogo de estados para pedidos.

| Campo | Tipo | Descripción | Restricciones |
|-------|------|-------------|---------------|
| id | UUID | Identificador único | PK, NOT NULL |
| codigo | VARCHAR(20) | Código único (BOR, ENV, CON) | UNIQUE, NOT NULL |
| nombre | VARCHAR(100) | Nombre del estado | NOT NULL |
| descripcion | TEXT | Descripción del estado | NULL |
| tipo_pedido | ENUM | COMPRA, VENTA | NOT NULL |
| activo | BOOLEAN | Estado activo/inactivo | DEFAULT TRUE |

### 🛍️ PEDIDOS_COMPRA
**Propósito**: Gestión de pedidos de compra a proveedores.

| Campo | Tipo | Descripción | Restricciones |
|-------|------|-------------|---------------|
| id | UUID | Identificador único | PK, NOT NULL |
| numero_pedido | VARCHAR(50) | Número único del pedido | UNIQUE, NOT NULL |
| proveedor_id | UUID | Proveedor del pedido | FK, NOT NULL |
| estado_id | UUID | Estado actual del pedido | FK, NOT NULL |
| fecha_pedido | DATE | Fecha del pedido | DEFAULT TODAY() |
| fecha_entrega_esperada | DATE | Fecha esperada de entrega | NULL |
| total | DECIMAL(15,2) | Total del pedido | DEFAULT 0 |
| observaciones | TEXT | Observaciones del pedido | NULL |
| usuario_id | UUID | Usuario que creó el pedido | FK, NOT NULL |

**Índices**:
- `idx_pedidos_compra_proveedor`: Consultas por proveedor
- `idx_pedidos_compra_estado`: Filtros por estado
- `idx_pedidos_compra_fecha`: Consultas por fecha
- `idx_pedidos_compra_entrega`: Consultas por fecha de entrega
- `idx_pedidos_compra_usuario`: Consultas por usuario
- `idx_pedidos_compra_proveedor_estado`: Reportes por proveedor y estado

### 📝 PEDIDOS_COMPRA_ITEMS
**Propósito**: Detalle de items en pedidos de compra.

| Campo | Tipo | Descripción | Restricciones |
|-------|------|-------------|---------------|
| id | UUID | Identificador único | PK, NOT NULL |
| pedido_id | UUID | Pedido al que pertenece | FK, NOT NULL |
| producto_id | UUID | Producto del item | FK, NOT NULL |
| cantidad | DECIMAL(15,3) | Cantidad solicitada | NOT NULL |
| precio_unitario | DECIMAL(15,2) | Precio unitario acordado | NOT NULL |
| subtotal | DECIMAL(15,2) | Subtotal del item | NOT NULL |

**Índices**:
- `idx_pedidos_items_pedido`: Consultas por pedido
- `idx_pedidos_items_producto`: Consultas por producto
- `idx_pedidos_items_producto_cantidad`: Análisis de compras

### 👤 USUARIOS
**Propósito**: Gestión de usuarios del sistema.

| Campo | Tipo | Descripción | Restricciones |
|-------|------|-------------|---------------|
| id | UUID | Identificador único | PK, NOT NULL |
| username | VARCHAR(50) | Nombre de usuario | UNIQUE, NOT NULL |
| email | VARCHAR(150) | Correo electrónico | UNIQUE, NOT NULL |
| password_hash | VARCHAR(255) | Hash de la contraseña | NOT NULL |
| nombres | VARCHAR(100) | Nombres del usuario | NOT NULL |
| apellidos | VARCHAR(100) | Apellidos del usuario | NOT NULL |
| rol | ENUM | ADMIN, GERENTE, VENDEDOR, OPERADOR | NOT NULL |
| activo | BOOLEAN | Estado activo/inactivo | DEFAULT TRUE |
| requiere_cambio_password | BOOLEAN | Requiere cambio de contraseña | DEFAULT FALSE |
| ultimo_acceso | TIMESTAMP | Último acceso al sistema | NULL |
| fecha_expiracion_password | DATE | Fecha de expiración de contraseña | NULL |

**Índices**:
- `idx_usuarios_username`: Autenticación por username
- `idx_usuarios_email`: Autenticación por email
- `idx_usuarios_rol_activo`: Filtros por rol y estado
- `idx_usuarios_cambio_password`: Usuarios que requieren cambio

### 📋 AUDITORIA
**Propósito**: Registro de auditoría para trazabilidad completa.

| Campo | Tipo | Descripción | Restricciones |
|-------|------|-------------|---------------|
| id | UUID | Identificador único | PK, NOT NULL |
| entidad | VARCHAR(100) | Nombre de la entidad afectada | NOT NULL |
| entidad_id | VARCHAR(100) | ID de la entidad afectada | NOT NULL |
| accion | ENUM | CREATE, UPDATE, DELETE | NOT NULL |
| valores_antes | JSON | Valores antes del cambio | NULL |
| valores_despues | JSON | Valores después del cambio | NULL |
| usuario_id | UUID | Usuario que realizó la acción | FK, NOT NULL |
| fecha_accion | TIMESTAMP | Fecha y hora de la acción | DEFAULT NOW() |
| ip_address | VARCHAR(45) | Dirección IP del usuario | NULL |

**Índices**:
- `idx_auditoria_entidad`: Consultas por entidad
- `idx_auditoria_usuario`: Consultas por usuario
- `idx_auditoria_fecha`: Consultas por fecha
- `idx_auditoria_accion`: Filtros por tipo de acción
- `idx_auditoria_entidad_fecha`: Auditoría por entidad y fecha

---

## 🔗 Relaciones y Restricciones

### Relaciones Principales

#### 1. Herencia de Personas
```sql
PERSONAS (1) ←→ (1) PERSONAS_NATURALES
PERSONAS (1) ←→ (1) PERSONAS_JURIDICAS
PERSONAS (1) ←→ (0..n) CLIENTES
PERSONAS (1) ←→ (0..n) PROVEEDORES
```

#### 2. Productos y Catálogos
```sql
CATEGORIAS (1) ←→ (0..n) PRODUCTOS
UNIDADES_MEDIDA (1) ←→ (0..n) PRODUCTOS
CATEGORIAS (1) ←→ (0..n) CATEGORIAS (auto-referencia)
```

#### 3. Productos y Proveedores
```sql
PRODUCTOS (1) ←→ (0..n) PRODUCTOS_PROVEEDORES
PROVEEDORES (1) ←→ (0..n) PRODUCTOS_PROVEEDORES
```

#### 4. Inventario y Movimientos
```sql
PRODUCTOS (1) ←→ (0..n) MOVIMIENTOS_INVENTARIO
TIPOS_MOVIMIENTO (1) ←→ (0..n) MOVIMIENTOS_INVENTARIO
USUARIOS (1) ←→ (0..n) MOVIMIENTOS_INVENTARIO
```

#### 5. Pedidos de Compra
```sql
PROVEEDORES (1) ←→ (0..n) PEDIDOS_COMPRA
ESTADOS_PEDIDO (1) ←→ (0..n) PEDIDOS_COMPRA
USUARIOS (1) ←→ (0..n) PEDIDOS_COMPRA
PEDIDOS_COMPRA (1) ←→ (1..n) PEDIDOS_COMPRA_ITEMS
PRODUCTOS (1) ←→ (0..n) PEDIDOS_COMPRA_ITEMS
```

#### 6. Auditoría
```sql
USUARIOS (1) ←→ (0..n) AUDITORIA
```

### Restricciones de Integridad

#### Restricciones CHECK
```sql
-- Calificación de proveedores entre 1 y 5
ALTER TABLE proveedores ADD CONSTRAINT chk_calificacion 
CHECK (calificacion >= 1 AND calificacion <= 5);

-- Stock no puede ser negativo
ALTER TABLE productos ADD CONSTRAINT chk_stock_positivo 
CHECK (stock_actual >= 0);

-- Precios deben ser positivos
ALTER TABLE productos ADD CONSTRAINT chk_precio_positivo 
CHECK (precio_venta > 0);

-- Cantidad en movimientos no puede ser cero
ALTER TABLE movimientos_inventario ADD CONSTRAINT chk_cantidad_no_cero 
CHECK (cantidad != 0);
```

#### Restricciones de Eliminación
```sql
-- Eliminación en cascada para relaciones dependientes
ALTER TABLE personas_naturales 
ADD CONSTRAINT fk_personas_naturales_persona 
FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE;

-- Restricción de eliminación para entidades con historial
ALTER TABLE movimientos_inventario 
ADD CONSTRAINT fk_movimientos_producto 
FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE RESTRICT;
```

---

## ⚡ Índices y Optimizaciones

### Índices Creados

#### Índices de Búsqueda Frecuente
- **Personas**: número_identificación, email, nombres+apellidos
- **Productos**: código, nombre, categoría+activo
- **Usuarios**: username, email (únicos)

#### Índices de Filtrado
- **Estado activo**: Todas las entidades principales
- **Fechas**: movimientos_inventario, pedidos_compra, auditoria
- **Relaciones**: Todas las claves foráneas

#### Índices Compuestos
- **Alertas de inventario**: activo + stock_actual + stock_minimo
- **Reportes de movimientos**: fecha + tipo + producto
- **Auditoría por entidad**: entidad + entidad_id + fecha

#### Índices de Texto Completo
```sql
-- Búsquedas en productos
ALTER TABLE productos ADD FULLTEXT(nombre, descripcion);

-- Búsquedas en personas
ALTER TABLE personas ADD FULLTEXT(nombres, apellidos, razon_social);
```

### Optimizaciones de Performance

#### 1. Particionamiento (Recomendado para producción)
```sql
-- Particionamiento de movimientos_inventario por fecha
ALTER TABLE movimientos_inventario 
PARTITION BY RANGE (YEAR(fecha_movimiento)) (
    PARTITION p2024 VALUES LESS THAN (2025),
    PARTITION p2025 VALUES LESS THAN (2026),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);

-- Particionamiento de auditoria por fecha
ALTER TABLE auditoria 
PARTITION BY RANGE (YEAR(fecha_accion)) (
    PARTITION p2024 VALUES LESS THAN (2025),
    PARTITION p2025 VALUES LESS THAN (2026),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);
```

#### 2. Configuraciones de MySQL
```sql
-- Configuraciones recomendadas para my.cnf
innodb_buffer_pool_size = 1G
innodb_log_file_size = 256M
query_cache_size = 128M
tmp_table_size = 64M
max_heap_table_size = 64M
```

---

## 🔧 Procedimientos y Vistas

### Vistas Principales

#### 1. Vista de Alertas de Inventario
```sql
CREATE VIEW v_inventario_alertas AS
SELECT 
    p.id,
    p.codigo,
    p.nombre,
    p.stock_actual,
    p.stock_minimo,
    c.nombre AS categoria,
    um.simbolo AS unidad,
    CASE 
        WHEN p.stock_actual <= 0 THEN 'SIN_STOCK'
        WHEN p.stock_actual <= p.stock_minimo THEN 'STOCK_BAJO'
        ELSE 'STOCK_OK'
    END AS estado_stock
FROM productos p
JOIN categorias c ON p.categoria_id = c.id
JOIN unidades_medida um ON p.unidad_medida_id = um.id
WHERE p.activo = 1
ORDER BY p.stock_actual / p.stock_minimo ASC;
```

#### 2. Vista de Resumen de Proveedores
```sql
CREATE VIEW v_proveedores_resumen AS
SELECT 
    prov.id,
    pers.razon_social,
    pers.nombres,
    pers.apellidos,
    prov.calificacion,
    prov.tiempo_entrega_dias,
    COUNT(pp.id) AS productos_suministrados,
    AVG(pp.precio_compra) AS precio_promedio
FROM proveedores prov
JOIN personas pers ON prov.persona_id = pers.id
LEFT JOIN productos_proveedores pp ON prov.id = pp.proveedor_id AND pp.activo = 1
WHERE prov.activo = 1
GROUP BY prov.id, pers.razon_social, pers.nombres, pers.apellidos, 
         prov.calificacion, prov.tiempo_entrega_dias;
```

#### 3. Vista de Resumen de Clientes
```sql
CREATE VIEW v_clientes_resumen AS
SELECT 
    cli.id,
    pers.razon_social,
    pers.nombres,
    pers.apellidos,
    cli.tipo_cliente,
    cli.limite_credito,
    cli.descuento_habitual,
    cli.fecha_registro
FROM clientes cli
JOIN personas pers ON cli.persona_id = pers.id
WHERE cli.activo = 1;
```

### Procedimientos Almacenados

#### 1. Actualizar Stock de Producto
```sql
DELIMITER //
CREATE PROCEDURE sp_actualizar_stock(
    IN p_producto_id UUID,
    IN p_tipo_movimiento_id UUID,
    IN p_cantidad DECIMAL(15,3),
    IN p_precio_unitario DECIMAL(15,2),
    IN p_documento_referencia VARCHAR(100),
    IN p_observaciones TEXT,
    IN p_usuario_id UUID
)
BEGIN
    DECLARE v_afecta_stock BOOLEAN;
    DECLARE v_categoria_movimiento ENUM('ENTRADA', 'SALIDA', 'AJUSTE');
    DECLARE v_stock_actual DECIMAL(15,3);
    
    -- Obtener información del tipo de movimiento
    SELECT afecta_stock, categoria 
    INTO v_afecta_stock, v_categoria_movimiento
    FROM tipos_movimiento 
    WHERE id = p_tipo_movimiento_id;
    
    -- Obtener stock actual
    SELECT stock_actual INTO v_stock_actual
    FROM productos 
    WHERE id = p_producto_id;
    
    -- Validar stock suficiente para salidas
    IF v_categoria_movimiento = 'SALIDA' AND v_stock_actual < p_cantidad THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Stock insuficiente';
    END IF;
    
    -- Insertar movimiento
    INSERT INTO movimientos_inventario (
        id, producto_id, tipo_movimiento_id, cantidad, precio_unitario,
        fecha_movimiento, documento_referencia, observaciones, usuario_id
    ) VALUES (
        UUID(), p_producto_id, p_tipo_movimiento_id, p_cantidad, p_precio_unitario,
        NOW(), p_documento_referencia, p_observaciones, p_usuario_id
    );
    
    -- Actualizar stock si el tipo de movimiento lo afecta
    IF v_afecta_stock THEN
        UPDATE productos 
        SET stock_actual = CASE 
            WHEN v_categoria_movimiento = 'ENTRADA' THEN stock_actual + p_cantidad
            WHEN v_categoria_movimiento = 'SALIDA' THEN stock_actual - p_cantidad
            WHEN v_categoria_movimiento = 'AJUSTE' THEN p_cantidad
            ELSE stock_actual
        END
        WHERE id = p_producto_id;
    END IF;
    
END //
DELIMITER ;
```

#### 2. Crear Pedido de Compra
```sql
DELIMITER //
CREATE PROCEDURE sp_crear_pedido_compra(
    IN p_proveedor_id UUID,
    IN p_fecha_entrega_esperada DATE,
    IN p_observaciones TEXT,
    IN p_usuario_id UUID,
    OUT p_pedido_id UUID
)
BEGIN
    DECLARE v_numero_pedido VARCHAR(50);
    DECLARE v_estado_borrador UUID;
    
    -- Generar número de pedido
    SELECT CONCAT('PC-', YEAR(NOW()), '-', LPAD(COALESCE(MAX(SUBSTRING(numero_pedido, -6)), 0) + 1, 6, '0'))
    INTO v_numero_pedido
    FROM pedidos_compra 
    WHERE numero_pedido LIKE CONCAT('PC-', YEAR(NOW()), '-%');
    
    -- Obtener estado borrador
    SELECT id INTO v_estado_borrador
    FROM estados_pedido 
    WHERE codigo = 'BORRADOR' AND tipo_pedido = 'COMPRA';
    
    -- Generar ID del pedido
    SET p_pedido_id = UUID();
    
    -- Crear pedido
    INSERT INTO pedidos_compra (
        id, numero_pedido, proveedor_id, estado_id, fecha_pedido,
        fecha_entrega_esperada, total, observaciones, usuario_id
    ) VALUES (
        p_pedido_id, v_numero_pedido, p_proveedor_id, v_estado_borrador, 
        CURDATE(), p_fecha_entrega_esperada, 0, p_observaciones, p_usuario_id
    );
    
END //
DELIMITER ;
```

### Triggers de Auditoría

#### 1. Trigger para Auditoría de Productos
```sql
DELIMITER //
CREATE TRIGGER tr_productos_audit_update
AFTER UPDATE ON productos
FOR EACH ROW
BEGIN
    INSERT INTO auditoria (
        id, entidad, entidad_id, accion, valores_antes, valores_despues,
        usuario_id, fecha_accion
    ) VALUES (
        UUID(), 'productos', NEW.id, 'UPDATE',
        JSON_OBJECT(
            'codigo', OLD.codigo,
            'nombre', OLD.nombre,
            'precio_venta', OLD.precio_venta,
            'stock_actual', OLD.stock_actual
        ),
        JSON_OBJECT(
            'codigo', NEW.codigo,
            'nombre', NEW.nombre,
            'precio_venta', NEW.precio_venta,
            'stock_actual', NEW.stock_actual
        ),
        @current_user_id, NOW()
    );
END //
DELIMITER ;
```

---

## 📖 Guía de Uso

### Operaciones Básicas

#### 1. Crear una Persona Natural
```javascript
const persona = await prisma.persona.create({
  data: {
    numero_identificacion: "12345678",
    nombres: "Juan Carlos",
    apellidos: "Pérez García",
    tipo_entidad: "NATURAL",
    email: "juan.perez@email.com",
    telefono: "3001234567",
    direccion: "Calle 123 #45-67",
    persona_natural: {
      create: {
        fecha_nacimiento: new Date("1985-06-15"),
        genero: "MASCULINO",
        estado_civil: "CASADO"
      }
    }
  },
  include: {
    persona_natural: true
  }
});
```

#### 2. Crear un Cliente
```javascript
const cliente = await prisma.cliente.create({
  data: {
    persona_id: persona.id,
    tipo_cliente: "MINORISTA",
    limite_credito: 1000000,
    descuento_habitual: 5.0
  }
});
```

#### 3. Crear un Producto
```javascript
const producto = await prisma.producto.create({
  data: {
    codigo: "NARANJA-001",
    nombre: "Naranja Valencia",
    descripcion: "Naranja fresca de primera calidad",
    categoria_id: categoria_frutas.id,
    unidad_medida_id: unidad_kg.id,
    precio_venta: 3500,
    stock_actual: 100,
    stock_minimo: 20,
    stock_maximo: 500
  }
});
```

#### 4. Registrar Movimiento de Inventario
```javascript
const movimiento = await prisma.movimientoInventario.create({
  data: {
    producto_id: producto.id,
    tipo_movimiento_id: tipo_entrada.id,
    cantidad: 50,
    precio_unitario: 3000,
    documento_referencia: "FC-001",
    observaciones: "Compra a proveedor principal",
    usuario_id: usuario.id
  }
});

// Actualizar stock del producto
await prisma.producto.update({
  where: { id: producto.id },
  data: {
    stock_actual: {
      increment: 50
    }
  }
});
```

#### 5. Crear Pedido de Compra
```javascript
const pedido = await prisma.pedidoCompra.create({
  data: {
    numero_pedido: "PC-2024-000001",
    proveedor_id: proveedor.id,
    estado_id: estado_borrador.id,
    fecha_entrega_esperada: new Date("2024-11-15"),
    observaciones: "Pedido urgente",
    usuario_id: usuario.id,
    items: {
      create: [
        {
          producto_id: producto.id,
          cantidad: 100,
          precio_unitario: 3000,
          subtotal: 300000
        }
      ]
    }
  },
  include: {
    items: true
  }
});
```

### Consultas Avanzadas

#### 1. Productos con Bajo Stock
```javascript
const productosAlerta = await prisma.producto.findMany({
  where: {
    activo: true,
    stock_actual: {
      lte: prisma.producto.fields.stock_minimo
    }
  },
  include: {
    categoria: true,
    unidad_medida: true
  },
  orderBy: {
    stock_actual: 'asc'
  }
});
```

#### 2. Historial de Movimientos por Producto
```javascript
const historialMovimientos = await prisma.movimientoInventario.findMany({
  where: {
    producto_id: producto.id,
    fecha_movimiento: {
      gte: new Date("2024-01-01"),
      lte: new Date("2024-12-31")
    }
  },
  include: {
    tipo_movimiento: true,
    usuario: {
      select: {
        username: true,
        nombres: true,
        apellidos: true
      }
    }
  },
  orderBy: {
    fecha_movimiento: 'desc'
  }
});
```

#### 3. Reporte de Ventas por Proveedor
```javascript
const reporteProveedores = await prisma.proveedor.findMany({
  where: {
    activo: true
  },
  include: {
    persona: true,
    productos_proveedores: {
      where: {
        activo: true
      },
      include: {
        producto: {
          include: {
            movimientos_inventario: {
              where: {
                fecha_movimiento: {
                  gte: new Date("2024-01-01"),
                  lte: new Date("2024-12-31")
                }
              }
            }
          }
        }
      }
    }
  }
});
```

### Mejores Prácticas

#### 1. Transacciones
```javascript
const resultado = await prisma.$transaction(async (tx) => {
  // Crear movimiento
  const movimiento = await tx.movimientoInventario.create({
    data: movimientoData
  });
  
  // Actualizar stock
  await tx.producto.update({
    where: { id: producto_id },
    data: { stock_actual: nuevo_stock }
  });
  
  return movimiento;
});
```

#### 2. Validaciones
```javascript
// Validar stock antes de salida
const producto = await prisma.producto.findUnique({
  where: { id: producto_id }
});

if (producto.stock_actual < cantidad_salida) {
  throw new Error('Stock insuficiente');
}
```

#### 3. Paginación
```javascript
const productos = await prisma.producto.findMany({
  skip: (page - 1) * pageSize,
  take: pageSize,
  where: filtros,
  orderBy: ordenamiento
});

const total = await prisma.producto.count({
  where: filtros
});
```

---

## 🎯 Conclusión

Esta documentación presenta un esquema de base de datos robusto, escalable y optimizado para un sistema de gestión de inventario y ventas. Las características principales incluyen:

### ✅ Beneficios Implementados
- **Normalización completa** hasta 3FN
- **Integridad referencial** garantizada
- **Performance optimizada** con índices estratégicos
- **Escalabilidad** preparada para crecimiento
- **Auditoría completa** para trazabilidad
- **Flexibilidad** para futuras extensiones

### 🚀 Próximos Pasos Recomendados
1. Implementar particionamiento en producción
2. Configurar respaldos automáticos
3. Monitorear performance de consultas
4. Implementar cache de consultas frecuentes
5. Crear dashboards de monitoreo

### 📞 Soporte
Para consultas sobre la implementación o modificaciones del esquema, consulte la documentación técnica adicional o contacte al equipo de desarrollo.

---

*Documentación generada el 27 de octubre de 2024*
*Versión del esquema: 1.0*