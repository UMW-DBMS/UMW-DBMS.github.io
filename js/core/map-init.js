/**
 * Map initialisation
 *
 * Purpose : Creates the Leaflet map, the background tile layers, the footer base-layer switcher and the click-to-inspect popup.
 * Depends : Leaflet. Loaded first among the app scripts (everything else needs the global `map`).
 * Exposes : `map`, `osmLayer`/`esriLayer`/`openTopoLayer`/`customLayer`, changeBaseLayer(), showClickCoordinates()
 */

const map = L.map('map').setView([7.8731, 80.7718], 8);  // Centered on Sri Lanka

window.addEventListener('resize', () => {
    setTimeout(() => map.invalidateSize(), 50);
});

setTimeout(() => map.invalidateSize(), 250);

// Base layers
const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, crossOrigin: true }).addTo(map);

const esriLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, crossOrigin: true });

const openTopoLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { maxZoom: 17, crossOrigin: true });

const customLayer = L.tileLayer('https://gisapps.nsdi.gov.lk/server/rest/services/SLNSDI/Farming/MapServer', { maxZoom: 19, crossOrigin: true });

function getClickedBoundaryProperties(latlng) {
    if (!latlng || typeof window.findMwsFeatureAtLatLng !== 'function') return null;
    const matchedFeature = window.findMwsFeatureAtLatLng(latlng);
    return matchedFeature && matchedFeature.properties ? matchedFeature.properties : null;
}

function escapePopupText(value) {
    return String(value ?? 'N/A')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function showBoundaryPopup(latlng, props) {
    const mwsId = props.MWS_ID || props.MWD_ID || props.MWSID || 'N/A';
    const dsd = props.DSD || props.MainDSD || props.DS_Divisio || 'N/A';
    const district = props.District || props.DISTRICT || 'N/A';
    const popupHtml = [
        `<strong>MWS_ID:</strong> ${escapePopupText(mwsId)}`,
        `<strong>District:</strong> ${escapePopupText(district)}`,
        `<strong>DSD:</strong> ${escapePopupText(dsd)}`
    ].join('<br>');

    L.popup()
        .setLatLng(latlng)
        .setContent(popupHtml)
        .openOn(map);
}

function normalizeMwsIdForPopup(value) {
    return String(value || '').replace(/-/g, '_').trim().toLowerCase();
}

function shouldShowBoundaryPopup(props) {
    if (!props) return false;
    const selectMWSID = document.getElementById('selectMWSID');
    const selectedMwsId = selectMWSID ? normalizeMwsIdForPopup(selectMWSID.value) : '';
    if (!selectedMwsId) return true;

    const clickedMwsId = normalizeMwsIdForPopup(props.MWS_ID || props.MWD_ID || props.MWSID);
    return clickedMwsId !== selectedMwsId;
}

// Show boundary details as a popup when the user clicks inside an MWS boundary.
function showClickCoordinates(latlng) {
    if (!latlng) return;
    const infoPopup = document.getElementById('infoPopupPanel');
    const props = getClickedBoundaryProperties(latlng);
    if (infoPopup) {
        infoPopup.style.display = 'block';
        infoPopup.innerHTML = `Coordinates: ${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`;
    }
    if (shouldShowBoundaryPopup(props)) showBoundaryPopup(latlng, props);
}

window.showClickCoordinates = showClickCoordinates;

map.on('click', function (e) {
    if (typeof window.isMeasureModeActive === 'function' && window.isMeasureModeActive()) {
        return;
    }
    if (!e || !e.latlng) return;
    showClickCoordinates(e.latlng);
});

// Change base layer function
function changeBaseLayer() {
    const baseLayerSelect = document.getElementById('baseLayerSelect');
    const selectedLayer = baseLayerSelect.value;

    // Remove all layers
    map.eachLayer(function (layer) {
        if (layer instanceof L.TileLayer) {
            map.removeLayer(layer);
        }

    });

    // Add selected layer
    switch (selectedLayer) {
        case 'osm':
            osmLayer.addTo(map);
            break;
        case 'esri':
            esriLayer.addTo(map);
            break;
        case 'opentopo':
            openTopoLayer.addTo(map);
            break;
        case 'custom':
            customLayer.addTo(map);
            break;
        default:
            osmLayer.addTo(map);
            break;
    }
}
