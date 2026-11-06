/**
 * Layer panels (Base / Proposal / Climate)
 *
 * Purpose : Builds the Base Layers, Proposal and Climate Layer check-box panels from each MWS's CSV registry, and resets everything when the MWS changes.
 * Depends : PapaParse, global `map`, all other layers/* modules (layer-water-features.js adds the water-feature types and the tank categories), header buttons in index.html.
 * Exposes : activateBaseLayers(), activateProposalLayers(), activateClimateLayers(), resetLayersForMwsChange() (also on window)
 */

// Function to activate buttons and fetch CSV for Base Layers
function activateBaseLayers() {
    const selectElement = document.getElementById('selectMWSID');

    const mwsID = selectElement.value.replace(/-/g, '_');

    if (mwsID) {
        const csvFilePath = `https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Data/EXD/MWS_${mwsID}/AllDataLayer_${mwsID}.csv`;

        fetch(csvFilePath)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.text();
            })
            .then(csvData => {
                Papa.parse(csvData, {
                    header: true,
                    complete: function (results) {
                        const data = results.data;
                        console.log("Parsed Base CSV data:", data);

                        const baseData = data.filter(row => row.Group === 'Base' || row.Group === 'Raster');
                        const databaseLayers = {};
                        baseData.forEach(row => {
                            const { Database, Layer, geojson, Group } = row;
                            if (!databaseLayers[Database]) {
                                databaseLayers[Database] = [];
                            }
                            databaseLayers[Database].push({ Layer, geojson, Group });
                        });

                        ensureSharedBaseLayers(databaseLayers);
                        // Reservoirs/ Tanks, DAD Tanks Details and UNDP Tanks Details (layer-water-features.js)
                        updateBasePanel(typeof addReservoirTankCategory === 'function' ? addReservoirTankCategory(databaseLayers) : databaseLayers);
                    }
                });
            })
            .catch(error => {
                console.error('Error fetching the Base CSV file:', error);
            });
    } else {
        alert('Please select a valid MWS_ID.');
    }
}

// Function to update the side panel with checkboxes for Base Layers
function updateBasePanel(databaseLayers) {

    const basePanel = document.getElementById('basePanel');
    basePanel.innerHTML = '';
    // Add back the "Close" button after updating the panel
    const closeButton = document.createElement('button');
    closeButton.classList.add('hide-btn');
    closeButton.textContent = 'Close';
    closeButton.onclick = function () {
        hidePanel('basePanel');
    };
    basePanel.appendChild(closeButton);

    Object.keys(databaseLayers).forEach(databaseName => {
        const databaseDiv = document.createElement('div');
        const databaseTitle = document.createElement('h3');
        databaseTitle.textContent = databaseName;
        databaseDiv.appendChild(databaseTitle);

        databaseLayers[databaseName].forEach((layerInfo, index) => {
            const { Layer, geojson, Group, dadCategory, baseLayerKey } = layerInfo;
            // The key under which a layer is remembered on the map (a DAD layer shares its name with another layer)
            const mapLayerKey = baseLayerKey || Layer;
            const normalizedLayerName = String(Layer || '').trim().toLowerCase();
            const isHiddenLayer = hiddenBaseLayers.has(normalizedLayerName);
            if (isHiddenLayer) {
                return;
            }

            // Water features-point / -polygon / -line: one check box per feature type (layer-water-features.js)
            if (typeof renderWaterFeatureGroup === 'function' && renderWaterFeatureGroup(databaseDiv, Layer, geojson, databaseName, index)) {
                return;
            }

            const layerDiv = document.createElement('div');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `layer_${databaseName}_${index}`;
            //checkbox.checked = false;
            checkbox.checked = layerState[mapLayerKey] || false;  // Use stored state if available

            checkbox.addEventListener('change', (e) => {
                const isChecked = e.target.checked; // Get the checkbox state
                layerState[mapLayerKey] = isChecked; // Update layer state

                if (isChecked) {
                    // Add the layer
                    const rasterOverrideUrl = getRasterOverrideUrl(Layer, geojson);
                    const shouldLoadAsGeoJson = isGeoJsonUrl(geojson);
                    if (dadCategory) {
                        // DAD / UNDP tank details: one file per mini watershed, filtered to the selected MWS
                        loadDadProposalLayer(dadCategory, mapLayerKey).then(drawn => {
                            if (drawn === false) {
                                layerState[mapLayerKey] = false;
                                checkbox.checked = false;
                            }
                        }).catch(error => {
                            console.error(`Error loading ${Layer}:`, error);
                            layerState[mapLayerKey] = false;
                            checkbox.checked = false;
                            alert(`Could not load ${Layer}.`);
                        });
                    } else if (shouldLoadAsGeoJson) {
                        loadGeoJsonLayer(geojson, Layer);
                    } else if ((Group === 'Raster' && geojson) || (rasterOverrideUrl && rasterOverrideUrl !== geojson)) {
                        loadPngOverlay(rasterOverrideUrl || geojson, Layer);
                    } else if (Group === 'Base' && geojson) {
                        loadGeoJsonLayer(geojson, Layer);
                    }
                } else {
                    // Remove the layer
                    if (Group === 'Raster' && pngOverlays[Layer]) {
                        map.removeLayer(pngOverlays[Layer]);
                        delete pngOverlays[Layer];
                        clearBottomLegendIfLayer(Layer);
                        console.log(`Removed Raster layer: ${Layer}`);
                    } else if (geoJsonLayers[mapLayerKey]) {
                        map.removeLayer(geoJsonLayers[mapLayerKey]);
                        removeRoadDecorations(mapLayerKey);
                        delete geoJsonLayers[mapLayerKey];
                        console.log(`Removed GeoJSON layer: ${mapLayerKey}`);
                    }

                    // Remove the legend for the layer
                    if (layerLegends[mapLayerKey]) {
                        map.removeControl(layerLegends[mapLayerKey]);
                        delete layerLegends[mapLayerKey];
                        console.log(`Removed legend for layer: ${mapLayerKey}`);
                    }

                    if (isMiniWatershedLayerName(Layer)) {
                        removeLinkedEnvironmentalProtectionArea();
                    }
                }
            });

            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.textContent = Layer;

            layerDiv.appendChild(checkbox);
            layerDiv.appendChild(label);
            databaseDiv.appendChild(layerDiv);
        });

        basePanel.appendChild(databaseDiv);
    });

}

