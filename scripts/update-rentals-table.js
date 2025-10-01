const { Pool } = require('pg');

// PostgreSQL 数据库连接配置
const pool = new Pool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'camera_rental_management',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '123456'
});

async function updateRentalsTable() {
    const client = await pool.connect();
    
    try {
        console.log('开始更新租赁表结构...');
        
        await client.query('BEGIN');
        
        // 添加客户姓名和手机号字段到租赁表
        console.log('添加客户姓名和手机号字段...');
        await client.query('ALTER TABLE rentals ADD COLUMN IF NOT EXISTS customer_name VARCHAR(100)');
        await client.query('ALTER TABLE rentals ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(20)');
        
        // 更新现有租赁记录的客户信息
        console.log('更新现有租赁记录的客户信息...');
        await client.query(`
            UPDATE rentals 
            SET customer_name = customers.name, 
                customer_phone = customers.phone 
            FROM customers 
            WHERE rentals.customer_id = customers.id
        `);
        
        // 移除客户表的外键约束
        console.log('移除客户表的外键约束...');
        await client.query('ALTER TABLE rentals DROP CONSTRAINT IF EXISTS rentals_customer_id_fkey');
        
        // 创建索引
        console.log('创建索引...');
        await client.query('CREATE INDEX IF NOT EXISTS idx_rentals_customer_name ON rentals(customer_name)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_rentals_customer_phone ON rentals(customer_phone)');
        
        await client.query('COMMIT');
        console.log('租赁表结构更新成功！');
        
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('更新租赁表结构失败:', err);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

updateRentalsTable().catch(err => {
    console.error('执行失败:', err);
    process.exit(1);
});
