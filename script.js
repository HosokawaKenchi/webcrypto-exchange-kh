// Global variables to store keys
let publicKey = null;
let privateKey = null;

// LocalStorage key for storing key history
const KEY_HISTORY_STORAGE_KEY = 'wcx-key-history';

// Date/time formatting for filenames: YYYY-MM-DD-HH_MM
function formatDateTimeForFilename(d = new Date()) {
    const pad = (n) => String(n).padStart(2, '0');
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const min = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}-${hh}_${min}`;
}
// LocalStorage management functions
function getKeyHistory() {
    const stored = localStorage.getItem(KEY_HISTORY_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
}

function saveKeyToHistory(publicKeyPem, privateKeyPem) {
    const date = formatDateTimeForFilename(new Date());
    const timestamp = Date.now();
    const keyEntry = {
        id: timestamp,
        date: date,
        timestamp: timestamp,
        publicKeyPem: publicKeyPem,
        privateKeyPem: privateKeyPem
    };
    
    const history = getKeyHistory();
    history.push(keyEntry);
    // Keep only last 10 key pairs to limit storage
    if (history.length > 10) {
        history.shift();
    }
    localStorage.setItem(KEY_HISTORY_STORAGE_KEY, JSON.stringify(history));
    return keyEntry;
}

function deleteKeyFromHistory(id) {
    let history = getKeyHistory();
    history = history.filter(entry => entry.id !== id);
    localStorage.setItem(KEY_HISTORY_STORAGE_KEY, JSON.stringify(history));
}

function clearAllKeyHistory() {
    localStorage.removeItem(KEY_HISTORY_STORAGE_KEY);
}

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

        // Export and save to history
        try {
            const publicKeyExported = await window.crypto.subtle.exportKey('spki', publicKey);
            const publicKeyBase64 = arrayBufferToBase64(publicKeyExported);
            const publicKeyPem = formatPEM(publicKeyBase64, 'PUBLIC KEY');

            const privateKeyExported = await window.crypto.subtle.exportKey('pkcs8', privateKey);
            const privateKeyBase64 = arrayBufferToBase64(privateKeyExported);
            const privateKeyPem = formatPEM(privateKeyBase64, 'PRIVATE KEY');

            saveKeyToHistory(publicKeyPem, privateKeyPem);
        } catch (error) {
            console.warn('Failed to save key to history:', error);
        }

        showStatus('keyStatus', 'success', I18N.t('status.keyGenerated'));
        document.getElementById('downloadKeysContainer').style.display = 'block';
        document.getElementById('generateKeysBtn').disabled = true;
        
        // Update key history display
        updateKeyHistoryDisplay();

    } catch (error) {
        showStatus('keyStatus', 'error', I18N.t('error.generic', error.message));
    }
}

// Export public key to PEM format
async function downloadPublicKey() {
    try {
        const exported = await window.crypto.subtle.exportKey('spki', publicKey);
        const base64 = arrayBufferToBase64(exported);
        let pem = formatPEM(base64, 'PUBLIC KEY');
        // Add an English note outside the key body (after the PEM footer)
        // const webNote = '\n# WebCrypto Exchange: https://hosokawakenchi.github.io/webcrypto-exchange-kh/\n';
        // pem = pem + webNote;
        // Append generation date (YYYY-MM-DD-HH_MM) to filename
        const date = formatDateTimeForFilename(new Date());
        const filename = `public_key_${date}.pub`;
        downloadFile(pem, filename, 'text/plain');
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
        // Append generation date (YYYY-MM-DD-HH_MM) to filename
        const date = formatDateTimeForFilename(new Date());
        const filename = `private_key_${date}.pem`;
        downloadFile(pem, filename, 'text/plain');
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
        throw new Error(I18N.t('error.importPublicKey', error.message));
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
        throw new Error(I18N.t('error.importPrivateKey', error.message));
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
        const publicKeyFileInput = document.getElementById('publicKeyFile');
        const publicKeySelectInput = document.getElementById('publicKeySelect');
        const fileToEncrypt = document.getElementById('fileToEncrypt').files[0];

        if (!fileToEncrypt) {
            throw new Error(I18N.t('error.selectBoth.encrypt'));
        }

        // If file is large, ask user to confirm (threshold: 50 MB)
        const LARGE_FILE_THRESHOLD = 50 * 1024 * 1024; // 50 MB
        if (fileToEncrypt.size >= LARGE_FILE_THRESHOLD) {
            const ok = await showLargeFileConfirm(fileToEncrypt.size);
            if (!ok) {
                showStatus('encryptStatus', 'info', I18N.t('status.cancelled'));
                return;
            }
        }

        let pubKey;
        let publicKeyFileSelected = publicKeyFileInput.files[0];

        // Try to use selected key from history first
        if (publicKeySelectInput && publicKeySelectInput.value) {
            const keyEntry = getKeyHistory().find(
                entry => entry.id === parseInt(publicKeySelectInput.value)
            );
            if (keyEntry) {
                pubKey = await importPublicKeyFromPEM(keyEntry.publicKeyPem);
            }
        }

        // Fall back to file upload if no history selection
        if (!pubKey && publicKeyFileSelected) {
            const pemContent = await readFileAsText(publicKeyFileSelected);
            pubKey = await importPublicKeyFromPEM(pemContent);
        }

        if (!pubKey) {
            throw new Error(I18N.t('error.selectBoth.encrypt'));
        }

        showStatus('encryptStatus', 'info', I18N.t('status.encrypting'));
        showThrobber(I18N.t('status.encrypting'));

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

        showStatus('encryptStatus', 'success', I18N.t('status.encrypted', `${fileToEncrypt.name}.encrypted`));
        publicKeyFileInput.value = '';
        document.getElementById('fileToEncrypt').value = '';

    } catch (error) {
        console.error('Encryption error:', error);
        showStatus('encryptStatus', 'error', I18N.t('error.generic', error.message || error));
    } finally {
        hideThrobber();
    }
}

// Decrypt file with private key
async function decryptFile() {
    try {
        const privateKeyFileInput = document.getElementById('privateKeyFile');
        const privateKeySelectInput = document.getElementById('privateKeySelect');
        const fileToDecrypt = document.getElementById('fileToDecrypt').files[0];

        if (!fileToDecrypt) {
            throw new Error(I18N.t('error.selectBoth.decrypt'));
        }

        // If file is large, ask user to confirm (threshold: 50 MB)
        const LARGE_FILE_THRESHOLD = 50 * 1024 * 1024; // 50 MB
        if (fileToDecrypt.size >= LARGE_FILE_THRESHOLD) {
            const ok = await showLargeFileConfirm(fileToDecrypt.size);
            if (!ok) {
                showStatus('decryptStatus', 'info', I18N.t('status.cancelled'));
                return;
            }
        }

        let privKey;
        let privateKeyFileSelected = privateKeyFileInput.files[0];

        // Try to use selected key from history first (default: latest)
        if (privateKeySelectInput && privateKeySelectInput.value) {
            const keyEntry = getKeyHistory().find(
                entry => entry.id === parseInt(privateKeySelectInput.value)
            );
            if (keyEntry) {
                privKey = await importPrivateKeyFromPEM(keyEntry.privateKeyPem);
            }
        }

        // Fall back to file upload if no history selection
        if (!privKey && privateKeyFileSelected) {
            const pemContent = await readFileAsText(privateKeyFileSelected);
            privKey = await importPrivateKeyFromPEM(pemContent);
        }

        if (!privKey) {
            throw new Error(I18N.t('error.selectBoth.decrypt'));
        }

        showStatus('decryptStatus', 'info', I18N.t('status.decrypting'));
        showThrobber(I18N.t('status.decrypting'));

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
            throw new Error(I18N.t('error.unsupportedFormat', encryptedData.version, encryptedData.algorithm));
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

        showStatus('decryptStatus', 'success', I18N.t('status.decrypted', originalFilename));
        privateKeyFileInput.value = '';
        document.getElementById('fileToDecrypt').value = '';

    } catch (error) {
        console.error('Decryption error:', error);
        showStatus('decryptStatus', 'error', I18N.t('error.generic', error.message || error));
    } finally {
        hideThrobber();
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

// Throbber (processing overlay) utilities
function showThrobber(text) {
    const th = document.getElementById('global-throbber');
    if (!th) return;
    const txt = th.querySelector('.throbber-text');
    if (txt && text) txt.textContent = text;
    th.setAttribute('aria-hidden', 'false');
    // disable main action buttons to avoid duplicate requests
    try { document.getElementById('encryptFileBtn').disabled = true; } catch (e) {}
    try { document.getElementById('decryptFileBtn').disabled = true; } catch (e) {}
}

function hideThrobber() {
    const th = document.getElementById('global-throbber');
    if (!th) return;
    th.setAttribute('aria-hidden', 'true');
    try { document.getElementById('encryptFileBtn').disabled = false; } catch (e) {}
    try { document.getElementById('decryptFileBtn').disabled = false; } catch (e) {}
}

// Large-file confirmation modal
function showLargeFileConfirm(bytes) {
    return new Promise(resolve => {
        const modal = document.getElementById('large-file-modal');
        if (!modal) return resolve(true);
        const titleEl = document.getElementById('large-file-title');
        const msgEl = document.getElementById('large-file-message');
        const btnContinue = document.getElementById('large-file-continue');
        const btnCancel = document.getElementById('large-file-cancel');

        const mb = (bytes / (1024 * 1024)).toFixed(1);
        if (titleEl) titleEl.textContent = I18N.t('warning.largeFile.title');
        if (msgEl) msgEl.innerHTML = I18N.t('warning.largeFile.message', mb);
        if (btnContinue) btnContinue.textContent = I18N.t('btn.continue');
        if (btnCancel) btnCancel.textContent = I18N.t('btn.cancel');

        modal.style.display = 'flex';
        modal.setAttribute('aria-hidden', 'false');

        function cleanup() {
            modal.style.display = 'none';
            modal.setAttribute('aria-hidden', 'true');
            btnContinue.removeEventListener('click', onContinue);
            btnCancel.removeEventListener('click', onCancel);
        }

        function onContinue() { cleanup(); resolve(true); }
        function onCancel() { cleanup(); resolve(false); }

        btnContinue.addEventListener('click', onContinue);
        btnCancel.addEventListener('click', onCancel);
    });
}

// Utility function to show status messages
function showStatus(elementId, type, message) {
    const element = document.getElementById(elementId);
    element.className = `status-message ${type}`;
    element.textContent = message;
    element.style.display = 'block';
}

// Update key history display
function updateKeyHistoryDisplay() {
    const history = getKeyHistory();
    let historyContainer = document.getElementById('keyHistoryContainer');
    
    if (!historyContainer) {
        const downloadKeysContainer = document.getElementById('downloadKeysContainer');
        historyContainer = document.createElement('div');
        historyContainer.id = 'keyHistoryContainer';
        downloadKeysContainer.parentNode.insertBefore(historyContainer, downloadKeysContainer.nextSibling);
    }
    
    if (history.length === 0) {
        historyContainer.innerHTML = '';
        return;
    }
    
    const keyCount = history.length;
    
    // Compact header (always visible)
    let html = `
        <div class="key-history-section">
            <div class="key-history-header">
                <button class="key-history-toggle-btn" id="keyHistoryToggleBtn">
                    <span class="toggle-arrow">▼</span>
                    <span data-i18n="keyhistory.title">鍵ペア履歴</span>
                    <span class="key-count">(${keyCount})</span>
                </button>
            </div>
            <div class="key-history-content" id="keyHistoryContent" style="display: none;">
                <p class="note" style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 5px; padding: 12px; margin-bottom: 15px; color: #856404;">
                    <strong data-i18n="keyhistory.warning.title">⚠️ 注意：</strong> <span data-i18n="keyhistory.warning.text">このリストはブラウザのLocalStorageに保存されています。ブラウザキャッシュの削除、ブラウザのリセット、デバイスの工場出荷時リセットなどにより、保存されたキーが削除される場合があります。重要な秘密鍵は別の安全な場所にも保管してください。</span>
                </p>
                <div class="key-history-list">
    `;
    
    // Display in reverse order (newest first)
    history.slice().reverse().forEach((entry) => {
        const date = entry.date;
        html += `
            <div class="key-history-item">
                <div class="key-history-info">
                    <span class="key-history-date">${date}</span>
                </div>
                <div class="key-history-buttons">
                    <button class="btn btn-secondary key-download-btn" data-id="${entry.id}" data-type="public" data-i18n="btn.downloadPublicKey">公開鍵をダウンロード</button>
                    <button class="btn btn-secondary key-download-btn" data-id="${entry.id}" data-type="private" data-i18n="btn.downloadPrivateKey">秘密鍵をダウンロード</button>
                    <button class="btn btn-danger key-delete-btn" data-id="${entry.id}" data-i18n="btn.deleteKey">削除</button>
                </div>
            </div>
        `;
    });
    
    html += `
                </div>
                <button class="btn btn-danger" id="clearAllKeysBtn" data-i18n="btn.clearAllKeys">履歴をすべてクリア</button>
            </div>
        </div>
    `;
    
    historyContainer.innerHTML = html;
    
    // Apply i18n to newly created elements
    I18N.applyToDOM(historyContainer);
    
    // Toggle button
    const toggleBtn = document.getElementById('keyHistoryToggleBtn');
    const content = document.getElementById('keyHistoryContent');
    const arrow = toggleBtn.querySelector('.toggle-arrow');
    
    toggleBtn.addEventListener('click', () => {
        const isHidden = content.style.display === 'none';
        if (isHidden) {
            content.style.display = 'block';
            arrow.textContent = '▲';
            toggleBtn.classList.add('expanded');
        } else {
            content.style.display = 'none';
            arrow.textContent = '▼';
            toggleBtn.classList.remove('expanded');
        }
    });
    
    // Attach event listeners
    historyContainer.querySelectorAll('.key-download-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = parseInt(e.target.dataset.id);
            const type = e.target.dataset.type;
            const entry = history.find(h => h.id === id);
            if (entry) {
                const date = entry.date;
                if (type === 'public') {
                    downloadFile(entry.publicKeyPem, `public_key_${date}.pub`, 'text/plain');
                } else {
                    downloadFile(entry.privateKeyPem, `private_key_${date}.pem`, 'text/plain');
                }
            }
        });
    });
    
    historyContainer.querySelectorAll('.key-delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.target.dataset.id);
            if (confirm(I18N.t('confirm.deleteKey'))) {
                deleteKeyFromHistory(id);
                updateKeyHistoryDisplay();
                updateKeySelectors();
            }
        });
    });
    
    const clearAllBtn = historyContainer.querySelector('#clearAllKeysBtn');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', () => {
            if (confirm(I18N.t('confirm.clearAllKeys'))) {
                clearAllKeyHistory();
                updateKeyHistoryDisplay();
                updateKeySelectors();
            }
        });
    }
}

// Update key selector dropdowns
function updateKeySelectors() {
    const history = getKeyHistory();
    
    const publicKeySelect = document.getElementById('publicKeySelect');
    const privateKeySelect = document.getElementById('privateKeySelect');
    
    if (!publicKeySelect || !privateKeySelect) return;
    
    const defaultPublicHtml = `<option value="">${I18N.t('select.publicKeyFile')}</option>`;
    const defaultPrivateHtml = `<option value="">${I18N.t('select.privateKeyFile')}</option>`;
    
    let publicHtml = defaultPublicHtml;
    let privateHtml = defaultPrivateHtml;
    
    history.forEach((entry) => {
        const date = entry.date;
        publicHtml += `<option value="${entry.id}">${I18N.t('select.keyDate')}: ${date}</option>`;
        privateHtml += `<option value="${entry.id}">${I18N.t('select.keyDate')}: ${date}</option>`;
    });
    
    publicKeySelect.innerHTML = publicHtml;
    privateKeySelect.innerHTML = privateHtml;
    
    // Default: latest key for decryption
    if (history.length > 0) {
        const latestId = history[history.length - 1].id;
        privateKeySelect.value = latestId;
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize i18n first (loads translations and applies to DOM)
    await I18N.init();

    document.getElementById('generateKeysBtn').addEventListener('click', generateKeyPair);
    document.getElementById('downloadPublicKeyBtn').addEventListener('click', downloadPublicKey);
    document.getElementById('downloadPrivateKeyBtn').addEventListener('click', downloadPrivateKey);
    document.getElementById('encryptFileBtn').addEventListener('click', encryptFile);
    document.getElementById('decryptFileBtn').addEventListener('click', decryptFile);

    // Initialize key history display
    updateKeyHistoryDisplay();
    updateKeySelectors();

    // Language selector
    const langSelector = document.getElementById('langSelector');
    if (langSelector) {
        langSelector.addEventListener('change', async (e) => {
            await I18N.setLang(e.target.value);
                // Reset description so it reloads in the new language
                descriptionLoaded = false;
                const inlineContainer = document.getElementById('descriptionInline');
                if (inlineContainer) inlineContainer.remove();
                const shadowHost = document.getElementById('descriptionShadowHost');
                if (shadowHost) shadowHost.remove();
                const notice = document.getElementById('descriptionFrameNotice');
                if (notice) notice.remove();
                // Remove previously injected description styles in head (legacy path)
                injectedStyleIds.forEach(id => { const el = document.getElementById(id); if (el) el.remove(); });
                injectedStyleIds.clear();
                if (descriptionIframe) {
                    descriptionIframe.style.display = '';
                    descriptionIframe.src = '';
                }
            // Update key history display with new language
            updateKeyHistoryDisplay();
            updateKeySelectors();
        });
    }
    
    // Description panel toggle with iframe fallback (fetch+inject)
    const descriptionBtn = document.getElementById('descriptionBtn');
    const descriptionPanel = document.getElementById('descriptionPanel');
    const closeDescriptionBtn = document.getElementById('closeDescriptionBtn');
    const descriptionIframe = document.getElementById('descriptionIframe');
    const descriptionPanelContent = document.getElementById('descriptionPanelContent');

    let descriptionLoaded = false;
    let injectedStyleIds = new Set();
    let _lastDescUrl = ''; // tracks the last resolved description URL for fallback notice

    async function tryLoadDescription() {
        if (descriptionLoaded) return;

        // Locale-aware: all description files are in internationalization/ folder
        const lang = I18N.currentLang;
        const descFile = `internationalization/description.${lang}.html`;
        const descriptionUrl = new URL(descFile, window.location.href).href;
        _lastDescUrl = descriptionUrl;

        // First try: fetch the HTML directly (works when same-origin and CORS allows)
        try {
            const resp = await fetch(descriptionUrl, { method: 'GET', credentials: 'same-origin' });
            if (resp.ok) {
                const text = await resp.text();
                // Parse and inject styles + body content
                const parser = new DOMParser();
                const doc = parser.parseFromString(text, 'text/html');

                // Create or reuse a host element and attach a Shadow DOM to isolate injected styles
                let host = document.getElementById('descriptionShadowHost');
                if (!host) {
                    host = document.createElement('div');
                    host.id = 'descriptionShadowHost';
                    host.style.overflow = 'auto';
                    host.style.padding = '16px';
                    host.style.flex = '1 1 auto';
                    // place it before iframe/notice so it's the main visible content
                    descriptionPanelContent.appendChild(host);
                }

                // Attach (or reuse) an open shadow root on the host
                const shadow = host.shadowRoot || host.attachShadow({ mode: 'open' });

                // Inject <style> tags from fetched document into the shadow root
                const styles = doc.querySelectorAll('head style');
                styles.forEach((s) => {
                    const ns = document.createElement('style');
                    ns.textContent = s.textContent;
                    shadow.appendChild(ns);
                });

                // For link[rel=stylesheet], use @import inside a style in the shadow to preserve isolation
                const links = doc.querySelectorAll('head link[rel="stylesheet"]');
                links.forEach((lnk) => {
                    try {
                        const href = lnk.getAttribute('href');
                        if (href) {
                            const resolved = new URL(href, descriptionUrl).href;
                            const importStyle = document.createElement('style');
                            importStyle.textContent = `@import url("${resolved}");`;
                            shadow.appendChild(importStyle);
                        }
                    } catch (e) {
                        // ignore
                    }
                });

                // Insert body content into the shadow root
                // Wrap inside a container to keep layout predictable
                let shadowInner = shadow.getElementById ? shadow.getElementById('descriptionShadowInner') : null;
                if (!shadowInner) {
                    shadowInner = document.createElement('div');
                    shadowInner.id = 'descriptionShadowInner';
                    shadow.appendChild(shadowInner);
                }
                shadowInner.innerHTML = doc.body.innerHTML;

                // Hide iframe if present
                if (descriptionIframe) descriptionIframe.style.display = 'none';

                descriptionLoaded = true;
                return;
            }
        } catch (err) {
            // fetch failed (could be CORS or other network error). We'll fall back to iframe.
            console.warn('fetch(description.html) failed, falling back to iframe:', err);
        }

        // Fallback: ensure iframe uses locale-aware URL
        try {
            if (descriptionIframe) descriptionIframe.src = descriptionUrl;
        } catch (e) {
            console.warn('setting iframe src failed:', e);
        }

        // Try to detect if iframe is accessible; if not, provide a link message later when user opens panel
        descriptionLoaded = true; // avoid retrying on repeated opens
    }

    descriptionBtn.addEventListener('click', async () => {
        await tryLoadDescription();
        descriptionPanel.classList.add('active');

        // If iframe is visible but cross-origin blocks access, show a fallback link inside the panel
        if (descriptionIframe && descriptionIframe.style.display !== 'none') {
            setTimeout(() => {
                try {
                    // Accessing contentDocument will throw if cross-origin
                    const doc = descriptionIframe.contentDocument || descriptionIframe.contentWindow.document;
                    // If accessible, do nothing
                } catch (e) {
                    // Cross-origin: show a prominent link to open in new tab
                    let notice = document.getElementById('descriptionFrameNotice');
                    if (!notice) {
                        notice = document.createElement('div');
                        notice.id = 'descriptionFrameNotice';
                        notice.style.padding = '12px';
                        notice.style.background = '#fff3cd';
                        notice.style.borderLeft = '4px solid #ffc107';
                        notice.style.margin = '8px';
                        const a = document.createElement('a');
                        a.href = _lastDescUrl;
                        a.target = '_blank';
                        a.textContent = I18N.t('desc.panel.open-external');
                        notice.appendChild(a);
                        descriptionPanelContent.insertBefore(notice, descriptionPanelContent.firstChild);
                    }
                }
            }, 300);
        }
    });

    closeDescriptionBtn.addEventListener('click', () => {
        descriptionPanel.classList.remove('active');
    });

    // Close panel when clicking outside the content area
    descriptionPanel.addEventListener('click', (e) => {
        if (e.target === descriptionPanel) {
            descriptionPanel.classList.remove('active');
        }
    });
});
