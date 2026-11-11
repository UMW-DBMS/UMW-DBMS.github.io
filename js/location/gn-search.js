/**
 * GN / DSD / District / MWS search box
 *
 * Purpose : The search box in the dark header bar (from the updated dashboard, index (4).html and its dropdown.js), rebuilt for this page.
 *           Type a GN division, a DSD, a district or an MWS ID and pick a result from the list:
 *             - GN division: the District, DSD and MWS ID boxes are filled, the GN is outlined in orange with its name on the map and the
 *               map zooms to it. Press Go to open the data of that mini watershed.
 *             - Mini watershed (MWS): the three boxes are filled and all the GN divisions of that mini watershed are outlined.
 *             - DSD or District: the District (and DSD) box is filled and the mini watersheds of it are outlined (then choose an MWS ID, or
 *               press Explore area to see everything of that DSD or District).
 *           Enter without choosing: the best match is used; if several GN divisions match equally they are all outlined on the map and the
 *           list stays open so you can choose one. "Clear" removes the text and the outlines.
 *           Compared with the old box: a proper result list (type badge, MWS / DSD / District under each name, the typed letters marked,
 *           arrow keys, Esc), results grouped by kind, a "loading" bar while the GN files are being read (6 at a time, not all at once),
 *           messages on the page instead of alert(), Sinhala and Tamil letters searchable, and no layers are reset when the GN lies in the
 *           mini watershed that is already open.
 * Depends : Leaflet, global `map`; the drop-downs #selectDist, #selectDSD, #selectMWSID (filled and cascaded by js/location/location-selector.js:
 *           this script only sets their values and fires their normal "change" events, so Go, the panels and Explore area react as when you
 *           choose by hand); setSelectionStatus() from ui-panels.js when present. Elements of index.html: #mwsSearchInput, #mwsSearchBtn,
 *           #clearGndSearchBtn, #gnSuggest, #gnSuggestMsg, #gnSuggestList, #gnSuggestFoot. Styles: css/umw-enhancements.css, section 9.
 *           If those elements are not in the page this script does nothing.
 * Exposes : window.GnSearch { search, choose, submit, clear, state }
 *
 * Data: the mini watershed boundary file (District, MainDSD, MWS_ID of every mini watershed) and, per mini watershed, the GN file
 * Data/EXD/01_ADM/GND/MWS_<id>.geojson (id with "-" written "_": 010-1 -> 010_1). A GN's name is read from GND_N, GND_Name, GN_Name, GN, Name
 * (first that is filled, capitals ignored); its code (GND_C, GN_Code ...) is searchable too. GN divisions are searched inside the area that
 * is chosen in the drop-downs (the mini watershed, or the DSD, or the District) and in the whole UMW when nothing is chosen: the same rule as the
 * old box. The GN files are read only once you type 2 letters, 6 at a time, and kept for the rest of the visit. A file that is not published
 * (404) simply has no GN; a file that fails to load is tried again later (not more than once every 20 s).
 * The orange GN outlines are drawn in their own map pane just under the other layers, so they never block a click on a layer you have switched on.
 */

