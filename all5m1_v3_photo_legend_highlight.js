
// Initialize layers storage
const pngOverlays = {};
const geoJsonLayers = {};
const layerState = {};  // Object to track the state of each layer

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

                        updateBasePanel(databaseLayers);
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
            const { Layer, geojson, Group } = layerInfo;

            const layerDiv = document.createElement('div');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `layer_${databaseName}_${index}`;
            //checkbox.checked = false;
            checkbox.checked = layerState[Layer] || false;  // Use stored state if available
			
checkbox.addEventListener('change', (e) => {
    const isChecked = e.target.checked; // Get the checkbox state
    layerState[Layer] = isChecked; // Update layer state

    if (isChecked) {
        // Add the layer
        if (Group === 'Raster' && geojson) {
            loadPngOverlay(geojson, Layer);
        } else if (Group === 'Base' && geojson) {
            loadGeoJsonLayer(geojson, Layer);
        }

        // Add the legend for the layer (if applicable)
        if (!layerLegends[Layer]) {
            const legendControl = createLegendControl(Layer); // Function to create a legend control
            layerLegends[Layer] = legendControl;
            legendControl.addTo(map);
            console.log(`Added legend for layer: ${Layer}`);
        }
    } else {
        // Remove the layer
        if (Group === 'Raster' && pngOverlays[Layer]) {
            map.removeLayer(pngOverlays[Layer]);
            delete pngOverlays[Layer];
            console.log(`Removed Raster layer: ${Layer}`);
        } else if (geoJsonLayers[Layer]) {
            map.removeLayer(geoJsonLayers[Layer]);
            delete geoJsonLayers[Layer];
            console.log(`Removed GeoJSON layer: ${Layer}`);
        }

        // Remove the legend for the layer
        if (layerLegends[Layer]) {
            map.removeControl(layerLegends[Layer]);
            delete layerLegends[Layer];
            console.log(`Removed legend for layer: ${Layer}`);
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

// Function to hide the specified panel
function hidePanel(panelId) {
    const panel = document.getElementById(panelId);
    if (panel) {
        panel.style.display = 'none';  // Hide the panel
    }
}
// Function to load PNG overlay
function loadPngOverlay(url, layerName) {
    //const southWest = [6.753572835, 80.4263826425084];
    //const northEast = [7.47454951957935, 81.06883711];
    const southWest = [6.75678270262, 80.4539904085];
    const northEast = [7.48144214086, 81.0332352805];		
    const imageBounds = [southWest, northEast];

    // Ensure the URL is defined and not empty
    if (!url) {
        console.error(`No URL provided for layer: ${layerName}`);
        return; // Exit if URL is invalid
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
            const overlay = L.imageOverlay(imgUrl, imageBounds, { opacity: 0.5 });
            pngOverlays[layerName] = overlay;
            overlay.addTo(map);
        })
        .catch(error => {
            console.error(`Error loading PNG overlay for layer ${layerName}:`, error);
        });
}


// Initialize the map



// Function to load PNG overlay and update legend
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
            const overlay = L.imageOverlay(imgUrl, imageBounds, { opacity: 0.5 });
            pngOverlays[layerName] = overlay;
            overlay.addTo(map);

            // Update legend after adding the layer
            updateLegend(layerName);
        })
        .catch(error => {
            console.error(`Error loading PNG overlay for layer ${layerName}:`, error);
        });
}

// Create a legend control
const legendo = L.control({ position: 'bottomright' });

legendo.onAdd = function () {
    const div = L.DomUtil.create('div', 'legend');
	    div.style.backgroundColor = 'white';
    div.style.padding = '10px'; // Adds padding inside the legend box
    div.style.border = '1px solid #ccc'; // Adds a border around the legend
    div.style.borderRadius = '5px'; // Makes the corners rounded
    div.style.fontSize = '9px'; // Reduces font size
    div.style.lineHeight = '1'; // Reduces line spacing
    div.innerHTML = '<h4>Layer</h4><ul id="legend-list"></ul>';
	
	
    return div;
};

legendo.addTo(map);

