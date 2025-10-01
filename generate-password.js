const bcrypt = require('bcrypt');

async function generatePassword() {
    const password = '123456';
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);
    console.log('密码 "123456" 的bcrypt哈希值:');
    console.log(hash);
}

generatePassword().catch(console.error);
