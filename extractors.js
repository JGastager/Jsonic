export function extractOrderedHeadlines() {
    const headings = Array.from(document.body.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    return headings.map(el => ({
        tag: el.tagName,
        text: el.textContent.trim()
    }));
}

export function extractOutline() {
    // All valid HTML5 sectioning elements
    const SECTIONING = new Set([
        'ARTICLE', 'ASIDE', 'NAV', 'SECTION', 'MAIN', 'FOOTER', 'ADDRESS'
    ]);
    const HEADING = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6']);

    const root = { type: 'section', tag: 'ROOT', heading: null, children: [], _stack: [] };
    let currentSection = root;

    function withSection(fn, section) {
        const prev = currentSection;
        currentSection = section;
        fn();
        currentSection = prev;
    }

    function addHeadingToSection(section, headingNode) {
        if (!section._stack) section._stack = [];
        const stack = section._stack;
        const level = headingNode.level;

        if (!section.heading) {
            section.heading = headingNode;
            stack.length = 1;
            stack[0] = headingNode;
            return;
        }

        while (stack.length && level <= stack[stack.length - 1].level) {
            stack.pop();
        }
        if (stack.length === 0) {
            section.children.push(headingNode);
            stack.push(headingNode);
        } else {
            stack[stack.length - 1].children.push(headingNode);
            stack.push(headingNode);
        }
    }

    function walk(node) {
        if (node.nodeType !== 1) return; // element only
        const tag = node.tagName;

        if (SECTIONING.has(tag)) {
            const section = { type: 'section', tag, heading: null, children: [], _stack: [] };
            currentSection.children.push(section);
            withSection(() => {
                for (let child of node.children) walk(child);
            }, section);
            return;
        }

        if (HEADING.has(tag)) {
            const headingNode = {
                type: 'heading',
                tag,
                text: node.textContent.trim(),
                level: parseInt(tag[1], 10),
                children: []
            };
            addHeadingToSection(currentSection, headingNode);
            return;
        }

        for (let child of node.children) walk(child);
    }

    walk(document.body);

    const strip = (n) => {
        delete n._stack;
        if (n.children) n.children.forEach(strip);
        if (n.heading) strip(n.heading);
        return n;
    };
    return strip(root).children;
}