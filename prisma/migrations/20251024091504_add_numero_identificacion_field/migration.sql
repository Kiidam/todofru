-- CreateTable
CREATE TABLE `categoria` (
    `id` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(255) NOT NULL,
    `descripcion` TEXT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `nombre`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cliente` (
    `id` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(255) NOT NULL,
    `ruc` VARCHAR(11) NULL,
    `telefono` VARCHAR(50) NULL,
    `email` VARCHAR(191) NULL,
    `direccion` VARCHAR(255) NULL,
    `contacto` VARCHAR(255) NULL,
    `tipoCliente` ENUM('MAYORISTA', 'MINORISTA') NOT NULL DEFAULT 'MINORISTA',
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `ruc`(`ruc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `movimientoinventario` (
    `productoId` VARCHAR(191) NOT NULL,
    `tipo` ENUM('ENTRADA', 'SALIDA', 'AJUSTE') NOT NULL,
    `cantidad` DOUBLE NOT NULL,
    `cantidadAnterior` DOUBLE NOT NULL,
    `cantidadNueva` DOUBLE NOT NULL,
    `precio` DOUBLE NULL,
    `motivo` VARCHAR(255) NULL,
    `numeroGuia` VARCHAR(191) NULL,
    `pedidoCompraId` VARCHAR(191) NULL,
    `pedidoVentaId` VARCHAR(191) NULL,
    `usuarioId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `fk_mi_pc`(`pedidoCompraId`),
    INDEX `fk_mi_pv`(`pedidoVentaId`),
    INDEX `fk_mi_usuario`(`usuarioId`),
    INDEX `idx_mi_created`(`createdAt`),
    INDEX `idx_mi_producto`(`productoId`),
    INDEX `idx_mi_tipo`(`tipo`),
    PRIMARY KEY (`productoId`, `createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pedidocompra` (
    `id` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(191) NOT NULL,
    `proveedorId` VARCHAR(191) NOT NULL,
    `fecha` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `fechaEntrega` DATETIME(0) NULL,
    `subtotal` DOUBLE NOT NULL DEFAULT 0,
    `impuestos` DOUBLE NOT NULL DEFAULT 0,
    `total` DOUBLE NOT NULL DEFAULT 0,
    `observaciones` TEXT NULL,
    `numeroGuia` VARCHAR(191) NULL,
    `archivoGuia` VARCHAR(191) NULL,
    `usuarioId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `numero`(`numero`),
    INDEX `fk_pc_usuario`(`usuarioId`),
    INDEX `idx_pc_fecha`(`fecha`),
    INDEX `idx_pc_proveedor`(`proveedorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pedidocompraitem` (
    `id` VARCHAR(191) NOT NULL,
    `pedidoId` VARCHAR(191) NOT NULL,
    `productoId` VARCHAR(191) NOT NULL,
    `cantidad` DOUBLE NOT NULL,
    `precio` DOUBLE NOT NULL,
    `subtotal` DOUBLE NOT NULL,

    INDEX `idx_pci_pedido`(`pedidoId`),
    INDEX `idx_pci_producto`(`productoId`),
    UNIQUE INDEX `uq_pci_pedido_producto`(`pedidoId`, `productoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pedidoventa` (
    `id` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(191) NOT NULL,
    `clienteId` VARCHAR(191) NOT NULL,
    `fecha` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `subtotal` DOUBLE NOT NULL DEFAULT 0,
    `impuestos` DOUBLE NOT NULL DEFAULT 0,
    `total` DOUBLE NOT NULL DEFAULT 0,
    `estado` ENUM('PENDIENTE', 'CONFIRMADO', 'EN_PROCESO', 'COMPLETADO', 'ANULADO') NOT NULL DEFAULT 'PENDIENTE',
    `observaciones` TEXT NULL,
    `numeroGuia` VARCHAR(191) NULL,
    `archivoGuia` VARCHAR(191) NULL,
    `usuarioId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `numero`(`numero`),
    INDEX `fk_pv_usuario`(`usuarioId`),
    INDEX `idx_pv_cliente`(`clienteId`),
    INDEX `idx_pv_fecha`(`fecha`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pedidoventaitem` (
    `id` VARCHAR(191) NOT NULL,
    `pedidoId` VARCHAR(191) NOT NULL,
    `productoId` VARCHAR(191) NOT NULL,
    `cantidad` DOUBLE NOT NULL,
    `precio` DOUBLE NOT NULL,
    `subtotal` DOUBLE NOT NULL,

    INDEX `idx_pvi_pedido`(`pedidoId`),
    INDEX `idx_pvi_producto`(`productoId`),
    UNIQUE INDEX `uq_pvi_pedido_producto`(`pedidoId`, `productoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `producto` (
    `id` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(255) NOT NULL,
    `sku` VARCHAR(191) NULL,
    `descripcion` TEXT NULL,
    `categoriaId` VARCHAR(191) NULL,
    `unidadMedidaId` VARCHAR(191) NOT NULL,
    `precio` DOUBLE NOT NULL DEFAULT 0,
    `porcentajeMerma` DOUBLE NOT NULL DEFAULT 0,
    `stock` DOUBLE NOT NULL DEFAULT 0,
    `stockMinimo` DOUBLE NOT NULL DEFAULT 0,
    `perecedero` BOOLEAN NOT NULL DEFAULT true,
    `diasVencimiento` INTEGER NULL,
    `tieneIGV` BOOLEAN NOT NULL DEFAULT true,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `sku`(`sku`),
    INDEX `fk_prod_categoria`(`categoriaId`),
    INDEX `fk_prod_unidad`(`unidadMedidaId`),
    INDEX `idx_prod_activo`(`activo`),
    INDEX `idx_prod_nombre`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `proveedor` (
    `id` VARCHAR(191) NOT NULL,
    `tipoEntidad` ENUM('PERSONA_NATURAL', 'PERSONA_JURIDICA') NOT NULL DEFAULT 'PERSONA_JURIDICA',
    `nombre` VARCHAR(255) NOT NULL,
    `numeroIdentificacion` VARCHAR(11) NULL,
    `telefono` VARCHAR(50) NULL,
    `email` VARCHAR(191) NULL,
    `direccion` VARCHAR(255) NULL,
    `contacto` VARCHAR(255) NULL,
    `nombres` VARCHAR(100) NULL,
    `apellidos` VARCHAR(100) NULL,
    `razonSocial` VARCHAR(255) NULL,
    `representanteLegal` VARCHAR(255) NULL,
    `ruc` VARCHAR(11) NULL,
    `dni` VARCHAR(8) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `numero_identificacion`(`numeroIdentificacion`),
    INDEX `idx_proveedor_tipo`(`tipoEntidad`),
    INDEX `idx_proveedor_numero_identificacion`(`numeroIdentificacion`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `unidadmedida` (
    `id` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(255) NOT NULL,
    `simbolo` VARCHAR(50) NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `nombre`(`nombre`),
    UNIQUE INDEX `simbolo`(`simbolo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NULL,
    `role` ENUM('USER', 'ADMIN') NOT NULL DEFAULT 'ADMIN',
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `email`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `movimientoinventario` ADD CONSTRAINT `fk_mi_pc` FOREIGN KEY (`pedidoCompraId`) REFERENCES `pedidocompra`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `movimientoinventario` ADD CONSTRAINT `fk_mi_producto` FOREIGN KEY (`productoId`) REFERENCES `producto`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `movimientoinventario` ADD CONSTRAINT `fk_mi_pv` FOREIGN KEY (`pedidoVentaId`) REFERENCES `pedidoventa`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `movimientoinventario` ADD CONSTRAINT `fk_mi_usuario` FOREIGN KEY (`usuarioId`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `pedidocompra` ADD CONSTRAINT `fk_pc_proveedor` FOREIGN KEY (`proveedorId`) REFERENCES `proveedor`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `pedidocompra` ADD CONSTRAINT `fk_pc_usuario` FOREIGN KEY (`usuarioId`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `pedidocompraitem` ADD CONSTRAINT `fk_pci_pedido` FOREIGN KEY (`pedidoId`) REFERENCES `pedidocompra`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `pedidocompraitem` ADD CONSTRAINT `fk_pci_producto` FOREIGN KEY (`productoId`) REFERENCES `producto`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `pedidoventa` ADD CONSTRAINT `fk_pv_cliente` FOREIGN KEY (`clienteId`) REFERENCES `cliente`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `pedidoventa` ADD CONSTRAINT `fk_pv_usuario` FOREIGN KEY (`usuarioId`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `pedidoventaitem` ADD CONSTRAINT `fk_pvi_pedido` FOREIGN KEY (`pedidoId`) REFERENCES `pedidoventa`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `pedidoventaitem` ADD CONSTRAINT `fk_pvi_producto` FOREIGN KEY (`productoId`) REFERENCES `producto`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `producto` ADD CONSTRAINT `fk_prod_categoria` FOREIGN KEY (`categoriaId`) REFERENCES `categoria`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `producto` ADD CONSTRAINT `fk_prod_unidad` FOREIGN KEY (`unidadMedidaId`) REFERENCES `unidadmedida`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