// Function to activate buttons and fetch CSV for Proposal Layers
function activateProposalLayers() {
    const selectElement = document.getElementById('selectMWSID');

    const mwsID = selectElement.value.replace(/-/g, '_');

    if (mwsID) {
        const csvFilePath = `https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Data/EXD/MWS_${mwsID}/PropLayers_${mwsID}.csv`;

        fetch(csvFilePath)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.text();
            })
            .then(csvData => {
                Papa.parse(csvData, {
                    header: true,
                    complete: function (results) {
                        const data = results.data;
                        console.log("Parsed Proposal CSV data:", data);

                        const proposalData = data.filter(row => row.Group === 'Proposal');
                        const databaseLayers = {};
                        proposalData.forEach(row => {
                            const { Database, Layer, geojson } = row;
                            if (!databaseLayers[Database]) {
                                databaseLayers[Database] = [];
                            }
                            databaseLayers[Database].push({ Layer, geojson });
                        });

                        updateProposalPanel(databaseLayers);
                    }
                });
            })
            .catch(error => {
                console.error('Error fetching the Proposal CSV file:', error);
            });
    } else {
        alert('Please select a valid MWS_ID.');
    }
}

// Generalized Function to update panels with checkboxes for Layers
function updateSidePanel(panelId, databaseLayers) {
    const panel = document.getElementById(panelId);
    panel.innerHTML = '';

    Object.keys(databaseLayers).forEach(databaseName => {
        const databaseDiv = document.createElement('div');
        const databaseTitle = document.createElement('h3');
        databaseTitle.textContent = databaseName;
        databaseDiv.appendChild(databaseTitle);

        databaseLayers[databaseName].forEach((layerInfo, index) => {
            const { Layer, geojson } = layerInfo;
            const layerDiv = document.createElement('div');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `layer_${panelId}_${index}`;
            //checkbox.checked = false;
            checkbox.checked = layerState[Layer] || false;  // Retrieve and set layer state

            checkbox.addEventListener('change', e => {
                layerState[Layer] = e.target.checked;  // Update layer state
                if (e.target.checked) {
                    if (geoJsonLayers[Layer]) {
                        geoJsonLayers[Layer].addTo(map);
                    } else {
                        loadGeoJsonLayer(geojson, Layer);
                    }
                } else {
                    if (geoJsonLayers[Layer]) {
                        map.removeLayer(geoJsonLayers[Layer]);
                        removeRoadDecorations(Layer);
                    }
                }
            });

            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.textContent = Layer;

            layerDiv.appendChild(checkbox);
            layerDiv.appendChild(label);
            databaseDiv.appendChild(layerDiv);
        });

        panel.appendChild(databaseDiv);
    });
}

