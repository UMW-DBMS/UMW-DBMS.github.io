/**
 * Base Layers: water-feature types, tanks, and the DAD / UNDP tank details
 *
 * Purpose : The newer parts of the Base Layers panel.
 *             - Water features-point / -polygon / -line: one source file each, shown as one check box per feature type
 *               (Anicut, Flood Gate, Spill ... / Reservoir area, Tank area, Lake ... / Streams, Canals ...). The file is
 *               read once and filtered by its feature code.
 *             - "Reservoirs/ Tanks": Major Tanks and Minor Tanks from their own UMW files (loaded by loadGeoJsonLayer).
 *             - "DAD Tanks Details" (Minor Tanks, Anicuts) and "UNDP Tanks Details" (Tanks): one file per mini watershed,
 *               filtered to the selected MWS and drawn with the markers of symbology.js.
 *           Colours of areas, markers and legend cards come from symbology.js; each layer shown here gets a legend card.
 * Depends : Leaflet, global `map`, symbology.js, layer-state.js (layerState, geoJsonLayers), layer-legends.js (layerLegends,
 *           enhanceLegend, enableLegendInteraction), feature-info.js (updateInfoPanel, highlightFeature: used when a feature is clicked).
 *           layer-panels.js calls renderWaterFeatureGroup() and addReservoirTankCategory(); its check boxes call the loaders here.
 * Exposes : renderWaterFeatureGroup(), addReservoirTankCategory(), loadDadProposalLayer(), removeWaterFeatureLayer(),
 *           isWaterFeatureGroupLayer(), WATER_FEATURE_POINT_TYPES, WATER_FEATURE_POLYGON_TYPES, WATER_FEATURE_LINE_TYPES
 */

// ---------------------------------------------------------------------------------------------------------------------
// Where the data is
// ---------------------------------------------------------------------------------------------------------------------

const MAJOR_TANKS_LAYER_URL = 'https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Data/EXD/02_HYD/Hydro_Tk/MajorTanks_UMW.geojson';
const MINOR_TANKS_LAYER_URL = 'https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Data/EXD/02_HYD/Hydro_Tk/MinorTanks_UMW.geojson';

// DAD and UNDP tank details are stored outside the individual MWS registries: one file per mini watershed in each folder.
const DAD_RAW_BASE_URL = 'https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/';
const DAD_DATA_ROOT = 'IWWRMP/Data/EXD/15_TNK/';
// key = the dadCategory given by addReservoirTankCategory (compared without spaces, capitals or a final "s")
const DAD_CATEGORIES = {
    anicut: { folder: 'DAD_Anicuts', filePrefix: 'DAD_Anicut_MWS_', marker: 'anicut', positionFromLatLng: true, label: 'Anicuts' },
    minortank: { folder: 'DAD_Tanks', filePrefix: 'DAD_MinorTanks_MWS_', marker: 'dad-tank', positionFromLatLng: false, label: 'Minor Tank' },
    undptank: { folder: 'UNDP_Tanks', filePrefix: 'UNDP_Tanks_MWS_', marker: 'undp-tank', positionFromLatLng: false, label: 'UNDP Tanks' }
};

// ---------------------------------------------------------------------------------------------------------------------
// Feature types of the three water-feature layers
// ---------------------------------------------------------------------------------------------------------------------

// Water features-point: HP_GFCODE (HP_GFCODDE in some exports) holds the feature code; the colour is part of the meaning.
const WATER_FEATURE_POINT_TYPES = [
    { name: 'Anicut', code: 'ANCTP', color: '#d73027' }, { name: 'Flood Gate', code: 'FLGAP', color: '#fc8d59' },
    { name: 'Sluice', code: 'SLCEP', color: '#fee08b' }, { name: 'Spill', code: 'SPLLP', color: '#91cf60' },
    { name: 'Waterfall', code: 'WTRFP', color: '#1a9850' }, { name: 'Culvert', code: 'CLVTP', color: '#4575b4' },
    { name: 'Spring', code: 'SPRNP', color: '#74add1' }, { name: 'Water Tower', code: 'TOWRP', color: '#984ea3' },
    { name: 'Tube Well', code: 'TBWLP', color: '#e7298a' }, { name: 'Well', code: 'WELLP', color: '#8c510a' }
];
const WATER_FEATURE_POINT_FALLBACK_COLOR = '#35b9ff';

