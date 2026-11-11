/**
 * Layer configuration and styling
 *
 * Purpose : Static configuration: which layers get labels or are hidden, and the legend colour ranges of the raster layers.
 *           Polygon, line and marker styles now live in symbology.js.
 * Depends : symbology.js (road categories).
 * Exposes : proposalLabelLayers, hiddenBaseLayers, ENVIRONMENTAL_PROTECTION_LAYER_*, ROAD_CATEGORY_CONFIG, colorRanges, monthlyTemperatureMaxLegend
 */

const proposalLabelLayers = new Set([
    'soil and water conservation - on site',
    'soil and water conservation - off site',
    'lanslides',
    'landslides',
    'water resource management',
    'water source protection',
    'domestic water supply',
    'minor irrigation related proposals',
    'water quality improvement',
    'stream reservation',
    'minor tanks restoration',
    'minor tanks'
]);

const hiddenBaseLayers = new Set([
    'flood',
    'building density',
    'building dencity',
    'forest fire'
]);

const ENVIRONMENTAL_PROTECTION_LAYER_NAME = 'Environmental protection area';

const ENVIRONMENTAL_PROTECTION_LAYER_URL = 'https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Data/EXD/03_RSV/RSV_FRC_TF/RSV_FRC_TF_UMW.geojson';

const ENVIRONMENTAL_PROTECTION_LAYER_BASE_URL = 'https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Data/EXD/03_RSV';

// Road, track and railway categories: TL_GFCODE codes and line styles live in symbology.js.
const ROAD_CATEGORY_CONFIG = Symbology.ROADS;

