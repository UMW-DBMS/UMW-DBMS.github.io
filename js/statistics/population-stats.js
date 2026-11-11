/**
 * Population statistics
 *
 * Purpose : Population-by-GND pie chart for the selected MWS. Drawn when its tab is clicked; data is fetched on every MWS change.
 * Depends : Chart.js, Leaflet, renderStatisticsLegend() from statistics-shared.js, `#areaPieChart`, `#selectMWSID`.
 * Exposes : (nothing; wrapped in an IIFE so its helpers do not leak into the global scope). Data: 07_SED/SED_PPL/SED_PPL_MWS_{id}.geojson
 */

(function () {
    // Colours are assigned per GND in order of appearance from a colour-blind friendly palette.
    var demographyColorMap = {};

    // Initialize an object to hold total areas for each class
    var areaTotals22D = {};

    // Declare a global variable for the chart instance
    var chartInstance22 = null;

    function getPopulationValue(properties) {
        var rawValue = properties.Total_pop ?? properties.Total_Pop ?? properties.TotalPop ?? properties.Total ?? properties.Tot_Pop;
        if (typeof rawValue === 'string') {
            rawValue = rawValue.replace(/,/g, '').trim();
        }
        var population = Number(rawValue);
        return Number.isFinite(population) ? population : 0;
    }


    function getDemographyColor(className) {
        if (!demographyColorMap[className]) {
            demographyColorMap[className] = Symbology.categoryColor(Object.keys(demographyColorMap).length);
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

        if (showChart) {
            if (window.Chart && typeof Chart.getChart === 'function') {
                const existingChart = Chart.getChart('areaPieChart');
                if (existingChart) existingChart.destroy();
            }

            // Destroy the old chart instance if it exists
            if (chartInstance22 !== null) {
                chartInstance22.destroy();
            }
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
                        legend: { display: false },
                        title: {
                            display: true,
                            text: 'Total Population'
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
            renderStatisticsLegend(ids.map(id => ({ label: id, color: getDemographyColor(id) })));
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

    // Example: Add an event listener for MWS ID selection (e.g., dropdown menu)
    document.getElementById('selectMWSID').addEventListener('change', function(event) {
        var selectedMwsID = event.target.value;
        var processedMwsID = selectedMwsID.replace(/-/g, '_');
        updateData2(processedMwsID);
    });

    // Initialize the toggle button functionality
    setupToggleButton2();
})();
