// Global variables to store keys
let publicKey = null;
let privateKey = null;

// Utility functions for key conversion
function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

function formatPEM(pemContent, type) {
    const header = `-----BEGIN ${type}-----`;
    const footer = `-----END ${type}-----`;
    const lines = [];
    
    for (let i = 0; i < pemContent.length; i += 64) {
        lines.push(pemContent.substr(i, 64));
    }
    
    return `${header}\n${lines.join('\n')}\n${footer}`;
}

// Generate RSA key pair
async function generateKeyPair() {
    try {
        const keyPair = await window.crypto.subtle.generateKey(
            {
                name: 'RSA-OAEP',
                modulusLength: 2048,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: 'SHA-256',
            },
            true,
            ['encrypt', 'decrypt']
        );

        publicKey = keyPair.publicKey;
        privateKey = keyPair.privateKey;

        showStatus('keyStatus', 'success', 'キーペアを生成しました！');
        document.getElementById('downloadKeysContainer').style.display = 'block';
        document.getElementById('generateKeysBtn').disabled = true;

    } catch (error) {
        showStatus('keyStatus', 'error', `エラー: ${error.message}`);
    }
}

// Export public key to PEM format
async function downloadPublicKey() {
    try {
        const exported = await window.crypto.subtle.exportKey('spki', publicKey);
        const base64 = arrayBufferToBase64(exported);
        const pem = formatPEM(base64, 'PUBLIC KEY');
        
        downloadFile(pem, 'public_key.pub', 'text/plain');
    } catch (error) {
        showStatus('keyStatus', 'error', `エラー: ${error.message}`);
    }
}

// Export private key to PEM format
async function downloadPrivateKey() {
    try {
        const exported = await window.crypto.subtle.exportKey('pkcs8', privateKey);
        const base64 = arrayBufferToBase64(exported);
        const pem = formatPEM(base64, 'PRIVATE KEY');
        
        downloadFile(pem, 'private_key.pem', 'text/plain');
    } catch (error) {
        showStatus('keyStatus', 'error', `エラー: ${error.message}`);
    }
}

// Import public key from PEM format
async function importPublicKeyFromPEM(pemContent) {
    try {
        // Remove PEM headers and newlines
        const base64 = pemContent
            .replace(/-----BEGIN PUBLIC KEY-----/g, '')
            .replace(/-----END PUBLIC KEY-----/g, '')
            .replace(/\s/g, '');

        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const key = await window.crypto.subtle.importKey(
            'spki',
            bytes.buffer,
            { name: 'RSA-OAEP', hash: 'SHA-256' },
            true,
            ['encrypt']
        );

        return key;
    } catch (error) {
        throw new Error(`公開鍵のインポートに失敗しました: ${error.message}`);
    }
}

// Import private key from PEM format
async function importPrivateKeyFromPEM(pemContent) {
    try {
        // Remove PEM headers and newlines
        const base64 = pemContent
            .replace(/-----BEGIN PRIVATE KEY-----/g, '')
            .replace(/-----END PRIVATE KEY-----/g, '')
            .replace(/\s/g, '');

        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const key = await window.crypto.subtle.importKey(
            'pkcs8',
            bytes.buffer,
            { name: 'RSA-OAEP', hash: 'SHA-256' },
            true,
            ['decrypt']
        );

        return key;
    } catch (error) {
        throw new Error(`秘密鍵のインポートに失敗しました: ${error.message}`);
    }
}

// Read file as text
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
    });
}

// Read file as array buffer
function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsArrayBuffer(file);
    });
}

// Encrypt file with public key (Hybrid encryption: AES-256-GCM + RSA-OAEP)
async function encryptFile() {
    try {
        const publicKeyFile = document.getElementById('publicKeyFile').files[0];
        const fileToEncrypt = document.getElementById('fileToEncrypt').files[0];

        if (!publicKeyFile || !fileToEncrypt) {
            throw new Error('公開鍵とファイルの両方を選択してください');
        }

        showStatus('encryptStatus', 'info', '暗号化処理中...');

        // Import public key
        const pemContent = await readFileAsText(publicKeyFile);
        const pubKey = await importPublicKeyFromPEM(pemContent);

        // Read file to encrypt
        const fileBuffer = await readFileAsArrayBuffer(fileToEncrypt);
        const fileData = new Uint8Array(fileBuffer);

        // Generate random AES key for file encryption
        const aesKey = await window.crypto.subtle.generateKey(
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
        );

        // Generate random IV for AES-GCM
        const iv = window.crypto.getRandomValues(new Uint8Array(12));

        // Encrypt file with AES-GCM
        const encryptedFile = await window.crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            aesKey,
            fileData
        );

        // Export AES key to raw format for RSA encryption
        const aesKeyRaw = await window.crypto.subtle.exportKey('raw', aesKey);
        const aesKeyBytes = new Uint8Array(aesKeyRaw);

        // Encrypt AES key with RSA-OAEP
        const encryptedAesKey = await window.crypto.subtle.encrypt(
            { name: 'RSA-OAEP' },
            pubKey,
            aesKeyBytes
        );

        // Create encrypted package (JSON format containing encrypted data, encrypted AES key, and IV)
        const encryptedPackage = {
            version: '2.0',
            algorithm: 'AES-256-GCM-RSA-OAEP',
            hash: 'SHA-256',
            originalFilename: fileToEncrypt.name,
            iv: arrayBufferToBase64(iv),
            encryptedAesKey: arrayBufferToBase64(encryptedAesKey),
            encryptedData: arrayBufferToBase64(encryptedFile)
        };

        const encryptedJson = JSON.stringify(encryptedPackage, null, 2);
        downloadFile(encryptedJson, `${fileToEncrypt.name}.encrypted`, 'application/json');

        showStatus('encryptStatus', 'success', `ファイルを暗号化しました！(${fileToEncrypt.name}.encrypted)`);
        document.getElementById('publicKeyFile').value = '';
        document.getElementById('fileToEncrypt').value = '';

    } catch (error) {
        console.error('Encryption error:', error);
        showStatus('encryptStatus', 'error', `エラー: ${error.message || error}`);
    }
}

