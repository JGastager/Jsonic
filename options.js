const THEMES = {
    material: {
        key: '#82AAFF', string: '#C3E88D', number: '#F78C6C',
        boolean: '#C792EA', null: '#FF5370', bracket: '#89DDFF', punct: '#89DDFF',
    },
    visualstudio: {
        key: '#9CDCFE', string: '#CE9178', number: '#B5CEA8',
        boolean: '#569CD6', null: '#569CD6', bracket: '#D4D4D4', punct: '#D4D4D4',
    },
    monokai: {
        key: '#A6E22E', string: '#E6DB74', number: '#AE81FF',
        boolean: '#66D9E8', null: '#F92672', bracket: '#F8F8F2', punct: '#F8F8F2',
    },
    jetbrains: {
        key: '#9876AA', string: '#6A8759', number: '#6897BB',
        boolean: '#CC7832', null: '#CC7832', bracket: '#A9B7C6', punct: '#A9B7C6',
    },
    brackets: {
        key: '#7FC1CA', string: '#A8FF60', number: '#FF9DA4',
        boolean: '#FFAD00', null: '#FF6C60', bracket: '#DECDCE', punct: '#DECDCE',
    },
    dracula: {
        key: '#8BE9FD', string: '#F1FA8C', number: '#BD93F9',
        boolean: '#FF79C6', null: '#FF5555', bracket: '#F8F8F2', punct: '#F8F8F2',
    },
    onedark: {
        key: '#61AFEF', string: '#98C379', number: '#D19A66',
        boolean: '#C678DD', null: '#E06C75', bracket: '#ABB2BF', punct: '#ABB2BF',
    },
    nord: {
        key: '#88C0D0', string: '#A3BE8C', number: '#B48EAD',
        boolean: '#81A1C1', null: '#BF616A', bracket: '#D8DEE9', punct: '#D8DEE9',
    },
    gruvbox: {
        key: '#83A598', string: '#B8BB26', number: '#D3869B',
        boolean: '#FE8019', null: '#FB4934', bracket: '#EBDBB2', punct: '#EBDBB2',
    },
    catppuccin: {
        key: '#89DCEB', string: '#A6E3A1', number: '#FAB387',
        boolean: '#CBA6F7', null: '#F38BA8', bracket: '#89B4FA', punct: '#BAC2DE',
    },
    tokyonight: {
        key: '#7DCFFF', string: '#9ECE6A', number: '#FF9E64',
        boolean: '#BB9AF7', null: '#F7768E', bracket: '#89DDFF', punct: '#C0CAF5',
    },
    github: {
        key: '#79C0FF', string: '#A5D6FF', number: '#F2CC60',
        boolean: '#FF7B72', null: '#FF7B72', bracket: '#E3B341', punct: '#8B949E',
    },
};

const DEFAULT_THEME = 'material';
const DEFAULT_SETTINGS = { quoteKeys: true, countOnly: false, wrapStrings: false };

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
    preview.querySelectorAll('.preview-brace').forEach(el => el.style.color = t.bracket);
    preview.querySelector('.preview-toggle').style.color = t.punct;
    const summaryEl = preview.querySelector('.preview-summary');
    summaryEl.textContent = s.countOnly ? ' 2 ' : ' 2 keys ';
}

function getCurrentSettings() {
    return {
        quoteKeys: document.getElementById('quoteKeys').checked,
        countOnly: document.getElementById('countOnly').checked,
        wrapStrings: document.getElementById('wrapStrings').checked,
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
});
document.getElementById('save').addEventListener('click', saveSettings);
document.getElementById('reset').addEventListener('click', resetSettings);