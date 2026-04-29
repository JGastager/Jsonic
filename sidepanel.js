// ── Helpers ────────────────────────────────────────────────────────────────

// ── Themes ────────────────────────────────────────────────────────────────

const THEMES = {
    material: {
        key: '#82AAFF', string: '#C3E88D', number: '#F78C6C',
        boolean: '#C792EA', null: '#FF5370', bracket: '#89DDFF', punct: '#89DDFF', toggle: '#546E7A',
    },
    visualstudio: {
        key: '#9CDCFE', string: '#CE9178', number: '#B5CEA8',
        boolean: '#569CD6', null: '#569CD6', bracket: '#D4D4D4', punct: '#D4D4D4', toggle: '#6A9955',
    },
    monokai: {
        key: '#A6E22E', string: '#E6DB74', number: '#AE81FF',
        boolean: '#66D9E8', null: '#F92672', bracket: '#F8F8F2', punct: '#F8F8F2', toggle: '#75715E',
    },
    jetbrains: {
        key: '#9876AA', string: '#6A8759', number: '#6897BB',
        boolean: '#CC7832', null: '#CC7832', bracket: '#A9B7C6', punct: '#A9B7C6', toggle: '#606366',
    },
    brackets: {
        key: '#7FC1CA', string: '#A8FF60', number: '#FF9DA4',
        boolean: '#FFAD00', null: '#FF6C60', bracket: '#DECDCE', punct: '#DECDCE', toggle: '#777777',
    },
    dracula: {
        key: '#8BE9FD', string: '#F1FA8C', number: '#BD93F9',
        boolean: '#FF79C6', null: '#FF5555', bracket: '#F8F8F2', punct: '#F8F8F2', toggle: '#6272A4',
    },
    onedark: {
        key: '#61AFEF', string: '#98C379', number: '#D19A66',
        boolean: '#C678DD', null: '#E06C75', bracket: '#ABB2BF', punct: '#ABB2BF', toggle: '#5C6370',
    },
    nord: {
        key: '#88C0D0', string: '#A3BE8C', number: '#B48EAD',
        boolean: '#81A1C1', null: '#BF616A', bracket: '#D8DEE9', punct: '#D8DEE9', toggle: '#4C566A',
    },
    gruvbox: {
        key: '#83A598', string: '#B8BB26', number: '#D3869B',
        boolean: '#FE8019', null: '#FB4934', bracket: '#EBDBB2', punct: '#EBDBB2', toggle: '#665C54',
    },
    catppuccin: {
        key: '#89DCEB', string: '#A6E3A1', number: '#FAB387',
        boolean: '#CBA6F7', null: '#F38BA8', bracket: '#89B4FA', punct: '#BAC2DE', toggle: '#585B70',
    },
    tokyonight: {
        key: '#7DCFFF', string: '#9ECE6A', number: '#FF9E64',
        boolean: '#BB9AF7', null: '#F7768E', bracket: '#89DDFF', punct: '#C0CAF5', toggle: '#3B4261',
    },
    github: {
        key: '#79C0FF', string: '#A5D6FF', number: '#F2CC60',
        boolean: '#FF7B72', null: '#FF7B72', bracket: '#E3B341', punct: '#8B949E', toggle: '#484F58',
    },
};

function applyTheme(themeKey) {
    const t = THEMES[themeKey] || THEMES.material;
    const root = document.documentElement.style;
    root.setProperty('--json-key', t.key);
    root.setProperty('--json-string', t.string);
    root.setProperty('--json-number', t.number);
    root.setProperty('--json-boolean', t.boolean);
    root.setProperty('--json-null', t.null);
    root.setProperty('--json-bracket', t.bracket);
    root.setProperty('--json-brace', t.bracket);
    root.setProperty('--json-punct', t.punct);
    root.setProperty('--json-toggle', t.toggle);
}

function createEl(tag, className) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    return el;
}

function createSpan(className, text) {
    const el = createEl('span', className);
    el.textContent = text;
    return el;
}

// ── Tree builder ───────────────────────────────────────────────────────────
// Objects and arrays auto-collapse at this depth and beyond.
const AUTO_COLLAPSE_DEPTH = 2;

// Runtime settings (loaded from storage, updated via storage.onChanged)
let SETTINGS = { quoteKeys: true, countOnly: false, wrapStrings: false };

function applySettings() {
    document.querySelectorAll('.json-tree').forEach(tree => {
        tree.classList.toggle('wrap-strings', SETTINGS.wrapStrings);
    });
}

/**
 * Recursively builds JSON tree DOM nodes into `container`.
 * All user-supplied content is set via textContent, never innerHTML.
 */
