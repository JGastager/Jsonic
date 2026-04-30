let THEMES = {};

const DEFAULT_THEME = 'material';
const DEFAULT_SETTINGS = { quoteKeys: true, countOnly: false, wrapStrings: false, colorBrackets: true, showCommas: true };

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
    const showCommas = s.showCommas !== false;
    preview.querySelectorAll('.preview-comma').forEach(el => {
        el.style.display = showCommas ? '' : 'none';
    });
}

function getCurrentSettings() {
    return {
        quoteKeys: document.getElementById('quoteKeys').checked,
        countOnly: document.getElementById('countOnly').checked,
        wrapStrings: document.getElementById('wrapStrings').checked,
        colorBrackets: document.getElementById('colorBrackets').checked,
        showCommas: document.getElementById('showCommas').checked,
    };
}

function loadSettings() {
    chrome.storage.sync.get(['jsonParseTheme', 'jsonParseSettings'], (data) => {
        const theme = data.jsonParseTheme || DEFAULT_THEME;
        const settings = Object.assign({}, DEFAULT_SETTINGS, data.jsonParseSettings || {});
        document.getElementById('theme').value = theme;
        document.getElementById('quoteKeys').checked = settings.quoteKeys;
        document.getElementById('countOnly').checked = settings.countOnly;
        document.getElementById('wrapStrings').checked = settings.wrapStrings;
        document.getElementById('colorBrackets').checked = settings.colorBrackets !== false;
        document.getElementById('showCommas').checked = settings.showCommas !== false;
        applyPreview(theme, settings);
    });
}

function saveSettings() {
    const theme = document.getElementById('theme').value;
    const settings = getCurrentSettings();
    chrome.storage.sync.set({ jsonParseTheme: theme, jsonParseSettings: settings }, () => {
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
    chrome.storage.sync.set({ jsonParseTheme: DEFAULT_THEME, jsonParseSettings: DEFAULT_SETTINGS }, () => {
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
            document.getElementById('showCommas').addEventListener('change', () => {
                applyPreview(document.getElementById('theme').value, getCurrentSettings());
            });
        });
});
document.getElementById('save').addEventListener('click', saveSettings);
document.getElementById('reset').addEventListener('click', resetSettings);