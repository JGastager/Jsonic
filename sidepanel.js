// -- Helpers ----------------------------------------------------------------

// -- Themes (loaded from themes.json) -------------------------------------

let THEMES = {};

function applyThemeColors(t) {
    JsonTreeRenderer.applyThemeVars(document.documentElement, t, SETTINGS);
}

function applyMode(mode) {
    currentMode = mode;
    document.documentElement.dataset.jpMode = mode;
}

function applyTheme(themeKey) {
    currentTheme = themeKey;
    const modeThemes = THEMES[currentMode] || THEMES.dark;
    if (themeKey === 'custom') {
        chrome.storage.sync.get('jsonParseCustomTheme', (data) => {
            applyThemeColors(data.jsonParseCustomTheme || modeThemes.material);
        });
        return;
    }
    applyThemeColors(modeThemes[themeKey] || modeThemes.material);
}

const { buildJsonTree, createEl, createSpan, setupContextMenu, setupPathTooltip, setupPathPreview,
    getTypeName, getRootTypeBadge, loadSettings, isSchemaJson,
    highlightText, expandAncestors, renderAllDescendants, buildSearchRegex,
    saveCollapseState, collapseAll, restoreCollapseState } = JsonTreeRenderer;
const SETTINGS = JsonTreeRenderer.SETTINGS;

let currentTheme = 'material';
let currentMode = 'dark';
let pasteReady = false;
let _refreshSeq = 0;
let _reRunSearch = null;
let _syncPanelToolbar = null;

function setPasteReady(val) {
    pasteReady = val;
}

function syncPathBar() {
    const pathBarEl = document.getElementById('jp-path-preview');
    if (!pathBarEl) return;
    const panelsEl = document.getElementById('json-panels');
    if (panelsEl.querySelector('.empty-state')) {
        pathBarEl.style.display = 'none';
        return;
    }
    const activePanel = Array.from(panelsEl.querySelectorAll('.json-panel'))
        .find(p => p.style.display !== 'none');
    if (!activePanel || activePanel._showingRaw || activePanel.querySelector('.custom-json-input')) {
        pathBarEl.style.display = 'none';
        return;
    }
    pathBarEl.style.display = '';
}

function applySettings() {
    document.querySelectorAll('.json-tree').forEach(tree => {
        tree.classList.toggle('wrap-strings', SETTINGS.wrapStrings);
    });
}



