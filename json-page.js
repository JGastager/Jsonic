// json-page.js — Renders raw JSON file tabs as the Jsonic styled tree
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
    let SETTINGS = { quoteKeys: true, countOnly: false, wrapStrings: false, colorBrackets: true };
    const AUTO_COLLAPSE_DEPTH = 2;

    // ── Inject CSS ───────────────────────────────────────────────────────────
    function injectStyles(themeKey, settings) {
        const t = THEMES[themeKey] || THEMES.material;
        const bracketColor = settings.colorBrackets !== false ? t.bracket : t.punct;
        const braceColor = settings.colorBrackets !== false ? t.brace : t.punct;
        const css = `
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Roboto+Mono:wght@400;500&display=swap');

#jsonic-page-root {
  --jsonic-bg:      #171717;
  --jsonic-body:     #303030;
  --jsonic-hover:   #404040;
  --jsonic-dimmed:   #707070;
  --jsonic-muted:   #a0a0a0;
  --jsonic-text:    #f0f0f0;
  --jsonic-soft: rgba(255, 255, 255, 0.05);
  --jsonic-guides: rgba(255, 255, 255, 0.1);
  --jsonic-guides-hover: rgba(255, 255, 255, 0.2);
  --jsonic-primary: #38bdf8;
  --jsonic-primary-muted: #38bdf828;
  --jsonic-primary-hover: #38bdf838;
  --json-key:     ${t.key};
  --json-string:  ${t.string};
  --json-number:  ${t.number};
  --json-boolean: ${t.boolean};
  --json-null:    ${t.null};
  --json-bracket: ${bracketColor};
  --json-brace:   ${braceColor};
  --json-punct:   ${t.punct};
  --json-toggle:  var(--jsonic-text);

  position: fixed;
  inset: 0;
  background: var(--jsonic-bg);
  color: var(--jsonic-text);
  font-family: 'Roboto', Arial, sans-serif;
  font-size: 13px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 2147483647;
  box-sizing: border-box;
}

#jsonic-page-root *, #jsonic-page-root *::before, #jsonic-page-root *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

#jsonic-page-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: auto;
  padding: 14px 16px 24px;
  scrollbar-width: thin;
  scrollbar-color: var(--jsonic-muted) transparent;
}

#jsonic-page-body::-webkit-scrollbar { width: 5px; height: 5px; }
#jsonic-page-body::-webkit-scrollbar-thumb { background: var(--jsonic-muted); border-radius: 3px; }

.json-tree {
  font-family: 'Roboto Mono', 'Consolas', monospace;
  font-size: 13px;
  line-height: 20px;
}

.json-tree.wrap-strings .json-row { white-space: normal; }
.json-tree.wrap-strings .json-string { white-space: normal; word-break: break-word; }

.json-row {
  display: block;
  border-radius: 3px;
  padding: 0 2px;
  white-space: nowrap;
}

.json-row.json-collapsible { cursor: pointer; }
.json-row.json-collapsible:hover { background: var(--jsonic-soft); }

.json-key     { color: var(--json-key); }
.json-string  { color: var(--json-string); }
.json-number  { color: var(--json-number); }
.json-boolean { color: var(--json-boolean); }
.json-null    { color: var(--json-null); }
.json-bracket { color: var(--json-bracket); }
.json-brace   { color: var(--json-brace); }
.json-punct   { color: var(--json-punct); }

.json-toggle {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: 18px;
  margin-right: 4px;
  height: 1em;
  color: var(--json-toggle);
  user-select: none;
  vertical-align: middle;
  flex-shrink: 0;
  transform: translate(-1px, -2px);
}

.json-toggle::before {
  content: '';
  display: block;
  width: 18px;
  height: 18px;
  background-color: currentColor;
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256'%3E%3Cpolyline points='96 48 176 128 96 208' fill='none' stroke='black' stroke-linecap='round' stroke-linejoin='round' stroke-width='16'/%3E%3C/svg%3E");
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256'%3E%3Cpolyline points='96 48 176 128 96 208' fill='none' stroke='black' stroke-linecap='round' stroke-linejoin='round' stroke-width='16'/%3E%3C/svg%3E");
  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
  transform: rotate(0deg);
  transform-origin: center;
  transition: transform 0.15s ease;
}

.json-toggle-spacer {
  display: inline-block;
  width: 18px;
  margin-right: 4px;
  flex-shrink: 0;
}

.json-toggle.open::before { transform: rotate(90deg); }

.json-children { position: relative; }

.json-children::before {
  content: '';
  position: absolute;
  left: var(--indent-x, 7px);
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--jsonic-guides);
  pointer-events: none;
}

.json-children:hover::before { background: var(--jsonic-guides-hover); }

.json-summary {
  color: var(--jsonic-muted);
  font-size: 11.5px;
  font-style: italic;
}

.json-summary .json-brace,
.json-summary .json-bracket,
.json-summary .json-punct {
  font-style: normal;
  font-size: 13px;
}
    `;
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
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
    function buildJsonTree(container, value, key, depth, isLast) {
        const row = createEl('div', 'json-row');
        row.style.paddingLeft = `${depth * 20}px`;

        if (key !== null && key !== undefined) {
            const keyText = SETTINGS.quoteKeys ? `"${key}"` : key;
            row.appendChild(createSpan('json-key', keyText));
            row.appendChild(createSpan('json-punct', ': '));
        }

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
            const display = value.length > 300 ? value.slice(0, 300) + '\u2026' : value;
            row.insertBefore(createSpan('json-toggle-spacer', ''), row.firstChild);
            row.appendChild(createSpan('json-string', `"${display}"`));
            if (!isLast) row.appendChild(createSpan('json-punct', ','));
            container.appendChild(row);
            return;
        }

        const isArray = Array.isArray(value);
        const childKeys = isArray ? null : Object.keys(value);
        const count = isArray ? value.length : childKeys.length;
        const openChar = isArray ? '[' : '{';
        const closeChar = isArray ? ']' : '}';
        const bracketClass = isArray ? 'json-bracket' : 'json-brace';
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
        if (!isLast) summary.appendChild(createSpan('json-punct', ','));
        summary.style.display = collapsed ? 'inline' : 'none';
        row.appendChild(summary);

        row.classList.add('json-collapsible');
        container.appendChild(row);

        const childContainer = createEl('div', 'json-children');
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

        const closingRow = createEl('div', 'json-row json-closing');
        closingRow.style.paddingLeft = `${depth * 20}px`;
        closingRow.appendChild(createSpan(bracketClass, closeChar));
        if (!isLast) closingRow.appendChild(createSpan('json-punct', ','));
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

    // ── Page takeover ────────────────────────────────────────────────────────
    function renderPage(themeKey, settings) {
        Object.assign(SETTINGS, settings);
        injectStyles(themeKey, settings);

        // Build root container
        const root = createEl('div');
        root.id = 'jsonic-page-root';

        // Scrollable body
        const body = createEl('div');
        body.id = 'jsonic-page-body';

        const tree = createEl('div', 'json-tree');
        if (settings.wrapStrings) tree.classList.add('wrap-strings');
        buildJsonTree(tree, parsed, null, 0, true);
        body.appendChild(tree);

        root.appendChild(body);

        // Replace page content
        document.documentElement.style.cssText = 'margin:0;padding:0;height:100%;overflow:hidden;';
        document.body.style.cssText = 'margin:0;padding:0;height:100%;overflow:hidden;';
        document.body.innerHTML = '';
        document.body.appendChild(root);

        // Update page title
        document.title = location.pathname.split('/').pop() || 'JSON — Jsonic';
    }

    // ── Load settings then render ────────────────────────────────────────────
    fetch(chrome.runtime.getURL('themes.json'))
        .then(r => r.json())
        .then(themes => {
            THEMES = themes;
            chrome.storage.sync.get(['jsonicTheme', 'jsonicSettings'], (data) => {
                const theme = data.jsonicTheme || 'material';
                const settings = data.jsonicSettings || {};
                renderPage(theme, settings);
            });
        });

    // Re-render if settings change while the tab is open
    chrome.storage.onChanged.addListener((changes) => {
        if (changes.jsonicTheme || changes.jsonicSettings) {
            chrome.storage.sync.get(['jsonicTheme', 'jsonicSettings'], (data) => {
                const theme = data.jsonicTheme || 'material';
                const settings = data.jsonicSettings || {};
                renderPage(theme, settings);
            });
        }
    });

})();
