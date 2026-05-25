// Declare global variables to store the GeoJSON layer and its original data
let geojsonLayer; // To store the GeoJSON layer
let originalData; // To store the original GeoJSON data
let selectedMwsFeature = null;
let selectedGndMatch = null;
let selectedGndSuggestion = null;
let currentGndSearchSuggestions = [];
let mwsPopupLayer = null;
const gndGeojsonCache = {};
let gndSuggestionTimer = null;

window.getSelectedMwsFeature = function () {
    if (selectedMwsFeature) return selectedMwsFeature;

    const selectMWSID = document.getElementById('selectMWSID');
    const selectedMwsId = selectMWSID ? selectMWSID.value : '';
    if (!selectedMwsId || !originalData || !Array.isArray(originalData.features)) {
        return null;
    }

    selectedMwsFeature = originalData.features.find(feature =>
        feature && feature.properties && feature.properties.MWS_ID === selectedMwsId
    ) || null;
    return selectedMwsFeature;
};

function sortAscending(values) {
    return Array.from(values).sort((a, b) =>
        String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
    );
}

function normalizeSearchText(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function normalizeMwsCode(value) {
    return String(value || '').replace(/-/g, '_').replace(/^MWS_/i, '').trim();
}

function getGndGeojsonUrl(mwsId) {
    const mwsCode = normalizeMwsCode(mwsId);
    if (!mwsCode) return '';
    return `https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Data/EXD/01_ADM/GND/MWS_${mwsCode}.geojson`;
}

function getFeatureSearchValues(feature) {
    const props = feature && feature.properties ? feature.properties : {};
    const values = [];
    Object.entries(props).forEach(([, value]) => {
        if (value === null || value === undefined) return;
        if (typeof value === 'string' || typeof value === 'number') {
            values.push(String(value));
        }
    });
    return values;
}

function getFeaturePrimarySearchName(feature) {
    const props = feature && feature.properties ? feature.properties : {};
    return (
        props.GN_Name ||
        props.GND_N ||
        props.GND_Name ||
        props.GN ||
        props.Name ||
        props.UMC_Name ||
        props.UMC_Names ||
        props.MWS_ID ||
        ''
    );
}

function getBoundaryPopupHtml(properties) {
    const props = properties || {};
    return [
        `<strong>MWS_ID:</strong> ${props.MWS_ID || 'N/A'}`,
        `<strong>DSD:</strong> ${props.MainDSD || props.DSD || 'N/A'}`,
        `<strong>District:</strong> ${props.District || 'N/A'}`
    ].join('<br>');
}

function ensureMwsPopupLayer(features) {
    if (mwsPopupLayer) {
        map.removeLayer(mwsPopupLayer);
    }

    mwsPopupLayer = L.geoJSON({ type: "FeatureCollection", features: features || [] }, {
        style: {
            color: "#000000",
            weight: 0,
            opacity: 0,
            fillOpacity: 0.01
        },
        pane: map.getPane('pinkLayerPane') ? 'pinkLayerPane' : undefined,
        onEachFeature: function (feature, layer) {
            layer.bindPopup(getBoundaryPopupHtml(feature.properties));
        }
    }).addTo(map);
}

function getGndPopupHtml(match) {
    const mwsProps = match && match.mwsFeature && match.mwsFeature.properties ? match.mwsFeature.properties : {};
    const gndProps = match && match.gndFeature && match.gndFeature.properties ? match.gndFeature.properties : {};
    const gnName = gndProps.GND_N || gndProps.GND_Name || gndProps.GN_Name || gndProps.GN || gndProps.Name || 'N/A';
    return [
        `<strong>GN:</strong> ${gnName}`,
        `<strong>MWS_ID:</strong> ${mwsProps.MWS_ID || 'N/A'}`,
        `<strong>DSD:</strong> ${mwsProps.MainDSD || mwsProps.DSD || 'N/A'}`,
        `<strong>District:</strong> ${mwsProps.District || 'N/A'}`
    ].join('<br>');
}

function getGndDisplayName(feature) {
    const props = feature && feature.properties ? feature.properties : {};
    return props.GND_N || props.GND_Name || props.GN_Name || props.GN || props.Name || '';
}

function getGndSearchValues(feature) {
    const props = feature && feature.properties ? feature.properties : {};
    return Object.entries(props)
        .filter(([key, value]) => {
            if (value === null || value === undefined || (typeof value !== 'string' && typeof value !== 'number')) return false;
            const normalizedKey = String(key || '').toLowerCase();
            return normalizedKey.includes('gnd') || normalizedKey.includes('gn') || normalizedKey.includes('name');
        })
        .map(([, value]) => String(value));
}

function getCandidateMwsFeaturesForGndSearch(scope = {}) {
    if (!originalData || !Array.isArray(originalData.features)) return [];

    const distValue = scope.distValue !== undefined ? scope.distValue : ((document.getElementById('selectDist') || {}).value || '');
    const dsdValue = scope.dsdValue !== undefined ? scope.dsdValue : ((document.getElementById('selectDSD') || {}).value || '');
    const mwsValue = scope.mwsValue !== undefined ? scope.mwsValue : ((document.getElementById('selectMWSID') || {}).value || '');

    return originalData.features.filter(feature => {
        const props = feature && feature.properties ? feature.properties : {};
        if (mwsValue && props.MWS_ID !== mwsValue) return false;
        if (dsdValue && props.MainDSD !== dsdValue) return false;
        if (distValue && props.District !== distValue) return false;
        return !!props.MWS_ID;
    });
}

async function fetchGndGeojsonForMws(mwsId) {
    const mwsCode = normalizeMwsCode(mwsId);
    if (!mwsCode) return null;
    if (Object.prototype.hasOwnProperty.call(gndGeojsonCache, mwsCode)) {
        return gndGeojsonCache[mwsCode];
    }

    try {
        const response = await fetch(getGndGeojsonUrl(mwsCode));
        if (!response.ok) {
            gndGeojsonCache[mwsCode] = null;
            return null;
        }
        const data = await response.json();
        gndGeojsonCache[mwsCode] = data;
        return data;
    } catch (error) {
        console.warn('GND GeoJSON search failed:', mwsCode, error);
        gndGeojsonCache[mwsCode] = null;
        return null;
    }
}

async function findGndSearchMatches(query, scope = {}) {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) return [];

    const candidateMwsFeatures = getCandidateMwsFeaturesForGndSearch(scope);
    const settled = await Promise.allSettled(candidateMwsFeatures.map(async mwsFeature => {
        const mwsId = mwsFeature.properties && mwsFeature.properties.MWS_ID;
        const data = await fetchGndGeojsonForMws(mwsId);
        const gndFeatures = Array.isArray(data && data.features) ? data.features : [];
        return gndFeatures
            .map(gndFeature => {
                const values = getGndSearchValues(gndFeature).map(normalizeSearchText);
                const exact = values.some(value => value === normalizedQuery);
                const startsWith = values.some(value => value.startsWith(normalizedQuery));
                const contains = values.some(value => value.includes(normalizedQuery));
                return {
                    mwsFeature,
                    gndFeature,
                    score: exact ? 3 : (startsWith ? 2 : (contains ? 1 : 0))
                };
            })
            .filter(result => result.score > 0);
    }));

    return settled
        .filter(result => result.status === 'fulfilled')
        .flatMap(result => result.value)
        .sort((a, b) => b.score - a.score);
}

