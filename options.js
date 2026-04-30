let THEMES = {};

const DEFAULT_THEME = 'material';
const DEFAULT_SETTINGS = { quoteKeys: true, countOnly: false, wrapStrings: false, colorBrackets: true };

function applyPreview(themeKey, settings) {
    const t = THEMES[themeKey] || THEMES[DEFAULT_THEME];
    const s = settings || DEFAULT_SETTINGS;
    const preview = document.getElementById('theme-preview');
    const quoteChar = s.quoteKeys ? '"' : '';
    const allKeys = ['name', 'version', 'active', 'tag', 'meta'];
    preview.querySelectorAll('.preview-key').forEach((el, i) => {
        el.textContent = quoteChar + allKeys[i] + quoteChar;
        el.style.color = t.key;
    });
    preview.querySelector('.preview-string').style.color = t.string;
    preview.querySelector('.preview-number').style.color = t.number;
    preview.querySelector('.preview-boolean').style.color = t.boolean;
    preview.querySelector('.preview-null').style.color = t.null;
    preview.querySelectorAll('.preview-punct').forEach(el => el.style.color = t.punct);
    const bracketColor = s.colorBrackets !== false ? t.bracket : t.punct;
    const braceColor = s.colorBrackets !== false ? t.brace : t.punct;
    preview.querySelectorAll('.preview-brace').forEach(el => el.style.color = braceColor);
    preview.querySelectorAll('.preview-bracket').forEach(el => el.style.color = bracketColor);
    const summaryEls = preview.querySelectorAll('.preview-summary');
    summaryEls[0].textContent = s.countOnly ? ' 2 ' : ' 2 keys ';
    summaryEls[1].textContent = s.countOnly ? ' 3 ' : ' 3 items ';
}

function getCurrentSettings() {
    return {
        quoteKeys: document.getElementById('quoteKeys').checked,
        countOnly: document.getElementById('countOnly').checked,
        wrapStrings: document.getElementById('wrapStrings').checked,
        colorBrackets: document.getElementById('colorBrackets').checked,
    };
}

function loadSettings() {
    chrome.storage.sync.get(['jsonicTheme', 'jsonicSettings'], (data) => {
        const theme = data.jsonicTheme || DEFAULT_THEME;
        const settings = Object.assign({}, DEFAULT_SETTINGS, data.jsonicSettings || {});
        document.getElementById('theme').value = theme;
        document.getElementById('quoteKeys').checked = settings.quoteKeys;
        document.getElementById('countOnly').checked = settings.countOnly;
        document.getElementById('wrapStrings').checked = settings.wrapStrings;
        document.getElementById('colorBrackets').checked = settings.colorBrackets !== false;
        applyPreview(theme, settings);
    });
}

function saveSettings() {
    const theme = document.getElementById('theme').value;
    const settings = getCurrentSettings();
    chrome.storage.sync.set({ jsonicTheme: theme, jsonicSettings: settings }, () => {
        const status = document.getElementById('status');
        status.textContent = 'Settings saved!';
        status.classList.add('success', 'show');
        setTimeout(() => {
            status.textContent = '';
            status.classList.remove('success', 'show');
        }, 2000);
    });
}

function resetSettings() {
    chrome.storage.sync.set({ jsonicTheme: DEFAULT_THEME, jsonicSettings: DEFAULT_SETTINGS }, () => {
        loadSettings();
        const status = document.getElementById('status');
        status.textContent = 'Reset to defaults!';
        status.classList.add('success', 'show');
        setTimeout(() => {
            status.textContent = '';
            status.classList.remove('success', 'show');
        }, 2000);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    fetch(chrome.runtime.getURL('themes.json'))
        .then(r => r.json())
        .then(themes => {
            THEMES = themes;
            loadSettings();
            document.getElementById('theme').addEventListener('change', (e) => {
                applyPreview(e.target.value, getCurrentSettings());
            });
            document.getElementById('quoteKeys').addEventListener('change', () => {
                applyPreview(document.getElementById('theme').value, getCurrentSettings());
            });
            document.getElementById('countOnly').addEventListener('change', () => {
                applyPreview(document.getElementById('theme').value, getCurrentSettings());
            });
            document.getElementById('wrapStrings').addEventListener('change', () => {
                applyPreview(document.getElementById('theme').value, getCurrentSettings());
            });
            document.getElementById('colorBrackets').addEventListener('change', () => {
                applyPreview(document.getElementById('theme').value, getCurrentSettings());
            });
        });
});
document.getElementById('save').addEventListener('click', saveSettings);
document.getElementById('reset').addEventListener('click', resetSettings);