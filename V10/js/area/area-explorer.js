/**
 * Area explorer: all layers and statistics of a District, a DSD or the whole UMW
 *
 * Purpose : Until now the dashboard worked on ONE mini watershed (MWS): choose District, DSD and MWS, press Go. This adds a second way in:
 *           choose only a District, or a District and a DSD (or nothing, for the whole UMW) and press "Explore area". Then
 *             - the outline of every mini watershed of that area is drawn on the map and the map zooms to it;
 *             - "Area Layers" lists the layers of those mini watersheds; ticking one draws it for the WHOLE area (the files of all the
 *               mini watersheds are read and joined). Base layers and proposals are offered;
 *             - "Area Statistics" shows land cover, landslide hazard, soil, population and the list of mini watersheds of the area, added up
 *               over the area, with a chart, a table and downloads. A mini watershed in the list can be opened with one button (it fills
 *               District, DSD and MWS ID and presses Go).
 *           Nothing of the one-MWS way changes: Base Layers, Proposal, Climate, Data Catalog and Statistics are still unlocked by Go.
 * Depends : Leaflet, Chart.js, global `map`; from the other scripts, used only when present (each use is guarded): geoJsonLayers, layerState,
 *           layerLegends, loadGeoJsonLayer, loadGeoJsonLayerP, removeRoadDecorations, hiddenBaseLayers, resetLayersForMwsChange,
 *           setGatedButtonsEnabled, setSelectionStatus, hidePanel, clearFeatureSelection, Symbology.polygonStyleFor.
 *           Elements of index.html: #areaBtn, #areaHint, #areaLayersBtn, #areaStatsBtn, #areaLayersPanel, #areaStatPanel, #selectDist, #selectDSD,
 *           #selectMWSID, #goBtn. Styles: css/umw-enhancements.css.
 * Exposes : window.AreaExplorer { explore, exit, computeScope, firstMwsCode, goToMws, state }
 *
 * How the area is found: the mini watershed boundary file (the one the Data Catalog uses) says which District and which main DSD each
 * mini watershed belongs to. A mini watershed that crosses a DSD border belongs to its MAIN DSD only, so DSD totals are "by the main DSD of
 * each mini watershed", not clipped to the DSD line.
 * How a layer is drawn for the area: the layer lists of the mini watersheds (MWS_<id>/AllDataLayer_<id>.csv and PropLayers_<id>.csv) are
 * read; a layer is offered if any of them has it. Its files are fetched (6 at a time), joined into one collection and handed to the same
 * loader the Base Layers list uses (loadGeoJsonLayer / loadGeoJsonLayerP), so colours, markers, legends, click info and printing are the same.
 * A file that is shared by several mini watersheds (a catchment-wide file) is cut to the features that lie inside the area.
 * Raster layers (pictures) exist per mini watershed only and are not offered for an area.
 */