function buildJsonTree(container, value, key, depth, isLast) {
    const row = createEl('div', 'json-row');
    row.style.paddingLeft = `${depth * 20}px`;

    // Optional key prefix
    if (key !== null && key !== undefined) {
        const keyText = SETTINGS.quoteKeys ? `"${key}"` : key;
        row.appendChild(createSpan('json-key', keyText));
        row.appendChild(createSpan('json-punct', ': '));
    }

    // ── Leaf values ──────────────────────────────────────────────────────
    if (value === null) {
        row.insertBefore(createSpan('json-toggle-spacer', ''), row.firstChild);
        row.appendChild(createSpan('json-null', 'null'));
        if (!isLast) row.appendChild(createSpan('json-punct', ','));
        container.appendChild(row);
        return;
    }
    if (typeof value === 'boolean') {
        row.insertBefore(createSpan('json-toggle-spacer', ''), row.firstChild);
        row.appendChild(createSpan('json-boolean', String(value)));
        if (!isLast) row.appendChild(createSpan('json-punct', ','));
        container.appendChild(row);
        return;
    }
    if (typeof value === 'number') {
        row.insertBefore(createSpan('json-toggle-spacer', ''), row.firstChild);
        row.appendChild(createSpan('json-number', String(value)));
        if (!isLast) row.appendChild(createSpan('json-punct', ','));
        container.appendChild(row);
        return;
    }
    if (typeof value === 'string') {
        // Truncate very long strings to keep the tree readable
        const display = value.length > 300 ? value.slice(0, 300) + '\u2026' : value;
        row.insertBefore(createSpan('json-toggle-spacer', ''), row.firstChild);
        row.appendChild(createSpan('json-string', `"${display}"`));
        if (!isLast) row.appendChild(createSpan('json-punct', ','));
        container.appendChild(row);
        return;
    }

    // ── Collapsible: object or array ────────────────────────────────────
    const isArray = Array.isArray(value);
    const childKeys = isArray ? null : Object.keys(value);
    const count = isArray ? value.length : childKeys.length;
    const openChar = isArray ? '[' : '{';
    const closeChar = isArray ? ']' : '}';
    const bracketClass = isArray ? 'json-bracket' : 'json-brace';
    const collapsed = depth >= AUTO_COLLAPSE_DEPTH;

    // Expand/collapse toggle arrow — always first in the row
    const toggle = createSpan('json-toggle', '');
    if (!collapsed) toggle.classList.add('open');
    row.insertBefore(toggle, row.firstChild);
    row.appendChild(createSpan(bracketClass, openChar));

    // Summary shown in collapsed state: e.g.  3 items ]
    const summary = createEl('span', 'json-summary');
    const label = SETTINGS.countOnly
        ? `\u00A0${count}\u00A0`
        : isArray
            ? `\u00A0${count}\u00A0${count === 1 ? 'item' : 'items'}\u00A0`
            : `\u00A0${count}\u00A0${count === 1 ? 'key' : 'keys'}\u00A0`;
    summary.appendChild(document.createTextNode(label));
    summary.appendChild(createSpan(bracketClass, closeChar));
    if (!isLast) summary.appendChild(createSpan('json-punct', ','));
    summary.style.display = collapsed ? 'inline' : 'none';
    row.appendChild(summary);

    row.classList.add('json-collapsible');
    container.appendChild(row);

    // Children container
    const childContainer = createEl('div', 'json-children');
    // Position the indent guide line at the toggle's horizontal centre
    childContainer.style.setProperty('--indent-x', `${depth * 20 + 7}px`);
    childContainer.style.display = collapsed ? 'none' : '';

    if (isArray) {
        value.forEach((item, i) => {
            buildJsonTree(childContainer, item, null, depth + 1, i === value.length - 1);
        });
    } else {
        childKeys.forEach((k, i) => {
            buildJsonTree(childContainer, value[k], k, depth + 1, i === childKeys.length - 1);
        });
    }
    container.appendChild(childContainer);

    // Closing bracket on its own line
    const closingRow = createEl('div', 'json-row json-closing');
    closingRow.style.paddingLeft = `${depth * 20}px`;
    closingRow.appendChild(createSpan(bracketClass, closeChar));
    if (!isLast) closingRow.appendChild(createSpan('json-punct', ','));
    closingRow.style.display = collapsed ? 'none' : '';
    container.appendChild(closingRow);

    // Click handler – toggle expand/collapse
    row.addEventListener('click', (e) => {
        e.stopPropagation();
        const isCollapsed = childContainer.style.display === 'none';
        childContainer.style.display = isCollapsed ? '' : 'none';
        closingRow.style.display = isCollapsed ? '' : 'none';
        summary.style.display = isCollapsed ? 'none' : 'inline';
        toggle.classList.toggle('open', isCollapsed);
    });
}

