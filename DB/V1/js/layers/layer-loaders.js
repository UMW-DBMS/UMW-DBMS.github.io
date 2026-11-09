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
        .then(async geojsonData => {
            const isForestManagement = String(layerName || '').toLowerCase().startsWith('forest management (');
            let forestManagementRows = [];
            if (isForestManagement) {
                const selectedMwsId = String(layerName).replace(/^Forest Management\s*\(/i, '').replace(/\)$/, '');
                const fileCode = selectedMwsId.trim().replace(/^MWS[-_\s]*/i, '').replace(/-/g, '_');
                const csvUrl = `https://raw.githubusercontent.com/Dilshi-1997/MWS_001/main/Forest%20Management/MWS_${encodeURIComponent(fileCode)}.csv`;
                try {
                    const response = await fetch(csvUrl);
                    if (response.ok) forestManagementRows = Papa.parse(await response.text(), { header: true, skipEmptyLines: true }).data || [];
                } catch (error) {
                    console.warn('Forest Management activity CSV unavailable for popup details:', error);
                }
            }
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
                    if (String(layerName || '').toLowerCase().startsWith('forest management (')) {
                        layer.bindPopup(createForestManagementPopup(feature && feature.properties ? feature.properties : {}, feature, forestManagementRows), {
                            maxWidth: 520,
                            minWidth: 320,
                            className: 'forest-management-popup'
                        });
                        layer.on('click', function () {
                            highlightFeature(layer);
                        });
                        return;
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

            // Forest Management is a polygon layer; proposal marker and cost-circle legends do not apply.
            if (String(layerName || '').toLowerCase().startsWith('forest management (')) {
                if (layerLegends[layerName]) {
                    map.removeControl(layerLegends[layerName]);
                    delete layerLegends[layerName];
                }
            } else {
                // Legend: marker symbol, number of proposals and what the circle size means
                if (!layerLegends[layerName]) {
                    layerLegends[layerName] = createProposalLegendControl(layerName, geojsonData);
                }
                layerLegends[layerName].addTo(map);
            }
        })
        .catch(error => console.error(`Error loading GeoJSON for layer ${layerName}:`, error));
}

