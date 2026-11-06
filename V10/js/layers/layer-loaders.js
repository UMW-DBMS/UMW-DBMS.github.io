/**
 * Layer loaders
 *
 * Purpose : Loads and removes GeoJSON / PNG overlays (with styling, point symbols, roads + railway ticks and legends).
 * Depends : Leaflet, global `map`, layer-state / layer-config / layer-helpers / layer-legends, feature-info.js (click handlers, call time).
 * Exposes : loadGeoJsonLayer(), loadGeoJsonLayerP(), loadPngOverlay(), removeLayer(), removeControl(), removeLayerAndLegend(), addRailwayDecorations(), removeRoadDecorations(), ensureSharedBaseLayers()
 */

function ensureLinkedEnvironmentalProtectionArea() {
    const alreadyVisible = !!geoJsonLayers[ENVIRONMENTAL_PROTECTION_LAYER_NAME] || !!layerState[ENVIRONMENTAL_PROTECTION_LAYER_NAME];
    layerState[ENVIRONMENTAL_PROTECTION_LAYER_NAME] = true;

    const linkedCheckbox = findLayerCheckboxByLabelText(ENVIRONMENTAL_PROTECTION_LAYER_NAME);
    if (linkedCheckbox) linkedCheckbox.checked = true;

    if (!geoJsonLayers[ENVIRONMENTAL_PROTECTION_LAYER_NAME]) {
        loadGeoJsonLayer(ENVIRONMENTAL_PROTECTION_LAYER_URL, ENVIRONMENTAL_PROTECTION_LAYER_NAME);
    }

    if (!alreadyVisible) {
        miniWatershedLinkedEnvironmentalArea = true;
    }
}

function removeLinkedEnvironmentalProtectionArea() {
    if (!miniWatershedLinkedEnvironmentalArea) return;

    miniWatershedLinkedEnvironmentalArea = false;
    layerState[ENVIRONMENTAL_PROTECTION_LAYER_NAME] = false;

    const linkedCheckbox = findLayerCheckboxByLabelText(ENVIRONMENTAL_PROTECTION_LAYER_NAME);
    if (linkedCheckbox) linkedCheckbox.checked = false;

    if (geoJsonLayers[ENVIRONMENTAL_PROTECTION_LAYER_NAME]) {
        map.removeLayer(geoJsonLayers[ENVIRONMENTAL_PROTECTION_LAYER_NAME]);
        removeRoadDecorations(ENVIRONMENTAL_PROTECTION_LAYER_NAME);
        delete geoJsonLayers[ENVIRONMENTAL_PROTECTION_LAYER_NAME];
    }

    if (layerLegends[ENVIRONMENTAL_PROTECTION_LAYER_NAME]) {
        map.removeControl(layerLegends[ENVIRONMENTAL_PROTECTION_LAYER_NAME]);
        delete layerLegends[ENVIRONMENTAL_PROTECTION_LAYER_NAME];
    }
}

function addRailwayDecorations(layerName, geoJsonLayer) {
    removeRoadDecorations(layerName);

    const TICK_INTERVAL_M = 55;   // metres between tick marks
    const TICK_HALF_M     = 7;    // half-width of each tick in metres
    const railColor       = ROAD_CATEGORY_CONFIG['Railways'].color;
    const railWeight      = ROAD_CATEGORY_CONFIG['Railways'].weight;

    const decorationGroup = L.layerGroup();

    geoJsonLayer.eachLayer((subLayer) => {
        const feature  = subLayer && subLayer.feature ? subLayer.feature : null;
        const category = getRoadCategoryFromCode(
            feature && feature.properties ? feature.properties.TL_GFCODE : ''
        );
        if (category !== 'Railways') return;
        if (!(subLayer instanceof L.Polyline)) return;

        // Flatten MultiLineString (array-of-arrays) and simple LineString
        const raw      = subLayer.getLatLngs();
        const segments = Array.isArray(raw[0]) ? raw : [raw];

        segments.forEach((pts) => {
            if (pts.length < 2) return;

            for (let i = 0; i < pts.length - 1; i++) {
                const A    = pts[i];
                const B    = pts[i + 1];
                const latA = A.lat !== undefined ? A.lat : A[0];
                const lngA = A.lng !== undefined ? A.lng : A[1];
                const latB = B.lat !== undefined ? B.lat : B[0];
                const lngB = B.lng !== undefined ? B.lng : B[1];

                // Segment length (metres, equirectangular approximation)
                const midLat = (latA + latB) / 2;
                const cosLat = Math.cos(midLat * Math.PI / 180);
                const dLat   = (latB - latA) * 111320;
                const dLng   = (lngB - lngA) * 111320 * cosLat;
                const segLen = Math.sqrt(dLat * dLat + dLng * dLng);
                if (segLen < 1) continue;

                // Unit vector along segment and its perpendicular
                const ux = dLng / segLen;   // east component
                const uy = dLat / segLen;   // north component
                const px = -uy;             // perpendicular east
                const py =  ux;             // perpendicular north

                const numTicks = Math.max(1, Math.floor(segLen / TICK_INTERVAL_M));
                const step     = 1 / (numTicks + 1);

                for (let t = step; t < 1 - step * 0.5; t += step) {
                    const cLat = latA + (latB - latA) * t;
                    const cLng = lngA + (lngB - lngA) * t;

                    // Convert half-width metres → degrees
                    const halfLatDeg = (TICK_HALF_M * px) / 111320;
                    const halfLngDeg = (TICK_HALF_M * py) / (111320 * cosLat);

                    const tick = L.polyline(
                        [
                            [cLat - halfLatDeg, cLng - halfLngDeg],
                            [cLat + halfLatDeg, cLng + halfLngDeg]
                        ],
                        {
                            color:       railColor,
                            weight:      railWeight,
                            opacity:     0.85,
                            interactive: false
                        }
                    );
                    decorationGroup.addLayer(tick);
                }
            }
        });
    });

    roadDecorations[layerName] = decorationGroup;
    decorationGroup.addTo(map);
}

