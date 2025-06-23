// Define a color map for unique classes
var colorMap = {
  "Tea": "#A3FF73",              // Light green for Tea
  "Perennials": "#FFD37F",       // Light yellow for Perennials
  "Paddy": "#55FF00",            // Bright green for Paddy
  "Seasonal crops": "#EEF1A0",   // Pale yellow for Seasonal crops
  "Farms": "#C500FF",            // Purple for Farms
  "Chena": "#E39E00",            // Tangerine for Chena
  "Home garden": "#FFFFBE",      // Light yellow for Home garden
  "Forest lands": "#267300",     // Dark green for Forest
  "Forest plantation": "#89CD66",// Light green for Forest Plantation
  "Grass land": "#D3FFBE",       // Greenish background for Grassland
  "Scrub land": "#00A884",       // Greenish teal for Scrub land
  "Bare land": "#D7B09E",        // for Barelands
  "Builtup land": "#FF7F7F",     // Red for Builtup area
  "Wetland": "#0070FF",          // Blue for Wetland
  "Water bodies": "#97DBF2",     // Light blue for Water Bodies
  "Rocky area": "#000000",       // Black for Rocky area
  "Defense": "#4E4E4E",          // Grey for Defense
  "Miscellaneous": "#E1E1E1",    // White for Miscellaneous
  "Mining Sites": "#FFF500",     // Yellow for Mining sites
  "Waste Management": "#CCCCCC", // Grey for Waste Management
  "Immature Brown Loams; steeply dissected, hilly and rolling terrain": "#A8A75B",
  "Red-Yellow Pdzolic soils with dark B horizon & RedYellow Podzolic soils with prominent A1 horizon; rolling terrain": "#A4F054",
  "Red-Yellow Podzolic soils & Mountain Regosols; mountainous terrain": "#E0B584",
  "Red-Yellow Podzolic soils; steeply dissected, hilly and rolling terrain": "#64F562",
  "Reddish Brown Earths & Immature Brown Looms; rolling, hilly and steep terrain": "#8094CF",
  "Reddish Brown Latosolic soils; steeply dissected, hilly and rolling terrain": "#C44D9C",
  "Steep rockland & Lithosols": "#D9895B",
  
  "Low": "#FFFFBE",               // Yellow for low
"Moderate": "#FFA77F",          // Orange for moderate
"High":  "#FF0000",             // Red for high
"null": "gray",             // wight for null
};



// Initialize an object to hold total areas for each class
var areaTotals50 = {};

// Declare a global variable for the chart instance
let chartInstance50 = null;

// Flag to track if the pie chart is currently visible
var isChartVisible50 = false;

// Function to update the data based on the selected MWS ID
function updateData50(selectMWSID) {
    // Construct the GeoJSON URL using the selectMWSID
    //var geojsonUrl = `https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Data/EXD/04_LND/LND_LULC/LND_LULC_MWS_${selectMWSID}.geojson`;
    //var geojsonUrl = `https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Data/EXD/05_SOL/SOIL_SLT/SOIL_SLT_MWS_${selectMWSID}.geojson`;	
    var geojsonUrl = `https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Data/EXD/11_HZR/HZR/ED_11_HZR_MWS_${selectMWSID}.geojson`;	

    // Fetch the GeoJSON data from the constructed URL
    fetch(geojsonUrl)
        .then(response => response.json())
        .then(data => {
            areaTotals50 = {}; // Reset the area totals

            // Clear existing layers from the map if needed
            if (window.currentLayer) {
                map.removeLayer(window.currentLayer);
            }

            // Add new data to the map
            window.currentLayer = L.geoJSON(data, {
                style: function(feature) {
                    var className = feature.properties.level;
                    var fillColor = colorMap[className] || '#808080'; // Default to grey if class not found
                    return {
                        color: fillColor,
                        fillColor: fillColor,
                        fillOpacity: 0.6
                    };
                },
                onEachFeature: function(feature, layer) {
                    var className = feature.properties.level;
                    var area = feature.properties.Area_Ha;
                    //var Tarea = feature.features[0].properties.AREA;     
                    // Aggregate area by class
                    if (!areaTotals50[className]) {
                        areaTotals50[className] = 0;
                    }
                    areaTotals50[className] += area;

                    // Optionally add a popup with area info
                    layer.bindPopup('<strong>Class:</strong> ' + className + '<br><strong>Area:</strong> ' + area + ' ha');
                }
            })//.addTo(map);

            // Calculate the total area of all polygons for percentage calculation
            var totalArea = Object.values(areaTotals50).reduce((a, b) => a + b, 0);
			//var totalArea = Object.values(Tarea) * 100

            // Prepare data for the pie chart
            var ids = Object.keys(areaTotals50);
            var areas = Object.values(areaTotals50);

            // Store data for future chart rendering
            renderPieChart50(ids, areas, totalArea, false);
        })
        .catch(error => console.error('Error loading the GeoJSON data:', error));
}