// Decrypt file with private key
async function decryptFile() {
    try {
        const privateKeyFile = document.getElementById('privateKeyFile').files[0];
        const fileToDecrypt = document.getElementById('fileToDecrypt').files[0];

        if (!privateKeyFile || !fileToDecrypt) {
            throw new Error('秘密鍵と.encryptedファイルの両方を選択してください');
        }

        showStatus('decryptStatus', 'info', '復号処理中...');

        // Import private key
        const pemContent = await readFileAsText(privateKeyFile);
        const privKey = await importPrivateKeyFromPEM(pemContent);

        // Read encrypted package
        const encryptedJson = await readFileAsText(fileToDecrypt);
        const encryptedData = JSON.parse(encryptedJson);

        // Handle both old (v1.0) and new (v2.0) formats
        let decryptedData;

        if (encryptedData.version === '2.0' && encryptedData.algorithm === 'AES-256-GCM-RSA-OAEP') {
            // New hybrid encryption format
            // Decrypt AES key with RSA-OAEP
            const encryptedAesKeyBuffer = base64ToArrayBuffer(encryptedData.encryptedAesKey);
            const aesKeyBytes = await window.crypto.subtle.decrypt(
                { name: 'RSA-OAEP' },
                privKey,
                encryptedAesKeyBuffer
            );

            // Import AES key
            const aesKey = await window.crypto.subtle.importKey(
                'raw',
                aesKeyBytes,
                { name: 'AES-GCM' },
                false,
                ['decrypt']
            );

            // Decrypt file with AES key
            const encryptedBuffer = base64ToArrayBuffer(encryptedData.encryptedData);
            const iv = base64ToArrayBuffer(encryptedData.iv);

            decryptedData = await window.crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: new Uint8Array(iv) },
                aesKey,
                encryptedBuffer
            );
        } else if (encryptedData.version === '1.0' && encryptedData.algorithm === 'RSA-OAEP') {
            // Old format: direct RSA-OAEP encryption (backward compatibility)
            const encryptedBuffer = base64ToArrayBuffer(encryptedData.encryptedData);
            decryptedData = await window.crypto.subtle.decrypt(
                { name: 'RSA-OAEP' },
                privKey,
                encryptedBuffer
            );
        } else {
            throw new Error(`サポートされていないフォーマット: version=${encryptedData.version}, algorithm=${encryptedData.algorithm}`);
        }

        // Download decrypted file
        const originalFilename = encryptedData.originalFilename || 'decrypted_file';
        const decryptedBlob = new Blob([new Uint8Array(decryptedData)]);
        
        const url = URL.createObjectURL(decryptedBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = originalFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showStatus('decryptStatus', 'success', `ファイルを復号しました！(${originalFilename})`);
        document.getElementById('privateKeyFile').value = '';
        document.getElementById('fileToDecrypt').value = '';

    } catch (error) {
        console.error('Decryption error:', error);
        showStatus('decryptStatus', 'error', `エラー: ${error.message || error}`);
    }
}

// Utility function to download files
function downloadFile(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Utility function to show status messages
function showStatus(elementId, type, message) {
    const element = document.getElementById(elementId);
    element.className = `status-message ${type}`;
    element.textContent = message;
    element.style.display = 'block';
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('generateKeysBtn').addEventListener('click', generateKeyPair);
    document.getElementById('downloadPublicKeyBtn').addEventListener('click', downloadPublicKey);
    document.getElementById('downloadPrivateKeyBtn').addEventListener('click', downloadPrivateKey);
    document.getElementById('encryptFileBtn').addEventListener('click', encryptFile);
    document.getElementById('decryptFileBtn').addEventListener('click', decryptFile);
});