function removeRoadDecorations(layerName) {
    if (!roadDecorations[layerName]) return;
    try { map.removeLayer(roadDecorations[layerName]); } catch (e) { /* ignore */ }
    delete roadDecorations[layerName];
}

function ensureSharedBaseLayers(databaseLayers) {
    const reservationGroup = 'Reservation';
    if (!databaseLayers[reservationGroup]) {
        databaseLayers[reservationGroup] = [];
    }

    const hasEnvironmentalProtection = databaseLayers[reservationGroup].some((layerInfo) =>
        String(layerInfo && layerInfo.Layer || '').trim().toLowerCase() === ENVIRONMENTAL_PROTECTION_LAYER_NAME.toLowerCase()
    );

    if (!hasEnvironmentalProtection) {
        databaseLayers[reservationGroup].push({
            Layer: ENVIRONMENTAL_PROTECTION_LAYER_NAME,
            geojson: ENVIRONMENTAL_PROTECTION_LAYER_URL,
            Group: 'Base'
        });
    }

    return databaseLayers;
}

// Initialize the map
// Function to load PNG overlay and update legend
function loadPngOverlay(url, layerName) {
    //const southWest = [6.753572835, 80.4263826425084];
    //const northEast = [7.47454951957935, 81.06883711];
    const southWest = [6.75678270262, 80.4539904085];
    const northEast = [7.48144214086, 81.0332352805];
    const imageBounds = [southWest, northEast];

    if (!url) {
        console.error(`No URL provided for layer: ${layerName}`);
        return;
    }

    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.blob();
        })
        .then(blob => {
            const imgUrl = URL.createObjectURL(blob);
            const overlay = L.imageOverlay(imgUrl, imageBounds, { opacity: 0.5, crossOrigin: true });
            overlay._originalUrl = url;
            pngOverlays[layerName] = overlay;
            overlay.addTo(map);

            // Update legend after adding the layer
            updateLegend(layerName);
        })
        .catch(error => {
            console.error(`Error loading PNG overlay for layer ${layerName}:`, error);
        });
}

