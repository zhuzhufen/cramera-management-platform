// 只测试加密解密功能，不测试登录
const CryptoUtils = require('./utils/crypto-utils');

console.log('=== 测试加密解密功能 ===\n');

// 测试数据
const testPasswords = [
    'admin123',
    'TestPassword123!',
    'Simple123',
    'Complex@Password2024!'
];

testPasswords.forEach((password, index) => {
    console.log(`测试 ${index + 1}: "${password}"`);
    
    try {
        // 模拟前端加密
        const encrypted = CryptoUtils.simulateFrontendEncryption(password);
        console.log('  加密后:', encrypted);
        
        // 后端解密
        const decrypted = CryptoUtils.decryptPassword(encrypted);
        console.log('  解密后:', decrypted);
        
        const isMatch = password === decrypted;
        console.log('  结果:', isMatch ? '✅ 成功' : '❌ 失败');
        
    } catch (error) {
        console.log('  ❌ 错误:', error.message);
    }
    
    console.log('');
});

console.log('='.repeat(50));
console.log('加密解密功能测试完成！');
