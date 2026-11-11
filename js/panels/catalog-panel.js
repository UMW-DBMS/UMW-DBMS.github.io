/**
 * Data Catalog window (main page): cards instead of a table
 *
 * Purpose : The Data Catalog window used to be a table (ID, Database, Layer, Data provider, Download). This shows the same rows as cards you can
 *           search and filter: a search box, one button per database, a provider list, and a card per layer with its database, its provider and a
 *           Download button. It adds nothing of its own to the data: the cards are made from the rows of the table #csvTable, which
 *           js/panels/data-catalog.js fills as before (the table stays in the page, hidden). So the cards can never differ from the old table.
 *           The Download button of a card does what the Download link of the table row does.
 * Depends : #catalogPanel, #catalogView and the table #csvTable (columns: ID, Database, Layer, Data provider, Download) in index.html.
 *           openNewTab() (ui-panels.js) for the "Open the full catalog" button, when present. Styles: css/umw-enhancements.css.
 * Exposes : window.CatalogPanel { render, rows }
 */

const CatalogPanel = (function () {
    'use strict';

    const view = document.getElementById('catalogView');
    const table = document.getElementById('csvTable');
    if (!view || !table) return {};

    const ACCENTS = ['#2e7d32', '#1565c0', '#ef6c00', '#6a1b9a', '#00838f', '#c62828', '#9e9d24', '#4527a0'];
    const filters = { q: '', db: '', provider: '' };
    let data = [];

    const text = (node) => (node ? String(node.textContent).replace(/\s+/g, ' ').trim() : '');
    const same = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();

    function h(tag, attrs, kids) {
        const el = document.createElement(tag);
        Object.keys(attrs || {}).forEach((k) => {
            if (k === 'class') el.className = attrs[k];
            else if (k === 'text') el.textContent = attrs[k];
            else if (k.indexOf('on') === 0) el.addEventListener(k.slice(2), attrs[k]);
            else if (attrs[k] !== false && attrs[k] !== null && attrs[k] !== undefined) el.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
        });
        (kids || []).forEach((c) => { if (c) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
        return el;
    }

    /** The rows of the table as plain data: id, database, layer, provider and the control of the Download cell. */
    function readRows() {
        const body = table.tBodies && table.tBodies[0];
        if (!body) return [];
        return Array.from(body.rows).filter((tr) => tr.cells.length >= 3 && !tr.hidden).map((tr) => {
            const cells = tr.cells;
            return {
                id: text(cells[0]), database: text(cells[1]), layer: text(cells[2]), provider: text(cells[3]),
                control: cells[4] ? cells[4].querySelector('a[href], button, input[type="button"]') : null
            };
        }).filter((r) => r.layer || r.database);
    }

    function matches(row) {
        if (filters.db && !same(row.database, filters.db)) return false;
        if (filters.provider && !same(row.provider || '(not recorded)', filters.provider)) return false;
        if (filters.q) {
            const hay = (row.layer + ' ' + row.database + ' ' + row.provider + ' ' + row.id).toLowerCase();
            return filters.q.toLowerCase().split(/\s+/).every((word) => hay.indexOf(word) !== -1);
        }
        return true;
    }

    function unique(list) { return Array.from(new Set(list)); }

    function downloadButton(row) {
        const control = row.control;
        if (!control) return h('span', { class: 'cat-dl cat-dl--none', text: 'No file' });
        if (control.tagName === 'A' && control.getAttribute('href')) {
            const link = h('a', { class: 'cat-dl', href: control.getAttribute('href'), rel: 'noopener noreferrer', title: 'Download ' + row.layer }, [
                'Download'
            ]);
            if (control.hasAttribute('download')) link.setAttribute('download', control.getAttribute('download') || '');
            if (control.getAttribute('target')) link.setAttribute('target', control.getAttribute('target'));
            return link;
        }
        return h('button', { class: 'cat-dl', type: 'button', title: 'Download ' + row.layer, text: 'Download', onclick: () => control.click() });
    }

    function card(row, accent) {
        return h('article', { class: 'cat-card', style: '--cat-accent:' + accent }, [
            h('div', { class: 'cat-top' }, [h('span', { class: 'cat-db', text: row.database || 'Other' }), row.id ? h('span', { class: 'cat-id', text: '#' + row.id }) : null]),
            h('h4', { class: 'cat-name', text: row.layer || '(unnamed layer)' }),
            h('p', { class: 'cat-prov' + (row.provider ? '' : ' cat-prov--none'), text: row.provider || 'Provider not recorded' }),
            h('div', { class: 'cat-foot' }, [downloadButton(row)])
        ]);
    }

    function render() {
        data = readRows();
        view.textContent = '';
        if (!data.length) {
            view.appendChild(h('div', { class: 'cat-empty' }, [
                h('p', { class: 'cat-empty-title', text: 'No data layers to show yet' }),
                h('p', { text: 'Choose a District, a DSD and a Mini Watershed, then press Go. The data layers of that mini watershed appear here.' })
            ]));
            return;
        }
        const databases = unique(data.map((r) => r.database));
        const providers = unique(data.map((r) => r.provider || '(not recorded)')).sort((a, b) => a.localeCompare(b));
        if (filters.db && !databases.some((d) => same(d, filters.db))) filters.db = '';
        if (filters.provider && !providers.some((p) => same(p, filters.provider))) filters.provider = '';

        const search = h('input', { class: 'cat-search', type: 'search', placeholder: 'Search layers, databases or providers', 'aria-label': 'Search the data catalog', value: filters.q });
        search.addEventListener('input', () => { filters.q = search.value; renderList(); });
        const providerSelect = h('select', { class: 'cat-provider', 'aria-label': 'Filter by data provider' }, [h('option', { value: '', text: 'All data providers' })]);
        providers.forEach((p) => providerSelect.appendChild(h('option', { value: p, text: p })));
        providerSelect.value = filters.provider;
        providerSelect.addEventListener('change', () => { filters.provider = providerSelect.value; renderList(); renderChips(); });

        const tools = h('div', { class: 'cat-tools' }, [
            search, providerSelect,
            h('button', { class: 'cat-clear', type: 'button', text: 'Clear', title: 'Clear the search and the filters', onclick: () => { filters.q = ''; filters.db = ''; filters.provider = ''; render(); } }),
            typeof openNewTab === 'function' ? h('button', { class: 'cat-full', type: 'button', text: 'Open the full catalog', title: 'Open the Data Catalog page for this mini watershed', onclick: () => openNewTab() }) : null
        ]);
        const chips = h('div', { class: 'cat-chips', role: 'group', 'aria-label': 'Filter by database' });
        const summary = h('p', { class: 'cat-count', role: 'status' });
        const list = h('div', { class: 'cat-grid' });
        view.appendChild(tools); view.appendChild(chips); view.appendChild(summary); view.appendChild(list);

        function renderChips() {
            chips.textContent = '';
            const pool = data.filter((r) => !filters.provider || same(r.provider || '(not recorded)', filters.provider));
            const all = h('button', { class: 'cat-chip', type: 'button', 'aria-pressed': filters.db ? 'false' : 'true', text: 'All (' + pool.length + ')', onclick: () => { filters.db = ''; renderList(); renderChips(); } });
            chips.appendChild(all);
            databases.forEach((d, i) => {
                const n = pool.filter((r) => same(r.database, d)).length;
                const chip = h('button', { class: 'cat-chip', type: 'button', style: '--cat-accent:' + ACCENTS[i % ACCENTS.length], 'aria-pressed': same(filters.db, d) ? 'true' : 'false', text: d + ' (' + n + ')',
                    onclick: () => { filters.db = same(filters.db, d) ? '' : d; renderList(); renderChips(); } });
                if (!n) chip.disabled = true;
                chips.appendChild(chip);
            });
        }

        function renderList() {
            list.textContent = '';
            const shown = data.filter(matches);
            summary.textContent = shown.length === data.length
                ? data.length + ' data layers from ' + databases.length + ' database' + (databases.length === 1 ? '' : 's') + ' and ' + providers.filter((p) => p !== '(not recorded)').length + ' data provider' + (providers.filter((p) => p !== '(not recorded)').length === 1 ? '' : 's')
                : shown.length + ' of ' + data.length + ' data layers';
            if (!shown.length) { list.appendChild(h('p', { class: 'cat-none', text: 'No data layer matches your search. Try fewer words or press Clear.' })); return; }
            shown.forEach((r) => list.appendChild(card(r, ACCENTS[databases.indexOf(r.database) % ACCENTS.length])));
        }
        renderChips();
        renderList();
    }

    // The table is filled (and refilled) by data-catalog.js: draw the cards again after each change, once things have settled.
    let timer = null;
    new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(render, 120); }).observe(table, { childList: true, subtree: true, characterData: true });
    render();

    return { render: render, rows: () => data.slice() };
})();

window.CatalogPanel = CatalogPanel;