function setSelectValueWithOption(select, value) {
    if (!select || value === undefined || value === null) return;
    const textValue = String(value);
    let option = Array.from(select.options).find(item => item.value === textValue);
    if (!option) {
        option = document.createElement('option');
        option.value = textValue;
        option.textContent = textValue;
        select.appendChild(option);
    }
    select.value = textValue;
}

function refreshGoButtonState() {
    const distSelect = document.getElementById('selectDist');
    const dsdSelect = document.getElementById('selectDSD');
    const mwsSelect = document.getElementById('selectMWSID');
    const goButton = document.getElementById('goBtn');
    if (!goButton) return;
    if (distSelect && dsdSelect && mwsSelect && distSelect.value && dsdSelect.value && mwsSelect.value) {
        goButton.classList.remove('disabled');
    } else {
        goButton.classList.add('disabled');
    }
}

function clearLocationDropdownValues() {
    const distSelect = document.getElementById('selectDist');
    const dsdSelect = document.getElementById('selectDSD');
    const mwsSelect = document.getElementById('selectMWSID');
    if (distSelect) distSelect.value = '';
    if (dsdSelect) dsdSelect.value = '';
    if (mwsSelect) mwsSelect.value = '';
    selectedMwsFeature = null;
    refreshGoButtonState();
}