// Water features-polygon: HF_CODE is the published field; HG_GFCODE is kept as a fallback for older exports.
const WATER_FEATURE_POLYGON_TYPES = [
    { name: 'Reservoir area', code: 'RSVRA' },
    { name: 'Tank area', code: 'TANKA' },
    { name: 'Lake', code: 'LAKEA' },
    { name: 'Others', code: null }
];

// Water features-line: HL_GFCODE. "Others" takes every code that is not listed.
const WATER_FEATURE_LINE_TYPES = [
    { name: 'Streams', codes: ['STRMV', 'STRML'], color: '#08519c' },
    { name: 'Canals', codes: ['CNNLL', 'CHNAL', 'CHNLL', 'CHNLV'], color: '#2171b5' },
    { name: 'Tunels', codes: ['TNNLL'], color: '#4292c6' },
    { name: 'Others', codes: [], color: '#6baed6' }
];

// One request per source file, however many of its types are ticked.
const waterFeatureDataCache = new Map();

function waterFeatureLayerKind(layerName) {
    const key = String(layerName || '').trim().toLowerCase().replace(/[\s-]+/g, '');
    if (key === 'waterfeaturespoint') return 'point';
    if (key === 'waterfeaturespolygon') return 'polygon';
    if (key === 'waterfeaturesline') return 'line';
    return null;
}

function isWaterFeatureGroupLayer(layerName) {
    return waterFeatureLayerKind(layerName) !== null;
}

function waterFeatureTypesOf(kind) {
    return kind === 'point' ? WATER_FEATURE_POINT_TYPES : (kind === 'polygon' ? WATER_FEATURE_POLYGON_TYPES : WATER_FEATURE_LINE_TYPES);
}

function waterFeatureCodeOf(kind, properties) {
    const p = properties || {};
    if (kind === 'point') return String(p.HP_GFCODE || p.HP_GFCODDE || '').trim().toUpperCase();
    if (kind === 'polygon') return String(p.HF_CODE || p.HG_GFCODE || '').trim().toUpperCase();
    return String(p.HL_GFCODE || '').trim().toUpperCase();
}

function waterFeatureMatchesType(kind, feature, type) {
    const code = waterFeatureCodeOf(kind, feature && feature.properties);
    if (kind === 'line') {
        const known = WATER_FEATURE_LINE_TYPES.reduce((all, t) => all.concat(t.codes), []);
        return type.name === 'Others' ? known.indexOf(code) === -1 : type.codes.indexOf(code) !== -1;
    }
    if (kind === 'polygon') {
        const known = WATER_FEATURE_POLYGON_TYPES.filter(t => t.code).map(t => t.code);
        return type.name === 'Others' ? known.indexOf(code) === -1 : code === type.code;
    }
    return code === type.code;
}

function waterFeaturePointName(properties) {
    const name = properties && properties.HP_Nm_Hydr;
    if (name === null || name === undefined) return '';
    const label = String(name).trim();
    return label.toLowerCase() === 'null' ? '' : label;
}

function fetchWaterFeatureData(url) {
    const key = String(url || '').trim();
    if (!waterFeatureDataCache.has(key)) {
        waterFeatureDataCache.set(key, fetch(key).then((response) => {
            if (!response.ok) throw new Error('Network response was not ok (' + response.status + ')');
            return response.json();
        }));
    }
    return waterFeatureDataCache.get(key);
}

// ---------------------------------------------------------------------------------------------------------------------
// Click on a feature (same behaviour as every other layer: Measure tool first, then coordinates, then Feature Info)
// ---------------------------------------------------------------------------------------------------------------------

function bindFeatureClick(layerName) {
    return function (feature, featureLayer) {
        featureLayer.on('click', (event) => {
            const clickLatLng = event && event.latlng ? event.latlng : (featureLayer.getLatLng ? featureLayer.getLatLng() : null);
            if (typeof window.handleMeasurePointFromLayer === 'function' && window.handleMeasurePointFromLayer(clickLatLng)) return;
            if (typeof window.showClickCoordinates === 'function') window.showClickCoordinates(clickLatLng);
            updateInfoPanel((feature && feature.properties) || {}, layerName, featureLayer);
            highlightFeature(featureLayer);
        });
    };
}

// ---------------------------------------------------------------------------------------------------------------------
// Legend card of one layer (the same card as the other layers: Symbology.legendHtml)
// ---------------------------------------------------------------------------------------------------------------------