// Function to load a single GeoJSON layer
// Function to load a single GeoJSON layer with custom red cross for point features
function loadGeoJsonLayerP(url, layerName) {
    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(geojsonData => {
            const geoJsonLayer = L.geoJSON(geojsonData, {
                // Customize line features with a specific style
                style: function (feature) {
                    if (layerName === 'Pecoe Trail') {
                        return {
                            color: 'orange',             // Line color
                            weight: 40,                // Line thickness
                            opacity: 0.5,             // Line transparency
                            dashArray: '8, 4',        // Dashed line style
                            fillColor: 'rgba(255, 0, 0, 0.2)', // Faded buffer color
                            fillOpacity: 0.2          // Buffer transparency
                        };
                    }
                    // Other lines and areas share the colour of the layer's marker
                    return { color: Symbology.markerColor(layerName), weight: 2.5, opacity: 0.9, fillOpacity: 0.2 };
                },

                // Points use the marker of their proposal type (see symbology.js)

                pointToLayer: function (feature, latlng) {
                    const icon = Symbology.markerIcon(layerName);


                    const amount = getAmountFromProps(feature && feature.properties);
                    let marker;
                    let labelTarget;
                    if (amount !== null && shouldShowNoLabel(layerName)) {
                        const color = getAmountColor(layerName);
                        const circle = L.circleMarker(latlng, {
                            radius: getAmountRadius(amount),
                            color: color,
                            weight: 0,
                            stroke: false,
                            fillColor: color,
                            fillOpacity: 0.15
                        });
                        const point = L.marker(latlng, { icon: icon });
                        point.setZIndexOffset(1000);
                        marker = L.layerGroup([circle, point]);
                        labelTarget = point;
                    } else {
                        marker = L.marker(latlng, { icon: icon });
                        labelTarget = marker;
                    }
                    const noValue = getNoValue(feature && feature.properties);
                    if (noValue !== null && noValue !== undefined && shouldShowNoLabel(layerName)) {
                        const labelText = String(noValue).trim();
                        if (labelText) {
                            labelTarget.bindTooltip(labelText, {
                                permanent: true,
                                direction: 'top',
                                className: 'proposal-no-label',
                                opacity: 0.9
                            });
                        }
                    }
                    return marker;
                },
                // Define actions for each feature (e.g., polygons, lines)
                onEachFeature: function (feature, layer) {
                    const makeHandler = function (targetLayer) {
                        return function (event) {
                            const clickLatLng = (event && event.latlng) ? event.latlng : (targetLayer.getLatLng ? targetLayer.getLatLng() : null);
                            if (typeof window.handleMeasurePointFromLayer === 'function' && window.handleMeasurePointFromLayer(clickLatLng)) {
                                return;
                            }
                            if (typeof window.showClickCoordinates === 'function') {
                                window.showClickCoordinates(clickLatLng);
                            }
                            updateInfoPanel(feature.properties, layerName, targetLayer);
                            highlightFeature(targetLayer);
                        };
                    };
                    if (layer instanceof L.LayerGroup) {
                        layer.eachLayer(function (child) {
                            child.on('click', makeHandler(child));
                        });
                    } else {
                        layer.on('click', makeHandler(layer));
                    }
                }
            });

            // Store and add the GeoJSON layer to the map
            geoJsonLayers[layerName] = geoJsonLayer.addTo(map);

            // Legend: marker symbol, number of proposals and what the circle size means
            if (!layerLegends[layerName]) {
                layerLegends[layerName] = createProposalLegendControl(layerName, geojsonData);
            }
            layerLegends[layerName].addTo(map);
        })
        .catch(error => console.error(`Error loading GeoJSON for layer ${layerName}:`, error));
}