function clearGndSearchSelection() {
    const input = document.getElementById('mwsSearchInput');
    if (input) {
        input.value = '';
    }

    if (gndSuggestionTimer) {
        clearTimeout(gndSuggestionTimer);
        gndSuggestionTimer = null;
    }

    if (geojsonLayer) {
        map.removeLayer(geojsonLayer);
        geojsonLayer = null;
    }

    selectedGndMatch = null;
    selectedGndSuggestion = null;
    updateGndClearButtonState();

    const selectedMws = selectedMwsFeature || getSelectedMwsFeature();
    if (selectedMws) {
        geojsonLayer = createMwsBoundaryLayer([selectedMws]);
        geojsonLayer.addTo(map);
        if (geojsonLayer.getBounds && geojsonLayer.getBounds().isValid()) {
            map.fitBounds(geojsonLayer.getBounds());
        }
    } else if (originalData && Array.isArray(originalData.features)) {
        geojsonLayer = createGeoJSONLayer(originalData.features, {
            color: "#FF00FF",
            weight: 1,
            fillOpacity: 0.04
        });
        geojsonLayer.addTo(map);
        if (geojsonLayer.getBounds && geojsonLayer.getBounds().isValid()) {
            map.fitBounds(geojsonLayer.getBounds());
        }
    }

    refreshGoButtonState();
}

function findSelectedGndSuggestion(value) {
    if (!value) return null;
    const normalizedValue = normalizeSearchText(value);
    const matches = currentGndSearchSuggestions.filter(item => normalizeSearchText(item.value) === normalizedValue);
    return matches.length === 1 ? matches[0] : null;
}

function updateGndClearButtonState() {
    const clearButton = document.getElementById('clearGndSearchBtn');
    if (!clearButton) return;
    if (selectedGndMatch) {
        clearButton.style.display = 'inline-flex';
        clearButton.textContent = 'Clear';
        clearButton.title = 'Clear selected GN';
        clearButton.setAttribute('aria-label', 'Clear selected GN');
    } else {
        clearButton.style.display = 'none';
    }
}

function buildMwsSearchOptions(features) {
    const datalist = document.getElementById('mwsSearchOptions');
    if (!datalist) return;
    datalist.innerHTML = '';

    const seen = new Set();
    features.forEach(feature => {
        const props = feature.properties || {};
        const values = [
            getFeaturePrimarySearchName(feature),
            props.MainDSD,
            props.District,
            props.MWS_ID
        ];

        values.forEach(value => {
            const text = String(value || '').trim();
            const key = normalizeSearchText(text);
            if (!text || seen.has(key)) return;
            seen.add(key);

            const option = document.createElement('option');
            option.value = text;
            option.label = [props.MWS_ID, props.MainDSD, props.District].filter(Boolean).join(' | ');
            datalist.appendChild(option);
        });
    });
}

async function updateGndSearchSuggestions(query) {
    const datalist = document.getElementById('mwsSearchOptions');
    if (!datalist) return;

    const normalizedQuery = normalizeSearchText(query);
    const selectedMwsValue = (document.getElementById('selectMWSID') || {}).value || '';
    if (!normalizedQuery.length) {
        currentGndSearchSuggestions = [];
        selectedGndSuggestion = null;
        buildMwsSearchOptions(originalData && Array.isArray(originalData.features) ? originalData.features : []);
        return;
    }

    const candidateMwsFeatures = getCandidateMwsFeaturesForGndSearch();
    const seen = new Set();
    const options = [];

    currentGndSearchSuggestions = [];
    const settled = await Promise.allSettled(candidateMwsFeatures.map(async mwsFeature => {
        const mwsProps = mwsFeature.properties || {};
        const data = await fetchGndGeojsonForMws(mwsProps.MWS_ID);
        const gndFeatures = Array.isArray(data && data.features) ? data.features : [];

        gndFeatures.forEach(gndFeature => {
            const gnName = String(getGndDisplayName(gndFeature) || '').trim();
            if (!gnName) return;
            if (!normalizeSearchText(gnName).startsWith(normalizedQuery)) return;

            const key = `${normalizeSearchText(gnName)}|${mwsProps.MWS_ID || ''}`;
            if (seen.has(key)) return;
            seen.add(key);

            const suggestion = {
                value: gnName,
                label: [mwsProps.MWS_ID, mwsProps.MainDSD, mwsProps.District].filter(Boolean).join(' | '),
                match: { mwsFeature, gndFeature, score: 0 }
            };
            options.push(suggestion);
        });
    }));

    if (!settled.some(result => result.status === 'fulfilled') || !options.length) {
        currentGndSearchSuggestions = [];
        selectedGndSuggestion = null;
        return;
    }

    datalist.innerHTML = '';
    currentGndSearchSuggestions = options
        .sort((a, b) => a.value.localeCompare(b.value, undefined, { numeric: true, sensitivity: 'base' }))
        .slice(0, 80);

    currentGndSearchSuggestions.forEach(item => {
        const option = document.createElement('option');
        option.value = item.value;
        option.label = item.label;
        datalist.appendChild(option);
    });
}


