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
        databaseTitle.textContent = String(databaseName).trim().toLowerCase() === 'minor tank restoration'
            ? 'Forest Management Plan'
            : databaseName;
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

    const selectedMwsId = document.getElementById('selectMWSID')?.value.replace(/-/g, '_');
    let forestManagementAdded = false;

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

        // Forest Management is part of the Minor Tank Restoration proposal category.
        if (selectedMwsId && String(databaseName).trim().toLowerCase() === 'minor tank restoration') {
            appendForestManagementCheckbox(databaseDiv, selectedMwsId);
            forestManagementAdded = true;
        }

        proposalPanel.appendChild(databaseDiv);
    });

    // Keep the option available if this MWS has no other Minor Tank Restoration entries.
    if (selectedMwsId && !forestManagementAdded) {
        const databaseDiv = document.createElement('div');
        const databaseTitle = document.createElement('h3');
        databaseTitle.textContent = 'Forest Management Plan';
        databaseDiv.appendChild(databaseTitle);
        appendForestManagementCheckbox(databaseDiv, selectedMwsId);
        proposalPanel.appendChild(databaseDiv);
    }
}

function appendForestManagementCheckbox(parent, mwsId) {
    const layerName = `Forest Management (${mwsId})`;
    const row = document.createElement('div');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `proposal_forest_management_${mwsId}`;
    checkbox.checked = !!layerState[layerName];
    checkbox.addEventListener('change', (event) => {
        const checked = event.target.checked;
        layerState[layerName] = checked;
        if (checked) {
            showForestManagementCsvPanel(mwsId);
            if (geoJsonLayers[layerName]) {
                geoJsonLayers[layerName].addTo(map);
                if (layerLegends[layerName]) {
                    map.removeControl(layerLegends[layerName]);
                    delete layerLegends[layerName];
                }
            } else {
                // The HTML file is a standalone Folium map page. Its paired GeoJSON
                // is the feature layer that can be drawn on this map.
                const fileCode = String(mwsId).trim().replace(/^MWS[-_\s]*/i, '').replace(/-/g, '_');
                resolveForestManagementFileUrl('GEOJSON', fileCode, 'geojson')
                    .then((url) => loadGeoJsonLayerP(url, layerName))
                    .catch((error) => console.error('Forest Management GeoJSON unavailable:', error));
            }
        } else {
            const attributePanel = document.getElementById('attributePanel');
            if (attributePanel && attributePanel.dataset.forestManagement === 'true') {
                attributePanel.style.display = 'none';
                delete attributePanel.dataset.forestManagement;
            }
            if (geoJsonLayers[layerName]) {
                map.removeLayer(geoJsonLayers[layerName]);
                removeRoadDecorations(layerName);
            }
            if (layerLegends[layerName]) map.removeControl(layerLegends[layerName]);
        }
    });
    const label = document.createElement('label');
    label.htmlFor = checkbox.id;
    label.textContent = 'Forest Management';
    row.appendChild(checkbox);
    row.appendChild(label);
    parent.appendChild(row);
}