// Function to update the proposal panel with checkboxes for Proposal Layers by Database
function updateProposalPanel(databaseLayers) {
    const proposalPanel = document.getElementById('proposalPanel');
    proposalPanel.innerHTML = '';
    // Add back the "Close" button after updating the panel
    const closeButton = document.createElement('button');
    closeButton.classList.add('hide-btn');
    closeButton.textContent = 'Close';
    closeButton.onclick = function () {
        hidePanel('proposalPanel');
    };
    proposalPanel.appendChild(closeButton);

    Object.keys(databaseLayers).forEach(databaseName => {
        const databaseDiv = document.createElement('div');
        const databaseTitle = document.createElement('h3');
        databaseTitle.textContent = databaseName;
        databaseDiv.appendChild(databaseTitle);

        databaseLayers[databaseName].forEach((layerInfo, index) => {
            const { Layer, geojson } = layerInfo;

            const layerDiv = document.createElement('div');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `proposal_layer_${databaseName}_${index}`;
            //checkbox.checked = false;
            checkbox.checked = layerState[Layer] || false;  // Retrieve and set layer state

            checkbox.addEventListener('change', (e) => {
                layerState[Layer] = e.target.checked;  // Update layer state
                if (e.target.checked) {
                    if (geoJsonLayers[Layer]) {
                        geoJsonLayers[Layer].addTo(map);
                        if (layerLegends[Layer]) layerLegends[Layer].addTo(map);
                    } else {
                        loadGeoJsonLayerP(geojson, Layer);
                    }
                } else {
                    if (geoJsonLayers[Layer]) {
                        map.removeLayer(geoJsonLayers[Layer]);
                        removeRoadDecorations(Layer);
                    }
                    // The legend object is kept so it can come back with the layer
                    if (layerLegends[Layer]) map.removeControl(layerLegends[Layer]);
                }
            });

            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.textContent = Layer;

            layerDiv.appendChild(checkbox);
            layerDiv.appendChild(label);
            databaseDiv.appendChild(layerDiv);
        });

        proposalPanel.appendChild(databaseDiv);
    });
}

// Function to activate Climate Layers
function activateClimateLayers() {
    const selectElement = document.getElementById('selectMWSID');

    const mwsID = selectElement.value.replace(/-/g, '_');

    if (mwsID) {
        //const csvFilePath = `https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Data/EXD/MWS_${mwsID}/ClimLayer.csv`;
        const csvFilePath = `https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Data/EXD/MWS_003/ClimLayer.csv`;
        fetch(csvFilePath)
            .then(response => response.ok ? response.text() : Promise.reject('Network error'))
            .then(csvData => {
                Papa.parse(csvData, {
                    header: true,
                    complete: (results) => {
                        const excludedClimateLayers = new Set([
                            'Water Quality -CEA',
                            'Water Quality -MASL',
                            'Water Quality -NWSDB',
                            // 'Rainfall',
                            // 'Temperature',
                            // 'Evaporation',
                            // 'Evoporation',
                            'Rainfall',
                            'Temperature',
                            'Evaporation',
                            'Evoporation',
                            'NDVI',
                            'Monthly NDVI -01',
                            'Monthly NDVI -02',
                            'Monthly NDVI -03',
                            'Monthly NDVI -04',
                            'Monthly NDVI -05',
                            'Monthly NDVI -06',
                            'Monthly NDVI -07',
                            'Monthly NDVI -08',
                            'Monthly NDVI -09',
                            'Monthly NDVI -10',
                            'Monthly NDVI -11',
                            'Monthly NDVI -12'
                        ]);
                        const data = results.data.filter(row =>
                            row.Group === 'Climate' && !excludedClimateLayers.has(row.Layer)
                        );
                        const layersByDatabase = {};
                        data.forEach(row => {
                            if (!layersByDatabase[row.Database]) layersByDatabase[row.Database] = [];
                            layersByDatabase[row.Database].push({
                                layerGroup: row.Group,
                                layerName: row.Layer,
                                geojsonUrl: row.geojson,
                                type: row.Type  // 'Raster' or 'GeoJSON'
                            });
                        });
                        updateClimatePanel(layersByDatabase);
                    }
                });
            })
            .catch(error => console.error('Error fetching the Climate CSV file:', error));
    } else {
        alert('Please select a valid MWS_ID.');
    }
}