function removeWaterFeatureLegend(layerName) {
    if (typeof layerLegends === 'undefined' || !layerLegends[layerName]) return;
    try { map.removeControl(layerLegends[layerName]); } catch (e) { /* ignore */ }
    delete layerLegends[layerName];
}

function addWaterFeatureLegend(layerName, row) {
    if (typeof layerLegends === 'undefined' || typeof Symbology === 'undefined') return;
    removeWaterFeatureLegend(layerName);
    const legend = L.control({ position: 'topright' });
    legend.onAdd = function () {
        const div = L.DomUtil.create('div', 'info legend umw-legend');
        div.innerHTML = Symbology.legendHtml({ title: layerName, rows: [row], compact: true });
        if (typeof enhanceLegend === 'function') enhanceLegend(div);
        if (typeof enableLegendInteraction === 'function') enableLegendInteraction(div);
        return div;
    };
    layerLegends[layerName] = legend;
    legend.addTo(map);
}

/** Take a layer of this file off the map, with its legend card. */
function removeWaterFeatureLayer(layerName) {
    if (geoJsonLayers[layerName]) {
        try { map.removeLayer(geoJsonLayers[layerName]); } catch (e) { /* ignore */ }
        delete geoJsonLayers[layerName];
    }
    removeWaterFeatureLegend(layerName);
}

// ---------------------------------------------------------------------------------------------------------------------
// Loading one type of a water-feature layer
// ---------------------------------------------------------------------------------------------------------------------

function waterFeatureLayerOptions(kind, layerName, type) {
    if (kind === 'point') {
        return {
            pointToLayer: (feature, latlng) => {
                const color = type.color || WATER_FEATURE_POINT_FALLBACK_COLOR;
                const marker = L.circleMarker(latlng, { radius: 5, color: color, weight: 1.5, fillColor: color, fillOpacity: 0.9 });
                const name = waterFeaturePointName(feature && feature.properties);
                if (name) {
                    marker.bindTooltip(name, { permanent: true, direction: 'top', offset: [0, -5], className: 'water-feature-point-label', opacity: 0.9 });
                }
                return marker;
            },
            onEachFeature: bindFeatureClick(layerName)
        };
    }
    if (kind === 'polygon') {
        return { style: Symbology.layerStyle('Water features-polygon') || { color: '#1E78B4', fillColor: '#5BB5E0', weight: 1, fillOpacity: 0.65 }, onEachFeature: bindFeatureClick(layerName) };
    }
    return { style: { color: type.color, weight: 2.5, opacity: 0.9 }, onEachFeature: bindFeatureClick(layerName) };
}

function waterFeatureLegendRow(kind, type) {
    if (kind === 'point') return { type: 'fill', label: type.name, fill: type.color, stroke: type.color, alpha: 0.9, dash: null };
    if (kind === 'polygon') {
        const style = Symbology.layerStyle('Water features-polygon') || { color: '#1E78B4', fillColor: '#5BB5E0', fillOpacity: 0.65 };
        return { type: 'fill', label: type.name, fill: style.fillColor || style.color, stroke: style.color, alpha: style.fillOpacity, dash: null };
    }
    return { type: 'line', label: type.name, color: type.color, weight: 2.5, dash: null, cap: 'butt', ticks: false };
}

/** Draw one type of a water-feature layer (kind = 'point', 'polygon' or 'line') when its check box is ticked. */
function loadWaterFeatureType(kind, url, layerName, type) {
    fetchWaterFeatureData(url).then((data) => {
        // Unticked, or the mini watershed changed, while the file was loading: draw nothing. Already drawn: do not draw twice.
        if (!layerState[layerName] || geoJsonLayers[layerName]) return;
        const features = (Array.isArray(data && data.features) ? data.features : []).filter((feature) => waterFeatureMatchesType(kind, feature, type));
        const layer = L.geoJSON({ type: 'FeatureCollection', features: features }, waterFeatureLayerOptions(kind, layerName, type));
        geoJsonLayers[layerName] = layer.addTo(map);
        addWaterFeatureLegend(layerName, waterFeatureLegendRow(kind, type));
    }).catch((error) => {
        waterFeatureDataCache.delete(String(url || '').trim());      // try the file again next time
        console.error('Error loading water-feature ' + kind + 's for ' + layerName + ':', error);
    });
}

// ---------------------------------------------------------------------------------------------------------------------
// The check boxes of a water-feature layer (rows added straight into the category, as css/dashboard.css styles them)
// ---------------------------------------------------------------------------------------------------------------------

