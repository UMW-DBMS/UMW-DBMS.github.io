/**
 * Print / export map
 *
 * Purpose : Collects the visible layers, legends and view into a payload, stores it in localStorage and opens print-map.html.
 * Depends : Leaflet, global `map`; layerState / geoJsonLayers / pngOverlays / layerLegends from js/layers/*; waterQualityLayers from js/panels/station-data.js (all read at call time).
 * Exposes : openPrintMapWindow()
 */

let lastSelectedLayerName = '';

document.addEventListener('change', (event) => {
    const target = event.target;
    if (!target || !target.matches('#basePanel input[type="checkbox"], #proposalPanel input[type="checkbox"], #climPanel input[type="checkbox"], #waterPanel input[type="checkbox"], input[name="waterSource"]')) {
        return;
    }
    const label = target.id ? document.querySelector(`label[for="${target.id}"]`) : null;
    const layerName = ((label && label.textContent) || target.value || '').trim();
    if (target.checked && layerName) {
        lastSelectedLayerName = layerName;
        return;
    }
    if (!target.checked && layerName === lastSelectedLayerName) {
        lastSelectedLayerName = '';
    }
});

function pickSerializableOptions(options) {
    if (!options) return {};
    return {
        maxZoom: options.maxZoom,
        minZoom: options.minZoom,
        opacity: options.opacity,
        zIndex: options.zIndex,
        subdomains: options.subdomains,
        tms: options.tms,
        attribution: options.attribution,
        crossOrigin: true
    };
}

function pickVectorStyleOptions(options) {
    if (!options) return null;
    return {
        color: options.color,
        weight: options.weight,
        opacity: options.opacity,
        fillColor: options.fillColor,
        fillOpacity: options.fillOpacity,
        dashArray: options.dashArray,
        radius: options.radius
    };
}

function normalizeLayerName(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ');
}

function getCurrentSelectedLayerName() {
    if (lastSelectedLayerName) return lastSelectedLayerName;
    const checked = Array.from(document.querySelectorAll('#basePanel input[type="checkbox"]:checked, #proposalPanel input[type="checkbox"]:checked, #climPanel input[type="checkbox"]:checked, #waterPanel input[type="checkbox"]:checked, input[name="waterSource"]:checked'));
    if (!checked.length) return '';
    const lastChecked = checked[checked.length - 1];
    const label = lastChecked.id ? document.querySelector(`label[for="${lastChecked.id}"]`) : null;
    return ((label && label.textContent) || lastChecked.value || '').trim();
}

function getOverlayLayerByName(layerName) {
    const normalizedTarget = normalizeLayerName(layerName);
    if (!normalizedTarget) return null;

    const registries = [];
    if (typeof geoJsonLayers !== 'undefined' && geoJsonLayers) registries.push(geoJsonLayers);
    if (typeof pngOverlays !== 'undefined' && pngOverlays) registries.push(pngOverlays);
    if (typeof waterQualityLayers !== 'undefined' && waterQualityLayers) registries.push(waterQualityLayers);

    for (const registry of registries) {
        const names = Object.keys(registry || {});
        for (const name of names) {
            const normalizedName = normalizeLayerName(name);
            if (normalizedName !== normalizedTarget) continue;
            const layer = registry[name];
            if (layer && map.hasLayer(layer)) return layer;
        }
    }
    // Fallback: try partial match (helps with minor label differences).
    for (const registry of registries) {
        const names = Object.keys(registry || {});
        for (const name of names) {
            const normalizedName = normalizeLayerName(name);
            if (!normalizedName) continue;
            if (!normalizedTarget.includes(normalizedName) && !normalizedName.includes(normalizedTarget)) {
                continue;
            }
            const layer = registry[name];
            if (layer && map.hasLayer(layer)) return layer;
        }
    }
    return null;
}