function renderJsonBlocks(jsonBlocks) {
    const tabsEl = document.getElementById('json-tabs');
    const panelsEl = document.getElementById('json-panels');
    const pathBar = document.getElementById('jp-path-preview');
    const addLi = document.getElementById('add-json-li');

    tabsEl.innerHTML = '';
    panelsEl.innerHTML = '';
    pendingTab = null;

    const toolbarEl = document.getElementById('panel-toolbar');
    _syncPanelToolbar = null;

    if (!jsonBlocks || jsonBlocks.length === 0) {
        toolbarEl.style.display = 'none';
        const empty = createEl('div', 'empty-state');
        const msg = createEl('p');
        msg.textContent = 'No JSON found on this page.';
        const hint = createEl('p', 'empty-hint');
        const tags = ['<pre>', '<code>', '<script>'];
        hint.appendChild(document.createTextNode('Looks for JSON in '));
        tags.forEach((tag, i) => {
            const c = document.createElement('code');
            c.textContent = tag;
            hint.appendChild(c);
            if (i < tags.length - 2) hint.appendChild(document.createTextNode(', '));
            else if (i === tags.length - 2) hint.appendChild(document.createTextNode(', and '));
        });
        hint.appendChild(document.createTextNode(' tags.'));
        empty.appendChild(msg);
        empty.appendChild(hint);
        panelsEl.appendChild(empty);
        if (pathBar) panelsEl.prepend(pathBar);
        tabsEl.appendChild(addLi);
        syncPathBar();
        return;
    }
    setPasteReady(false);

    const baseNames = jsonBlocks.map(({ data, label }) => label || getTypeName(data));
    const nameCounts = new Map();
    baseNames.forEach((name) => {
        nameCounts.set(name, (nameCounts.get(name) || 0) + 1);
    });
    const seenNameCounts = new Map();

    jsonBlocks.forEach(({ data, label }, i) => {
        // -- Tab ----------------------------------------------------------
        const tab = document.createElement('li');
        const baseName = baseNames[i] || label || getTypeName(data);
        const countForName = nameCounts.get(baseName) || 0;
        const seenForName = (seenNameCounts.get(baseName) || 0) + 1;
        seenNameCounts.set(baseName, seenForName);
        const tabName = countForName > 1 ? `${baseName} ${seenForName}` : baseName;
        const display = tabName.length > 22 ? tabName.slice(0, 22) + '\u2026' : tabName;
        tab.appendChild(document.createTextNode(display));
        const badge = createSpan('tab-badge', getRootTypeBadge(data));
        if (isSchemaJson(data)) badge.classList.add('tab-badge-schema');
        tab.appendChild(badge);
        if (i === 0) tab.classList.add('active');
        tabsEl.appendChild(tab);

        // -- Panel ---------------------------------------------------------
        const panel = createEl('section', 'json-panel');
        panel.style.display = i === 0 ? '' : 'none';

        // -- Tree & raw views ----------------------------------------------
        const tree = createEl('div', 'json-tree');
        buildJsonTree(tree, data, null, 0, true);

        const rawView = createEl('pre', 'panel-raw-json');
        rawView.textContent = JSON.stringify(data, null, 2);
        rawView.style.display = 'none';

        panel.appendChild(tree);
        panel.appendChild(rawView);
        panelsEl.appendChild(panel);

        // -- Tab click -----------------------------------------------------
        tab.addEventListener('click', () => {
            tabsEl.querySelectorAll('li').forEach(t => t.classList.remove('active'));
            panelsEl.querySelectorAll('.json-panel').forEach(p => { p.style.display = 'none'; });
            tab.classList.add('active');
            panel.style.display = '';
            if (_reRunSearch) _reRunSearch();
            if (_syncPanelToolbar) _syncPanelToolbar();
        });
    });
    if (pathBar) panelsEl.prepend(pathBar);
    tabsEl.appendChild(addLi);
    toolbarEl.style.display = '';

    // Reset listeners by replacing buttons with fresh clones
    const oldSearchBtn = document.getElementById('toolbar-search-btn');
    const oldRawBtn = document.getElementById('toolbar-raw-btn');
    const searchBtn = oldSearchBtn.cloneNode(true);
    const rawBtn = oldRawBtn.cloneNode(true);
    oldSearchBtn.replaceWith(searchBtn);
    oldRawBtn.replaceWith(rawBtn);
    const rawIcon = rawBtn.querySelector('.i-raw');

    function syncToolbar() {
        const activePanel = Array.from(panelsEl.querySelectorAll('.json-panel'))
            .find(p => p.style.display !== 'none');
        const isRaw = activePanel?._showingRaw || false;
        rawBtn.classList.toggle('active', isRaw);
        syncPathBar();
    }

    searchBtn.addEventListener('click', () => {
        if (window._openSearch) window._openSearch();
    });

    rawBtn.addEventListener('click', () => {
        const activePanel = Array.from(panelsEl.querySelectorAll('.json-panel'))
            .find(p => p.style.display !== 'none');
        if (!activePanel) return;
        const tree = activePanel.querySelector('.json-tree');
        const rawView = activePanel.querySelector('.panel-raw-json');
        const showingRaw = activePanel._showingRaw || false;
        activePanel._showingRaw = !showingRaw;
        if (tree) tree.style.display = showingRaw ? '' : 'none';
        if (rawView) rawView.style.display = showingRaw ? 'none' : '';
        if (!showingRaw && window._closeSearch) window._closeSearch();
        syncToolbar();
    });

    _syncPanelToolbar = syncToolbar;
    syncToolbar();
}

