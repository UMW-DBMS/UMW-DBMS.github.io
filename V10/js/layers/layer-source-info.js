/**
 * Data provider "i" button in the layer lists
 *
 * Purpose : Puts a small "i" at the end of every layer row of the Base Layers list (and of the Area Layers list). Pressing it opens a small
 *           pop-up with ONE thing: the name of the data provider of that layer, read from the metadata of the mini watershed
 *           (the registry Registry/DBMS_<id>.csv, the file the Data Catalog reads; the layer list file AllDataLayer_<id>.csv is the fallback).
 *           Press the "i" again, press Esc or click elsewhere to close it. Nothing else of the metadata is shown.
 *           This file changes no other script: it watches the lists and adds the buttons whenever a list is built.
 * Depends : The panels #basePanel and #areaLayersPanel (css/umw-enhancements.css styles the button and the pop-up),
 *           the MWS drop-down #selectMWSID (or AreaExplorer.firstMwsCode() when an area is shown).
 * Exposes : LayerSourceInfo { PANEL_IDS, refresh, close, providerFor }
 *
 * Matching: a layer is found by its name (capitals, spaces and punctuation ignored); when two rows share a name, the row of the same
 * category (the registry "Database" column) is used. A water-feature type (Anicut, Lake, Streams ...) shows the provider of its layer
 * (Water features-point / -polygon / -line). The categories "DAD Tanks Details" and "UNDP Tanks Details" use layer names that other layers
 * also have ("Minor Tanks"), so they only use a registry row whose Database is that category; without one the pop-up says the provider
 * is not recorded yet. Contact names, e-mail addresses and every other column are never shown.
 */

