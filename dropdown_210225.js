// Declare global variables to store the GeoJSON layer and its original data
let geojsonLayer; // To store the GeoJSON layer
let originalData; // To store the original GeoJSON data

// Function to fetch the GeoJSON data and populate the dropdown menus
function populateDropdowns() {
    var geojsonURL = 'https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Data/EXD/UMW/MWS_Boundary_Updated_UMC_Names.geojson';

    fetch(geojsonURL)
        .then(response => response.json())
        .then(data => {
            originalData = data; // Store the original GeoJSON data
            var mainDSDValues = new Set(); // Use a Set to store unique MainDSD values

            // Loop through the features to collect unique MainDSD values
            data.features.forEach(feature => {
                var mainDSD = feature.properties.MainDSD;
                if (mainDSD) {
                    mainDSDValues.add(mainDSD);
                }
            });

            // Get the dropdown menu element for MainDSD
            var selectDSD = document.getElementById('selectDSD');

            // Populate the MainDSD dropdown with unique values
            mainDSDValues.forEach(value => {
                var option = document.createElement('option');
                option.value = value;
                option.textContent = value;
                selectDSD.appendChild(option);
            });

            // Add an event listener to filter features on MainDSD dropdown change
            selectDSD.addEventListener('change', function () {
                filterFeaturesByMainDSD(this.value);
            });
        })
        .catch(error => {
            console.error("Error loading GeoJSON for dropdowns:", error);
        });
}

// Function to filter and display features based on selected MainDSD value
function filterFeaturesByMainDSD(selectedValue) {
    // Remove existing GeoJSON layer if it exists
    if (geojsonLayer) {
        map.removeLayer(geojsonLayer);
    }

    // If no value is selected, return all features
    if (!selectedValue) {
        geojsonLayer = L.geoJSON(originalData, {
            style: function (feature) {
                return { color: "#FF00FF", weight: 1, fillOpacity: 0.5 }; // Light magenta
            }
        }).addTo(map);
        populateMWS_IDDropdown(originalData.features); // Populate MWS_ID dropdown with all features
        map.fitBounds(geojsonLayer.getBounds()); // Fit map to bounds of original data
        return;
    }

    // Filter features based on selected MainDSD value
    var filteredFeatures = originalData.features.filter(feature => feature.properties.MainDSD === selectedValue);

    // Create a new GeoJSON layer with the filtered features
    geojsonLayer = L.geoJSON({ type: "FeatureCollection", features: filteredFeatures }, {
        style: function (feature) {
            return { color: "#FF00FF", weight: 1, fillOpacity: 0.5 }; // Light magenta
        }
    }).addTo(map);

    if (filteredFeatures.length > 0) {
        map.fitBounds(geojsonLayer.getBounds()); // Fit map to bounds of filtered data
    }

    populateMWS_IDDropdown(filteredFeatures); // Populate MWS_ID dropdown based on filtered features
}

// Function to populate the MWS_ID dropdown based on the remaining features
function populateMWS_IDDropdown(filteredFeatures) {
    var selectMWSID = document.getElementById('selectMWSID');
    selectMWSID.innerHTML = ''; // Clear existing options

    var mwsIDValues = new Set(); // Use a Set to store unique MWS_ID values

    // Loop through the filtered features to collect unique MWS_ID values
    filteredFeatures.forEach(feature => {
        var mwsID = feature.properties.MWS_ID;
        if (mwsID) {
            mwsIDValues.add(mwsID);
        }
    });

    // Populate the MWS_ID dropdown with unique values
    mwsIDValues.forEach(value => {
        var option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        selectMWSID.appendChild(option);
    });

    // Add an event listener to filter features on MWS_ID dropdown change
    selectMWSID.addEventListener('change', function () {
        filterFeaturesByMWS_ID(this.value);
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
    var filteredFeatures = originalData.features.filter(feature => feature.properties.MWS_ID === selectedValue);

    // Create a new GeoJSON layer with the filtered features
    geojsonLayer = L.geoJSON({ type: "FeatureCollection", features: filteredFeatures }, {
        style: function (feature) {
            return { color: "#FF00FF", weight: 5, fillOpacity: 0.1 }; // Light magenta
        }
    }).addTo(map);

    if (filteredFeatures.length > 0) {
        map.fitBounds(geojsonLayer.getBounds()); // Fit map to bounds of filtered data
    }
}

// Call the function to populate the dropdowns after the DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    populateDropdowns();
});
