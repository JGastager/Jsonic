// json-page.js — Renders raw JSON file tabs as the JSON Parse styled tree
(function () {
    'use strict';

    // ── Detection ────────────────────────────────────────────────────────────
    // Only act when the entire page is a JSON document.
    const isJsonContentType = document.contentType === 'application/json';
    const isSinglePrePage = (
        document.body &&
        document.body.children.length === 1 &&
        document.body.children[0].tagName === 'PRE'
    );
    if (!isJsonContentType && !isSinglePrePage) return;

    const pre = document.querySelector('pre');
    if (!pre) return;
    const raw = (pre.textContent || '').trim();
    if (!raw) return;

    let parsed;
    try { parsed = JSON.parse(raw); } catch { return; }

    // ── Themes (loaded from themes.json) ────────────────────────────────────
    let THEMES = {};

    // ── Settings defaults ────────────────────────────────────────────────────
    let SETTINGS = { quoteKeys: true, countOnly: false, wrapStrings: false, colorBrackets: true, showCommas: true };
    const AUTO_COLLAPSE_DEPTH = 2;

    // ── Inject CSS ───────────────────────────────────────────────────────────
    function injectStyles(themeKey, settings) {
        const t = THEMES[themeKey] || THEMES.material;
        const bracketColor = settings.colorBrackets !== false ? t.bracket : t.punct;
        const braceColor = settings.colorBrackets !== false ? t.brace : t.punct;

        // Load the static stylesheet once
        if (!document.getElementById('jp-stylesheet')) {
            const link = document.createElement('link');
            link.id = 'jp-stylesheet';
            link.rel = 'stylesheet';
            link.href = chrome.runtime.getURL('style.css');
            document.head.appendChild(link);
        }

        // Inject only the dynamic theme variables
        const themeVars = `
#jp-page-root {
  --json-key:     ${t.key};
  --json-string:  ${t.string};
  --json-number:  ${t.number};
  --json-boolean: ${t.boolean};
  --json-null:    ${t.null};
  --json-bracket: ${bracketColor};
  --json-brace:   ${braceColor};
  --json-punct:   ${t.punct};
}`;

        // Update or create the theme vars style tag
        let style = document.getElementById('jp-theme-vars');
        if (!style) {
            style = document.createElement('style');
            style.id = 'jp-theme-vars';
            document.head.appendChild(style);
        }
        style.textContent = themeVars;
    }

    // ── DOM helpers ──────────────────────────────────────────────────────────
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

    // ── Tree builder (mirrors sidepanel.js) ──────────────────────────────────
    function buildJsonTree(container, value, key, depth, isLast, path = '$', arrayIndex = null) {
        const row = createEl('div', 'json-row');
        row.style.paddingLeft = `${depth * 20}px`;
        row._jpData = { key: arrayIndex !== null ? arrayIndex : key, value, path };

        if (key !== null && key !== undefined) {
            const keyText = SETTINGS.quoteKeys ? `"${key}"` : key;
            row.appendChild(createSpan('json-key', keyText));
            row.appendChild(createSpan('json-punct', ': '));
        }

        if (value === null) {
            row.insertBefore(createSpan('json-toggle-spacer', ''), row.firstChild);
            row.appendChild(createSpan('json-null', 'null'));
            if (!isLast && SETTINGS.showCommas !== false) row.appendChild(createSpan('json-punct', ','));
            container.appendChild(row);
            return;
        }
        if (typeof value === 'boolean') {
            row.insertBefore(createSpan('json-toggle-spacer', ''), row.firstChild);
            row.appendChild(createSpan('json-boolean', String(value)));
            if (!isLast && SETTINGS.showCommas !== false) row.appendChild(createSpan('json-punct', ','));
            container.appendChild(row);
            return;
        }
        if (typeof value === 'number') {
            row.insertBefore(createSpan('json-toggle-spacer', ''), row.firstChild);
            row.appendChild(createSpan('json-number', String(value)));
            if (!isLast && SETTINGS.showCommas !== false) row.appendChild(createSpan('json-punct', ','));
            container.appendChild(row);
            return;
        }
        if (typeof value === 'string') {
            const display = value.length > 300 ? value.slice(0, 300) + '\u2026' : value;
            row.insertBefore(createSpan('json-toggle-spacer', ''), row.firstChild);
            row.appendChild(createSpan('json-string', `"${display}"`));
            if (!isLast && SETTINGS.showCommas !== false) row.appendChild(createSpan('json-punct', ','));
            container.appendChild(row);
            return;
        }

        const isArray = Array.isArray(value);
        const childKeys = isArray ? null : Object.keys(value);
        const count = isArray ? value.length : childKeys.length;
        const openChar = isArray ? '[' : '{';
        const closeChar = isArray ? ']' : '}';
        const bracketClass = isArray ? 'json-bracket' : 'json-brace';

        // Empty array/object — render inline without a collapsible
        if (count === 0) {
            row.insertBefore(createSpan('json-toggle-spacer', ''), row.firstChild);
            row.appendChild(createSpan(bracketClass, openChar));
            row.appendChild(createSpan(bracketClass, closeChar));
            if (!isLast && SETTINGS.showCommas !== false) row.appendChild(createSpan('json-punct', ','));
            container.appendChild(row);
            return;
        }

        const collapsed = depth >= AUTO_COLLAPSE_DEPTH;

        const toggle = createSpan('json-toggle', '');
        if (!collapsed) toggle.classList.add('open');
        row.insertBefore(toggle, row.firstChild);
        row.appendChild(createSpan(bracketClass, openChar));

        const summary = createEl('span', 'json-summary');
        const label = SETTINGS.countOnly
            ? `\u00A0${count}\u00A0`
            : isArray
                ? `\u00A0${count}\u00A0${count === 1 ? 'item' : 'items'}\u00A0`
                : `\u00A0${count}\u00A0${count === 1 ? 'key' : 'keys'}\u00A0`;
        summary.appendChild(document.createTextNode(label));
        summary.appendChild(createSpan(bracketClass, closeChar));
        if (!isLast && SETTINGS.showCommas !== false) summary.appendChild(createSpan('json-punct', ','));
        summary.style.display = collapsed ? 'inline' : 'none';
        row.appendChild(summary);

        row.classList.add('json-collapsible');
        container.appendChild(row);

        const childContainer = createEl('div', 'json-children');
        childContainer.style.setProperty('--indent-x', `${depth * 20 + 7}px`);
        childContainer.style.display = collapsed ? 'none' : '';

        if (isArray) {
            value.forEach((item, i) => {
                buildJsonTree(childContainer, item, null, depth + 1, i === value.length - 1, `${path}[${i}]`, i);
            });
        } else {
            childKeys.forEach((k, i) => {
                const childPath = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k)
                    ? `${path}.${k}`
                    : `${path}["${k.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"]`;
                buildJsonTree(childContainer, value[k], k, depth + 1, i === childKeys.length - 1, childPath);
            });
        }
        container.appendChild(childContainer);

        const closingRow = createEl('div', 'json-row json-closing');
        closingRow.style.paddingLeft = `${depth * 20}px`;
        closingRow.appendChild(createSpan('json-toggle-spacer', ''));
        closingRow.appendChild(createSpan(bracketClass, closeChar));
        if (!isLast && SETTINGS.showCommas !== false) closingRow.appendChild(createSpan('json-punct', ','));
        closingRow.style.display = collapsed ? 'none' : '';
        container.appendChild(closingRow);

        row._jsonCollapsible = { toggle, summary, childContainer, closingRow };

        row.addEventListener('click', (e) => {
            e.stopPropagation();
            const isCollapsed = childContainer.style.display === 'none';

            if (e.shiftKey) {
                Array.from(container.children)
                    .filter(el => el.classList.contains('json-collapsible') && el._jsonCollapsible)
                    .forEach(sibling => {
                        const c = sibling._jsonCollapsible;
                        c.childContainer.style.display = isCollapsed ? '' : 'none';
                        c.closingRow.style.display = isCollapsed ? '' : 'none';
                        c.summary.style.display = isCollapsed ? 'none' : 'inline';
                        c.toggle.classList.toggle('open', isCollapsed);
                    });
            } else {
                childContainer.style.display = isCollapsed ? '' : 'none';
                closingRow.style.display = isCollapsed ? '' : 'none';
                summary.style.display = isCollapsed ? 'none' : 'inline';
                toggle.classList.toggle('open', isCollapsed);
            }
        });
    }

    // ── Context menu ─────────────────────────────────────────────────────────
    function setupContextMenu(root) {
        let menu = null;
        let targetRow = null;

        function hideMenu() {
            if (menu) { menu.remove(); menu = null; }
            targetRow = null;
        }

        function showMenu(e, row) {
            hideMenu();
            targetRow = row;

            menu = createEl('div');
            menu.id = 'jp-context-menu';

            const isCollapsible = row.classList.contains('json-collapsible') && row._jsonCollapsible;
            const isCollapsed = isCollapsible && row._jsonCollapsible.childContainer.style.display === 'none';

            const actions = [
                { action: 'copy-key', label: 'Copy Key', iconClass: 'jp-ctx-icon-key' },
                { action: 'copy-value', label: 'Copy Value', iconClass: 'jp-ctx-icon-value' },
                { action: 'copy-path', label: 'Copy Path', iconClass: 'jp-ctx-icon-path' },
                ...(isCollapsible ? [{ action: 'toggle-collapse', label: isCollapsed ? 'Expand' : 'Collapse', iconClass: isCollapsed ? 'jp-ctx-icon-expand' : 'jp-ctx-icon-collapse' }] : []),
            ];

            actions.forEach(({ action, label, iconClass }) => {
                const item = createEl('div', 'jp-ctx-item');
                const icon = createEl('span', `jp-ctx-icon ${iconClass}`);
                const labelEl = createEl('span');
                labelEl.textContent = label;
                item.appendChild(icon);
                item.appendChild(labelEl);
                item.addEventListener('click', () => {
                    if (!targetRow || !targetRow._jpData) { hideMenu(); return; }
                    const { key, value, path } = targetRow._jpData;
                    if (action === 'toggle-collapse') {
                        if (!targetRow._jsonCollapsible) { hideMenu(); return; }
                        const c = targetRow._jsonCollapsible;
                        const collapsed = c.childContainer.style.display === 'none';
                        c.childContainer.style.display = collapsed ? '' : 'none';
                        c.closingRow.style.display = collapsed ? '' : 'none';
                        c.summary.style.display = collapsed ? 'none' : 'inline';
                        c.toggle.classList.toggle('open', collapsed);
                        hideMenu();
                        return;
                    }
                    let text = '';
                    if (action === 'copy-key') {
                        text = key !== null && key !== undefined ? String(key) : '';
                    } else if (action === 'copy-value') {
                        text = value === null ? 'null'
                            : typeof value === 'object' ? JSON.stringify(value, null, 2)
                                : String(value);
                    } else if (action === 'copy-path') {
                        text = path || '';
                    }
                    navigator.clipboard.writeText(text).catch(() => { });
                    hideMenu();
                });
                menu.appendChild(item);
            });

            menu.style.left = '0px';
            menu.style.top = '0px';
            root.appendChild(menu);

            const rect = menu.getBoundingClientRect();
            const x = Math.min(e.clientX, window.innerWidth - rect.width - 8);
            const y = Math.min(e.clientY, window.innerHeight - rect.height - 8);
            menu.style.left = `${x}px`;
            menu.style.top = `${y}px`;
        }

        root.addEventListener('contextmenu', (e) => {
            const row = e.target.closest('.json-row');
            if (!row || !row._jpData) return;
            e.preventDefault();
            showMenu(e, row);
        });

        root.addEventListener('click', (e) => { if (!e.target.closest('#jp-context-menu')) hideMenu(); }, true);
        root.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideMenu(); });
    }

    // ── Page takeover ────────────────────────────────────────────────────────
    function renderPage(themeKey, settings) {
        Object.assign(SETTINGS, settings);
        injectStyles(themeKey, settings);

        // Build root container
        const root = createEl('div');
        root.id = 'jp-page-root';

        // Scrollable body
        const body = createEl('div');
        body.id = 'jp-page-body';

        const tree = createEl('div', 'json-tree');
        if (settings.wrapStrings) tree.classList.add('wrap-strings');
        buildJsonTree(tree, parsed, null, 0, true);
        body.appendChild(tree);

        const settingsBtn = createEl('div');
        settingsBtn.className = 'btn';
        settingsBtn.title = 'Open settings';
        settingsBtn.appendChild(createEl('span', 'i-gear'));
        settingsBtn.addEventListener('click', () => chrome.runtime.sendMessage({ action: 'openOptions' }));
        root.appendChild(settingsBtn);

        root.appendChild(body);

        // Replace page content
        document.documentElement.style.cssText = 'margin:0;padding:0;height:100%;overflow:hidden;';
        document.body.style.cssText = 'margin:0;padding:0;height:100%;overflow:hidden;';
        document.body.innerHTML = '';
        document.body.appendChild(root);
        setupContextMenu(root);

        // Update page title
        document.title = location.pathname.split('/').pop() || 'JSON Parse';
    }

    // ── Load settings then render ────────────────────────────────────────────
    fetch(chrome.runtime.getURL('themes.json'))
        .then(r => r.json())
        .then(themes => {
            THEMES = themes;
            chrome.storage.sync.get(['jsonParseTheme', 'jsonParseSettings'], (data) => {
                const theme = data.jsonParseTheme || 'material';
                const settings = data.jsonParseSettings || {};
                renderPage(theme, settings);
            });
        });

    // Re-render if settings change while the tab is open
    chrome.storage.onChanged.addListener((changes) => {
        if (changes.jsonParseTheme || changes.jsonParseSettings) {
            chrome.storage.sync.get(['jsonParseTheme', 'jsonParseSettings'], (data) => {
                const theme = data.jsonParseTheme || 'material';
                const settings = data.jsonParseSettings || {};
                renderPage(theme, settings);
            });
        }
    });

})();
