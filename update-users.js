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
        await pool.query(`
            INSERT INTO users (username, password, role, agent_name) VALUES 
            ('admin', '$2b$10$S5byTFxZS5nxRHWdRgWld.Ndf3y.sQezucdsNeBJSPPz3gx.FY6X2', 'admin', NULL),
            ('zhangsan', '$2b$10$S5byTFxZS5nxRHWdRgWld.Ndf3y.sQezucdsNeBJSPPz3gx.FY6X2', 'agent', '张三'),
            ('lisi', '$2b$10$S5byTFxZS5nxRHWdRgWld.Ndf3y.sQezucdsNeBJSPPz3gx.FY6X2', 'agent', '李四'),
            ('wangwu', '$2b$10$S5byTFxZS5nxRHWdRgWld.Ndf3y.sQezucdsNeBJSPPz3gx.FY6X2', 'agent', '王五')
        `);
        
        console.log('用户数据更新成功！');
    } catch (error) {
        console.error('更新用户数据失败:', error);
    } finally {
        await pool.end();
    }
}

updateUsers();