function serializeOverlayLayer(layer) {
    if (!layer) return null;

    if (layer instanceof L.ImageOverlay && layer._url && typeof layer.getBounds === 'function') {
        const bounds = layer.getBounds();
        if (!bounds) return null;
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();
        const overlayUrl = layer._originalUrl || layer._url;
        return {
            type: 'imageOverlay',
            url: overlayUrl,
            bounds: [[sw.lat, sw.lng], [ne.lat, ne.lng]],
            options: {
                opacity: typeof layer.options?.opacity === 'number' ? layer.options.opacity : 1,
                crossOrigin: true
            }
        };
    }

    if (layer instanceof L.GeoJSON && typeof layer.eachLayer === 'function') {
        const features = [];
        const pushFeatureFromLayer = (featureLayer) => {
            if (!featureLayer || typeof featureLayer.toGeoJSON !== 'function') return;
            const feature = featureLayer.toGeoJSON();
            if (!feature || !feature.geometry) return;
            let markerMeta = null;

            if (featureLayer instanceof L.Marker) {
                const icon = featureLayer.options ? featureLayer.options.icon : null;
                if (icon && icon.options) {
                    if (icon.options.html) {
                        markerMeta = {
                            kind: 'divIcon',
                            className: icon.options.className || '',
                            html: icon.options.html || '',
                            iconSize: icon.options.iconSize || null,
                            iconAnchor: icon.options.iconAnchor || null,
                            popupAnchor: icon.options.popupAnchor || null
                        };
                    } else if (icon.options.iconUrl) {
                        markerMeta = {
                            kind: 'icon',
                            iconUrl: icon.options.iconUrl,
                            iconRetinaUrl: icon.options.iconRetinaUrl || null,
                            shadowUrl: icon.options.shadowUrl || null,
                            iconSize: icon.options.iconSize || null,
                            iconAnchor: icon.options.iconAnchor || null,
                            popupAnchor: icon.options.popupAnchor || null,
                            shadowSize: icon.options.shadowSize || null
                        };
                    }
                }
            }

            const style = featureLayer.options ? {
                color: featureLayer.options.color,
                weight: featureLayer.options.weight,
                opacity: featureLayer.options.opacity,
                fillColor: featureLayer.options.fillColor,
                fillOpacity: featureLayer.options.fillOpacity,
                dashArray: featureLayer.options.dashArray,
                radius: featureLayer.options.radius
            } : {};
            feature.properties = feature.properties || {};
            feature.properties.__printStyle = style;
            if (markerMeta) feature.properties.__printMarker = markerMeta;
            features.push(feature);
        };

        layer.eachLayer((featureLayer) => {
            if (!featureLayer) return;
            if (featureLayer instanceof L.LayerGroup && typeof featureLayer.eachLayer === 'function') {
                featureLayer.eachLayer((child) => pushFeatureFromLayer(child));
                return;
            }
            if (typeof featureLayer.toGeoJSON === 'function') {
                pushFeatureFromLayer(featureLayer);
            }
        });

        if (!features.length) return null;
        return {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: features
            },
            styleOptions: pickVectorStyleOptions(layer.options)
        };
    }

    if (typeof layer.toGeoJSON === 'function') {
        try {
            const geojson = layer.toGeoJSON();
            if (!geojson) return null;
            return {
                type: 'geojson',
                data: geojson,
                styleOptions: pickVectorStyleOptions(layer.options)
            };
        } catch (err) {
            console.warn('Layer cannot be serialized for print:', err);
        }
    }

    return null;
}

function collectPrintableLayers(selectedLayerNames) {
    const printableLayers = [];
    const seenOverlays = new Set();
    const layerNames = Array.isArray(selectedLayerNames) ? selectedLayerNames : [];

    // First, collect all active base layers.
    map.eachLayer((layer) => {
        if (layer instanceof L.TileLayer && layer._url) {
            printableLayers.push({
                type: 'tile',
                url: layer._url,
                options: pickSerializableOptions(layer.options),
                opacity: typeof layer.options?.opacity === 'number' ? layer.options.opacity : 1
            });
        }
    });

    // Then collect only overlays that correspond to actively selected layer names.
    layerNames.forEach((layerName) => {
        const layer = getOverlayLayerByName(layerName);
        if (!layer || seenOverlays.has(layer)) return;
        seenOverlays.add(layer);
        const serializedOverlay = serializeOverlayLayer(layer);
        if (serializedOverlay) printableLayers.push(serializedOverlay);
    });

    // Include any additional active station layers that may not resolve through label matching.
    Object.keys(waterQualityLayers || {}).forEach((layerName) => {
        const layer = waterQualityLayers[layerName];
        if (!layer || !map.hasLayer(layer) || seenOverlays.has(layer)) return;
        seenOverlays.add(layer);
        const serializedOverlay = serializeOverlayLayer(layer);
        if (serializedOverlay) printableLayers.push(serializedOverlay);
    });

    // Keep at least one base layer if none serialized for any reason.
    const hasTile = printableLayers.some((cfg) => cfg.type === 'tile');
    if (!hasTile) {
        printableLayers.unshift({
            type: 'tile',
            url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            options: { maxZoom: 19, crossOrigin: true },
            opacity: 1
        });
    }

    return printableLayers;
}

/** A legend collapsed on screen is still printed in full. */
function expandLegendHtml(html) {
    return String(html || '').replace(/\sis-collapsed/g, '');
}

