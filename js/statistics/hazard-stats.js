/**
 * Landslide-hazard statistics
 *
 * Purpose : Landslide-hazard-class area pie chart for the selected MWS. Drawn when its tab is clicked; data is fetched on every MWS change.
 * Depends : Chart.js, Leaflet, renderStatisticsLegend() from statistics-shared.js, `#areaPieChart`, `#selectMWSID`.
 * Exposes : (nothing; wrapped in an IIFE so its helpers do not leak into the global scope). Data: 11_HZR/HZR/ED_11_HZR_MWS_{id}.geojson
 */

(function () {
    // Define a color map for unique classes
    // Initialize an object to hold total areas for each class
    var areaTotals50 = {};

    // Declare a global variable for the chart instance
    let chartInstance50 = null;

    // Function to update the data based on the selected MWS ID
    function updateData50(selectMWSID) {
        // Construct the GeoJSON URL using the selectMWSID
        //var geojsonUrl = `https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Data/EXD/04_LND/LND_LULC/LND_LULC_MWS_${selectMWSID}.geojson`;
        //var geojsonUrl = `https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Data/EXD/05_SOL/SOIL_SLT/SOIL_SLT_MWS_${selectMWSID}.geojson`;
        var geojsonUrl = `https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Data/EXD/11_HZR/HZR/ED_11_HZR_MWS_${selectMWSID}.geojson`;

        // Fetch the GeoJSON data from the constructed URL
        return fetch(geojsonUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Hazard layer request failed (${response.status})`);
                }
                return response.json();
            })
            .then(data => {
                areaTotals50 = {}; // Reset the area totals

                // Statistics only needs the feature attributes. The Base Layers
                // workflow is responsible for displaying the hazard polygons.
                (data.features || []).forEach(function (feature) {
                    var properties = feature.properties || {};
                    var className = properties.level || 'Unknown';
                    var area = Number(properties.Area_Ha);
                    if (!Number.isFinite(area)) {
                        area = Number(properties.Shape_Area);
                    }
                    if (!Number.isFinite(area)) return;
                    if (!areaTotals50[className]) {
                        areaTotals50[className] = 0;
                    }
                    areaTotals50[className] += area;
                });

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

        if (showChart) {
            if (window.Chart && typeof Chart.getChart === 'function') {
                const existingChart = Chart.getChart('areaPieChart');
                if (existingChart) existingChart.destroy();
            }

            // Destroy the old chart instance if it exists
            if (chartInstance50 !== null) {
                chartInstance50.destroy();
            }
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
                        backgroundColor: ids.map(id => Symbology.hazardColor(id)),
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: false },
                        title: {
                            display: true,
                            text: 'Landslide Hazard Area (Ha)'
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
                    },
                    animation: false
                }
            });
            renderStatisticsLegend(ids.map(id => ({ label: id, color: Symbology.hazardColor(id) })));
        }
    }

    // Render the pie chart when the tab is clicked
    function setupToggleButton50() {
        var sidePanel = document.getElementById('statPanel');
        var toggleButton = document.getElementById('hazardstatPanel');

        toggleButton.addEventListener('click', function () {
            // Ensure the panel stays open
            sidePanel.classList.add('open');

            // The MWS can already be selected when the statistics panel is opened.
            // Load the hazard totals on demand in that case.
            if (Object.keys(areaTotals50).length === 0) {
                var selectedMwsID = document.getElementById('selectMWSID').value;
                if (selectedMwsID) {
                    updateData50(selectedMwsID.replace(/-/g, '_')).then(function () {
                        var ids = Object.keys(areaTotals50);
                        var areas = Object.values(areaTotals50);
                        var totalArea = areas.reduce((a, b) => a + b, 0);
                        renderPieChart50(ids, areas, totalArea, true);
                    });
                    return;
                }
            }

            // Render the chart with the stored data
            var ids = Object.keys(areaTotals50);
            var areas = Object.values(areaTotals50);
            var totalArea = areas.reduce((a, b) => a + b, 0);
            renderPieChart50(ids, areas, totalArea, true);
        });
    }

    // Example: Add an event listener for MWS ID selection (e.g., dropdown menu)
    document.getElementById('selectMWSID').addEventListener('change', function(event) {
        var selectedMwsID = event.target.value;
        var processedMwsID = selectedMwsID.replace(/-/g, '_');
        updateData50(processedMwsID);
    });

    // Initialize the toggle button functionality
    setupToggleButton50();
})();
