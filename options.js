let THEMES = {};

const DEFAULT_THEME = 'material';
const DEFAULT_SETTINGS = { quoteKeys: true, countOnly: false, wrapStrings: false, colorBrackets: true, showCommas: true, firstLevelOnly: false };

const COLOR_FIELDS = [
    { prop: 'key', label: 'Keys' },
    { prop: 'string', label: 'Strings' },
    { prop: 'number', label: 'Numbers' },
    { prop: 'boolean', label: 'Booleans' },
    { prop: 'null', label: 'Null' },
    { prop: 'bracket', label: 'Brackets [ ]' },
    { prop: 'brace', label: 'Braces { }' },
    { prop: 'punct', label: 'Punctuation' },
];

const THEME_LABELS = {
    dark: {
        material: 'Material',
        visualstudio: 'Visual Studio',
        monokai: 'Monokai',
        jetbrains: 'JetBrains',
        brackets: 'Brackets',
        dracula: 'Dracula',
        onedark: 'One Dark',
        nord: 'Nord',
        gruvbox: 'Gruvbox',
        catppuccin: 'Catppuccin Mocha',
        tokyonight: 'Tokyo Night',
        github: 'GitHub Dark',
        solarized: 'Solarized Dark',
    },
    light: {
        material: 'Material Lighter',
        visualstudio: 'Visual Studio Light',
        jetbrains: 'IntelliJ Light',
        onedark: 'One Light',
        gruvbox: 'Gruvbox Light',
        catppuccin: 'Catppuccin Latte',
        tokyonight: 'Tokyo Night Light',
        github: 'GitHub Light',
        solarized: 'Solarized Light',
        quietlight: 'Quiet Light',
    },
};

function populateThemeDropdown(mode) {
    const select = document.getElementById('theme');
    const current = select.value;
    select.innerHTML = '';
    const modeThemes = THEMES[mode] || THEMES.dark;
    for (const key of Object.keys(modeThemes)) {
        const opt = document.createElement('option');
        opt.value = key;
        const labels = THEME_LABELS[mode] || THEME_LABELS.dark;
        opt.textContent = labels[key] || key;
        select.appendChild(opt);
    }
    const custom = document.createElement('option');
    custom.value = 'custom';
    custom.textContent = 'Custom';
    select.appendChild(custom);
    // Restore selection if available in new mode, otherwise fall back
    if (current && modeThemes[current] || current === 'custom') {
        select.value = current;
    } else {
        select.value = DEFAULT_THEME;
    }
}

function getCustomColors() {
    const colors = {};
    COLOR_FIELDS.forEach(({ prop }) => {
        const el = document.getElementById(`cp-${prop}`);
        if (el) colors[prop] = el.value;
    });
    return colors;
}

function setCustomColors(colors) {
    COLOR_FIELDS.forEach(({ prop }) => {
        const input = document.getElementById(`cp-${prop}`);
        const hex = document.getElementById(`cp-${prop}-hex`);
        const val = colors[prop] || '#ffffff';
        if (input) input.value = val;
        if (hex) hex.textContent = val.toUpperCase();
    });
}

function showCustomPickers(themeKey) {
    document.getElementById('custom-theme-pickers').style.display = themeKey === 'custom' ? '' : 'none';
}

function buildCustomPickers() {
    const container = document.getElementById('custom-theme-pickers');
    container.style.display = 'none';
    const grid = document.createElement('div');
    grid.className = 'cp-grid';
    COLOR_FIELDS.forEach(({ prop, label }) => {
        const item = document.createElement('div');
        item.className = 'cp-item';

        const lbl = document.createElement('span');
        lbl.className = 'cp-label';
        lbl.textContent = label;

        const swatchWrap = document.createElement('div');
        swatchWrap.className = 'cp-swatch-wrap';

        const input = document.createElement('input');
        input.type = 'color';
        input.id = `cp-${prop}`;
        input.value = '#ffffff';

        const hexDisplay = document.createElement('span');
        hexDisplay.className = 'cp-hex';
        hexDisplay.id = `cp-${prop}-hex`;
        hexDisplay.textContent = '#FFFFFF';

        input.addEventListener('input', () => {
            hexDisplay.textContent = input.value.toUpperCase();
            applyPreview('custom', getCurrentSettings());
        });

        swatchWrap.appendChild(input);
        swatchWrap.appendChild(hexDisplay);
        item.appendChild(lbl);
        item.appendChild(swatchWrap);
        grid.appendChild(item);
    });
    container.appendChild(grid);
}

function getCurrentMode() {
    return document.getElementById('mode').value || 'dark';
}

function applyMode(mode) {
    document.documentElement.dataset.jpMode = mode;
}

function applyPreview(themeKey, settings) {
    const mode = getCurrentMode();
    const modeThemes = THEMES[mode] || THEMES.dark;
    const t = themeKey === 'custom' ? getCustomColors() : (modeThemes[themeKey] || modeThemes[DEFAULT_THEME]);
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
        firstLevelOnly: document.getElementById('firstLevelOnly').checked,
    };
}

function loadSettings() {
    chrome.storage.sync.get(['jsonParseTheme', 'jsonParseSettings', 'jsonParseCustomTheme', 'jsonParseMode'], (data) => {
        const mode = data.jsonParseMode || 'dark';
        const theme = data.jsonParseTheme || DEFAULT_THEME;
        const settings = Object.assign({}, DEFAULT_SETTINGS, data.jsonParseSettings || {});
        const modeThemes = THEMES[mode] || THEMES.dark;
        const customColors = data.jsonParseCustomTheme || modeThemes[DEFAULT_THEME];
        document.getElementById('mode').value = mode;
        applyMode(mode);
        populateThemeDropdown(mode);
        document.getElementById('theme').value = theme;
        // Fall back if theme not available in this mode
        if (document.getElementById('theme').value !== theme) {
            document.getElementById('theme').value = DEFAULT_THEME;
        }
        document.getElementById('quoteKeys').checked = settings.quoteKeys;
        document.getElementById('countOnly').checked = settings.countOnly;
        document.getElementById('wrapStrings').checked = settings.wrapStrings;
        document.getElementById('colorBrackets').checked = settings.colorBrackets !== false;
        document.getElementById('showCommas').checked = settings.showCommas !== false;
        document.getElementById('firstLevelOnly').checked = !!settings.firstLevelOnly;
        setCustomColors(customColors);
        showCustomPickers(theme);
        applyPreview(theme, settings);
    });
}

function saveSettings() {
    const mode = getCurrentMode();
    const theme = document.getElementById('theme').value;
    const settings = getCurrentSettings();
    const toSave = { jsonParseTheme: theme, jsonParseSettings: settings, jsonParseMode: mode };
    if (theme === 'custom') toSave.jsonParseCustomTheme = getCustomColors();
    chrome.storage.sync.set(toSave, () => {
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
    chrome.storage.sync.set({ jsonParseTheme: DEFAULT_THEME, jsonParseSettings: DEFAULT_SETTINGS, jsonParseMode: 'dark' }, () => {
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
    buildCustomPickers();
    fetch(chrome.runtime.getURL('themes.json'))
        .then(r => r.json())
        .then(themes => {
            THEMES = themes;
            loadSettings();
            document.getElementById('mode').addEventListener('change', (e) => {
                applyMode(e.target.value);
                populateThemeDropdown(e.target.value);
                showCustomPickers(document.getElementById('theme').value);
                applyPreview(document.getElementById('theme').value, getCurrentSettings());
            });
            document.getElementById('theme').addEventListener('change', (e) => {
                showCustomPickers(e.target.value);
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