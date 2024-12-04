// Define a color map for unique classes
var colorMap = {
    "Forest": "#006400",
    "Forest Plantation": "#228B22",
    "AG": "#3CB371",
    "urban": "#808080",
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
    "Wetland": "#00CED1"
};

// Initialize an object to hold total areas for each class
var areaTotals21D = {};

// Declare a global variable for the chart instance
var chartInstance21 = null;

// Flag to track if the pie chart is currently visible
var isChartVisible21 = false;

// Function to generate a random hex color
function generateRandomColor() {
    return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
}
// Function to update the data based on the selected MWS ID
function updateData3(selectMWSID) {
    // Construct the GeoJSON URL using the selectMWSID
	//var geojsonUrl = `https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Data/EXD/MWS_${selectMWSID}/ED_07_SED_PPL_poly_v1.geojson`;
    var geojsonUrl = `https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Data/EXD/01_ADM/GND/MWS_${selectMWSID}.geojson`;	

    // Fetch the GeoJSON data from the constructed URL
    fetch(geojsonUrl)
        .then(response => response.json())
        .then(data => {
            areaTotals21D = {}; // Reset the area totals

            // Clear existing layers from the map if needed
            if (window.currentLayer) {
                map.removeLayer(window.currentLayer);
            }

            // Add new data to the map
            window.currentLayer = L.geoJSON(data, {
                style: function(feature) {
                    var className = feature.properties.GND_N;
					var fillColor;
        // Check if the GND value is already in the colorMap
        if (colorMap[className]) {
            fillColor = colorMap[className];
        } else {
            // If not, generate a random color and add it to the colorMap
            fillColor = generateRandomColor();
            colorMap[className] = fillColor; // Cache the new color
        }

        return {
            color: fillColor,
            fillColor: fillColor,
            fillOpacity: 0.6
        };
                },
                onEachFeature: function(feature, layer) {
                    var className = feature.properties.GND_N;
                    var area = feature.properties.Area__Ha_;

                    // Aggregate area by class
                    if (!areaTotals21D[className]) {
                        areaTotals21D[className] = 0;
                    }
                    areaTotals21D[className] += area;

                    // Optionally add a popup with area info
                    layer.bindPopup('<strong>Class:</strong> ' + className + '<br><strong>Area:</strong> ' + area + ' ha');
                }
            })//.addTo(map);

            // Calculate the total area of all polygons for percentage calculation
            var totalArea = Object.values(areaTotals21D).reduce((a, b) => a + b, 0);

            // Prepare data for the pie chart
            var ids = Object.keys(areaTotals21D);
            var areas = Object.values(areaTotals21D);

            // Store data for future chart rendering
            renderPieChart3(ids, areas, totalArea, false);
        })
        .catch(error => console.error('Error loading the GeoJSON data:', error));
}

// Function to render the pie chart
function renderPieChart3(ids, areas, totalArea, showChart = true) {
    // Get the chart context
    var ctx = document.getElementById('areaPieChart').getContext('2d');

    // Destroy the old chart instance if it exists
    if (chartInstance21 !== null) {
        chartInstance21.destroy();
    }

    if (showChart) {
        // Create a new chart instance
        chartInstance21 = new Chart(ctx, {
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
function setupToggleButton3() {
    var sidePanel = document.getElementById('statPanel');
    var toggleButton = document.getElementById('adminstatPanel');

    toggleButton.addEventListener('click', function () {
        // Toggle the panel's open class
        sidePanel.classList.toggle('open');
        
        // Toggle the chart visibility
        isChartVisible21 = !isChartVisible21;

        if (isChartVisible21) {
            toggleButton.innerText = 'Hide Chart';

            // Render the chart with the stored data
            var ids = Object.keys(areaTotals21D);
            var areas = Object.values(areaTotals21D);
            var totalArea = areas.reduce((a, b) => a + b, 0);

            renderPieChart3(ids, areas, totalArea, true);
        } else {
            toggleButton.innerText = 'Admin';

            // Destroy the chart to hide it
            if (chartInstance21 !== null) {
                chartInstance21.destroy();
                chartInstance21 = null;
            }
        }
    });
}


// Function to download the chart data as CSV
function downloadCSV3() {
    if (!areaTotals21D || Object.keys(areaTotals21D).length === 0) {
        alert('No data available to download.');
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,Class,Area (ha),%\n";
    for (const [className, area] of Object.entries(areaTotals21D)) {
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
function downloadChart3() {
    if (!chartInstance21) {
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
document.getElementById('downloadButton').addEventListener('click', downloadCSV3);
document.getElementById('downloadChartButton').addEventListener('click', downloadChart3);



// Example: Add an event listener for MWS ID selection (e.g., dropdown menu)
document.getElementById('selectMWSID').addEventListener('change', function(event) {
    var selectedMwsID = event.target.value;
    var processedMwsID = selectedMwsID.replace(/-/g, '_');
    updateData3(processedMwsID);
});

// Initialize the toggle button functionality
setupToggleButton3();