function collectLegendHtmlForLayer(layerName) {
    const visibleLegends = [];
    const normalizedLayerName = normalizeLayerName(layerName);

    // 1) Prefer legend controls tracked in JS (if available).
    try {
        const legends = (typeof layerLegends !== 'undefined' && layerLegends) ? layerLegends : (window.layerLegends || null);
        if (legends && normalizedLayerName) {
            Object.keys(legends).forEach((key) => {
                if (normalizeLayerName(key) !== normalizedLayerName) return;
                const control = legends[key];
                if (!control || typeof control.getContainer !== 'function') return;
                const container = control.getContainer();
                const html = container && container.innerHTML ? expandLegendHtml(container.innerHTML.trim()) : '';
                if (html) visibleLegends.push({ html, text: (container.textContent || '').toLowerCase() });
            });
        }
    } catch (e) {
        // ignore and fall back to DOM search
    }

    // 2) Fallback: scan the DOM for visible legends.
    const legendSelectors = [
        '.leaflet-control .info.legend',
        '.leaflet-control .legend'
    ];
    const nodes = Array.from(document.querySelectorAll(legendSelectors.join(',')));

    nodes.forEach((node) => {
        if (!node) return;
        const style = window.getComputedStyle(node);
        if (style.display === 'none' || style.visibility === 'hidden') return;
        const html = expandLegendHtml((node.innerHTML || '').trim());
        if (!html) return;
        visibleLegends.push({ html, text: (node.textContent || '').toLowerCase() });
    });

    if (!visibleLegends.length) return '';

    if (normalizedLayerName) {
        const matchedLegends = visibleLegends.filter((legend) => legend.text.includes(normalizedLayerName));
        if (matchedLegends.length) {
            return matchedLegends.map((legend) => `<div class="legend-block">${legend.html}</div>`).join('');
        }
    }

    // Fallback: include every visible legend block to avoid dropping parts of multi-block legends.
    return visibleLegends.map((legend) => `<div class="legend-block">${legend.html}</div>`).join('');
}

function collectLegendHtmlForSelectedLayers(selectedLayers) {
    const allLegendBlocks = [];
    const seenLegendHtml = new Set();
    const layerNames = Array.isArray(selectedLayers) ? selectedLayers : [];

    layerNames.forEach((layerName) => {
        const legendHtml = collectLegendHtmlForLayer(layerName);
        if (!legendHtml || seenLegendHtml.has(legendHtml)) return;
        seenLegendHtml.add(legendHtml);
        allLegendBlocks.push(legendHtml);
    });

    if (!allLegendBlocks.length) {
        return collectLegendHtmlForLayer(null);
    }

    return allLegendBlocks.join('');
}

function ensureHtml2CanvasLoaded() {
    if (window.html2canvas) return Promise.resolve(window.html2canvas);
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
        script.onload = () => resolve(window.html2canvas);
        script.onerror = () => reject(new Error('Failed to load html2canvas.'));
        document.head.appendChild(script);
    });
}

function getVisibleLegendBlocks() {
    const selectors = [
        '.leaflet-control .info.legend',
        '.leaflet-control .legend'
    ];
    const nodes = Array.from(document.querySelectorAll(selectors.join(',')));
    const blocks = [];

    nodes.forEach((node) => {
        const style = window.getComputedStyle(node);
        if (style.display === 'none' || style.visibility === 'hidden') return;
        const html = expandLegendHtml((node.innerHTML || '').trim());
        if (!html) return;
        if (!blocks.includes(html)) blocks.push(html);
    });

    return blocks;
}

function getPrintCaptureRect() {
    const mapElement = document.getElementById('map');
    if (!mapElement) return null;

    const mapRect = mapElement.getBoundingClientRect();
    const header = document.querySelector('header');
    const footer = document.querySelector('footer');
    const headerRect = header ? header.getBoundingClientRect() : null;
    const footerRect = footer ? footer.getBoundingClientRect() : null;

    const captureTop = Math.max(mapRect.top, headerRect ? headerRect.bottom : mapRect.top);
    const captureBottom = Math.min(mapRect.bottom, footerRect ? footerRect.top : mapRect.bottom);
    const captureLeft = mapRect.left;
    const captureRight = mapRect.right;
    const captureHeight = Math.max(50, captureBottom - captureTop);

    return {
        x: Math.round(captureLeft + window.scrollX),
        y: Math.round(captureTop + window.scrollY),
        width: Math.round(captureRight - captureLeft),
        height: Math.round(captureHeight)
    };
}

