// Initialize the map



// Dropdown for DSD Filter
var dsdSelect = document.createElement('select');
dsdSelect.id = 'dsd-filter';
dsdSelect.innerHTML = '<option value="">Select DSD</option>'; // Add options as needed


// Dropdown for MWS_ID
var mwsIdSelect = document.createElement('select');
mwsIdSelect.id = 'mws-id-filter';
mwsIdSelect.innerHTML = '<option value="">Select MWS_ID</option>'; // Will be populated dynamically


// Fetch the first GeoJSON layer (polygon) from GitHub raw URL
var geojsonURL1 = 'https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Data/EXD/UMW/MWS_Boundary_Updated_UMC_Names.geojson';

fetch(geojsonURL1)
    .then(response => response.json())
    .then(data => {
        // Add GeoJSON layer to the map with outlines in magenta and no fill
        var geojsonLayer1 = L.geoJSON(data, {
            style: function (feature) {
                return {color: "#FF00FF", weight: 1, fillOpacity: 0}; // Outline in magenta with no fill
            },
            onEachFeature: function (feature, layer) {
                // Add MWS_ID to the dropdown
                var mwsId = feature.properties.MWS_ID; // Replace with the correct property name for MWS_ID
                if (mwsId && !Array.from(mwsIdSelect.options).some(option => option.value === mwsId)) {
                    var option = document.createElement('option');
                    option.value = mwsId;
                    option.text = mwsId;
                    mwsIdSelect.appendChild(option);
                }

                // Add popup for MWS_ID
                layer.bindPopup(mwsId);
            }
        }).addTo(map);

        // Fit map to the bounds of the first GeoJSON layer
        map.fitBounds(geojsonLayer1.getBounds());
    })
    .catch(error => {
        console.error("Error loading GeoJSON:", error);
    });

// Fetch the second GeoJSON layer (drainage lines) and style it based on the grid_code
var geojsonURL2 = 'https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Data/ED_02_HYD_DRN_line_v1.geojson';

fetch(geojsonURL2)
    .then(response => response.json())
    .then(data => {
        // Function to generate color based on the grid_code value (gradient blue)
        function getColor(gridCode) {
            // Adjusting blue gradient based on the grid_code value (higher code = darker blue)
            var colorScale = Math.max(0, Math.min(255, Math.round((1 - gridCode / 100) * 255)));
            return `rgb(0, 0, ${colorScale})`;
        }

        // Function to adjust line width based on grid_code value
        function getLineWidth(gridCode) {
            return Math.max(1, Math.min(10, gridCode / 10)); // Ensure a minimum width of 1 and max width of 10
        }

        // Add GeoJSON layer to the map (drainage lines styled dynamically)
        L.geoJSON(data, {
                style: function (feature) {
                    return {
                        color: 'blue',
                        weight: feature.properties.grid_code / 5, // Adjust line weight by grid_code
                        opacity: 1
                    };
                }
        }).addTo(map);
    })
    .catch(error => {
        console.error("Error loading GeoJSON:", error);
    });


