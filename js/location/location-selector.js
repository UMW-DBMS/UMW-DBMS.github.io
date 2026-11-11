/**
 * District / DSD / MWS_ID selector
 *
 * Purpose : Fills the three header dropdowns from the MWS boundary file, filters them cascade-style, highlights the selection in magenta, and provides point-in-MWS lookup.
 * Depends : Leaflet, global `map`.
 * Exposes : findMwsFeatureAtLatLng() (also on window), window.originalMwsBoundaryData, createGeoJSONLayer()
 */

// How the chosen district, DSD and MWS are outlined on the map (crimson, with a white halo under the MWS outline).
const SELECTION_COLOR = '#C71585';
const SELECTION_STYLE = {
    district: { color: SELECTION_COLOR, weight: 1.4, opacity: 0.9, fillColor: SELECTION_COLOR, fillOpacity: 0.1 },
    dsd: { color: SELECTION_COLOR, weight: 2.5, opacity: 0.95, fillColor: SELECTION_COLOR, fillOpacity: 0.08 },
    mws: { color: SELECTION_COLOR, weight: 6, opacity: 1, fill: false, fillOpacity: 0 }
};

// Declare global variables to store the GeoJSON layer and its original data
let geojsonLayer;  // To store the GeoJSON layer

let originalData;  // To store the original GeoJSON data

function dropdownPointInRing(point, ring) {
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

function dropdownPointInPolygon(point, polygonCoordinates) {
    if (!Array.isArray(polygonCoordinates) || !polygonCoordinates.length) return false;
    if (!dropdownPointInRing(point, polygonCoordinates[0])) return false;

    for (let i = 1; i < polygonCoordinates.length; i++) {
        if (dropdownPointInRing(point, polygonCoordinates[i])) return false;
    }

    return true;
}

function dropdownPointInGeometry(point, geometry) {
    if (!point || !geometry || !Array.isArray(geometry.coordinates)) return false;
    if (geometry.type === 'Polygon') {
        return dropdownPointInPolygon(point, geometry.coordinates);
    }
    if (geometry.type === 'MultiPolygon') {
        return geometry.coordinates.some(polygonCoordinates =>
            dropdownPointInPolygon(point, polygonCoordinates)
        );
    }
    return false;
}

function findMwsFeatureAtLatLng(latlng) {
    const features = originalData && Array.isArray(originalData.features) ? originalData.features : [];
    return features.find(feature => dropdownPointInGeometry(latlng, feature && feature.geometry)) || null;
}

window.findMwsFeatureAtLatLng = findMwsFeatureAtLatLng;

function sortAscending(values) {
    return Array.from(values).sort((a, b) =>
        String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
    );
}

// Function to fetch the GeoJSON data and populate the dropdown menus
function populateDropdowns() {
    var geojsonURL = 'https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Data/EXD/UMW/MWS_Boundary_Updated_UMC_Names.geojson';

    fetch(geojsonURL)
        .then(response => response.json())
        .then(data => {
            originalData = data; // Store the original GeoJSON data
            window.originalMwsBoundaryData = data;

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
    });
}

// Create a custom pane for the pink layer with a lower z-index
map.createPane('pinkLayerPane');

map.getPane('pinkLayerPane').style.zIndex = 620;

// Update GeoJSON layer creation to ensure the top layer is non-interactive
function createGeoJSONLayer(features, style) {
    const collection = { type: "FeatureCollection", features: features };
    const main = L.geoJSON(collection, {
        style: style,
        pane: 'pinkLayerPane', // Use the custom pane for the selection layer
        interactive: false, // Ensure the selection layer is non-interactive
        onEachFeature: function (feature, layer) {
            attachClickListenerToLayer(layer);
        }
    });
    if (!style || !style.halo) return main;
    // White halo under the outline keeps it readable on satellite and busy base maps
    const halo = L.geoJSON(collection, {
        style: { color: '#FFFFFF', weight: (style.weight || 3) + 4, opacity: 0.9, fill: false, fillOpacity: 0 },
        pane: 'pinkLayerPane',
        interactive: false
    });
    return L.featureGroup([halo, main]);
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

// Update filterFeaturesByDistrict to use createGeoJSONLayer
function filterFeaturesByDistrict(selectedValue) {
    if (geojsonLayer) {
        map.removeLayer(geojsonLayer);
    }

    if (!selectedValue) {
        geojsonLayer = createGeoJSONLayer(originalData.features, SELECTION_STYLE.district);
        geojsonLayer.addTo(map);
        populateSelectDSDDropdown(originalData.features);
        map.fitBounds(geojsonLayer.getBounds());
        return;
    }

    const filteredFeatures = originalData.features.filter(feature => feature.properties.District === selectedValue);
    geojsonLayer = createGeoJSONLayer(filteredFeatures, SELECTION_STYLE.district);
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

    if (!selectedValue) {
        return;
    }

    const filteredFeatures = originalData.features.filter(feature => feature.properties.MainDSD === selectedValue);
    geojsonLayer = createGeoJSONLayer(filteredFeatures, SELECTION_STYLE.dsd);
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

    if (!selectedValue) {
        return;
    }

    const filteredFeatures = originalData.features.filter(feature => feature.properties.MWS_ID === selectedValue);
    geojsonLayer = createGeoJSONLayer(filteredFeatures, SELECTION_STYLE.mws);
    geojsonLayer.addTo(map);

    if (filteredFeatures.length > 0) {
        map.fitBounds(geojsonLayer.getBounds());
    }
}

// Call the function to populate the dropdowns after the DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    populateDropdowns();
});
