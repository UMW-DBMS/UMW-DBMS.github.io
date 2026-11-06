/**
 * Station Data panel: CBO data (Department of National Community Water Supply)
 *
 * Purpose : Adds the group "CBO Data - Department of National Community Water Supply" to the Station Data panel: 14 categories
 *           (Intake, Pump, Reservoir ...), each with a check box and a "See more" link to the RWSS dashboard. A ticked category is
 *           read from Data/EXD/14_CBO/<category>.geojson and drawn in its own colour; clicking a feature opens Feature Info.
 *           This file is separate from station-data.js, so that file needs no change.
 * Depends : Leaflet, global `map`, symbology.js, layer-state.js (layerState, geoJsonLayers), layer-legends.js (layerLegends,
 *           enhanceLegend, enableLegendInteraction), feature-info.js (updateInfoPanel, highlightFeature). station-data.js builds the
 *           panel (renderWaterPanel); this script adds its group after that, and again whenever the panel is rebuilt.
 * Exposes : StationCbo { CATEGORIES, layerName, load, remove, clearAll, ensureGroup }
 *
 * CBO layers are remembered in geoJsonLayers / layerState (like the Base Layers), not in station-data.js's own registry, so ticking a
 * water-quality or climate station never removes them, and they are printed with the other layers. A new District, DSD or MWS clears them.
 */