function scheduleGndSearchSuggestions(query) {
    if (gndSuggestionTimer) {
        clearTimeout(gndSuggestionTimer);
    }
    gndSuggestionTimer = setTimeout(() => {
        updateGndSearchSuggestions(query);
    }, 300);
}

function refreshSearchSuggestionsForSelectedMws() {
    const input = document.getElementById('mwsSearchInput');
    if (!input) return;
    scheduleGndSearchSuggestions(input.value || '  ');
}

function findMwsSearchMatches(query) {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery || !originalData || !Array.isArray(originalData.features)) return [];

    return originalData.features
        .map(feature => {
            const values = getFeatureSearchValues(feature);
            const normalizedValues = values.map(normalizeSearchText);
            const exact = normalizedValues.some(value => value === normalizedQuery);
            const startsWith = normalizedValues.some(value => value.startsWith(normalizedQuery));
            const contains = normalizedValues.some(value => value.includes(normalizedQuery));
            return {
                feature,
                score: exact ? 3 : (startsWith ? 2 : (contains ? 1 : 0))
            };
        })
        .filter(result => result.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(result => result.feature);
}

function showSearchMatchedFeatures(features) {
    if (geojsonLayer) {
        map.removeLayer(geojsonLayer);
    }
    selectedMwsFeature = features.length === 1 ? features[0] : null;
    geojsonLayer = createGeoJSONLayer(features, {
        color: "#FF00FF",
        weight: 5,
        fillOpacity: features.length === 1 ? 0 : 0.1,
        fill: features.length !== 1
    });
    geojsonLayer.addTo(map);
    if (features.length > 0) {
        map.fitBounds(geojsonLayer.getBounds());
    }
}

function createMwsBoundaryLayer(features) {
    return createGeoJSONLayer(features, {
        color: "#FF00FF",
        weight: 5,
        fillColor: "#FF00FF",
        fillOpacity: 0
    });
}

function showGndSearchMatchedFeatures(matches, mwsFeatures = []) {
    if (geojsonLayer) {
        map.removeLayer(geojsonLayer);
    }

    const gndLayer = L.geoJSON({
        type: "FeatureCollection",
        features: matches.map(match => match.gndFeature)
    }, {
        style: {
            color: "Orange",
            weight: 5,
            fillColor: "Orange",
            fillOpacity: matches.length === 1 ? 0.2 : 0.12
        },
        onEachFeature: function (feature, layer) {
            const match = matches.find(item => item.gndFeature === feature);
            layer.bindPopup(getGndPopupHtml(match));
            const gnName = getGndDisplayName(feature);
            if (gnName) {
                layer.bindTooltip(gnName, {
                    permanent: true,
                    direction: 'center',
                    className: 'gn-search-label'
                });
            }
            layer.on('click', function () {
                selectedGndMatch = match;
                updateGndClearButtonState();
            });
        }
    });

    if (matches.length === 1) {
        selectedGndMatch = matches[0];
        updateGndClearButtonState();
    }

    if (mwsFeatures.length) {
        geojsonLayer = L.layerGroup([createMwsBoundaryLayer(mwsFeatures), gndLayer]).addTo(map);
    } else {
        geojsonLayer = gndLayer.addTo(map);
    }

    if (matches.length > 0) {
        map.fitBounds(gndLayer.getBounds());
    }
}

async function showGndBoundariesForMwsFeatures(mwsFeatures) {
    const matches = [];
    const settled = await Promise.allSettled((mwsFeatures || []).map(async mwsFeature => {
        const mwsProps = mwsFeature && mwsFeature.properties ? mwsFeature.properties : {};
        const data = await fetchGndGeojsonForMws(mwsProps.MWS_ID);
        const gndFeatures = Array.isArray(data && data.features) ? data.features : [];
        gndFeatures.forEach(gndFeature => {
            matches.push({ mwsFeature, gndFeature, score: 1 });
        });
    }));

    if (matches.length) {
        showGndSearchMatchedFeatures(matches, mwsFeatures);
        return true;
    }

    return settled.some(result => result.status === 'fulfilled');
}