const LayerSourceInfo = (function () {
    'use strict';

    const DATA_ROOT = 'https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/';
    const REGISTRY_BASE = DATA_ROOT + 'Registry/DBMS_';
    const PANEL_IDS = ['basePanel', 'areaLayersPanel'];
    const OWN_METADATA_CATEGORIES = ['dad tanks details', 'undp tanks details'];

    // ------------------------------------------------------------------------------------------
    // Which column holds the provider (first match wins; contact columns are never used)
    // ------------------------------------------------------------------------------------------

    function keyOf(name) { return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }

    function isMeaningless(value) {
        const v = String(value === null || value === undefined ? '' : value).trim().toLowerCase();
        return v === '' || v === 'undefined' || v === 'null' || v === 'nan' || v === 'n/a' || v === 'na' || v === '-';
    }

    const PROVIDER_COLUMNS = [/^provider$/, /^dataprovider$/, /^providedby$/, /^source$/, /^agency$/, /^organi[sz]ation$/, /^owner$/, /^custodian$/, /^publisher$/,
        /^institution$/, /^department$/, /provider/, /^datasource$/, /source/];
    const NEVER_COLUMNS = /(contact|email|mail|phone|address|person|name$)/;

    /** The provider written in one registry row (an object keyed by column name), or ''. */
    function providerOf(row) {
        const names = Object.keys(row || {}).filter((n) => !NEVER_COLUMNS.test(keyOf(n)) || /provider/.test(keyOf(n)));
        for (const pattern of PROVIDER_COLUMNS) {
            const name = names.find((n) => pattern.test(keyOf(n)) && !isMeaningless(row[n]));
            if (name !== undefined) return String(row[name]).trim();
        }
        return '';
    }

    // ------------------------------------------------------------------------------------------
    // The metadata of the mini watershed
    // ------------------------------------------------------------------------------------------

    function field(row, wanted) {
        const key = keyOf(wanted);
        const name = Object.keys(row).find((n) => keyOf(n) === key);
        return name === undefined ? '' : row[name];
    }

    function mwsCode() {
        const select = document.getElementById('selectMWSID');
        let value = select && select.value ? select.value : '';
        if (!value && window.AreaExplorer && typeof window.AreaExplorer.firstMwsCode === 'function') value = window.AreaExplorer.firstMwsCode() || '';
        return String(value).trim().replace(/^mws[-_]?/i, '').replace(/-/g, '_');
    }

    /** Small CSV reader (quoted fields, doubled quotes, line breaks inside quotes, byte-order mark). Returns objects keyed by the header row. */
    function parseCsv(text) {
        const src = String(text || '').replace(/^\uFEFF/, '');
        const rows = [];
        let row = [], cell = '', quoted = false;
        for (let i = 0; i < src.length; i++) {
            const c = src[i];
            if (quoted) {
                if (c === '"') { if (src[i + 1] === '"') { cell += '"'; i++; } else quoted = false; } else cell += c;
            } else if (c === '"') quoted = true;
            else if (c === ',') { row.push(cell); cell = ''; }
            else if (c === '\n' || c === '\r') { if (c === '\r' && src[i + 1] === '\n') i++; row.push(cell); cell = ''; rows.push(row); row = []; }
            else cell += c;
        }
        if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
        const filled = rows.filter((r) => r.some((x) => String(x).trim() !== ''));
        const head = (filled[0] || []).map((h) => String(h).trim());
        return filled.slice(1).map((r) => { const o = {}; head.forEach((h, i) => { if (h) o[h] = r[i] === undefined ? '' : String(r[i]).trim(); }); return o; });
    }

    // One request per file and mini watershed. A failure is not kept, so it is tried again the next time.
    const fileCache = new Map();
    function loadRows(url) {
        if (fileCache.has(url)) return fileCache.get(url);
        const request = fetch(url).then((response) => (response.ok ? response.text().then(parseCsv) : null)).catch(() => null);
        fileCache.set(url, request);
        request.then((rows) => { if (rows === null) fileCache.delete(url); });
        return request;
    }

    function indexRows(rows) {
        const index = new Map();
        (rows || []).forEach((row) => {
            const name = keyOf(field(row, 'Layer'));
            if (!name) return;
            if (!index.has(name)) index.set(name, []);
            index.get(name).push(row);
        });
        return index;
    }

    /** The row of a layer. ctx: { category, layer }. */
    function findRow(index, ctx) {
        const category = keyOf(ctx.category);
        if (OWN_METADATA_CATEGORIES.indexOf(String(ctx.category || '').trim().toLowerCase()) !== -1) {
            const composite = index.get(keyOf(ctx.category + ' - ' + ctx.layer));
            if (composite && composite.length) return composite[0];
            return (index.get(keyOf(ctx.layer)) || []).find((row) => keyOf(field(row, 'Database')) === category) || null;
        }
        const rows = index.get(keyOf(ctx.layer)) || [];
        if (!rows.length) return null;
        return rows.find((row) => keyOf(field(row, 'Database')) === category) || rows[0];
    }

    /** Promise of { state: 'ok' | 'none' | 'error', provider } for a row of the list. */
    function providerFor(ctx) {
        const code = mwsCode();
        if (!code) return Promise.resolve({ state: 'error' });
        const registry = loadRows(REGISTRY_BASE + code + '.csv');
        const layerList = loadRows(DATA_ROOT + 'Data/EXD/MWS_' + code + '/AllDataLayer_' + code + '.csv');
        return Promise.all([registry, layerList]).then(([registryRows, listRows]) => {
            if (registryRows === null && listRows === null) return { state: 'error' };
            for (const rows of [registryRows, listRows]) {
                if (!rows) continue;
                const row = findRow(indexRows(rows), ctx);
                const name = row ? providerOf(row) : '';
                if (name) return { state: 'ok', provider: name };
            }
            return { state: 'none' };
        });
    }

    // ------------------------------------------------------------------------------------------
    // The pop-up
    // ------------------------------------------------------------------------------------------

    let openPop = null;       // { pop, button }
    let counter = 0;

    function close(returnFocus) {
        if (!openPop) return;
        const { pop, button } = openPop;
        openPop = null;
        pop.remove();
        button.setAttribute('aria-expanded', 'false');
        button.removeAttribute('aria-describedby');
        if (returnFocus) button.focus();
    }

    function setText(pop, result) {
        pop.removeAttribute('aria-busy');
        pop.textContent = '';
        if (result.state === 'ok') {
            const label = document.createElement('span');
            label.className = 'src-pop-label';
            label.textContent = 'Data provider';
            const name = document.createElement('strong');
            name.textContent = result.provider;                    // text, never HTML: the metadata is data, not markup
            pop.appendChild(label);
            pop.appendChild(name);
        } else {
            pop.textContent = result.state === 'none' ? 'Data provider not recorded for this layer.' : 'The data provider could not be loaded.';
            pop.classList.add('src-pop--note');
        }
    }

    function open(button, row, ctx) {
        close(false);
        const pop = document.createElement('div');
        pop.id = 'src-pop-' + (++counter);
        pop.className = 'src-pop';
        pop.setAttribute('role', 'status');
        pop.setAttribute('aria-busy', 'true');
        pop.textContent = 'Loading...';
        row.appendChild(pop);
        button.setAttribute('aria-expanded', 'true');
        button.setAttribute('aria-describedby', pop.id);
        openPop = { pop: pop, button: button };
        providerFor(ctx).then((result) => {
            if (!openPop || openPop.pop !== pop) return;           // closed, or another layer opened, while it was loading
            setText(pop, result);
        });
    }

    // ------------------------------------------------------------------------------------------
    // The buttons
    // ------------------------------------------------------------------------------------------

    function addButton(row, ctx) {
        row.setAttribute('data-src-info', 'true');
        row.classList.add('src-info-row');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'src-info-btn';
        button.textContent = 'i';
        button.title = 'Data provider';
        button.setAttribute('aria-label', 'Data provider of ' + ctx.display);
        button.setAttribute('aria-expanded', 'false');
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            if (openPop && openPop.button === button) close(false);
            else open(button, row, ctx);
        });
        row.appendChild(button);
    }

    /** Add a button to every check-box row of a panel that does not have one yet. */
    function decoratePanel(panel) {
        Array.from(panel.children).forEach((category) => {
            if (category.tagName !== 'DIV') return;
            const heading = category.querySelector(':scope > h3');
            const categoryName = heading ? heading.textContent.trim() : '';
            let groupTitle = '';
            Array.from(category.children).forEach((row) => {
                if (row.tagName !== 'DIV' || row.hasAttribute('data-src-info')) return;
                const box = row.querySelector(':scope > input[type="checkbox"]');
                if (!box) {                                          // the bold title row of a water-feature layer
                    const title = row.querySelector(':scope > strong');
                    if (title) groupTitle = title.textContent.trim();
                    return;
                }
                const label = row.querySelector(':scope > label');
                if (!label) return;
                const labelText = label.textContent.trim();
                const isType = row.style.marginLeft === '16px' && !!groupTitle;     // an indented type row belongs to the title above it
                if (!isType) groupTitle = '';
                addButton(row, {
                    category: categoryName,
                    layer: isType ? groupTitle : labelText,
                    display: isType ? groupTitle + ' (' + labelText + ')' : labelText
                });
            });
        });
    }

    function refresh() {
        PANEL_IDS.forEach((id) => { const panel = document.getElementById(id); if (panel) decoratePanel(panel); });
    }

    function start() {
        PANEL_IDS.forEach((id) => {
            const panel = document.getElementById(id);
            if (!panel) return;
            // The lists are rebuilt (innerHTML) whenever they are opened: add the buttons to the new rows.
            new MutationObserver(() => decoratePanel(panel)).observe(panel, { childList: true });
            decoratePanel(panel);
        });
        document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && openPop) close(true); });
        document.addEventListener('click', (event) => {
            if (openPop && !openPop.pop.contains(event.target) && event.target !== openPop.button) close(false);
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();

    return { PANEL_IDS: PANEL_IDS, refresh: refresh, close: close, providerFor: providerFor, providerOf: providerOf };
})();

window.LayerSourceInfo = LayerSourceInfo;