function createForestManagementPopup(properties, feature, csvRows) {
    const props = properties || {};
    const popup = document.createElement('div');
    popup.className = 'fm-popup';
    const addText = (tag, className, value, parent = popup) => {
        const element = document.createElement(tag);
        if (className) element.className = className;
        element.textContent = value === null || value === undefined || value === '' ? '—' : String(value);
        parent.appendChild(element);
        return element;
    };
    const name = props.FOREST_NAM || props.Forest_Name || props.forest_name || 'Forest Management Site';
    const category = props.Forest_Cat || props.Forest_Category || props.forest_type || 'Forest';
    const species = props.Species || props.SPECIES || props.species || props.species_code || props.SPECIES_CD || '—';

    const polygonAreaHa = (geometry) => {
        const ringArea = (ring) => {
            if (!Array.isArray(ring) || ring.length < 3) return 0;
            const radius = 6378137;
            let sum = 0;
            for (let i = 0; i < ring.length; i++) {
                const current = ring[i], next = ring[(i + 1) % ring.length];
                sum += (Number(next[0]) - Number(current[0])) * Math.PI / 180 *
                    (2 + Math.sin(Number(current[1]) * Math.PI / 180) + Math.sin(Number(next[1]) * Math.PI / 180));
            }
            return Math.abs(sum * radius * radius / 2);
        };
        const polygonArea = (polygon) => Math.max(0, ringArea(polygon[0]) - polygon.slice(1).reduce((sum, hole) => sum + ringArea(hole), 0));
        if (!geometry) return 0;
        const squareMetres = geometry.type === 'Polygon' ? polygonArea(geometry.coordinates) :
            geometry.type === 'MultiPolygon' ? geometry.coordinates.reduce((sum, polygon) => sum + polygonArea(polygon), 0) : 0;
        return squareMetres / 10000;
    };
    const areaFromProps = Number(props.Area_ha || props.area_ha || props.AREA_HA) || 0;
    const area = areaFromProps || polygonAreaHa(feature && feature.geometry);
    const areaLabel = area > 0 ? `${area.toLocaleString('en-LK', { maximumFractionDigits: 2 })} ha` : '—';
    const featureId = props.FID_FC_201 ?? (feature && feature.id) ?? props.id ?? '—';
    const activityCount = props.n_activities ?? props.N_ACTIVITIES ?? '—';
    const normalize = (value) => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
    const siteTokens = normalize(name).split(' ').filter((word) => word.length >= 5 && !['forest', 'plantation', 'reserve', 'division'].includes(word));
    const editDistanceAtMostOne = (a, b) => {
        if (Math.abs(a.length - b.length) > 1) return false;
        let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
        for (let i = 1; i <= a.length; i++) {
            const current = [i];
            for (let j = 1; j <= b.length; j++) current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
            previous = current;
        }
        return previous[b.length] <= 1;
    };
    const columns = Object.keys((csvRows && csvRows[0]) || {});
    const activityColumn = columns.find((key) => key.toLowerCase().replace(/[^a-z0-9]/g, '') === 'activity');
    const locationColumn = columns.find((key) => key.toLowerCase().replace(/[^a-z0-9]/g, '') === 'location');
    let currentActivity = '';
    let currentLocation = '';
    const activityNames = [];
    (csvRows || []).forEach((row) => {
        if (activityColumn && String(row[activityColumn] || '').trim()) currentActivity = String(row[activityColumn]).trim();
        if (locationColumn && String(row[locationColumn] || '').trim()) currentLocation = String(row[locationColumn]).trim();
        const location = normalize(currentLocation);
        if (!currentActivity || /^around\b/.test(location)) return;
        const locationTokens = location.split(' ');
        if (!siteTokens.some((token) => locationTokens.some((part) => part === token || (Math.min(part.length, token.length) >= 6 && editDistanceAtMostOne(token, part))))) return;
        if (!activityNames.includes(currentActivity)) activityNames.push(currentActivity);
    });
    if (!activityNames.length && Array.isArray(props.activities)) {
        props.activities.forEach((activity) => {
            const label = typeof activity === 'string' ? activity : (activity && (activity.activity || activity.Activity));
            if (label && !activityNames.includes(String(label))) activityNames.push(String(label));
        });
    }

    const header = document.createElement('div');
    header.className = 'fm-popup__header';
    const titleBlock = document.createElement('div');
    addText('strong', 'fm-popup__title', name, titleBlock);
    addText('span', 'fm-popup__subtitle', `${category} · ID ${featureId}`, titleBlock);
    header.appendChild(titleBlock);
    popup.appendChild(header);

    const metrics = document.createElement('div');
    metrics.className = 'fm-popup__metrics';
    [['Area', areaLabel], ['Species', species], ['Activities', activityCount]].forEach(([label, value]) => {
        const metric = document.createElement('div');
        addText('span', 'fm-popup__metric-label', label, metric);
        addText('strong', 'fm-popup__metric-value', value, metric);
        metrics.appendChild(metric);
    });
    popup.appendChild(metrics);

    if (activityNames.length) {
        addText('h4', 'fm-popup__section-title', 'Activities');
        const list = document.createElement('ul');
        list.className = 'fm-popup__activity-name-list';
        activityNames.forEach((activityName) => addText('li', '', activityName, list));
        popup.appendChild(list);
    }

    const division = props.Division || props.DIVISION || props.forest_division || '';
    const range = props.Range || props.RANGE || props.forest_range || '';
    const beat = props.Beat || props.BEAT || props.forest_beat || '';
    const location = [division, range, beat].filter(Boolean).join('  ›  ');
    if (location) addText('div', 'fm-popup__location', location);
    return popup;
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