async function selectMwsSearchMatch(feature) {
    const props = feature && feature.properties ? feature.properties : {};
    const distSelect = document.getElementById('selectDist');
    const dsdSelect = document.getElementById('selectDSD');
    const mwsSelect = document.getElementById('selectMWSID');

    if (typeof window.resetLayersForMwsChange === 'function') {
        window.resetLayersForMwsChange();
    }

    setSelectValueWithOption(distSelect, props.District);
    const districtFeatures = originalData.features.filter(item => item.properties && item.properties.District === props.District);
    populateSelectDSDDropdown(districtFeatures.length ? districtFeatures : originalData.features);

    setSelectValueWithOption(dsdSelect, props.MainDSD);
    const dsdFeatures = originalData.features.filter(item => item.properties && item.properties.MainDSD === props.MainDSD);
    populateSelectMWSIDDropdown(dsdFeatures.length ? dsdFeatures : districtFeatures);

    setSelectValueWithOption(mwsSelect, props.MWS_ID);
    selectedMwsFeature = feature || null;
    const showedGndBoundaries = await showGndBoundariesForMwsFeatures([feature]);
    if (!showedGndBoundaries) {
        filterFeaturesByMWS_ID(props.MWS_ID);
    }
    refreshGoButtonState();
}

function selectGndSearchMatch(match) {
    const mwsFeature = match.mwsFeature;
    const props = mwsFeature && mwsFeature.properties ? mwsFeature.properties : {};
    const distSelect = document.getElementById('selectDist');
    const dsdSelect = document.getElementById('selectDSD');
    const mwsSelect = document.getElementById('selectMWSID');

    if (typeof window.resetLayersForMwsChange === 'function') {
        window.resetLayersForMwsChange();
    }

    selectedMwsFeature = mwsFeature || null;
    setSelectValueWithOption(distSelect, props.District);
    const districtFeatures = originalData.features.filter(item => item.properties && item.properties.District === props.District);
    populateSelectDSDDropdown(districtFeatures.length ? districtFeatures : originalData.features);

    setSelectValueWithOption(dsdSelect, props.MainDSD);
    const dsdFeatures = originalData.features.filter(item => item.properties && item.properties.MainDSD === props.MainDSD);
    populateSelectMWSIDDropdown(dsdFeatures.length ? dsdFeatures : districtFeatures);

    setSelectValueWithOption(mwsSelect, props.MWS_ID);
    selectedGndMatch = match;
    showGndSearchMatchedFeatures([match]);
    updateGndClearButtonState();
    refreshGoButtonState();
}

async function handleMwsSearch() {
    const input = document.getElementById('mwsSearchInput');
    if (!input) return;
    const query = input.value.trim();
    if (!query) return;
    const searchScope = {
        distValue: (document.getElementById('selectDist') || {}).value || '',
        dsdValue: (document.getElementById('selectDSD') || {}).value || '',
        mwsValue: (document.getElementById('selectMWSID') || {}).value || ''
    };
    clearLocationDropdownValues();

    const button = document.getElementById('mwsSearchBtn');
    if (button) {
        button.disabled = true;
        button.textContent = '...';
    }

    try {
        if (selectedGndSuggestion && normalizeSearchText(selectedGndSuggestion.value) === normalizeSearchText(query)) {
            selectGndSearchMatch(selectedGndSuggestion.match);
            return;
        }

        const gndMatches = await findGndSearchMatches(query, searchScope);
        if (gndMatches.length) {
            const topScore = gndMatches[0].score;
            const topMatches = gndMatches.filter(match => match.score === topScore);
            if (topMatches.length === 1) {
                selectGndSearchMatch(topMatches[0]);
            } else {
                if (typeof window.resetLayersForMwsChange === 'function') {
                    window.resetLayersForMwsChange();
                }
                showGndSearchMatchedFeatures(topMatches);
                refreshGoButtonState();
            }
            return;
        }

    const matches = findMwsSearchMatches(query);
    if (!matches.length) {
        alert('No matching GN, DSD, District, or MWS_ID found.');
        return;
    }

    const topScoreQuery = normalizeSearchText(query);
    const exactMatches = matches.filter(feature =>
        getFeatureSearchValues(feature).some(value => normalizeSearchText(value) === topScoreQuery)
    );
    const targetMatches = exactMatches.length ? exactMatches : matches;

    if (targetMatches.length === 1) {
        await selectMwsSearchMatch(targetMatches[0]);
        return;
    }

    if (typeof window.resetLayersForMwsChange === 'function') {
        window.resetLayersForMwsChange();
    }
    const showedGndBoundaries = await showGndBoundariesForMwsFeatures(targetMatches);
    if (!showedGndBoundaries) {
        showSearchMatchedFeatures(targetMatches);
    }
    refreshGoButtonState();
    } finally {
        if (button) {
            button.disabled = false;
            button.innerHTML = '&#128269;';
        }
    }
}

