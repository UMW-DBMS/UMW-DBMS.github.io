// Demography colors are generated per GND, matching the admin pie chart behavior.
var demographyColorMap = {};




// Initialize an object to hold total areas for each class
var areaTotals22D = {};

// Declare a global variable for the chart instance
var chartInstance22 = null;

function getPopulationValue(properties) {
    var rawValue = properties.Total_Pop ?? properties.TotalPop ?? properties.Total ?? properties.Tot_Pop;
    if (typeof rawValue === 'string') {
        rawValue = rawValue.replace(/,/g, '').trim();
    }
    var population = Number(rawValue);
    return Number.isFinite(population) ? population : 0;
}

function generateRandomColor2() {
    return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
}

function getDemographyColor(className) {
    if (!demographyColorMap[className]) {
        demographyColorMap[className] = generateRandomColor2();
    }
    return demographyColorMap[className];
}


// Function to update the data based on the selected MWS ID
function updateData2(selectMWSID) {
    // Construct the GeoJSON URL using the selectMWSID
	var geojsonUrl = `https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Data/EXD/07_SED/SED_PPL/SED_PPL_MWS_${selectMWSID}.geojson`;

    // Fetch the GeoJSON data from the constructed URL
    fetch(geojsonUrl)
        .then(response => response.json())
        .then(data => {
            areaTotals22D = {}; // Reset the area totals
            demographyColorMap = {};

            // Clear existing layers from the map if needed
            if (window.currentLayer) {
                map.removeLayer(window.currentLayer);
            }

            // Add new data to the map
            window.currentLayer = L.geoJSON(data, {
                style: function(feature) {
                    var props = feature.properties || {};
                    var className = props.GND_N;
                    var fillColor = getDemographyColor(className);
                    return {
                        color: fillColor,
                        fillColor: fillColor,
                        fillOpacity: 0.6
                    };
                },
                onEachFeature: function(feature, layer) {
                    var className = feature.properties.GND_N;
                    var area = getPopulationValue(feature.properties);

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

    if (window.Chart && typeof Chart.getChart === 'function') {
        const existingChart = Chart.getChart('areaPieChart');
        if (existingChart) existingChart.destroy();
    }

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
                    backgroundColor: ids.map(id => getDemographyColor(id)),
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

// Render the pie chart when the tab is clicked
function setupToggleButton2() {
    var sidePanel = document.getElementById('statPanel');
    var toggleButton = document.getElementById('demostatPanel');

    toggleButton.addEventListener('click', function () {
        // Ensure the panel stays open
        sidePanel.classList.add('open');

        // Render the chart with the stored data
        var ids = Object.keys(areaTotals22D);
        var areas = Object.values(areaTotals22D);
        var totalArea = areas.reduce((a, b) => a + b, 0);
        renderPieChart2(ids, areas, totalArea, true);
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
// Example: Add an event listener for MWS ID selection (e.g., dropdown menu)
document.getElementById('selectMWSID').addEventListener('change', function(event) {
    var selectedMwsID = event.target.value;
    var processedMwsID = selectedMwsID.replace(/-/g, '_');
    updateData2(processedMwsID);
});

// Initialize the toggle button functionality
setupToggleButton2();
