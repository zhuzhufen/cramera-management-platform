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
        await client.connect();
        
        // 检查数据库是否存在
        const dbCheck = await client.query(`
            SELECT 1 FROM pg_database WHERE datname = 'camera_rental_management'
        `);
        
        if (dbCheck.rows.length === 0) {
            await client.query('CREATE DATABASE camera_rental_management');
        }
        
        await client.end();
        
        // 现在连接到新数据库执行初始化脚本
        const dbClient = new Client({
            ...config,
            database: 'camera_rental_management'
        });
        
        await dbClient.connect();
        
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
        
        await dbClient.end();
        
    } catch (error) {
        console.error('数据库设置失败:', error.message);
        process.exit(1);
    }
}

// 如果直接运行此文件
if (require.main === module) {
    setupDatabase();
}

module.exports = setupDatabase;