function setupMwsSearch(features) {
    buildMwsSearchOptions(features);
    const input = document.getElementById('mwsSearchInput');
    const button = document.getElementById('mwsSearchBtn');
    const clearButton = document.getElementById('clearGndSearchBtn');
    if (button) button.addEventListener('click', handleMwsSearch);
    if (clearButton) clearButton.addEventListener('click', clearGndSearchSelection);
    if (input) {
        input.addEventListener('input', function () {
            selectedGndMatch = null;
            selectedGndSuggestion = findSelectedGndSuggestion(this.value);
            updateGndClearButtonState();
            scheduleGndSearchSuggestions(input.value);
        });
        input.addEventListener('change', function () {
            selectedGndSuggestion = findSelectedGndSuggestion(this.value);
        });
        input.addEventListener('keydown', function (event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                handleMwsSearch();
            }
        });
    }
}

// Function to fetch the GeoJSON data and populate the dropdown menus
function populateDropdowns() {
    var geojsonURL = 'https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Data/EXD/UMW/MWS_Boundary_Updated_UMC_Names.geojson';

    fetch(geojsonURL)
        .then(response => response.json())
        .then(data => {
            originalData = data; // Store the original GeoJSON data
            setupMwsSearch(data.features || []);
            ensureMwsPopupLayer(data.features || []);
            if (!geojsonLayer && Array.isArray(data.features)) {
                geojsonLayer = createGeoJSONLayer(data.features, {
                    color: "#FF00FF",
                    weight: 1,
                    fillColor: "#FF00FF",
                    fillOpacity: 0.04
                });
                geojsonLayer.addTo(map);
            }
            
            var districtValues = new Set(); // Use a Set to store unique District values

            // Loop through the features to collect unique District values
            data.features.forEach(feature => {
                var district = feature.properties.District;
                if (district) {
                    districtValues.add(district);
                }
            });

            // Get the dropdown menu element for District
            var selectDist = document.getElementById('selectDist');

            // Populate the District dropdown with unique values
            sortAscending(districtValues).forEach(value => {
                var option = document.createElement('option');
                option.value = value;
                option.textContent = value;
                selectDist.appendChild(option);
            });

            // Add an event listener to filter features on District dropdown change
            selectDist.addEventListener('change', function () {
                filterFeaturesByDistrict(this.value);
            });
        })
        .catch(error => {
            console.error("Error loading GeoJSON for dropdowns:", error);
        });
}

// Function to filter and display features based on selected District value
function filterFeaturesByDistrict(selectedValue) {
    // Remove existing GeoJSON layer if it exists
    if (geojsonLayer) {
        map.removeLayer(geojsonLayer);
    }

    // If no value is selected, return all features
    if (!selectedValue) {
        geojsonLayer = createGeoJSONLayer(originalData.features, {
            color: "#FF00FF",
            weight: 1,
            fillOpacity: 0.5
        });
        geojsonLayer.addTo(map);
        populateSelectDSDDropdown(originalData.features);
        map.fitBounds(geojsonLayer.getBounds());
        return;
    }

    // Filter features based on selected District value
    const filteredFeatures = originalData.features.filter(feature => feature.properties.District === selectedValue);

    // Create a new GeoJSON layer with the filtered features
    geojsonLayer = createGeoJSONLayer(filteredFeatures, {
        color: "#FF00FF",
        weight: 1,
        fillOpacity: 0.5
    });
    geojsonLayer.addTo(map);

    if (filteredFeatures.length > 0) {
        map.fitBounds(geojsonLayer.getBounds());
    }

    populateSelectDSDDropdown(filteredFeatures);
}

