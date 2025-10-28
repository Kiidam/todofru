-- 修复数据库schema不匹配问题
-- 添加缺失的 lastModifiedBy 和 version 列

-- 1. 为 pedidocompra 表添加缺失的列
ALTER TABLE pedidocompra 
ADD COLUMN lastModifiedBy VARCHAR(255) NULL,
ADD COLUMN version INT NOT NULL DEFAULT 1;

-- 2. 为 proveedor 表添加缺失的列（如果需要）
ALTER TABLE proveedor 
ADD COLUMN lastModifiedBy VARCHAR(255) NULL,
ADD COLUMN version INT NOT NULL DEFAULT 1;

-- 3. 检查其他表是否需要这些列
-- 为 producto 表添加索引（如果还没有）
CREATE INDEX IF NOT EXISTS idx_producto_version ON producto(version);
CREATE INDEX IF NOT EXISTS idx_proveedor_version ON proveedor(version);

-- 4. 更新现有记录的版本号
UPDATE pedidocompra SET version = 1 WHERE version IS NULL OR version = 0;
UPDATE proveedor SET version = 1 WHERE version IS NULL OR version = 0;