const AreaExplorer = (function () {
    'use strict';

    const DATA_ROOT = 'https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Data/EXD/';
    const BOUNDARY_URL = DATA_ROOT + 'UMW/MWS_Boundary_Updated_UMC_Names.geojson';
    const MAX_PARALLEL = 6;
    const OTHER_PANELS = ['basePanel', 'proposalPanel', 'climPanel', 'waterPanel', 'catalogPanel', 'statPanel', 'infoPanel', 'tablePanel', 'partnersPanel',
        'waterQualityStationPanel', 'attributePanel'];
    const AREA_PANELS = ['areaLayersPanel', 'areaStatPanel'];
    const MY_BUTTONS = ['areaBtn', 'areaLayersBtn', 'areaStatsBtn'];
    const PALETTE = ['#2e7d32', '#1565c0', '#ef6c00', '#6a1b9a', '#00838f', '#c62828', '#9e9d24', '#4527a0', '#ad1457', '#558b2f', '#37474f', '#f9a825'];
    const HAZARD_ORDER = ['very low', 'low', 'moderate', 'medium', 'high', 'very high', 'severe'];
    const EXCLUDED_LAYERS = ['environmental protection area'];     // its loader chooses the file from the one selected MWS

    const STAT_TABS = [
        { key: 'lulc', title: 'Land cover', find: /^land ?cover$/i, sym: 'Land cover', fields: ['classLULC', 'CLASS_LULC', 'class_lulc', 'LULC', 'Class', 'class'] },
        { key: 'hazard', title: 'Hazard', find: /landslide.*(hazard|zone)|hazard.*landslide/i, sym: 'Landslide hazard zone', fields: ['level', 'Level', 'LEVEL', 'Hazard', 'hazard', 'Class', 'class'] },
        { key: 'soil', title: 'Soil', find: /^soil ?type$/i, sym: 'Soil type', fields: ['NAME', 'Name', 'name', 'SOIL_TYPE', 'Soil_Type', 'Soil', 'soil'] },
        { key: 'pop', title: 'Population', find: /^population$/i, sym: 'Population' },
        { key: 'mws', title: 'Watersheds' }
    ];

    const $ = (id) => document.getElementById(id);
    const norm = (s) => String(s === null || s === undefined ? '' : s).trim().toLowerCase().replace(/\s+/g, ' ');
    const codeOf = (id) => String(id === null || id === undefined ? '' : id).trim().replace(/^mws[-_]?/i, '').replace(/-/g, '_');
    const fmt = (n, d) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: d === undefined ? 0 : d });
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const state = {
        boundaryPromise: null,
        infos: [],                  // every mini watershed: { code, id, district, dsd, feature, bbox }
        scope: null,                // { level: 'umc' | 'district' | 'dsd', label, members, polys }
        outline: null,
        generation: 0,              // bumps on every explore and exit; work of an older generation is dropped
        lists: null,                // { base: Map, prop: Map } of the layers of the area
        listsPromise: null,
        listsProgress: { done: 0, total: 0 },
        layerToken: {},
        active: new Set(),          // names of the layers drawn for the area
        cache: new Map(),
        statTab: 'lulc',
        statToken: 0,
        chart: null,
        statResult: null
    };

    /** Small element builder: text goes in as text, never as HTML. */
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

    // ------------------------------------------------------------------------------------------
    // Files
    // ------------------------------------------------------------------------------------------

    function rawUrl(url) {
        const u = String(url || '').trim();
        if (u.indexOf('github.com') !== -1 && u.indexOf('/blob/') !== -1) return u.replace('https://github.com/', 'https://raw.githubusercontent.com/').replace('/blob/', '/');
        return u;
    }
    const isGeoUrl = (u) => /\.(geo)?json(\?|#|$)/i.test(u);

    /** One request per address for the whole session of an area. A failed request is forgotten so it can be repeated. */
    function cached(url, kind) {
        const key = kind + '|' + url;
        if (!state.cache.has(key)) {
            const request = fetch(url).then((response) => {
                if (!response.ok) throw new Error('HTTP ' + response.status + ' for ' + url);
                return kind === 'json' ? response.json() : response.text();
            });
            state.cache.set(key, request);
            request.catch(() => { if (state.cache.get(key) === request) state.cache.delete(key); });
        }
        return state.cache.get(key);
    }

    /** Run worker(item) for every item, `limit` at a time. Stops starting new work when shouldStop() is true. */
    async function pool(items, limit, worker, shouldStop, onProgress) {
        const results = new Array(items.length);
        let next = 0, done = 0;
        async function run() {
            for (;;) {
                if (shouldStop && shouldStop()) return;
                const i = next++;
                if (i >= items.length) return;
                try { results[i] = await worker(items[i], i); } catch (e) { results[i] = undefined; }
                done++;
                if (onProgress) onProgress(done, items.length);
            }
        }
        await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
        return results;
    }

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
        const head = (filled[0] || []).map((x) => String(x).trim());
        return filled.slice(1).map((r) => { const o = {}; head.forEach((k, i) => { if (k) o[k] = r[i] === undefined ? '' : String(r[i]).trim(); }); return o; });
    }

    // ------------------------------------------------------------------------------------------
    // Geometry (small, for the outline and for cutting catchment-wide files to the area)
    // ------------------------------------------------------------------------------------------

    function eachPosition(coords, visit) {
        if (!Array.isArray(coords)) return;
        if (typeof coords[0] === 'number') { visit(coords); return; }
        coords.forEach((c) => eachPosition(c, visit));
    }

    function bboxOf(geometry) {
        const box = [Infinity, Infinity, -Infinity, -Infinity];
        if (geometry && geometry.type === 'GeometryCollection') {
            (geometry.geometries || []).forEach((g) => { const b = bboxOf(g); box[0] = Math.min(box[0], b[0]); box[1] = Math.min(box[1], b[1]); box[2] = Math.max(box[2], b[2]); box[3] = Math.max(box[3], b[3]); });
            return box;
        }
        eachPosition(geometry && geometry.coordinates, (p) => {
            if (p[0] < box[0]) box[0] = p[0]; if (p[1] < box[1]) box[1] = p[1];
            if (p[0] > box[2]) box[2] = p[0]; if (p[1] > box[3]) box[3] = p[1];
        });
        return box;
    }

    function polygonsOf(geometry) {
        if (!geometry) return [];
        if (geometry.type === 'Polygon') return [geometry.coordinates];
        if (geometry.type === 'MultiPolygon') return geometry.coordinates;
        return [];
    }

    function pointInRing(pt, ring) {
        let inside = false;
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
            const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
            if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) inside = !inside;
        }
        return inside;
    }

    function pointInPolygon(pt, rings) {
        if (!rings.length || !pointInRing(pt, rings[0])) return false;
        for (let i = 1; i < rings.length; i++) if (pointInRing(pt, rings[i])) return false;      // inside a hole
        return true;
    }

    function pointInScope(pt) {
        const polys = state.scope.polys;
        for (let i = 0; i < polys.length; i++) {
            const p = polys[i], b = p.bbox;
            if (pt[0] < b[0] || pt[0] > b[2] || pt[1] < b[1] || pt[1] > b[3]) continue;
            for (let k = 0; k < p.polygons.length; k++) if (pointInPolygon(pt, p.polygons[k])) return true;
        }
        return false;
    }

    /** True when a feature of a catchment-wide file belongs to the area: its bounding-box centre or its first position lies inside it. */
    function featureInScope(feature) {
        const g = feature && feature.geometry;
        if (!g) return false;
        let first = null;
        eachPosition(g.coordinates, (p) => { if (!first) first = p; });
        if (!first) return false;
        if (g.type === 'Point') return pointInScope(first);
        const b = bboxOf(g);
        return pointInScope([(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]) || pointInScope(first);
    }

    /** Area of a polygon feature in hectares from its coordinates (used only when the data has no area column). */
    function geometryHa(geometry) {
        let m2 = 0;
        polygonsOf(geometry).forEach((rings) => {
            rings.forEach((ring, index) => {
                const lat0 = ring.reduce((s, p) => s + p[1], 0) / Math.max(1, ring.length);
                const kx = 111320 * Math.cos((lat0 * Math.PI) / 180), ky = 110540;
                let a = 0;
                for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) a += (ring[j][0] * kx) * (ring[i][1] * ky) - (ring[i][0] * kx) * (ring[j][1] * ky);
                a = Math.abs(a) / 2;
                m2 += index === 0 ? a : -a;
            });
        });
        return Math.max(0, m2) / 10000;
    }

    // ------------------------------------------------------------------------------------------
    // The mini watersheds and the chosen area
    // ------------------------------------------------------------------------------------------

    function loadBoundary() {
        if (!state.boundaryPromise) {
            state.boundaryPromise = fetch(BOUNDARY_URL).then((response) => {
                if (!response.ok) throw new Error('Boundary file: HTTP ' + response.status);
                return response.json();
            }).then((gj) => {
                state.infos = (gj.features || []).filter((f) => f && f.geometry && f.properties).map((f) => {
                    const p = f.properties;
                    const id = p.MWS_ID || p.MWSID || p.MWD_ID || '';
                    return {
                        code: codeOf(id), id: String(id), feature: f, bbox: bboxOf(f.geometry),
                        district: String(p.District || p.DISTRICT || '').trim(), dsd: String(p.MainDSD || p.DSD || p.DS_Divisio || '').trim()
                    };
                }).filter((i) => i.code);
                return state.infos;
            });
            state.boundaryPromise.catch(() => { state.boundaryPromise = null; });
        }
        return state.boundaryPromise;
    }

    /** The texts of a drop-down: its value and the visible text (they can differ), empty for "Select ...". */
    function chosen(id) {
        const select = $(id);
        if (!select || !select.value) return [];
        const option = select.options[select.selectedIndex];
        return [select.value, option ? option.text : ''].map((t) => String(t).trim()).filter(Boolean);
    }

    function computeScope() {
        const dist = chosen('selectDist'), dsd = chosen('selectDSD');
        const is = (names, value) => names.some((n) => norm(n) === norm(value));
        let level = 'umc', label = 'the whole UMW', members = state.infos.slice();
        if (dsd.length) {
            level = 'dsd';
            label = dsd[dsd.length - 1] + ' DSD';
            members = state.infos.filter((i) => is(dsd, i.dsd) && (!dist.length || is(dist, i.district)));
        } else if (dist.length) {
            level = 'district';
            label = dist[dist.length - 1] + ' District';
            members = state.infos.filter((i) => is(dist, i.district));
        }
        const polys = members.map((m) => ({ bbox: m.bbox, polygons: polygonsOf(m.feature.geometry) }));
        return { level: level, label: label, members: members, polys: polys };
    }

    const plural = (n, word) => n + ' ' + word + (n === 1 ? '' : 's');
    const scopeText = () => state.scope.label + ', ' + plural(state.scope.members.length, 'mini watershed');

    function setHint(text) { const el = $('areaHint'); if (el) el.textContent = text || ''; }

    function refreshHint() {
        if (!state.infos.length) return;
        const scope = computeScope();
        setHint(scope.members.length ? 'Explore area: ' + scope.label + ', ' + plural(scope.members.length, 'mini watershed') : 'No mini watersheds were found for this choice.');
    }

    function setStatus(text, kind) {
        if (typeof setSelectionStatus === 'function') setSelectionStatus(text, kind || '');
        else { const el = $('selectionStatus'); if (el) el.textContent = text; }
    }

    function firstMwsCode() {
        return state.scope && state.scope.members.length ? state.scope.members[0].code : '';
    }

    // ------------------------------------------------------------------------------------------
    // Entering and leaving the area view
    // ------------------------------------------------------------------------------------------

    function hideById(id) {
        if (typeof hidePanel === 'function') hidePanel(id);
        else { const el = $(id); if (el) el.style.display = 'none'; }
    }

    function hideAreaPanels() { AREA_PANELS.forEach(hideById); }

    function enableButtons(enabled) {
        ['areaLayersBtn', 'areaStatsBtn'].forEach((id) => {
            const b = $(id);
            if (!b) return;
            b.disabled = !enabled;
            if (enabled) b.removeAttribute('title'); else b.title = 'Press Explore area first';
            if (!enabled) b.classList.remove('active');
        });
    }

    function removeLayerQuiet(name) {
        try {
            if (typeof geoJsonLayers !== 'undefined' && geoJsonLayers[name]) {
                map.removeLayer(geoJsonLayers[name]);
                if (typeof removeRoadDecorations === 'function') removeRoadDecorations(name);
                delete geoJsonLayers[name];
            }
            if (typeof layerLegends !== 'undefined' && layerLegends[name]) {
                map.removeControl(layerLegends[name]);
                delete layerLegends[name];
            }
            if (typeof layerState !== 'undefined') layerState[name] = false;
        } catch (e) { /* the map may already have removed it */ }
    }

    function clearArea() {
        state.active.forEach(removeLayerQuiet);
        state.active.clear();
        state.layerToken = {};
        if (state.outline) { try { map.removeLayer(state.outline); } catch (e) { /* ignore */ } state.outline = null; }
        if (state.chart) { try { state.chart.destroy(); } catch (e) { /* ignore */ } state.chart = null; }
        hideAreaPanels();
    }

    /** Leave the area view (a new District, DSD or MWS was chosen, or Go was pressed). */
    function exit() {
        state.generation++;
        state.statToken++;
        clearArea();
        enableButtons(false);
        state.scope = null;
        state.lists = null;
        state.listsPromise = null;
        state.statResult = null;
        state.cache.clear();
    }

    /** The one-MWS view is switched off while an area is shown: its layers are cleared and its buttons locked until Go is pressed again. */
    function leaveMwsView() {
        try { if (typeof window.resetLayersForMwsChange === 'function') window.resetLayersForMwsChange(); } catch (e) { console.error(e); }
        if (typeof setGatedButtonsEnabled === 'function') setGatedButtonsEnabled(false);
        OTHER_PANELS.forEach(hideById);
        const popup = $('infoPopupPanel');
        if (popup) { popup.style.display = 'none'; popup.innerHTML = ''; }
        document.querySelectorAll('header .button').forEach((b) => b.classList.remove('active'));
        if (typeof activePanel !== 'undefined') activePanel = null;           // ui-panels.js: no standard panel is open
    }

    async function explore() {
        setHint('Loading the mini watershed boundaries...');
        try { await loadBoundary(); } catch (error) {
            console.error('Area explorer: boundaries could not be loaded', error);
            setHint('The mini watershed boundaries could not be loaded. Check the connection and try again.');
            return;
        }
        const scope = computeScope();
        if (!scope.members.length) { setHint('No mini watersheds were found for this choice.'); return; }
        leaveMwsView();
        state.generation++;
        state.statToken++;
        clearArea();
        state.cache.clear();
        state.scope = scope;
        state.lists = null;
        state.statResult = null;
        drawOutline();
        enableButtons(true);
        setStatus('Showing ' + scopeText() + '. Use Area Layers or Area Statistics above.', 'ready');
        setHint('');                      // the status line already says what is shown
        startLists();
    }

    function drawOutline() {
        const layer = L.geoJSON(state.scope.members.map((m) => m.feature), {
            style: { color: '#0b3d91', weight: 2, opacity: 0.9, fillColor: '#0b3d91', fillOpacity: 0.04, dashArray: '6 4' },
            interactive: false
        }).addTo(map);
        state.outline = layer;
        try { map.fitBounds(layer.getBounds(), { padding: [24, 24] }); } catch (e) { /* nothing to zoom to */ }
        layer.bringToBack();
    }

    // ------------------------------------------------------------------------------------------
    // Opening and closing the two panels
    // ------------------------------------------------------------------------------------------

    function showPanel(panelId, buttonId) {
        OTHER_PANELS.concat(AREA_PANELS).forEach((id) => { if (id !== panelId) hideById(id); });
        if (typeof window.setMeasureModeActive === 'function') window.setMeasureModeActive(false);
        if (typeof window.clearFeatureSelection === 'function') window.clearFeatureSelection();
        const panel = $(panelId);
        panel.style.display = 'block';
        panel.style.left = ''; panel.style.right = ''; panel.style.top = ''; panel.style.transform = '';
        document.querySelectorAll('header .button').forEach((b) => b.classList.remove('active'));
        const button = $(buttonId);
        if (button) button.classList.add('active');
        if (typeof activePanel !== 'undefined') activePanel = null;
    }

    function togglePanel(panelId, buttonId, render) {
        const panel = $(panelId);
        if (!panel || !state.scope) return;
        if (panel.style.display === 'block') { hideById(panelId); const b = $(buttonId); if (b) b.classList.remove('active'); return; }
        showPanel(panelId, buttonId);
        render();
    }

    // ------------------------------------------------------------------------------------------
    // The layers of the area
    // ------------------------------------------------------------------------------------------

    async function listRows(code, prefix) {
        try { return parseCsv(await cached(DATA_ROOT + 'MWS_' + code + '/' + prefix + code + '.csv', 'text')); } catch (e) { return []; }
    }

    function addRows(map_, member, rows, groups) {
        (rows || []).forEach((row) => {
            const group = String(row.Group || '').trim();
            const name = String(row.Layer || '').trim();
            const url = rawUrl(row.geojson);
            if (groups.indexOf(group) === -1 || !name || !url || !isGeoUrl(url)) return;
            const key = norm(name);
            if (EXCLUDED_LAYERS.indexOf(key) !== -1) return;
            if (typeof hiddenBaseLayers !== 'undefined' && hiddenBaseLayers.has && hiddenBaseLayers.has(key)) return;
            let entry = map_.get(key);
            if (!entry) {
                entry = { name: name, database: String(row.Database || '').trim() || 'Other', group: group, items: [] };
                map_.set(key, entry);
            }
            entry.items.push({ code: member.code, url: url });
        });
    }

    function startLists() {
        const generation = state.generation;
        const members = state.scope.members;
        state.listsProgress = { done: 0, total: members.length };
        state.listsPromise = (async () => {
            const results = await pool(members, MAX_PARALLEL, async (member) => {
                const both = await Promise.all([listRows(member.code, 'AllDataLayer_'), listRows(member.code, 'PropLayers_')]);
                return { member: member, base: both[0], prop: both[1] };
            }, () => generation !== state.generation, (done, total) => {
                state.listsProgress = { done: done, total: total };
                const note = document.querySelector('#areaLayersPanel [data-role="progress"]');
                if (note) note.textContent = 'Reading the layer lists: ' + done + ' of ' + total + ' mini watersheds...';
            });
            if (generation !== state.generation) return null;
            const base = new Map(), prop = new Map();
            results.forEach((r) => { if (!r) return; addRows(base, r.member, r.base, ['Base']); addRows(prop, r.member, r.prop, ['Proposal']); });
            state.lists = { base: base, prop: prop };
            const panel = $('areaLayersPanel');
            if (panel && panel.style.display === 'block') renderLayersPanel();
            return state.lists;
        })();
        return state.listsPromise;
    }

    function renderLayersPanel() {
        const panel = $('areaLayersPanel');
        if (!panel || !state.scope) return;
        panel.textContent = '';
        panel.appendChild(h('button', { class: 'hide-btn', type: 'button', text: 'Close', onclick: () => { hideById('areaLayersPanel'); const b = $('areaLayersBtn'); if (b) b.classList.remove('active'); } }));
        panel.appendChild(h('h3', { class: 'panel-title area-title', text: 'Area layers' }));
        panel.appendChild(h('p', { class: 'area-sub', text: scopeText() }));
        if (!state.lists) {
            panel.appendChild(h('p', { class: 'panel-note', 'data-role': 'progress', text: 'Reading the layer lists: ' + state.listsProgress.done + ' of ' + state.listsProgress.total + ' mini watersheds...' }));
            return;
        }
        const groups = new Map();            // heading -> entries
        state.lists.base.forEach((e) => { if (!groups.has(e.database)) groups.set(e.database, []); groups.get(e.database).push(e); });
        state.lists.prop.forEach((e) => { const heading = 'Proposal: ' + e.database; if (!groups.has(heading)) groups.set(heading, []); groups.get(heading).push(e); });
        if (!groups.size) {
            panel.appendChild(h('p', { class: 'panel-note', text: 'No layers were found for the mini watersheds of this area.' }));
            return;
        }
        let n = 0;
        groups.forEach((entries, heading) => {
            const category = h('div', {}, [h('h3', { text: heading })]);
            entries.forEach((entry) => {
                const id = 'area_layer_' + (n++);
                const status = h('span', { class: 'area-status', role: 'status' });
                const box = h('input', { type: 'checkbox', id: id });
                box.checked = state.active.has(entry.name);
                box.addEventListener('change', () => {
                    if (box.checked) loadLayer(entry, box, status); else removeLayer(entry.name, status);
                });
                category.appendChild(h('div', { class: 'area-row' }, [box, h('label', { for: id, text: entry.name }), status]));
            });
            panel.appendChild(category);
        });
        panel.appendChild(h('p', { class: 'panel-note area-note', text: 'Pictures (raster layers) exist for one mini watershed at a time: choose the mini watershed and press Go to see them.' }));
    }

    function removeLayer(name, status) {
        state.layerToken[name] = (state.layerToken[name] || 0) + 1;        // stops a layer that is still loading
        removeLayerQuiet(name);
        state.active.delete(name);
        if (status) { status.textContent = ''; status.removeAttribute('title'); }
    }

    function waitFor(test, ms) {
        return new Promise((resolve) => {
            const started = Date.now();
            (function poll() {
                let value; try { value = test(); } catch (e) { value = null; }
                if (value) resolve(value);
                else if (Date.now() - started > ms) resolve(null);
                else setTimeout(poll, 40);
            })();
        });
    }

    /** The features of one fetched file, ready for the area: tagged with their MWS_ID, cut to the area when the file is catchment-wide. */
    function featuresOfFile(data, url, codes, shared) {
        const list = !data ? [] : data.type === 'FeatureCollection' ? (data.features || []) : data.type === 'Feature' ? [data] : [];
        const cut = shared && state.scope.level !== 'umc';
        const out = [];
        list.forEach((f) => {
            if (!f || !f.geometry) return;
            if (cut && !featureInScope(f)) return;
            const properties = Object.assign({}, f.properties || {});
            if (!shared && codes.length === 1 && !('MWS_ID' in properties) && !('MWSID' in properties)) properties.MWS_ID = 'MWS_' + codes[0];
            out.push({ type: 'Feature', properties: properties, geometry: f.geometry });
        });
        return out;
    }

    function sharedUrls(entry) {
        const count = new Map();
        entry.items.forEach((i) => count.set(i.url, (count.get(i.url) || 0) + 1));
        return new Set(Array.from(count).filter((c) => c[1] > 1).map((c) => c[0]));
    }

    async function loadLayer(entry, box, status) {
        const name = entry.name;
        const token = (state.layerToken[name] = (state.layerToken[name] || 0) + 1);
        const generation = state.generation;
        const stale = () => token !== state.layerToken[name] || generation !== state.generation;
        const urls = Array.from(new Set(entry.items.map((i) => i.url)));
        const codesByUrl = new Map();
        entry.items.forEach((i) => { if (!codesByUrl.has(i.url)) codesByUrl.set(i.url, []); codesByUrl.get(i.url).push(i.code); });
        const shared = sharedUrls(entry);
        if (typeof layerState !== 'undefined') layerState[name] = true;
        status.textContent = '0/' + urls.length;
        status.title = urls.length > 30 ? 'This layer needs ' + urls.length + ' files: it can take a while.' : '';
        const files = await pool(urls, MAX_PARALLEL, (url) => cached(url, 'json'), stale, (done, total) => { if (!stale()) status.textContent = done + '/' + total; });
        if (stale()) return;
        const features = [];
        let missing = 0;
        urls.forEach((url, i) => {
            if (!files[i]) { missing++; return; }
            featuresOfFile(files[i], url, codesByUrl.get(url), shared.has(url)).forEach((f) => features.push(f));
        });
        const fail = (message) => {
            box.checked = false;
            if (typeof layerState !== 'undefined') layerState[name] = false;
            status.textContent = message;
            status.title = missing ? missing + ' of ' + urls.length + ' files could not be read.' : '';
        };
        if (!features.length) { fail(missing === urls.length ? 'could not be loaded' : 'no data in this area'); return; }
        const loader = entry.group === 'Proposal' ? (typeof loadGeoJsonLayerP === 'function' ? loadGeoJsonLayerP : null) : (typeof loadGeoJsonLayer === 'function' ? loadGeoJsonLayer : null);
        if (!loader || typeof geoJsonLayers === 'undefined') { console.error('Area explorer: the layer loader is not available'); fail('could not be drawn'); return; }
        const blobUrl = URL.createObjectURL(new Blob([JSON.stringify({ type: 'FeatureCollection', features: features })], { type: 'application/json' }));
        try { loader(blobUrl, name); } catch (error) { console.error(error); URL.revokeObjectURL(blobUrl); fail('could not be drawn'); return; }
        const drawn = await waitFor(() => geoJsonLayers[name], 10000);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
        if (stale()) { if (drawn) removeLayerQuiet(name); return; }
        if (!drawn) { fail('could not be drawn'); return; }
        state.active.add(name);
        status.textContent = '';
        status.title = missing ? missing + ' of ' + urls.length + ' files could not be read.' : '';
        if (missing) status.textContent = '(' + missing + ' missing)';
    }

    // ------------------------------------------------------------------------------------------
    // Statistics of the area
    // ------------------------------------------------------------------------------------------

    function statTab(key) { return STAT_TABS.find((t) => t.key === key) || STAT_TABS[0]; }

    function findEntry(tab) {
        if (!state.lists || !tab.find) return null;
        let found = null;
        state.lists.base.forEach((e) => { if (!found && tab.find.test(e.name)) found = e; });
        return found;
    }

    function pickField(features, candidates) {
        for (const name of candidates) {
            for (let i = 0; i < Math.min(features.length, 50); i++) {
                const p = features[i].properties || {};
                if (Object.prototype.hasOwnProperty.call(p, name)) return name;
            }
        }
        return '';
    }

    function pickFieldBy(features, pattern) {
        for (let i = 0; i < Math.min(features.length, 50); i++) {
            const name = Object.keys(features[i].properties || {}).find((k) => pattern.test(k));
            if (name) return name;
        }
        return '';
    }

    function areaHa(feature) {
        const p = feature.properties || {};
        const name = Object.keys(p).find((k) => /^area[\s_]*(ha|_ha_?)$/i.test(k.replace(/_+$/, '')) || /^area__ha_?$/i.test(k));
        if (name !== undefined) {
            const v = Number(String(p[name]).replace(/,/g, ''));
            if (Number.isFinite(v) && v >= 0) return v;
        }
        return geometryHa(feature.geometry);
    }

    function colorFor(tab, name, index) {
        try {
            if (window.Symbology && typeof window.Symbology.polygonStyleFor === 'function' && tab.fieldUsed) {
                const props = {}; props[tab.fieldUsed] = name;
                const style = window.Symbology.polygonStyleFor(tab.sym, props);
                const c = style && (style.fillColor || style.color);
                if (c) return c;
            }
        } catch (e) { /* use the palette */ }
        return PALETTE[index % PALETTE.length];
    }

    async function fetchAll(entry, token, onProgress) {
        const urls = Array.from(new Set(entry.items.map((i) => i.url)));
        const codesByUrl = new Map();
        entry.items.forEach((i) => { if (!codesByUrl.has(i.url)) codesByUrl.set(i.url, []); codesByUrl.get(i.url).push(i.code); });
        const shared = sharedUrls(entry);
        const files = await pool(urls, MAX_PARALLEL, (url) => cached(url, 'json'), () => token !== state.statToken, onProgress);
        return urls.map((url, i) => ({ url: url, codes: codesByUrl.get(url), data: files[i], features: files[i] ? featuresOfFile(files[i], url, codesByUrl.get(url), shared.has(url)) : null }));
    }

    async function computeClassStat(tab, entry, token, onProgress) {
        const files = await fetchAll(entry, token, onProgress);
        if (token !== state.statToken) return null;
        const all = [];
        files.forEach((f) => { if (f.features) f.features.forEach((x) => all.push(x)); });
        tab.fieldUsed = pickField(all, tab.fields);
        const sums = new Map();
        let total = 0;
        all.forEach((f) => {
            let cls = tab.fieldUsed ? (f.properties || {})[tab.fieldUsed] : undefined;
            cls = cls === null || cls === undefined || String(cls).trim() === '' || String(cls).toLowerCase() === 'null' ? 'Unclassified' : String(cls).trim();
            const ha = areaHa(f);
            sums.set(cls, (sums.get(cls) || 0) + ha);
            total += ha;
        });
        let rows = Array.from(sums).map((s) => ({ name: s[0], value: s[1], pct: total ? (s[1] / total) * 100 : 0 }));
        if (tab.key === 'hazard' && rows.every((r) => HAZARD_ORDER.indexOf(norm(r.name)) !== -1 || r.name === 'Unclassified')) {
            rows.sort((a, b) => HAZARD_ORDER.indexOf(norm(a.name)) - HAZARD_ORDER.indexOf(norm(b.name)));
        } else rows.sort((a, b) => b.value - a.value);
        rows = rows.map((r, i) => Object.assign(r, { color: colorFor(tab, r.name, i) }));
        if (rows.length > 1 && new Set(rows.map((r) => r.color)).size === 1) rows.forEach((r, i) => { r.color = PALETTE[i % PALETTE.length]; });
        const withData = files.reduce((n, f) => n + (f.features ? f.codes.length : 0), 0);
        return { kind: 'area', tab: tab, rows: rows, total: total, unit: 'ha', valueLabel: 'Area (ha)', files: files.length, withData: withData };
    }

    async function computePopStat(tab, entry, token, onProgress) {
        const files = await fetchAll(entry, token, onProgress);
        if (token !== state.statToken) return null;
        const all = [];
        files.forEach((f) => { if (f.features) f.features.forEach((x) => all.push(x)); });
        const field = pickFieldBy(all, /^(total_?pop(ulation)?|population|pop_?total|tot_?pop|popn|pop)$/i);
        if (!field) return { kind: 'note', tab: tab, note: 'The population layer of this area has no recognised population column, so no total can be added up.' };
        const byCode = new Map();
        files.forEach((f) => {
            if (!f.features) return;
            const sum = f.features.reduce((s, x) => { const v = Number(String((x.properties || {})[field]).replace(/,/g, '')); return s + (Number.isFinite(v) ? v : 0); }, 0);
            const code = f.codes.length === 1 ? f.codes[0] : '';
            byCode.set(code || f.url, (byCode.get(code || f.url) || 0) + sum);
        });
        const total = Array.from(byCode.values()).reduce((a, b) => a + b, 0);
        const named = Array.from(byCode).map((e) => {
            const info = state.infos.find((i) => i.code === e[0]);
            return { name: info ? 'MWS ' + info.id.replace(/^mws[-_]?/i, '') + (info.dsd ? ' (' + info.dsd + ')' : '') : String(e[0]).split('/').pop(), value: e[1] };
        }).sort((a, b) => b.value - a.value);
        const top = named.slice(0, 10);
        const rest = named.slice(10).reduce((s, r) => s + r.value, 0);
        if (rest > 0) top.push({ name: 'Other mini watersheds (' + (named.length - 10) + ')', value: rest });
        const rows = top.map((r, i) => ({ name: r.name, value: r.value, pct: total ? (r.value / total) * 100 : 0, color: PALETTE[i % PALETTE.length] }));
        return { kind: 'pop', tab: tab, rows: rows, total: total, unit: 'people', valueLabel: 'Population', files: files.length, withData: files.filter((f) => f.features).length };
    }

    function renderStatShell() {
        const panel = $('areaStatPanel');
        panel.textContent = '';
        const tabs = h('div', { class: 'stat-tabs', role: 'group', 'aria-label': 'Statistics topic' });
        STAT_TABS.forEach((t) => {
            tabs.appendChild(h('button', {
                class: 'tab' + (t.key === state.statTab ? ' active' : ''), type: 'button', 'data-tab': t.key, text: t.title,
                onclick: () => { state.statTab = t.key; tabs.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.getAttribute('data-tab') === t.key)); showStat(); }
            }));
        });
        panel.appendChild(h('div', { class: 'stat-card' }, [
            h('div', { class: 'stat-head' }, [
                h('div', { class: 'stat-headtext' }, [h('h3', { class: 'stat-title', text: 'Area statistics' }), h('p', { class: 'stat-sub', text: scopeText() })]),
                h('button', { class: 'hide-btn', type: 'button', text: 'Close', onclick: () => { hideById('areaStatPanel'); const b = $('areaStatsBtn'); if (b) b.classList.remove('active'); } })
            ]),
            tabs,
            h('p', { class: 'stat-progress', 'data-role': 'stat-progress', role: 'status' }),
            h('p', { class: 'stat-summary', 'data-role': 'stat-summary' }),
            h('div', { class: 'stat-chart', 'data-role': 'stat-chart' }, [h('canvas', { id: 'areaScopeChart' })]),
            h('div', { class: 'stat-table', 'data-role': 'stat-table' }),
            h('div', { class: 'stat-actions', 'data-role': 'stat-actions' }, [
                h('button', { type: 'button', 'data-act': 'csv', text: 'Download CSV', onclick: downloadCsv }),
                h('button', { type: 'button', 'data-act': 'png', text: 'Download Chart as Image', onclick: downloadPng })
            ])
        ]));
    }

    const part = (role) => document.querySelector('#areaStatPanel [data-role="' + role + '"]');

    function setProgress(text) { const el = part('stat-progress'); if (el) el.textContent = text || ''; }

    function destroyChart() { if (state.chart) { try { state.chart.destroy(); } catch (e) { /* ignore */ } state.chart = null; } }

    function drawChart(result) {
        destroyChart();
        const canvas = $('areaScopeChart');
        if (!canvas || typeof Chart === 'undefined' || !result.rows.length) return;
        state.chart = new Chart(canvas, {
            type: result.kind === 'pop' ? 'doughnut' : 'pie',
            data: { labels: result.rows.map((r) => r.name), datasets: [{ data: result.rows.map((r) => r.value), backgroundColor: result.rows.map((r) => r.color), borderColor: '#ffffff', borderWidth: 1 }] },
            options: {
                responsive: true, maintainAspectRatio: false, animation: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: (ctx) => ' ' + ctx.label + ': ' + fmt(ctx.parsed, 1) + ' ' + result.unit + ' (' + (result.total ? fmt((ctx.parsed / result.total) * 100, 1) : '0') + '%)' } }
                }
            }
        });
    }

    function renderTable(result) {
        const box = part('stat-table');
        box.textContent = '';
        if (!result.rows.length) return;
        const table = h('table', { class: 'stat-legend-table' });
        table.appendChild(h('thead', {}, [h('tr', {}, [h('th', { text: result.kind === 'pop' ? 'Mini watershed' : 'Class' }), h('th', { class: 'num', text: result.valueLabel }), h('th', { class: 'num', text: '%' })])]));
        const body = h('tbody');
        result.rows.forEach((r) => {
            body.appendChild(h('tr', {}, [
                h('td', {}, [h('span', { class: 'stat-swatch', style: 'background:' + r.color }), r.name]),
                h('td', { class: 'num', text: fmt(r.value, result.kind === 'pop' ? 0 : 1) }),
                h('td', { class: 'num', text: fmt(r.pct, 1) })
            ]));
        });
        table.appendChild(body);
        box.appendChild(table);
    }

    function renderMwsTable() {
        const box = part('stat-table');
        box.textContent = '';
        const members = state.scope.members.slice().sort((a, b) => a.dsd.localeCompare(b.dsd) || a.id.localeCompare(b.id, undefined, { numeric: true }));
        const table = h('table', { class: 'stat-legend-table' });
        table.appendChild(h('thead', {}, [h('tr', {}, [h('th', { text: 'Mini watershed' }), h('th', { text: 'Main DSD' }), h('th', { text: 'District' }), h('th', { text: '' })])]));
        const body = h('tbody');
        members.forEach((m) => {
            body.appendChild(h('tr', {}, [
                h('td', { text: m.id.replace(/^mws[-_]?/i, 'MWS ') }), h('td', { text: m.dsd }), h('td', { text: m.district }),
                h('td', {}, [h('button', { type: 'button', class: 'stat-open', text: 'Open', title: 'Show this mini watershed (fills District, DSD and MWS ID and presses Go)', onclick: () => goToMws(m.code) })])
            ]));
        });
        table.appendChild(body);
        box.appendChild(table);
    }

    async function showStat() {
        if (!state.scope) return;
        const token = ++state.statToken;
        const tab = statTab(state.statTab);
        const actions = part('stat-actions'), chartBox = part('stat-chart'), summary = part('stat-summary');
        state.statResult = null;
        destroyChart();
        part('stat-table').textContent = '';
        summary.textContent = '';
        if (tab.key === 'mws') {
            chartBox.hidden = true; actions.hidden = true;
            setProgress('');
            summary.textContent = plural(state.scope.members.length, 'mini watershed') + ' in ' + state.scope.label + '. Press Open to work on one of them.';
            renderMwsTable();
            return;
        }
        chartBox.hidden = false; actions.hidden = false;
        setProgress('Reading the layer lists...');
        if (!state.lists) await state.listsPromise;
        if (token !== state.statToken || !state.lists) return;
        const entry = findEntry(tab);
        if (!entry) { setProgress('The ' + tab.title.toLowerCase() + ' layer was not found in the mini watersheds of this area.'); return; }
        setProgress('Reading 0 of ' + new Set(entry.items.map((i) => i.url)).size + ' files...');
        const onProgress = (done, total) => { if (token === state.statToken) setProgress('Reading ' + done + ' of ' + total + ' files...'); };
        let result = null;
        try { result = tab.key === 'pop' ? await computePopStat(tab, entry, token, onProgress) : await computeClassStat(tab, entry, token, onProgress); } catch (error) {
            console.error('Area statistics failed', error);
            if (token === state.statToken) setProgress('The statistics could not be calculated.');
            return;
        }
        if (!result || token !== state.statToken) return;
        setProgress('');
        if (result.kind === 'note') { summary.textContent = result.note; chartBox.hidden = true; actions.hidden = true; return; }
        if (!result.rows.length) { setProgress('No data was found in the files of this area.'); chartBox.hidden = true; actions.hidden = true; return; }
        state.statResult = result;
        const where = state.scope.members.length;
        summary.textContent = result.kind === 'pop'
            ? 'Total population ' + fmt(result.total) + ' in ' + plural(result.withData, 'file') + ' of ' + plural(result.files, 'file') + '.'
            : 'Total area ' + fmt(result.total) + ' ha (' + fmt(result.total / 100, 1) + ' km2) from ' + result.withData + ' of ' + plural(where, 'mini watershed') + (result.withData < where ? ' (the others have no file for this layer)' : '') + '.';
        drawChart(result);
        renderTable(result);
    }

    function renderStatsPanel() {
        if (!state.scope) return;
        renderStatShell();
        showStat();
    }

    function download(blob, name) {
        const href = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = href; a.download = name;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(href), 1500);
    }

    const fileStem = () => (state.scope ? state.scope.label : 'area').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

    function downloadCsv() {
        const r = state.statResult;
        if (!r) return;
        const q = (v) => '"' + String(v).replace(/"/g, '""') + '"';
        const lines = [[r.kind === 'pop' ? 'Mini watershed' : 'Class', r.valueLabel, 'Percent'].map(q).join(',')];
        r.rows.forEach((x) => lines.push([q(x.name), x.value.toFixed(r.kind === 'pop' ? 0 : 2), x.pct.toFixed(2)].join(',')));
        lines.push([q('Total'), r.total.toFixed(r.kind === 'pop' ? 0 : 2), '100'].join(','));
        download(new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), fileStem() + '_' + r.tab.key + '.csv');
    }

    function downloadPng() {
        const canvas = $('areaScopeChart');
        if (!canvas || !state.statResult) return;
        canvas.toBlob((blob) => { if (blob) download(blob, fileStem() + '_' + state.statResult.tab.key + '.png'); }, 'image/png');
    }

    // ------------------------------------------------------------------------------------------
    // Open one mini watershed of the area in the normal view
    // ------------------------------------------------------------------------------------------

    function setSelect(id, wanted) {
        const select = $(id);
        if (!select) return false;
        const option = Array.from(select.options).find((o) => o.value && (norm(o.value) === norm(wanted) || norm(o.text) === norm(wanted) || codeOf(o.value) === codeOf(wanted)));
        if (!option) return false;
        select.value = option.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
    }

    async function goToMws(code) {
        const info = state.infos.find((i) => i.code === code);
        if (!info) return;
        // choosing a drop-down leaves the area view, so everything needed is read first
        const steps = [['selectDist', info.district], ['selectDSD', info.dsd], ['selectMWSID', info.id]];
        for (const [id, value] of steps) {
            let ok = false;
            for (let tries = 0; tries < 10 && !ok; tries++) { ok = setSelect(id, value) || (id === 'selectMWSID' && setSelect(id, code)); if (!ok) await delay(80); }
            if (!ok) { setStatus('Could not select ' + value + ' automatically. Please choose it in the lists above.', ''); return; }
            await delay(60);
        }
        const go = $('goBtn');
        if (go && !go.disabled) go.click();
    }

    // ------------------------------------------------------------------------------------------
    // Start
    // ------------------------------------------------------------------------------------------

    /** The subtitle of the one-mini-watershed Statistics window: which mini watershed it is about (set when Go is pressed). */
    function updateStatSubtitle() {
        const el = $('statSubtitle');
        if (!el) return;
        const text = (id) => { const s = $(id); const o = s && s.value ? s.options[s.selectedIndex] : null; return o ? o.text.trim() : ''; };
        const mws = text('selectMWSID'), dsd = text('selectDSD'), dist = text('selectDist');
        el.textContent = mws ? 'Mini watershed ' + mws + (dsd ? ' \u00b7 ' + dsd + ' DSD' : '') + (dist ? ' \u00b7 ' + dist + ' District' : '') : 'Selected mini watershed';
    }

    function start() {
        const areaBtn = $('areaBtn');
        if (!areaBtn) return;
        areaBtn.addEventListener('click', explore);
        const layersBtn = $('areaLayersBtn'), statsBtn = $('areaStatsBtn');
        if (layersBtn) layersBtn.addEventListener('click', () => togglePanel('areaLayersPanel', 'areaLayersBtn', renderLayersPanel));
        if (statsBtn) statsBtn.addEventListener('click', () => togglePanel('areaStatPanel', 'areaStatsBtn', renderStatsPanel));
        ['selectDist', 'selectDSD', 'selectMWSID'].forEach((id) => {
            const el = $(id);
            if (el) el.addEventListener('change', () => { if (state.scope) exit(); setTimeout(refreshHint, 40); });
        });
        const go = $('goBtn');
        if (go) go.addEventListener('click', () => { if (state.scope) exit(); }, true);
        if (go) go.addEventListener('click', () => setTimeout(updateStatSubtitle, 0));
        // any normal toolbar button closes the area panels (the layers stay on the map)
        document.querySelectorAll('header .button').forEach((b) => {
            if (MY_BUTTONS.indexOf(b.id) === -1) b.addEventListener('click', () => { if (state.scope) hideAreaPanels(); }, true);
        });
        loadBoundary().then(refreshHint).catch((error) => { console.error('Area explorer: boundaries could not be loaded', error); });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();

    return { explore: explore, exit: exit, computeScope: computeScope, firstMwsCode: firstMwsCode, goToMws: goToMws, state: state };
})();

window.AreaExplorer = AreaExplorer;
