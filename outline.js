export function renderOutline(outline) {
    const list = document.querySelector('#outlining .tree');
    list.innerHTML = '';
    
    if (!outline || outline.length === 0) {
        list.innerHTML = '<li>No structure found.</li>';
        return;
    }

    let currentLevel = 1;
    let parents = [list];

    // Helper: flatten the outline tree into a linear list
    function flatten(nodes, level = 1, arr = []) {
        nodes.forEach(node => {
            const label = node.heading 
                ? `${node.heading.text} (${node.heading.tag} in <${node.tag.toLowerCase()}>)` 
                : node.text 
                    ? `${node.text} (${node.tag})` 
                    : `untitled`;

            const tagClass = node.tag.toLowerCase();
            const empty = !node.heading && !node.text;

            arr.push({ text: label, tagClass, level, empty });

            const children = [];
            if (node.type === 'section') {
                if (node.heading?.children?.length) children.push(...node.heading.children);
                if (node.children?.length) children.push(...node.children);
            } else if (node.type === 'heading' && node.children?.length) {
                children.push(...node.children);
            }

            if (children.length > 0) flatten(children, level + 1, arr);
        });
        return arr;
    }

    const flat = flatten(outline);

    flat.forEach((item) => {
        const level = item.level;

        while (level > currentLevel) {
            const ul = document.createElement('ul');
            parents[parents.length - 1].appendChild(ul);
            parents.push(ul);
            currentLevel++;
        }
        while (level < currentLevel) {
            parents.pop();
            currentLevel--;
        }

        const li = document.createElement('li');
        li.textContent = item.text;
        li.classList.add(item.tagClass);
        if (item.empty) li.classList.add('empty');
        
        parents[parents.length - 1].appendChild(li);
    });
}