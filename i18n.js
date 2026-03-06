/**
 * i18n.js — Lightweight internationalization engine for WebCrypto Exchange KH
 *
 * Usage:
 *   await I18N.init();          // auto-detect language and apply to DOM
 *   I18N.t('key')               // get translated string
 *   I18N.setLang('en')          // switch language, re-apply DOM, persist to localStorage
 *   I18N.applyToDOM(rootEl)     // apply translations to a specific DOM subtree
 */
const I18N = (() => {
    const STORAGE_KEY   = 'wcx-lang';
    const DEFAULT_LANG  = 'ja';
    const SUPPORTED     = ['ja', 'en', 'es', 'fr', 'zh', 'ko', 'de'];

    let _lang         = DEFAULT_LANG;
    let _translations = {};
    let _langChangeCallbacks = [];

    /* -------------------------------------------------------
     * Language detection
     * Priority: localStorage > navigator.languages > default
     * ------------------------------------------------------- */
    function _detectLang() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && SUPPORTED.includes(saved)) return saved;

        const navLangs = navigator.languages || (navigator.language ? [navigator.language] : []);
        for (const tag of navLangs) {
            const short = tag.split('-')[0].toLowerCase();
            if (SUPPORTED.includes(short)) return short;
        }
        return DEFAULT_LANG;
    }

    /* -------------------------------------------------------
     * Load translations JSON
     * ------------------------------------------------------- */
    async function _load(lang) {
        const url = `internationalization/${lang}.json`;
        const resp = await fetch(url);
        if (!resp.ok) {
            console.warn(`[i18n] Failed to load ${url}, falling back to ${DEFAULT_LANG}`);
            if (lang !== DEFAULT_LANG) return _load(DEFAULT_LANG);
            throw new Error(`[i18n] Cannot load fallback translation file.`);
        }
        _translations = await resp.json();
        _lang = lang;
        localStorage.setItem(STORAGE_KEY, lang);
        document.documentElement.lang = lang;
    }

    /* -------------------------------------------------------
     * Translate a key with optional positional substitution
     *   t('status.encrypted', 'foo.jpg')
     *   → "ファイルを暗号化しました！(foo.jpg)"
     * ------------------------------------------------------- */
    function t(key, ...args) {
        let str = _translations[key];
        if (str === undefined) {
            console.warn(`[i18n] Missing key: "${key}"`);
            return key;
        }
        args.forEach((arg, i) => { str = str.replace(`{${i}}`, arg); });
        return str;
    }

    /* -------------------------------------------------------
     * DOM application helpers
     * Supported attributes:
     *   data-i18n            → textContent
     *   data-i18n-html       → innerHTML (trusted static strings only)
     *   data-i18n-placeholder → placeholder attribute
     *   data-i18n-title       → title attribute
     *   data-i18n-aria-label  → aria-label attribute
     * ------------------------------------------------------- */
    function applyToDOM(root) {
        const scope = root || document;

        scope.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (key) el.textContent = t(key);
        });

        scope.querySelectorAll('[data-i18n-html]').forEach(el => {
            const key = el.getAttribute('data-i18n-html');
            if (key) el.innerHTML = t(key);
        });

        scope.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (key) el.placeholder = t(key);
        });

        scope.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            if (key) el.title = t(key);
        });

        scope.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
            const key = el.getAttribute('data-i18n-aria-label');
            if (key) el.setAttribute('aria-label', t(key));
        });
    }

    /* -------------------------------------------------------
     * Public API
     * ------------------------------------------------------- */
    async function init() {
        const lang = _detectLang();
        await _load(lang);
        applyToDOM();
        _updateSelector();
        return lang;
    }

    async function setLang(lang) {
        if (!SUPPORTED.includes(lang)) {
            console.warn(`[i18n] Unsupported language: ${lang}`);
            return;
        }
        await _load(lang);
        applyToDOM();
        _updateSelector();
        _langChangeCallbacks.forEach(cb => cb(lang));
    }

    function onLangChange(cb) {
        _langChangeCallbacks.push(cb);
    }

    /** Update the language selector widget (if present) */
    function _updateSelector() {
        const sel = document.getElementById('langSelector');
        if (sel) sel.value = _lang;
    }

    return {
        init,
        setLang,
        t,
        applyToDOM,
        onLangChange,
        get currentLang() { return _lang; },
        get supportedLangs() { return [...SUPPORTED]; },
    };
})();