const GnSearch = (function () {
    'use strict';

    const DATA_ROOT = 'https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Data/EXD/';
    const BOUNDARY_URL = DATA_ROOT + 'UMW/MWS_Boundary_Updated_UMC_Names.geojson';
    const gndUrl = (code) => DATA_ROOT + '01_ADM/GND/MWS_' + code + '.geojson';
    const PANE = 'gnSearchPane';
    const MAX_PARALLEL = 6;
    const GN_MIN_CHARS = 2;                                   // GN files are read once this many characters are typed
    const RETRY_AFTER_MS = 20000;
    const SHOW = { district: 5, dsd: 6, mws: 6, gn: 30 };     // results shown per kind
    const PRIORITY = ['district', 'dsd', 'mws', 'gn'];        // order of the groups when their best matches are equally good
    const TITLES = { district: 'District', dsd: 'DSD', mws: 'Mini watershed', gn: 'GN division' };
    const BADGES = { district: 'District', dsd: 'DSD', mws: 'MWS', gn: 'GN' };
    const NAME_KEYS = ['gnd_n', 'gnd_name', 'gn_name', 'gn', 'name', 'gnd'];
    const CODE_KEY = /^(gnd?|gn)[ _]?(c|code|no|number|id)$/i;

    const $ = (id) => document.getElementById(id);
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    /** Text for comparing: lower case, letters and digits of any script (Sinhala and Tamil included) separated by single spaces. */
    const norm = (s) => String(s === null || s === undefined ? '' : s).normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ').trim();
    const codeOf = (id) => String(id === null || id === undefined ? '' : id).trim().replace(/^mws[-_ ]?/i, '').replace(/-/g, '_');
    const mwsLabel = (info) => 'MWS ' + String(info.id).replace(/^mws[-_ ]?/i, '');
    const plural = (n, word) => n + ' ' + word + (n === 1 ? '' : 's');

    const state = {
        infos: [],                // every mini watershed: { id, code, district, dsd, feature, bounds }
        boundary: null,           // promise of the boundary file
        gn: new Map(),            // mws code -> { promise, entries }
        failed: new Map(),        // mws code -> time of the last failure
        queue: [], queued: new Set(), workers: 0,
        op: 0,                    // bumps on every choice and on Clear: work of an older choice is dropped
        applying: false,          // true while this script fills the drop-downs
        group: null,              // the orange / magenta outlines on the map
        selected: null,           // what is outlined: { type, label }
        wide: false,              // true after "Search the whole UMW instead": GN divisions are searched everywhere, whatever the drop-downs say
        results: [], active: -1, open: false, renderTimer: null
    };

    /** Small element builder: text goes in as text, never as HTML. */
    function h(tag, attrs, kids) {
        const el = document.createElement(tag);
        Object.keys(attrs || {}).forEach((k) => {
            if (k === 'class') el.className = attrs[k];
            else if (k === 'text') el.textContent = attrs[k];
            else if (attrs[k] !== false && attrs[k] !== null && attrs[k] !== undefined) el.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
        });
        (kids || []).forEach((c) => { if (c) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
        return el;
    }

    // ------------------------------------------------------------------------------------------
    // The mini watersheds
    // ------------------------------------------------------------------------------------------

    function loadBoundary() {
        if (state.boundary) return state.boundary;
        const source = window.originalMwsBoundaryData
            ? Promise.resolve(window.originalMwsBoundaryData)
            : fetch(BOUNDARY_URL).then((r) => { if (!r.ok) throw new Error('Boundary file: HTTP ' + r.status); return r.json(); });
        state.boundary = source.then((gj) => {
            state.infos = (gj.features || []).filter((f) => f && f.geometry && f.properties).map((f) => {
                const p = f.properties;
                const id = String(p.MWS_ID || p.MWSID || p.MWD_ID || '').trim();
                return { id: id, code: codeOf(id), district: String(p.District || p.DISTRICT || '').trim(), dsd: String(p.MainDSD || p.DSD || p.DS_Divisio || '').trim(), feature: f, bounds: null };
            }).filter((i) => i.code);
            return state.infos;
        });
        state.boundary.catch(() => { state.boundary = null; });
        return state.boundary;
    }

    function boundsOf(info) {
        if (!info.bounds) info.bounds = L.geoJSON(info.feature).getBounds();
        return info.bounds;
    }

    function selected(id) {
        const s = $(id);
        if (!s || !s.value) return null;
        const o = s.options[s.selectedIndex];
        return { value: s.value, text: o ? o.text.trim() : '' };
    }

    /** The area the GN divisions are searched in: what the drop-downs say, or the whole UMW. */
    function currentScope() {
        if (state.wide) return { members: state.infos.slice(), label: 'the whole UMW', wide: true };
        const dist = selected('selectDist'), dsd = selected('selectDSD'), mws = selected('selectMWSID');
        const same = (sel, v) => !!sel && (norm(sel.value) === norm(v) || norm(sel.text) === norm(v));
        let members = state.infos.slice(), label = 'the whole UMW';
        if (mws) { const c = codeOf(mws.value); members = members.filter((i) => i.code === c); label = 'MWS ' + (mws.text || mws.value); }
        else if (dsd) { members = members.filter((i) => same(dsd, i.dsd) && (!dist || same(dist, i.district))); label = dsd.text + ' DSD'; }
        else if (dist) { members = members.filter((i) => same(dist, i.district)); label = dist.text + ' District'; }
        if (!members.length) { members = state.infos.slice(); label = 'the whole UMW'; }
        return { members: members, label: label };
    }

    // ------------------------------------------------------------------------------------------
    // The GN files: read 6 at a time, kept, retried after a failure
    // ------------------------------------------------------------------------------------------

    function propsLower(props) {
        const lower = {};
        Object.keys(props || {}).forEach((k) => { lower[k.toLowerCase()] = props[k]; });
        return lower;
    }

    function gnName(props) {
        const lower = propsLower(props);
        for (const key of NAME_KEYS) {
            const v = lower[key];
            if (v !== null && v !== undefined && String(v).trim() !== '' && String(v).trim().toLowerCase() !== 'null') return String(v).trim();
        }
        return '';
    }

    function gnCodes(props) {
        return Object.keys(props || {}).filter((k) => CODE_KEY.test(k)).map((k) => props[k])
            .filter((v) => v !== null && v !== undefined && String(v).trim() !== '').map((v) => String(v).trim());
    }

    function entriesOf(data, info) {
        const out = [];
        (Array.isArray(data && data.features) ? data.features : []).forEach((f) => {
            if (!f || !f.geometry) return;
            const props = f.properties || {}, name = gnName(props), codes = gnCodes(props);
            if (!name && !codes.length) return;
            const label = name || codes[0];
            out.push({ name: label, codes: codes, keys: [norm(label)].concat(codes.map(norm)).filter(Boolean), feature: f, info: info });
        });
        return out;
    }

    function gnFor(info) {
        let rec = state.gn.get(info.code);
        if (rec) return rec.promise;
        rec = { entries: null };
        rec.promise = fetch(gndUrl(info.code)).then(async (r) => {
            if (r.status === 404 || r.status === 410) return [];
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return entriesOf(await r.json(), info);
        }).then((entries) => { rec.entries = entries; return entries; });
        rec.promise.catch(() => { if (state.gn.get(info.code) === rec) state.gn.delete(info.code); });     // a failure is not kept
        state.gn.set(info.code, rec);
        return rec.promise;
    }

    function enqueue(members) {
        const now = Date.now();
        members.forEach((m) => {
            if (state.gn.has(m.code) || state.queued.has(m.code)) return;
            const failedAt = state.failed.get(m.code);
            if (failedAt && now - failedAt < RETRY_AFTER_MS) return;
            state.queued.add(m.code);
            state.queue.push(m);
        });
        pump();
    }

    function pump() {
        while (state.workers < MAX_PARALLEL && state.queue.length) {
            const m = state.queue.shift();
            state.workers++;
            gnFor(m).catch(() => { state.failed.set(m.code, Date.now()); }).then(() => {
                state.queued.delete(m.code);
                state.workers--;
                scheduleRender();
                pump();
            });
        }
    }

    const settled = (code) => { const r = state.gn.get(code); return !!(r && r.entries) || state.failed.has(code); };
    const loadedCount = (members) => members.filter((m) => { const r = state.gn.get(m.code); return r && r.entries; }).length;

    /** Wait until the GN files of these mini watersheds are read (or have failed). false when a newer choice has replaced this one. */
    async function loadFor(members, stale) {
        enqueue(members);
        while (!members.every((m) => settled(m.code))) {
            if (stale && stale()) return false;
            await delay(80);
        }
        return true;
    }

    // ------------------------------------------------------------------------------------------
    // Searching
    // ------------------------------------------------------------------------------------------

    function scoreKey(key, q) {
        if (!key) return 0;
        if (key === q) return 3;
        if (key.indexOf(q) === 0 || (' ' + key).indexOf(' ' + q) !== -1) return 2;
        return key.indexOf(q) !== -1 ? 1 : 0;
    }
    const scoreKeys = (keys, q) => keys.reduce((best, k) => Math.max(best, scoreKey(k, q)), 0);

    /** { groups: [{ type, total, items }], flat } for what is typed. District, DSD and MWS are searched everywhere; GN divisions in the scope. */
    function runSearch(query) {
        const q = norm(query);
        const found = { district: [], dsd: [], mws: [], gn: [] };
        if (!q) return { groups: [], flat: [], scope: currentScope() };
        const scope = currentScope();
        const districts = new Map(), dsds = new Map();
        state.infos.forEach((i) => {
            if (i.district) { const d = districts.get(i.district) || { type: 'district', name: i.district, mws: 0, dsds: new Set() }; d.mws++; if (i.dsd) d.dsds.add(i.dsd); districts.set(i.district, d); }
            if (i.dsd) { const k = i.dsd + '|' + i.district; const d = dsds.get(k) || { type: 'dsd', name: i.dsd, district: i.district, mws: 0 }; d.mws++; dsds.set(k, d); }
        });
        districts.forEach((d) => { const s = scoreKey(norm(d.name), q); if (s) found.district.push(Object.assign(d, { score: s, dsdCount: d.dsds.size })); });
        dsds.forEach((d) => { const s = scoreKey(norm(d.name), q); if (s) found.dsd.push(Object.assign(d, { score: s })); });
        state.infos.forEach((i) => {
            const s = scoreKeys([norm(i.id), norm(i.code), 'mws ' + norm(i.code)], q);
            if (s) found.mws.push({ type: 'mws', name: mwsLabel(i), info: i, score: s });
        });
        if (q.length >= GN_MIN_CHARS) {
            scope.members.forEach((m) => {
                const rec = state.gn.get(m.code);
                if (!rec || !rec.entries) return;
                rec.entries.forEach((e) => { const s = scoreKeys(e.keys, q); if (s) found.gn.push({ type: 'gn', name: e.name, info: m, entry: e, score: s }); });
            });
        }
        const byName = (a, b) => b.score - a.score || String(a.name).localeCompare(String(b.name), undefined, { numeric: true, sensitivity: 'base' }) ||
            String((a.info || {}).id || '').localeCompare(String((b.info || {}).id || ''), undefined, { numeric: true });
        const groups = PRIORITY.filter((t) => found[t].length).map((t) => {
            const items = found[t].sort(byName);
            return { type: t, total: items.length, items: items.slice(0, SHOW[t]), best: items[0].score };
        }).sort((a, b) => b.best - a.best || PRIORITY.indexOf(a.type) - PRIORITY.indexOf(b.type));
        return { groups: groups, flat: groups.reduce((all, g) => all.concat(g.items), []), scope: scope, found: found };
    }

    // ------------------------------------------------------------------------------------------
    // The result list
    // ------------------------------------------------------------------------------------------

    function secondary(item) {
        if (item.type === 'gn') return mwsLabel(item.info) + ' \u00b7 ' + item.info.dsd + ' DSD \u00b7 ' + item.info.district;
        if (item.type === 'mws') return item.info.dsd + ' DSD \u00b7 ' + item.info.district;
        if (item.type === 'dsd') return item.district + ' District \u00b7 ' + plural(item.mws, 'mini watershed');
        return plural(item.dsdCount, 'DSD') + ' \u00b7 ' + plural(item.mws, 'mini watershed');
    }

    function highlighted(text, query) {
        const span = h('span', { class: 'gn-opt-name' });
        const raw = String(query || '').trim().toLowerCase(), at = raw ? String(text).toLowerCase().indexOf(raw) : -1;
        if (at < 0) { span.textContent = text; return span; }
        span.appendChild(document.createTextNode(text.slice(0, at)));
        span.appendChild(h('mark', { text: text.slice(at, at + raw.length) }));
        span.appendChild(document.createTextNode(text.slice(at + raw.length)));
        return span;
    }

    function setActive(index, scroll) {
        const input = $('mwsSearchInput'), options = Array.from(document.querySelectorAll('#gnSuggestList .gn-option'));
        state.active = index;
        options.forEach((o, i) => o.setAttribute('aria-selected', i === index ? 'true' : 'false'));
        if (input) { if (index >= 0 && options[index]) input.setAttribute('aria-activedescendant', options[index].id); else input.removeAttribute('aria-activedescendant'); }
        if (scroll && options[index]) options[index].scrollIntoView({ block: 'nearest' });
    }

    function renderPanel() {
        const input = $('mwsSearchInput'), list = $('gnSuggestList'), msg = $('gnSuggestMsg'), foot = $('gnSuggestFoot');
        if (!input || !list) return;
        const query = input.value.trim(), nq = norm(query);
        list.textContent = ''; msg.textContent = ''; foot.textContent = '';
        state.results = [];
        if (!state.infos.length) { msg.textContent = 'Loading the mini watershed list...'; return; }
        const scope = currentScope();
        if (!nq) {
            msg.textContent = 'Type a GN division, DSD, district or MWS ID. GN divisions are searched in ' + scope.label + '.';
            setActive(-1);
            return;
        }
        const res = runSearch(query);
        state.results = res.flat;
        let n = 0;
        res.groups.forEach((g) => {
            const titleId = 'gn-grp-' + g.type;
            const group = h('div', { role: 'group', 'aria-labelledby': titleId }, [h('div', { class: 'gn-group-title', id: titleId, text: TITLES[g.type] + ' (' + g.total + ')' })]);
            g.items.forEach((item) => {
                const idx = n++;
                const opt = h('div', { class: 'gn-option', role: 'option', id: 'gn-opt-' + idx, 'aria-selected': 'false', 'data-index': String(idx) }, [
                    h('span', { class: 'gn-badge gn-badge--' + item.type, text: BADGES[item.type] }),
                    h('span', { class: 'gn-opt-text' }, [highlighted(item.name, query), h('span', { class: 'gn-opt-sub', text: secondary(item) })])
                ]);
                group.appendChild(opt);
            });
            if (g.total > g.items.length) group.appendChild(h('div', { class: 'gn-more', text: (g.total - g.items.length) + ' more: type more letters to narrow the list' }));
            list.appendChild(group);
        });
        msg.className = 'gn-msg';
        const narrow = !scope.wide && scope.label !== 'the whole UMW';
        const wantGn = nq.length >= GN_MIN_CHARS, loaded = loadedCount(scope.members), total = scope.members.length, loading = wantGn && loaded < total && state.workers + state.queue.length > 0;
        if (!res.flat.length) {
            msg.textContent = loading ? 'Searching...' : 'No matching GN, DSD, District or MWS ID found.' + (narrow && wantGn ? ' GN divisions were searched only in ' + scope.label + '.' : '');
        } else {
            msg.textContent = plural(res.flat.length, 'result') + '. Use the arrow keys and Enter, or click one.';
            msg.className = 'gn-msg gn-sr';                      // announced to screen readers, not shown (the list itself is the answer)
        }
        if (nq.length < GN_MIN_CHARS) foot.appendChild(h('div', { text: 'Type ' + GN_MIN_CHARS + ' or more letters to search GN divisions.' }));
        else {
            foot.appendChild(h('div', { text: 'GN divisions are searched in ' + scope.label + '.' }));
            if (narrow) foot.appendChild(h('button', { type: 'button', class: 'gn-widen', text: 'Search the whole UMW instead' }));
            if (loading) {
                foot.appendChild(h('div', { class: 'gn-loading', text: 'Loading GN divisions: ' + loaded + ' of ' + total }));
                foot.appendChild(h('div', { class: 'gn-progress', 'aria-hidden': 'true' }, [h('i', { style: 'width:' + Math.round((loaded / Math.max(1, total)) * 100) + '%' })]));
            }
        }
        setActive(state.active >= 0 && state.active < state.results.length ? state.active : -1);
    }

    function scheduleRender() {
        if (!state.open || state.renderTimer) return;
        state.renderTimer = setTimeout(() => { state.renderTimer = null; if (state.open) renderPanel(); }, 150);
    }

    function openPanel() {
        const panel = $('gnSuggest'), input = $('mwsSearchInput');
        if (!panel) return;
        state.open = true; panel.hidden = false;
        if (input) input.setAttribute('aria-expanded', 'true');
    }

    function closePanel() {
        const panel = $('gnSuggest'), input = $('mwsSearchInput');
        state.open = false;
        if (state.renderTimer) { clearTimeout(state.renderTimer); state.renderTimer = null; }
        if (panel) panel.hidden = true;
        if (input) { input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); }
        state.active = -1;
    }

    // ------------------------------------------------------------------------------------------
    // The map: orange GN outlines (and magenta mini watershed outlines) in a pane just under the other layers
    // ------------------------------------------------------------------------------------------

    function ensurePane() {
        let pane = map.getPane(PANE);
        if (!pane) { pane = map.createPane(PANE); pane.style.zIndex = 395; }       // overlayPane is 400: the other layers stay clickable
    }

    function clearOutlines() {
        if (state.group) { try { map.removeLayer(state.group); } catch (e) { /* already gone */ } state.group = null; }
    }

    function popupNode(entry) {
        const info = entry.info;
        const line = (label, value) => h('div', {}, [h('strong', { text: label + ': ' }), document.createTextNode(value || 'N/A')]);
        return h('div', { class: 'gn-popup' }, [line('GN', entry.name), line('MWS_ID', info.id), line('DSD', info.dsd), line('District', info.district)]);
    }

    function fit(layer) {
        try {
            const b = layer.getBounds();
            if (b && b.isValid()) map.fitBounds(b, { padding: [30, 30], maxZoom: 16 });
        } catch (e) { /* nothing to zoom to */ }
    }

    /** sel: { outline: [info...] (magenta), gn: [entry...] (orange), single: bool } */
    function drawOutlines(sel) {
        if (typeof map === 'undefined') return;
        ensurePane(); clearOutlines();
        const group = L.featureGroup();
        if (sel.outline && sel.outline.length) {
            group.addLayer(L.geoJSON(sel.outline.map((i) => i.feature), { pane: PANE, interactive: false, style: { color: '#FF00FF', weight: 3, fillColor: '#FF00FF', fillOpacity: 0.04 } }));
        }
        let gnLayer = null;
        if (sel.gn && sel.gn.length) {
            gnLayer = L.geoJSON(sel.gn.map((e) => e.feature), {
                pane: PANE,
                style: { color: '#FF8C00', weight: 4, fillColor: '#FFA500', fillOpacity: sel.single ? 0.2 : 0.12 },
                onEachFeature: function (feature, layer) {
                    const entry = sel.gn.find((e) => e.feature === feature);
                    if (!entry) return;
                    layer.bindPopup(popupNode(entry));
                    layer.bindTooltip(entry.name, { permanent: true, direction: 'center', className: 'gn-search-label' });
                }
            });
            group.addLayer(gnLayer);
        }
        group.addTo(map);
        state.group = group;
        fit(gnLayer || group);
    }

    // ------------------------------------------------------------------------------------------
    // The drop-downs: set the values and fire the same "change" events a click would
    // ------------------------------------------------------------------------------------------

    function announce(text, kind) {
        if (typeof setSelectionStatus === 'function') setSelectionStatus(text, kind || '');
        else { const el = $('selectionStatus'); if (el) el.textContent = text; }
    }

    async function setSelect(id, wanted, force, op) {
        const s = $(id);
        if (!s) return false;
        const key = id === 'selectMWSID' ? codeOf : norm, want = key(wanted);
        const find = () => Array.from(s.options).find((o) => o.value && (key(o.value) === want || key(o.text) === want));
        const current = s.value ? find() : null;
        if (current && current.value === s.value) {
            if (force) { s.dispatchEvent(new Event('change', { bubbles: true })); await delay(120); }     // empties the lists that depend on it
            return true;
        }
        for (let tries = 0; tries < 30; tries++) {                // the list may still be filling after the previous change
            if (op !== state.op) return false;
            const option = find();
            if (option) { s.value = option.value; s.dispatchEvent(new Event('change', { bubbles: true })); await delay(120); return true; }
            await delay(80);
        }
        return false;
    }

    /** target: { district, dsd, mws }. A value that is already chosen is left alone (nothing is reset), except that choosing only a District or a DSD empties what depends on it. */
    async function applyLocation(target, op) {
        state.applying = true;
        try {
            let ok = true;
            if (target.district) ok = (await setSelect('selectDist', target.district, !target.dsd && !target.mws && !!selected('selectDSD'), op)) && ok;
            if (op !== state.op) return false;
            if (target.dsd) ok = (await setSelect('selectDSD', target.dsd, !target.mws && !!selected('selectMWSID'), op)) && ok;
            if (op !== state.op) return false;
            if (target.mws) ok = (await setSelect('selectMWSID', target.mws, false, op)) && ok;
            if (op !== state.op) return false;
            await delay(200);                                    // let the location code and the Go button settle before the map is moved
            return ok && op === state.op;
        } finally { state.applying = false; }
    }

    // ------------------------------------------------------------------------------------------
    // Choosing a result
    // ------------------------------------------------------------------------------------------

    function syncClear() {
        const input = $('mwsSearchInput'), clear = $('clearGndSearchBtn');
        if (clear) clear.hidden = !((input && input.value) || state.group || state.selected);
    }

    function busy(on) {
        const btn = $('mwsSearchBtn');
        if (!btn) return;
        btn.disabled = !!on;
        if (on) btn.setAttribute('aria-busy', 'true'); else btn.removeAttribute('aria-busy');
    }

    async function choose(item) {
        if (!item) return;
        const input = $('mwsSearchInput'), op = ++state.op;
        closePanel();
        if (input) input.value = item.name;
        busy(true);
        try {
            if (!state.infos.length) await loadBoundary();
            if (item.type === 'gn') {
                const info = item.info, ok = await applyLocation({ district: info.district, dsd: info.dsd, mws: info.id }, op);
                if (op !== state.op) return;
                drawOutlines({ outline: [info], gn: [item.entry], single: true });
                state.selected = { type: 'gn', label: item.name };
                announce((ok ? '' : 'The location boxes could not all be set. ') + 'GN ' + item.name + ' is in ' + mwsLabel(info) + ' (' + info.dsd + ', ' + info.district + '). Press Go to open its data.', 'pending');
            } else if (item.type === 'mws') {
                const info = item.info, ok = await applyLocation({ district: info.district, dsd: info.dsd, mws: info.id }, op);
                if (op !== state.op) return;
                let entries = null;
                try { entries = await gnFor(info); } catch (e) { entries = null; }
                if (op !== state.op) return;
                drawOutlines({ outline: [info], gn: entries || [], single: false });
                state.selected = { type: 'mws', label: item.name };
                const gnNote = entries && entries.length ? plural(entries.length, 'GN division') + ' outlined.' : (entries ? 'No GN boundaries are published for this mini watershed.' : 'The GN boundaries could not be loaded.');
                announce((ok ? '' : 'The location boxes could not all be set. ') + mwsLabel(info) + ' (' + info.dsd + ', ' + info.district + '). ' + gnNote + ' Press Go to open its data.', 'pending');
            } else {
                const dsdLevel = item.type === 'dsd';
                const ok = await applyLocation(dsdLevel ? { district: item.district, dsd: item.name } : { district: item.name }, op);
                if (op !== state.op) return;
                const members = state.infos.filter((i) => dsdLevel ? (norm(i.dsd) === norm(item.name) && norm(i.district) === norm(item.district)) : norm(i.district) === norm(item.name));
                drawOutlines({ outline: members, gn: [], single: false });
                state.selected = { type: item.type, label: item.name };
                announce((ok ? '' : 'The location boxes could not all be set. ') + item.name + (dsdLevel ? ' DSD' : ' District') + ': ' + plural(members.length, 'mini watershed') +
                    ' outlined. Choose a ' + (dsdLevel ? 'MWS ID' : 'DSD') + ' and press Go, or press Explore area to see all of it.', '');
            }
        } finally {
            if (op === state.op) busy(false);
            syncClear();
        }
    }

    /** Enter in the box (or the magnifier) without choosing a result: use the best match, or outline the equal best GN matches and let the user pick. */
    async function submit() {
        const input = $('mwsSearchInput');
        if (!input) return null;
        const query = input.value.trim(), nq = norm(query);
        if (!nq) return null;
        const op = ++state.op;
        busy(true);
        try {
            if (!state.infos.length) await loadBoundary();
            const scope = currentScope();
            if (nq.length >= GN_MIN_CHARS) { openPanel(); renderPanel(); if (!(await loadFor(scope.members, () => op !== state.op))) return null; }
            if (op !== state.op) return null;
            const res = runSearch(query);
            openPanel(); renderPanel();
            if (!res.flat.length) return null;
            const top = res.flat[0].score, best = res.flat.filter((r) => r.score === top);
            if (best.length === 1) { await choose(best[0]); return best[0]; }
            if (best.every((r) => r.type === 'gn')) {
                drawOutlines({ outline: [], gn: best.map((r) => r.entry), single: false });
                state.selected = { type: 'gn-many', label: query };
                announce(plural(best.length, 'GN division') + ' match "' + query + '". Choose one in the list.', '');
                syncClear();
            }
            return res.flat;
        } finally { if (op === state.op) busy(false); syncClear(); }
    }

    function clear() {
        const input = $('mwsSearchInput');
        state.op++;
        clearOutlines();
        state.selected = null;
        state.wide = false;
        if (input) { input.value = ''; input.focus(); }
        closePanel(); busy(false); syncClear();
        const mws = selected('selectMWSID');
        if (mws) {                                               // back to the mini watershed that is open
            const info = state.infos.find((i) => i.code === codeOf(mws.value));
            if (info) { try { map.fitBounds(boundsOf(info), { padding: [20, 20] }); } catch (e) { /* ignore */ } }
        }
    }

    async function search(query) {
        if (!state.infos.length) await loadBoundary();
        const scope = currentScope();
        if (norm(query).length >= GN_MIN_CHARS) await loadFor(scope.members);
        return runSearch(query);
    }

    // ------------------------------------------------------------------------------------------
    // Wiring
    // ------------------------------------------------------------------------------------------

    function move(step) {
        const n = state.results.length;
        if (!n) return;
        setActive(state.active < 0 ? (step > 0 ? 0 : n - 1) : (state.active + step + n) % n, true);
    }

    function start() {
        const input = $('mwsSearchInput'), panel = $('gnSuggest');
        if (!input || !panel || typeof map === 'undefined') return;
        const onType = () => {
            state.active = -1;
            openPanel();
            if (!state.infos.length) { renderPanel(); loadBoundary().then(() => { renderPanel(); if (norm(input.value).length >= GN_MIN_CHARS) enqueue(currentScope().members); }).catch(() => { $('gnSuggestMsg').textContent = 'The mini watershed list could not be loaded. Check the connection and try again.'; }); }
            else { if (norm(input.value).length >= GN_MIN_CHARS) enqueue(currentScope().members); renderPanel(); }
            syncClear();
        };
        input.addEventListener('input', onType);
        input.addEventListener('focus', () => { if (!state.open) onType(); });
        input.addEventListener('click', () => { if (!state.open) onType(); });
        input.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowDown') { event.preventDefault(); if (!state.open) onType(); move(1); }
            else if (event.key === 'ArrowUp') { event.preventDefault(); if (!state.open) onType(); move(-1); }
            else if (event.key === 'Enter') { event.preventDefault(); if (state.open && state.active >= 0) choose(state.results[state.active]); else submit(); }
            else if (event.key === 'Escape') { if (state.open) { event.preventDefault(); closePanel(); } }
            else if (event.key === 'Tab') closePanel();
        });
        const list = $('gnSuggestList');
        list.addEventListener('mousedown', (event) => event.preventDefault());               // keep the focus in the box
        const foot = $('gnSuggestFoot');
        foot.addEventListener('mousedown', (event) => event.preventDefault());
        foot.addEventListener('click', (event) => {
            if (!(event.target.closest && event.target.closest('.gn-widen'))) return;
            state.wide = true;
            if (norm(input.value).length >= GN_MIN_CHARS) enqueue(currentScope().members);
            state.active = -1; renderPanel(); input.focus();
        });
        list.addEventListener('click', (event) => {
            const option = event.target.closest && event.target.closest('.gn-option');
            if (option) choose(state.results[Number(option.getAttribute('data-index'))]);
        });
        list.addEventListener('mousemove', (event) => {
            const option = event.target.closest && event.target.closest('.gn-option');
            if (option && Number(option.getAttribute('data-index')) !== state.active) setActive(Number(option.getAttribute('data-index')), false);
        });
        document.addEventListener('mousedown', (event) => { if (state.open && !event.target.closest('.gn-search')) closePanel(); });
        const searchBtn = $('mwsSearchBtn'), clearBtn = $('clearGndSearchBtn');
        if (searchBtn) searchBtn.addEventListener('click', () => { submit(); });
        if (clearBtn) clearBtn.addEventListener('click', clear);
        // A drop-down changed by hand: the outlines belong to the old choice. (Changes made by this script are ignored.)
        ['selectDist', 'selectDSD', 'selectMWSID'].forEach((id) => {
            const el = $(id);
            if (el) el.addEventListener('change', () => {
                if (state.applying) return;
                state.wide = false;                                  // the area is now what the boxes say again
                if (state.group || state.selected) { clearOutlines(); state.selected = null; }
                syncClear();
                if (state.open) renderPanel();
            });
        });
        syncClear();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();

    return { search: search, choose: choose, submit: submit, clear: clear, state: state, norm: norm };
})();

window.GnSearch = GnSearch;