// Legend colour ranges of the raster layers. These colours are baked into the PNG files and must match them.
const colorRanges = {
    'Rainfall (mm)': [
        { range: '0-10', color: '#FFEDA0' },
        { range: '11-20', color: '#FED976' },
        { range: '21-30', color: '#FEB24C' },
        { range: '31-40', color: '#FD8D3C' },
        { range: '41+', color: '#FC4E2A' }
    ],
    "Monthly Rainfall - 01": [
        { "range": "11.0 to 50", "color": "#d8f2ed" },
        { "range": "50.0 to 100", "color": "#bfded8" },
        { "range": "100.0 to 150", "color": "#a9ccca" },
        { "range": "150.0 to 200", "color": "#93bab4" },
        { "range": "200.0 to 250", "color": "#7ea8a2" },
        { "range": "250.0 to 300", "color": "#6b9993" },
        { "range": "300.0 to 350", "color": "#58a782" },
        { "range": "350.0 to 400", "color": "#477872" },
        { "range": "400.0 to 450", "color": "#376b66" },
        { "range": "450.0 to 500", "color": "#265c56" },
        { "range": "500.0 to 683.86", "color": "#155f4a" }
    ],
    "Monthly  Temperature - Max-01": [
        { "range": "11.12", "color": "#999bff" },
        { "range": "11.12 to 12", "color": "#99a5ff" },
        { "range": "12.0 to 13", "color": "#9cb3ff" },
        { "range": "13.0 to 14", "color": "#9cbeff" },
        { "range": "14.0 to 15", "color": "#9cdcff" },
        { "range": "15.0 to 16", "color": "#9cd9ff" },
        { "range": "16.0 to 17", "color": "#9ce6ff" },
        { "range": "17.0 to 18", "color": "#99f3ff" },
        { "range": "18.0 to 19", "color": "#99ffff" },
        { "range": "19.0 to 20", "color": "#abfff1" },
        { "range": "20.0 to 21", "color": "#b8ffe5" },
        { "range": "21.0 to 22", "color": "#c7ffd8" },
        { "range": "22.0 to 23", "color": "#d4ffcc" },
        { "range": "23.0 to 24", "color": "#dfffbf" },
        { "range": "24.0 to 25", "color": "#ebffb3" },
        { "range": "25.0 to 26", "color": "#f5ffa6" },
        { "range": "26.0 to 27", "color": "#ffff99" },
        { "range": "27.0 to 28", "color": "#ffef99" },
        { "range": "28.0 to 29", "color": "#ffe699" },
        { "range": "29.0 to 30", "color": "#ffd899" },
        { "range": "30.0 to 31", "color": "#ffca99" },
        { "range": "31.0 to 32", "color": "#ffbe99" },
        { "range": "32.0 to 33", "color": "#ffb199" },
        { "range": "33.0 to 34", "color": "#ffa599" },
        { "range": "34.0 to 35", "color": "#ff9999" }
    ],
    "Monthly evoporation - 01": [
        { "range": "1.49", "color": "#4d2096" },
        { "range": "1.49 to 2", "color": "#8a5ea8" },
        { "range": "2.0 to 3", "color": "#c2a7b4" },
        { "range": "3.0 to 4", "color": "#ffffbf" },
        { "range": "4.0 to 5", "color": "#abd17d" },
        { "range": "5.0 to 6", "color": "#60a642" },
        { "range": "6.0 to 7", "color": "#177a0d" }
    ],

    "Annual Rainfall": [
        { "range": "<1800", "color": "#b6edf0" },
        { "range": "1800-2000", "color": "#a4dcea" },
        { "range": "2000-2200", "color": "#93cfed" },
        { "range": "2200-2400", "color": "#81c0eb" },
        { "range": "2400-2600", "color": "#6db1e8" },
        { "range": "2600-2800", "color": "#5c9fe6" },
        { "range": "2800-3000", "color": "#4695e3" },
        { "range": "3000-3200", "color": "#3089e3" },
        { "range": "3200-3400", "color": "#217bd4" },
        { "range": "3400-3600", "color": "#2170d1" },
        { "range": "3600-3800", "color": "#2259c7" },
        { "range": "3800-4000", "color": "#204abd" },
        { "range": "4000-4200", "color": "#1c3aba" },
        { "range": "4200-4400", "color": "#172a9f" },
        { "range": "4400-4600", "color": "#131c9c" },
        { "range": "4600-4800", "color": "#09092d" }
    ],
    'DEM': [
        { "range": "<200", "color": "#aff0e9" },
        { "range": "200-300", "color": "#b1f2c7" },
        { "range": "300-400", "color": "#c1f7b2" },
        { "range": "400-500", "color": "#edfcb3" },
        { "range": "500-600", "color": "#d2e887" },
        { "range": "600-700", "color": "#75c44d" },
        { "range": "700-800", "color": "#1c9e2c" },
        { "range": "800-900", "color": "#16c83f" },
        { "range": "900-1000", "color": "#649434" },
        { "range": "1000-1100", "color": "#a6a628" },
        { "range": "1100-1200", "color": "#e8b613" },
        { "range": "1200-1300", "color": "#e38302" },
        { "range": "1300-1400", "color": "#bd4602" },
        { "range": "1400-1500", "color": "#992402" },
        { "range": "1500-1600", "color": "#780a02" },
        { "range": "1600-1700", "color": "#731c06" },
        { "range": "1700-1800", "color": "#6e2509" },
        { "range": "1800-1900", "color": "#690c0c" },
        { "range": "1900-2000", "color": "#7d4a2a" },
        { "range": "2000-2100", "color": "#914d56" },
        { "range": "2100-2200", "color": "#a39589" },
        { "range": "2200-2300", "color": "#b3b3b3" },
        { "range": "2300-2400", "color": "#cccccc" },
        { "range": "2400-2500", "color": "#e3e1e3" },
        { "range": ">2500", "color": "#fffcff" }
    ],
    'Soil erosion hazard': [
        { "range": "Very Low", "color": "#FFFFBF" },
        { "range": "Low", "color": "#FFD469" },
        { "range": "Moderate", "color": "#FFAA00" },
        { "range": "High", "color": "#B55400" },
        { "range": "Very High", "color": "#730000" }
    ],

    'Slope': [
        { "range": "0-2", "color": "#10f500" },
        { "range": "2-5", "color": "#80f700" },
        { "range": "5-10", "color": "#d2f700" },
        { "range": "10-20", "color": "#facc00" },
        { "range": "20-45", "color": "#fc7600" },
        { "range": ">45", "color": "#f50000" }
    ],

    // 'Monthly NDVI -01': [
    //     { 'range': '-1.0 to -0.2', 'color': '#00008b' },  // Dark blue for very low NDVI
    //     { 'range': '-0.2 to 0.0', 'color': '#8b4513' },   // Saddle brown for low NDVI
    //     { 'range': '0.0 to 0.2', 'color': '#ffff66' },    // Light yellow for moderate NDVI
    //     { 'range': '0.2 to 0.4', 'color': '#adff2f' },    // Green-yellow for higher NDVI
    //     { 'range': '0.4 to 0.6', 'color': '#90ee90' },    // Light green for high NDVI
    //     { 'range': '0.6 to 1.0', 'color': '#006400' }     // Dark green for very high NDVI
    // ],
    // 'Monthly NDVI -12': [
    //     { 'range': '-1.0 to -0.2', 'color': '#00008b' },  // Dark blue for very low NDVI
    //     { 'range': '-0.2 to 0.0', 'color': '#8b4513' },   // Saddle brown for low NDVI
    //     { 'range': '0.0 to 0.2', 'color': '#ffff66' },    // Light yellow for moderate NDVI
    //     { 'range': '0.2 to 0.4', 'color': '#adff2f' },    // Green-yellow for higher NDVI
    //     { 'range': '0.4 to 0.6', 'color': '#90ee90' },    // Light green for high NDVI
    //     { 'range': '0.6 to 1.0', 'color': '#006400' }     // Dark green for very high NDVI
    // ]
};

