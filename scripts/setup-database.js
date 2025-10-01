const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// 数据库连接配置
const config = {
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    password: '123456',
    database: 'postgres' // 连接到默认数据库来创建新数据库
};

async function setupDatabase() {
    const client = new Client(config);
    
    try {
        console.log('正在连接到PostgreSQL...');
        await client.connect();
        
        // 检查数据库是否存在
        console.log('检查数据库是否存在...');
        const dbCheck = await client.query(`
            SELECT 1 FROM pg_database WHERE datname = 'camera_rental_management'
        `);
        
        if (dbCheck.rows.length === 0) {
            console.log('创建数据库 camera_rental_management...');
            await client.query('CREATE DATABASE camera_rental_management');
            console.log('数据库创建成功！');
        } else {
            console.log('数据库已存在，跳过创建');
        }
        
        await client.end();
        
        // 现在连接到新数据库执行初始化脚本
        const dbClient = new Client({
            ...config,
            database: 'camera_rental_management'
        });
        
        await dbClient.connect();
        console.log('连接到 camera_rental_management 数据库...');
        
        // 读取并执行初始化SQL
        const sqlPath = path.join(__dirname, 'database', 'init.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        // 分割SQL语句并执行
        const statements = sql.split(';').filter(stmt => stmt.trim());
        
        for (const statement of statements) {
            if (statement.trim()) {
                try {
                    await dbClient.query(statement);
                } catch (error) {
                    // 忽略一些预期的错误（如表已存在）
                    if (!error.message.includes('already exists') && 
                        !error.message.includes('does not exist')) {
                        console.warn('执行SQL语句时出现警告:', error.message);
                    }
                }
            }
        }
        
        console.log('数据库初始化完成！');
        console.log('示例数据已插入：');
        console.log('- 5台相机');
        console.log('- 3个客户');
        console.log('- 3条租赁记录');
        
        await dbClient.end();
        
    } catch (error) {
        console.error('数据库设置失败:', error.message);
        console.log('\n请确保：');
        console.log('1. PostgreSQL服务正在运行');
        console.log('2. 数据库连接信息正确');
        console.log('3. 用户postgres有创建数据库的权限');
        process.exit(1);
    }
}

// 如果直接运行此文件
if (require.main === module) {
    setupDatabase();
}

module.exports = setupDatabase;