// -- Data extraction -------------------------------------------------------

function refresh() {
    const seq = ++_refreshSeq;
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        if (!tab) return;

        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                // Page already taken over by json-page.js — nothing to show in sidepanel.
                if (document.documentElement.dataset.jpJson) return [];

                const results = [];

                function tryParseJson(text) {
                    try { return JSON.parse(text); } catch { return undefined; }
                }

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

                function labelFromObj(parsed, fallback) {
                    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
                        if (isSchemaOrgContext(parsed['@context'])) {
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

                // 1. <pre> elements
                for (const pre of document.querySelectorAll('pre')) {
                    const text = (pre.textContent || '').trim();
                    if (!text) continue;
                    const parsed = tryParseJson(text);
                    if (parsed === undefined) continue;
                    const label = labelFromObj(parsed, (pre.title || '').trim());
                    results.push({ data: parsed, label });
                }

                // 2. <script type="application/json"> and <script type="application/ld+json">
                for (const script of document.querySelectorAll('script[type="application/json"], script[type="application/ld+json"]')) {
                    const text = (script.textContent || '').trim();
                    if (!text) continue;
                    const parsed = tryParseJson(text);
                    if (parsed === undefined) continue;
                    const isLdJson = script.type === 'application/ld+json';
                    const idLabel = (script.id || '').trim();
                    let label = idLabel || (isLdJson ? 'JSON-LD' : '');
                    label = labelFromObj(parsed, label);
                    results.push({ data: parsed, label });
                }

                // 3. <code> elements not inside a <pre> (standalone code blocks)
                for (const code of document.querySelectorAll('code')) {
                    if (code.closest('pre')) continue;
                    const text = (code.textContent || '').trim();
                    if (!text) continue;
                    const parsed = tryParseJson(text);
                    if (parsed === undefined) continue;
                    const label = labelFromObj(parsed, '');
                    results.push({ data: parsed, label });
                }

                return results;
            }
        }).then(([result]) => {
            if (seq !== _refreshSeq) return;
            renderJsonBlocks(result?.result ?? []);
            applySettings();
        }).catch(() => {
            if (seq !== _refreshSeq) return;
            renderJsonBlocks([]);
        });
    });
}

// -- Search -----------------------------------------------------------------

function setupSearch() {
    const wrap = document.getElementById('search-input-wrap');
    const input = document.getElementById('search-input');
    const countEl = document.getElementById('search-count');
    const prevBtn = document.getElementById('search-prev');
    const nextBtn = document.getElementById('search-next');
    const closeBtn = document.getElementById('search-close');
    const caseBtn = document.getElementById('search-opt-case');
    const wordBtn = document.getElementById('search-opt-word');
    const regexBtn = document.getElementById('search-opt-regex');

    const state = { matches: [], current: -1 };
    const opts = { matchCase: false, wholeWord: false, useRegex: false };
    let savedCollapseState = null;

    function clearHighlights() {
        input.classList.remove('search-error');
        document.querySelectorAll('.search-highlight').forEach(el => {
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
        const activePanel = Array.from(document.querySelectorAll('.json-panel')).find(p => p.style.display !== 'none');
        if (activePanel) {
            renderAllDescendants(activePanel);
            if (!savedCollapseState) {
                savedCollapseState = saveCollapseState(activePanel);
            }
            collapseAll(activePanel);
            activePanel.querySelectorAll('.json-key, .json-string, .json-number, .json-boolean, .json-null').forEach(span => {
                highlightText(span, regex, state.matches);
            });
        }
        state.matches.forEach(mark => expandAncestors(mark));
        updateCount();
        if (state.matches.length) navigateTo(0);
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
        const activePanel = Array.from(document.querySelectorAll('.json-panel')).find(p => p.style.display !== 'none');
        if (activePanel?._showingRaw) {
            const tree = activePanel.querySelector('.json-tree');
            const rawView = activePanel.querySelector('.panel-raw-json');
            activePanel._showingRaw = false;
            if (tree) tree.style.display = '';
            if (rawView) rawView.style.display = 'none';
            if (_syncPanelToolbar) _syncPanelToolbar();
        }
        const searchBtnEl = document.getElementById('toolbar-search-btn');
        if (searchBtnEl) searchBtnEl.style.display = 'none';
        wrap.style.display = 'flex';
        input.focus();
        input.select();
    }

    function closeSearch() {
        wrap.style.display = 'none';
        const searchBtnEl = document.getElementById('toolbar-search-btn');
        if (searchBtnEl) searchBtnEl.style.display = '';
        clearHighlights();
        if (savedCollapseState) {
            restoreCollapseState(savedCollapseState);
            savedCollapseState = null;
        }
        input.value = '';
        countEl.textContent = '';
    }

    function toggleOpt(btn, key) {
        opts[key] = !opts[key];
        btn.classList.toggle('active', opts[key]);
        runSearch(input.value);
    }

    _reRunSearch = () => runSearch(input.value);
    window._openSearch = openSearch;
    window._closeSearch = closeSearch;

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); openSearch(); }
        if ((e.ctrlKey || e.metaKey) && e.key === ',') { e.preventDefault(); window.open(chrome.runtime.getURL('options.html'), '_blank'); }
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
}

