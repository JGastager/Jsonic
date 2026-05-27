// json-page.js — Renders raw JSON file tabs as the JSON Parse styled tree
(function () {
    'use strict';

    const { buildJsonTree, createEl, createSpan, setupContextMenu, setupPathTooltip, setupPathPreview,
        getTypeName, getRootTypeBadge, labelFromObj, loadSettings, renderAllDescendants, isSchemaJson, getSchemaType,
        highlightText, buildSearchRegex, saveCollapseState, collapseAll, restoreCollapseState } = JsonTreeRenderer;
    const SETTINGS = JsonTreeRenderer.SETTINGS;

    // ── Detection ────────────────────────────────────────────────────────────
    // Only act when the entire page is a JSON document.
    const isJsonContentType = document.contentType === 'application/json';
    const isJsonUrl = /\.json(\?|#|$)/i.test(location.href);
    const isSinglePrePage = (
        document.body &&
        document.body.children.length === 1 &&
        document.body.children[0].tagName === 'PRE'
    );
    if (!isJsonContentType && !isSinglePrePage && !isJsonUrl) return;

    const pre = document.querySelector('pre');
    const raw = ((pre ? pre.textContent : document.body?.innerText) || '').trim();
    if (!raw) return;

    let parsed;
    try { parsed = JSON.parse(raw); } catch { return; }

    // Mark the page so background.js icon-detection knows JSON is present
    // even after renderPage() replaces document.body.
    document.documentElement.dataset.jpJson = '1';

    // ── Derive a label ───────────────────────────────────────────────────────
    const explicitTitle = (document.title || '').trim() || (pre?.title || '').trim();
    const pageLabel = explicitTitle || labelFromObj(parsed, getTypeName(parsed));

    // ── Themes (loaded from themes.json) ────────────────────────────────────
    let THEMES = {};

    // ── Inject CSS ───────────────────────────────────────────────────────────
    function injectStyles(themeColors, settings, mode) {
        const t = themeColors;
        const bracketColor = settings.colorBrackets !== false ? t.bracket : t.punct;
        const braceColor = settings.colorBrackets !== false ? t.brace : t.punct;

        // Apply mode to html element so CSS variables switch
        document.documentElement.dataset.jpMode = mode || 'dark';

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

    // ── Search ───────────────────────────────────────────────────────────────
    function setupSearch(root, header, headerBtns, body, rawBtn) {
        // Search toggle button in header
        const searchBtn = createEl('div', 'btn');
        searchBtn.dataset.tooltip = 'Search  Ctrl+F';
        searchBtn.appendChild(createEl('span', 'i-search-btn'));
        headerBtns.prepend(searchBtn);

        const wrap = createEl('div');
        wrap.id = 'search-input-wrap';
        wrap.style.display = 'none';

        const icon = createEl('span', 'i-search');
        const input = document.createElement('input');
        input.id = 'search-input';
        input.type = 'text';
        input.placeholder = 'Search keys & values…';
        input.spellcheck = false;
        input.autocomplete = 'off';
        const countEl = createEl('span');
        countEl.id = 'search-count';
        const prevBtn = createEl('button', 'search-nav-btn');
        prevBtn.dataset.tooltip = 'Previous match  Shift+Enter';
        prevBtn.appendChild(createEl('span', 'i-search-prev'));
        const nextBtn = createEl('button', 'search-nav-btn');
        nextBtn.dataset.tooltip = 'Next match  Enter';
        nextBtn.appendChild(createEl('span', 'i-search-next'));
        const closeBtn = document.createElement('button');
        closeBtn.id = 'search-close';
        closeBtn.dataset.tooltip = 'Close search  Esc';
        closeBtn.appendChild(createEl('span', 'i-search-close'));

        const caseBtn = createEl('button', 'search-opt-btn');
        caseBtn.dataset.tooltip = 'Match Case  Alt+C';
        caseBtn.textContent = 'Aa';
        const wordBtn = createEl('button', 'search-opt-btn');
        wordBtn.dataset.tooltip = 'Match Whole Word  Alt+W';
        wordBtn.textContent = '\\b';
        const regexBtn = createEl('button', 'search-opt-btn');
        regexBtn.dataset.tooltip = 'Use Regex  Alt+R';
        regexBtn.textContent = '.*';
        const optSep = createEl('span', 'search-opt-sep');

        wrap.append(icon, input, caseBtn, wordBtn, regexBtn, optSep, countEl, prevBtn, nextBtn, closeBtn);

        // Place wrap inside the same button group as the search button
        headerBtns.insertBefore(wrap, searchBtn);

        const state = { matches: [], current: -1 };
        const opts = { matchCase: false, wholeWord: false, useRegex: false };
        let savedCollapseState = null;

        function clearHighlights() {
            input.classList.remove('search-error');
            root.querySelectorAll('.search-highlight').forEach(el => {
                const parent = el.parentNode;
                parent.replaceChild(document.createTextNode(el.textContent), el);
                parent.normalize();
            });
            state.matches = [];
            state.current = -1;
        }

        function runSearch(query) {
            clearHighlights();
            if (!query) {
                if (savedCollapseState) {
                    restoreCollapseState(savedCollapseState);
                    savedCollapseState = null;
                }
                updateCount();
                return;
            }
            const { regex, error } = buildSearchRegex(query, opts);
            input.classList.toggle('search-error', error);
            if (error) { updateCount(); return; }
            renderAllDescendants(root);
            if (!savedCollapseState) {
                savedCollapseState = saveCollapseState(root);
            }
            collapseAll(root);
            root.querySelectorAll('.json-key, .json-string, .json-number, .json-boolean, .json-null').forEach(span => {
                highlightText(span, regex, state.matches);
            });
            state.matches.forEach(mark => {
                let el = mark.parentElement;
                while (el && el !== root) {
                    if (el._parentRow && el._parentRow._jsonCollapsible) {
                        const c = el._parentRow._jsonCollapsible;
                        if (c.childContainer.style.display === 'none') {
                            c.childContainer.style.display = '';
                            c.closingRow.style.display = '';
                            c.summary.style.display = 'none';
                            c.toggle.classList.add('open');
                        }
                    }
                    el = el.parentElement;
                }
            });
            updateCount();
            if (state.matches.length) navigateTo(0);
        }

        function expandAncestors(el) {
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

        function navigateTo(index) {
            state.matches.forEach(m => m.classList.remove('active'));
            if (!state.matches.length) return;
            state.current = (index + state.matches.length) % state.matches.length;
            const active = state.matches[state.current];
            active.classList.add('active');
            expandAncestors(active);
            active.scrollIntoView({ block: 'center', behavior: 'smooth' });
            updateCount();
        }

        function updateCount() {
            const total = state.matches.length;
            if (!total) {
                countEl.textContent = input.value ? '0 / 0' : '';
                countEl.classList.toggle('no-match', !!input.value);
            } else {
                countEl.textContent = `${state.current + 1} / ${total}`;
                countEl.classList.remove('no-match');
            }
            prevBtn.disabled = total < 2;
            nextBtn.disabled = total < 2;
        }

        function openSearch() {
            if (rawBtn.classList.contains('active')) rawBtn.click();
            searchBtn.style.display = 'none';
            wrap.style.display = 'flex';
            root.classList.add('jp-search-open');
            input.focus();
            input.select();
        }

        function closeSearch() {
            wrap.style.display = 'none';
            searchBtn.style.display = '';
            root.classList.remove('jp-search-open');
            clearHighlights();
            if (savedCollapseState) {
                restoreCollapseState(savedCollapseState);
                savedCollapseState = null;
            }
            input.value = '';
            countEl.textContent = '';
        }

        searchBtn.addEventListener('click', openSearch);

        function toggleOpt(btn, key) {
            opts[key] = !opts[key];
            btn.classList.toggle('active', opts[key]);
            runSearch(input.value);
        }

        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); openSearch(); }
            if ((e.ctrlKey || e.metaKey) && e.key === '\\') { e.preventDefault(); rawBtn.click(); }
            if ((e.ctrlKey || e.metaKey) && e.key === ',') { e.preventDefault(); settingsBtn.click(); }
            if (e.key === 'Escape' && wrap.style.display !== 'none') closeSearch();
            if (e.altKey && wrap.style.display !== 'none') {
                if (e.key === 'c') { e.preventDefault(); toggleOpt(caseBtn, 'matchCase'); }
                if (e.key === 'w') { e.preventDefault(); toggleOpt(wordBtn, 'wholeWord'); }
                if (e.key === 'r') { e.preventDefault(); toggleOpt(regexBtn, 'useRegex'); }
            }
        }, true);

        input.addEventListener('input', () => runSearch(input.value));
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.shiftKey ? navigateTo(state.current - 1) : navigateTo(state.current + 1);
            }
        });

        prevBtn.addEventListener('click', () => navigateTo(state.current - 1));
        nextBtn.addEventListener('click', () => navigateTo(state.current + 1));
        closeBtn.addEventListener('click', closeSearch);
        caseBtn.addEventListener('click', () => toggleOpt(caseBtn, 'matchCase'));
        wordBtn.addEventListener('click', () => toggleOpt(wordBtn, 'wholeWord'));
        regexBtn.addEventListener('click', () => toggleOpt(regexBtn, 'useRegex'));
        return closeSearch;
    }

    // ── Page takeover ────────────────────────────────────────────────────────
    function renderPage(themeKey, settings, customColors, mode) {
        const m = mode || 'dark';
        const modeThemes = THEMES[m] || THEMES.dark;
        const t = themeKey === 'custom'
            ? (customColors || modeThemes.material)
            : (modeThemes[themeKey] || modeThemes.material);
        Object.assign(SETTINGS, settings);
        injectStyles(t, settings, m);

        // Build root container
        const root = createEl('div');
        root.id = 'jp-page-root';
        root.dataset.jpMode = m;

        // Header
        const header = createEl('div');
        header.id = 'jp-page-header';

        const titleWrap = createEl('div');
        titleWrap.id = 'jp-page-title-wrap';

        const titleEl = createEl('span');
        titleEl.id = 'jp-page-title';
        titleEl.textContent = pageLabel;

        const badge = createEl('span', 'tab-badge');
        badge.id = 'jp-page-badge';
        badge.textContent = isSchemaJson(parsed) ? 'Schema' : getRootTypeBadge(parsed);
        if (isSchemaJson(parsed)) badge.classList.add('tab-badge-schema');

        titleWrap.appendChild(titleEl);
        titleWrap.appendChild(badge);

        const settingsBtn = createEl('div');
        settingsBtn.className = 'btn';
        settingsBtn.dataset.tooltip = 'Open settings  Ctrl+,';
        settingsBtn.appendChild(createEl('span', 'i-gear'));
        settingsBtn.addEventListener('click', () => chrome.runtime.sendMessage({ action: 'openOptions' }));

        let _closeSearch = null;
        const rawBtn = createEl('div');
        rawBtn.className = 'btn';
        rawBtn.dataset.tooltip = 'View raw JSON  Ctrl+\\';
        rawBtn.appendChild(createEl('span', 'i-raw'));
        rawBtn.addEventListener('click', () => {
            if (rawBtn.classList.contains('active')) {
                rawBtn.classList.remove('active');
                rawBtn.dataset.tooltip = 'View raw JSON  Ctrl+\\';
                body.innerHTML = '';
                const newTree = createEl('div', 'json-tree');
                if (SETTINGS.wrapStrings) newTree.classList.add('wrap-strings');
                buildJsonTree(newTree, parsed, null, 0, true);
                body.appendChild(newTree);
            } else {
                rawBtn.classList.add('active');
                rawBtn.dataset.tooltip = 'View tree  Ctrl+\\';
                body.innerHTML = '';
                const pre = createEl('pre', 'jp-raw-json');
                pre.textContent = JSON.stringify(parsed, null, 2);
                body.appendChild(pre);
                if (_closeSearch) _closeSearch();
            }
        });

        header.appendChild(titleWrap);

        const headerBtns = createEl('div', 'jp-header-btns');
        headerBtns.appendChild(rawBtn);
        headerBtns.appendChild(settingsBtn);
        header.appendChild(headerBtns);

        root.appendChild(header);

        // Scrollable body
        const body = createEl('div');
        body.id = 'jp-page-body';

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
        setupContextMenu(root);
        setupPathTooltip(root);
        setupPathPreview(body);
        _closeSearch = setupSearch(root, header, headerBtns, body, rawBtn);
    }

    // ── Load settings then render ────────────────────────────────────────────
    fetch(chrome.runtime.getURL('themes.json'))
        .then(r => r.json())
        .then(themes => {
            THEMES = themes;
            loadSettings(({ theme, settings, customTheme, mode }) => renderPage(theme, settings, customTheme, mode));
        });

    // Re-render if settings change while the tab is open
    chrome.storage.onChanged.addListener((changes) => {
        if (changes.jsonParseTheme || changes.jsonParseSettings || changes.jsonParseCustomTheme || changes.jsonParseMode) {
            loadSettings(({ theme, settings, customTheme, mode }) => renderPage(theme, settings, customTheme, mode));
        }
    });

})();
