# Headliner Extension - Permissions Justification

This document explains each permission requested by the Headliner extension and its purpose.

## Permissions Breakdown

### `activeTab`
**Why it's needed:** Allows the extension to access the currently active tab to analyze its heading structure.

**What it does:** Enables the side panel to identify and extract headings from the webpage you're currently viewing.

**Use case:** When you open the side panel, this permission lets us see which tab is active so we can analyze that specific page's headings.

---

### `scripting`
**Why it's needed:** Allows the extension to execute JavaScript code on web pages to extract headings and document structure.

**What it does:** Runs scripts on the webpage to find all `<h1>` through `<h6>` tags and analyze the page's HTML structure.

**Use case:** This is essential for the core functionality—analyzing the heading hierarchy and document outline of any webpage.

---

### `sidePanel`
**Why it's needed:** Enables the extension to display a dedicated side panel in Chrome where analysis results are shown.

**What it does:** Creates and manages the user interface panel on the side of your browser showing the headings, outline, and any issues found.

**Use case:** Provides a convenient, persistent view of the page analysis without opening a popup.

---

### `tabs`
**Why it's needed:** Allows the extension to query information about tabs and communicate with content scripts running on them.

**What it does:** Enables the extension to:
- Identify the active tab
- Send messages to tabs (e.g., "scroll to this heading")
- Receive updates when content changes

**Use case:** When you click a heading in the side panel, this permission allows us to scroll to that heading on the page.

---

### `storage`
**Why it's needed:** Allows the extension to save user preferences and settings.

**What it does:** Stores user options and configuration choices locally in your browser.

**Use case:** Remembers your preferences (if implemented) across browser sessions, such as which tab was last active in the side panel.

---

### `<all_urls>` (Host Permissions)
**Why it's needed:** Allows the extension to run on any website to analyze headings on any page you visit.

**What it does:** Grants permission to execute heading analysis scripts on all websites you browse.

**Use case:** Enables the extension to work on any webpage, from news sites to documentation to blogs—anywhere you need to analyze heading structure.

---

## Data Privacy

The Headliner extension:
- ✅ **Does NOT** collect or transmit your browsing data
- ✅ **Does NOT** store or log the headings from pages you visit
- ✅ **Does NOT** require internet connectivity to function
- ✅ Performs all analysis **locally in your browser** only

All analysis happens on your machine and in your browser—no data is sent to external servers.
