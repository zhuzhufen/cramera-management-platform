// 后端加密解密工具
const crypto = require('crypto');

class CryptoUtils {
    // 解密前端传输的密码
    static decryptPassword(encryptedData) {
        try {
            // 检查是否是极简方案（以 'simple:' 开头）
            if (encryptedData.startsWith('simple:')) {
                return this.decryptSimple(encryptedData.substring(7)); // 去掉 'simple:' 前缀
            }
            
            // 检查是否是降级方案（以 'fallback:' 开头）
            if (encryptedData.startsWith('fallback:')) {
                return this.decryptFallback(encryptedData.substring(9)); // 去掉 'fallback:' 前缀
            }
            
            // 检查是否是明文方案（以 'plain:' 开头）
            if (encryptedData.startsWith('plain:')) {
                return encryptedData.substring(6); // 直接返回原始密码
            }
            
            // 否则使用标准 AES 解密
            try {
                // 解码Base64数据
                const combined = Buffer.from(encryptedData, 'base64');
                
                // 提取IV（前16字节）
                const iv = combined.slice(0, 16);
                
                // 提取加密数据（剩余部分）
                const encrypted = combined.slice(16);
                
                // 使用从环境变量获取的密钥解密（与前端保持一致）
                const encryptionKey = this.getEncryptionKey();
                const salt = this.getEncryptionSalt();
                const key = this.deriveKey(encryptionKey, salt);
                
                // 创建解密器
                const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
                
                // 解密数据
                let decrypted = decipher.update(encrypted);
                decrypted = Buffer.concat([decrypted, decipher.final()]);
                
                return decrypted.toString('utf8');
            } catch (aesError) {
                // 如果AES解密失败，尝试极简方案
                return this.decryptSimple(encryptedData);
            }
        } catch (error) {
            throw new Error('密码解密失败');
        }
    }

    // 解密极简方案加密的数据
    static decryptSimple(encryptedData) {
        try {
            const encryptionKey = this.getEncryptionKey();
            
            // 1. Base64解码
            const obfuscated = Buffer.from(encryptedData, 'base64').toString('binary');
            
            // 2. XOR 反混淆
            let base64Encoded = '';
            for (let i = 0; i < obfuscated.length; i++) {
                const charCode = obfuscated.charCodeAt(i) ^ encryptionKey.charCodeAt(i % encryptionKey.length);
                base64Encoded += String.fromCharCode(charCode);
            }
            
            // 3. Base64解码并URI解码
            const decoded = Buffer.from(base64Encoded, 'base64').toString('utf8');
            const password = decodeURIComponent(decoded);
            
            return password;
        } catch (error) {
            throw new Error('极简方案解密失败');
        }
    }

    // 解密降级方案加密的数据
    static decryptFallback(encryptedData) {
        try {
            const encryptionKey = this.getEncryptionKey();
            
            // 1. Base64解码
            const obfuscated = Buffer.from(encryptedData, 'base64').toString('binary');
            
            // 2. XOR 反混淆
            let base64Encoded = '';
            for (let i = 0; i < obfuscated.length; i++) {
                const charCode = obfuscated.charCodeAt(i) ^ encryptionKey.charCodeAt(i % encryptionKey.length);
                base64Encoded += String.fromCharCode(charCode);
            }
            
            // 3. Base64解码并URI解码
            const decoded = Buffer.from(base64Encoded, 'base64').toString('utf8');
            const password = decodeURIComponent(decoded);
            
            return password;
        } catch (error) {
            throw new Error('降级方案解密失败');
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

    // 获取加密密钥（与后端API保持一致）
    static getEncryptionKey() {
        return process.env.ENCRYPTION_KEY || 'camera_rental_encryption_key_2024';
    }

    // 获取加密盐值（与后端API保持一致）
    static getEncryptionSalt() {
        return process.env.ENCRYPTION_SALT || 'camera_rental_salt';
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


}

module.exports = CryptoUtils;