// Function to render the pie chart
function renderPieChart50(ids, areas, totalArea, showChart = true) {
    // Get the chart context
    var ctx = document.getElementById('areaPieChart').getContext('2d');

    // Destroy the old chart instance if it exists
    if (chartInstance50 !== null) {
        chartInstance50.destroy();
    }

    if (showChart) {
        // Create a new chart instance
        chartInstance50 = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ids,
                datasets: [{
                    label: 'Polygon Areas',
                    data: areas,
                    backgroundColor: ids.map(id => colorMap[id] || '#808080'),
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Landslide Hazard'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(tooltipItem) {
                                var area = areas[tooltipItem.dataIndex];
                                var percentage = (area / totalArea * 100).toFixed(2);
                                return tooltipItem.label + ': ' + area.toFixed(2) + ' ha (' + percentage + '%)';
                            }
                        }
                    }
                }
            }
        });
    }
}

// Toggle the pie chart and side panel
function setupToggleButton50() {
    var sidePanel = document.getElementById('statPanel');
    var toggleButton = document.getElementById('hazardstatPanel');

    toggleButton.addEventListener('click', function () {
        // Toggle the panel's open class
        sidePanel.classList.toggle('open');
        
        // Toggle the chart visibility
        isChartVisible50 = !isChartVisible50;
// Attach event listeners to buttons
document.getElementById('downloadButton').addEventListener('click', downloadCSV50);
document.getElementById('downloadChartButton').addEventListener('click', downloadChart50);


        if (isChartVisible50) {
            toggleButton.innerText = 'Hide Chart';

            // Render the chart with the stored data
            var ids = Object.keys(areaTotals50);
            var areas = Object.values(areaTotals50);
            var totalArea = areas.reduce((a, b) => a + b, 0);

            renderPieChart50(ids, areas, totalArea, true);
        } else {
            toggleButton.innerText = 'hazard';

            // Destroy the chart to hide it
            if (chartInstance50 !== null) {
                chartInstance50.destroy();
                chartInstance50 = null;
            }
        }
    });
}


// Function to download the chart data as CSV
function downloadCSV50() {
    if (!areaTotals50 || Object.keys(areaTotals50).length === 0) {
        alert('No data available to download.');
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,Class,Area (ha)\n";
    for (const [className, area] of Object.entries(areaTotals50)) {
        csvContent += `${className},${area.toFixed(2)}\n`;
    }

    // Create a link and trigger the download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'pie_chart_hazard_data.csv');
    document.body.appendChild(link); // Required for Firefox
    link.click();
    document.body.removeChild(link);
}

// Function to download the chart as a PNG
function downloadChart50() {
    if (!chartInstance50) {
        alert('No chart to download.');
        return;
    }

    // Get the canvas element and convert to image data
    const chartCanvas = document.getElementById('areaPieChart');
    const link = document.createElement('a');
    link.href = chartCanvas.toDataURL('image/png');
    link.download = 'pie_chart_hazard.png';
    link.click();
}





// Example: Add an event listener for MWS ID selection (e.g., dropdown menu)
document.getElementById('selectMWSID').addEventListener('change', function(event) {
    var selectedMwsID = event.target.value;
    var processedMwsID = selectedMwsID.replace(/-/g, '_');
    updateData50(processedMwsID);
});

// Initialize the toggle button functionality
setupToggleButton50();