// Function to populate the SelectDSD dropdown based on the remaining features
function populateSelectDSDDropdown(filteredFeatures) {
    var selectDSD = document.getElementById('selectDSD');
    selectDSD.innerHTML = ''; // Clear existing options

    // Add default "Select DSD" option
    var defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select DSD';
    selectDSD.appendChild(defaultOption);

    var mainDSDValues = new Set(); // Use a Set to store unique MainDSD values

    // Loop through the filtered features to collect unique MainDSD values
    filteredFeatures.forEach(feature => {
        var mainDSD = feature.properties.MainDSD;
        if (mainDSD) {
            mainDSDValues.add(mainDSD);
        }
    });

    // Populate the SelectDSD dropdown with unique values
    sortAscending(mainDSDValues).forEach(value => {
        var option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        selectDSD.appendChild(option);
    });

    // Reset dropdown to default view when district is changed
    selectDSD.selectedIndex = 0;  

    // Add event listener to filter features on SelectDSD dropdown change
    selectDSD.addEventListener('change', function () {
        filterFeaturesByMainDSD(this.value);
    });
}


// Function to filter and display features based on selected MainDSD value
function filterFeaturesByMainDSD(selectedValue) {
    // Remove existing GeoJSON layer if it exists
    if (geojsonLayer) {
        map.removeLayer(geojsonLayer);
    }

    // If no value is selected, revert to previous filtered layer (MainDSD)
    if (!selectedValue) {
        return;
    }

    // Filter features based on selected MainDSD value
    const filteredFeatures = originalData.features.filter(feature => feature.properties.MainDSD === selectedValue);

    // Create a new GeoJSON layer with the filtered features
    geojsonLayer = createGeoJSONLayer(filteredFeatures, {
        color: "#FF00FF",
        weight: 5,
        fillOpacity: 0.1
    });
    geojsonLayer.addTo(map);

    if (filteredFeatures.length > 0) {
        map.fitBounds(geojsonLayer.getBounds());
    }

    populateSelectMWSIDDropdown(filteredFeatures); // Populate MWS_ID dropdown based on filtered features
}

// Function to populate the MWS_ID dropdown based on the remaining features
function populateSelectMWSIDDropdown(filteredFeatures) {
    var selectMWSID = document.getElementById('selectMWSID');
    selectMWSID.innerHTML = ''; // Clear existing options

    // Add default "Select MWS ID" option
    var defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select MWS ID';
    selectMWSID.appendChild(defaultOption);

    var mwsIDValues = new Set(); // Use a Set to store unique MWS_ID values

    // Loop through the filtered features to collect unique MWS_ID values
    filteredFeatures.forEach(feature => {
        var mwsID = feature.properties.MWS_ID;
        if (mwsID) {
            mwsIDValues.add(mwsID);
        }
    });

    // Populate the SelectMWSID dropdown with unique values
    sortAscending(mwsIDValues).forEach(value => {
        var option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        selectMWSID.appendChild(option);
    });

    // Reset dropdown to default view when DSD is changed
    selectMWSID.selectedIndex = 0;

    // Add event listener to filter features on MWS_ID dropdown change
    selectMWSID.addEventListener('change', function () {
        filterFeaturesByMWS_ID(this.value);
        refreshSearchSuggestionsForSelectedMws();
    });
}


// Function to filter and display features based on selected MWS_ID value
function filterFeaturesByMWS_ID(selectedValue) {
    // Remove existing GeoJSON layer if it exists
    if (geojsonLayer) {
        map.removeLayer(geojsonLayer);
    }

    // If no value is selected, revert to previous filtered layer (MWS_ID)
    if (!selectedValue) {
        return;
    }

    // Filter features based on selected MWS_ID value
    const filteredFeatures = originalData.features.filter(feature => feature.properties.MWS_ID === selectedValue);

    // Create a new GeoJSON layer with the filtered features
    geojsonLayer = createGeoJSONLayer(filteredFeatures, {
        color: "#FF00FF",
        weight: 5,
        fillOpacity: 0,
        fill: false
    });
    geojsonLayer.addTo(map);

    if (filteredFeatures.length > 0) {
        map.fitBounds(geojsonLayer.getBounds());
    }
}

// Function to display details of a clicked feature
function displayFeatureDetails(feature) {
    const properties = feature.properties;
    console.log("Feature clicked:", properties); // Debug log to verify feature properties

    if (properties) {
        const details = `MWS_ID: ${properties.MWS_ID || 'N/A'}, DSD: ${properties.MainDSD || 'N/A'}, District: ${properties.District || 'N/A'}`;
        alert(details); // Display details in an alert (can be replaced with a UI update)
    } else {
        console.error("No properties found for the clicked feature.");
    }
}

