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
        console.log('正在连接到PostgreSQL...');
        await client.connect();
        
        // 更新所有相机状态为 available
        console.log('更新相机状态为 available...');
        const result = await client.query('UPDATE cameras SET status = $1', ['available']);
        
        console.log(`成功更新 ${result.rowCount} 台相机的状态`);
        
        // 验证更新结果
        const checkResult = await client.query('SELECT camera_code, status FROM cameras');
        console.log('\n当前相机状态:');
        checkResult.rows.forEach(row => {
            console.log(`${row.camera_code}: ${row.status}`);
        });
        
        await client.end();
        
    } catch (error) {
        console.error('更新相机状态失败:', error.message);
        process.exit(1);
    }
}

updateCameraStatus();
