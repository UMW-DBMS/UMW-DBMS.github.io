/**
 * Layer legends
 *
 * Purpose : Draws the map legends. Vector layers get their own legend card (top right); raster layers
 *           (DEM, soil erosion, rainfall, temperature, evaporation) share one stacked card (bottom right).
 *           What a legend contains is decided in symbology.js; this file only places and animates it.
 * Depends : Leaflet, global `map`, symbology.js, layer-config.js (colorRanges), layer-helpers.js.
 * Exposes : legendo, layerLegends, createLayerLegendControl(), createProposalLegendControl(),
 *           ensureLegendoVisible(), clearBottomLegendIfLayer(), resetBottomLegend(), updateLegend()
 */

// Registry of legend controls, keyed by layer name.
const layerLegends = {};

// Raster legends currently shown, in the order they were added.
const rasterLegendLayers = [];

// Most recently added raster layer (kept for older code that reads it).
let activeBottomLegendLayer = '';

let isLegendoAdded = false;

/** Make every legend title a collapse button (mouse and keyboard). The legend's own HTML stays plain so it can be copied to the print view. */
function enhanceLegend(div) {
    div.querySelectorAll('.lg:not(.lg--compact) .lg-head').forEach(head => {
        head.setAttribute('role', 'button');
        head.setAttribute('tabindex', '0');
        head.setAttribute('aria-expanded', head.closest('.lg').classList.contains('is-collapsed') ? 'false' : 'true');
        head.title = 'Click to show or hide';
    });
}

function toggleLegend(head) {
    const lg = head.closest('.lg');
    if (!lg || lg.classList.contains('lg--compact')) return;
    lg.classList.toggle('is-collapsed');
    head.setAttribute('aria-expanded', lg.classList.contains('is-collapsed') ? 'false' : 'true');
}

function enableLegendInteraction(div) {
    if (L.DomEvent) {
        if (L.DomEvent.disableClickPropagation) L.DomEvent.disableClickPropagation(div);
        if (L.DomEvent.disableScrollPropagation) L.DomEvent.disableScrollPropagation(div);
    }
    div.addEventListener('click', function (e) {
        const head = e.target.closest ? e.target.closest('.lg-head') : null;
        if (head) toggleLegend(head);
    });
    div.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const head = e.target.closest ? e.target.closest('.lg-head') : null;
        if (head) {
            e.preventDefault();
            toggleLegend(head);
        }
    });
}

/** Road categories present in a data set (the legend lists only these). */
function getPresentRoadCategories(data) {
    const found = [];
    ((data && data.features) || []).forEach(f => {
        const category = getRoadCategoryFromCode(f && f.properties ? f.properties.TL_GFCODE : '');
        if (category && found.indexOf(category) === -1) found.push(category);
    });
    return found;
}

/** Legend control for a vector layer, built from the loaded data so it lists only what is on the map. */
function createLayerLegendControl(layerName, data) {
    const legend = L.control({ position: 'topright' });
    legend.onAdd = function () {
        const div = L.DomUtil.create('div', 'info legend umw-legend');
        const roadCategories = hasRoadCategories(data) ? getPresentRoadCategories(data) : [];
        div.innerHTML = Symbology.legendHtml(Symbology.legendSpec(layerName, data, { roadCategories: roadCategories }));
        enhanceLegend(div);
        enableLegendInteraction(div);
        return div;
    };
    return legend;
}

/** Legend control for a proposal layer: marker symbol, count and (when costs exist) what the circle size means. */
function createProposalLegendControl(layerName, data) {
    const legend = L.control({ position: 'topright' });
    legend.onAdd = function () {
        const features = (data && data.features) || [];
        const hasAmounts = shouldShowNoLabel(layerName) && features.some(f => getAmountFromProps(f && f.properties) !== null);
        const div = L.DomUtil.create('div', 'info legend umw-legend');
        div.innerHTML = Symbology.legendHtml(Symbology.proposalLegendSpec(layerName, features, { hasAmounts: hasAmounts }));
        enhanceLegend(div);
        enableLegendInteraction(div);
        return div;
    };
    return legend;
}

// ---------------------------------------------------------------------------
// Raster legends (bottom right)
// ---------------------------------------------------------------------------

const legendo = L.control({ position: 'bottomright' });

legendo.onAdd = function () {
    const div = L.DomUtil.create('div', 'info legend umw-legend umw-legend--raster');
    div.innerHTML = '<div id="legend-list" class="lg-stack"></div>';
    enableLegendInteraction(div);
    return div;
};

function renderBottomLegend() {
    const container = legendo.getContainer ? legendo.getContainer() : null;
    const list = container ? container.querySelector('#legend-list') : document.getElementById('legend-list');
    if (!list) return;
    list.innerHTML = rasterLegendLayers
        .map(name => Symbology.legendHtml(Symbology.rasterLegendSpec(name, colorRanges[name])))
        .join('');
    if (container) enhanceLegend(container);
}

function ensureLegendoVisible() {
    if (!isLegendoAdded) {
        legendo.addTo(map);
        isLegendoAdded = true;
    }
}

function removeBottomLegendControl() {
    if (isLegendoAdded) {
        try { map.removeControl(legendo); } catch (e) { /* ignore */ }
        isLegendoAdded = false;
    }
}

/** Remove one raster layer's legend; the card disappears when no raster legend is left. */
function clearBottomLegendIfLayer(layerName) {
    const index = rasterLegendLayers.indexOf(layerName);
    if (index === -1) return;
    rasterLegendLayers.splice(index, 1);
    activeBottomLegendLayer = rasterLegendLayers.length ? rasterLegendLayers[rasterLegendLayers.length - 1] : '';
    if (rasterLegendLayers.length) {
        renderBottomLegend();
    } else {
        removeBottomLegendControl();
    }
}

/** Clear all raster legends (used when the MWS changes). */
function resetBottomLegend() {
    rasterLegendLayers.length = 0;
    activeBottomLegendLayer = '';
    removeBottomLegendControl();
}

/** Show (or refresh) the legend of a raster layer. */
function updateLegend(layerName) {
    ensureLegendoVisible();
    if (rasterLegendLayers.indexOf(layerName) === -1) rasterLegendLayers.push(layerName);
    activeBottomLegendLayer = layerName;
    renderBottomLegend();
}