// Attach click event listener to GeoJSON layer
function attachClickListenerToLayer(layer) {
    layer.on('click', function (e) {
        console.log("Layer clicked:", e.layer.feature); // Debug log to verify click event
        displayFeatureDetails(e.layer.feature);
    });
}

// Create a custom pane for the pink layer with a lower z-index
map.createPane('pinkLayerPane');
map.getPane('pinkLayerPane').style.zIndex = 400; // Set lower z-index for pink layer

// Update GeoJSON layer creation to ensure the top layer is non-interactive
function createGeoJSONLayer(features, style) {
    return L.geoJSON({ type: "FeatureCollection", features: features }, {
        style: style,
        pane: 'pinkLayerPane', // Use the custom pane for the pink layer
        onEachFeature: function (feature, layer) {
            layer.bindPopup(getBoundaryPopupHtml(feature.properties));
        }
    });
}

// Function to display details of a clicked feature
function displayFeatureDetails(feature) {
    const properties = feature.properties;
    console.log("Feature clicked:", properties); // Debug log to verify feature properties

    if (properties) {
        const details = `MWS_ID: ${properties.MWS_ID || 'N/A'}, DSD: ${properties.MainDSD || properties.DSD || 'N/A'}, District: ${properties.District || 'N/A'}`;
        alert(details); // Display details in an alert (can be replaced with a UI update)
    } else {
        console.error("No properties found for the clicked feature.");
    }
}

// Attach click event listener to GeoJSON layer
function attachClickListenerToLayer(layer) {
    layer.on('click', function (e) {
        console.log("Layer clicked:", e.layer.feature); // Debug log to verify click event
        displayFeatureDetails(e.layer.feature);
    });
}

// Update filterFeaturesByDistrict to use createGeoJSONLayer
function filterFeaturesByDistrict(selectedValue) {
    if (geojsonLayer) {
        map.removeLayer(geojsonLayer);
    }
    selectedMwsFeature = null;

    if (!selectedValue) {
        geojsonLayer = createGeoJSONLayer(originalData.features, {
            color: "#FF00FF",
            weight: 1,
            fillOpacity: 0.5
        });
        geojsonLayer.addTo(map);
        populateSelectDSDDropdown(originalData.features);
        map.fitBounds(geojsonLayer.getBounds());
        return;
    }

    const filteredFeatures = originalData.features.filter(feature => feature.properties.District === selectedValue);
    geojsonLayer = createGeoJSONLayer(filteredFeatures, {
        color: "#FF00FF",
        weight: 1,
        fillOpacity: 0.5
    });
    geojsonLayer.addTo(map);

    if (filteredFeatures.length > 0) {
        map.fitBounds(geojsonLayer.getBounds());
    }

    populateSelectDSDDropdown(filteredFeatures);
}

// Update filterFeaturesByMainDSD to use createGeoJSONLayer
function filterFeaturesByMainDSD(selectedValue) {
    if (geojsonLayer) {
        map.removeLayer(geojsonLayer);
    }
    selectedMwsFeature = null;

    if (!selectedValue) {
        return;
    }

    const filteredFeatures = originalData.features.filter(feature => feature.properties.MainDSD === selectedValue);
    geojsonLayer = createGeoJSONLayer(filteredFeatures, {
        color: "#FF00FF",
        weight: 5,
        fillOpacity: 0.1
    });
    geojsonLayer.addTo(map);

    if (filteredFeatures.length > 0) {
        map.fitBounds(geojsonLayer.getBounds());
    }

    populateSelectMWSIDDropdown(filteredFeatures);
}

// Update filterFeaturesByMWS_ID to use createGeoJSONLayer
function filterFeaturesByMWS_ID(selectedValue) {
    if (geojsonLayer) {
        map.removeLayer(geojsonLayer);
    }
    selectedMwsFeature = null;

    if (!selectedValue) {
        return;
    }

    const filteredFeatures = originalData.features.filter(feature => feature.properties.MWS_ID === selectedValue);
    selectedMwsFeature = filteredFeatures[0] || null;
    geojsonLayer = createGeoJSONLayer(filteredFeatures, {
        color: "#FF00FF",
        weight: 5,
        fillOpacity: 0,
        fill: false
    });
    geojsonLayer.addTo(map);

    if (filteredFeatures.length > 0) {
        map.fitBounds(geojsonLayer.getBounds());
    }
    refreshSearchSuggestionsForSelectedMws();
}

// Call the function to populate the dropdowns after the DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    populateDropdowns();
});
