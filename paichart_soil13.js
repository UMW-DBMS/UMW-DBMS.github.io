// Define a color map for unique classes
var colorMap = {
  "Forest": "#006400",
  "Forest Plantation": "#228B22",
  "AG": "#3CB371",
  "Urban": "#808080",
  "Paddy": "#FFD700",
  "Tea": "#8B4513",
  "Perennials": "#556B2F",
  "Seasonal crop": "#32CD32",
  "Bareland": "#D2B48C",
  "Farms/other": "#B8860B",
  "Home garden": "#66CDAA",
  "Urban area": "#696969",
  "Grassland": "#ADFF2F",
  "Scrub land": "#8B0000",
  "Rocks": "#A9A9A9",
  "Water Bodies": "#4682B4",
  "Wetland": "#00CED1",
  "Water": "#8D4DB8",
  "Immature Brown Loams; steeply dissected, hilly and rolling terrain": "#A8A75B",
  "Red-Yellow Pdzolic soils with dark B horizon & RedYellow Podzolic soils with prominent A1 horizon; rolling terrain": "#A4F054",
  "Red-Yellow Podzolic soils & Mountain Regosols; mountainous terrain": "#E0B584",
  "Red-Yellow Podzolic soils; steeply dissected, hilly and rolling terrain": "#64F562",
  "Reddish Brown Earths & Immature Brown Looms; rolling, hilly and steep terrain": "#8094CF",
  "Reddish Brown Latosolic soils; steeply dissected, hilly and rolling terrain": "#C44D9C",
  "Steep rockland & Lithosols": "#D9895B"
};



// Initialize an object to hold total areas for each class
var areaTotals40 = {};

// Declare a global variable for the chart instance
let chartInstance40 = null;

// Flag to track if the pie chart is currently visible
var isChartVisible40 = false;

// Function to update the data based on the selected MWS ID
function updateData40(selectMWSID) {
    // Construct the GeoJSON URL using the selectMWSID
    //var geojsonUrl = `https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Data/EXD/04_LND/LND_LULC/LND_LULC_MWS_${selectMWSID}.geojson`;
    var geojsonUrl = `https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Data/EXD/05_SOL/SOIL_SLT/SOIL_SLT_MWS_${selectMWSID}.geojson`;	

    // Fetch the GeoJSON data from the constructed URL
    fetch(geojsonUrl)
        .then(response => response.json())
        .then(data => {
            areaTotals40 = {}; // Reset the area totals

            // Clear existing layers from the map if needed
            if (window.currentLayer) {
                map.removeLayer(window.currentLayer);
            }

            // Add new data to the map
            window.currentLayer = L.geoJSON(data, {
                style: function(feature) {
                    var className = feature.properties.NAME;
                    var fillColor = colorMap[className] || '#808080'; // Default to grey if class not found
                    return {
                        color: fillColor,
                        fillColor: fillColor,
                        fillOpacity: 0.6
                    };
                },
                onEachFeature: function(feature, layer) {
                    var className = feature.properties.NAME;
                    var area = feature.properties.Area_Ha;

                    // Aggregate area by class
                    if (!areaTotals40[className]) {
                        areaTotals40[className] = 0;
                    }
                    areaTotals40[className] += area;

                    // Optionally add a popup with area info
                    layer.bindPopup('<strong>Class:</strong> ' + className + '<br><strong>Area:</strong> ' + area + ' ha');
                }
            })//.addTo(map);

            // Calculate the total area of all polygons for percentage calculation
            var totalArea = Object.values(areaTotals40).reduce((a, b) => a + b, 0);

            // Prepare data for the pie chart
            var ids = Object.keys(areaTotals40);
            var areas = Object.values(areaTotals40);

            // Store data for future chart rendering
            renderPieChart40(ids, areas, totalArea, false);
        })
        .catch(error => console.error('Error loading the GeoJSON data:', error));
}

// Function to render the pie chart
function renderPieChart40(ids, areas, totalArea, showChart = true) {
    // Get the chart context
    var ctx = document.getElementById('areaPieChart').getContext('2d');

    // Destroy the old chart instance if it exists
    if (chartInstance40 !== null) {
        chartInstance40.destroy();
    }

    if (showChart) {
        // Create a new chart instance
        chartInstance40 = new Chart(ctx, {
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
                        text: 'Polygon Areas'
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
function setupToggleButton40() {
    var sidePanel = document.getElementById('statPanel');
    var toggleButton = document.getElementById('soilstatPanel');

    toggleButton.addEventListener('click', function () {
        // Toggle the panel's open class
        sidePanel.classList.toggle('open');
        
        // Toggle the chart visibility
        isChartVisible40 = !isChartVisible40;

        if (isChartVisible40) {
            toggleButton.innerText = 'Hide Chart';

            // Render the chart with the stored data
            var ids = Object.keys(areaTotals40);
            var areas = Object.values(areaTotals40);
            var totalArea = areas.reduce((a, b) => a + b, 0);

            renderPieChart40(ids, areas, totalArea, true);
        } else {
            toggleButton.innerText = 'soil';

            // Destroy the chart to hide it
            if (chartInstance40 !== null) {
                chartInstance40.destroy();
                chartInstance40 = null;
            }
        }
    });
}


// Function to download the chart data as CSV
function downloadCSV40() {
    if (!areaTotals40 || Object.keys(areaTotals40).length === 0) {
        alert('No data available to download.');
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,Class,Area (ha)\n";
    for (const [className, area] of Object.entries(areaTotals40)) {
        csvContent += `${className},${area.toFixed(2)}\n`;
    }

    // Create a link and trigger the download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'pie_chart_data.csv');
    document.body.appendChild(link); // Required for Firefox
    link.click();
    document.body.removeChild(link);
}

// Function to download the chart as a PNG
function downloadChart40() {
    if (!chartInstance40) {
        alert('No chart to download.');
        return;
    }

    // Get the canvas element and convert to image data
    const chartCanvas = document.getElementById('areaPieChart');
    const link = document.createElement('a');
    link.href = chartCanvas.toDataURL('image/png');
    link.download = 'pie_chart.png';
    link.click();
}

// Attach event listeners to buttons
document.getElementById('downloadButton').addEventListener('click', downloadCSV40);
document.getElementById('downloadChartButton').addEventListener('click', downloadChart40);



// Example: Add an event listener for MWS ID selection (e.g., dropdown menu)
document.getElementById('selectMWSID').addEventListener('change', function(event) {
    var selectedMwsID = event.target.value;
    var processedMwsID = selectedMwsID.replace(/-/g, '_');
    updateData40(processedMwsID);
});

// Initialize the toggle button functionality
setupToggleButton40();
