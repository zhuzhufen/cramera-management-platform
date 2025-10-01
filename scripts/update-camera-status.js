const { Client } = require('pg');

// 数据库连接配置
const config = {
    host: '127.0.0.1',
    port: 5432,
    database: 'camera_rental_management',
    user: 'postgres',
    password: '123456',
};

async function updateCameraStatus() {
    const client = new Client(config);
    
    try {
        await client.connect();
        
        // 更新所有相机状态为 available
        const result = await client.query('UPDATE cameras SET status = $1', ['available']);
        
        console.log(`成功更新 ${result.rowCount} 台相机的状态`);
        
        await client.end();
        
    } catch (error) {
        console.error('更新相机状态失败:', error.message);
        process.exit(1);
    }
}

updateCameraStatus();