// -- Add-JSON via paste -----------------------------------------------------

let pendingTab = null;   // { tab, panel } awaiting a paste

function createPendingTab() {
    const tabsEl = document.getElementById('json-tabs');
    const panelsEl = document.getElementById('json-panels');

    const emptyState = panelsEl.querySelector('.empty-state');
    if (emptyState) emptyState.remove();

    const existingLabels = Array.from(tabsEl.querySelectorAll('li')).map(t => t.firstChild.textContent);
    let label = 'Custom';
    if (existingLabels.includes('Custom')) {
        let n = 2;
        while (existingLabels.includes('Custom ' + n)) n++;
        label = 'Custom ' + n;
    }

    const tab = document.createElement('li');
    tab.appendChild(document.createTextNode(label));
    tabsEl.insertBefore(tab, document.getElementById('add-json-li'));

    const panel = createEl('section', 'json-panel');
    const textarea = document.createElement('textarea');
    textarea.className = 'custom-json-input';
    textarea.spellcheck = false;
    const placeholder = createEl('div', 'custom-json-placeholder');
    placeholder.textContent = 'Paste or type JSON here…';
    textarea.addEventListener('input', () => {
        placeholder.style.display = textarea.value ? 'none' : '';
    });
    const errorMsg = createEl('div', 'custom-json-error');
    const footer = createEl('div', 'custom-json-footer');
    const parseBtn = createEl('button', 'custom-json-parse-btn');
    const parseBtnLabel = createEl('span');
    parseBtnLabel.textContent = 'Parse';
    parseBtn.appendChild(parseBtnLabel);
    parseBtn.appendChild(createEl('span', 'i-parse-arrow'));
    parseBtn.dataset.tooltip = 'Parse JSON  Ctrl+Enter';
    footer.appendChild(parseBtn);
    panel.appendChild(errorMsg);
    panel.appendChild(placeholder);
    panel.appendChild(textarea);
    panel.appendChild(footer);
    panelsEl.appendChild(panel);
    const pathBar = document.getElementById('jp-path-preview');
    if (pathBar) panelsEl.prepend(pathBar);

    tab.addEventListener('click', () => {
        tabsEl.querySelectorAll('li').forEach(t => t.classList.remove('active'));
        panelsEl.querySelectorAll('.json-panel').forEach(p => { p.style.display = 'none'; });
        tab.classList.add('active');
        panel.style.display = '';
        syncPathBar();
    });

    // Switch to the new pending tab
    tabsEl.querySelectorAll('li').forEach(t => t.classList.remove('active'));
    panelsEl.querySelectorAll('.json-panel').forEach(p => { p.style.display = 'none'; });
    tab.classList.add('active');
    panel.style.display = '';
    textarea.focus();
    syncPathBar();

    function setBadge(text, error = false, isSchema = false) {
        let badge = tab.querySelector('.tab-badge');
        if (!badge) {
            badge = createSpan('tab-badge', '');
            tab.appendChild(badge);
        }
        badge.textContent = text;
        badge.classList.toggle('tab-badge-error', error);
        badge.classList.toggle('tab-badge-schema', !error && isSchema);
    }

    function removeBadge() {
        const badge = tab.querySelector('.tab-badge');
        if (badge) badge.remove();
    }

    function setError(msg) {
        errorMsg.textContent = msg;
    }

    function clearError() {
        errorMsg.textContent = '';
    }

    function tryRender() {
        const raw = textarea.value.trim();
        if (!raw) return;
        let parsed;
        try { parsed = JSON.parse(raw); } catch { return; }

        panel.innerHTML = '';
        const tree = createEl('div', 'json-tree');
        if (SETTINGS.wrapStrings) tree.classList.add('wrap-strings');
        buildJsonTree(tree, parsed, null, 0, true);
        panel.appendChild(tree);

        setBadge(getRootTypeBadge(parsed), false, isSchemaJson(parsed));
        clearError();

        pendingTab = null;
        setPasteReady(false);
        syncPathBar();
    }

    parseBtn.addEventListener('click', () => {
        const raw = textarea.value.trim();
        if (!raw) return;
        let parsed;
        try { parsed = JSON.parse(raw); } catch (err) {
            setBadge('!', true, false);
            setError(err.message);
            return;
        }
        tryRender();
    });

    textarea.addEventListener('paste', () => setTimeout(tryRender, 0));
    textarea.addEventListener('blur', () => {
        const raw = textarea.value.trim();
        if (!raw) { removeBadge(); clearError(); return; }
        try { JSON.parse(raw); removeBadge(); clearError(); } catch (err) { setBadge('!', true); setError(err.message); }
    });
    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            const raw = textarea.value.trim();
            if (!raw) return;
            let parsed;
            try { parsed = JSON.parse(raw); } catch (err) {
                setBadge('!', true);
                setError(err.message);
                return;
            }
            tryRender();
        }
    });

    pendingTab = { tab, panel };
    setPasteReady(true);
}

