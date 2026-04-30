// JSON Parse SPA support: detect <pre> DOM changes and client-side navigation

let _debounceTimer = null;

function notifyRefresh() {
  clearTimeout(_debounceTimer);
  _debounceTimer = setTimeout(() => {
    chrome.runtime.sendMessage({ action: 'refreshJson' }).catch(() => { });
  }, 400);
}

// 1. Watch for <pre> elements being added/removed or their text content changing
const observer = new MutationObserver((mutations) => {
  for (const m of mutations) {
    if (m.type === 'childList') {
      for (const node of [...m.addedNodes, ...m.removedNodes]) {
        if (node.nodeType !== 1) continue;
        if (node.tagName === 'PRE' || node.querySelector('pre')) {
          notifyRefresh();
          return;
        }
      }
    } else if (m.type === 'characterData') {
      if (m.target.parentElement?.closest('pre')) {
        notifyRefresh();
        return;
      }
    }
  }
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
  characterData: true,
});

// 2. SPA navigation via History API (pushState / replaceState)
function patchHistory(method) {
  const original = history[method];
  history[method] = function (...args) {
    const result = original.apply(this, args);
    notifyRefresh();
    return result;
  };
}
patchHistory('pushState');
patchHistory('replaceState');

// 3. Browser back / forward navigation
window.addEventListener('popstate', notifyRefresh);