const StationCbo = (function () {
    'use strict';

    const DATA_BASE_URL = 'https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Data/EXD/14_CBO/';
    const GROUP_ID = 'cboDataGroup';
    const GROUP_TITLE = 'CBO Data - Department of National Community Water Supply';
    const LAYER_PREFIX = 'CBO - ';

    /** name: the category (also the file name), website: its page on the RWSS dashboard, color: the colour on the map. */
    const CATEGORIES = [
        { name: 'Absence of Vegetation', color: '#e41a1c', website: 'https://web.rwss.lk/index.php/geo_dashboard/common?dq=16&is_public=true' },
        { name: 'Availability of Water Treatment', color: '#377eb8', website: 'https://web.rwss.lk/index.php/geo_dashboard/common?dq=15&is_public=true' },
        { name: 'CBO Category', color: '#4daf4a', website: 'https://web.rwss.lk/index.php/geo_dashboard/common?dq=3&is_public=true' },
        { name: 'Containments from Houses', color: '#984ea3', website: 'https://web.rwss.lk/index.php/geo_dashboard/common?dq=19&is_public=true' },
        { name: 'Erosion or Landslide', color: '#ff7f00', website: 'https://web.rwss.lk/index.php/geo_dashboard/common?dq=18&is_public=true' },
        { name: 'Gender Empowerment', color: '#a65628', website: 'https://web.rwss.lk/index.php/geo_dashboard/common?dq=42&is_public=true' },
        { name: 'Intake', color: '#f781bf', website: 'https://web.rwss.lk/index.php/geo_dashboard/common?dq=24&is_public=true' },
        { name: 'Protection for Source', color: '#17a589', website: 'https://web.rwss.lk/index.php/geo_dashboard/common?dq=17&is_public=true' },
        { name: 'Pump', color: '#d4ac0d', website: 'https://web.rwss.lk/index.php/geo_dashboard/common?dq=25&is_public=true' },
        { name: 'Reservoir Type', color: '#5d6d7e', website: 'https://web.rwss.lk/index.php/geo_dashboard/common?dq=44&is_public=true' },
        { name: 'Reservoir', color: '#1f618d', website: 'https://web.rwss.lk/index.php/geo_dashboard/common?dq=26&is_public=true' },
        { name: 'Schema Type', color: '#7d3c98', website: 'https://web.rwss.lk/index.php/geo_dashboard/common?dq=4&is_public=true' },
        { name: 'Type of Water Source', color: '#229954', website: 'https://web.rwss.lk/index.php/geo_dashboard/common?dq=46&is_public=true' },
        { name: 'Water Overall', color: '#d35400', website: 'https://web.rwss.lk/index.php/geo_dashboard/common?dq=35&is_public=true' }
    ];

    function layerName(category) { return LAYER_PREFIX + category; }
    function byName(name) { return CATEGORIES.find(c => c.name === name) || null; }
    function slug(text) { return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''); }
    function boxOf(name) { return document.getElementById('cbo_' + slug(name)); }

    // ------------------------------------------------------------------------------------------
    // Legend card and removal
    // ------------------------------------------------------------------------------------------

    function removeLegend(key) {
        if (typeof layerLegends === 'undefined' || !layerLegends[key]) return;
        try { map.removeControl(layerLegends[key]); } catch (e) { /* ignore */ }
        delete layerLegends[key];
    }

    function addLegend(key, color) {
        if (typeof layerLegends === 'undefined' || typeof Symbology === 'undefined') return;
        removeLegend(key);
        const legend = L.control({ position: 'topright' });
        legend.onAdd = function () {
            const div = L.DomUtil.create('div', 'info legend umw-legend');
            div.innerHTML = Symbology.legendHtml({ title: key, rows: [{ type: 'fill', label: key, fill: color, stroke: color, alpha: 0.35, dash: null }], compact: true });
            if (typeof enhanceLegend === 'function') enhanceLegend(div);
            if (typeof enableLegendInteraction === 'function') enableLegendInteraction(div);
            return div;
        };
        layerLegends[key] = legend;
        legend.addTo(map);
    }

    function setStatus(name, text) {
        const box = boxOf(name);
        const status = box && box.parentElement ? box.parentElement.querySelector('.cbo-status') : null;
        if (!status) return;
        status.textContent = text || '';
        status.style.display = text ? '' : 'none';
    }

    /** Take one category off the map (its legend with it). */
    function remove(name) {
        const key = layerName(name);
        if (typeof geoJsonLayers !== 'undefined' && geoJsonLayers[key]) {
            try { map.removeLayer(geoJsonLayers[key]); } catch (e) { /* ignore */ }
            delete geoJsonLayers[key];
        }
        if (typeof layerState !== 'undefined') layerState[key] = false;
        removeLegend(key);
        setStatus(name, '');
    }

    /** Untick every category and take them all off the map. */
    function clearAll() {
        CATEGORIES.forEach(c => {
            const box = boxOf(c.name);
            if (box) box.checked = false;
            remove(c.name);
        });
    }

    // ------------------------------------------------------------------------------------------
    // Loading one category
    // ------------------------------------------------------------------------------------------

    function bindClick(key) {
        return function (feature, featureLayer) {
            featureLayer.on('click', (event) => {
                const clickLatLng = event && event.latlng ? event.latlng : (featureLayer.getLatLng ? featureLayer.getLatLng() : null);
                if (typeof window.handleMeasurePointFromLayer === 'function' && window.handleMeasurePointFromLayer(clickLatLng)) return;
                if (typeof window.showClickCoordinates === 'function') window.showClickCoordinates(clickLatLng);
                updateInfoPanel((feature && feature.properties) || {}, key, featureLayer);
                highlightFeature(featureLayer);
            });
        };
    }

    async function load(name) {
        const category = byName(name);
        if (!category) return;
        const key = layerName(name);
        setStatus(name, 'loading...');
        try {
            const response = await fetch(DATA_BASE_URL + encodeURIComponent(name + '.geojson'));
            if (!response.ok) throw new Error('Network response was not ok (' + response.status + ')');
            const data = await response.json();
            // Unticked, or the location changed, while the file was loading: draw nothing. Already drawn: do not draw twice.
            if (!layerState[key] || geoJsonLayers[key]) { setStatus(name, ''); return; }
            const color = category.color;
            const layer = L.geoJSON(data, {
                style: () => ({ color: color, fillColor: color, fillOpacity: 0.35, weight: 2 }),
                pointToLayer: (feature, latlng) => L.circleMarker(latlng, { radius: 4.5, color: color, fillColor: color, fillOpacity: 0.85, weight: 2 }),
                onEachFeature: bindClick(key)
            }).addTo(map);
            geoJsonLayers[key] = layer;
            addLegend(key, color);
            setStatus(name, '');
            try {
                const bounds = layer.getBounds();
                if (bounds && bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] });
            } catch (e) { /* nothing to zoom to */ }
        } catch (error) {
            console.error('Failed to load CBO data for', name, error);
            layerState[key] = false;
            const box = boxOf(name);
            if (box) box.checked = false;
            setStatus(name, 'could not be loaded');
        }
    }

    // ------------------------------------------------------------------------------------------
    // The group in the Station Data panel
    // ------------------------------------------------------------------------------------------

    function buildGroup() {
        const group = document.createElement('div');
        group.id = GROUP_ID;
        group.style.marginTop = '10px';
        const title = document.createElement('h3');
        title.textContent = GROUP_TITLE;
        title.style.marginTop = '0';
        group.appendChild(title);
        CATEGORIES.forEach((category) => {
            const row = document.createElement('div');
            row.style.marginLeft = '16px';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.name = 'cboDataCategory';
            checkbox.value = category.name;
            checkbox.id = 'cbo_' + slug(category.name);
            checkbox.addEventListener('change', () => {
                const key = layerName(category.name);
                layerState[key] = checkbox.checked;
                if (checkbox.checked) load(category.name);
                else remove(category.name);
            });
            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.textContent = category.name;
            const more = document.createElement('a');
            more.href = category.website;
            more.target = '_blank';
            more.rel = 'noopener noreferrer';
            more.textContent = 'See more';
            more.style.marginLeft = '8px';
            more.style.whiteSpace = 'nowrap';      // "See more" never breaks into two lines, a long category name wraps instead
            more.style.flex = '0 0 auto';
            const status = document.createElement('span');
            status.className = 'cbo-status';
            status.setAttribute('role', 'status');
            status.style.cssText = 'display:none;margin-left:6px;font-size:0.9em;font-style:italic;color:#7a5a00;';
            row.appendChild(checkbox);
            row.appendChild(label);
            row.appendChild(more);
            row.appendChild(status);
            group.appendChild(row);
        });
        return group;
    }

    /** Add the group to the Station Data panel if it is not there (and no other script has already added CBO check boxes). */
    function ensureGroup() {
        const panel = document.getElementById('waterPanel');
        if (!panel || panel.querySelector('#' + GROUP_ID) || panel.querySelector('input[name="cboDataCategory"]')) return;
        panel.appendChild(buildGroup());
        // A rebuilt panel starts with empty boxes: show the ones that are on the map as ticked.
        try {
            CATEGORIES.forEach(c => { const box = boxOf(c.name); if (box && layerState[layerName(c.name)]) box.checked = true; });
        } catch (e) { /* layer-state.js is not loaded yet: nothing is on the map, so nothing to show as ticked */ }
    }

    // station-data.js rebuilds the panel by calling renderWaterPanel(); add the group again after each rebuild.
    if (typeof window.renderWaterPanel === 'function') {
        const originalRenderWaterPanel = window.renderWaterPanel;
        window.renderWaterPanel = function () {
            const result = originalRenderWaterPanel.apply(this, arguments);
            ensureGroup();
            return result;
        };
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensureGroup);
    else ensureGroup();

    // A new District, DSD or mini watershed starts clean, like every other layer.
    ['selectDist', 'selectDSD', 'selectMWSID'].forEach((id) => {
        const select = document.getElementById(id);
        if (select) select.addEventListener('change', clearAll);
    });

    return { CATEGORIES: CATEGORIES, layerName: layerName, load: load, remove: remove, clearAll: clearAll, ensureGroup: ensureGroup };
})();

window.StationCbo = StationCbo;