// ── Tab/panel rendering ───────────────────────────────────────────────────

function getRootTypeBadge(value) {
    if (value === null) return 'null';
    if (Array.isArray(value)) return '[ ]';
    if (typeof value === 'object') return '{ }';
    return typeof value;
}

function renderJsonBlocks(jsonBlocks) {
    const tabsEl = document.getElementById('json-tabs');
    const panelsEl = document.getElementById('json-panels');

    tabsEl.innerHTML = '';
    panelsEl.innerHTML = '';

    if (!jsonBlocks || jsonBlocks.length === 0) {
        const empty = createEl('div', 'empty-state');
        const msg = createEl('p');
        msg.appendChild(document.createTextNode('No JSON found in '));
        const code = document.createElement('code');
        code.textContent = '<pre>';
        msg.appendChild(code);
        msg.appendChild(document.createTextNode(' tags on this page.'));
        empty.appendChild(msg);
        panelsEl.appendChild(empty);
        return;
    }

    jsonBlocks.forEach(({ data, label }, i) => {
        // ── Tab ──────────────────────────────────────────────────────────
        const tab = document.createElement('li');
        const tabName = label
            ? (label.length > 22 ? label.slice(0, 22) + '\u2026' : label)
            : `JSON ${i + 1}`;
        tab.appendChild(document.createTextNode(tabName + '\u00A0'));
        tab.appendChild(createSpan('tab-badge', getRootTypeBadge(data)));
        if (i === 0) tab.classList.add('active');
        tabsEl.appendChild(tab);

        // ── Panel ─────────────────────────────────────────────────────────
        const panel = createEl('section', 'json-panel');
        panel.style.display = i === 0 ? '' : 'none';

        const tree = createEl('div', 'json-tree');
        buildJsonTree(tree, data, null, 0, true);
        panel.appendChild(tree);
        panelsEl.appendChild(panel);

        // ── Tab click ─────────────────────────────────────────────────────
        tab.addEventListener('click', () => {
            tabsEl.querySelectorAll('li').forEach(t => t.classList.remove('active'));
            panelsEl.querySelectorAll('.json-panel').forEach(p => { p.style.display = 'none'; });
            tab.classList.add('active');
            panel.style.display = '';
        });
    });
}

// ── Data extraction ───────────────────────────────────────────────────────

function refresh() {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        if (!tab) return;

        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                const NAME_KEYS = ['name', 'title', 'label', 'id'];
                const results = [];
                for (const pre of document.querySelectorAll('pre')) {
                    const text = (pre.textContent || '').trim();
                    if (!text) continue;
                    let parsed;
                    try { parsed = JSON.parse(text); } catch { continue; }
                    // Derive a label: prefer pre attributes, then top-level JSON keys
                    let label = (pre.title || pre.id || '').trim();
                    if (!label && parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
                        for (const key of NAME_KEYS) {
                            const val = parsed[key];
                            if (val !== undefined && val !== null && typeof val !== 'object') {
                                label = String(val);
                                break;
                            }
                        }
                    }
                    results.push({ data: parsed, label });
                }
                return results;
            }
        }).then(([result]) => {
            renderJsonBlocks(result?.result ?? []);
            applySettings();
        }).catch(() => {
            renderJsonBlocks([]);
        });
    });
}

// ── Boot ───────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.sync.get(['jsonicTheme', 'jsonicSettings'], (data) => {
        applyTheme(data.jsonicTheme || 'material');
        if (data.jsonicSettings) Object.assign(SETTINGS, data.jsonicSettings);
        applySettings();
    });
    refresh();
});

// Re-apply theme/settings if changed in options while panel is open
chrome.storage.onChanged.addListener((changes) => {
    if (changes.jsonicTheme) applyTheme(changes.jsonicTheme.newValue);
    if (changes.jsonicSettings) {
        Object.assign(SETTINGS, changes.jsonicSettings.newValue);
        refresh();
    }
});

chrome.runtime.onMessage.addListener((message, sender) => {
    if (message.action !== 'refreshJson') return;
    // If from a content script, only refresh when it's the active tab
    if (sender.tab) {
        chrome.tabs.query({ active: true, currentWindow: true }, ([activeTab]) => {
            if (activeTab && sender.tab.id === activeTab.id) refresh();
        });
    } else {
        refresh();
    }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.active) refresh();
});

chrome.tabs.onActivated.addListener(refresh);