function loadGeoJsonLayer(url, layerName) {
    const dataPromise = (async () => {
        const normalizedLayerName = String(layerName || '').trim().toLowerCase().replace(/\s+/g, ' ');
        if (normalizedLayerName === ENVIRONMENTAL_PROTECTION_LAYER_NAME.toLowerCase()) {
            const urls = await resolveEnvironmentalProtectionUrls();
            if (!urls.length) {
                return { type: 'FeatureCollection', features: [] };
            }

            const settledCollections = await Promise.allSettled(urls.map(async (targetUrl) => {
                const response = await fetch(targetUrl);
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            }));

            const collections = settledCollections
                .filter((result) => result.status === 'fulfilled')
                .map((result) => result.value);

            return {
                type: 'FeatureCollection',
                features: collections.flatMap((collection) => Array.isArray(collection && collection.features) ? collection.features : [])
            };
        }

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })();

    dataPromise
        .then(data => {
            // Create GeoJSON layer with custom styles and symbols
            const geoJsonLayer = L.geoJSON(data, {
                pointToLayer: function (feature, latlng) {
                    const icon = Symbology.markerIcon(layerName);


                    const amount = getAmountFromProps(feature && feature.properties);
                    let marker;
                    let labelTarget;
                    if (amount !== null && shouldShowNoLabel(layerName)) {
                        const color = getAmountColor(layerName);
                        const circle = L.circleMarker(latlng, {
                            radius: getAmountRadius(amount),
                            color: color,
                            weight: 0,
                            stroke: false,
                            fillColor: color,
                            fillOpacity: 0.15
                        });
                        const point = L.marker(latlng, { icon: icon });
                        point.setZIndexOffset(1000);
                        marker = L.layerGroup([circle, point]);
                        labelTarget = point;
                    } else {
                        marker = L.marker(latlng, { icon: icon });
                        labelTarget = marker;
                    }
                    const noValue = getNoValue(feature && feature.properties);
                    if (noValue !== null && noValue !== undefined && shouldShowNoLabel(layerName)) {
                        const labelText = String(noValue).trim();
                        if (labelText) {
                            labelTarget.bindTooltip(labelText, {
                                permanent: true,
                                direction: 'top',
                                className: 'proposal-no-label',
                                opacity: 0.9
                            });
                        }
                    }
                    return marker;
                },
                style: function (feature) {
                    // Roads first (by TL_GFCODE), then colour by class, then the layer's own style.
                    const props = (feature && feature.properties) ? feature.properties : {};
                    return getRoadStyle(feature) || Symbology.polygonStyleFor(layerName, props);
                },
                // Define actions for each feature (e.g., polygons, lines)
                onEachFeature: function (feature, layer) {
                    // Major tanks carry their name on the map
                    const tankName = feature && feature.properties ? String(feature.properties.Name || '').trim() : '';
                    if (String(layerName || '').trim().toLowerCase() === 'major tanks' && tankName && typeof layer.bindTooltip === 'function') {
                        layer.bindTooltip(tankName, { permanent: true, direction: 'center', className: 'tank-name-label', opacity: 0.9 });
                    }
                    const makeHandler = function (targetLayer) {
                        return function (event) {
                            const clickLatLng = (event && event.latlng) ? event.latlng : (targetLayer.getLatLng ? targetLayer.getLatLng() : null);
                            if (typeof window.handleMeasurePointFromLayer === 'function' && window.handleMeasurePointFromLayer(clickLatLng)) {
                                return;
                            }
                            if (typeof window.showClickCoordinates === 'function') {
                                window.showClickCoordinates(clickLatLng);
                            }
                            updateInfoPanel(feature.properties, layerName, targetLayer);
                            highlightFeature(targetLayer);
                        };
                    };
                    if (layer instanceof L.LayerGroup) {
                        layer.eachLayer(function (child) {
                            child.on('click', makeHandler(child));
                        });
                    } else {
                        layer.on('click', makeHandler(layer));
                    }
                }
            });

            // Store and add the GeoJSON layer to the map
            geoJsonLayers[layerName] = geoJsonLayer.addTo(map);
            // A tank layer is zoomed to, so the tanks are in view when it is ticked
            if (/^(major|minor) tanks?$/.test(String(layerName || '').trim().toLowerCase()) && geoJsonLayer.getBounds().isValid()) {
                map.fitBounds(geoJsonLayer.getBounds(), { padding: [20, 20] });
            }
            if (String(layerName || '').trim().toLowerCase() === 'population' && geoJsonLayer.bringToFront) {
                geoJsonLayer.bringToFront();
            }
            enablePopulationClickFallback(layerName, data, geoJsonLayer);

            if (hasRoadCategories(data)) {
                addRailwayDecorations(layerName, geoJsonLayer);
            }

            // Legend: built from the loaded data so it lists only the classes that are on the map
            if (!layerLegends[layerName]) {
                layerLegends[layerName] = createLayerLegendControl(layerName, data);
            }
            layerLegends[layerName].addTo(map);
        })
        .catch(error => {
            console.error(`Error loading GeoJSON layer for ${layerName}:`, error);
        });
}

// Function to load PNG overlay// Helper function to remove layer
function removeLayer(layerName, type) {
    if (type === 'Raster' && pngOverlays[layerName]) {
        map.removeLayer(pngOverlays[layerName]);
        delete pngOverlays[layerName];
    } else if (geoJsonLayers[layerName]) {
        map.removeLayer(geoJsonLayers[layerName]);
        removeRoadDecorations(layerName);
        delete geoJsonLayers[layerName];
    }
}

// Helper function to remove a layer and its associated legend
function removeControl(layerName, type) {
    // Remove the layer based on its type (Raster or GeoJSON)
    if (type === 'Raster' && pngOverlays[layerName]) {
        map.removeLayer(pngOverlays[layerName]);
        delete pngOverlays[layerName];
    } else if (geoJsonLayers[layerName]) {
        map.removeLayer(geoJsonLayers[layerName]);
        removeRoadDecorations(layerName);
        delete geoJsonLayers[layerName];
    }

    // Remove the legend associated with the layer
    if (layerLegends[layerName]) {
        map.removeControl(layerLegends[layerName]);
        delete layerLegends[layerName];
    }
}

// Example of switching off the layer and removing the legend
function removeLayerAndLegend(layerName) {
    if (geoJsonLayers[layerName]) {
        map.removeLayer(geoJsonLayers[layerName]);
        removeRoadDecorations(layerName);
    }
    if (layerLegends[layerName]) {
        map.removeControl(layerLegends[layerName]);
        delete layerLegends[layerName];
    }
}
