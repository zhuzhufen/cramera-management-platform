// 后端加密解密工具
const crypto = require('crypto');

class CryptoUtils {
    // 解密前端传输的密码
    static decryptPassword(encryptedData) {
        try {
            // 解码Base64数据
            const combined = Buffer.from(encryptedData, 'base64');
            
            // 提取IV（前16字节）
            const iv = combined.slice(0, 16);
            
            // 提取加密数据（剩余部分）
            const encrypted = combined.slice(16);
            
            // 使用固定密钥解密（与前端保持一致）
            const key = this.deriveKey('camera_rental_encryption_key_2024', 'camera_rental_salt');
            
            // 创建解密器
            const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
            
            // 解密数据
            let decrypted = decipher.update(encrypted);
            decrypted = Buffer.concat([decrypted, decipher.final()]);
            
            return decrypted.toString('utf8');
        } catch (error) {
            console.error('解密失败:', error);
            throw new Error('密码解密失败');
        }
    }

    // 从密码派生密钥
    static deriveKey(password, salt) {
        return crypto.pbkdf2Sync(
            password,
            salt,
            100000,
            32, // 256位
            'sha256'
        );
    }

    // 验证加密数据格式
    static isValidEncryptedData(encryptedData) {
        try {
            if (!encryptedData || typeof encryptedData !== 'string') {
                return false;
            }
            
            // 检查是否为有效的Base64
            const buffer = Buffer.from(encryptedData, 'base64');
            if (buffer.length < 17) { // IV(16) + 至少1字节数据
                return false;
            }
            
            return true;
        } catch (error) {
            return false;
        }
    }

    // 生成随机密码（用于测试）
    static generateRandomPassword(length = 12) {
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * charset.length);
            password += charset[randomIndex];
        }
        return password;
    }

    // 测试加密解密功能
    static testEncryption() {
        const testPassword = this.generateRandomPassword();
        console.log('原始密码:', testPassword);
        
        // 模拟前端加密
        const encrypted = this.simulateFrontendEncryption(testPassword);
        console.log('加密后:', encrypted);
        
        // 后端解密
        const decrypted = this.decryptPassword(encrypted);
        console.log('解密后:', decrypted);
        
        const isMatch = testPassword === decrypted;
        console.log('测试结果:', isMatch ? '成功' : '失败');
        
        return isMatch;
    }

    // 模拟前端加密（用于测试）
    static simulateFrontendEncryption(password) {
        const key = this.deriveKey('camera_rental_encryption_key_2024', 'camera_rental_salt');
        const iv = crypto.randomBytes(16);
        
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        let encrypted = cipher.update(password, 'utf8');
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        
        // 组合IV和加密数据
        const combined = Buffer.concat([iv, encrypted]);
        return combined.toString('base64');
    }
}

module.exports = CryptoUtils;
