/**
 * Boundary and drainage overview
 *
 * Purpose : Draws the crimson MWS boundary outline and the blue drainage network on load and zooms to the study area.
 * Depends : Leaflet, global `map`.
 * Exposes : (nothing; side effects only)
 */

const MWS_BOUNDARY_URL = 'https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Data/EXD/UMW/MWS_Boundary_Updated_UMC_Names.geojson';
const DRAINAGE_LINES_URL = 'https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Data/ED_02_HYD_DRN_line_v1.geojson';

// Overview outline: thin crimson, no fill, non-interactive so loaded data layers receive the clicks.
fetch(MWS_BOUNDARY_URL)
    .then(response => response.json())
    .then(data => {
        const boundaryLayer = L.geoJSON(data, {
            interactive: false,
            style: function () {
                return { color: '#C2185B', weight: 1, opacity: 0.7, fillOpacity: 0 };
            }
        }).addTo(map);
        map.fitBounds(boundaryLayer.getBounds());
    })
    .catch(error => {
        console.error('Error loading GeoJSON:', error);
    });

// Drainage lines: line weight follows the stream order stored in grid_code.
fetch(DRAINAGE_LINES_URL)
    .then(response => response.json())
    .then(data => {
        L.geoJSON(data, {
            style: function (feature) {
                return {
                    color: 'blue',
                    weight: feature.properties.grid_code / 5,
                    opacity: 1
                };
            }
        }).addTo(map);
    })
    .catch(error => {
        console.error('Error loading GeoJSON:', error);
    });