// Reuse the defined monthly rainfall legend for the remaining rainfall rasters.
// The repository exposes RF_2.png ... RF_12.png, but does not include separate
// month-specific legend metadata alongside those images.
for (let month = 2; month <= 12; month += 1) {
    const monthKey = `Monthly Rainfall - ${String(month).padStart(2, '0')}`;
    if (!colorRanges[monthKey]) {
        colorRanges[monthKey] = colorRanges["Monthly Rainfall - 01"].map((entry) => ({ ...entry }));
    }
}

const monthlyTemperatureMaxLegend = [
    { range: '< 11', color: '#999bff' },
    { range: '11 - 12', color: '#99a5ff' },
    { range: '12 - 13', color: '#9cb3ff' },
    { range: '13 - 14', color: '#9cbeff' },
    { range: '14 - 15', color: '#9cdcff' },
    { range: '15 - 16', color: '#9cd9ff' },
    { range: '16 - 17', color: '#9ce6ff' },
    { range: '17 - 18', color: '#99f3ff' },
    { range: '18 - 19', color: '#99ffff' },
    { range: '19 - 20', color: '#abfff1' },
    { range: '20 - 21', color: '#b8ffe5' },
    { range: '21 - 22', color: '#c7ffd8' },
    { range: '22 - 23', color: '#d4ffcc' },
    { range: '23 - 24', color: '#dfffbf' },
    { range: '24 - 25', color: '#ebffb3' },
    { range: '25 - 26', color: '#f5ffa6' },
    { range: '26 - 27', color: '#ffff99' },
    { range: '27 - 28', color: '#ffef99' },
    { range: '28 - 29', color: '#ffe699' },
    { range: '29 - 30', color: '#ffd899' },
    { range: '30 - 31', color: '#ffca99' },
    { range: '31 - 32', color: '#ffbe99' },
    { range: '32 - 33', color: '#ffb199' },
    { range: '33 - 34', color: '#ffa599' },
    { range: '> 34', color: '#ff9999' }
];

for (let month = 1; month <= 12; month += 1) {
    const monthLabel = String(month).padStart(2, '0');
    colorRanges[`Monthly  Temporature - Max- ${monthLabel}`] = monthlyTemperatureMaxLegend.map((entry) => ({ ...entry }));
    colorRanges[`Monthly  Temporature - Max-${monthLabel}`] = monthlyTemperatureMaxLegend.map((entry) => ({ ...entry }));
    colorRanges[`Monthly  Temperature - Max-${monthLabel}`] = monthlyTemperatureMaxLegend.map((entry) => ({ ...entry }));
    colorRanges[`Monthly  Temporature - Min- ${monthLabel}`] = monthlyTemperatureMaxLegend.map((entry) => ({ ...entry }));
    colorRanges[`Monthly  Temporature - Min-${monthLabel}`] = monthlyTemperatureMaxLegend.map((entry) => ({ ...entry }));
    colorRanges[`Monthly  Temperature - Min-${monthLabel}`] = monthlyTemperatureMaxLegend.map((entry) => ({ ...entry }));
    colorRanges[`Monthly evoporation - ${monthLabel}`] = colorRanges["Monthly evoporation - 01"].map((entry) => ({ ...entry }));
}
