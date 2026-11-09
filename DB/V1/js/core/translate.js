/**
 * Language switcher (Google Translate)
 *
 * Purpose : Wires the footer Language selector (English / Sinhala / Tamil) to the hidden Google Translate widget and remembers the choice.
 * Depends : Google Translate element.js (loaded after this file, calls googleTranslateElementInit as its callback).
 * Exposes : googleTranslateElementInit(), applyLanguage()
 */

function googleTranslateElementInit() {
    new google.translate.TranslateElement({
        pageLanguage: 'en',         // original language
        includedLanguages: 'si,ta,en',
        layout: google.translate.TranslateElement.InlineLayout.SIMPLE
    }, 'google_translate_element');

    window.__gtInitialized = true;
    const savedLang = localStorage.getItem('dashboard_lang') || getCurrentLanguageFromCookie() || 'en';
    if (savedLang && savedLang !== 'en') {
        let tries = 0;
        const timer = setInterval(() => {
            tries += 1;
            if (applyLanguage(savedLang) || tries > 25) clearInterval(timer);
        }, 250);
    }
}

function setGoogTransCookie(lang) {
    const normalizedLang = (lang || 'en').toLowerCase();
    const value = `/en/${normalizedLang}`;
    const maxAge = 60 * 60 * 24 * 365;
    document.cookie = `googtrans=${value};path=/;max-age=${maxAge}`;
    const hostParts = window.location.hostname.split('.');
    if (hostParts.length >= 2) {
        const domain = hostParts.slice(-2).join('.');
        document.cookie = `googtrans=${value};path=/;domain=.${domain};max-age=${maxAge}`;
    }
}

function getCurrentLanguageFromCookie() {
    const m = document.cookie.match(/(?:^|; )googtrans=([^;]+)/);
    if (!m) return 'en';
    const raw = decodeURIComponent(m[1] || '');
    const parts = raw.split('/');
    const lang = parts[parts.length - 1];
    return lang || 'en';
}

function applyLanguage(lang) {
    setGoogTransCookie(lang);
    localStorage.setItem('dashboard_lang', lang);
    const hashValue = `#googtrans(en|${lang})`;
    if (window.location.hash !== hashValue) {
        window.location.hash = hashValue;
    }
    const combo = document.querySelector('#google_translate_element select.goog-te-combo');
    if (!combo) return false;
    combo.value = lang;
    combo.dispatchEvent(new Event('change'));
    return true;
}

document.addEventListener('DOMContentLoaded', function () {
    const languageSelect = document.getElementById('languageSelect');
    if (!languageSelect) return;
    const initialLang = localStorage.getItem('dashboard_lang') || getCurrentLanguageFromCookie() || 'en';
    languageSelect.value = initialLang;
    languageSelect.addEventListener('change', function () {
        const selectedLang = languageSelect.value;
        const applied = applyLanguage(selectedLang);
        if (!applied) {
            sessionStorage.setItem('lang_reload_once', '1');
            window.location.reload();
        }
    });

    // Ensure saved language always applies on first load.
    const cookieLang = getCurrentLanguageFromCookie();
    if (initialLang !== cookieLang) {
        setGoogTransCookie(initialLang);
    }

    // Run translate combo once DOM is ready so Google applies translated UI.
    if (initialLang !== 'en') {
        let tries = 0;
        const timer = setInterval(() => {
            tries += 1;
            if (applyLanguage(initialLang) || tries > 20) clearInterval(timer);
        }, 250);
    }

    // Prevent accidental reload loops from previous versions.
    if (sessionStorage.getItem('lang_reload_once') === '1') {
        sessionStorage.removeItem('lang_reload_once');
    }
});