// Define color ranges for each layer
const colorRanges = {
    'Rainfall (mm)': [
        { range: '0-10', color: '#FFEDA0' },
        { range: '11-20', color: '#FED976' },
        { range: '21-30', color: '#FEB24C' },
        { range: '31-40', color: '#FD8D3C' },
        { range: '41+', color: '#FC4E2A' }
    ],
    "Monthly Rainfall - 01": [
        { "range": "11.0 to 50", "color": "#d8f2ed" },
        { "range": "50.0 to 100", "color": "#bfded8" },
        { "range": "100.0 to 150", "color": "#a9ccca" },
        { "range": "150.0 to 200", "color": "#93bab4" },
        { "range": "200.0 to 250", "color": "#7ea8a2" },
        { "range": "250.0 to 300", "color": "#6b9993" },
        { "range": "300.0 to 350", "color": "#58a782" },
        { "range": "350.0 to 400", "color": "#477872" },
        { "range": "400.0 to 450", "color": "#376b66" },
        { "range": "450.0 to 500", "color": "#265c56" },
        { "range": "500.0 to 683.86", "color": "#155f4a" }
    ],
    "Monthly  Temporature - Max-01": [
        { "range": "11.12", "color": "#999bff" },
        { "range": "11.12 to 12", "color": "#99a5ff" },
        { "range": "12.0 to 13", "color": "#9cb3ff" },
        { "range": "13.0 to 14", "color": "#9cbeff" },
        { "range": "14.0 to 15", "color": "#9cdcff" },
        { "range": "15.0 to 16", "color": "#9cd9ff" },
        { "range": "16.0 to 17", "color": "#9ce6ff" },
        { "range": "17.0 to 18", "color": "#99f3ff" },
        { "range": "18.0 to 19", "color": "#99ffff" },
        { "range": "19.0 to 20", "color": "#abfff1" },
        { "range": "20.0 to 21", "color": "#b8ffe5" },
        { "range": "21.0 to 22", "color": "#c7ffd8" },
        { "range": "22.0 to 23", "color": "#d4ffcc" },
        { "range": "23.0 to 24", "color": "#dfffbf" },
        { "range": "24.0 to 25", "color": "#ebffb3" },
        { "range": "25.0 to 26", "color": "#f5ffa6" },
        { "range": "26.0 to 27", "color": "#ffff99" },
        { "range": "27.0 to 28", "color": "#ffef99" },
        { "range": "28.0 to 29", "color": "#ffe699" },
        { "range": "29.0 to 30", "color": "#ffd899" },
        { "range": "30.0 to 31", "color": "#ffca99" },
        { "range": "31.0 to 32", "color": "#ffbe99" },
        { "range": "32.0 to 33", "color": "#ffb199" },
        { "range": "33.0 to 34", "color": "#ffa599" },
        { "range": "34.0 to 35", "color": "#ff9999" }
    ],
    "Monthly evoporation - 01": [
        { "range": "1.49", "color": "#4d2096" },
        { "range": "1.49 to 2", "color": "#8a5ea8" },
        { "range": "2.0 to 3", "color": "#c2a7b4" },
        { "range": "3.0 to 4", "color": "#ffffbf" },
        { "range": "4.0 to 5", "color": "#abd17d" },
        { "range": "5.0 to 6", "color": "#60a642" },
        { "range": "6.0 to 7", "color": "#177a0d" }
    ],
	
    "Annual Rainfall": [
        { "range": "<1800", "color": "#b6edf0" },
        { "range": "1800-2000", "color": "#a4dcea" },
        { "range": "2000-2200", "color": "#93cfed" },
        { "range": "2200-2400", "color": "#81c0eb" },
        { "range": "2400-2600", "color": "#6db1e8" },
        { "range": "2600-2800", "color": "#5c9fe6" },
        { "range": "2800-3000", "color": "#4695e3" },
        { "range": "3000-3200", "color": "#3089e3" },
        { "range": "3200-3400", "color": "#217bd4" },
        { "range": "3400-3600", "color": "#2170d1" },
        { "range": "3600-3800", "color": "#2259c7" },
        { "range": "3800-4000", "color": "#204abd" },
        { "range": "4000-4200", "color": "#1c3aba" },
        { "range": "4200-4400", "color": "#172a9f" },
        { "range": "4400-4600", "color": "#131c9c" },
        { "range": "4600-4800", "color": "#09092d" }
    ],	
    'DEM': [
        { "range": "<200", "color": "#aff0e9" },
        { "range": "200-300", "color": "#b1f2c7" },
        { "range": "300-400", "color": "#c1f7b2" },
        { "range": "400-500", "color": "#edfcb3" },
        { "range": "500-600", "color": "#d2e887" },
        { "range": "600-700", "color": "#75c44d" },
        { "range": "700-800", "color": "#1c9e2c" },
        { "range": "800-900", "color": "#16c83f" },
        { "range": "900-1000", "color": "#649434" },
        { "range": "1000-1100", "color": "#a6a628" },
        { "range": "1100-1200", "color": "#e8b613" },
        { "range": "1200-1300", "color": "#e38302" },
        { "range": "1300-1400", "color": "#bd4602" },
        { "range": "1400-1500", "color": "#992402" },
        { "range": "1500-1600", "color": "#780a02" },
        { "range": "1600-1700", "color": "#731c06" },
        { "range": "1700-1800", "color": "#6e2509" },
        { "range": "1800-1900", "color": "#690c0c" },
        { "range": "1900-2000", "color": "#7d4a2a" },
        { "range": "2000-2100", "color": "#914d56" },
        { "range": "2100-2200", "color": "#a39589" },
        { "range": "2200-2300", "color": "#b3b3b3" },
        { "range": "2300-2400", "color": "#cccccc" },
        { "range": "2400-2500", "color": "#e3e1e3" },
        { "range": ">2500", "color": "#fffcff" }
    ],
	
    'Slope': [
        { "range": "0-2", "color": "#10f500" },
        { "range": "5-2", "color": "#80f700" },
        { "range": "10-5", "color": "#d2f700" },
        { "range": "20-10", "color": "#facc00" },
        { "range": "20-45", "color": "#fc7600" },
        { "range": ">45", "color": "#f50000" }
    ],
	
	    'Monthly NDVI -01': [
        { 'range': '-1.0 to -0.2', 'color': '#00008b' },  // Dark blue for very low NDVI
        { 'range': '-0.2 to 0.0', 'color': '#8b4513' },   // Saddle brown for low NDVI
        { 'range': '0.0 to 0.2', 'color': '#ffff66' },    // Light yellow for moderate NDVI
        { 'range': '0.2 to 0.4', 'color': '#adff2f' },    // Green-yellow for higher NDVI
        { 'range': '0.4 to 0.6', 'color': '#90ee90' },    // Light green for high NDVI
        { 'range': '0.6 to 1.0', 'color': '#006400' }     // Dark green for very high NDVI
		
    ],
	    'Monthly NDVI -12': [
        { 'range': '-1.0 to -0.2', 'color': '#00008b' },  // Dark blue for very low NDVI
        { 'range': '-0.2 to 0.0', 'color': '#8b4513' },   // Saddle brown for low NDVI
        { 'range': '0.0 to 0.2', 'color': '#ffff66' },    // Light yellow for moderate NDVI
        { 'range': '0.2 to 0.4', 'color': '#adff2f' },    // Green-yellow for higher NDVI
        { 'range': '0.4 to 0.6', 'color': '#90ee90' },    // Light green for high NDVI
        { 'range': '0.6 to 1.0', 'color': '#006400' }     // Dark green for very high NDVI
		
    ],	
	
};