function showForestManagementCsvPanel(mwsId, forestName = '') {
    const panel = document.getElementById('attributePanel');
    if (!panel) return;
    const fileCode = String(mwsId).trim().replace(/^MWS[-_\s]*/i, '').replace(/-/g, '_');
    const forestKey = String(forestName || '').trim().toLowerCase();
    panel.dataset.forestManagement = 'true';
    panel.dataset.forestManagementMws = fileCode;
    panel.dataset.forestManagementForest = forestKey;
    panel.style.display = 'block';
    panel.style.right = '10px';
    panel.style.width = 'min(520px, calc(100% - 20px))';
    panel.innerHTML = '';

    const closeButton = document.createElement('button');
    closeButton.className = 'hide-btn';
    closeButton.textContent = 'Close';
    closeButton.onclick = () => {
        panel.style.display = 'none';
        delete panel.dataset.forestManagement;
        delete panel.dataset.forestManagementMws;
        delete panel.dataset.forestManagementForest;
    };
    panel.appendChild(closeButton);
    const title = document.createElement('h3');
    title.textContent = forestName ? `${forestName} - Forest Management Plan` : `Forest Management Plan - MWS_${fileCode}`;
    panel.appendChild(title);
    const status = document.createElement('p');
    status.textContent = 'Loading activities...';
    panel.appendChild(status);

    Promise.all([
        resolveForestManagementFileUrl('CSV', fileCode, 'csv').then((url) => fetch(url)).then((response) => {
            if (!response.ok) throw new Error(`CSV request returned ${response.status}`);
            return response.text();
        }),
        resolveForestManagementFileUrl('GEOJSON', fileCode, 'geojson').then((url) => fetch(url)).then((response) => response.ok ? response.json() : null).catch(() => null)
    ]).then(([csvText, geojsonData]) => {
        if (panel.dataset.forestManagement !== 'true' || panel.dataset.forestManagementMws !== fileCode || panel.dataset.forestManagementForest !== forestKey) return;
        const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
        const headers = (parsed.meta.fields || []).filter((field) => field && field.trim());
        const headerKey = (wanted) => headers.find((header) => header.toLowerCase().replace(/[^a-z0-9]/g, '') === wanted);
        const mwsColumn = headers.find((field) => field.trim().toLowerCase().replace(/[^a-z0-9]/g, '') === 'mwsid');
        const allRows = (parsed.data || []).filter((row) => !mwsColumn || String(row[mwsColumn] || '').trim().replace(/^MWS[-_\s]*/i, '').replace(/-/g, '_') === fileCode);
        const activityColumn = headerKey('activity');
        const detailsColumn = headerKey('description') || headerKey('location');
        const locationColumn = headerKey('location');
        const amountColumn = ['costlkr', 'activitycostlkr', 'amountlkr', 'totalcostlkr', 'cost', 'amount', 'totalcost']
            .map((key) => headerKey(key)).find(Boolean);
        const durationColumn = headerKey('duration') || headerKey('years');
        const scopeColumn = headerKey('scope');
        const areaColumn = headers.find((header) => /area/i.test(header) && /ha/i.test(header));
        const asAmount = (value) => Number(String(value || '').replace(/[^\d.-]/g, '')) || 0;
        const money = (value) => `LKR ${Math.round(value).toLocaleString('en-LK')}`;
        const normalize = (value) => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
        const closeWord = (a, b) => {
            if (Math.abs(a.length - b.length) > 1) return false;
            let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
            for (let i = 1; i <= a.length; i++) {
                const current = [i];
                for (let j = 1; j <= b.length; j++) current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
                previous = current;
            }
            return previous[b.length] <= 1;
        };
        const forestTokens = normalize(forestName).split(' ').filter((word) => word.length >= 5 && !['forest', 'plantation', 'reserve', 'division'].includes(word));
        let previousActivity = '';
        let previousLocation = '';
        let previousDuration = '';
        const rows = [];
        allRows.forEach((row) => {
            const activityValue = activityColumn ? String(row[activityColumn] || '').trim() : '';
            const locationValue = locationColumn ? String(row[locationColumn] || '').trim() : '';
            const durationValue = durationColumn ? String(row[durationColumn] || '').trim() : '';
            if (activityValue) previousActivity = activityValue;
            if (locationValue) previousLocation = locationValue;
            if (durationValue) previousDuration = durationValue;
            if (forestName) {
                const location = normalize(previousLocation);
                if (/^around\b/.test(location)) return;
                const locationTokens = location.split(' ');
                if (!forestTokens.some((token) => locationTokens.some((part) => part === token || (Math.min(token.length, part.length) >= 6 && closeWord(token, part))))) return;
            }
            rows.push({ ...row, __fmActivity: previousActivity, __fmLocation: previousLocation, __fmDuration: durationValue || previousDuration });
        });
        status.remove();
        if (!rows.length) {
            const empty = document.createElement('p');
            empty.textContent = forestName
                ? `No activity rows match ${forestName} in the CSV location column.`
                : 'No Forest Management activities are recorded for this MWS.';
            panel.appendChild(empty);
            return;
        }
        const grouped = new Map();
        rows.forEach((row) => {
            const activityName = row.__fmActivity || 'Other activities';
            if (!grouped.has(activityName)) grouped.set(activityName, { amount: 0, details: [], locations: [], durations: [], shared: false });
            const group = grouped.get(activityName);
            if (amountColumn && String(row[amountColumn] || '').trim()) group.amount += asAmount(row[amountColumn]);
            if (detailsColumn && row[detailsColumn] && !group.details.includes(String(row[detailsColumn]).trim())) group.details.push(String(row[detailsColumn]).trim());
            if (row.__fmLocation && !group.locations.includes(row.__fmLocation)) group.locations.push(row.__fmLocation);
            if (row.__fmDuration && !group.durations.includes(row.__fmDuration)) group.durations.push(row.__fmDuration);
            if (scopeColumn && String(row[scopeColumn]).toLowerCase().includes('shared')) group.shared = true;
        });

        const activities = Array.from(grouped.entries()).map(([name, value]) => ({ name, ...value }));
        const totalCost = activities.reduce((sum, item) => sum + item.amount, 0);
        const sharedCost = activities.filter((item) => item.shared).reduce((sum, item) => sum + item.amount, 0);
        const siteCost = totalCost - sharedCost;
        const geoFeatures = (Array.isArray(geojsonData && geojsonData.features) ? geojsonData.features : []).filter((feature) => {
            if (!forestName) return true;
            const props = feature && feature.properties ? feature.properties : {};
            const featureTokens = normalize(props.FOREST_NAM || props.Forest_Name || props.forest_name).split(' ').filter((word) => word.length >= 5);
            return featureTokens.some((part) => forestTokens.some((token) => part === token || closeWord(part, token)));
        });
        const areaFromGeoJson = geoFeatures.reduce((sum, feature) => {
            const props = feature && feature.properties ? feature.properties : {};
            return sum + (Number(props.Area_ha || props.area_ha) || 0);
        }, 0);
        const summary = document.createElement('div');
        summary.className = 'fm-summary';
        const metrics = document.createElement('div');
        metrics.className = 'fm-summary__metrics';
        const addMetric = (label, value) => {
            const metric = document.createElement('div');
            const caption = document.createElement('span');
            caption.className = 'fm-summary__label';
            caption.textContent = label;
            const amount = document.createElement('strong');
            amount.textContent = value;
            metric.append(caption, amount);
            metrics.appendChild(metric);
        };
        if (areaFromGeoJson > 0) {
            addMetric('Area', `${areaFromGeoJson.toLocaleString('en-LK', { maximumFractionDigits: 2 })} ha`);
        } else if (areaColumn) {
            const area = rows.map((row) => asAmount(row[areaColumn])).find((value) => value > 0);
            if (area) addMetric('Area', `${area.toLocaleString('en-LK', { maximumFractionDigits: 2 })} ha`);
        }
        addMetric('Activities', String(activities.length));
        if (amountColumn) addMetric('Total cost', money(totalCost));
        summary.appendChild(metrics);

        const activityHeading = document.createElement('h4');
        activityHeading.className = 'fm-summary__heading';
        activityHeading.textContent = 'Planned activities';
        summary.appendChild(activityHeading);
        const list = document.createElement('div');
        list.className = 'fm-summary__list';
        activities.forEach((activity) => {
            const item = document.createElement('div');
            item.className = 'fm-summary__activity';
            const detail = document.createElement('div');
            const name = document.createElement('strong');
            name.textContent = activity.name;
            detail.appendChild(name);
            if (activity.shared) {
                const badge = document.createElement('span');
                badge.className = 'fm-summary__badge';
                badge.textContent = 'SHARED';
                detail.appendChild(badge);
            }
            const note = document.createElement('span');
            note.className = 'fm-summary__note';
            const noteParts = [];
            if (activity.locations.length) {
                noteParts.push(`Location: ${activity.locations.slice(0, 2).join('; ')}${activity.locations.length > 2 ? ` (+${activity.locations.length - 2} more)` : ''}`);
            }
            if (activity.details.length) noteParts.push(activity.details.slice(0, 2).join('; ') + (activity.details.length > 2 ? ` (+${activity.details.length - 2} items)` : ''));
            if (activity.durations.length) noteParts.push(activity.durations.join(', '));
            note.textContent = noteParts.join(' · ');
            detail.appendChild(note);
            if (amountColumn) {
                const amountBlock = document.createElement('div');
                amountBlock.className = 'fm-summary__amount';
                const amountLabel = document.createElement('span');
                amountLabel.textContent = 'Cost (LKR)';
                const amount = document.createElement('strong');
                amount.textContent = money(activity.amount);
                amountBlock.append(amountLabel, amount);
                item.append(detail, amountBlock);
            } else {
                item.appendChild(detail);
            }
            list.appendChild(item);
        });
        summary.appendChild(list);
        const footer = document.createElement('div');
        footer.className = 'fm-summary__footer';
        const footerRows = !amountColumn ? [] : scopeColumn
            ? [['Site-specific cost', siteCost], ['Shared programme', sharedCost]]
            : [['Total planned cost', totalCost]];
        footerRows.forEach(([label, amount]) => {
            const caption = document.createElement('span');
            caption.textContent = label;
            const value = document.createElement('strong');
            value.textContent = money(amount);
            footer.append(caption, value);
        });
        if (footerRows.length) summary.appendChild(footer);
        panel.appendChild(summary);
    }).catch((error) => {
        if (panel.dataset.forestManagement !== 'true' || panel.dataset.forestManagementMws !== fileCode || panel.dataset.forestManagementForest !== forestKey) return;
        console.warn('Forest Management CSV unavailable:', error);
        status.textContent = 'No Forest Management CSV is available for this MWS.';
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
