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
var areaTotals22D = {};

// Declare a global variable for the chart instance
var chartInstance22 = null;

// Flag to track if the pie chart is currently visible
var isChartVisible22 = false;

// Function to update the data based on the selected MWS ID
function updateData2(selectMWSID) {
    // Construct the GeoJSON URL using the selectMWSID
	var geojsonUrl = `https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Data/EXD/MWS_${selectMWSID}/ED_07_SED_PPL_poly_v1.geojson`;

    // Fetch the GeoJSON data from the constructed URL
    fetch(geojsonUrl)
        .then(response => response.json())
        .then(data => {
            areaTotals22D = {}; // Reset the area totals

            // Clear existing layers from the map if needed
            if (window.currentLayer) {
                map.removeLayer(window.currentLayer);
            }

            // Add new data to the map
            window.currentLayer = L.geoJSON(data, {
                style: function(feature) {
                    var className = feature.properties.GND_N;
                    var fillColor = colorMap[className] || '#808080'; // Default to grey if class not found
                    return {
                        color: fillColor,
                        fillColor: fillColor,
                        fillOpacity: 0.6
                    };
                },
                onEachFeature: function(feature, layer) {
                    var className = feature.properties.GND_N;
                    var area = feature.properties.Total;

                    // Aggregate area by class
                    if (!areaTotals22D[className]) {
                        areaTotals22D[className] = 0;
                    }
                    areaTotals22D[className] += area;

                    // Optionally add a popup with area info
                    layer.bindPopup('<strong>Class:</strong> ' + className + '<br><strong>Area:</strong> ' + area + ' population');
                }
            })//.addTo(map);

            // Calculate the total area of all polygons for percentage calculation
            var totalArea = Object.values(areaTotals22D).reduce((a, b) => a + b, 0);

            // Prepare data for the pie chart
            var ids = Object.keys(areaTotals22D);
            var areas = Object.values(areaTotals22D);

            // Store data for future chart rendering
            renderPieChart2(ids, areas, totalArea, false);
        })
        .catch(error => console.error('Error loading the GeoJSON data:', error));
}

// Function to render the pie chart
function renderPieChart2(ids, areas, totalArea, showChart = true) {
    // Get the chart context
    var ctx = document.getElementById('areaPieChart').getContext('2d');

    // Destroy the old chart instance if it exists
    if (chartInstance22 !== null) {
        chartInstance22.destroy();
    }

    if (showChart) {
        // Create a new chart instance
        chartInstance22 = new Chart(ctx, {
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
                                return tooltipItem.label + ': ' + area.toFixed(2) + ' population (' + percentage + '%)';
                            }
                        }
                    }
                }
            }
        });
    }
}

// Toggle the pie chart and side panel
function setupToggleButton2() {
    var sidePanel = document.getElementById('statPanel');
    var toggleButton = document.getElementById('demostatPanel');

    toggleButton.addEventListener('click', function () {
        // Toggle the panel's open class
        sidePanel.classList.toggle('open');
        
        // Toggle the chart visibility
        isChartVisible22 = !isChartVisible22;

        if (isChartVisible22) {
            toggleButton.innerText = 'Hide Chart';

            // Render the chart with the stored data
            var ids = Object.keys(areaTotals22D);
            var areas = Object.values(areaTotals22D);
            var totalArea = areas.reduce((a, b) => a + b, 0);

            renderPieChart2(ids, areas, totalArea, true);
        } else {
            toggleButton.innerText = 'Demography';

            // Destroy the chart to hide it
            if (chartInstance22 !== null) {
                chartInstance22.destroy();
                chartInstance22 = null;
            }
        }
    });
}


// Function to download the chart data as CSV
function downloadCSV2() {
    if (!areaTotals22D || Object.keys(areaTotals22D).length === 0) {
        alert('No data available to download.');
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,Class,Area (sq km)\n";
    for (const [className, area] of Object.entries(areaTotals22D)) {
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
function downloadChart2() {
    if (!chartInstance22) {
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
document.getElementById('downloadButton').addEventListener('click', downloadCSV2);
document.getElementById('downloadChartButton').addEventListener('click', downloadChart2);



// Example: Add an event listener for MWS ID selection (e.g., dropdown menu)
document.getElementById('selectMWSID').addEventListener('change', function(event) {
    var selectedMwsID = event.target.value;
    var processedMwsID = selectedMwsID.replace(/-/g, '_');
    updateData2(processedMwsID);
});

// Initialize the toggle button functionality
setupToggleButton2();
