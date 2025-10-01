const bcrypt = require('bcrypt');

async function generateBcryptHash() {
    const password = '123456';
    const saltRounds = 10;
    
    try {
        const hash = await bcrypt.hash(password, saltRounds);
        console.log(`密码 "${password}" 的bcrypt哈希值:`);
        console.log(hash);
        
        // 验证哈希值
        const isValid = await bcrypt.compare(password, hash);
        console.log(`\n验证结果: ${isValid ? '成功' : '失败'}`);
        
        return hash;
    } catch (error) {
        console.error('生成哈希失败:', error);
    }
}

generateBcryptHash();
