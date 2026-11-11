/**
 * Data catalog: metadata cards
 *
 * Purpose : Turns one registry row into a readable "metadata card" (title, badges, key facts, description,
 *           tags, more details) and describes the data itself (feature count, extent, fields, area) after
 *           the file has been read. Contact and technical fields that are not meant for the public stay hidden.
 *           For a GeoJSON layer it also works out where the layer's KML file is (see kmlSourceOf) and draws the
 *           "Download KML" button, which catalog-page.js shows only when that KML file exists.
 * Depends : catalog-data.js (fileFormat, getCatalogFileUrl, resolveCatalogFileUrl, formatMwsId).
 * Exposes : CatalogMeta { buildModel, renderDetails, renderProfile, renderGroupOverview, renderEmpty, renderMessage,
 *           profileGeoJson, profileTable, kmlSourceOf, icon, esc }
 */

const CatalogMeta = (function () {
    'use strict';

    // ------------------------------------------------------------------------------------------
    // What is NOT shown (unchanged from the previous catalog: contact details, limitations, etc.)
    // To show one of these, delete its name from this list.
    // ------------------------------------------------------------------------------------------

    function keyOf(name) {
        return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    const HIDDEN_FIELDS = [
        'Contact.Name', 'Email.Address', 'Phone.Number', 'Address', 'Data.Source', 'Accuracy', 'Limitations', 'Resolution',
        'Vertical.Datum', 'Access.Constraints', 'Use.Constraints', 'Download.Link', 'Process.Steps', 'Metadata.Creator',
        'Metadata.Date', 'Metadata.Standard', 'Related.Publications', 'File.Size', 'Supplementary.Info'
    ];
    const HIDDEN_KEYS = new Set(HIDDEN_FIELDS.map(keyOf));

    // Columns that hold the file address or the layer's place in the tree: shown elsewhere, not as "details".
    // The KML columns are here too: the KML address is used by the "Download KML" button, not listed as a detail.
    const STRUCTURAL_KEYS = new Set(['group', 'database', 'layer', 'mws', 'id', 'geojson', 'geojsonurl', 'file', 'path', 'url',
        'download', 'downloadurl', 'downloadshp', 'downloadlink', 'kml', 'kmlurl', 'kmlfile', 'downloadkml']);
    // Registry columns that may hold the address of the KML copy of a layer (compared without dots, spaces or underscores).
    const KML_KEYS = ['kml', 'kmlurl', 'kmlfile', 'downloadkml'];

    // ------------------------------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------------------------------

    function esc(value) {
        return String(value === null || value === undefined ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function isMeaningless(value) {
        const v = String(value === null || value === undefined ? '' : value).trim().toLowerCase();
        return v === '' || v === 'undefined' || v === 'null' || v === 'nan' || v === 'n/a' || v === 'na' || v === '-';
    }

    function humanLabel(name) {
        const spaced = String(name || '').replace(/[._]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\s+/g, ' ').trim();
        return spaced.charAt(0).toUpperCase() + spaced.slice(1);
    }

    /** Value to HTML: web links and e-mail addresses become links; line breaks are kept. */
    function valueHtml(value) {
        const text = String(value).trim();
        if (/^https?:\/\/\S+$/i.test(text)) {
            const shown = text.length > 60 ? text.slice(0, 57) + '...' : text;
            return '<a href="' + esc(text) + '" target="_blank" rel="noopener noreferrer">' + esc(shown) + '</a>';
        }
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
            return '<a href="mailto:' + esc(text) + '">' + esc(text) + '</a>';
        }
        return esc(text).replace(/\n/g, '<br>');
    }

    function splitList(value) {
        return String(value).split(/[;|,]/).map(s => s.trim()).filter(Boolean);
    }

    function formatNumber(n, digits) {
        if (!Number.isFinite(n)) return '';
        return n.toLocaleString('en-US', { maximumFractionDigits: digits === undefined ? 0 : digits });
    }

    // ------------------------------------------------------------------------------------------
    // Icons (inline, so the page needs no icon font)
    // ------------------------------------------------------------------------------------------

    const ICONS = {
        map: '<polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>',
        table: '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/>',
        image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
        file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
        org: '<path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6"/>',
        calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
        ruler: '<path d="M3 17L17 3l4 4L7 21z"/><path d="M7 13l2 2M10 10l2 2M13 7l2 2"/>',
        globe: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z"/>',
        shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
        tag: '<path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
        layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
        link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
        copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
        download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
        info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
        search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
        maximize: '<polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>',
        chevron: '<polyline points="9 18 15 12 9 6"/>',
        hash: '<line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>',
        shapes: '<polygon points="12 3 22 20 2 20"/>',
        target: '<circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/>',
        folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
        alert: '<path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'
    };

    function icon(name, size) {
        const s = size || 18;
        return '<svg class="ic" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
            (ICONS[name] || ICONS.file) + '</svg>';
    }

    // ------------------------------------------------------------------------------------------
    // Metadata model
    // ------------------------------------------------------------------------------------------

    // First matching rule wins. Keys are compared in lower case without dots, spaces or underscores.
    const RULES = [
        { cat: 'description', re: /(abstract|description|summary|purpose|overview|about)/ },
        { cat: 'tags', re: /(keyword|tag|theme|topic|categor)/ },
        { cat: 'source', re: /(provider|source|agency|organi[sz]ation|owner|custodian|publisher|department|institution|author|creator|producer)/ },
        { cat: 'time', re: /(date|year|period|updated|version|release|temporal|time)/ },
        { cat: 'rights', re: /(licen[sc]e|access|constraint|usage|copyright|restriction|disclaimer)/ },
        { cat: 'tech', re: /(scale|resolution|accuracy|crs|projection|datum|epsg|format|unit|geometry|datatype|type|coverage|extent|spatial|size|language)/ }
    ];

    const FACT_ICONS = { source: 'org', time: 'calendar', tech: 'ruler', rights: 'shield', coverage: 'target', format: 'file', crs: 'globe' };
    const SECTION_TITLES = { source: 'Source', time: 'Dates', tech: 'Technical', rights: 'Use and access', other: 'Other information' };

    function categoryOf(key) {
        const hit = RULES.find(r => r.re.test(key));
        return hit ? hit.cat : 'other';
    }

    /**
     * Where the KML copy of a GeoJSON layer is. A registry column named kml (or kml_url, kml_file, download_kml) wins: it holds
     * the full address, or just a file name in the same folder as the GeoJSON. Without that column the KML is expected next to the
     * GeoJSON with the same name (LND_LULC_MWS_003.geojson -> LND_LULC_MWS_003.kml).
     * Returns { url, explicit } (explicit = the registry named the file), or null for a layer that is not GeoJSON.
     */
    function kmlSourceOf(file, url, format) {
        const clean = String(url || '').trim();
        if (!clean || !format || format.id !== 'geojson') return null;
        const folder = clean.split('#')[0].split('?')[0].replace(/[^/]*$/, '');
        const names = Object.keys(file || {});
        for (let i = 0; i < names.length; i++) {
            if (KML_KEYS.indexOf(keyOf(names[i])) === -1) continue;
            const value = String(file[names[i]] === undefined || file[names[i]] === null ? '' : file[names[i]]).trim();
            if (isMeaningless(value)) continue;
            if (/^https?:\/\//i.test(value)) return { url: value, explicit: true };
            return { url: folder + value.replace(/^\.?\//, ''), explicit: true };
        }
        const base = clean.split('#')[0].split('?')[0];
        if (!/\.geojson$/i.test(base)) return null;
        return { url: base.replace(/\.geojson$/i, '.kml'), explicit: false };
    }
    /**
     * Build the model for one registry row.
     * ctx: { mwsLabel } for the coverage fact.
     */
    function buildModel(file, ctx) {
        ctx = ctx || {};
        const url = resolveCatalogFileUrl(file, getCatalogFileUrl(file));
        const format = fileFormat(url);
        const secondary = String(file.layer || '').trim();
        const hasSecondary = secondary && secondary.toLowerCase() !== 'undefined' && secondary !== file.Layer;
        const model = {
            title: file.Layer || 'Unnamed layer',
            subtitle: hasSecondary ? secondary : '',
            group: file.Group || '',
            database: file.Database || '',
            format: format,
            url: url,
            kml: kmlSourceOf(file, url, format),
            fileName: decodeURIComponent((url.split('/').pop() || '').split('?')[0] || ''),
            description: '',
            tags: [],
            facts: [],
            sections: [],
            detailCount: 0
        };

        const buckets = { source: [], time: [], tech: [], rights: [], other: [] };
        Object.keys(file).forEach(name => {
            const k = keyOf(name);
            if (HIDDEN_KEYS.has(k) || STRUCTURAL_KEYS.has(k)) return;
            const value = file[name];
            if (isMeaningless(value)) return;
            const cat = categoryOf(k);
            if (cat === 'description') {
                model.description += (model.description ? '\n\n' : '') + String(value).trim();
            } else if (cat === 'tags') {
                model.tags.push.apply(model.tags, splitList(value));
            } else {
                buckets[cat].push({ label: humanLabel(name), value: String(value).trim() });
            }
        });

        // Key facts: the first value of each kind, then automatic facts
        const pick = (cat) => (buckets[cat].length ? buckets[cat][0] : null);
        const facts = [];
        const add = (kind, label, value, html) => { if (value) facts.push({ icon: FACT_ICONS[kind] || 'info', label: label, value: value, html: html }); };
        const src = pick('source');
        if (src) add('source', src.label, src.value);
        const time = pick('time');
        if (time) add('time', time.label, time.value);
        add('format', 'File format', format.label);
        add('coverage', 'Coverage', ctx.mwsLabel ? 'Mini watershed ' + ctx.mwsLabel : '');
        const tech = pick('tech');
        if (tech) add('tech', tech.label, tech.value);
        const rights = pick('rights');
        if (rights) add('rights', rights.label, rights.value);
        model.facts = facts.slice(0, 6);

        // Everything not used in the key facts goes to "more details"
        const used = new Set(model.facts.map(f => f.label + '|' + f.value));
        ['source', 'time', 'tech', 'rights', 'other'].forEach(cat => {
            const items = buckets[cat].filter(it => !used.has(it.label + '|' + it.value));
            if (items.length) {
                model.sections.push({ title: SECTION_TITLES[cat], items: items });
                model.detailCount += items.length;
            }
        });
        return model;
    }

    // ------------------------------------------------------------------------------------------
    // Data profile (what is actually in the file)
    // ------------------------------------------------------------------------------------------

    function walkCoordinates(coords, visit) {
        const stack = [coords];
        while (stack.length) {
            const c = stack.pop();
            if (!Array.isArray(c)) continue;
            if (typeof c[0] === 'number' && typeof c[1] === 'number') visit(c[0], c[1]);
            else for (let i = 0; i < c.length; i++) stack.push(c[i]);
        }
    }

    function inferType(values) {
        let numbers = 0, texts = 0, bools = 0, dates = 0, ints = 0;
        values.forEach(v => {
            if (typeof v === 'boolean') bools++;
            else if (typeof v === 'number') { numbers++; if (Number.isInteger(v)) ints++; }
            else if (typeof v === 'string') {
                const t = v.trim();
                if (t !== '' && Number.isFinite(Number(t.replace(/,/g, '')))) { numbers++; if (Number.isInteger(Number(t.replace(/,/g, '')))) ints++; }
                else if (/^\d{4}-\d{2}-\d{2}/.test(t)) dates++;
                else texts++;
            }
        });
        const total = numbers + texts + bools + dates;
        if (!total) return 'empty';
        if (numbers === total) return ints === numbers ? 'whole number' : 'decimal number';
        if (bools === total) return 'yes / no';
        if (dates === total) return 'date';
        if (texts === total) return 'text';
        return 'mixed';
    }

    function profileGeoJson(data) {
        const features = data && Array.isArray(data.features) ? data.features : [];
        const geom = {};
        let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
        const fieldValues = {};
        const order = [];
        features.forEach(f => {
            if (f && f.geometry) {
                geom[f.geometry.type] = (geom[f.geometry.type] || 0) + 1;
                walkCoordinates(f.geometry.coordinates, (x, y) => {
                    if (x < w) w = x; if (x > e) e = x; if (y < s) s = y; if (y > n) n = y;
                });
            }
            const props = (f && f.properties) || {};
            Object.keys(props).forEach(k => {
                if (k.indexOf('__') === 0) return;
                if (!fieldValues[k]) { fieldValues[k] = []; order.push(k); }
                fieldValues[k].push(props[k]);
            });
        });
        const total = features.length;
        const fields = order.map(name => {
            const vals = fieldValues[name];
            const filled = vals.filter(v => v !== null && v !== undefined && String(v).trim() !== '');
            const sampleSet = [];
            for (let i = 0; i < filled.length && sampleSet.length < 3; i++) {
                const t = String(filled[i]);
                if (sampleSet.indexOf(t) === -1) sampleSet.push(t.length > 40 ? t.slice(0, 37) + '...' : t);
            }
            return { name: name, type: inferType(filled.slice(0, 300)), filled: total ? Math.round(filled.length / total * 100) : 0, sample: sampleSet.join(', '), unique: new Set(filled.map(String)).size };
        });
        // Total area: only where a hectare field exists (sum of that field)
        let areaHa = null, areaField = '';
        const areaName = order.find(k => /^area[\s_]*(ha|_ha_?)$/i.test(k.replace(/_+$/, '')) || /^area__ha_?$/i.test(k));
        if (areaName) {
            const nums = fieldValues[areaName].map(v => Number(String(v).replace(/,/g, ''))).filter(Number.isFinite);
            if (nums.length) { areaHa = nums.reduce((a, b) => a + b, 0); areaField = areaName; }
        }
        return {
            kind: 'vector', count: total, geometry: Object.keys(geom), geometryCounts: geom,
            bbox: Number.isFinite(w) ? [w, s, e, n] : null, fields: fields, areaHa: areaHa, areaField: areaField
        };
    }

    function profileTable(sheets) {
        // sheets: [{ name, rows: [[...], ...] }]
        const first = sheets[0] || { rows: [] };
        const headers = (first.rows[0] || []).map(h => String(h === undefined || h === null ? '' : h));
        return {
            kind: 'table', sheets: sheets.map(sh => ({ name: sh.name, rows: Math.max(0, sh.rows.length - 1), cols: (sh.rows[0] || []).length })),
            rows: Math.max(0, first.rows.length - 1), cols: headers.length, headers: headers
        };
    }

    // ------------------------------------------------------------------------------------------
    // HTML
    // ------------------------------------------------------------------------------------------

    function badge(text, kind) {
        return text ? '<span class="chip chip--' + kind + '">' + esc(text) + '</span>' : '';
    }

    function renderDetails(model) {
        let html = '<article class="meta">';
        html += '<header class="meta-hero">';
        html += '<div class="meta-badges">' + badge(model.group, 'group') + badge(model.database, 'database') + badge(model.format.label, 'format') + '</div>';
        html += '<h2 class="meta-title">' + esc(model.title) + '</h2>';
        if (model.subtitle) html += '<p class="meta-subtitle">' + esc(model.subtitle) + '</p>';
        html += '<div class="meta-actions">';
        if (model.url) {
            html += '<button type="button" id="download-button" class="btn btn--primary">' + icon('download', 16) + '<span>Download ' + esc(model.format.label) + '</span></button>';
            // The KML button starts hidden: catalog-page.js shows it once it has found that the KML file exists.
            if (model.kml) {
                html += '<button type="button" id="download-kml-button" class="btn btn--primary" style="display:none" title="Download this layer as a KML file (opens in Google Earth)">' + icon('download', 16) + '<span>Download KML</span></button>';
            }
            html += '<button type="button" id="copy-link-button" class="btn btn--ghost" title="Copy the file address">' + icon('copy', 16) + '<span>Copy link</span></button>';
        } else {
            html += '<button type="button" id="download-button" class="btn btn--primary" disabled>' + icon('download', 16) + '<span>No file available</span></button>';
        }
        html += '</div></header>';

        if (model.facts.length) {
            html += '<section class="meta-card" aria-label="At a glance"><h3 class="meta-h">At a glance</h3><dl class="facts">';
            model.facts.forEach(f => {
                html += '<div class="fact' + (String(f.value).length > 26 ? ' fact--wide' : '') + '"><span class="fact-ic">' + icon(f.icon, 18) + '</span><div><dt>' + esc(f.label) + '</dt><dd>' + valueHtml(f.value) + '</dd></div></div>';
            });
            html += '</dl></section>';
        }
        if (model.description) {
            html += '<section class="meta-card" aria-label="Description"><h3 class="meta-h">About this layer</h3><p class="meta-text">' + esc(model.description).replace(/\n/g, '<br>') + '</p>';
            if (model.tags.length) html += '<div class="tags">' + model.tags.map(t => '<span class="tag">' + esc(t) + '</span>').join('') + '</div>';
            html += '</section>';
        } else if (model.tags.length) {
            html += '<section class="meta-card"><h3 class="meta-h">Keywords</h3><div class="tags">' + model.tags.map(t => '<span class="tag">' + esc(t) + '</span>').join('') + '</div></section>';
        }

        html += '<section class="meta-card meta-profile is-loading" id="meta-profile" aria-label="Data summary" aria-live="polite">' +
            '<h3 class="meta-h">What is in this file</h3><div class="skeleton"><span></span><span></span><span></span></div></section>';

        if (model.sections.length) {
            html += '<details class="meta-card meta-more"><summary><span>More details</span><span class="count">' + model.detailCount + '</span></summary>';
            model.sections.forEach(sec => {
                html += '<h4 class="meta-h2">' + esc(sec.title) + '</h4><dl class="kv">';
                sec.items.forEach(it => { html += '<dt>' + esc(it.label) + '</dt><dd>' + valueHtml(it.value) + '</dd>'; });
                html += '</dl>';
            });
            html += '</details>';
        }

        if (model.url) {
            html += '<section class="meta-card meta-file"><h3 class="meta-h">Source file</h3><p class="file-name">' + icon('link', 16) + '<code>' + esc(model.fileName || model.url) + '</code></p></section>';
        }
        return html + '</article>';
    }

    function renderProfile(profile) {
        let html = '<h3 class="meta-h">What is in this file</h3>';
        if (profile.kind === 'vector') {
            const tiles = [];
            tiles.push(['hash', 'Features', formatNumber(profile.count)]);
            if (profile.geometry.length) tiles.push(['shapes', 'Geometry', profile.geometry.map(g => g.replace('Multi', 'Multi-')).join(', ')]);
            tiles.push(['table', 'Attribute fields', formatNumber(profile.fields.length)]);
            if (profile.areaHa !== null) tiles.push(['layers', 'Total area', formatNumber(profile.areaHa, 1) + ' ha']);
            html += '<div class="tiles">' + tiles.map(t => '<div class="tile"><span class="tile-ic">' + icon(t[0], 18) + '</span><span class="tile-v">' + esc(t[2]) + '</span><span class="tile-l">' + esc(t[1]) + '</span></div>').join('') + '</div>';
            if (profile.areaField) html += '<p class="hint">Total area is the sum of the <code>' + esc(profile.areaField) + '</code> field.</p>';
            if (profile.bbox) {
                const b = profile.bbox;
                const lon = v => Math.abs(v).toFixed(3) + '\u00B0' + (v >= 0 ? 'E' : 'W');
                const lat = v => Math.abs(v).toFixed(3) + '\u00B0' + (v >= 0 ? 'N' : 'S');
                html += '<p class="extent">' + icon('target', 16) + '<span><b>Extent</b> ' + lon(b[0]) + ' to ' + lon(b[2]) + ', ' + lat(b[1]) + ' to ' + lat(b[3]) + '</span></p>';
            }
            if (profile.fields.length) {
                const shown = profile.fields.slice(0, 8);
                const rest = profile.fields.slice(8);
                const row = f => '<tr><td class="fname">' + esc(f.name) + '</td><td><span class="ftype">' + esc(f.type) + '</span></td><td class="fsample" title="' + esc(f.sample) + '">' + esc(f.sample) + '</td>' +
                    '<td class="ffill"><span class="bar" title="' + f.filled + '% filled"><i style="width:' + f.filled + '%"></i></span></td></tr>';
                html += '<h4 class="meta-h2">Attribute fields</h4><div class="table-wrap"><table class="fields"><thead><tr><th>Field</th><th>Type</th><th>Example values</th><th>Filled</th></tr></thead><tbody>' + shown.map(row).join('') + '</tbody></table></div>';
                if (rest.length) {
                    html += '<details class="more-fields"><summary>Show ' + rest.length + ' more field' + (rest.length > 1 ? 's' : '') + '</summary><div class="table-wrap"><table class="fields"><tbody>' + rest.map(row).join('') + '</tbody></table></div></details>';
                }
            }
        } else if (profile.kind === 'table') {
            const tiles = [['hash', 'Rows', formatNumber(profile.rows)], ['table', 'Columns', formatNumber(profile.cols)]];
            if (profile.sheets.length > 1) tiles.push(['layers', 'Sheets', String(profile.sheets.length)]);
            html += '<div class="tiles">' + tiles.map(t => '<div class="tile"><span class="tile-ic">' + icon(t[0], 18) + '</span><span class="tile-v">' + esc(t[2]) + '</span><span class="tile-l">' + esc(t[1]) + '</span></div>').join('') + '</div>';
            const heads = profile.headers.filter(h => h !== '').slice(0, 24);
            if (heads.length) html += '<h4 class="meta-h2">Columns</h4><div class="tags">' + heads.map(h => '<span class="tag">' + esc(h) + '</span>').join('') + (profile.headers.length > 24 ? '<span class="tag tag--more">+' + (profile.headers.length - 24) + ' more</span>' : '') + '</div>';
        } else if (profile.kind === 'image') {
            html += '<div class="tiles"><div class="tile"><span class="tile-ic">' + icon('image', 18) + '</span><span class="tile-v">' + esc(profile.width + ' \u00D7 ' + profile.height) + '</span><span class="tile-l">Size in pixels</span></div></div>' +
                '<p class="hint">Map images are pictures of the data. Download the GeoJSON or GeoTIFF version of the layer when you need the values.</p>';
        } else {
            html += '<p class="hint">' + esc(profile.message || 'No summary is available for this file type.') + '</p>';
        }
        return html;
    }

    function renderGroupOverview(topic, categories) {
        // categories: { name: [file, ...] }
        const names = Object.keys(categories);
        const total = names.reduce((n, c) => n + categories[c].length, 0);
        let html = '<article class="meta"><header class="meta-hero"><div class="meta-badges">' + badge('Topic', 'group') + '</div><h2 class="meta-title">' + esc(topic) + '</h2>' +
            '<p class="meta-subtitle">' + total + ' layer' + (total === 1 ? '' : 's') + ' in ' + names.length + ' categor' + (names.length === 1 ? 'y' : 'ies') + '. Pick a layer to see its details.</p></header>';
        names.forEach(name => {
            html += '<section class="meta-card"><h3 class="meta-h">' + esc(name) + '<span class="count">' + categories[name].length + '</span></h3><ul class="layer-list">';
            categories[name].forEach((f, i) => {
                const fmt = fileFormat(resolveCatalogFileUrl(f, getCatalogFileUrl(f)));
                html += '<li><button type="button" class="layer-link" data-topic="' + esc(topic) + '" data-category="' + esc(name) + '" data-index="' + i + '">' + icon(fmt.kind, 16) +
                    '<span class="layer-link-name">' + esc(f.Layer || 'Unnamed layer') + '</span><span class="chip chip--format">' + esc(fmt.label) + '</span></button></li>';
            });
            html += '</ul></section>';
        });
        return html + '</article>';
    }

    function renderEmpty(title, text) {
        return '<div class="empty-state"><div class="empty-art" aria-hidden="true">' + icon('layers', 44) + '</div><h2>' + esc(title) + '</h2><p>' + esc(text) + '</p></div>';
    }

    function renderMessage(title, text, tone) {
        return '<div class="message message--' + (tone || 'info') + '"><span class="message-ic">' + icon(tone === 'warn' ? 'alert' : 'info', 22) + '</span><div><b>' + esc(title) + '</b><p>' + esc(text) + '</p></div></div>';
    }

    return {
        buildModel: buildModel, renderDetails: renderDetails, renderProfile: renderProfile, renderGroupOverview: renderGroupOverview,
        renderEmpty: renderEmpty, renderMessage: renderMessage, profileGeoJson: profileGeoJson, profileTable: profileTable,
        kmlSourceOf: kmlSourceOf, icon: icon, esc: esc, HIDDEN_FIELDS: HIDDEN_FIELDS
    };
})();
