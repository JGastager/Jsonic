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
        const css = `
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Roboto+Mono:wght@400;500&display=swap');

#jp-page-root {
  --jp-bg:      #171717;
  --jp-body:     #303030;
  --jp-hover:   #404040;
  --jp-dimmed:   #707070;
  --jp-muted:   #a0a0a0;
  --jp-text:    #f0f0f0;
  --jp-soft: rgba(255, 255, 255, 0.05);
  --jp-guides: rgba(255, 255, 255, 0.1);
  --jp-guides-hover: rgba(255, 255, 255, 0.2);
  --jp-primary: #38bdf8;
  --jp-primary-muted: rgba(56, 189, 248, 0.2);
  --jp-primary-hover: rgba(56, 189, 248, 0.3);
  --json-key:     ${t.key};
  --json-string:  ${t.string};
  --json-number:  ${t.number};
  --json-boolean: ${t.boolean};
  --json-null:    ${t.null};
  --json-bracket: ${bracketColor};
  --json-brace:   ${braceColor};
  --json-punct:   ${t.punct};
  --json-toggle:  var(--jp-muted);

  position: fixed;
  inset: 0;
  background: var(--jp-bg);
  color: var(--jp-text);
  font-family: 'Roboto', Arial, sans-serif;
  font-size: 13px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 2147483647;
  box-sizing: border-box;
}

#jp-page-root *, #jp-page-root *::before, #jp-page-root *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

#jp-page-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: auto;
  padding: 14px 16px 24px;
  scrollbar-width: thin;
  scrollbar-color: var(--jp-muted) transparent;
}

#jp-page-body::-webkit-scrollbar { width: 5px; height: 5px; }
#jp-page-body::-webkit-scrollbar-thumb { background: var(--jp-muted); border-radius: 3px; }

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
.json-row.json-collapsible:hover { background: var(--jp-soft); }

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
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='%23000' fill-rule='evenodd' d='M6.705 11.823a.73.73 0 0 1-1.205-.552V4.729a.73.73 0 0 1 1.205-.552L10.214 7.2a1 1 0 0 1 .347.757v.084a1 1 0 0 1-.347.757z' clip-rule='evenodd'/%3E%3C/svg%3E");
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='%23000' fill-rule='evenodd' d='M6.705 11.823a.73.73 0 0 1-1.205-.552V4.729a.73.73 0 0 1 1.205-.552L10.214 7.2a1 1 0 0 1 .347.757v.084a1 1 0 0 1-.347.757z' clip-rule='evenodd'/%3E%3C/svg%3E");
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

.json-children,
.json-closing { position: relative; }

.json-children::before {
  content: '';
  position: absolute;
  left: var(--indent-x, 7px);
  top: 0;
  bottom: 0;
  width: 1px;
  border-left: 1px solid var(--jp-guides);
  pointer-events: none;
  transition: border-color 0.2s ease;
}

.json-closing::before {
  content: '';
  position: absolute;
  left: var(--indent-x, 7px);
  top: 0;
  bottom: 0;
  width: 6px;
  height: 12px;
  border-left: 1px solid var(--jp-guides);
  border-bottom: 1px solid var(--jp-guides);
  border-radius: 0 0 0 3px;
  pointer-events: none;
  transition: border-color 0.2s ease;
}

.json-children .json-closing::before {
  left: calc(var(--indent-x, 7px) + 20px);
}

.json-children:hover::before {
  border-color: var(--jp-guides-hover);
}

.json-collapsible:hover + .json-children::before,
.json-collapsible:hover + .json-children + .json-closing::before  {
  border-color: var(--jp-guides-hover);
}

.json-children:hover + .json-closing::before {
  border-color: var(--jp-guides-hover);
}

.json-closing:hover::before,
.json-children:has( + .json-closing:hover)::before {
  border-color: var(--jp-guides-hover);
}

.json-summary {
  color: var(--jp-muted);
  font-size: 11.5px;
  font-style: italic;
}

.json-summary .json-brace,
.json-summary .json-bracket,
.json-summary .json-punct {
  font-style: normal;
  font-size: 13px;
}

.btn {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 1;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  padding: 6px !important;
  background: transparent;
  color: var(--jp-text);
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.btn:hover {
  background-color: var(--jp-soft);
}

.i-gear {
  background-color: var(--jp-text);
  height: 18px;
  width: 18px;
  -webkit-mask-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgZmlsbD0iIzAwMDAwMCIgdmlld0JveD0iMCAwIDI1NiAyNTYiPjxwYXRoIGQ9Ik0xMjgsODBhNDgsNDgsMCwxLDAsNDgsNDhBNDguMDUsNDguMDUsMCwwLDAsMTI4LDgwWm0wLDgwYTMyLDMyLDAsMSwxLDMyLTMyQTMyLDMyLDAsMCwxLDEyOCwxNjBabTEwOS45NC01Mi43OWE4LDgsMCwwLDAtMy44OS01LjRsLTI5LjgzLTE3LS4xMi0zMy42MmE4LDgsMCwwLDAtMi44My02LjA4LDExMS45MSwxMTEuOTEsMCwwLDAtMzYuNzItMjAuNjcsOCw4LDAsMCwwLTYuNDYuNTlMMTI4LDQxLjg1LDk3Ljg4LDI1YTgsOCwwLDAsMC02LjQ3LS42QTExMi4xLDExMi4xLDAsMCwwLDU0LjczLDQ1LjE1YTgsOCwwLDAsMC0yLjgzLDYuMDdsLS4xNSwzMy42NS0yOS44MywxN2E4LDgsMCwwLDAtMy44OSw1LjQsMTA2LjQ3LDEwNi40NywwLDAsMCwwLDQxLjU2LDgsOCwwLDAsMCwzLjg5LDUuNGwyOS44MywxNywuMTIsMzMuNjJhOCw4LDAsMCwwLDIuODMsNi4wOCwxMTEuOTEsMTExLjkxLDAsMCwwLDM2LjcyLDIwLjY3LDgsOCwwLDAsMCw2LjQ2LS41OUwxMjgsMjE0LjE1LDE1OC4xMiwyMzFhNy45MSw3LjkxLDAsMCwwLDMuOSwxLDguMDksOC4wOSwwLDAsMCwyLjU3LS40MiwxMTIuMSwxMTIuMSwwLDAsMCwzNi42OC0yMC43Myw4LDgsMCwwLDAsMi44My02LjA3bC4xNS0zMy42NSwyOS44My0xN2E4LDgsMCwwLDAsMy44OS01LjRBMTA2LjQ3LDEwNi40NywwLDAsMCwyMzcuOTQsMTA3LjIxWm0tMTUsMzQuOTEtMjguNTcsMTYuMjVhOCw4LDAsMCwwLTMsM2MtLjU4LDEtMS4xOSwyLjA2LTEuODEsMy4wNmE3Ljk0LDcuOTQsMCwwLDAtMS4yMiw0LjIxbC0uMTUsMzIuMjVhOTUuODksOTUuODksMCwwLDEtMjUuMzcsMTQuM0wxMzQsMTk5LjEzYTgsOCwwLDAsMC0zLjkxLTFoLS4xOWMtMS4yMSwwLTIuNDMsMC0zLjY0LDBhOC4wOCw4LjA4LDAsMCwwLTQuMSwxbC0yOC44NCwxNi4xQTk2LDk2LDAsMCwxLDY3Ljg4LDIwMWwtLjExLTMyLjJhOCw4LDAsMCwwLTEuMjItNC4yMmMtLjYyLTEtMS4yMy0yLTEuOC0zLjA2YTguMDksOC4wOSwwLDAsMC0zLTMuMDZsLTI4LjYtMTYuMjlhOTAuNDksOTAuNDksMCwwLDEsMC0yOC4yNkw2MS42Nyw5Ny42M2E4LDgsMCwwLDAsMy0zYy41OC0xLDEuMTktMi4wNiwxLjgxLTMuMDZhNy45NCw3Ljk0LDAsMCwwLDEuMjItNC4yMWwuMTUtMzIuMjVhOTUuODksOTUuODksMCwwLDEsMjUuMzctMTQuM0wxMjIsNTYuODdhOCw4LDAsMCwwLDQuMSwxYzEuMjEsMCwyLjQzLDAsMy42NCwwYTguMDgsOC4wOCwwLDAsMCw0LjEtMWwyOC44NC0xNi4xQTk2LDk2LDAsMCwxLDE4OC4xMiw1NWwuMTEsMzIuMmE4LDgsMCwwLDAsMS4yMiw0LjIyYy42MiwxLDEuMjMsMiwxLjgsMy4wNmE4LjA5LDguMDksMCwwLDAsMywzLjA2bDI4LjYsMTYuMjlBOTAuNDksOTAuNDksMCwwLDEsMjIyLjksMTQyLjEyWiI+PC9wYXRoPjwvc3ZnPg==");
  mask-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgZmlsbD0iIzAwMDAwMCIgdmlld0JveD0iMCAwIDI1NiAyNTYiPjxwYXRoIGQ9Ik0xMjgsODBhNDgsNDgsMCwxLDAsNDgsNDhBNDguMDUsNDguMDUsMCwwLDAsMTI4LDgwWm0wLDgwYTMyLDMyLDAsMSwxLDMyLTMyQTMyLDMyLDAsMCwxLDEyOCwxNjBabTEwOS45NC01Mi43OWE4LDgsMCwwLDAtMy44OS01LjRsLTI5LjgzLTE3LS4xMi0zMy42MmE4LDgsMCwwLDAtMi44My02LjA4LDExMS45MSwxMTEuOTEsMCwwLDAtMzYuNzItMjAuNjcsOCw4LDAsMCwwLTYuNDYuNTlMMTI4LDQxLjg1LDk3Ljg4LDI1YTgsOCwwLDAsMC02LjQ3LS42QTExMi4xLDExMi4xLDAsMCwwLDU0LjczLDQ1LjE1YTgsOCwwLDAsMC0yLjgzLDYuMDdsLS4xNSwzMy42NS0yOS44MywxN2E4LDgsMCwwLDAtMy44OSw1LjQsMTA2LjQ3LDEwNi40NywwLDAsMCwwLDQxLjU2LDgsOCwwLDAsMCwzLjg5LDUuNGwyOS44MywxNywuMTIsMzMuNjJhOCw4LDAsMCwwLDIuODMsNi4wOCwxMTEuOTEsMTExLjkxLDAsMCwwLDM2LjcyLDIwLjY3LDgsOCwwLDAsMCw2LjQ2LS41OUwxMjgsMjE0LjE1LDE1OC4xMiwyMzFhNy45MSw3LjkxLDAsMCwwLDMuOSwxLDguMDksOC4wOSwwLDAsMCwyLjU3LS40MiwxMTIuMSwxMTIuMSwwLDAsMCwzNi42OC0yMC43Myw4LDgsMCwwLDAsMi44My02LjA3bC4xNS0zMy42NSwyOS44My0xN2E4LDgsMCwwLDAsMy44OS01LjRBMTA2LjQ3LDEwNi40NywwLDAsMCwyMzcuOTQsMTA3LjIxWm0tMTUsMzQuOTEtMjguNTcsMTYuMjVhOCw4LDAsMCwwLTMsM2MtLjU4LDEtMS4xOSwyLjA2LTEuODEsMy4wNmE3Ljk0LDcuOTQsMCwwLDAtMS4yMiw0LjIxbC0uMTUsMzIuMjVhOTUuODksOTUuODksMCwwLDEtMjUuMzcsMTQuM0wxMzQsMTk5LjEzYTgsOCwwLDAsMC0zLjkxLTFoLS4xOWMtMS4yMSwwLTIuNDMsMC0zLjY0LDBhOC4wOCw4LjA4LDAsMCwwLTQuMSwxbC0yOC44NCwxNi4xQTk2LDk2LDAsMCwxLDY3Ljg4LDIwMWwtLjExLTMyLjJhOCw4LDAsMCwwLTEuMjItNC4yMmMtLjYyLTEtMS4yMy0yLTEuOC0zLjA2YTguMDksOC4wOSwwLDAsMC0zLTMuMDZsLTI4LjYtMTYuMjlhOTAuNDksOTAuNDksMCwwLDEsMC0yOC4yNkw2MS42Nyw5Ny42M2E4LDgsMCwwLDAsMy0zYy41OC0xLDEuMTktMi4wNiwxLjgxLTMuMDZhNy45NCw3Ljk0LDAsMCwwLDEuMjItNC4yMWwuMTUtMzIuMjVhOTUuODksOTUuODksMCwwLDEsMjUuMzctMTQuM0wxMjIsNTYuODdhOCw4LDAsMCwwLDQuMSwxYzEuMjEsMCwyLjQzLDAsMy42NCwwYTguMDgsOC4wOCwwLDAsMCw0LjEtMWwyOC44NC0xNi4xQTk2LDk2LDAsMCwxLDE4OC4xMiw1NWwuMTEsMzIuMmE4LDgsMCwwLDAsMS4yMiw0LjIyYy42MiwxLDEuMjMsMiwxLjgsMy4wNmE4LjA5LDguMDksMCwwLDAsMywzLjA2bDI4LjYsMTYuMjlBOTAuNDksOTAuNDksMCwwLDEsMjIyLjksMTQyLjEyWiI+PC9wYXRoPjwvc3ZnPg==");
  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
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

        const settingsBtn = createEl('a');
        settingsBtn.href = chrome.runtime.getURL('options.html');
        settingsBtn.target = '_blank';
        settingsBtn.className = 'btn';
        settingsBtn.appendChild(createEl('span', 'i-gear'));
        root.appendChild(settingsBtn);

        root.appendChild(body);

        // Replace page content
        document.documentElement.style.cssText = 'margin:0;padding:0;height:100%;overflow:hidden;';
        document.body.style.cssText = 'margin:0;padding:0;height:100%;overflow:hidden;';
        document.body.innerHTML = '';
        document.body.appendChild(root);

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
