const { Pool } = require('pg');

const pool = new Pool({
    host: '127.0.0.1',
    port: 5432,
    database: 'camera_rental_management',
    user: 'postgres',
    password: '123456',
});

async function updateUsers() {
    try {
        // 删除现有用户
        await pool.query('DELETE FROM users');
        
        // 插入新用户数据
        // 注意：这里不再插入测试账号，请根据需要添加实际用户数据
        console.log('用户数据已清空，请根据需要添加实际用户数据');
        
        console.log('用户数据更新成功！');
    } catch (error) {
        console.error('更新用户数据失败:', error);
    } finally {
        await pool.end();
    }
}

updateUsers();
