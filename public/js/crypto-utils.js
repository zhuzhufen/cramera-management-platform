// 前端加密工具
// 使用AES加密算法对密码进行加密传输

class CryptoUtils {
    // 生成随机密钥（用于AES加密）
    static generateRandomKey() {
        const array = new Uint8Array(32);
        window.crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    // 将字符串转换为Uint8Array
    static stringToUint8Array(str) {
        const encoder = new TextEncoder();
        return encoder.encode(str);
    }

    // 将Uint8Array转换为字符串
    static uint8ArrayToString(uint8Array) {
        const decoder = new TextDecoder();
        return decoder.decode(uint8Array);
    }

    // 将Base64字符串转换为Uint8Array
    static base64ToUint8Array(base64) {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    }

    // 将Uint8Array转换为Base64字符串
    static uint8ArrayToBase64(uint8Array) {
        const binaryString = Array.from(uint8Array, byte => String.fromCharCode(byte)).join('');
        return btoa(binaryString);
    }

    // AES加密函数
    static async encryptPassword(password, publicKey) {
        try {
            // 生成随机对称密钥
            const symmetricKey = await window.crypto.subtle.generateKey(
                {
                    name: "AES-GCM",
                    length: 256
                },
                true,
                ["encrypt", "decrypt"]
            );

            // 生成随机IV
            const iv = window.crypto.getRandomValues(new Uint8Array(12));

            // 加密密码
            const encodedPassword = this.stringToUint8Array(password);
            const encryptedData = await window.crypto.subtle.encrypt(
                {
                    name: "AES-GCM",
                    iv: iv
                },
                symmetricKey,
                encodedPassword
            );

            // 导出对称密钥
            const exportedKey = await window.crypto.subtle.exportKey("raw", symmetricKey);

            // 使用RSA公钥加密对称密钥
            const importedPublicKey = await window.crypto.subtle.importKey(
                "spki",
                this.base64ToUint8Array(publicKey),
                {
                    name: "RSA-OAEP",
                    hash: "SHA-256"
                },
                false,
                ["encrypt"]
            );

            const encryptedKey = await window.crypto.subtle.encrypt(
                {
                    name: "RSA-OAEP"
                },
                importedPublicKey,
                exportedKey
            );

            // 返回加密结果
            return {
                encryptedPassword: this.uint8ArrayToBase64(new Uint8Array(encryptedData)),
                encryptedKey: this.uint8ArrayToBase64(new Uint8Array(encryptedKey)),
                iv: this.uint8ArrayToBase64(iv)
            };
        } catch (error) {
            throw new Error('密码加密失败');
        }
    }

    // 简化的AES加密（从后端获取密钥）
    static async simpleEncrypt(password) {
        try {

            // 尝试使用 Web Crypto API，如果失败则降级
            try {
                // 从后端获取加密密钥
                const response = await fetch(CONFIG.buildUrl(CONFIG.AUTH.ENCRYPTION_KEY));
                if (!response.ok) {
                    throw new Error('获取加密密钥失败');
                }
                
                const keyData = await response.json();
                const encryptionKey = keyData.key;
                const salt = keyData.salt;
                
                // 生成密钥
                const encoder = new TextEncoder();
                const keyMaterial = await window.crypto.subtle.importKey(
                    "raw",
                    encoder.encode(encryptionKey),
                    { name: "PBKDF2" },
                    false,
                    ["deriveKey"]
                );

                const key = await window.crypto.subtle.deriveKey(
                    {
                        name: "PBKDF2",
                        salt: encoder.encode(salt),
                        iterations: 100000,
                        hash: "SHA-256"
                    },
                    keyMaterial,
                    { name: "AES-CBC", length: 256 },
                    false,
                    ["encrypt"]
                );

                // 生成随机IV
                const iv = window.crypto.getRandomValues(new Uint8Array(16));

                // 加密
                const encrypted = await window.crypto.subtle.encrypt(
                    {
                        name: "AES-CBC",
                        iv: iv
                    },
                    key,
                    encoder.encode(password)
                );

                // 组合IV和加密数据
                const combined = new Uint8Array(iv.length + encrypted.byteLength);
                combined.set(iv);
                combined.set(new Uint8Array(encrypted), iv.length);

                // 返回Base64编码的结果
                return btoa(String.fromCharCode(...combined));
            } catch (cryptoError) {
                return this.fallbackEncrypt(password);
            }
        } catch (error) {
            // 最终尝试降级方案
            return this.fallbackEncrypt(password);
        }
    }

    // 降级加密方案（适用于HTTP环境）
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
            
            // 4. 添加标识前缀，让后端知道这是降级方案
            return 'fallback:' + finalEncoded;
        } catch (error) {
            throw new Error('密码加密失败: ' + error.message);
        }
    }

    // 生成RSA密钥对（用于前端加密）
    static async generateKeyPair() {
        try {
            const keyPair = await window.crypto.subtle.generateKey(
                {
                    name: "RSA-OAEP",
                    modulusLength: 2048,
                    publicExponent: new Uint8Array([1, 0, 1]),
                    hash: "SHA-256",
                },
                true,
                ["encrypt", "decrypt"]
            );

            // 导出公钥
            const publicKey = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
            const publicKeyBase64 = this.uint8ArrayToBase64(new Uint8Array(publicKey));

            return {
                publicKey: publicKeyBase64,
                privateKey: keyPair.privateKey // 保留私钥用于解密（实际应该由后端处理）
            };
        } catch (error) {
            throw new Error('密钥对生成失败');
        }
    }
}

// 导出到全局作用域
window.CryptoUtils = CryptoUtils;