function waterFeatureSlug(text) {
    return String(text || '').trim().replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase();
}

/**
 * Add a title row and one check-box row per type of a Water features layer to `container` (the category's div).
 * Returns true when `layerName` is one of the three water-feature layers (and the rows were added), false otherwise.
 */
function renderWaterFeatureGroup(container, layerName, url, databaseName, index) {
    const kind = waterFeatureLayerKind(layerName);
    if (!kind || !container) return false;

    const titleRow = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = layerName;
    titleRow.appendChild(title);
    container.appendChild(titleRow);

    waterFeatureTypesOf(kind).forEach((type) => {
        const typeLayerName = layerName + ' - ' + type.name;
        const row = document.createElement('div');
        row.style.marginLeft = '16px';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = 'layer_' + waterFeatureSlug(databaseName) + '_' + index + '_' + waterFeatureSlug(type.code || type.name);
        checkbox.checked = layerState[typeLayerName] || false;
        checkbox.addEventListener('change', (event) => {
            const isChecked = event.target.checked;
            layerState[typeLayerName] = isChecked;
            if (isChecked) loadWaterFeatureType(kind, url, typeLayerName, type);
            else removeWaterFeatureLayer(typeLayerName);
        });
        const label = document.createElement('label');
        label.htmlFor = checkbox.id;
        label.textContent = type.name;
        row.appendChild(checkbox);
        row.appendChild(label);
        container.appendChild(row);
    });
    return true;
}

// ---------------------------------------------------------------------------------------------------------------------
// "Reservoirs/ Tanks", "DAD Tanks Details" and "UNDP Tanks Details": extra categories of the Base Layers panel
// ---------------------------------------------------------------------------------------------------------------------

/**
 * Keep the tank layers together in their own categories. The registry CSV can place Major / Minor Tanks in different
 * databases, so the tank layers are taken out of the CSV's categories and the three tank categories are built here.
 * They are placed after "Water features" (if the registry has it) and at the end otherwise.
 */
function addReservoirTankCategory(databaseLayers) {
    const categoryName = 'Reservoirs/ Tanks';
    const tankLayers = [];

    Object.keys(databaseLayers).forEach((databaseName) => {
        const remainingLayers = databaseLayers[databaseName].filter((layerInfo) => {
            const normalizedName = String(layerInfo.Layer || '').trim().toLowerCase();
            return !/^(major|minor)\s+tanks?$/.test(normalizedName);
        });
        if (remainingLayers.length) databaseLayers[databaseName] = remainingLayers;
        else delete databaseLayers[databaseName];
    });

    // These controls are tied to their own datasets, not to the combined Water features-polygon layer.
    tankLayers.push({ Layer: 'Major Tanks', geojson: MAJOR_TANKS_LAYER_URL, Group: 'Base' });
    tankLayers.push({ Layer: 'Minor Tanks', geojson: MINOR_TANKS_LAYER_URL, Group: 'Base' });

    const dadTankDetails = [
        { Layer: 'Minor Tanks', dadCategory: 'Minor Tank', baseLayerKey: 'DAD Tanks Details - Minor Tanks', Group: 'Base' },
        { Layer: 'Anicuts', dadCategory: 'Anicuts', baseLayerKey: 'DAD Tanks Details - Anicuts', Group: 'Base' }
    ];
    const undpTankDetails = [
        { Layer: 'Tanks', dadCategory: 'UNDP Tanks', baseLayerKey: 'UNDP Tanks Details - Tanks', Group: 'Base' }
    ];

    const orderedLayers = {};
    let inserted = false;
    Object.keys(databaseLayers).forEach((databaseName) => {
        orderedLayers[databaseName] = databaseLayers[databaseName];
        if (!inserted && String(databaseName).trim().toLowerCase() === 'water features') {
            orderedLayers[categoryName] = tankLayers;
            orderedLayers['DAD Tanks Details'] = dadTankDetails;
            orderedLayers['UNDP Tanks Details'] = undpTankDetails;
            inserted = true;
        }
    });
    if (!inserted) {
        orderedLayers[categoryName] = tankLayers;
        orderedLayers['DAD Tanks Details'] = dadTankDetails;
        orderedLayers['UNDP Tanks Details'] = undpTankDetails;
    }
    return orderedLayers;
}

// ---------------------------------------------------------------------------------------------------------------------
// DAD and UNDP tank details: one file per mini watershed
// ---------------------------------------------------------------------------------------------------------------------

