-- 更新租赁表结构，添加客户姓名和手机号字段，移除客户表依赖
-- 添加客户姓名和手机号字段到租赁表
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS customer_name VARCHAR(100);
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(20);

-- 更新现有租赁记录的客户信息
UPDATE rentals 
SET customer_name = customers.name, 
    customer_phone = customers.phone 
FROM customers 
WHERE rentals.customer_id = customers.id;

-- 移除客户表的外键约束
ALTER TABLE rentals DROP CONSTRAINT IF EXISTS rentals_customer_id_fkey;

-- 移除客户ID字段（可选，如果需要完全移除客户表依赖）
-- ALTER TABLE rentals DROP COLUMN customer_id;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_rentals_customer_name ON rentals(customer_name);
CREATE INDEX IF NOT EXISTS idx_rentals_customer_phone ON rentals(customer_phone);