function setupPasteJson() {
    document.getElementById('add-json-btn').addEventListener('click', () => {
        createPendingTab();
    });
}

// -- Boot -------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    setupContextMenu(document.body);
    setupPathTooltip(document.body);
    setupPathPreview(document.getElementById('json-panels'), document.getElementById('jp-path-preview'));
    setupSearch();
    setupPasteJson();

    // Scroll the tab list horizontally with the mouse wheel
    const tabsEl = document.getElementById('json-tabs');
    tabsEl.addEventListener('wheel', (e) => {
        if (e.deltaY === 0) return;
        e.preventDefault();
        tabsEl.scrollLeft += e.deltaY;
    }, { passive: false });

    fetch(chrome.runtime.getURL('themes.json'))
        .then(r => r.json())
        .then(themes => {
            THEMES = themes;
            loadSettings(({ theme, settings, mode }) => {
                Object.assign(SETTINGS, settings);
                applyMode(mode);
                applyTheme(theme);
                applySettings();
                refresh();
            });
        });
});

// Re-apply theme/settings if changed in options while panel is open
chrome.storage.onChanged.addListener((changes) => {
    if (changes.jsonParseMode) applyMode(changes.jsonParseMode.newValue || 'dark');
    if (changes.jsonParseTheme) applyTheme(changes.jsonParseTheme.newValue);
    if (changes.jsonParseCustomTheme && currentTheme === 'custom') applyTheme('custom');
    if (changes.jsonParseSettings) {
        Object.assign(SETTINGS, changes.jsonParseSettings.newValue);
        applyTheme(currentTheme);
        refresh();
    }
    if (changes.jsonParseMode && !changes.jsonParseSettings) {
        applyTheme(currentTheme);
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
