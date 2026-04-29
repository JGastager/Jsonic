// --- CONFIGURATION ---
// Options: 'error', 'warning', 'off'
let ISSUE_CONFIG = {
    noH1: 'error',    // Missing H1
    multipleH1: 'warning',  // More than one H1
    hierarchy: 'warning',  // e.g. H2 followed by H4
    emptyHeading: 'error',    // e.g. <h2></h2>
    h1NotFirst: 'warning',  // H1 should usually be the top heading
    duplicateText: 'warning',  // Multiple headings with exact same text
    longHeading: 'warning'   // Headings > 120 chars
};

// Load settings from Chrome storage
chrome.storage.sync.get('issueConfig', (data) => {
    if (data.issueConfig) {
        ISSUE_CONFIG = { ...ISSUE_CONFIG, ...data.issueConfig };
    }
});

// --- RULES ---
const ISSUE_RULES = {
    // 1. Check if H1 is missing
    noH1: (headings) => {
        const hasH1 = headings.some(h => h.tag === 'H1');
        return !hasH1 ? ["No <h1> tag found on this page."] : [];
    },

    // 2. Check for multiple H1s
    multipleH1: (headings) => {
        const count = headings.filter(h => h.tag === 'H1').length;
        return count > 1 ? [`Multiple <h1> tags found (${count} detected).`] : [];
    },

    // 3. Check hierarchy (e.g. H2 -> H4)
    hierarchy: (headings) => {
        const messages = [];
        let lastLevel = null;
        headings.forEach((h, i) => {
            const level = parseInt(h.tag[1], 10);
            if (lastLevel !== null && level > lastLevel + 1) {
                const prevTag = headings[i - 1].tag;
                messages.push(`Skipped hierarchy level: <${h.tag}> follows <${prevTag}>.`);
            }
            lastLevel = level;
        });
        return messages;
    },

    // 4. Check for empty headings (Accessibility Issue)
    emptyHeading: (headings) => {
        const messages = [];
        headings.forEach((h, index) => {
            if (!h.text || h.text.trim().length === 0) {
                messages.push(`Empty <${h.tag}> found (Heading #${index + 1}).`);
            }
        });
        return messages;
    },

    // 5. Check if H1 is the very first heading
    h1NotFirst: (headings) => {
        if (headings.length === 0) return [];
        // Only run this check if an H1 actually exists
        const hasH1 = headings.some(h => h.tag === 'H1');
        if (hasH1 && headings[0].tag !== 'H1') {
            return [`The <h1> tag is not the first heading on the page (found <${headings[0].tag}> first).`];
        }
        return [];
    },

    // 6. Check for duplicate heading text (Confusing for navigation)
    duplicateText: (headings) => {
        const seen = {}; // { "Introduction": [index1, index2] }
        headings.forEach((h, i) => {
            const text = h.text.toLowerCase();
            if (!text) return; // Skip empty ones
            if (!seen[text]) seen[text] = [];
            seen[text].push(i);
        });

        const messages = [];
        Object.entries(seen).forEach(([text, indices]) => {
            if (indices.length > 1) {
                messages.push(`Duplicate heading text "${text}" found ${indices.length} times.`);
            }
        });
        return messages;
    },

    // 7. Check for overly long headings
    longHeading: (headings) => {
        const messages = [];
        const MAX_CHARS = 120;
        headings.forEach((h) => {
            if (h.text.length > MAX_CHARS) {
                messages.push(`Very long <${h.tag}> detected (${h.text.length} chars). Consider shortening.`);
            }
        });
        return messages;
    }
};

export function checkWarnings(headings) {
    // 1. Reset UI
    const container = document.getElementById('issues');
    if (!container) return;

    const warningList = container.querySelector('.warnings');
    const errorList = container.querySelector('.errors');
    const successMsg = container.querySelector('.success');

    // Clear old content
    if (warningList) warningList.innerHTML = '';
    if (errorList) errorList.innerHTML = '';
    if (successMsg) successMsg.innerHTML = '';

    // Reset Nav Badges
    const issuesNav = document.querySelector('nav .issues');
    if (issuesNav) {
        issuesNav.querySelectorAll('span').forEach(s => s.remove());
    }

    if (!headings) return;

    let stats = { warning: 0, error: 0 };

    // 2. Run Checks
    Object.keys(ISSUE_CONFIG).forEach(ruleKey => {
        const severity = ISSUE_CONFIG[ruleKey];
        // Skip if rule not found or turned off
        if (severity === 'off' || !ISSUE_RULES[ruleKey]) return;

        const messages = ISSUE_RULES[ruleKey](headings);

        messages.forEach(msg => {
            addIssueToDom(severity, msg);
            stats[severity]++;
        });
    });

    // 3. Update Badges & Success State
    if (stats.warning > 0) updateBadge('warning', stats.warning);
    if (stats.error > 0) updateBadge('error', stats.error);

    if (stats.warning === 0 && stats.error === 0 && successMsg) {
        addIssueToDom('success', "No issues found on this page.");
    }
}

function addIssueToDom(type, message) {
    let list;
    if (type === 'warning') list = document.querySelector('#issues .warnings');
    else if (type === 'error') list = document.querySelector('#issues .errors');
    else if (type === 'success') list = document.querySelector('#issues .success');

    if (list) {
        const li = document.createElement('li');
        li.textContent = message;
        list.appendChild(li);
    }
}

function updateBadge(type, count) {
    const issuesNav = document.querySelector('nav .issues');
    if (!issuesNav) return;

    const span = document.createElement('span');
    span.className = type === 'error' ? 'error-hint' : 'warning-hint';
    span.textContent = count;
    issuesNav.appendChild(span);
}