/**
 * Data catalog: page
 *
 * Purpose : The catalog screen. Choose District / DSD / MWS, browse the layers of that mini watershed
 *           (searchable list), preview a layer (map, table or image) and read its metadata card.
 *           A GeoJSON layer that has a KML copy gets a "Download KML" button next to the GeoJSON download.
 * Depends : Leaflet, SheetJS (XLSX), symbology.js, catalog-data.js, catalog-metadata.js.
 * Exposes : (page script) downloadFile()
 */

(function () {
    'use strict';

    const BOUNDARY_URL = 'https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Data/EXD/UMW/MWS_Boundary_Updated_UMC_Names.geojson';
    const REGISTRY_BASE = 'https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Registry/DBMS_';
    const MAX_TABLE_ROWS = 500;

    const state = {
        files: [],
        grouped: {},
        buttons: new Map(),       // registry row -> its button in the list
        selected: null,
        registryRequest: 0,
        loadToken: 0,             // ignores slow answers for a layer the user has already left
        map: null,
        baseLayers: null,
        dataLayer: null,
        legend: null
    };

    const $ = (id) => document.getElementById(id);
    const esc = CatalogMeta.esc;
    const icon = CatalogMeta.icon;

    // ------------------------------------------------------------------------------------------
    // Small DOM helper
    // ------------------------------------------------------------------------------------------

    function h(tag, attrs, children) {
        const el = document.createElement(tag);
        Object.keys(attrs || {}).forEach(k => {
            if (k === 'class') el.className = attrs[k];
            else if (k === 'html') el.innerHTML = attrs[k];
            else if (k === 'text') el.textContent = attrs[k];
            else if (k.indexOf('on') === 0) el.addEventListener(k.slice(2), attrs[k]);
            else if (attrs[k] !== false && attrs[k] !== null && attrs[k] !== undefined) el.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
        });
        (children || []).forEach(c => { if (c) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
        return el;
    }

    // ------------------------------------------------------------------------------------------
    // Which panel of the preview area is visible
    // ------------------------------------------------------------------------------------------

    function showStage(which) {
        $('preview-empty').hidden = which !== 'empty';
        $('map').hidden = which !== 'map';
        $('table-preview').hidden = which !== 'table';
        $('image-preview-wrap').hidden = which !== 'image';
        if (which === 'map' && state.map) setTimeout(() => state.map.invalidateSize(), 0);
    }

    function setPreviewBar(name, kind, note, tools) {
        const bar = $('preview-bar');
        bar.innerHTML = '';
        const title = h('div', { class: 'preview-title' }, [
            h('div', { class: 'preview-name' }, [h('span', { html: icon(kind || 'layers', 18) }), h('span', { text: name || 'Preview' })]),
            note ? h('div', { class: 'preview-note', text: note }) : null
        ]);
        bar.appendChild(title);
        if (tools) {
            const wrap = h('div', { class: 'preview-tools' });
            tools.forEach(t => wrap.appendChild(t));
            bar.appendChild(wrap);
        }
    }

    function showPreviewMessage(title, text, tone) {
        $('preview-empty').innerHTML = CatalogMeta.renderEmpty(title, text);
        showStage('empty');
        if (tone === 'warn') $('preview-empty').querySelector('.empty-art').innerHTML = icon('alert', 44);
    }

    function setProfile(html) {
        const card = $('meta-profile');
        if (!card) return;
        card.classList.remove('is-loading');
        card.innerHTML = html;
    }

    // ------------------------------------------------------------------------------------------
    // Layer list
    // ------------------------------------------------------------------------------------------

    function chevron() {
        return h('span', { html: icon('chevron', 16) });
    }

    function toggleSection(head, body, open) {
        const willOpen = open === undefined ? head.getAttribute('aria-expanded') !== 'true' : open;
        head.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
        body.hidden = !willOpen;
    }

    function renderTree() {
        const root = $('tree-scroll');
        root.innerHTML = '';
        state.buttons = new Map();
        const topics = sortTopicNames(Object.keys(state.grouped));
        if (!topics.length) {
            root.appendChild(h('p', { text: 'No layers are registered for this mini watershed.' }));
            return;
        }
        topics.forEach(topic => {
            const categories = state.grouped[topic];
            const cats = sortCategoryNames(topic, Object.keys(categories));
            const total = cats.reduce((n, c) => n + categories[c].length, 0);
            const topicBody = h('div', { class: 'tree-body', hidden: true });
            const topicHead = h('button', {
                class: 'tree-head', type: 'button', 'aria-expanded': 'false', 'data-count': total,
                onclick: () => { toggleSection(topicHead, topicBody); showGroupOverview(topic); }
            }, [chevron(), h('span', { class: 'label', text: topic }), h('span', { class: 'count', text: String(total) })]);

            cats.forEach(cat => {
                const catBody = h('div', { class: 'tree-body', hidden: true });
                const catHead = h('button', {
                    class: 'tree-head tree-head--cat', type: 'button', 'aria-expanded': 'false', 'data-count': categories[cat].length,
                    onclick: () => toggleSection(catHead, catBody)
                }, [chevron(), h('span', { class: 'label', text: cat }), h('span', { class: 'count', text: String(categories[cat].length) })]);
                categories[cat].forEach(file => {
                    const fmt = fileFormat(resolveCatalogFileUrl(file, getCatalogFileUrl(file)));
                    const name = file.Layer || 'Unnamed layer';
                    const btn = h('button', { class: 'layer-button', type: 'button', 'data-search': (name + ' ' + cat + ' ' + topic).toLowerCase(), onclick: () => selectLayer(file) },
                        [h('span', { html: icon(fmt.kind, 16) }), h('span', { class: 'lname', text: name }), h('span', { class: 'fmt', text: fmt.label.replace(' image', '') })]);
                    state.buttons.set(file, { btn: btn, catHead: catHead, catBody: catBody, topicHead: topicHead, topicBody: topicBody });
                    catBody.appendChild(btn);
                });
                topicBody.appendChild(h('div', { class: 'tree-cat' }, [catHead, catBody]));
            });
            root.appendChild(h('div', { class: 'tree-topic' }, [topicHead, topicBody]));
        });
        $('layer-search').value = '';
    }

    function setAllSections(open) {
        document.querySelectorAll('#tree-scroll .tree-head').forEach(head => {
            const body = head.nextElementSibling;
            if (body) toggleSection(head, body, open);
        });
    }

    /** Filter the list as the user types; sections that contain a match open automatically. */
    function applyFilter(query) {
        const q = String(query || '').trim().toLowerCase();
        let visible = 0;
        document.querySelectorAll('#tree-scroll .tree-topic').forEach(topicEl => {
            let topicVisible = 0;
            topicEl.querySelectorAll('.tree-cat').forEach(catEl => {
                let catVisible = 0;
                catEl.querySelectorAll('.layer-button').forEach(btn => {
                    const match = !q || btn.dataset.search.indexOf(q) !== -1;
                    btn.hidden = !match;
                    if (match) catVisible++;
                });
                catEl.hidden = q && !catVisible;
                const head = catEl.querySelector('.tree-head');
                head.querySelector('.count').textContent = String(q ? catVisible : head.dataset.count);
                if (q) toggleSection(head, catEl.querySelector('.tree-body'), catVisible > 0);
                topicVisible += catVisible;
            });
            topicEl.hidden = q && !topicVisible;
            const thead = topicEl.querySelector(':scope > .tree-head');
            thead.querySelector('.count').textContent = String(q ? topicVisible : thead.dataset.count);
            if (q) toggleSection(thead, topicEl.querySelector(':scope > .tree-body'), topicVisible > 0);
            visible += topicVisible;
        });
        const old = $('tree-empty');
        if (old) old.remove();
        if (q && !visible) $('tree-scroll').appendChild(h('p', { id: 'tree-empty', text: 'No layers match "' + query.trim() + '".' }));
    }

    /** Open the parents of a layer button and mark it as the current layer. */
    function markSelected(file) {
        document.querySelectorAll('#tree-scroll .layer-button[aria-current]').forEach(b => b.removeAttribute('aria-current'));
        const ref = state.buttons.get(file);
        if (!ref) return;
        if (ref.btn.hidden) { $('layer-search').value = ''; applyFilter(''); }
        toggleSection(ref.topicHead, ref.topicBody, true);
        toggleSection(ref.catHead, ref.catBody, true);
        ref.btn.setAttribute('aria-current', 'true');
        ref.btn.scrollIntoView({ block: 'nearest' });
    }

    // ------------------------------------------------------------------------------------------
    // Details panel
    // ------------------------------------------------------------------------------------------

    function setDetails(html) {
        $('right-panel-content').innerHTML = html;
        $('right-panel-content').scrollTop = 0;
    }

    function showPrompt() {
        $('right-panel-title').textContent = 'Layer details';
        setDetails(CatalogMeta.renderEmpty('Select a layer', 'Choose a layer from the list to read its description and source, and to see a summary of the data.'));
        setPreviewBar('Preview', 'layers');
        showPreviewMessage('Nothing to preview yet', 'Pick a layer from the list. Maps open here, tables and images too.');
    }

    function selectedMwsLabel() {
        const v = $('catalogMwsSelect').value;
        return v ? formatMwsId(v) : '';
    }

    function showGroupOverview(topic) {
        $('right-panel-title').textContent = 'Topic';
        setDetails(CatalogMeta.renderGroupOverview(topic, state.grouped[topic]));
        $('right-panel-content').querySelectorAll('.layer-link').forEach(btn => {
            btn.addEventListener('click', () => selectLayer(state.grouped[btn.dataset.topic][btn.dataset.category][Number(btn.dataset.index)]));
        });
    }

    // ------------------------------------------------------------------------------------------
    // KML download
    // ------------------------------------------------------------------------------------------
    // The KML copy of a layer is a file made separately: next to the GeoJSON with the same name, or named in the registry's
    // "kml" column (CatalogMeta.kmlSourceOf decides which). The button is shown only when that file exists, so a layer without a
    // KML shows no button. Answers are remembered, so choosing the same layer again does not ask again.
    const kmlKnown = new Map();   // KML address -> true (it is there) or false (it is not)
    async function kmlFileExists(url) {
        if (kmlKnown.has(url)) return kmlKnown.get(url);
        try {
            const response = await fetch(url, { method: 'HEAD' });
            if (response.status === 404 || response.status === 410) {
                kmlKnown.set(url, false);
                return false;
            }
            if (response.ok) {
                const found = (response.headers.get('content-type') || '').indexOf('text/html') === -1;   // a web page is not a KML file
                kmlKnown.set(url, found);
                return found;
            }
        } catch (e) { /* offline or blocked: unknown */ }
        return null;   // unknown: not remembered, so it is tried again next time
    }
    async function wireKmlButton(button, kml, token) {
        const url = toRawGitHubUrl(kml.url);
        const exists = await kmlFileExists(url);
        if (token !== state.loadToken || !button.isConnected) return;     // the user has already moved on to another layer
        if (exists === false || (exists === null && !kml.explicit)) return;   // no KML for this layer: the button stays hidden
        button.style.display = '';
        button.addEventListener('click', () => downloadFile(url));
    }
    function wireDetailsButtons(model) {
        const download = $('download-button');
        if (download && model.url) download.addEventListener('click', () => downloadFile(model.url));
        const kmlButton = $('download-kml-button');
        if (kmlButton && model.kml) wireKmlButton(kmlButton, model.kml, state.loadToken);
        const copy = $('copy-link-button');
        if (copy) {
            copy.addEventListener('click', async () => {
                const label = copy.querySelector('span');
                try {
                    await navigator.clipboard.writeText(model.url);
                    label.textContent = 'Copied';
                } catch (e) {
                    window.prompt('Copy this address:', model.url);
                }
                setTimeout(() => { label.textContent = 'Copy link'; }, 1800);
            });
        }
    }

    // ------------------------------------------------------------------------------------------
    // Previews
    // ------------------------------------------------------------------------------------------

    function ensureMap() {
        if (state.map) return state.map;
        state.map = L.map('map', { zoomControl: true }).setView([7.07, 80.72], 9);
        state.baseLayers = {
            streets: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }),
            satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: 'Imagery &copy; Esri' })
        };
        state.baseLayers.streets.addTo(state.map);
        state.currentBase = 'streets';
        return state.map;
    }

    function setBaseMap(which) {
        if (!state.map || which === state.currentBase) return;
        state.map.removeLayer(state.baseLayers[state.currentBase]);
        state.baseLayers[which].addTo(state.map);
        state.currentBase = which;
    }

    function popupHtml(props) {
        const rows = Object.keys(props || {}).filter(k => k.indexOf('__') !== 0).slice(0, 25).map(k =>
            '<tr><th>' + esc(k) + '</th><td>' + esc(props[k]) + '</td></tr>').join('');
        return '<div class="popup-table"><table>' + (rows || '<tr><td>No attributes</td></tr>') + '</table></div>';
    }

    function mapTools() {
        const zoom = h('button', { class: 'btn btn--ghost', type: 'button', html: icon('target', 16) + '<span>Zoom to data</span>', onclick: () => {
            if (state.dataLayer && state.map) { try { state.map.fitBounds(state.dataLayer.getBounds(), { padding: [24, 24] }); } catch (e) { /* ignore */ } }
        } });
        const streets = h('button', { type: 'button', 'aria-pressed': 'true', text: 'Streets' });
        const sat = h('button', { type: 'button', 'aria-pressed': 'false', text: 'Satellite' });
        const choose = (which) => {
            streets.setAttribute('aria-pressed', which === 'streets' ? 'true' : 'false');
            sat.setAttribute('aria-pressed', which === 'satellite' ? 'true' : 'false');
            setBaseMap(which);
        };
        streets.addEventListener('click', () => choose('streets'));
        sat.addEventListener('click', () => choose('satellite'));
        return [zoom, h('div', { class: 'segmented', role: 'group', 'aria-label': 'Base map' }, [streets, sat])];
    }

    async function showMapPreview(model, token, file) {
        try {
            const response = await fetch(toRawGitHubUrl(model.url), { mode: 'cors' });
            if (!response.ok) throw new Error(`Network response was not ok (${response.status})`);
            if ((response.headers.get('content-type') || '').includes('text/html')) throw new Error('Received HTML instead of GeoJSON');
            const data = await response.json();
            if (token !== state.loadToken) return;

            const map = ensureMap();
            if (state.dataLayer) map.removeLayer(state.dataLayer);
            if (state.legend) { map.removeControl(state.legend); state.legend = null; }
            const options = Symbology.geoJsonOptions(model.title);
            options.onEachFeature = (feature, layer) => { layer.bindPopup(popupHtml(feature.properties)); };
            state.dataLayer = L.geoJSON(data, options).addTo(map);
            showStage('map');
            setBaseMap('streets');
            try { map.fitBounds(state.dataLayer.getBounds(), { padding: [24, 24] }); } catch (e) { /* empty layer */ }

            // Legend: the same card as on the dashboard
            const roads = [];
            (data.features || []).forEach(f => { const c = Symbology.roadCategory(f.properties && f.properties.TL_GFCODE); if (c && roads.indexOf(c) === -1) roads.push(c); });
            const legend = L.control({ position: 'bottomright' });
            legend.onAdd = function () {
                const div = L.DomUtil.create('div', 'info legend umw-legend');
                div.innerHTML = Symbology.legendHtml(Symbology.legendSpec(model.title, data, { roadCategories: roads }));
                if (L.DomEvent) { if (L.DomEvent.disableClickPropagation) L.DomEvent.disableClickPropagation(div); if (L.DomEvent.disableScrollPropagation) L.DomEvent.disableScrollPropagation(div); }
                return div;
            };
            legend.addTo(map);
            state.legend = legend;

            const profile = CatalogMeta.profileGeoJson(data);
            setPreviewBar(model.title, 'map', profile.count + ' feature' + (profile.count === 1 ? '' : 's') + '. Click a feature to see its values.', mapTools());
            setProfile(CatalogMeta.renderProfile(profile));
        } catch (err) {
            if (token !== state.loadToken) return;
            console.error('Failed to load GeoJSON for preview:', err);
            previewFailed(model, file);
        }
    }

    function previewFailed(model, file) {
        setPreviewBar(model.title, 'alert');
        if (file && isProposalFile(file)) {
            const text = `The selected proposal '${file.Layer}' is not available in '${formatMwsId($('catalogMwsSelect').value)}'.`;
            showPreviewMessage('Proposal not available', text, 'warn');
            setProfile('<h3 class="meta-h">What is in this file</h3>' + CatalogMeta.renderMessage('Not available', text, 'warn'));
        } else {
            showPreviewMessage('Preview unavailable', 'The selected file could not be previewed. You can still try the download button.', 'warn');
            setProfile('<h3 class="meta-h">What is in this file</h3>' + CatalogMeta.renderMessage('Preview unavailable', 'The file could not be read, so no summary is shown.', 'warn'));
        }
    }

    function renderSheet(sheets, index) {
        const rows = sheets[index].rows;
        const header = rows[0] || [];
        const body = rows.slice(1, MAX_TABLE_ROWS + 1);
        let html = '';
        if (sheets.length > 1) {
            html += '<div class="sheet-tabs" role="group" aria-label="Sheets">' + sheets.map((s, i) =>
                '<button type="button" data-sheet="' + i + '" aria-pressed="' + (i === index) + '">' + esc(s.name) + '</button>').join('') + '</div>';
        }
        html += '<table class="csv-table"><thead><tr>' + header.map(c => '<th>' + esc(c) + '</th>').join('') + '</tr></thead><tbody>' +
            body.map(r => '<tr>' + header.map((_, i) => '<td>' + esc(r[i] === undefined ? '' : r[i]) + '</td>').join('') + '</tr>').join('') + '</tbody></table>';
        if (rows.length - 1 > MAX_TABLE_ROWS) html += '<p class="table-note">Showing the first ' + MAX_TABLE_ROWS + ' of ' + (rows.length - 1).toLocaleString('en-US') + ' rows. Download the file to see all rows.</p>';
        const host = $('table-preview');
        host.innerHTML = html;
        host.querySelectorAll('[data-sheet]').forEach(b => b.addEventListener('click', () => renderSheet(sheets, Number(b.dataset.sheet))));
    }

    async function showTablePreview(model, token, file) {
        try {
            const response = await fetch(toRawGitHubUrl(model.url), { mode: 'cors' });
            if (!response.ok) throw new Error(`Network response was not ok (${response.status})`);
            const workbook = XLSX.read(await response.arrayBuffer(), { type: 'array' });
            if (token !== state.loadToken) return;
            const sheets = workbook.SheetNames.map(name => ({ name: name, rows: XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1 }) }));
            renderSheet(sheets, 0);
            showStage('table');
            const profile = CatalogMeta.profileTable(sheets);
            setPreviewBar(model.title, 'table', profile.rows.toLocaleString('en-US') + ' rows, ' + profile.cols + ' columns');
            setProfile(CatalogMeta.renderProfile(profile));
        } catch (err) {
            if (token !== state.loadToken) return;
            console.error('Error loading table file:', err);
            previewFailed(model, file);
        }
    }

    function showImagePreview(model, token, file) {
        const img = $('image-preview');
        img.onload = function () {
            if (token !== state.loadToken) return;
            showStage('image');
            const open = h('a', { class: 'btn btn--ghost', href: img.src, target: '_blank', rel: 'noopener noreferrer', html: icon('maximize', 16) + '<span>Open full size</span>' });
            setPreviewBar(model.title, 'image', img.naturalWidth + ' \u00D7 ' + img.naturalHeight + ' pixels', [open]);
            setProfile(CatalogMeta.renderProfile({ kind: 'image', width: img.naturalWidth, height: img.naturalHeight }));
        };
        img.onerror = function () {
            if (token !== state.loadToken) return;
            previewFailed(model, file);
        };
        img.alt = model.title;
        img.src = toRawGitHubUrl(model.url);
    }

    function showNoPreview(model) {
        setPreviewBar(model.title, model.format.kind);
        showPreviewMessage('No preview for this file type', model.url ? 'Use the download button to open the file on your computer.' : 'This layer has no file attached.');
        setProfile(CatalogMeta.renderProfile({ kind: 'none', message: model.url ? 'No summary is available for ' + model.format.label + ' files.' : 'This layer has no file attached.' }));
    }

    // ------------------------------------------------------------------------------------------
    // Choosing a layer
    // ------------------------------------------------------------------------------------------

    function selectLayer(file) {
        state.selected = file;
        markSelected(file);
        const token = ++state.loadToken;
        const model = CatalogMeta.buildModel(file, { mwsLabel: selectedMwsLabel() });
        $('right-panel-title').textContent = 'Layer details';
        setDetails(CatalogMeta.renderDetails(model));
        wireDetailsButtons(model);
        setPreviewBar(model.title, model.format.kind, 'Loading...');
        const id = model.format.id;
        if (!model.url) return showNoPreview(model);
        if (id === 'geojson') return showMapPreview(model, token, file);
        if (id === 'csv' || id === 'xlsx' || id === 'xls') return showTablePreview(model, token, file);
        if (id === 'png' || id === 'jpg') return showImagePreview(model, token, file);
        showNoPreview(model);
    }

    // ------------------------------------------------------------------------------------------
    // MWS selection and registry loading
    // ------------------------------------------------------------------------------------------

    function registryUrl(mwsId) {
        const id = String(mwsId || '').trim().replace(/^mws[-_]?/i, '').replace(/-/g, '_');
        return REGISTRY_BASE + id + '.csv';
    }

    function clearCatalog(message) {
        state.files = []; state.grouped = {}; state.selected = null; state.buttons = new Map(); state.loadToken++;
        $('tree-scroll').innerHTML = '';
        $('tree-scroll').appendChild(h('p', { text: message }));
        showPrompt();
    }

    async function loadMws(mwsId) {
        const requestId = ++state.registryRequest;
        $('tree-scroll').innerHTML = '';
        $('tree-scroll').appendChild(h('p', { text: `Loading files for MWS ${mwsId}...` }));
        const files = await fetchRegistry([registryUrl(mwsId)]);
        if (requestId !== state.registryRequest) return;
        state.files = files;
        state.grouped = groupFiles(files);
        state.loadToken++;
        renderTree();
        showPrompt();
        if (!hasApprovedProposal(files)) {
            $('right-panel-content').insertAdjacentHTML('beforeend', '<div class="meta-card" style="margin-top:12px">' +
                CatalogMeta.renderMessage('Proposal', `There is no 'Proposal' in '${formatMwsId(mwsId)}'.`, 'info') + '</div>');
        }
    }

    function loadCatalogForSelection() {
        const mwsId = $('catalogMwsSelect').value;
        if (!mwsId) return;
        loadMws(mwsId).catch(error => {
            console.error('Could not load catalog files:', error);
            clearCatalog('Could not load files for this MWS.');
        });
    }

    function setCatalogOptions(select, placeholder, values, disabled) {
        select.replaceChildren(new Option(placeholder, ''));
        sortCatalogValues(values).forEach(value => select.appendChild(new Option(value, value)));
        select.disabled = !!disabled;
    }

    async function initializeSelectors() {
        const response = await fetch(BOUNDARY_URL);
        if (!response.ok) throw new Error(`MWS boundary request failed (${response.status})`);
        const features = (await response.json()).features || [];
        const districtSelect = $('catalogDistSelect');
        const dsdSelect = $('catalogDsdSelect');
        const mwsSelect = $('catalogMwsSelect');
        const prop = (f, k) => (f.properties ? f.properties[k] : undefined);
        setCatalogOptions(districtSelect, 'Select District', new Set(features.map(f => prop(f, 'District')).filter(Boolean)));

        districtSelect.addEventListener('change', () => {
            const filtered = features.filter(f => !districtSelect.value || prop(f, 'District') === districtSelect.value);
            setCatalogOptions(dsdSelect, 'Select DSD', new Set(filtered.map(f => prop(f, 'MainDSD')).filter(Boolean)));
            setCatalogOptions(mwsSelect, 'Select MWS ID', [], true);
            state.registryRequest++;
            clearCatalog('Select District, DSD, and MWS ID to load files.');
        });
        dsdSelect.addEventListener('change', () => {
            const filtered = features.filter(f => prop(f, 'District') === districtSelect.value && prop(f, 'MainDSD') === dsdSelect.value);
            setCatalogOptions(mwsSelect, 'Select MWS ID', new Set(filtered.map(f => prop(f, 'MWS_ID')).filter(Boolean)));
            state.registryRequest++;
            clearCatalog('Select District, DSD, and MWS ID to load files.');
        });
        mwsSelect.addEventListener('change', loadCatalogForSelection);

        // Opened from the dashboard with ?mwsId=...
        const queryMwsId = new URLSearchParams(window.location.search).get('mwsId');
        if (queryMwsId) {
            const selected = features.find(f => String(prop(f, 'MWS_ID')) === queryMwsId);
            if (selected) {
                districtSelect.value = selected.properties.District;
                districtSelect.dispatchEvent(new Event('change'));
                dsdSelect.value = selected.properties.MainDSD;
                dsdSelect.dispatchEvent(new Event('change'));
                mwsSelect.value = queryMwsId;
                loadCatalogForSelection();
            }
        }
    }

    // ------------------------------------------------------------------------------------------
    // Resizable and expandable details panel
    // ------------------------------------------------------------------------------------------

    function enableRightPanelResize() {
        const main = document.querySelector('.catalog-main');
        const panel = $('right-panel');
        const resizer = $('right-panel-resizer');
        let startX = 0;
        let startWidth = 0;
        let resizing = false;

        const toggleMax = () => {
            panel.classList.toggle('maximized');
            $('maximize-btn').setAttribute('aria-pressed', panel.classList.contains('maximized') ? 'true' : 'false');
        };
        $('right-panel-header').addEventListener('dblclick', toggleMax);
        $('maximize-btn').addEventListener('click', toggleMax);
        document.addEventListener('keydown', e => { if (e.key === 'Escape' && panel.classList.contains('maximized')) toggleMax(); });

        resizer.addEventListener('mousedown', event => {
            resizing = true;
            startX = event.clientX;
            startWidth = panel.getBoundingClientRect().width;
            panel.classList.add('resizing');
            document.body.style.cursor = 'ew-resize';
            event.preventDefault();
        });
        document.addEventListener('mousemove', event => {
            if (!resizing) return;
            const maxWidth = Math.max(280, Math.floor(main.getBoundingClientRect().width * 0.55));
            const next = Math.min(maxWidth, Math.max(280, startWidth + (startX - event.clientX)));
            panel.style.width = next + 'px';
            panel.style.flexBasis = next + 'px';
        });
        document.addEventListener('mouseup', () => {
            if (!resizing) return;
            resizing = false;
            panel.classList.remove('resizing');
            document.body.style.cursor = '';
            if (state.map) state.map.invalidateSize();
        });
    }

    // Download a file (converts GitHub page links to raw links, retries, and offers a fallback when the browser blocks it)
    async function downloadFile(path) {
        if (!path) {
            alert("No file selected to download.");
            return;
        }

        const fetchUrl = toRawGitHubUrl(path);
        try {
            const resp = await fetch(fetchUrl);
            if (!resp.ok) throw new Error(`Network response was not ok (${resp.status})`);

            // If response is HTML (e.g., GitHub page), attempt to convert again or fail
            const contentType = resp.headers.get('content-type') || '';
            if (contentType.includes('text/html')) {
                // If we received HTML, try converting original path to raw URL (again) and refetch
                if (!fetchUrl.includes('raw.githubusercontent.com') && path.includes('github.com')) {
                    const raw = toRawGitHubUrl(path);
                    if (raw !== fetchUrl) {
                        const retry = await fetch(raw);
                        if (retry.ok) {
                            const blob2 = await retry.blob();
                            const urlObj2 = URL.createObjectURL(blob2);
                            const a2 = document.createElement('a');
                            a2.href = urlObj2;
                            a2.download = (path.split('/').pop() || 'download').split('?')[0];
                            document.body.appendChild(a2);
                            a2.click();
                            a2.remove();
                            setTimeout(() => URL.revokeObjectURL(urlObj2), 1000);
                            return;
                        }
                    }
                }
                throw new Error('Fetched resource is HTML, not the expected file content.');
            }

            const blob = await resp.blob();
            const urlObj = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = urlObj;
            const filename = (path.split("/").pop() || "download").split('?')[0];
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(urlObj), 1000);
        } catch (err) {
            console.error("Download failed:", err);
            alert("Download failed: " + err.message + " (see console for details)");
        }
    }

    // ------------------------------------------------------------------------------------------
    // Start
    // ------------------------------------------------------------------------------------------

    window.addEventListener('DOMContentLoaded', () => {
        $('layer-search').addEventListener('input', e => applyFilter(e.target.value));
        $('expand-all').addEventListener('click', () => setAllSections(true));
        $('collapse-all').addEventListener('click', () => setAllSections(false));
        enableRightPanelResize();
        showPrompt();
        initializeSelectors().catch(error => {
            console.error('Could not load MWS selectors:', error);
            clearCatalog('Could not load MWS selection data.');
        });
    });

    window.downloadFile = downloadFile;
})();
