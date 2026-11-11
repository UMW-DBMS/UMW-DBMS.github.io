/**
 * Feature info and highlight
 *
 * Purpose : Click-to-inspect: feature attribute panel, cyan highlight, and the population hit-test fallback.
 * Depends : Leaflet, global `map`, layer-state.js.
 * Exposes : updateInfoPanel(), highlightFeature(), clearFeatureSelection() (also on window), enablePopulationClickFallback()
 */

function pointInRing(point, ring) {
    let inside = false;
    const x = point.lng;
    const y = point.lat;

    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i][0];
        const yi = ring[i][1];
        const xj = ring[j][0];
        const yj = ring[j][1];
        const intersects = ((yi > y) !== (yj > y)) &&
            (x < ((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON) + xi);
        if (intersects) inside = !inside;
    }

    return inside;
}

function pointInPolygonCoordinates(point, polygonCoordinates) {
    if (!Array.isArray(polygonCoordinates) || !polygonCoordinates.length) return false;
    if (!pointInRing(point, polygonCoordinates[0])) return false;

    for (let i = 1; i < polygonCoordinates.length; i++) {
        if (pointInRing(point, polygonCoordinates[i])) return false;
    }

    return true;
}

function pointInFeatureGeometry(point, geometry) {
    if (!geometry || !Array.isArray(geometry.coordinates)) return false;
    if (geometry.type === 'Polygon') {
        return pointInPolygonCoordinates(point, geometry.coordinates);
    }
    if (geometry.type === 'MultiPolygon') {
        return geometry.coordinates.some((polygonCoordinates) =>
            pointInPolygonCoordinates(point, polygonCoordinates)
        );
    }
    return false;
}

function findLayerForFeature(geoJsonLayer, feature) {
    let matchedLayer = null;
    geoJsonLayer.eachLayer((layer) => {
        if (!matchedLayer && layer.feature === feature) {
            matchedLayer = layer;
        }
    });
    return matchedLayer || geoJsonLayer;
}

function enablePopulationClickFallback(layerName, data, geoJsonLayer) {
    if (String(layerName || '').trim().toLowerCase() !== 'population') return;
    if (populationClickFallbackHandler) {
        map.off('click', populationClickFallbackHandler);
    }

    const features = Array.isArray(data && data.features) ? data.features : [];
    populationClickFallbackHandler = function (event) {
        if (!event || !event.latlng || !map.hasLayer(geoJsonLayer)) return;

        const matchedFeature = features.find((feature) =>
            pointInFeatureGeometry(event.latlng, feature && feature.geometry)
        );
        if (!matchedFeature) return;

        if (typeof window.showClickCoordinates === 'function') {
            window.showClickCoordinates(event.latlng);
        }
        const targetLayer = findLayerForFeature(geoJsonLayer, matchedFeature);
        updateInfoPanel(matchedFeature.properties || {}, layerName, targetLayer);
        highlightFeature(targetLayer);
    };

    map.on('click', populationClickFallbackHandler);
}