function getSelectedMwsBoundsFromVisibleLayers() {
    const mwsSelect = document.getElementById('selectMWSID');
    const selectedMws = (mwsSelect && mwsSelect.value ? mwsSelect.value : '').trim();
    if (!selectedMws) return null;

    let mergedBounds = null;
    const normalizeId = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizedSelected = normalizeId(selectedMws);

    map.eachLayer((layer) => {
        if (!(layer instanceof L.GeoJSON)) return;
        if (typeof layer.eachLayer !== 'function') return;

        layer.eachLayer((featureLayer) => {
            const props = featureLayer && featureLayer.feature ? featureLayer.feature.properties || {} : {};
            const candidate = (
                props.MWS_ID ??
                props.MWSID ??
                props.MWS_Id ??
                props.MWS ??
                props.mws_id ??
                props.mwsid
            );
            if (candidate === undefined || candidate === null) return;

            const normalizedCandidate = normalizeId(candidate);
            const isMatch =
                normalizedCandidate === normalizedSelected ||
                normalizedCandidate.endsWith(normalizedSelected) ||
                normalizedSelected.endsWith(normalizedCandidate);
            if (!isMatch) return;
            if (typeof featureLayer.getBounds !== 'function') return;
            const bounds = featureLayer.getBounds();
            if (!bounds || (bounds.isValid && !bounds.isValid())) return;
            if (!mergedBounds) mergedBounds = bounds;
            else mergedBounds.extend(bounds);
        });
    });

    return mergedBounds;
}

function getPreferredPrintBounds() {
    const mwsBounds = getSelectedMwsBoundsFromVisibleLayers();
    if (mwsBounds) return mwsBounds;
    const selectedLayerName = getCurrentSelectedLayerName();
    const selectedLayer = getOverlayLayerByName(selectedLayerName);

    if (selectedLayer && selectedLayer instanceof L.GeoJSON && typeof selectedLayer.getBounds === 'function') {
        const selectedBounds = selectedLayer.getBounds();
        if (selectedBounds && (!selectedBounds.isValid || selectedBounds.isValid())) {
            return selectedBounds;
        }
    }

    if (selectedLayer && selectedLayer instanceof L.ImageOverlay && typeof selectedLayer.getBounds === 'function') {
        const selectedBounds = selectedLayer.getBounds();
        if (selectedBounds && (!selectedBounds.isValid || selectedBounds.isValid())) {
            return selectedBounds;
        }
    }

    return null;
}

async function openPrintMapWindow() {

    const center = map.getCenter();
    const zoom = map.getZoom();
    const preferredBounds = getPreferredPrintBounds();
    const activeBounds = preferredBounds || map.getBounds();
    const selectedLayers = Object.keys(layerState || {}).filter((layerName) => layerState[layerName]);
    const waterSourceLayers = Object.keys(waterQualityLayers || {}).filter((layerName) => waterQualityLayers[layerName]);
    const allSelectedLayers = Array.from(new Set([...selectedLayers, ...waterSourceLayers]));

    const dsdSelect = document.getElementById('selectDSD');
    const mwsSelect = document.getElementById('selectMWSID');
    const selectedDsdText = dsdSelect && dsdSelect.selectedIndex >= 0
        ? dsdSelect.options[dsdSelect.selectedIndex].text.trim()
        : '';
    const selectedMwsText = mwsSelect && mwsSelect.selectedIndex >= 0
        ? mwsSelect.options[mwsSelect.selectedIndex].text.trim()
        : '';

    const normalizedDsdText = selectedDsdText || 'Not selected';
    const normalizedLayerText = allSelectedLayers.length
        ? allSelectedLayers.join(', ')
        : 'Not selected';
    const normalizedMwsText = selectedMwsText || 'Not selected';

    const printTopicText = 'MWS_ID: ' + normalizedMwsText + ' | DSD: ' + normalizedDsdText + ' | Layers: ' + normalizedLayerText;

    const printableLayers = collectPrintableLayers(allSelectedLayers);
    const selectedLegendHtml = collectLegendHtmlForSelectedLayers(allSelectedLayers);

    const popup = window.open('', '_blank', 'width=1200,height=900');

    if (!popup) {
        alert('Please allow pop-ups to open the print map page.');
        return;
    }

    const printPayload = {
        center: { lat: center.lat, lng: center.lng },
        zoom: zoom,
        printBounds: [
            [activeBounds.getSouthWest().lat, activeBounds.getSouthWest().lng],
            [activeBounds.getNorthEast().lat, activeBounds.getNorthEast().lng]
        ],
        layerConfigs: printableLayers,
        printTopic: printTopicText,
        selectedLegendHtml: selectedLegendHtml || '',
        mapDimensions: {
            width: map.getSize().x,
            height: map.getSize().y
        }
    };

    localStorage.setItem('printMapPayload', JSON.stringify(printPayload));

    popup.location.href = 'print-map.html';

}
