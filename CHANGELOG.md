# Changelog

## [1.1.2]

### What's New

- **🌗 Light mode** — A new appearance toggle in settings lets you switch between dark and light mode. Includes 10 curated light themes sourced from real editor palettes (Material Lighter, VS Code Light+, IntelliJ Light, One Light, Gruvbox Light, Catppuccin Latte, Tokyo Night Light, GitHub Light, Solarized Light, Quiet Light). On first install, the extension detects the system color scheme and defaults accordingly.
- **🏷️ Schema.org detection** — JSON-LD blocks with a `schema.org` `@context` are automatically recognized. Schema tabs display the `@type` as the tab name and a red "Schema" badge. Supports both single objects and arrays of schema objects.
- **🔽 Tab filter** — A filter button in the tab bar lets you filter visible tabs by type: All, Schema.org, JSON-LD, Arrays, Objects, or Non-Schema. An active filter is indicated by a blue dot on the button.
- **🍞 Path breadcrumb bar** — A sticky breadcrumb bar now appears at the top of the tree on hover, showing the full JSON path to the currently hovered row. Available in both the side panel and the full-page JSON view.
- **📋 Inline copy buttons** — Each JSON row reveals copy-value and copy-path icon buttons on hover, giving quick one-click access without opening the context menu.
- **🔍 Advanced search options** — The search bar now includes match-case (`Alt+C`), whole-word (`Alt+W`), and regex (`Alt+R`) toggles. Invalid regex patterns are indicated with a red input highlight.
- **📄 Raw JSON toggle in side panel** — A toolbar with search and raw/tree toggle buttons is now shown above the active panel in the side panel, mirroring the controls available on the full JSON page.
- **🗂️ Redesigned tab bar** — Tabs now use a browser-style appearance with rounded outer corners and a scoop cutout, and the active tab blends seamlessly into the panel background.

### Improvements

- **🔍 Search preserves collapse state** — Search now saves the tree's collapse state before the first query, collapses all nodes, and expands only ancestors of matches. Closing or clearing the search restores the original state.
- **🎨 Theme dropdown scoped to mode** — The theme selector in settings now only shows themes available for the current appearance mode, with proper display names (e.g. "Catppuccin Latte", "One Light").
- **🔍 Search scoped to active panel** — Search now only highlights matches in the currently visible panel, and expands all collapsed nodes before scanning so no results are missed.
- **✨ Row hover highlight** — Background highlight on hover now applies to all JSON rows, not just collapsible ones.

## [1.1.1]

### What's New

- **🗂️ `.json` URL support** — Pages served from a `.json` URL are now recognized and rendered as an interactive tree, in addition to pages with `application/json` content type.
- **🖱️ Mouse-wheel tab scrolling** — The tab bar can now be scrolled horizontally with the mouse wheel.

### Bug Fixes

- **Toolbar icon not updating reliably** — `dataset.jpHasJson` was set once on initial load but never cleared on SPA navigation. The page is now re-scanned and the attribute reset before each icon update, so the icon correctly reflects the current page state after client-side navigation.
- **JSON tabs not removed when JSON disappears** — The mutation observer skipped `childList` mutations where the target was a `<pre>`/`<code>`/`<script>` element itself (e.g. when a SPA replaced the element's content directly). The observer now checks `m.target` in addition to `m.addedNodes`/`m.removedNodes`, so content changes are caught and the side panel refreshes correctly.
- **Icon and panel stale after back/forward navigation** — Pages restored from the browser's Back-Forward Cache (bfcache) do not fire `tabs.onUpdated`. A `pageshow` listener now triggers a rescan for bfcache restores.
- **Stale panel render on rapid navigation** — Concurrent `refresh()` calls could race, with a slower earlier call overwriting a correct newer result. A sequence counter now discards out-of-order responses.

## [1.1.0]

### What's New

**✒️ Custom JSON input**
A new `+` tab lets you paste or type any JSON directly in the side panel. The tree renders automatically on paste, or press `Ctrl+Enter` / the Parse button to render manually.

**🎨 Customizable theme**
A color-picker UI lets you tune every token color — keys, strings, numbers, booleans, nulls, brackets, braces, and punctuation — and save it as your own theme.

---

## [1.0.0] — Initial release

- Side panel UI with interactive, collapsible JSON tree.
- Raw JSON page takeover with tree and pretty-print toggle (`Ctrl+\`).
- 12 built-in syntax themes.
- Full-text search (`Ctrl+F`) with inline highlights and match navigation.
- Context menu to copy key, value, or dot-notation path; hover tooltip for paths.
- Dynamic toolbar icon that reflects JSON detection state and adapts to OS theme.
- Options page with display settings: quote keys, count-only, wrap strings, color brackets, show commas, first-level-only collapse.
- SPA support via DOM mutation observer and History API listener.
