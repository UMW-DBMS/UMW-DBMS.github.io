/**
 * Administrative (GND) statistics
 *
 * Purpose : GN-division area pie chart for the selected MWS. Drawn when its tab is clicked; data is fetched on every MWS change.
 * Depends : Chart.js, Leaflet, renderStatisticsLegend() from statistics-shared.js, `#areaPieChart`, `#selectMWSID`.
 * Exposes : (nothing; wrapped in an IIFE so its helpers do not leak into the global scope). Data: 01_ADM/GND/MWS_{id}.geojson
 */

(function () {
    // Define a color map for unique classes
    // Colours are assigned in order of appearance from a colour-blind friendly palette (same data = same colours).
    var adminColorMap = {};

    // Initialize an object to hold total areas for each class
    var areaTotals21D = {};

    // Declare a global variable for the chart instance
    var chartInstance21 = null;

    function adminColor(className) {
        if (!adminColorMap[className]) {
            adminColorMap[className] = Symbology.categoryColor(Object.keys(adminColorMap).length);
        }
        return adminColorMap[className];
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
                adminColorMap = {};  // and the colours, so the same data always gets the same colours

                // Clear existing layers from the map if needed
                if (window.currentLayer) {
                    map.removeLayer(window.currentLayer);
                }

                // Add new data to the map
                window.currentLayer = L.geoJSON(data, {
                    style: function(feature) {
                        var className = feature.properties.GND_N;
                        var fillColor = adminColor(className);
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

        if (showChart) {
            if (window.Chart && typeof Chart.getChart === 'function') {
                const existingChart = Chart.getChart('areaPieChart');
                if (existingChart) existingChart.destroy();
            }

            // Destroy the old chart instance if it exists
            if (chartInstance21 !== null) {
                chartInstance21.destroy();
            }
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
                        backgroundColor: ids.map(id => adminColor(id)),
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: false },
                        title: {
                            display: true,
                            text: 'GND Area (Ha)'
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
            renderStatisticsLegend(ids.map(id => ({ label: id, color: adminColor(id) })));
        }
    }

    // Render the pie chart when the tab is clicked
    function setupToggleButton3() {
        var sidePanel = document.getElementById('statPanel');
        var toggleButton = document.getElementById('adminstatPanel');

        toggleButton.addEventListener('click', function () {
            // Ensure the panel stays open
            sidePanel.classList.add('open');

            // Render the chart with the stored data
            var ids = Object.keys(areaTotals21D);
            var areas = Object.values(areaTotals21D);
            var totalArea = areas.reduce((a, b) => a + b, 0);
            renderPieChart3(ids, areas, totalArea, true);
        });
    }

    // Example: Add an event listener for MWS ID selection (e.g., dropdown menu)
    document.getElementById('selectMWSID').addEventListener('change', function(event) {
        var selectedMwsID = event.target.value;
        var processedMwsID = selectedMwsID.replace(/-/g, '_');
        updateData3(processedMwsID);
    });

    // Initialize the toggle button functionality
    setupToggleButton3();
})();
