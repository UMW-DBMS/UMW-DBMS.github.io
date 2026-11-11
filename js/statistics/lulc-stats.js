/**
 * LULC statistics
 *
 * Purpose : Land-use / land-cover area pie chart for the selected MWS. Drawn when its tab is clicked; data is fetched on every MWS change.
 * Depends : Chart.js, Leaflet, renderStatisticsLegend() from statistics-shared.js, `#areaPieChart`, `#selectMWSID`.
 * Exposes : (nothing; wrapped in an IIFE so its helpers do not leak into the global scope). Data: LND_LULC_MWS_{id}.geojson
 */

(function () {
        // Initialize an object to hold total areas for each class
    var areaTotals20 = {};

    // Declare a global variable for the chart instance
    let chartInstance = null;

    // Function to update the data based on the selected MWS ID
    function updateData1(selectMWSID) {
        // Construct the GeoJSON URL using the selectMWSID
        var geojsonUrl = `https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Data/EXD/04_LND/LND_LULC/LND_LULC_MWS_${selectMWSID}.geojson`;

        // Fetch the GeoJSON data from the constructed URL
        fetch(geojsonUrl)
            .then(response => response.json())
            .then(data => {
                areaTotals20 = {}; // Reset the area totals

                // Clear existing layers from the map if needed
                if (window.currentLayer) {
                    map.removeLayer(window.currentLayer);
                }

                // Add new data to the map
                window.currentLayer = L.geoJSON(data, {
                    style: function(feature) {
                        var className = feature.properties.classLULC;
                        var fillColor = Symbology.lulcColor(className);
                        return {
                            color: fillColor,
                            fillColor: fillColor,
                            fillOpacity: 0.6
                        };
                    },
                    onEachFeature: function(feature, layer) {
                        var className = feature.properties.classLULC;
                        var area = feature.properties.Area_Ha;

                        // Aggregate area by class
                        if (!areaTotals20[className]) {
                            areaTotals20[className] = 0;
                        }
                        areaTotals20[className] += area;

                        // Optionally add a popup with area info
                        layer.bindPopup('<strong>Class:</strong> ' + className + '<br><strong>Area:</strong> ' + area + ' ha');
                    }
                })//.addTo(map);

                // Calculate the total area of all polygons for percentage calculation
                var totalArea = Object.values(areaTotals20).reduce((a, b) => a + b, 0);

                // Prepare data for the pie chart
                var ids = Object.keys(areaTotals20);
                var areas = Object.values(areaTotals20);

                // Store data for future chart rendering
                renderPieChart1(ids, areas, totalArea, false);
            })
            .catch(error => console.error('Error loading the GeoJSON data:', error));
    }

    // Function to render the pie chart
    function renderPieChart1(ids, areas, totalArea, showChart = true) {
        // Get the chart context
        var ctx = document.getElementById('areaPieChart').getContext('2d');

        if (showChart) {
            if (window.Chart && typeof Chart.getChart === 'function') {
                const existingChart = Chart.getChart('areaPieChart');
                if (existingChart) existingChart.destroy();
            }

            // Destroy the old chart instance if it exists
            if (chartInstance !== null) {
                chartInstance.destroy();
            }
        }

        if (showChart) {
            // Create a new chart instance
            chartInstance = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: ids,
                    datasets: [{
                        label: 'Polygon Areas',
                        data: areas,
                        backgroundColor: ids.map(id => Symbology.lulcColor(id)),
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: false },
                        title: {
                            display: true,
                            text: 'Landuse Landcover Area (ha)'
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
            renderStatisticsLegend(ids.map(id => ({
                label: id,
                color: Symbology.lulcColor(id)
            })));
        }
    }

    // Render the pie chart when the tab is clicked
    function setupToggleButton1() {
        var sidePanel = document.getElementById('statPanel');
        var toggleButton = document.getElementById('lulcstatPanel');

        toggleButton.addEventListener('click', function () {
            // Ensure the panel stays open
            sidePanel.classList.add('open');

            // Render the chart with the stored data
            var ids = Object.keys(areaTotals20);
            var areas = Object.values(areaTotals20);
            var totalArea = areas.reduce((a, b) => a + b, 0);
            renderPieChart1(ids, areas, totalArea, true);
        });
    }

    // Example: Add an event listener for MWS ID selection (e.g., dropdown menu)
    document.getElementById('selectMWSID').addEventListener('change', function(event) {
        var selectedMwsID = event.target.value;
        var processedMwsID = selectedMwsID.replace(/-/g, '_');
        updateData1(processedMwsID);
    });

    // Initialize the toggle button functionality
    setupToggleButton1();
})();