function normalizeDadFolderName(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '').replace(/s$/, '');
}

/** MWS id for comparison: "MWS_003", "003" and "3" are the same mini watershed. */
function normalizeDadMwsId(value) {
    const normalized = String(value === null || value === undefined ? '' : value).trim().toUpperCase()
        .replace(/^MWS[-_\s]*/i, '')
        .replace(/[^A-Z0-9]/g, '');
    return /^\d+$/.test(normalized) ? String(Number(normalized)) : normalized;
}

function dadFeatureMatchesSelectedMws(feature, selectedMwsId) {
    const p = feature && feature.properties ? feature.properties : {};
    const featureMwsId = p.MWS_ID !== undefined ? p.MWS_ID : (p.MWSID !== undefined ? p.MWSID : (p.MWS_Id !== undefined ? p.MWS_Id : (p.mws_id !== undefined ? p.mws_id : p.mwsid)));
    return normalizeDadMwsId(featureMwsId) === normalizeDadMwsId(selectedMwsId);
}

/** Position a feature from its Lat and Lng attributes (always for `forceLatLng`, otherwise only when it has no geometry). */
function addDadCoordinates(feature, forceLatLng) {
    const p = feature && feature.properties ? feature.properties : {};
    const pick = (...names) => { for (const n of names) { if (p[n] !== undefined && p[n] !== null && p[n] !== '') return p[n]; } return undefined; };
    const lat = Number(pick('Lat', 'LAT', 'latitude', 'Latitude'));
    const lng = Number(pick('Lng', 'LNG', 'lon', 'Longitude', 'longitude'));
    if ((!forceLatLng && feature.geometry) || !Number.isFinite(lat) || !Number.isFinite(lng)) return feature;
    return Object.assign({}, feature, { geometry: { type: 'Point', coordinates: [lng, lat] } });
}

function dadCategoryConfig(category) {
    return DAD_CATEGORIES[normalizeDadFolderName(category)] || null;
}

/** The address of the file of the selected mini watershed. Throws a plain Error when the id or the category is not usable. */
function getDadProposalUrl(category, selectedMwsId) {
    const config = dadCategoryConfig(category);
    if (!config) throw new Error('Unknown tank category: ' + category);
    const mwsCode = String(selectedMwsId || '').trim().replace(/^MWS[-_\s]*/i, '').replace(/-/g, '_');
    if (!/^[A-Z0-9]+(?:_[A-Z0-9]+)*$/i.test(mwsCode)) throw new Error('Invalid MWS ID for ' + category + ': ' + selectedMwsId);
    return DAD_RAW_BASE_URL + DAD_DATA_ROOT + config.folder + '/' + encodeURIComponent(config.filePrefix + mwsCode + '.geojson');
}

/**
 * Draw one DAD / UNDP tank category for the selected mini watershed.
 * Resolves true when it is on the map, false when there was nothing to draw (the user is told; the box should be unticked).
 * Rejects when the file could not be loaded.
 */
async function loadDadProposalLayer(category, layerKey) {
    const config = dadCategoryConfig(category);
    const selectedMwsId = document.getElementById('selectMWSID').value;
    const url = getDadProposalUrl(category, selectedMwsId);
    const response = await fetch(url);
    if (!response.ok) throw new Error(response.status + ' while loading ' + url);
    const data = await response.json();

    // Unticked, or the mini watershed changed, while the file was loading: draw nothing.
    if (!layerState[layerKey] || geoJsonLayers[layerKey]) return true;

    // Anicuts are positioned from the Lat and Lng attributes supplied in the data.
    const features = (Array.isArray(data && data.features) ? data.features : [])
        .filter((feature) => dadFeatureMatchesSelectedMws(feature, selectedMwsId))
        .map((feature) => addDadCoordinates(feature, config.positionFromLatLng))
        .filter((feature) => feature && feature.geometry);
    if (!features.length) {
        alert('No ' + config.label + ' records are available for ' + selectedMwsId + '.');
        return false;
    }

    const layer = L.geoJSON({ type: 'FeatureCollection', features: features }, {
        pointToLayer: (feature, latlng) => L.marker(latlng, { icon: Symbology.markerIcon(config.marker) }),
        onEachFeature: bindFeatureClick(config.label)
    }).addTo(map);
    geoJsonLayers[layerKey] = layer;
    addWaterFeatureLegend(layerKey, { type: 'point', label: layerKey, kind: config.marker });
    return true;
}
