// 极简加密工具 - 专为HTTP环境设计
// 完全不使用Web Crypto API，兼容所有浏览器

class SimpleCrypto {
    // 极简加密方案 - 从后端获取密钥
    static async simpleEncrypt(password) {
        try {
            // 从后端获取加密密钥
            const response = await fetch('/cam/api/auth/encryption-key');
            if (!response.ok) {
                throw new Error('获取加密密钥失败');
            }
            
            const keyData = await response.json();
            const encryptionKey = keyData.key;
            
            // 简单的混淆加密方案
            // 1. 先对密码进行Base64编码
            const base64Encoded = btoa(encodeURIComponent(password));
            
            // 2. 使用密钥进行简单的XOR混淆
            let obfuscated = '';
            for (let i = 0; i < base64Encoded.length; i++) {
                const charCode = base64Encoded.charCodeAt(i) ^ encryptionKey.charCodeAt(i % encryptionKey.length);
                obfuscated += String.fromCharCode(charCode);
            }
            
            // 3. 再次Base64编码
            const finalEncoded = btoa(obfuscated);
            
            // 4. 添加标识前缀，让后端知道这是极简方案
            return 'simple:' + finalEncoded;
        } catch (error) {
            console.error('极简加密失败:', error);
            // 如果获取密钥失败，使用固定密钥作为降级
            return this.fallbackEncrypt(password);
        }
    }

    // 降级加密方案（当无法从后端获取密钥时使用）
    static async fallbackEncrypt(password) {
        try {
            // 尝试从后端获取密钥，如果失败则使用固定密钥
            let encryptionKey;
            try {
                const response = await fetch('/cam/api/auth/encryption-key');
                if (response.ok) {
                    const keyData = await response.json();
                    encryptionKey = keyData.key;
                } else {
                    throw new Error('获取密钥失败');
                }
            } catch (error) {
                // 如果获取密钥失败，使用与后端一致的固定加密密钥
                encryptionKey = 'camera_rental_encryption_key_2024';
            }
            
            // 简单的混淆加密方案
            const base64Encoded = btoa(encodeURIComponent(password));
            
            let obfuscated = '';
            for (let i = 0; i < base64Encoded.length; i++) {
                const charCode = base64Encoded.charCodeAt(i) ^ encryptionKey.charCodeAt(i % encryptionKey.length);
                obfuscated += String.fromCharCode(charCode);
            }
            
            const finalEncoded = btoa(obfuscated);
            
            return 'fallback:' + finalEncoded;
        } catch (error) {
            console.error('降级加密失败:', error);
            // 如果连Base64都失败，直接返回原始密码（不推荐，但作为最后手段）
            return 'plain:' + password;
        }
    }
    
    // 检查是否支持Web Crypto API
    static supportsWebCrypto() {
        return !!(window.crypto && window.crypto.subtle);
    }
    
    // 检查是否是HTTPS环境
    static isHTTPS() {
        return window.location.protocol === 'https:';
    }
    
    // 获取浏览器信息
    static getBrowserInfo() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            protocol: window.location.protocol,
            supportsWebCrypto: this.supportsWebCrypto(),
            isHTTPS: this.isHTTPS()
        };
    }
}

// 导出到全局作用域
window.SimpleCrypto = SimpleCrypto;

// 如果CryptoUtils不存在，创建兼容版本
if (typeof CryptoUtils === 'undefined') {
    window.CryptoUtils = {
        simpleEncrypt: SimpleCrypto.simpleEncrypt
    };
} else {
    // 如果CryptoUtils存在，重写simpleEncrypt方法
    CryptoUtils.simpleEncrypt = SimpleCrypto.simpleEncrypt;
}

console.log('SimpleCrypto已加载 - 专为HTTP环境设计');
console.log('浏览器信息:', SimpleCrypto.getBrowserInfo());