// Function to update the attribute panel with properties of the clicked feature
function updateInfoPanel(properties, layerName, featureLayer) {
    properties = properties || {};
    //const attributePanel = document.getElementById('attributePanel');
    //attributePanel.innerHTML = ''; // Clear previous content
    const attributePanel = document.getElementById('attributePanel');
    attributePanel.style.display = 'block';  // <-- Show panel automatically
    attributePanel.innerHTML = ''; // Clear previous content
    const title = document.createElement('h4');
    title.textContent = 'Feature Info';
    attributePanel.appendChild(title);

    const closeButton = document.createElement('button');
    closeButton.classList.add('hide-btn');
    closeButton.textContent = 'Close';
    closeButton.onclick = function () {
        clearFeatureSelection();
        hidePanel('attributePanel');
    };

    attributePanel.appendChild(closeButton);  // ✅ Append the close button here

    // Create a list to display properties
    const list = document.createElement('ul');

    // Add "Layer" header in bold black and the layer name in blue
    const layerNameItem = document.createElement('li');
    layerNameItem.innerHTML = `<strong style="color: black;">Layer:</strong> <span style="color: blue;">${layerName}</span>`;
    list.appendChild(layerNameItem);

    // Loop through properties and display each attribute
    for (const [key, value] of Object.entries(properties)) {
        const photoPath = key === 'photopath' && value ? String(value).trim() : '';
        if (photoPath && photoPath.toLowerCase() !== 'not_available') {
            // If the referenced .jpg file is not found, retry its .JPG counterpart (and vice versa).
            const imageItem = document.createElement('li');
            imageItem.innerHTML = `<strong style="color: black;">${key}:</strong><br>`;
            const image = document.createElement('img');
            image.alt = 'Photo';
            image.style.cssText = 'max-width: 100%; height: auto;';
            image.addEventListener('error', function () {
                const fallbackPhotoPath = photoPath.replace(/\.jpg(?=([?#].*)?$)/i, (extension) =>
                    extension === '.jpg' ? '.JPG' : '.jpg'
                );
                if (fallbackPhotoPath !== photoPath) {
                    image.src = fallbackPhotoPath;
                }
            }, { once: true });
            image.src = photoPath;
            imageItem.appendChild(image);
            list.appendChild(imageItem);
        } else {
            // For other properties, add them as text
            const listItem = document.createElement('li');
            listItem.innerHTML = `<strong style="color: black;">${key}:</strong> <span style="color: black;">${value}</span>`;
            list.appendChild(listItem);
        }
    }

    attributePanel.appendChild(list); // Append list to the attribute panel

    // Highlight the selected feature
    highlightFeature(featureLayer);
}

function captureOriginalPathStyle(featureLayer) {
    if (!(featureLayer instanceof L.Path) || featureLayer.__originalStyle) return;
    const options = featureLayer.options || {};
    featureLayer.__originalStyle = {
        color: options.color,
        weight: options.weight,
        dashArray: options.dashArray,
        fillColor: options.fillColor,
        fillOpacity: options.fillOpacity,
        opacity: options.opacity,
        lineCap: options.lineCap,
        lineJoin: options.lineJoin,
        stroke: options.stroke,
        fill: options.fill
    };
}

function resetFeatureHighlight(featureLayer) {
    if (!featureLayer) return;
    if (featureLayer instanceof L.Marker) {
        if (featureLayer.originalIcon) featureLayer.setIcon(featureLayer.originalIcon);
        return;
    }
    if (featureLayer instanceof L.Path) {
        const originalStyle = featureLayer.__originalStyle;
        if (originalStyle) featureLayer.setStyle(originalStyle);
    }
}

function clearFeatureSelection() {
    if (currentHighlightedFeature) {
        resetFeatureHighlight(currentHighlightedFeature);
        currentHighlightedFeature = null;
    }
    const attributePanel = document.getElementById('attributePanel');
    if (attributePanel) {
        attributePanel.innerHTML = '';
        attributePanel.style.display = 'none';
    }
}

window.clearFeatureSelection = clearFeatureSelection;

// Function to highlight the selected feature
function highlightFeature(featureLayer) {
    if (!featureLayer) return;
    if (currentHighlightedFeature && currentHighlightedFeature !== featureLayer) {
        resetFeatureHighlight(currentHighlightedFeature);
    }
    captureOriginalPathStyle(featureLayer);
    // Check the type of the feature (point, line, polygon)
    if (featureLayer instanceof L.Marker) {
        // Highlighting a point (marker) by setting a custom icon (red dot or other icon)
        if (!featureLayer.originalIcon) {
            featureLayer.originalIcon = featureLayer.options.icon;  // Save original icon if not already saved
        }
        const ringIcon = Symbology.selectedIcon(featureLayer.originalIcon);   // marker with a selection ring
        featureLayer.setIcon(ringIcon || L.divIcon({
            className: 'highlighted-dot', // Custom class for styling
            html: '<div style="width: 12px; height: 12px; background-color: cyan; border-radius: 50%;"></div>', // Red circle (dot)
            iconSize: [12, 12], // Size of the dot
            iconAnchor: [6, 6], // Anchor point for the center of the dot
            popupAnchor: [0, -10]
        }));
    } else if (featureLayer instanceof L.CircleMarker && featureLayer.options && featureLayer.options.stroke !== false) {
        // Highlighting a point drawn as a circle (water-feature points). The cost circles of proposals have no outline and are left as they were.
        featureLayer.setStyle({ weight: 3, color: '#00A5BD', fillColor: '#FFEB3B', fillOpacity: 0.95 });
    } else if (featureLayer instanceof L.Polyline) {
        // Highlighting a line (polyline)
        featureLayer.setStyle({
            weight: 5,     // Thicker line
            color: 'cyan', // Cyan color for the line
            dashArray: '', // Solid line (no dashes)
            fillOpacity: 0.7  // Line opacity
        });
    } else if (featureLayer instanceof L.Polygon) {
        // Highlighting a polygon
        featureLayer.setStyle({
            weight: 3,      // Thicker border around the polygon
            color: '#00A5BD',  // Teal border: visible on every fill colour
            fillColor: '#FFEB3B', // Yellow fill
            fillOpacity: 0.45,
            dashArray: ''
        });
    } else {
        console.warn("Unknown layer type.");
    }

    // Bring the feature to the front for better visibility
    if (featureLayer.bringToFront) {
        featureLayer.bringToFront();
    }
    currentHighlightedFeature = featureLayer;
}
