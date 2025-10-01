const bcrypt = require('bcrypt');

async function generateBcryptHash() {
    const password = '123456';
    const saltRounds = 10;
    
    try {
        const hash = await bcrypt.hash(password, saltRounds);
        console.log(hash);
        return hash;
    } catch (error) {
        console.error('生成哈希失败:', error);
    }
}

generateBcryptHash();
