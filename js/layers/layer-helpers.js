/**
 * Layer helpers
 *
 * Purpose : Small pure helpers: URL/name checks, proposal amount and label helpers, road classification, raster overrides, MWS code lookup.
 * Depends : layer-config.js, layer-state.js (call time).
 * Exposes : isGeoJsonUrl(), parseAmount(), getAmountFromProps(), getNoValue(), getSoilErosionClass(), getRoadStyle(), hasRoadCategories(), getRasterOverrideUrl(), isRasterLegendLayer(), isMiniWatershedLayerName(), getSelectedMwsCode()
 */

function shouldShowNoLabel(layerName) {
    return proposalLabelLayers.has(String(layerName || '').toLowerCase());
}

// Temporarily hidden from the Base Layers panel.
// Remove entries above to show these layers again later.
function isGeoJsonUrl(url) {
    return /\.geojson(?:[?#].*)?$/i.test(String(url || '').trim());
}

function parseAmount(value) {
    if (value === null || value === undefined) return null;
    const str = String(value).replace(/[, ]+/g, '');
    if (!str) return null;
    const num = Number(str);
    return Number.isFinite(num) ? num : null;
}

function getAmountFromProps(props) {
    if (!props) return null;
    return parseAmount(props['Total_Cost:'] ?? props['Total_Cost'] ?? props['Amount__Rs:'] ?? props['Amount (LKR):'] ?? props['Amount__Rs'] ?? props['Estimated Cost:'] ?? props['Estimated Cost'] ?? props['Total Cost (Rs.):'] ?? props['Total Cost (Rs.)']);
}

// Colour of the cost circle around a proposal marker: the marker's own colour.
function getAmountColor(layerName) {
    return Symbology.markerColor(layerName);
}

function getAmountRadius(amount) {
    if (amount <= 50000) return 15;
    if (amount <= 200000) return 18;
    return 35;
}

function getNoValue(props) {
    if (!props) return null;
    const direct = props['No_'] ?? props['No.'] ?? props['No:'] ?? props['No'];
    if (direct !== undefined && direct !== null) return direct;
    for (const [key, value] of Object.entries(props)) {
        const normalized = String(key).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normalized === 'no') return value;
    }
    return null;
}

function getSoilErosionClass(props) {
    return Symbology.erosionClassOf(props);
}

function normalizeRoadCode(value) {
    return String(value || '').replace(/\s+/g, '').toUpperCase();
}

function getRoadCategoryFromCode(value) {
    const code = normalizeRoadCode(value);
    if (!code) return null;
    for (const [category, config] of Object.entries(ROAD_CATEGORY_CONFIG)) {
        if (config.codes.has(code)) return category;
    }
    return null;
}

function getRoadStyle(feature) {
    return Symbology.roadStyle(feature && feature.properties);
}

function hasRoadCategories(data) {
    return !!(data && Array.isArray(data.features) && data.features.some((feature) => getRoadCategoryFromCode(feature && feature.properties ? feature.properties.TL_GFCODE : '')));
}

function isSoilErosionHazardLayer(layerName) {
    const normalizedLayerName = String(layerName || '').trim().toLowerCase().replace(/\s+/g, ' ');
    return normalizedLayerName.includes('soil erosion');
}

function getRasterOverrideUrl(layerName, url) {
    if (isSoilErosionHazardLayer(layerName)) {
        return 'https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Data/Derive/Soil_Erosion.png';
    }

    return url;
}

function isRasterLegendLayer(layerName) {
    const normalizedLayerName = String(layerName || '').trim().toLowerCase();
    return normalizedLayerName === 'dem' || isSoilErosionHazardLayer(layerName);
}

function isMiniWatershedLayerName(layerName) {
    const normalizedLayerName = String(layerName || '').trim().toLowerCase().replace(/\s+/g, ' ');
    return normalizedLayerName === 'miniwatershed' || normalizedLayerName === 'mini watershed';
}

function findLayerCheckboxByLabelText(labelText) {
    const normalizedTarget = String(labelText || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const labels = Array.from(document.querySelectorAll('#basePanel label'));
    const matchingLabel = labels.find((label) => String(label.textContent || '').trim().toLowerCase().replace(/\s+/g, ' ') === normalizedTarget);
    return matchingLabel && matchingLabel.htmlFor ? document.getElementById(matchingLabel.htmlFor) : null;
}

function getSelectedMwsCode() {
    const selectElement = document.getElementById('selectMWSID');
    return String(selectElement && selectElement.value ? selectElement.value : '')
        .replace(/-/g, '_')
        .replace(/^MWS_/i, '')
        .trim();
}

async function resolveEnvironmentalProtectionUrls() {
    return [ENVIRONMENTAL_PROTECTION_LAYER_URL];
}
