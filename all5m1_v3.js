
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
                layerState[Layer] = e.target.checked;  // Update layer state				
                if (e.target.checked) {
                    // Check if the layer is a Raster
                    if (Group === 'Raster' && geojson) {
                        loadPngOverlay(geojson, Layer);
                    } else if (Group === 'Base' && geojson) {
                        loadGeoJsonLayer(geojson, Layer);
                    }
                } else {
                    if (Group === 'Raster' && pngOverlays[Layer]) {
                        map.removeLayer(pngOverlays[Layer]);
                    } else if (geoJsonLayers[Layer]) {
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
    const southWest = [6.753572835, 80.4263826425084];
    const northEast = [7.47454951957935, 81.06883711];
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
                // Customize how points are displayed with a red cross
                pointToLayer: function (feature, latlng) {
                    // Create a custom red cross icon for point features
                    const redCrossIcon = L.divIcon({
                        className: 'red-cross-icon',
                        html: '<div style="color: green; font-size: 30px; transform: rotate(45deg);">+</div>',
                        iconSize: [20, 20],  // Size of the red cross
                        iconAnchor: [10, 10] // Anchor the icon at the center
                    });

                    // Return the marker with the red cross icon
                    return L.marker(latlng, { icon: redCrossIcon });
                },
                // Define actions for each feature (e.g., polygons, lines)
                onEachFeature: (feature, layer) => {
                    layer.on('click', () => updateInfoPanel(feature.properties, layer));
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
                    if (type === 'Raster' && pngOverlays[layerName]) {
                        map.removeLayer(pngOverlays[layerName]);
                    } else if (geoJsonLayers[layerName]) {
                        map.removeLayer(geoJsonLayers[layerName]);
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
    "Forest": { color: "#006400", fillOpacity: 0.6, weight: 0.1 },              // Dark green for Forest
    "Forest Plantation": { color: "#228B22", fillOpacity: 0.6, weight: 0.1 },   // Lighter green for Forest Plantation
    "AG": { color: "#3CB371", fillOpacity: 0.5, weight: 0.1 },                  // Medium sea green for Agriculture
    "urban": { color: "#808080", fillOpacity: 0.7, weight: 0.1 },               // Gray for Urban
    "Paddy": { color: "#FFD700", fillOpacity: 0.4, weight: 0.1 },               // Golden for Paddy
    "Tea": { color: "#8B4513", fillOpacity: 0.5, weight: 0.1 },                 // Saddle brown for Tea
    "Perennials": { color: "#556B2F", fillOpacity: 0.5, weight: 0.1 },          // Dark olive green for Perennials
    "Seasonal crop": { color: "#32CD32", fillOpacity: 0.4, weight: 0.1 },       // Lime green for Seasonal crop
    "Bareland": { color: "#D2B48C", fillOpacity: 0.5, weight: 0.1 },            // Tan for Bareland
    "Farms/other": { color: "#B8860B", fillOpacity: 0.5, weight: 0.1 },         // Dark goldenrod for Farms/other
    "Home garden": { color: "#66CDAA", fillOpacity: 0.5, weight: 0.1 },         // Medium aquamarine for Home garden
    "Urban area": { color: "#696969", fillOpacity: 0.7, weight: 0.1 },          // Dim gray for Urban area
    "Grassland": { color: "#ADFF2F", fillOpacity: 0.5, weight: 0.1 },           // Green yellow for Grassland
    "Scrub land": { color: "#8B0000", fillOpacity: 0.5, weight: 0.1 },          // Dark red for Scrub land
    "Rocks": { color: "#A9A9A9", fillOpacity: 0.6, weight: 0.1 },               // Dark gray for Rocks
    "Water Bodies": { color: "#4682B4", fillOpacity: 0.5, weight: 0.1 },        // Steel blue for Water Bodies
    "Wetland": { color: "#00CED1", fillOpacity: 0.4, weight: 0.1 },             // Dark turquoise for Wetland
	
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
                onEachFeature: (feature, layer) => {
                    layer.on('click', () => updateInfoPanel(feature.properties, layerName));
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
                    div.innerHTML = `<b>${layerName} Legend</b><br>`;

                    // Dynamically generate legend based on properties
                    let categories = [];
                    let colors = [];

                    // Example: If the layer has a specific property like 'classLULC', use it to define categories
                    if (layerName === 'Rainfall' || layerName === 'Temporature') {
                        categories = ['Low', 'Medium', 'High'];
                        colors = ['#00FF00', '#FFFF00', '#FF0000'];
                    } else if (layerName === 'Evoporation') {
                        categories = ['Low', 'Medium', 'High'];
                        colors = ['#32CD32', '#FFD700', '#FF6347'];
                    } else if (layerName === 'Water Quality') {
                        categories = ['Good', 'Moderate', 'Poor'];
                        colors = ['#32CD32', '#FFD700', '#FF6347'];
                    }

                    // Dynamically generate the legend items
                    for (let i = 0; i < categories.length; i++) {
                        div.innerHTML +=
                            `<i style="background:${colors[i]}"></i> ${categories[i]}<br>`;
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
function updateInfoPanel(properties, layerName) {
    const attributePanel = document.getElementById('attributePanel');
    attributePanel.innerHTML = '';  // Clear previous content

    // Create a list to display properties
    const list = document.createElement('ul');

    // Add "Layer" header in bold black and the layer name in blue
    const layerNameItem = document.createElement('li');
    layerNameItem.innerHTML = `<strong style="color: black;">Layer:</strong> <span style="color: blue;">${layerName}</span>`;  
    list.appendChild(layerNameItem);

    // Loop through properties and display each attribute
    for (const [key, value] of Object.entries(properties)) {
        const listItem = document.createElement('li');

        // Make the attribute name bold black, and the value in black
        listItem.innerHTML = `<strong style="color: black;">${key}:</strong> <span style="color: black;">${value}</span>`;
        list.appendChild(listItem);
    }

    attributePanel.appendChild(list);  // Append list to the attribute panel
}


// Event listeners for button clicks to activate layers
document.getElementById('baseLayersBtn').addEventListener('click', activateBaseLayers);
document.getElementById('proposalBtn').addEventListener('click', activateProposalLayers);
document.getElementById('climateLayerBtn').addEventListener('click', activateClimateLayers);

