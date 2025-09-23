-- AlterTable
ALTER TABLE `cliente` ADD COLUMN `grupoClienteId` VARCHAR(191) NULL,
    ADD COLUMN `mensajePersonalizado` VARCHAR(191) NULL,
    ADD COLUMN `metodoPago` ENUM('EFECTIVO', 'TRANSFERENCIA', 'CHEQUE', 'TARJETA', 'YAPE', 'PLIN', 'OTRO') NULL,
    ADD COLUMN `website` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `GrupoCliente` (
    `id` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `descripcion` VARCHAR(191) NULL,
    `descuento` DOUBLE NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `GrupoCliente_nombre_key`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Cliente` ADD CONSTRAINT `Cliente_grupoClienteId_fkey` FOREIGN KEY (`grupoClienteId`) REFERENCES `GrupoCliente`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