// Function to update the climate panel with the same structure as Base/Proposal panels
function updateClimatePanel(layersByDatabase) {
    const climPanel = document.getElementById('climPanel');
    climPanel.innerHTML = '';
    // Add back the "Close" button after updating the panel
    const closeButton = document.createElement('button');
    closeButton.classList.add('hide-btn');
    closeButton.textContent = 'Close';
    closeButton.onclick = function () {
        hidePanel('climPanel');
    };
    climPanel.appendChild(closeButton);

    Object.keys(layersByDatabase).forEach(database => {
        const databaseDiv = document.createElement('div');
        const databaseTitle = document.createElement('h3');
        databaseTitle.textContent = database;
        databaseDiv.appendChild(databaseTitle);

        layersByDatabase[database].forEach((layerInfo, index) => {
            const { layerName, geojsonUrl, type } = layerInfo;

            const layerDiv = document.createElement('div');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `clim_layer_${database}_${index}`;
            checkbox.checked = layerState[layerName] || false; // Retrieve and set layer state

            checkbox.addEventListener('change', e => {
                layerState[layerName] = e.target.checked; // Update layer state
                if (e.target.checked) {
                    if (type === 'Raster') {
                        loadPngOverlay(geojsonUrl, layerName);
                    } else {
                        loadGeoJsonLayer(geojsonUrl, layerName);
                    }
                } else {
                    // Remove the layer and associated legend when unchecked
                    if (type === 'Raster' && pngOverlays[layerName]) {
                        map.removeLayer(pngOverlays[layerName]);
                        delete pngOverlays[layerName];
                        clearBottomLegendIfLayer(layerName);
                    } else if (geoJsonLayers[layerName]) {
                        map.removeLayer(geoJsonLayers[layerName]);
                        removeRoadDecorations(layerName);
                        // Remove the legend if it exists
                        if (layerLegends[layerName]) {
                            map.removeControl(layerLegends[layerName]);
                            delete layerLegends[layerName];
                        }
                        delete geoJsonLayers[layerName];
                    }
                }
            });

            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.textContent = layerName;

            layerDiv.appendChild(checkbox);
            layerDiv.appendChild(label);
            databaseDiv.appendChild(layerDiv);
        });

        climPanel.appendChild(databaseDiv);
    });
}

// Event listeners for button clicks to activate layers
document.getElementById('baseLayersBtn').addEventListener('click', activateBaseLayers);

document.getElementById('proposalBtn').addEventListener('click', activateProposalLayers);

document.getElementById('climateLayerBtn').addEventListener('click', activateClimateLayers);

function resetLayersForMwsChange() {
    clearFeatureSelection();

    document.querySelectorAll([
        '#basePanel input[type="checkbox"]',
        '#proposalPanel input[type="checkbox"]',
        '#climPanel input[type="checkbox"]'
    ].join(',')).forEach((checkbox) => {
        checkbox.checked = false;
    });

    if (populationClickFallbackHandler) {
        try { map.off('click', populationClickFallbackHandler); } catch (e) { /* ignore */ }
        populationClickFallbackHandler = null;
    }

    if (window.currentLayer) {
        try { map.removeLayer(window.currentLayer); } catch (e) { /* ignore */ }
        window.currentLayer = null;
    }

    miniWatershedLinkedEnvironmentalArea = false;

    // Remove all loaded raster overlays
    Object.keys(pngOverlays).forEach((layerName) => {
        try { map.removeLayer(pngOverlays[layerName]); } catch (e) { /* ignore */ }
        delete pngOverlays[layerName];
    });

    // Remove all loaded GeoJSON layers
    Object.keys(geoJsonLayers).forEach((layerName) => {
        try { map.removeLayer(geoJsonLayers[layerName]); } catch (e) { /* ignore */ }
        removeRoadDecorations(layerName);
        delete geoJsonLayers[layerName];
    });

    // Remove all legend controls
    Object.keys(layerLegends).forEach((layerName) => {
        try { map.removeControl(layerLegends[layerName]); } catch (e) { /* ignore */ }
        delete layerLegends[layerName];
    });

    // Reset remembered checkbox state so new MWS starts clean
    Object.keys(layerState).forEach((key) => {
        layerState[key] = false;
    });

    resetBottomLegend();
}

window.resetLayersForMwsChange = resetLayersForMwsChange;

const mwsSelectElement = document.getElementById('selectMWSID');

if (mwsSelectElement) {
    mwsSelectElement.addEventListener('change', resetLayersForMwsChange);
}
