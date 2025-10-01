// 测试登录API
const CryptoUtils = require('./utils/crypto-utils');

async function testLogin() {
    console.log('=== 测试登录API ===\n');
    
    // 测试数据
    const testData = {
        username: 'admin',
        password: 'admin123'
    };
    
    console.log('测试数据:', testData);
    
    try {
        // 模拟前端加密
        console.log('\n1. 前端加密密码...');
        const encryptedPassword = CryptoUtils.simulateFrontendEncryption(testData.password);
        console.log('加密后:', encryptedPassword);
        
        // 构建请求数据
        const requestData = {
            username: testData.username,
            encrypted_password: encryptedPassword
        };
        
        console.log('\n2. 发送登录请求...');
        console.log('请求数据:', JSON.stringify(requestData, null, 2));
        
        // 发送HTTP请求
        const response = await fetch('http://127.0.0.1:3000/cam/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });
        
        console.log('\n3. 服务器响应:');
        console.log('状态码:', response.status);
        console.log('状态文本:', response.statusText);
        
        if (!response.ok) {
            const errorData = await response.json();
            console.log('错误信息:', errorData);
            return false;
        }
        
        const data = await response.json();
        console.log('登录成功:', data);
        return true;
        
    } catch (error) {
        console.error('测试失败:', error.message);
        return false;
    }
}

// 运行测试
testLogin().then(success => {
    console.log('\n' + '='.repeat(50));
    console.log('测试结果:', success ? '✅ 成功' : '❌ 失败');
});
