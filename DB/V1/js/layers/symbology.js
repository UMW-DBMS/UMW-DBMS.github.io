/**
 * Map symbology: the single source of truth for colours, markers and legends.
 *
 * Purpose : Defines how every thematic layer looks on the map (fill and outline colours, line styles,
 *           point markers) and how its legend is drawn. Map layers, legends, statistics charts, the
 *           print view and the catalog preview all read from here, so a colour is changed in one place.
 * Depends : Nothing at load time. Leaflet (L) is used only when a marker icon is created.
 *           Styling: css/symbology.css.
 * Exposes : window.Symbology
 *
 * Colour notes
 *  - Land cover, soil and boundary colours were chosen for separation (CIE dE) and colour-blind safety.
 *  - Raster legends (rainfall, temperature, evaporation, DEM, slope, soil-erosion image) must NOT be
 *    recoloured here: their colours are baked into the PNG files. Only their layout is handled here.
 */

const Symbology = (function () {
    'use strict';

    // ------------------------------------------------------------------------------------------
    // Colour helpers
    // ------------------------------------------------------------------------------------------

    function hexToRgb(hex) {
        const h = String(hex || '#000000').replace('#', '');
        const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h.padEnd(6, '0');
        return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
    }

    function rgbToHex(rgb) {
        return '#' + rgb.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();
    }

    /** Mix a colour with black (amount > 0) or white (amount < 0). */
    function shade(hex, amount) {
        const target = amount >= 0 ? 0 : 255;
        const k = Math.abs(amount);
        return rgbToHex(hexToRgb(hex).map(v => v + (target - v) * k));
    }

    function luminance(hex) {
        const [r, g, b] = hexToRgb(hex).map(v => {
            const c = v / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    function textOn(hex) {
        return luminance(hex) > 0.45 ? '#1B1B1B' : '#FFFFFF';
    }

    function rgba(hex, alpha) {
        const [r, g, b] = hexToRgb(hex);
        return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
    }

    function hsl(h, s, l) {
        s /= 100; l /= 100;
        const k = n => (n + h / 30) % 12;
        const a = s * Math.min(l, 1 - l);
        const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
        return rgbToHex([f(0) * 255, f(8) * 255, f(4) * 255]);
    }

    function esc(value) {
        return String(value === null || value === undefined ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function norm(name) {
        return String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');
    }

    // ------------------------------------------------------------------------------------------
    // Palettes
    // ------------------------------------------------------------------------------------------

    /** Land use / land cover. `group` drives the legend sections. Order = legend order. */
    const LULC = [
        { key: 'Paddy', color: '#F2E86D', group: 'Agriculture' },
        { key: 'Tea', color: '#6F9A2B', group: 'Agriculture' },
        { key: 'Perennials', color: '#E0A526', group: 'Agriculture' },
        { key: 'Seasonal crops', color: '#F2A65A', group: 'Agriculture' },
        { key: 'Home garden', color: '#F3E9C6', group: 'Agriculture' },
        { key: 'Farms', color: '#B58AC7', group: 'Agriculture' },
        { key: 'Chena', color: '#B5541F', group: 'Agriculture' },
        { key: 'Forest lands', color: '#17502D', group: 'Forest and natural vegetation' },
        { key: 'Forest plantation', color: '#52A06A', group: 'Forest and natural vegetation' },
        { key: 'Scrub land', color: '#86BA7A', group: 'Forest and natural vegetation' },
        { key: 'Grass land', color: '#CFE8A8', group: 'Forest and natural vegetation' },
        { key: 'Water bodies', color: '#5BB5E0', group: 'Water' },
        { key: 'Wetland', color: '#2A9D8F', group: 'Water' },
        { key: 'Builtup land', color: '#EE7B75', group: 'Built-up and other' },
        { key: 'Bare land', color: '#D9C6A3', group: 'Built-up and other' },
        { key: 'Rocky area', color: '#555555', group: 'Built-up and other' },
        { key: 'Mining Sites', color: '#7D5A3A', group: 'Built-up and other' },
        { key: 'Waste Management', color: '#A8A8A8', group: 'Built-up and other' },
        { key: 'Defense', color: '#6C5B7B', group: 'Built-up and other' },
        { key: 'Miscellaneous', color: '#DCDCDC', group: 'Built-up and other' }
    ];
    // Spelling variants that appear in some data files
    const LULC_ALIASES = { 'forest land': 'Forest lands', 'forest': 'Forest lands', 'seasonal crop': 'Seasonal crops', 'bareland': 'Bare land', 'urban': 'Builtup land', 'urban area': 'Builtup land' };

    /** Soil erosion hazard: matches the colours of the Soil_Erosion.png raster so map and legend agree. */
    const EROSION = [
        { key: 'Very Low', color: '#FFFFBF' },
        { key: 'Low', color: '#FFD469' },
        { key: 'Moderate', color: '#FFAA00' },
        { key: 'High', color: '#B55400' },
        { key: 'Very High', color: '#730000' },
        { key: 'Severe', color: '#3D0000' }
    ];

    /** Landslide hazard zones. */
    const LANDSLIDE = [
        { key: 'Low', color: '#FFE8A3' },
        { key: 'Moderate', color: '#F59E42' },
        { key: 'High', color: '#D32F2F' }
    ];
    const NO_DATA_COLOR = '#BDBDBD';

    const SOIL = [
        { key: 'Immature Brown Loams; steeply dissected, hilly and rolling terrain', color: '#A3A25A' },
        { key: 'Red-Yellow Pdzolic soils with dark B horizon & RedYellow Podzolic soils with prominent A1 horizon; rolling terrain', color: '#C9DB6A' },
        { key: 'Red-Yellow Podzolic soils & Mountain Regosols; mountainous terrain', color: '#D9B382' },
        { key: 'Red-Yellow Podzolic soils; steeply dissected, hilly and rolling terrain', color: '#4FAE6A' },
        { key: 'Reddish Brown Earths & Immature Brown Looms; rolling, hilly and steep terrain', color: '#7F9BD0' },
        { key: 'Reddish Brown Latosolic soils; steeply dissected, hilly and rolling terrain', color: '#B84A93' },
        { key: 'Steep rockland & Lithosols', color: '#7D6B63' },
        { key: 'Water', color: '#8E5BB5' }
    ];

    /** Population density (people per km2), sequential light to dark. */
    const DENSITY = [
        { key: '<50', max: 50, color: '#FFFF80' },
        { key: '50-100', max: 100, color: '#FCE468' },
        { key: '100-200', max: 200, color: '#FACD50' },
        { key: '200-500', max: 500, color: '#F5B338' },
        { key: '500-1000', max: 1000, color: '#E09026' },
        { key: '1000-2000', max: 2000, color: '#B55E18' },
        { key: '2000-5000', max: 5000, color: '#91330A' },
        { key: '>5000', max: Infinity, color: '#6B0000' }
    ];

    /** Agro-ecological zones: hue = zone (wet / intermediate x up / mid / low country), lightness = sub-zone. */
    const AEZ_HUE = { WU: 196, WM: 140, WL: 100, IU: 28, IM: 44, IL: 58, DU: 8, DM: 350, DL: 330 };
    const AEZ_NAMES = {
        W: 'Wet zone', I: 'Intermediate zone', D: 'Dry zone',
        U: 'up-country', M: 'mid-country', L: 'low-country'
    };

    function parseAez(code) {
        const m = /^([WID])([UML])(\d)([a-e]?)$/i.exec(String(code || '').trim());
        return m ? { zone: m[1].toUpperCase() + m[2].toUpperCase(), n: parseInt(m[3], 10), sub: m[4] ? m[4].toLowerCase().charCodeAt(0) - 97 : 0 } : null;
    }

    function aezColor(code) {
        const p = parseAez(code);
        if (!p) return '#9E9E9E';
        const hue = (AEZ_HUE[p.zone] || 0) + 6 * p.sub;
        const light = Math.min(80, 30 + 9 * (p.n - 1) + 2 * p.sub);
        return hsl(hue, Math.max(30, 64 - 6 * p.sub), light);
    }

    function aezGroup(code) {
        const p = parseAez(code);
        return p ? AEZ_NAMES[p.zone[0]] + ' - ' + AEZ_NAMES[p.zone[1]] : 'Other';
    }

    /** Colour-blind friendly qualitative palette for charts with an open-ended number of categories. */
    const QUALITATIVE = ['#0072B2', '#E69F00', '#009E73', '#D55E00', '#CC79A7', '#56B4E9', '#F0E442', '#882255', '#44AA99', '#117733', '#DDCC77', '#999999'];

    function categoryColor(index) {
        if (index < QUALITATIVE.length) return QUALITATIVE[index];
        return hsl((index * 137.508) % 360, 55, 52);   // golden-angle hues for long lists
    }

    /** Stable colours for a list of category names: the same list always gets the same colours. */
    function categoryColors(names) {
        const out = {};
        names.forEach((n, i) => { out[n] = categoryColor(i); });
        return out;
    }

    // ------------------------------------------------------------------------------------------
    // Polygon, line and boundary styles
    // ------------------------------------------------------------------------------------------

    /** Standard fill: translucent fill with a crisp, darker outline so neighbouring areas stay separate. */
    function fillStyle(fill, o) {
        o = o || {};
        return {
            color: o.stroke || shade(fill, 0.38),
            weight: o.weight !== undefined ? o.weight : 0.8,
            opacity: o.opacity !== undefined ? o.opacity : 0.9,
            fillColor: fill,
            fillOpacity: o.alpha !== undefined ? o.alpha : 0.62,
            dashArray: o.dash || null
        };
    }

    const DEFAULT_STYLE = fillStyle('#90A4AE', { stroke: '#455A64', weight: 1, alpha: 0.35 });

    /** Styles for layers identified by their name (boundaries, reservations, water). */
    const LAYER_STYLES = {
        'miniwatershed': fillStyle('#FFF3B0', { stroke: '#B38600', weight: 1.6, alpha: 0.35 }),
        'mini watershed': fillStyle('#FFF3B0', { stroke: '#B38600', weight: 1.6, alpha: 0.35 }),
        'district boundary': { color: '#222222', weight: 3, opacity: 0.95, dashArray: '12 6', fillOpacity: 0 },
        'dsd boundary': { color: '#8D4B1A', weight: 2, opacity: 0.95, dashArray: '8 5', fillOpacity: 0 },
        'gn boundary': { color: '#E67E22', weight: 1.2, opacity: 0.95, dashArray: '4 4', fillOpacity: 0 },
        'water features-polygon': fillStyle('#5BB5E0', { stroke: '#1E78B4', weight: 1, alpha: 0.65 }),
        'water features-line': { color: '#4FA3D9', weight: 1.8, opacity: 1, fillOpacity: 0 },
        'stream network': { color: '#1F77B4', weight: 2, opacity: 1, fillOpacity: 0 },
        'conservation forest': fillStyle('#2E7D32', { stroke: '#17502D', weight: 2, alpha: 0.18, dash: '8 4' }),
        'reserved forest': fillStyle('#52A06A', { stroke: '#2F7A47', weight: 2, alpha: 0.16, dash: '8 4' }),
        'wild life boundary': fillStyle('#A1887F', { stroke: '#7D5A3A', weight: 2, alpha: 0.16, dash: '2 5' }),
        'environmental protection area': fillStyle('#DCEDA4', { stroke: '#6B8E23', weight: 2, alpha: 0.38, dash: '8 4' }),
        'to be forest': fillStyle('#C5E1A5', { stroke: '#7CB342', weight: 2, alpha: 0.2, dash: '4 4' }),
        // Reservoirs / Tanks (their own UMW files)
        'major tanks': fillStyle('#2F80ED', { stroke: '#0057B8', weight: 2, alpha: 0.65 }),
        'minor tanks': fillStyle('#2F80ED', { stroke: '#0057B8', weight: 2, alpha: 0.65 })
    };

    function layerStyle(layerName) {
        return LAYER_STYLES[norm(layerName)] || null;
    }

    /** Layers whose look is fixed by their name: an attribute called "level" or "NAME" in their data must not recolour them. */
    const FIXED_STYLE_LAYERS = ['major tanks', 'minor tanks'];

    /** Roads, tracks and railways. `codes` are the TL_GFCODE values that belong to each category. */
    const ROADS = {
        'Major Roads': { codes: new Set(['MNRDL', 'MRBNL', 'MRBRL', 'MROPL', 'MRTNL', 'MRUPL']), color: '#C0392B', weight: 3.5, opacity: 1 },
        'Secondary Roads': { codes: new Set(['SDRDL', 'SDROL', 'SRBNL', 'SRBRL', 'SRTNL', 'SUBRL']), color: '#E69F00', weight: 2.6, opacity: 1 },
        'Jeep/Car Tracks': { codes: new Set(['TRBNL', 'TRBRL', 'TRCKL', 'TRCWL', 'TRKOL', 'TRUPL']), color: '#6D4C41', weight: 1.8, opacity: 1, dashArray: '7 4', lineCap: 'butt' },
        'Footpath': { codes: new Set(['FTPHL', 'FPTHL', 'FPTOL', 'FPBNL', 'FPBRL']), color: '#7B7B7B', weight: 1.5, opacity: 0.95, dashArray: '1 5', lineCap: 'round' },
        'Railways': { codes: new Set(['RAILL', 'RLBRL', 'RLTNL', 'RLUPL', 'RLOPL']), color: '#37474F', weight: 2.4, opacity: 1 }
    };
    const ROAD_ORDER = ['Major Roads', 'Secondary Roads', 'Jeep/Car Tracks', 'Footpath', 'Railways'];

    function roadCategory(code) {
        const c = String(code || '').replace(/\s+/g, '').toUpperCase();
        if (!c) return null;
        for (const name of Object.keys(ROADS)) if (ROADS[name].codes.has(c)) return name;
        return null;
    }

    function roadStyle(props) {
        const cat = roadCategory(props && props.TL_GFCODE);
        if (!cat) return null;
        const r = ROADS[cat];
        return { color: r.color, weight: r.weight, opacity: r.opacity, dashArray: r.dashArray || null, lineCap: r.lineCap || 'butt', fillOpacity: 0 };
    }

    // ------------------------------------------------------------------------------------------
    // Class lookups
    // ------------------------------------------------------------------------------------------

    function lookup(list, key) {
        const k = norm(key);
        return list.find(item => norm(item.key) === k) || null;
    }

    function lulcEntry(name) {
        return lookup(LULC, name) || lookup(LULC, LULC_ALIASES[norm(name)]);
    }

    function lulcColor(name) {
        const e = lulcEntry(name);
        return e ? e.color : '#808080';
    }

    function soilColor(name) {
        const e = lookup(SOIL, name);
        return e ? e.color : '#808080';
    }

    function hazardColor(level) {
        const e = lookup(LANDSLIDE, level);
        return e ? e.color : (level === 'null' || level === null || level === undefined ? NO_DATA_COLOR : '#808080');
    }

    function erosionClassOf(props) {
        if (!props) return '';
        const v = props.soil_erosion !== undefined ? props.soil_erosion : props.Soil_Erosion !== undefined ? props.Soil_Erosion :
            props.erosion !== undefined ? props.erosion : props.Erosion !== undefined ? props.Erosion :
            props.erosion_class !== undefined ? props.erosion_class : props.Erosion_Class !== undefined ? props.Erosion_Class :
            props.SE_CLASS !== undefined ? props.SE_CLASS : props.SEVERITY !== undefined ? props.SEVERITY :
            props.severity !== undefined ? props.severity : '';
        return v === null || v === undefined ? '' : v;
    }

    function densityEntry(value) {
        const v = Number(value);
        return DENSITY.find(d => v < d.max) || DENSITY[DENSITY.length - 1];
    }

    /** Style for one polygon feature of a layer. Same precedence as before the redesign. */
    function polygonStyleFor(layerName, props) {
        props = props || {};
        if (FIXED_STYLE_LAYERS.indexOf(norm(layerName)) !== -1) return layerStyle(layerName);
        if (props.Density !== undefined && props.Density !== null) {
            return fillStyle(densityEntry(props.Density).color, { weight: 0.8, alpha: 0.8 });
        }
        const erosion = lookup(EROSION, erosionClassOf(props));
        if (erosion) return fillStyle(erosion.color, { alpha: 0.7 });
        if (props.zone && parseAez(props.zone)) return fillStyle(aezColor(props.zone), { alpha: 0.78 });
        const soil = lookup(SOIL, props.NAME);
        if (soil) return fillStyle(soil.color, { alpha: 0.78 });
        const slide = lookup(LANDSLIDE, props.level);
        if (slide) return fillStyle(slide.color, { alpha: 0.7 });
        const lulc = lulcEntry(props.classLULC);
        if (lulc) return fillStyle(lulc.color);
        return layerStyle(layerName) || DEFAULT_STYLE;
    }

    // ------------------------------------------------------------------------------------------
    // Point markers
    // ------------------------------------------------------------------------------------------

    /** Glyphs are drawn on a 24 x 24 grid in white (or dark on pale colours). */
    const GLYPHS = {
        dot: '<circle cx="12" cy="12" r="4.2"/>',
        drop: '<path d="M12 2.5C9 7 5.5 10.5 5.5 14.5a6.5 6.5 0 0 0 13 0C18.5 10.5 15 7 12 2.5z"/>',
        rain: '<path d="M6.5 14.5a4.5 4.5 0 0 1 .6-8.9 5.5 5.5 0 0 1 10.5 1.4 3.9 3.9 0 0 1-.6 7.5z"/>' +
            '<path d="M8 17.5l-1 3.5M12.5 17.5l-1 3.5M17 17.5l-1 3.5" fill="none" stroke-width="2.2" stroke-linecap="round"/>',
        thermo: '<path d="M10 4.5a2 2 0 0 1 4 0v8.1a4.2 4.2 0 1 1-4 0z"/>',
        evap: '<path d="M3.5 18c2-2 3.5-2 5.5 0s3.5 2 5.5 0 3.5-2 5.5 0" fill="none" stroke-width="2.2" stroke-linecap="round"/>' +
            '<path d="M8 13V6.5M5.5 9L8 6.5 10.5 9M16 13V6.5M13.5 9L16 6.5 18.5 9" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
        mountain: '<path d="M2.5 19.5l6.5-11 4 6.5 2.5-3.5 6 8z"/>',
        warning: '<path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 9.5v5" stroke="__BG__" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="17.2" r="1.3" fill="__BG__" stroke="none"/>',
        shield: '<path d="M12 3l7.5 2.8v5.6c0 4.6-3.2 7.9-7.5 9.6-4.3-1.7-7.5-5-7.5-9.6V5.8z"/>',
        tap: '<rect x="3" y="6" width="3.2" height="4.4" rx="0.9"/><path d="M5 7.5h8.5a3 3 0 0 1 3 3V12h-2.6v-1.5a.4.4 0 0 0-.4-.4H5z"/>' +
            '<path d="M15.2 14.5c1.2 1.6 2 2.7 2 3.8a2 2 0 0 1-4 0c0-1.1.8-2.2 2-3.8z"/>',
        waves: '<path d="M3 9.5c2-2 3.5-2 5.5 0s3.5 2 5.5 0 3.5-2 5.5 0M3 15.5c2-2 3.5-2 5.5 0s3.5 2 5.5 0 3.5-2 5.5 0" fill="none" stroke-width="2.2" stroke-linecap="round"/>',
        check: '<path d="M5.5 12.5l4.2 4.2L18.5 7.5" fill="none" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>',
        tree: '<circle cx="12" cy="9.2" r="5.6"/><rect x="11" y="13" width="2" height="7.5"/>',
        tank: '<path d="M3.5 11h17a8.5 8.5 0 0 1-17 0z"/><path d="M6.5 7.5c2-1.6 3-1.6 5 0s3 1.6 5 0" fill="none" stroke-width="2" stroke-linecap="round"/>',
        star: '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/>',
        building: '<path d="M4 20V9l8-5 8 5v11h-5v-6H9v6z"/>',
        weir: '<path d="M3 6.5h18v3.4H3z"/><path d="M3 14.5c2-2 3.5-2 5.5 0s3.5 2 5.5 0 3.5-2 5.5 0" fill="none" stroke-width="2.2" stroke-linecap="round"/>'
    };

    /** Marker kinds. Shape is a second cue (besides colour) so similar markers stay distinguishable. */
    const MARKERS = {
        rainfall: { color: '#1565C0', shape: 'circle', glyph: 'rain', label: 'Rainfall station' },
        temperature: { color: '#D84315', shape: 'circle', glyph: 'thermo', label: 'Temperature station' },
        evaporation: { color: '#00897B', shape: 'circle', glyph: 'evap', label: 'Evaporation station' },
        'wq-cea': { color: '#1E88E5', shape: 'circle', glyph: 'drop', label: 'Water quality - CEA' },
        'wq-masl': { color: '#7B1FA2', shape: 'diamond', glyph: 'drop', label: 'Water quality - MASL' },
        'wq-nwsdb': { color: '#C62828', shape: 'square', glyph: 'drop', label: 'Water quality - NWSDB' },
        'swc-on': { color: '#8D5524', shape: 'diamond', glyph: 'mountain', label: 'Soil and water conservation (on site)' },
        'swc-off': { color: '#D08A12', shape: 'diamond', glyph: 'mountain', label: 'Soil and water conservation (off site)' },
        landslide: { color: '#D81B60', shape: 'diamond', glyph: 'warning', label: 'Landslide' },
        wrm: { color: '#283593', shape: 'square', glyph: 'drop', label: 'Water resource management' },
        dws: { color: '#0288D1', shape: 'square', glyph: 'tap', label: 'Domestic water supply' },
        wsp: { color: '#00796B', shape: 'square', glyph: 'shield', label: 'Water source protection' },
        mi: { color: '#2E7D32', shape: 'square', glyph: 'waves', label: 'Minor irrigation' },
        mt: { color: '#5E35B1', shape: 'square', glyph: 'tank', label: 'Minor tank' },
        wqi: { color: '#F9A825', shape: 'circle', glyph: 'check', label: 'Water quality improvement' },
        sr: { color: '#8BC34A', shape: 'circle', glyph: 'tree', label: 'Stream reservation' },
        tourist: { color: '#EC407A', shape: 'hexagon', glyph: 'star', label: 'Tourist attraction' },
        economic: { color: '#6D4C41', shape: 'hexagon', glyph: 'building', label: 'Economic hub' },
        // DAD and UNDP tank details (Base Layers > DAD Tanks Details, UNDP Tanks Details)
        anicut: { color: '#F9A825', shape: 'square', glyph: 'weir', label: 'Anicut (DAD)' },
        'dad-tank': { color: '#2E7D32', shape: 'square', glyph: 'tank', label: 'Minor tank (DAD)' },
        'undp-tank': { color: '#EF6C00', shape: 'hexagon', glyph: 'tank', label: 'Tank (UNDP)' },
        default: { color: '#455A64', shape: 'circle', glyph: 'dot', label: 'Location' }
    };

    const KIND_BY_LAYER = {
        'rainfall': 'rainfall', 'temperature': 'temperature', 'evoporation': 'evaporation', 'evaporation': 'evaporation',
        'water quality -cea': 'wq-cea', 'water quality - cea': 'wq-cea', 'water quality -masl': 'wq-masl', 'water quality - masl': 'wq-masl',
        'water quality -nwsdb': 'wq-nwsdb', 'water quality - nwsdb': 'wq-nwsdb',
        'soil and water conservation - on site': 'swc-on', 'soil and water conservation - off site': 'swc-off', 'soil conservation': 'swc-on',
        'lanslides': 'landslide', 'landslides': 'landslide',
        'water resource management': 'wrm', 'water source protection': 'wsp', 'domestic water supply': 'dws',
        'minor irrigation related proposals': 'mi', 'water quality improvement': 'wqi', 'stream reservation': 'sr',
        'minor tanks restoration': 'mt', 'minor tanks': 'mt',
        'tourist attract places': 'tourist', 'economic hubs': 'economic'
    };

    function markerKind(layerNameOrKind) {
        const n = norm(layerNameOrKind);
        if (MARKERS[n] && n !== 'default') return n;
        return KIND_BY_LAYER[n] || 'default';
    }

    function markerColor(layerNameOrKind) {
        return MARKERS[markerKind(layerNameOrKind)].color;
    }

    function shapeSvg(shape, attrs) {
        switch (shape) {
            case 'square': return '<rect x="4.5" y="3.5" width="23" height="23" rx="6" ' + attrs + '/>';
            case 'diamond': return '<rect x="7.2" y="6.2" width="17.6" height="17.6" rx="3" transform="rotate(45 16 15)" ' + attrs + '/>';
            case 'hexagon': return '<polygon points="29,15 22.5,26.3 9.5,26.3 3,15 9.5,3.7 22.5,3.7" stroke-linejoin="round" ' + attrs + '/>';
            default: return '<circle cx="16" cy="15" r="12" ' + attrs + '/>';
        }
    }

    /** SVG string for a marker. `size` is the pixel width and height. */
    function markerSvg(kindOrLayer, o) {
        o = o || {};
        const kind = MARKERS[markerKind(kindOrLayer)];
        const size = o.size || 30;
        const fg = textOn(kind.color);
        return '<svg class="umw-marker-svg" width="' + size + '" height="' + size + '" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
            '<g transform="translate(0 2)">' + shapeSvg(kind.shape, 'fill="rgba(0,0,0,0.28)"') + '</g>' +
            shapeSvg(kind.shape, 'fill="' + kind.color + '" stroke="#FFFFFF" stroke-width="2.2"') +
            '<g transform="translate(8.8 7.8) scale(0.6)" fill="' + fg + '" stroke="' + fg + '">' + GLYPHS[kind.glyph].replace(/__BG__/g, kind.color) + '</g>' +
            '</svg>';
    }

    /** Leaflet icon for a layer name (or marker kind). Needs Leaflet. */
    function markerIcon(kindOrLayer, o) {
        o = o || {};
        const kind = markerKind(kindOrLayer);
        const size = o.size || 30;
        return L.divIcon({
            className: 'umw-marker umw-marker--' + kind + (o.selected ? ' is-selected' : ''),
            html: markerSvg(kind, { size: size }),
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
            popupAnchor: [0, -size / 2]
        });
    }

    /** Same icon with a selection ring. Falls back to null when the icon is not one of ours. */
    function selectedIcon(icon) {
        const opts = icon && icon.options;
        if (!opts || String(opts.className || '').indexOf('umw-marker') === -1) return null;
        return L.divIcon(Object.assign({}, opts, { className: String(opts.className).replace(' is-selected', '') + ' is-selected' }));
    }

    // ------------------------------------------------------------------------------------------
    // Legends
    // ------------------------------------------------------------------------------------------

    function fillRow(label, fill, o) {
        o = o || {};
        const s = fillStyle(fill, o);
        return { type: 'fill', label: label, fill: fill, stroke: s.color, alpha: s.fillOpacity, dash: o.dash || null };
    }

    function lineRow(label, style, o) {
        o = o || {};
        return { type: 'line', label: label, color: style.color, weight: style.weight || 2, dash: style.dashArray || null, cap: style.lineCap || 'butt', ticks: !!o.ticks };
    }

    function pointRow(label, kind) {
        return { type: 'point', label: label, kind: kind };
    }

    function swatchHtml(row) {
        if (row.type === 'fill') {
            const bg = rgba(row.fill, row.alpha);
            const border = '1.5px ' + (row.dash ? 'dashed' : 'solid') + ' ' + row.stroke;
            return '<span class="lg-sw lg-sw--fill" style="background:' + bg + ';border:' + border + '"></span>';
        }
        if (row.type === 'line') {
            const w = Math.max(1.5, Math.min(row.weight, 5));
            const dash = row.dash ? ' stroke-dasharray="' + esc(String(row.dash).replace(/,/g, ' ')) + '"' : '';
            const ticks = row.ticks ? '<path d="M7 1.5v9M19 1.5v9" stroke="' + row.color + '" stroke-width="1.4"/>' : '';
            return '<span class="lg-sw lg-sw--line"><svg width="28" height="12" viewBox="0 0 28 12" aria-hidden="true">' +
                '<line x1="1" y1="6" x2="27" y2="6" stroke="' + row.color + '" stroke-width="' + w + '"' + dash + ' stroke-linecap="' + row.cap + '"/>' + ticks + '</svg></span>';
        }
        if (row.type === 'point') {
            return '<span class="lg-sw lg-sw--point">' + markerSvg(row.kind, { size: 22 }) + '</span>';
        }
        return '';
    }

    function rowHtml(row) {
        if (row.type === 'sizes') {
            const items = row.items.map(it =>
                '<span class="lg-size"><span class="lg-size-slot"><span class="lg-circle" style="width:' + it.d + 'px;height:' + it.d + 'px;background:' + rgba(row.color, 0.2) + ';border:1.5px solid ' + row.color + '"></span></span>' +
                '<span class="lg-size-label">' + esc(it.label) + '</span></span>').join('');
            return '<div class="lg-sizes"><div class="lg-heading">' + esc(row.label) + '</div><div class="lg-size-row">' + items + '</div></div>';
        }
        if (row.type === 'ramp') return rampHtml(row);
        return '<div class="lg-row">' + swatchHtml(row) + '<span class="lg-label">' + esc(row.label) + '</span></div>';
    }

    function rampHtml(row) {
        const bins = row.bins;
        const n = bins.length;
        const segs = bins.map(b => '<span style="background:' + b.color + '" title="' + esc(b.label) + '"></span>').join('');
        const idx = [0, Math.floor((n - 1) / 2), n - 1];
        const ticks = idx.map(i => '<span>' + esc(bins[i].label) + '</span>').join('');
        const aria = esc(bins[0].label + ' to ' + bins[n - 1].label + ', ' + n + ' classes');
        return '<div class="lg-ramp-wrap"><div class="lg-ramp" role="img" aria-label="' + aria + '">' + segs + '</div><div class="lg-ticks">' + ticks + '</div></div>';
    }

    function legendHtml(spec) {
        const groups = spec.groups || (spec.rows && spec.rows.length ? [{ heading: '', rows: spec.rows }] : []);
        const compact = !!spec.compact && groups.length === 1 && groups[0].rows.length === 1;
        let html = '<div class="lg' + (compact ? ' lg--compact' : '') + '">';
        if (compact) {
            const row = groups[0].rows[0];
            html += '<div class="lg-head lg-head--compact">' + swatchHtml(row) + '<span class="lg-title">' + esc(spec.title) + '</span></div>';
        } else {
            html += '<div class="lg-head"><span class="lg-title">' + esc(spec.title) + '</span>' +
                (spec.subtitle ? '<span class="lg-sub">' + esc(spec.subtitle) + '</span>' : '') + '</div>';
            html += '<div class="lg-body">';
            groups.forEach(g => {
                html += '<div class="lg-group">' + (g.heading ? '<div class="lg-heading">' + esc(g.heading) + '</div>' : '') + g.rows.map(rowHtml).join('') + '</div>';
            });
            html += '</div>';
        }
        if (spec.note) html += '<div class="lg-note">' + esc(spec.note) + '</div>';
        return html + '</div>';
    }

    function uniqueValues(features, getter) {
        const seen = [];
        features.forEach(f => {
            const v = getter(f && f.properties ? f.properties : {});
            if (v !== undefined && v !== null && v !== '' && seen.indexOf(v) === -1) seen.push(v);
        });
        return seen;
    }

    /**
     * Describe the legend of a vector layer. Returns { title, rows | groups, compact, note }.
     * `data` is the GeoJSON FeatureCollection (used to list only the classes that are present).
     * options.roadCategories: road categories present in the data (the caller classifies them).
     */
    function legendSpec(layerName, data, options) {
        options = options || {};
        const name = String(layerName || '');
        const n = norm(name);
        const features = data && Array.isArray(data.features) ? data.features : [];

        if (n.indexOf('soil type') !== -1) {
            const present = uniqueValues(features, p => p.NAME);
            const rows = SOIL.filter(s => present.indexOf(s.key) !== -1).map(s => fillRow(s.key, s.color, { alpha: 0.78 }));
            present.filter(v => !lookup(SOIL, v)).forEach(v => rows.push(fillRow(v, '#808080', { alpha: 0.78 })));
            return { title: 'Soil Type', rows: rows };
        }
        if (n.indexOf('erosion') !== -1) {
            const present = uniqueValues(features, erosionClassOf).map(norm);
            const rows = EROSION.filter(e => present.indexOf(norm(e.key)) !== -1).map(e => fillRow(e.key, e.color, { alpha: 0.7 }));
            return { title: 'Soil Erosion', rows: rows };
        }
        if (n.indexOf('agro') !== -1) {
            const present = uniqueValues(features, p => p.zone).sort();
            const groups = [];
            present.forEach(code => {
                const heading = aezGroup(code);
                let g = groups.find(x => x.heading === heading);
                if (!g) { g = { heading: heading, rows: [] }; groups.push(g); }
                g.rows.push(fillRow(code, aezColor(code), { alpha: 0.78 }));
            });
            return { title: 'Agro Ecological Zone', groups: groups };
        }
        if (options.roadCategories && options.roadCategories.length) {
            const rows = ROAD_ORDER.filter(c => options.roadCategories.indexOf(c) !== -1)
                .map(c => lineRow(c, { color: ROADS[c].color, weight: ROADS[c].weight, dashArray: ROADS[c].dashArray, lineCap: ROADS[c].lineCap }, { ticks: c === 'Railways' }));
            return { title: name, rows: rows };
        }
        const point = { 'rainfall': 'rainfall', 'temperature': 'temperature', 'evoporation': 'evaporation', 'water quality': 'wq-cea' };
        if (point[n]) {
            const label = n === 'evoporation' ? 'Evaporation' : name;
            return { title: name === 'Evoporation' ? 'Evaporation' : name, rows: [pointRow(label + ' station', point[n])], compact: true };
        }
        if (n === 'land cover' || features.some(f => f.properties && f.properties.classLULC !== undefined)) {
            const present = uniqueValues(features, p => p.classLULC).map(norm);
            const entries = LULC.filter(e => !present.length || present.indexOf(norm(e.key)) !== -1 ||
                present.some(p => LULC_ALIASES[p] === e.key));
            const groups = [];
            entries.forEach(e => {
                let g = groups.find(x => x.heading === e.group);
                if (!g) { g = { heading: e.group, rows: [] }; groups.push(g); }
                g.rows.push(fillRow(e.key, e.color));
            });
            return { title: name, groups: groups };
        }
        if (n === 'population' || features.some(f => f.properties && f.properties.Density !== undefined)) {
            return { title: name, subtitle: 'people per km\u00B2', rows: DENSITY.map(d => fillRow(d.key, d.color, { alpha: 0.8 })) };
        }
        if (n === 'landslide hazard zone' || features.some(f => f.properties && f.properties.level !== undefined)) {
            const rows = LANDSLIDE.map(l => fillRow(l.key, l.color, { alpha: 0.7 }));
            const hasNull = features.some(f => f.properties && (f.properties.level === null || f.properties.level === 'null' || f.properties.level === ''));
            if (hasNull) rows.push(fillRow('No data', NO_DATA_COLOR, { alpha: 0.7 }));
            return { title: name, rows: rows };
        }
        if (n === 'annual rainfall') {
            return { title: name, rows: [fillRow('Good', '#32CD32'), fillRow('Moderate', '#FFD700'), fillRow('Poor', '#FF6347')] };
        }
        const style = layerStyle(name);
        if (style) {
            const row = style.fillOpacity === 0
                ? lineRow(name, style)
                : { type: 'fill', label: name, fill: style.fillColor || style.color, stroke: style.color, alpha: style.fillOpacity, dash: style.dashArray };
            return { title: name, rows: [row], compact: true };
        }
        // Unknown layer: describe it by its geometry so the legend is never an empty box.
        const geom = features.length && features[0].geometry ? features[0].geometry.type : '';
        if (/Point/.test(geom)) return { title: name, rows: [pointRow(name, markerKind(name))], compact: true };
        if (/Line/.test(geom)) return { title: name, rows: [lineRow(name, { color: '#37474F', weight: 2 })], compact: true };
        return { title: name, rows: [{ type: 'fill', label: name, fill: DEFAULT_STYLE.fillColor, stroke: DEFAULT_STYLE.color, alpha: DEFAULT_STYLE.fillOpacity }], compact: true };
    }

    /** Legend of a proposal layer: the marker plus, when costs are present, what the circle size means. */
    function proposalLegendSpec(layerName, features, o) {
        o = o || {};
        const kind = markerKind(layerName);
        const count = features ? features.length : 0;
        const rows = [pointRow(MARKERS[kind].label + (count ? ' (' + count + ')' : ''), kind)];
        if (o.hasAmounts) {
            rows.push({
                type: 'sizes', label: 'Circle size = estimated cost', color: MARKERS[kind].color,
                items: [{ d: 14, label: 'up to Rs 50,000' }, { d: 20, label: 'up to Rs 200,000' }, { d: 30, label: 'over Rs 200,000' }]
            });
        }
        return { title: layerName, rows: rows };
    }

    /** Legend of a raster layer. `ranges` = [{ range, color }, ...] (colours are fixed by the PNG). */
    function rasterLegendSpec(layerName, ranges) {
        if (!ranges || !ranges.length) return { title: layerName, rows: [], note: 'No legend available for this layer.' };
        const bins = ranges.map(r => ({ label: String(r.range), color: r.color }));
        if (bins.length > 16) return { title: layerName, rows: [{ type: 'ramp', bins: bins }] };
        return { title: layerName, rows: bins.map(b => ({ type: 'fill', label: b.label, fill: b.color, stroke: shade(b.color, 0.3), alpha: 1 })) };
    }

    /** Ready-made options for L.geoJSON: used by the catalog preview so it matches the dashboard. */
    function geoJsonOptions(layerName) {
        return {
            style: function (feature) {
                const props = (feature && feature.properties) || {};
                return roadStyle(props) || polygonStyleFor(layerName, props);
            },
            pointToLayer: function (feature, latlng) {
                return L.marker(latlng, { icon: markerIcon(layerName) });
            }
        };
    }

    return {
        // helpers
        shade: shade, rgba: rgba, textOn: textOn, esc: esc, norm: norm,
        // palettes
        LULC: LULC, EROSION: EROSION, LANDSLIDE: LANDSLIDE, SOIL: SOIL, DENSITY: DENSITY, MARKERS: MARKERS, ROADS: ROADS, LAYER_STYLES: LAYER_STYLES,
        qualitative: QUALITATIVE, categoryColor: categoryColor, categoryColors: categoryColors,
        aezColor: aezColor, aezGroup: aezGroup,
        // lookups
        lulcColor: lulcColor, soilColor: soilColor, hazardColor: hazardColor, erosionClassOf: erosionClassOf,
        layerStyle: layerStyle, roadCategory: roadCategory, roadStyle: roadStyle,
        // styles
        fillStyle: fillStyle, polygonStyleFor: polygonStyleFor, geoJsonOptions: geoJsonOptions,
        // markers
        markerKind: markerKind, markerColor: markerColor, markerSvg: markerSvg, markerIcon: markerIcon, selectedIcon: selectedIcon,
        // legends
        legendSpec: legendSpec, proposalLegendSpec: proposalLegendSpec, rasterLegendSpec: rasterLegendSpec, legendHtml: legendHtml
    };
})();

if (typeof window !== 'undefined') window.Symbology = Symbology;