// Function to update legend
function updateLegend(layerName) {
    const legendList = document.getElementById('legend-list');
    const item = document.createElement('li');
    item.textContent = layerName; // Add layer name to the legend
    legendList.appendChild(item);
}

// Function to update legend with color ranges
function updateLegend(layerName) {
    const legendList = document.getElementById('legend-list');

    // Clear previous legend items for a clean update
    legendList.innerHTML = '';

    if (colorRanges[layerName]) {
        colorRanges[layerName].forEach(entry => {
            const item = document.createElement('li');
            item.innerHTML = `
                <span style="display:inline-block;width:20px;height:10px;background-color:${entry.color};margin-right:10px;"></span>
                ${entry.range}
            `;
            legendList.appendChild(item);
        });
    } else {
        const item = document.createElement('li');
        item.textContent = `No legend available for ${layerName}`;
        legendList.appendChild(item);
    }
}




// Function to load GeoJSON layer
function loadGeoJsonLayer(url, layerName) {
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            const geoJsonLayer = L.geoJSON(data);
            geoJsonLayers[layerName] = geoJsonLayer;
            geoJsonLayer.addTo(map);
        })
        .catch(error => {
            console.error(`Error loading GeoJSON layer for ${layerName}:`, error);
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
},
				
                // Customize how points are displayed with a red cross

                pointToLayer: function (feature, latlng) {
                    let icon;



                    // Assign custom symbols based on the layer name
                    if (layerName === 'Rainfall') {
                        icon = L.divIcon({
                            className: 'rainfall-icon',
                            html: `
                                <svg width="40" height="40" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="50" cy="30" r="20" fill="#1E90FF" />
                                    <path d="M50,55 C40,70, 50,85, 60,70 C50,85, 50,95, 50,85" fill="#1E90FF" />
                                </svg>
                            `,
                            iconSize: [40, 40],
                            iconAnchor: [20, 20]
                        });
                    } else if (layerName === 'Temporature') {
                        icon = L.divIcon({
                            className: 'temperature-icon',
                            html: `
                                <svg width="40" height="40" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                                    <rect x="45" y="20" width="10" height="60" fill="#FF4500"/>
                                    <circle cx="50" cy="85" r="10" fill="#FF4500"/>
                                </svg>
                            `,
                            iconSize: [40, 40],
                            iconAnchor: [20, 20]
                        });
                    } else if (layerName === 'Evoporation') {
                        icon = L.divIcon({
                            className: 'evaporation-icon',
                            html: `
                                <svg width="40" height="40" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M50 20 C30 30, 30 60, 50 80 C70 60, 70 30, 50 20 Z" fill="#32CD32"/>
                                    <path d="M40 20 Q45 10, 50 20 T60 20" stroke="#228B22" stroke-width="2" fill="transparent"/>
                                    <path d="M40 15 Q45 5, 50 15 T60 15" stroke="#228B22" stroke-width="2" fill="transparent"/>
                                </svg>
                            `,
                            iconSize: [40, 40],
                            iconAnchor: [20, 20]
                        });
                    } else if (layerName === 'Water Quality') {
                        icon = L.divIcon({
                            className: 'water-quality-icon',
                            html: `
                                <svg width="40" height="40" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M50 10 C30 30, 30 50, 50 70 C70 50, 70 30, 50 10 Z" fill="#1E90FF"/>
                                    <rect x="40" y="70" width="20" height="30" fill="#2E8B57"/>
                                </svg>
                            `,
                            iconSize: [40, 40],
                            iconAnchor: [20, 20]
                        });
                    } else if (layerName === 'Soil Conservation') {
                        icon = L.divIcon({
                            className: 'red-cross-icon',
                            html: '<div style="color: green; font-size: 30px; transform: rotate(45deg);">+</div>',
                            iconSize: [40, 40],
                            iconAnchor: [20, 20]
                        });
                    }
				
					 else 
if (layerName === 'Tourist attract places') {
    icon = L.divIcon({
        className: 'tourist-attraction-icon',
        html: `
            <div style="position: relative; width: 40px; height: 40px;">
                <div style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    border-radius: 50%;
                    background-color: rgba(255, 215, 0, 0.2); /* Gold circle with transparency */
                "></div>
                <div style="
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    color: red;
                    font-size: 16px;
                    font-weight: bold;
                ">★</div>
            </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
    });
}
					 else 
if (layerName === 'Economic hubs') {
    icon = L.divIcon({
        className: 'economic-hub-icon',
        html: `
            <div style="position: relative; width: 40px; height: 40px;">
                <!-- Brownish circle with transparency -->
                <div style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    border-radius: 50%;
                    background-color: rgba(139, 69, 19, 0.8); /* Brown circle with opacity */
                "></div>
                <!-- Inner circle with darker brown -->
                <div style="
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background-color: #8B4513; /* Darker brown for inner circle */
                "></div>
            </div>
        `,
        iconSize: [40, 40],  // Size of the icon
        iconAnchor: [20, 20] // Anchor to center the icon
    });
}

                    else  {
icon = L.divIcon({
    className: 'undefine',
    html: `
        <div style="position: relative; width: 20px; height: 20px;">
            <!-- Blue outer circle with transparency -->
            <div style="
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                border-radius: 50%;
                background-color: rgba(0, 0, 255, 0.5); /* Semi-transparent blue */
            "></div>
            <!-- Yellow inner circle -->
            <div style="
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 10px;
                height: 10px;
                border-radius: 50%;
                background-color: #FFD700; /* Yellow */
            "></div>
        </div>
    `,
    iconSize: [20, 20],  // Further reduced size of the icon
    iconAnchor: [10, 10] // Updated anchor for center alignment
});


}


                    return L.marker(latlng, { icon: icon });
                },				
                // Define actions for each feature (e.g., polygons, lines)
   onEachFeature: function (feature, layer) {
        layer.on('click', function () {
            updateInfoPanel(feature.properties, 'Layer Name', layer);
			highlightFeature(layer);
			
        });
    }
            });

            // Store and add the GeoJSON layer to the map
            geoJsonLayers[layerName] = geoJsonLayer.addTo(map);
        })
        .catch(error => console.error(`Error loading GeoJSON for layer ${layerName}:`, error));
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
                    } else {
                        loadGeoJsonLayerP(geojson, Layer);
                    }
                } else {
                    if (geoJsonLayers[Layer]) {
                        map.removeLayer(geoJsonLayers[Layer]);
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

        proposalPanel.appendChild(databaseDiv);
    });
}


// Function to hide the specified panel
function hidePanel(panelId) {
    // Get the panel element by its ID
    const panel = document.getElementById(panelId);
    
    // Check if the panel exists and hide it by setting display to 'none'
    if (panel) {
        panel.style.display = 'none';
    }
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
                        const data = results.data.filter(row => row.Group === 'Climate');
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

// Function to update the climate panel with collapsible sections for each Database
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
        // Create a container for each database
        const databaseSection = document.createElement('div');
        databaseSection.className = 'database-section';

        // Create a collapsible button for the database
        const databaseHeader = document.createElement('button');
        databaseHeader.className = 'collapsible';
        databaseHeader.textContent = database;
        databaseHeader.addEventListener('click', function () {
            this.classList.toggle('active');
            const content = this.nextElementSibling;
            if (content.style.display === 'block') {
                content.style.display = 'none';
            } else {
                content.style.display = 'block';
            }
        });

        // Create a div to hold the layers, initially hidden
        const layerContainer = document.createElement('div');
        layerContainer.className = 'layer-content';
        layerContainer.style.display = 'none';

        // Add the layers to the collapsible content
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
        } else if (geoJsonLayers[layerName]) {
            map.removeLayer(geoJsonLayers[layerName]);
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
            layerContainer.appendChild(layerDiv);
        });

        // Append the collapsible button and content to the panel
        databaseSection.appendChild(databaseHeader);
        databaseSection.appendChild(layerContainer);
        climPanel.appendChild(databaseSection);
    });
}

// Add CSS for the collapsible functionality
const style = document.createElement('style');
style.textContent = `
    .collapsible {
        background-color: #777;
        color: white;
        cursor: pointer;
        padding: 10px;
        width: 100%;
        text-align: left;
        border: none;
        outline: none;
        font-size: 15px;
    }

    .collapsible.active, .collapsible:hover {
        background-color: #555;
    }

    .layer-content {
        padding: 0 15px;
        display: none;
        overflow: hidden;
        background-color: #f1f1f1;
    }
`;
document.head.appendChild(style);

// Helper function to remove layer
function removeLayer(layerName, type) {
    if (type === 'Raster' && pngOverlays[layerName]) {
        map.removeLayer(pngOverlays[layerName]);
        //delete pngOverlays[layerName];
    } else if (geoJsonLayers[layerName]) {
        map.removeLayer(geoJsonLayers[layerName]);
        //delete geoJsonLayers[layerName];
    }
}

// Function to load PNG overlay// Helper function to remove layer
function removeLayer(layerName, type) {
    if (type === 'Raster' && pngOverlays[layerName]) {
        map.removeLayer(pngOverlays[layerName]);
        delete pngOverlays[layerName];
    } else if (geoJsonLayers[layerName]) {
        map.removeLayer(geoJsonLayers[layerName]);
        delete geoJsonLayers[layerName];
    }
}


// Function to load GeoJSON layer
function loadGeoJsonLayer(url, layerName) {
    if (geoJsonLayers[layerName]) return;  // Avoid duplicates

    fetch(url)
        .then(response => response.ok ? response.json() : Promise.reject('Error loading GeoJSON'))
        .then(data => {
            const geoJsonLayer = L.geoJSON(data);
            geoJsonLayers[layerName] = geoJsonLayer.addTo(map);
        })
        .catch(error => console.error(`Error loading GeoJSON layer for ${layerName}:`, error));
}


// Combined style options for layers and land cover types
const styleOptions = {
    // Layer-specific styles
    layer1: { color: "#FF0000", weight: 2, fillOpacity: 0.6 },
    layer2: { color: "#0000FF", weight: 1, fillOpacity: 0.3 },
    layer3: { color: "#00FF00", weight: 3, fillOpacity: 0.7 },
    "District Boundary": { color: "Black", weight: 5, dashArray: "5, 5", fillOpacity: 0 },
    "DSD Boundary": { color: "Brown", weight: 2.5, dashArray: "5, 5", fillOpacity: 0 },
    "GN Boundary": { color: "Orange", weight: 2, dashArray: "5, 5", fillOpacity: 0 },
	
	"Conservation forest": { color: "DarkGreen", weight: 2, dashArray: "1, 1", fillOpacity: 0.2 },
  "Reserved forest": { color: "Green", weight: 2, dashArray: "1, 1", fillOpacity: 0.2 },
  "Wild life boundary": { color: "Brown", weight: 2, dashArray: "1, 1", fillOpacity: 0.2 },
  "To be forest": { color: "LightGreen", weight: 2, dashArray: "1, 1", fillOpacity: 0.2 },

    
    // Land cover-specific styles

	
"Tea": { color: "rgb(122, 245, 202)", fillOpacity: 0.6, weight: 0.1 },              // Light green for Tea
"Perennials": { color: "rgb(255, 211, 127)", fillOpacity: 0.6, weight: 0.1 },         // Light yellow for Perennials
"Paddy": { color: "rgb(85, 255, 0)", fillOpacity: 0.6, weight: 0.1 },                // Bright green for Paddy
"Seasonal crop": { color: "rgb(238, 241, 160)", fillOpacity: 0.6, weight: 0.1 },      // Pale yellow for Seasonal crop
"Farms/other": { color: "rgb(197, 0, 255)", fillOpacity: 0.6, weight: 0.1 },          // Purple for Farms/other
"Home garden": { color: "rgb(255, 255, 190)", fillOpacity: 0.6, weight: 0.1 },        // Light yellow for Home garden
"Forest": { color: "rgb(38, 115, 0)", fillOpacity: 0.6, weight: 0.1 },               // Dark green for Forest
"Forest Plantation": { color: "rgb(137, 205, 102)", fillOpacity: 0.6, weight: 0.1 }, // Light green for Forest Plantation
"Grassland": { color: "rgb(0, 0, 0)", fillOpacity: 0.6, weight: 0.1 },               // Black for Grassland
"Scrub land": { color: "rgb(0, 168, 132)", fillOpacity: 0.6, weight: 0.1 },           // Greenish teal for Scrub land
"Water Bodies": { color: "rgb(151, 219, 242)", fillOpacity: 0.6, weight: 0.1 },       // Light blue for Water Bodies
"Urban area": { color: "rgb(255, 0, 0)", fillOpacity: 0.6, weight: 0.1 },             // Red for Urban area
"Rocks": { color: "rgb(0, 0, 0)", fillOpacity: 0.6, weight: 0.1 },                    // Black for Rocks
"Wetland": { color: "rgb(0, 112, 255)", fillOpacity: 0.6, weight: 0.1 },              // Blue for Wetland
"Bareland": { color: "rgb(204, 204, 204)", fillOpacity: 0.6, weight: 0.1 },           // Light gray for Barelands
	
	
"Low": { color: "#FFFFBE", fillOpacity: 0.6, weight: 0 },               // Yellow for low
"Moderate": { color: "#FFA77F", fillOpacity: 0.6, weight: 0 },          // Orange for moderate
"High": { color: "#FF0000", fillOpacity: 0.6, weight: 0 },             // Red for high
//"null": { color: "#FFFFFF", fillOpacity: 0.6, weight: 0 },             // wight for null



  "Water": { color: "#8D4DB8", fillOpacity: 0.6, weight: 0 },                 // RGB(141, 77, 184)
  "Immature Brown Loams; steeply dissected, hilly and rolling terrain": { color: "#A8A75B", fillOpacity: 0.9, weight: 0 }, // RGB(168, 167, 91)
  "Red-Yellow Pdzolic soils with dark B horizon & RedYellow Podzolic soils with prominent A1 horizon; rolling terrain": { color: "#A4F054", fillOpacity: 0.9, weight: 0 }, // RGB(164, 240, 84)
  "Red-Yellow Podzolic soils & Mountain Regosols; mountainous terrain": { color: "#E0B584", fillOpacity: 0.9, weight: 0 }, // RGB(224, 181, 132)
  "Red-Yellow Podzolic soils; steeply dissected, hilly and rolling terrain": { color: "#64F562", fillOpacity: 0.9, weight: 0 }, // RGB(100, 245, 98)
  "Reddish Brown Earths & Immature Brown Looms; rolling, hilly and steep terrain": { color: "#8094CF", fillOpacity: 0.9, weight: 0 }, // RGB(128, 148, 207)
  "Reddish Brown Latosolic soils; steeply dissected, hilly and rolling terrain": { color: "#C44D9C", fillOpacity: 0.9, weight: 0 }, // RGB(196, 77, 156)
  "Steep rockland & Lithosols": { color: "#D9895B", fillOpacity: 0.9, weight: 0 },   // RGB(217, 137, 91)



  "WU1": { color: "#FFF700", fillOpacity: 0.9, weight: 0 },   // RGB(255, 247, 0)
  "WU2a": { color: "#8BB500", fillOpacity: 0.9, weight: 0 },  // RGB(139, 181, 0)
  "WU2b": { color: "#BEE8FF", fillOpacity: 0.9, weight: 0 },  // RGB(190, 232, 255)
  "WU3": { color: "#D6E600", fillOpacity: 0.9, weight: 0 },   // RGB(214, 230, 0)
  "WM1a": { color: "#1F6E00", fillOpacity: 0.9, weight: 0 },  // RGB(31, 110, 0)
  "WM2a": { color: "#74A600", fillOpacity: 0.9, weight: 0 },  // RGB(116, 166, 0)
  "WM2b": { color: "#498A00", fillOpacity: 0.9, weight: 0 },  // RGB(73, 138, 0)
  "WM3a": { color: "#A4C400", fillOpacity: 0.9, weight: 0 },  // RGB(164, 196, 0)
  "WM3b": { color: "#FFF700", fillOpacity: 0.9, weight: 0 },  // RGB(255, 247, 0)
  "IU1": { color: "#F1F500", fillOpacity: 0.9, weight: 0 },   // RGB(241, 245, 0)
  "IU2": { color: "#A4FF73", fillOpacity: 0.9, weight: 0 },   // RGB(164, 255, 115)
  "IU3a": { color: "#FF5500", fillOpacity: 0.9, weight: 0 },  // RGB(255, 85, 0)
  "IU3b": { color: "#FF9500", fillOpacity: 0.9, weight: 0 },  // RGB(255, 149, 0)
  "IU3c": { color: "#FF6F00", fillOpacity: 0.9, weight: 0 },  // RGB(255, 111, 0)
  "IU3d": { color: "#FF4000", fillOpacity: 0.9, weight: 0 },  // RGB(255, 64, 0)
  "IU3e": { color: "#FF2200", fillOpacity: 0.9, weight: 0 },  // RGB(255, 34, 0)
  "IM1a": { color: "#EAFFBF", fillOpacity: 0.9, weight: 0 },  // RGB(234, 255, 191)
  "IM1b": { color: "#FFD000", fillOpacity: 0.9, weight: 0 },  // RGB(255, 208, 0)
  "IM1c": { color: "#FFEBAF", fillOpacity: 0.9, weight: 0 },  // RGB(255, 235, 175)
  "IM3b": { color: "#D3FFBE", fillOpacity: 0.9, weight: 0 },  // RGB(211, 255, 190)
  "IM3c": { color: "#D3FFBE", fillOpacity: 0.9, weight: 0 },  // RGB(211, 255, 190)
  "IL2": { color: "#FFBB00", fillOpacity: 0.9, weight: 0 },   // RGB(255, 187, 0)
  
      "<50": { color: "rgb(255, 255, 128)", weight: 2, fillOpacity: 0.9 },
    "50-100": { color: "rgb(252, 228, 104)", weight: 2, fillOpacity: 0.9 },
    "100-200": { color: "rgb(250, 205, 80)", weight: 2, fillOpacity: 0.9 },
    "200-500": { color: "rgb(245, 179, 56)", weight: 2, fillOpacity: 0.9 },
    "500-1000": { color: "rgb(224, 144, 38)", weight: 2, fillOpacity: 0.9 },
    "1000-2000": { color: "rgb(181, 94, 24)", weight: 2, fillOpacity: 0.9 },
    "2000-5000": { color: "rgb(145, 51, 10)", weight: 2, fillOpacity: 0.9 },
    ">5000": { color: "rgb(107, 0, 0)", weight: 2, fillOpacity: 0.9 },


};

// Function to load GeoJSON layer with custom styles
// Function to load GeoJSON layer with custom styles, including gauging station symbol for Rainfall
// Function to load GeoJSON layer with custom symbols based on layer name
// Function to load GeoJSON layer with custom symbols based on layer name
// Function to load GeoJSON layer with custom symbols based on layer name
// Function to load a GeoJSON layer and display it on the map
// Add a global object to store legends for each layer
// Add a global object to store legends for each layer
// Add a global object to store legends for each layer
// Add a global object to store legends for each layer
// Add a global object to store legends for each layer
// Add a global object to store legends for each layer

// Add a global object to store legends for each layer
// Add a global object to store legends for each layer
// Add a global object to store legends for each layer
// Add a global object to store legends for each layer
// Add a global object to store legends for each layer
// Function to create the legend for land cover layers


const layerLegends = {};

function loadGeoJsonLayer(url, layerName) {
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Create GeoJSON layer with custom styles and symbols
            const geoJsonLayer = L.geoJSON(data, {
                pointToLayer: function (feature, latlng) {
                    let icon;

                    // Assign custom symbols based on the layer name
                    if (layerName === 'Rainfall') {
                        icon = L.divIcon({
                            className: 'rainfall-icon',
                            html: `
                                <svg width="40" height="40" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="50" cy="30" r="20" fill="#1E90FF" />
                                    <path d="M50,55 C40,70, 50,85, 60,70 C50,85, 50,95, 50,85" fill="#1E90FF" />
                                </svg>
                            `,
                            iconSize: [40, 40],
                            iconAnchor: [20, 20]
                        });
                    } else if (layerName === 'Temporature') {
                        icon = L.divIcon({
                            className: 'temperature-icon',
                            html: `
                                <svg width="40" height="40" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                                    <rect x="45" y="20" width="10" height="60" fill="#FF4500"/>
                                    <circle cx="50" cy="85" r="10" fill="#FF4500"/>
                                </svg>
                            `,
                            iconSize: [40, 40],
                            iconAnchor: [20, 20]
                        });
                    } else if (layerName === 'Evoporation') {
                        icon = L.divIcon({
                            className: 'evaporation-icon',
                            html: `
                                <svg width="40" height="40" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M50 20 C30 30, 30 60, 50 80 C70 60, 70 30, 50 20 Z" fill="#32CD32"/>
                                    <path d="M40 20 Q45 10, 50 20 T60 20" stroke="#228B22" stroke-width="2" fill="transparent"/>
                                    <path d="M40 15 Q45 5, 50 15 T60 15" stroke="#228B22" stroke-width="2" fill="transparent"/>
                                </svg>
                            `,
                            iconSize: [40, 40],
                            iconAnchor: [20, 20]
                        });
                    } else if (layerName === 'Water Quality') {
                        icon = L.divIcon({
                            className: 'water-quality-icon',
                            html: `
                                <svg width="40" height="40" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M50 10 C30 30, 30 50, 50 70 C70 50, 70 30, 50 10 Z" fill="#1E90FF"/>
                                    <rect x="40" y="70" width="20" height="30" fill="#2E8B57"/>
                                </svg>
                            `,
                            iconSize: [40, 40],
                            iconAnchor: [20, 20]
                        });
                    }

                    return L.marker(latlng, { icon: icon });
                },
                style: (feature) => {
                    const landCoverType = feature.properties['classLULC'];
                    const LandslideType = feature.properties['level'];
                    const soilType = feature.properties['NAME'];
                    const agroecoType = feature.properties['zone'];
                    const populationDensity = feature.properties['Density'];

                    if (populationDensity !== undefined) {
                        if (populationDensity < 50) {
                            return styleOptions["<50"];
                        } else if (populationDensity >= 50 && populationDensity < 100) {
                            return styleOptions["50-100"];
                        } else if (populationDensity >= 100 && populationDensity < 200) {
                            return styleOptions["100-200"];
                        } else if (populationDensity >= 200 && populationDensity < 500) {
                            return styleOptions["200-500"];
                        } else if (populationDensity >= 500 && populationDensity < 1000) {
                            return styleOptions["500-1000"];
                        } else if (populationDensity >= 1000 && populationDensity < 2000) {
                            return styleOptions["1000-2000"];
                        } else if (populationDensity >= 2000 && populationDensity < 5000) {
                            return styleOptions["2000-5000"];
                        } else if (populationDensity >= 5000) {
                            return styleOptions[">5000"];
                        }
                    }

                    return (styleOptions[agroecoType] || styleOptions[soilType] || styleOptions[LandslideType] || styleOptions[landCoverType] || styleOptions[layerName] || { color: "#333", weight: 1, fillOpacity: 0.5 });
                },
   onEachFeature: function (feature, layer) {
        layer.on('click', function () {
            updateInfoPanel(feature.properties, 'Layer Name', layer);
			highlightFeature(layer);
        });
    }
            });

            // Store and add the layer to the map
            geoJsonLayers[layerName] = geoJsonLayer;
            geoJsonLayer.addTo(map);

            // Add the legend for this layer if it doesn't exist
            if (!layerLegends[layerName]) {
                const legend = L.control({ position: 'topright' });

legend.onAdd = function () {
    const div = L.DomUtil.create('div', 'info legend');
    // Add inline styles for background color and font size
    div.style.backgroundColor = 'white';
    div.style.padding = '10px'; // Adds padding inside the legend box
    div.style.border = '1px solid #ccc'; // Adds a border around the legend
    div.style.borderRadius = '5px'; // Makes the corners rounded
    div.style.fontSize = '9px'; // Reduces font size
    div.style.lineHeight = '1'; // Reduces line spacing
    div.innerHTML = `<b>${layerName}</b><br>`;

    // Dynamically generate legend based on properties
    let categories = [];
    let colors = [];

if (layerName === 'Rainfall') {
    // Custom SVG symbol for the legend
    div.innerHTML += `
        <div style="display: flex; align-items: center; margin-bottom: 5px;">
            <svg width="20" height="20" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="margin-right: 5px;">
                <circle cx="50" cy="30" r="20" fill="#1E90FF" />
                <path d="M50,55 C40,70, 50,85, 60,70 C50,85, 50,95, 50,85" fill="#1E90FF" />
            </svg>
            <span>Rainfall</span>
        </div>
    `;
} else if (layerName === 'Temporature') {
    // Custom SVG symbol for the legend
    div.innerHTML += `
        <div style="display: flex; align-items: center; margin-bottom: 5px;">
            <svg width="20" height="20" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="margin-right: 5px;">
                <rect x="45" y="20" width="10" height="60" fill="#FF4500"/>
                <circle cx="50" cy="85" r="10" fill="#FF4500"/>
            </svg>
            <span>Temperature</span>
        </div>
    `;
} else if (layerName === 'Evoporation') {
    // Custom SVG symbol for the legend
    div.innerHTML += `
        <div style="display: flex; align-items: center; margin-bottom: 5px;">
            <svg width="20" height="20" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="margin-right: 5px;">
                <path d="M50 20 C30 30, 30 60, 50 80 C70 60, 70 30, 50 20 Z" fill="#32CD32"/>
                <path d="M40 20 Q45 10, 50 20 T60 20" stroke="#228B22" stroke-width="2" fill="transparent"/>
                <path d="M40 15 Q45 5, 50 15 T60 15" stroke="#228B22" stroke-width="2" fill="transparent"/>
            </svg>
            <span>Evaporation</span>
        </div>
    `;
} else if (layerName === 'Water Quality') {
    // Custom SVG symbol for the legend
    div.innerHTML += `
        <div style="display: flex; align-items: center; margin-bottom: 5px;">
            <svg width="20" height="20" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="margin-right: 5px;">
                <path d="M50 10 C30 30, 30 50, 50 70 C70 50, 70 30, 50 10 Z" fill="#1E90FF"/>
                <rect x="40" y="70" width="20" height="30" fill="#2E8B57"/>
            </svg>
            <span>Water Quality</span>
        </div>
    `;
}
else if (layerName === 'Land cover') {
        categories = [
            'Tea', 'Perennials', 'Paddy', 'Seasonal crop', 'Farms/other', 
            'Home garden', 'Forest', 'Forest Plantation', 'Grassland', 
            'Scrub land', 'Water Bodies', 'Urban area', 'Rocks', 
            'Wetland', 'Bareland'
        ];
        colors = [
            "rgb(122, 245, 202)", "rgb(255, 211, 127)", "rgb(85, 255, 0)", 
            "rgb(238, 241, 160)", "rgb(197, 0, 255)", "rgb(255, 255, 190)", 
            "rgb(38, 115, 0)", "rgb(137, 205, 102)", "rgb(0, 0, 0)", 
            "rgb(0, 168, 132)", "rgb(151, 219, 242)", "rgb(255, 0, 0)", 
            "rgb(0, 0, 0)", "rgb(0, 112, 255)", "rgb(204, 204, 204)"
        ];
    } else if (layerName === 'Conservation forest') {
        categories = ['Conservation forest'];
        colors = ['DarkGreen'];
    } else if (layerName === 'Reserved forest') {
        categories = ['Reserved forest'];
        colors = ['Green'];
    } else if (layerName === 'Wild life boundary') {
        categories = ['Wild life boundary'];
        colors = ['Brown'];
    } else if (layerName === 'District Boundary') {
        categories = ['District Boundary'];
        colors = ['Black']; // Simplified for display
    } else if (layerName === 'DSD Boundary') {
        categories = ['DSD Boundary'];
        colors = ['Brown']; // Simplified for display
    } else if (layerName === 'GN Boundary') {
        categories = ['GN Boundary'];
        colors = ['Orange']; // Simplified for display
    } else if (layerName === 'Annual Rainfall') {
        categories = ['Good', 'Moderate', 'Poor'];
        colors = ['#32CD32', '#FFD700', '#FF6347'];
	} else if (layerName === 'Population') {
        categories = [
            '<50', '50-100', '100-200', '200-500', '500-1000', 
            '1000-2000', '2000-5000', '>5000'
        ];
        colors = [
            "rgb(255, 255, 128)", "rgb(252, 228, 104)", "rgb(250, 205, 80)", 
            "rgb(245, 179, 56)", "rgb(224, 144, 38)", "rgb(181, 94, 24)", 
            "rgb(145, 51, 10)", "rgb(107, 0, 0)"];
	} else if (layerName === 'Landslide hazard zone') {
        categories = [
            '','Low', 'Moderate', 'High'
        ];
        colors = [
            "gray", "#FFFFBE", "#FFA77F", "#FF0000"
        ];
	}
	



	
    // Dynamically generate the legend items
    for (let i = 0; i < categories.length; i++) {
        div.innerHTML += `
            <i style="background:${colors[i]}; width: 20px; height: 10px; display: inline-block; margin-right: 5px;"></i>
            ${categories[i]}<br>`;
    }
    return div;
};

                layerLegends[layerName] = legend;
            }

            // Show the legend for the layer when it is added
            layerLegends[layerName].addTo(map);
        })
        .catch(error => {
            console.error(`Error loading GeoJSON layer for ${layerName}:`, error);
        });
}


// Helper function to remove a layer and its associated legend
function removeControl(layerName, type) {
    // Remove the layer based on its type (Raster or GeoJSON)
    if (type === 'Raster' && pngOverlays[layerName]) {
        map.removeLayer(pngOverlays[layerName]);
        delete pngOverlays[layerName];
    } else if (geoJsonLayers[layerName]) {
        map.removeLayer(geoJsonLayers[layerName]);
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
    }
    if (layerLegends[layerName]) {
        map.removeControl(layerLegends[layerName]);
        delete layerLegends[layerName];
    }
}


// Function to update the attribute panel with properties of the clicked feature
// Function to update the attribute panel with properties of the clicked feature
// Function to update the attribute panel with properties of the clicked feature
// Function to update the attribute panel with properties of the clicked feature
function updateInfoPanel(properties, layerName, featureLayer) {
    const attributePanel = document.getElementById('attributePanel');
    attributePanel.innerHTML = ''; // Clear previous content

    // Create a list to display properties
    const list = document.createElement('ul');

    // Add "Layer" header in bold black and the layer name in blue
    const layerNameItem = document.createElement('li');
    layerNameItem.innerHTML = `<strong style="color: black;">Layer:</strong> <span style="color: blue;">${layerName}</span>`;
    list.appendChild(layerNameItem);

    // Loop through properties and display each attribute
    for (const [key, value] of Object.entries(properties)) {
        if (key === 'photopath' && value) {
            // Create an image element if the key is 'photopath'
            const imageItem = document.createElement('li');
            imageItem.innerHTML = `<strong style="color: black;">${key}:</strong><br><img src="${value}" alt="Photo" style="max-width: 100%; height: auto;">`;
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

// Function to highlight the selected feature
// Function to highlight the selected feature
function highlightFeature(featureLayer) {
    // Reset the style of all layers first
    map.eachLayer(layer => {
        if (layer.resetStyle) {
            layer.resetStyle();  // Reset styles for vector layers (polylines, polygons)
        }
        if (layer instanceof L.Marker && layer.originalIcon) {
            // Reset icon for markers (points)
            layer.setIcon(layer.originalIcon);
        }
    });

    // Check the type of the feature (point, line, polygon)
    if (featureLayer instanceof L.Marker) {
        // Highlighting a point (marker) by setting a custom icon (red dot or other icon)
        if (!featureLayer.originalIcon) {
            featureLayer.originalIcon = featureLayer.options.icon;  // Save original icon if not already saved
        }
        featureLayer.setIcon(L.divIcon({
            className: 'highlighted-dot', // Custom class for styling
            html: '<div style="width: 12px; height: 12px; background-color: cyan; border-radius: 50%;"></div>', // Red circle (dot)
            iconSize: [12, 12], // Size of the dot
            iconAnchor: [6, 6], // Anchor point for the center of the dot
            popupAnchor: [0, -10]
        }));
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
            weight: 2,      // Thicker border around the polygon
            color: 'cyan',  // Cyan border for the polygon
            fillColor: 'yellow', // Light yellow fill for the polygon
            fillOpacity: 0.5  // Transparency for the fill
        });
    } else {
        console.warn("Unknown layer type.");
    }

    // Bring the feature to the front for better visibility
    if (featureLayer.bringToFront) {
        featureLayer.bringToFront();
    }
}




// Event listeners for button clicks to activate layers
document.getElementById('baseLayersBtn').addEventListener('click', activateBaseLayers);
document.getElementById('proposalBtn').addEventListener('click', activateProposalLayers);
document.getElementById('climateLayerBtn').addEventListener('click', activateClimateLayers);

