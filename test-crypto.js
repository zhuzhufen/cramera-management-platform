// 测试加密解密功能
const CryptoUtils = require('./utils/crypto-utils');

console.log('=== 测试前端密码加密后端解密功能 ===\n');

// 测试1: 基本加密解密
console.log('测试1: 基本加密解密');
const testPassword = 'TestPassword123!';
console.log('原始密码:', testPassword);

try {
    // 模拟前端加密
    const encrypted = CryptoUtils.simulateFrontendEncryption(testPassword);
    console.log('加密后:', encrypted);
    
    // 后端解密
    const decrypted = CryptoUtils.decryptPassword(encrypted);
    console.log('解密后:', decrypted);
    
    const isMatch = testPassword === decrypted;
    console.log('测试结果:', isMatch ? '✅ 成功' : '❌ 失败');
} catch (error) {
    console.log('❌ 测试失败:', error.message);
}

console.log('\n' + '='.repeat(50) + '\n');

// 测试2: 验证加密数据格式
console.log('测试2: 验证加密数据格式');
const invalidData = 'invalid_base64_data';
console.log('测试数据:', invalidData);

try {
    const isValid = CryptoUtils.isValidEncryptedData(invalidData);
    console.log('数据格式验证:', isValid ? '✅ 有效' : '❌ 无效');
} catch (error) {
    console.log('❌ 验证失败:', error.message);
}

console.log('\n' + '='.repeat(50) + '\n');

// 测试3: 批量测试
console.log('测试3: 批量测试不同密码');
const testPasswords = [
    'Simple123',
    'Complex@Password2024!',
    'aB1!cD2@eF3#',
    '12345678',
    'Abcdefg!'
];

let passedTests = 0;
let failedTests = 0;

testPasswords.forEach((password, index) => {
    try {
        const encrypted = CryptoUtils.simulateFrontendEncryption(password);
        const decrypted = CryptoUtils.decryptPassword(encrypted);
        const isMatch = password === decrypted;
        
        if (isMatch) {
            console.log(`✅ 测试 ${index + 1}: "${password}" -> 成功`);
            passedTests++;
        } else {
            console.log(`❌ 测试 ${index + 1}: "${password}" -> 失败`);
            failedTests++;
        }
    } catch (error) {
        console.log(`❌ 测试 ${index + 1}: "${password}" -> 错误: ${error.message}`);
        failedTests++;
    }
});

console.log('\n' + '='.repeat(50));
console.log(`测试总结:`);
console.log(`✅ 通过: ${passedTests}`);
console.log(`❌ 失败: ${failedTests}`);
console.log(`📊 成功率: ${((passedTests / testPasswords.length) * 100).toFixed(1)}%`);

// 测试4: 内置测试函数
console.log('\n' + '='.repeat(50));
console.log('测试4: 使用内置测试函数');
const builtInTestResult = CryptoUtils.testEncryption();
console.log('内置测试结果:', builtInTestResult ? '✅ 成功' : '❌ 失败');

console.log('\n' + '='.repeat(50));
console.log('所有测试完成！');
