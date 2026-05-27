// tree-render.js — Shared JSON tree rendering primitives
// Exposed as window.JsonTreeRenderer; consumed by both json-page.js and sidepanel.js.

/* global chrome */
const JsonTreeRenderer = (() => {
    'use strict';

    // Objects and arrays auto-collapse at this depth and beyond.
    const AUTO_COLLAPSE_DEPTH = 2;

    // Runtime settings (loaded from storage, updated via storage.onChanged).
    // Consumers hold a reference to this object and mutate it via Object.assign().
    const SETTINGS = {
        quoteKeys: true, countOnly: false, wrapStrings: false,
        colorBrackets: true, showCommas: true, firstLevelOnly: false
    };

    // -- DOM helpers ----------------------------------------------------------

    function applyThemeVars(element, t, settings) {
        const root = element.style;
        const bracketColor = settings.colorBrackets !== false ? t.bracket : t.punct;
        const braceColor = settings.colorBrackets !== false ? t.brace : t.punct;

        root.setProperty('--json-key', t.key);
        root.setProperty('--json-string', t.string);
        root.setProperty('--json-number', t.number);
        root.setProperty('--json-boolean', t.boolean);
        root.setProperty('--json-null', t.null);
        root.setProperty('--json-bracket', bracketColor);
        root.setProperty('--json-brace', braceColor);
        root.setProperty('--json-punct', t.punct);
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

    // -- Tree builder ---------------------------------------------------------

    function createCopyButtons(row) {
        const wrap = createEl('span', 'jp-row-actions');

        const copyValBtn = createEl('button', 'jp-copy-btn');
        copyValBtn.setAttribute('aria-label', 'Copy value');
        copyValBtn.setAttribute('data-tooltip', 'Copy value');
        copyValBtn.appendChild(createEl('span', 'jp-copy-icon jp-copy-val-icon'));
        copyValBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const d = row._jpData;
            if (!d) return;
            const text = d.value === null ? 'null'
                : typeof d.value === 'object' ? JSON.stringify(d.value, null, 2)
                    : String(d.value);
            navigator.clipboard.writeText(text).catch(() => { });
        });

        const copyPathBtn = createEl('button', 'jp-copy-btn');
        copyPathBtn.setAttribute('aria-label', 'Copy path');
        copyPathBtn.setAttribute('data-tooltip', 'Copy path');
        copyPathBtn.appendChild(createEl('span', 'jp-copy-icon jp-copy-path-icon'));
        copyPathBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const d = row._jpData;
            if (!d) return;
            navigator.clipboard.writeText(d.path || '').catch(() => { });
        });

        wrap.appendChild(copyValBtn);
        wrap.appendChild(copyPathBtn);
        return wrap;
    }

    function _renderChildren(container, value, isArray, childKeys, depth, path) {
        if (isArray) {
            value.forEach((item, i) => {
                buildJsonTree(container, item, null, depth + 1, i === value.length - 1, `${path}[${i}]`, i);
            });
        } else {
            childKeys.forEach((k, i) => {
                const childPath = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k)
                    ? `${path}.${k}`
                    : `${path}["${k.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"]`;
                buildJsonTree(container, value[k], k, depth + 1, i === childKeys.length - 1, childPath);
            });
        }
    }

    function _renderLazy(childContainer) {
        if (!childContainer._lazyData) return;
        const { value, isArray, childKeys, depth, path } = childContainer._lazyData;
        childContainer._lazyData = null;
        _renderChildren(childContainer, value, isArray, childKeys, depth, path);
    }

    /** Force-renders all deferred (lazy) subtrees under `root`. Called before DOM-based search. */
    function renderAllDescendants(root) {
        const queue = [root];
        while (queue.length) {
            const node = queue.shift();
            for (const child of Array.from(node.children)) {
                if (child._lazyData) _renderLazy(child);
                if (child.children.length) queue.push(child);
            }
        }
    }

    /**
     * Recursively builds JSON tree DOM nodes into `container`.
     * All user-supplied content is set via textContent, never innerHTML.
     */
    function buildJsonTree(container, value, key, depth, isLast, path = '$', arrayIndex = null) {
        const row = createEl('div', 'json-row');
        row.style.paddingLeft = `${depth * 20}px`;
        row._jpData = { key: arrayIndex !== null ? arrayIndex : key, value, path };

        // Optional key prefix
        if (key !== null && key !== undefined) {
            const keyText = SETTINGS.quoteKeys ? `"${key}"` : key;
            row.appendChild(createSpan('json-key', keyText));
            row.appendChild(createSpan('json-punct', ': '));
        }

        // -- Leaf values ------------------------------------------------------
        if (value === null) {
            row.insertBefore(createSpan('json-toggle-spacer', ''), row.firstChild);
            row.appendChild(createSpan('json-null', 'null'));
            if (!isLast && SETTINGS.showCommas !== false) row.appendChild(createSpan('json-punct', ','));
            row.appendChild(createCopyButtons(row));
            container.appendChild(row);
            return;
        }
        if (typeof value === 'boolean') {
            row.insertBefore(createSpan('json-toggle-spacer', ''), row.firstChild);
            row.appendChild(createSpan('json-boolean', String(value)));
            if (!isLast && SETTINGS.showCommas !== false) row.appendChild(createSpan('json-punct', ','));
            row.appendChild(createCopyButtons(row));
            container.appendChild(row);
            return;
        }
        if (typeof value === 'number') {
            row.insertBefore(createSpan('json-toggle-spacer', ''), row.firstChild);
            row.appendChild(createSpan('json-number', String(value)));
            if (!isLast && SETTINGS.showCommas !== false) row.appendChild(createSpan('json-punct', ','));
            row.appendChild(createCopyButtons(row));
            container.appendChild(row);
            return;
        }
        if (typeof value === 'string') {
            // Truncate very long strings to keep the tree readable
            const display = value.length > 300 ? value.slice(0, 300) + '\u2026' : value;
            row.insertBefore(createSpan('json-toggle-spacer', ''), row.firstChild);
            let isUrl = false;
            try { const u = new URL(value); isUrl = u.protocol === 'https:' || u.protocol === 'http:'; } catch { }
            if (isUrl) {
                const wrapper = createEl('span', 'json-string');
                wrapper.appendChild(document.createTextNode('"'));
                const a = document.createElement('a');
                a.className = 'json-link';
                a.href = value;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                a.textContent = display;
                wrapper.appendChild(a);
                wrapper.appendChild(document.createTextNode('"'));
                row.appendChild(wrapper);
            } else {
                row.appendChild(createSpan('json-string', `"${display}"`));
            }
            if (!isLast && SETTINGS.showCommas !== false) row.appendChild(createSpan('json-punct', ','));
            row.appendChild(createCopyButtons(row));
            container.appendChild(row);
            return;
        }

        // -- Collapsible: object or array -------------------------------------
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
            row.appendChild(createCopyButtons(row));
            container.appendChild(row);
            return;
        }

        const collapsed = depth >= (SETTINGS.firstLevelOnly ? 1 : AUTO_COLLAPSE_DEPTH);

        // Expand/collapse toggle arrow always first in the row
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
        if (!isLast && SETTINGS.showCommas !== false) summary.appendChild(createSpan('json-punct', ','));
        summary.style.display = collapsed ? 'inline' : 'none';
        row.appendChild(summary);
        row.appendChild(createCopyButtons(row));

        row.classList.add('json-collapsible');
        container.appendChild(row);

        // Children container
        const childContainer = createEl('div', 'json-children');
        // Position the indent guide line at the toggle's horizontal centre
        childContainer._parentRow = row;
        childContainer.style.setProperty('--indent-x', `${depth * 20 + 7}px`);
        childContainer.style.display = collapsed ? 'none' : '';

        if (collapsed) {
            // Defer child DOM creation until first expand
            childContainer._lazyData = { value, isArray, childKeys, depth, path };
        } else {
            _renderChildren(childContainer, value, isArray, childKeys, depth, path);
        }
        container.appendChild(childContainer);

        // Closing bracket on its own line
        const closingRow = createEl('div', 'json-row json-closing');
        closingRow.style.paddingLeft = `${depth * 20}px`;
        closingRow.appendChild(createSpan('json-toggle-spacer', ''));
        closingRow.appendChild(createSpan(bracketClass, closeChar));
        if (!isLast && SETTINGS.showCommas !== false) closingRow.appendChild(createSpan('json-punct', ','));
        closingRow.style.display = collapsed ? 'none' : '';
        container.appendChild(closingRow);

        // Store references so siblings can be toggled via shift+click
        row._jsonCollapsible = { toggle, summary, childContainer, closingRow };

        // Click handler — toggle expand/collapse
        row.addEventListener('click', (e) => {
            e.stopPropagation();
            const isCollapsed = childContainer.style.display === 'none';

            if (e.shiftKey) {
                // Recursively expand or collapse this node and all its descendants
                function setCollapsible(el, expand) {
                    if (!el._jsonCollapsible) return;
                    const c = el._jsonCollapsible;
                    if (expand && c.childContainer._lazyData) _renderLazy(c.childContainer);
                    c.childContainer.style.display = expand ? '' : 'none';
                    c.closingRow.style.display = expand ? '' : 'none';
                    c.summary.style.display = expand ? 'none' : 'inline';
                    c.toggle.classList.toggle('open', expand);
                    Array.from(c.childContainer.children)
                        .filter(child => child.classList.contains('json-collapsible'))
                        .forEach(child => setCollapsible(child, expand));
                }
                setCollapsible(row, isCollapsed);
            } else {
                if (isCollapsed && childContainer._lazyData) _renderLazy(childContainer);
                childContainer.style.display = isCollapsed ? '' : 'none';
                closingRow.style.display = isCollapsed ? '' : 'none';
                summary.style.display = isCollapsed ? 'none' : 'inline';
                toggle.classList.toggle('open', isCollapsed);
            }
        });
    }

    // -- Context menu ---------------------------------------------------------

    function expandAncestors(el, root) {
        let node = el.parentElement;
        while (node && node !== root) {
            if (node._parentRow && node._parentRow._jsonCollapsible) {
                const c = node._parentRow._jsonCollapsible;
                if (c.childContainer.style.display === 'none') {
                    c.childContainer.style.display = '';
                    c.closingRow.style.display = '';
                    c.summary.style.display = 'none';
                    c.toggle.classList.add('open');
                }
            }
            node = node.parentElement;
        }
    }

    function buildSearchRegex(query, opts) {
        try {
            let pattern = opts.useRegex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            if (opts.wholeWord) pattern = `\\b(?:${pattern})\\b`;
            return { regex: new RegExp(pattern, opts.matchCase ? 'g' : 'gi'), error: false };
        } catch { return { regex: null, error: true }; }
    }

    /** Walk all collapsible rows under `root` and record whether each is open or closed. */
    function saveCollapseState(root) {
        const snapshot = [];
        root.querySelectorAll('.json-collapsible').forEach(row => {
            if (row._jsonCollapsible) {
                snapshot.push({ row, open: row._jsonCollapsible.toggle.classList.contains('open') });
            }
        });
        return snapshot;
    }

    /** Collapse every collapsible node under `root`. */
    function collapseAll(root) {
        root.querySelectorAll('.json-collapsible').forEach(row => {
            const c = row._jsonCollapsible;
            if (!c) return;
            c.childContainer.style.display = 'none';
            c.closingRow.style.display = 'none';
            c.summary.style.display = 'inline';
            c.toggle.classList.remove('open');
        });
    }

    /** Restore a previously saved collapse-state snapshot. */
    function restoreCollapseState(snapshot) {
        snapshot.forEach(({ row, open }) => {
            const c = row._jsonCollapsible;
            if (!c) return;
            if (open && c.childContainer._lazyData) _renderLazy(c.childContainer);
            c.childContainer.style.display = open ? '' : 'none';
            c.closingRow.style.display = open ? '' : 'none';
            c.summary.style.display = open ? 'none' : 'inline';
            c.toggle.classList.toggle('open', open);
        });
    }

    function highlightText(span, regex, matchStorage) {
        const text = span.textContent;
        regex.lastIndex = 0;
        const positions = [];
        let m;
        while ((m = regex.exec(text)) !== null) {
            if (m[0].length === 0) { regex.lastIndex++; continue; }
            positions.push({ start: m.index, len: m[0].length });
        }
        if (!positions.length) return;

        const frag = document.createDocumentFragment();
        let last = 0;
        positions.forEach(({ start, len }) => {
            if (start > last) {
                frag.appendChild(document.createTextNode(text.slice(last, start)));
            }
            const mark = document.createElement('mark');
            mark.className = 'search-highlight';
            mark.textContent = text.slice(start, start + len);
            frag.appendChild(mark);
            last = start + len;
        });

        if (last < text.length) {
            frag.appendChild(document.createTextNode(text.slice(last)));
        }

        span.replaceChildren(frag);
        if (matchStorage) {
            span.querySelectorAll('.search-highlight').forEach(m => matchStorage.push(m));
        }
    }

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
                        if (collapsed && c.childContainer._lazyData) _renderLazy(c.childContainer);
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

    // -- Path tooltip ---------------------------------------------------------

    function setupPathTooltip(root) {
        let tooltip = document.getElementById('jp-path-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'jp-path-tooltip';
            document.body.appendChild(tooltip);
        }

        let hoverTimer = null;
        let currentAnchor = null;

        function show(text, x, y, isPath = false) {
            tooltip.classList.toggle('jp-tooltip-path', isPath);
            const parts = text.split('  ');
            tooltip.innerHTML = '';
            const label = document.createElement('span');
            label.textContent = parts[0];
            tooltip.appendChild(label);
            if (parts[1]) {
                const kbd = document.createElement('span');
                kbd.className = 'jp-tooltip-shortcut';
                kbd.textContent = parts[1];
                tooltip.appendChild(kbd);
            }
            tooltip.classList.add('visible');
            position(x, y);
        }

        function hide() {
            clearTimeout(hoverTimer);
            hoverTimer = null;
            currentAnchor = null;
            tooltip.classList.remove('visible');
        }

        function position(x, y) {
            const gap = 12;
            tooltip.style.left = '0px';
            tooltip.style.top = '0px';
            const rect = tooltip.getBoundingClientRect();
            const left = Math.min(x + gap, window.innerWidth - rect.width - 8);
            const top = y - rect.height - gap;
            tooltip.style.left = `${left}px`;
            tooltip.style.top = `${top < 8 ? y + gap : top}px`;
        }

        root.addEventListener('mouseover', (e) => {
            const btn = e.target.closest('[data-tooltip]');
            if (btn) {
                if (btn === currentAnchor) return;
                clearTimeout(hoverTimer);
                currentAnchor = btn;
                hoverTimer = setTimeout(() => show(btn.dataset.tooltip, e.clientX, e.clientY), 500);
                return;
            }
            if (!e.target.classList.contains('json-key')) { hide(); return; }
            const row = e.target.closest('.json-row');
            if (!row || !row._jpData || !row._jpData.path) { hide(); return; }
            if (row === currentAnchor) return;
            clearTimeout(hoverTimer);
            currentAnchor = row;
            hoverTimer = setTimeout(() => show(row._jpData.path, e.clientX, e.clientY, true), 500);
        });

        root.addEventListener('mouseleave', hide);
    }

    // -- Path preview bar -----------------------------------------------------

    /**
     * Parses a JSONPath string (e.g. $.users[0]["odd key"]) into an array of
     * human-readable segment labels (e.g. ['$', 'users', '0', 'odd key']).
     */
    function pathToBreadcrumbs(path) {
        const segs = [];
        let i = 0;
        while (i < path.length) {
            if (path[i] === '$') {
                segs.push('$');
                i++;
            } else if (path[i] === '.') {
                i++;
                let name = '';
                while (i < path.length && path[i] !== '.' && path[i] !== '[') name += path[i++];
                if (name) segs.push(name);
            } else if (path[i] === '[') {
                i++;
                if (path[i] === '"') {
                    // bracket-quoted key: ["key"]
                    i++;
                    let name = '';
                    while (i < path.length) {
                        if (path[i] === '\\' && i + 1 < path.length) { name += path[i + 1]; i += 2; }
                        else if (path[i] === '"') { i++; break; }
                        else name += path[i++];
                    }
                    if (path[i] === ']') i++;
                    segs.push(name);
                } else {
                    // numeric index: [0]
                    let idx = '';
                    while (i < path.length && path[i] !== ']') idx += path[i++];
                    if (path[i] === ']') i++;
                    segs.push(idx);
                }
            } else {
                i++;
            }
        }
        return segs;
    }

    /**
     * Creates (or reuses) a breadcrumb bar that shows the JSON path of the
     * hovered `.json-row`.  Pass an existing `barEl` (e.g. a static element
     * in the sidepanel HTML) to keep it permanently mounted; omit it and the
     * bar is created and inserted immediately before `scrollEl` in its parent.
     */
    function setupPathPreview(scrollEl, barEl) {
        const bar = barEl || (() => {
            const b = createEl('div', 'jp-path-preview');
            scrollEl.prepend(b);
            return b;
        })();

        let currentPath = null;

        function renderBreadcrumbs(path) {
            if (path === currentPath) return;
            currentPath = path;
            const segs = pathToBreadcrumbs(path);
            bar.replaceChildren();
            segs.forEach((seg, i) => {
                if (i > 0) {
                    const sep = createEl('span', 'jp-bc-sep');
                    sep.textContent = '\u203A'; // ›
                    bar.appendChild(sep);
                }
                const crumb = createEl('span', i === segs.length - 1 ? 'jp-bc-crumb jp-bc-active' : 'jp-bc-crumb');
                crumb.textContent = seg;
                bar.appendChild(crumb);
            });
            bar.classList.add('has-path');
        }

        function clearBreadcrumbs() {
            if (currentPath === null) return;
            currentPath = null;
            bar.classList.remove('has-path');
            bar.replaceChildren();
        }

        scrollEl.addEventListener('mouseover', (e) => {
            const row = e.target.closest('.json-row');
            if (!row || !row._jpData || !row._jpData.path) { clearBreadcrumbs(); return; }
            renderBreadcrumbs(row._jpData.path);
        });

        scrollEl.addEventListener('mouseleave', clearBreadcrumbs);
    }

    // -- Type helpers ---------------------------------------------------------

    function getTypeName(val) {
        if (val === null) return 'Null';
        if (Array.isArray(val)) return 'Array';
        const t = typeof val;
        return t.charAt(0).toUpperCase() + t.slice(1);
    }

    function getRootTypeBadge(val) {
        if (val === null) return 'null';
        if (Array.isArray(val)) return '[]';
        if (typeof val === 'object') return '{}';
        return typeof val;
    }

    // -- Label extraction -----------------------------------------------------

    function isSchemaOrgContext(contextVal) {
        if (typeof contextVal === 'string') {
            return /^(https?:\/\/)?(www\.)?schema\.org\/?$/i.test(contextVal.trim());
        }
        if (Array.isArray(contextVal)) {
            return contextVal.some(isSchemaOrgContext);
        }
        if (contextVal && typeof contextVal === 'object') {
            return isSchemaOrgContext(contextVal['@vocab']);
        }
        return false;
    }

    function isSchemaJson(parsed) {
        return !!(parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            && isSchemaOrgContext(parsed['@context']));
    }

    /** Returns a readable tab label from a JSON object, or fallback. */
    function labelFromObj(parsed, fallback) {
        if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
            if (isSchemaJson(parsed)) {
                const typeVal = parsed['@type'];
                if (typeof typeVal === 'string' && typeVal.trim()) return typeVal.trim();
                if (Array.isArray(typeVal)) {
                    const firstType = typeVal.find(v => typeof v === 'string' && v.trim());
                    if (firstType) return firstType.trim();
                }
            }
            for (const key of ['name', 'title']) {
                const val = parsed[key];
                if (typeof val === 'string' && val.trim()) return val.trim();
            }
        }
        return fallback;
    }

    // -- Storage helper -------------------------------------------------------

    /** Loads all extension settings from chrome.storage.sync and calls back with { theme, settings, customTheme }. */
    function loadSettings(callback) {
        chrome.storage.sync.get(['jsonParseTheme', 'jsonParseSettings', 'jsonParseCustomTheme', 'jsonParseMode'], (data) => {
            callback({
                theme: data.jsonParseTheme || 'material',
                settings: data.jsonParseSettings || {},
                customTheme: data.jsonParseCustomTheme || null,
                mode: data.jsonParseMode || 'dark',
            });
        });
    }

    return {
        SETTINGS,
        createEl, createSpan,
        applyThemeVars,
        buildJsonTree,
        setupContextMenu, setupPathTooltip, setupPathPreview,
        expandAncestors, highlightText, buildSearchRegex,
        saveCollapseState, collapseAll, restoreCollapseState,
        getTypeName, getRootTypeBadge, labelFromObj, isSchemaJson,
        loadSettings, renderAllDescendants,
    };
})();
