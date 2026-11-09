/**
 * Station data (water quality, rainfall, temperature, evaporation)
 *
 * Purpose : Station-data panel, station markers, water-quality time-series charts and monthly climate charts for the clicked station.
 * Depends : Leaflet, Chart.js, PapaParse, global `map`; hidePanel / updateInfoPanel from other modules (call time).
 * Exposes : renderWaterPanel(), handleWaterSourceChange(), showCSVForStation(name, {agency}), showMonthlyStationChart(), downloadCanvasChart(), waterQualityLayers
 */

let cachedClimateStationMws = '';

let cachedClimateStationUrls = {};

let monthlyRangeBySource = {};

const staticWaterSourceUrls = {
    'CEA': 'https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Data/EXD/12_WQ/CEA_pH.geojson',
    'MASL': 'https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Data/EXD/12_WQ/MASL_pH.geojson',
    'NWSDB': 'https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Data/EXD/12_WQ/NWSDB_pH.geojson',
    'Evaporation': 'https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Data/EXD/10_MET/EV_St/MET_EV_St.geojson',
    'Rainfall': 'https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Data/EXD/10_MET/RF_St/MET_RF_St.geojson',
    'Temperature': 'https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Data/EXD/10_MET/Temp/MET_Temp_St.geojson'
};

// Ensure declaration for waterQualityLayers exists
let waterQualityLayers = {};  // holds current water-quality GeoJSON layers keyed by source

let waterSourceRequestVersion = 0;

function renderWaterPanel() {
    const waterPanel = document.getElementById('waterPanel');
    if (!waterPanel) return;

    waterPanel.innerHTML = '';

    const closeButton = document.createElement('button');
    closeButton.classList.add('hide-btn');
    closeButton.textContent = 'Close';
    closeButton.onclick = function () {
        hidePanel('waterPanel');
    };
    waterPanel.appendChild(closeButton);

    const primaryGroup = document.createElement('div');
    const primaryTitle = document.createElement('h3');
    primaryTitle.textContent = 'Water Quality Stations';
    primaryGroup.appendChild(primaryTitle);

    const primarySources = ['CEA', 'MASL', 'NWSDB'];
    const primarySourceLabels = {
        CEA: 'Central Environment Authority (CEA)',
        MASL: 'Mahaweli Authority of Sri Lanka (MASL)',
        NWSDB: 'National Water Supply and Drainage Board'
    };
    primarySources.forEach((source, index) => {
        const row = document.createElement('div');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.name = 'waterSource';
        checkbox.value = source;
        checkbox.id = `water_source_primary_${index}`;
        checkbox.addEventListener('change', handleWaterSourceChange);

        const label = document.createElement('label');
        label.htmlFor = checkbox.id;
        label.textContent = primarySourceLabels[source];

        row.appendChild(checkbox);
        row.appendChild(label);
        primaryGroup.appendChild(row);
    });
    waterPanel.appendChild(primaryGroup);

    const otherGroup = document.createElement('div');
    otherGroup.style.marginTop = '10px';
    const otherTitle = document.createElement('h3');
    otherTitle.textContent = 'Other Stations';
    otherTitle.style.marginTop = '0';
    otherGroup.appendChild(otherTitle);

    const otherSources = ['Evaporation', 'Rainfall', 'Temperature'];
    otherSources.forEach((source, index) => {
        const row = document.createElement('div');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.name = 'waterSource';
        checkbox.value = source;
        checkbox.id = `water_source_other_${index}`;
        checkbox.addEventListener('change', handleWaterSourceChange);

        const label = document.createElement('label');
        label.htmlFor = checkbox.id;
        label.textContent = source;

        row.appendChild(checkbox);
        row.appendChild(label);
        otherGroup.appendChild(row);
    });
    waterPanel.appendChild(otherGroup);
}

async function getClimateStationUrls() {
    const mwsSelect = document.getElementById('selectMWSID');
    const mwsID = (mwsSelect && mwsSelect.value ? mwsSelect.value : '').replace(/-/g, '_');
    if (!mwsID) return {};

    if (cachedClimateStationMws === mwsID && Object.keys(cachedClimateStationUrls).length) {
        return cachedClimateStationUrls;
    }

    const climateCsvCandidates = [
        `https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Data/EXD/MWS_${mwsID}/ClimLayer.csv`,
        'https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Data/EXD/MWS_003/ClimLayer.csv'
    ];

    let csvText = '';
    for (const url of climateCsvCandidates) {
        try {
            const resp = await fetch(url);
            if (!resp.ok) continue;
            csvText = await resp.text();
            if (csvText) break;
        } catch (err) {
            console.warn('Climate layer CSV fetch failed:', url, err);
        }
    }
    if (!csvText) return {};

    const parsed = Papa.parse(csvText, { header: true });
    const rows = Array.isArray(parsed.data) ? parsed.data : [];
    const nextUrls = {};

    rows.forEach((row) => {
        if (!row) return;
        const layerName = String(row.Layer || '').trim();
        const geojsonUrl = String(row.geojson || '').trim();
        if (!geojsonUrl) return;

        if (layerName === 'Rainfall') nextUrls.Rainfall = geojsonUrl;
        if (layerName === 'Temperature') nextUrls.Temperature = geojsonUrl;
        if (layerName === 'Evaporation' || layerName === 'Evoporation') nextUrls.Evaporation = geojsonUrl;
    });

    cachedClimateStationMws = mwsID;
    cachedClimateStationUrls = nextUrls;
    return nextUrls;
}

async function showCSVForStation(stationName, options = {}) {
    const suppressError = !!options.suppressError;
    const encodedName = encodeURIComponent(stationName.trim());
    const baseCSVPath = 'https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Data/EXD/12_WQ/';//https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/tree/main/IWWRMP/Data/EXD/12_WQ
    const csvUrl = `${baseCSVPath}${encodedName}.csv`;

    try {
        const response = await fetch(csvUrl);
        if (!response.ok) throw new Error('CSV not found');
        const text = await response.text();
        const normalizeCell = (cell) => String(cell ?? '')
            .replace(/^\uFEFF/, '') // strip BOM
            .trim()
            .replace(/^"+|"+$/g, ''); // strip wrapping quotes
        const normalizeKey = (cell) => normalizeCell(cell).toLowerCase();

        const rows = text
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => line.split(',').map(normalizeCell));

        // First column = parameter names
        const paramNames = rows.map(r => r[0]);
        const paramKeys = paramNames.map(normalizeKey);

        // Find the date row
        const dateRowIndex = paramKeys.indexOf("date");
        if (dateRowIndex === -1) {
            alert(`No 'Date' row found in CSV. Found parameters: ${paramNames.join(", ")}`);
            return;
        }
        const labels = rows[dateRowIndex].slice(1).map(normalizeCell);

        // Parse labels as dates
        const monthNames = {
            'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
            'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
        };
        const parsedLabels = labels.map(label => {
            // Try MM/YYYY
            let parts = label.split('/');
            if (parts.length === 2) {
                const month = parseInt(parts[0], 10) - 1;
                const year = parseInt(parts[1], 10);
                if (!isNaN(month) && !isNaN(year)) {
                    return new Date(year, month, 1);
                }
            }
            // Try YYYY-MMM-DD or YYYY-MM-DD
            parts = label.split('-');
            if (parts.length === 3) {
                const year = parseInt(parts[0], 10);
                const monthPart = parts[1];
                const day = parseInt(parts[2], 10);
                let month;
                const monthNum = parseInt(monthPart, 10);
                if (!isNaN(monthNum)) {
                    month = monthNum - 1; // 0-based
                } else {
                    month = monthNames[monthPart];
                }
                if (!isNaN(year) && month !== undefined && !isNaN(day)) {
                    return new Date(year, month, day);
                }
            }
            // Try MMM-YYYY
            parts = label.split('-');
            if (parts.length === 2) {
                const monthStr = parts[0];
                const year = parseInt(parts[1], 10);
                const month = monthNames[monthStr];
                if (month !== undefined && !isNaN(year)) {
                    return new Date(year, month, 1);
                }
            }
            // Fallback
            return new Date(label);
        });

        // Parameters from other rows
        const paramRows = rows.filter((_, i) => i !== dateRowIndex);
        const finalParamNames = paramRows.map(r => r[0]);
        const finalParamKeys = finalParamNames.map(normalizeKey);

        // Parameters to plot
        const nwsdbStations = new Set([
            "Ambuluwawa_Intake", "Balagolla", "Dail Watta", "Datry watta", "Delta Estate", "Elpitiya", "Great Western", "Marassana", "Meewathura", "Pundalu oya", "Rikillagaskada", "Riverina watta", "Meewathura_University", "Arattana", "Haragama", "Hynford", "Nillambe", "Polgolla Intake", "Ragala", "Rangala", "Shakthi Janapadaya", "Walapane"
        ]);
        // The agency of the clicked layer is authoritative; the name checks are only a fallback.
        const agency = String(options.agency || '').toUpperCase();
        const isCEA = agency ? agency === 'CEA' : stationName.toUpperCase().startsWith('MR ');
        const isNWSDB = agency ? agency === 'NWSDB' : nwsdbStations.has(stationName);
        const params = isCEA ? [
            "BOD",
            "Chlorine",
            "COD",
            "Dissolved O2",
            "Electrical Conductivity",
            "Hardness",
            "Nitrate (mg/l)",
            "pH",
            "Phosphate",
            "Temperature (Celsius)",
            "Turbidity (NTU)"
        ] : isNWSDB ? [
            "Alkalinity (mg/l)",
            "Color (Hazen)",
            "E Coli",
            "Hardness (mg/l)",
            "Iron (mg/l)",
            "Nitrate (mg/l)",
            "pH",
            "Total Coliform",
            "Turbidity (NTU)"
        ] : [
            "Dissolved O2 (mg/l)",
            "Electircal Conductivity (μs)",
            "Total dissolved solids (mg/l)",
            "pH",
            "Temperature (oC)",
            "Turbidity (NTU)"
        ];

        // Show panel (no CSV table, only chart + buttons)
        const panel = document.getElementById('waterQualityStationPanel');
        setStationPanelSize(panel, true);
        panel.innerHTML = `
            <strong>Station:</strong> ${stationName}<br><br>
            <div id="paramButtons"></div>
            <div style="position:relative;width:100%;height:320px;">
                <canvas id="csvChart" style="width:100%; height:100%;"></canvas>
            </div>
            <br>
            <button id="downloadCsvChartBtn" class="button" type="button">Download Chart</button>
            <br><br>
            <button class="hide-btn" onclick="hidePanel('waterQualityStationPanel')">Close</button>
        `;
        const downloadCsvBtn = document.getElementById('downloadCsvChartBtn');
        if (downloadCsvBtn) {
            downloadCsvBtn.onclick = () => downloadCanvasChart('csvChart', `${stationName}_water_quality_chart`);
        }

        // Create parameter buttons
        const btnContainer = document.getElementById("paramButtons");
        params.forEach(param => {
            const btn = document.createElement("button");
            btn.textContent = param;
            btn.style.margin = "5px";
            btn.style.padding = "6px 10px";
            btn.style.cursor = "pointer";
            btn.onclick = () => drawChart(param);
            btnContainer.appendChild(btn);
        });
        if (params.length) {
            drawChart(params[0]);
        }

        // Draw chart for selected parameter
        function drawChart(param) {
            const rowIndex = finalParamKeys.indexOf(normalizeKey(param));
            if (rowIndex === -1) {
                alert(`Row '${param}' not found in CSV. Found rows: ${finalParamNames.join(", ")}`);
                return;
            }

            const actualRowIndex = rowIndex < dateRowIndex ? rowIndex : rowIndex + 1;
            const values = rows[actualRowIndex].slice(1).map(v =>
                v === "n/a" || v === "*" || v === "" ? null : parseFloat(v)
            );

            const ctx = document.getElementById('csvChart').getContext('2d');

            // ✅ Clear previous chart before drawing new one
            if (window.csvChartInstance) {
                window.csvChartInstance.destroy();
            }

            const formattedLabels = parsedLabels.map(d => {
                if (d instanceof Date && !isNaN(d)) {
                    return d.toISOString().slice(0, 10);
                }
                return String(d);
            });

            window.csvChartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: formattedLabels,
                    datasets: [{
                        label: param,
                        data: values,
                        borderColor: 'rgba(75, 192, 192, 1)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        fill: true,
                        spanGaps: true,
                        tension: 0.3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: `${param} over time for ${stationName}`
                        }
                    },
                    scales: {
                        x: {
                            title: { display: true, text: "Date" },
                            ticks: { maxRotation: 45, minRotation: 45 }
                        },
                        y: { title: { display: true, text: param } }
                    }
                }
            });
            if (window.csvChartInstance && typeof window.csvChartInstance.resize === 'function') {
                window.csvChartInstance.resize();
            }
        }

        return true;
    } catch (err) {
        const panel = document.getElementById('waterQualityStationPanel');
        if (panel) {
            setStationPanelSize(panel, true);
            panel.innerHTML = `
                <strong>Station:</strong> ${stationName || 'Unknown'}<br><br>
                <div style="font-weight:bold;color:#aa0000;">DATA IS NOT AVAILABLE</div>
                <br>
                <button class="hide-btn" onclick="hidePanel('waterQualityStationPanel')">Close</button>
            `;
        }
        if (!suppressError) console.warn(`CSV file not found for station: ${stationName}`, err);
        return false;
    }
}

function normalizeMonthKey(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parseNumericValue(value) {
    if (value === null || value === undefined) return null;
    const cleaned = String(value).trim().replace(/,/g, '');
    if (!cleaned || cleaned === '*' || cleaned.toLowerCase() === 'n/a') return null;
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : null;
}

function extractMonthlyValuesFromProperties(properties) {
    const props = properties || {};
    const monthDefs = [
        { label: 'January', aliases: ['january', 'jan'] },
        { label: 'February', aliases: ['february', 'feb'] },
        { label: 'March', aliases: ['march', 'mar'] },
        { label: 'April', aliases: ['april', 'apr'] },
        { label: 'May', aliases: ['may'] },
        { label: 'June', aliases: ['june', 'jun'] },
        { label: 'July', aliases: ['july', 'jul'] },
        { label: 'August', aliases: ['august', 'aug'] },
        { label: 'September', aliases: ['september', 'sep', 'sept'] },
        { label: 'October', aliases: ['october', 'oct'] },
        { label: 'November', aliases: ['november', 'nov'] },
        { label: 'December', aliases: ['december', 'dec'] }
    ];

    const entries = Object.entries(props).map(([key, value]) => ({
        normalizedKey: normalizeMonthKey(key),
        value: parseNumericValue(value)
    }));

    const labels = monthDefs.map((m) => m.label);
    const values = monthDefs.map((month) => {
        const aliases = month.aliases.map(normalizeMonthKey);
        const matched = entries.find((entry) => {
            if (entry.value === null) return false;
            return aliases.some((alias) =>
                entry.normalizedKey === alias ||
                entry.normalizedKey.startsWith(alias) ||
                entry.normalizedKey.endsWith(alias)
            );
        });
        return matched ? matched.value : null;
    });

    const hasAnyValue = values.some((v) => v !== null);
    return hasAnyValue ? { labels, values } : null;
}

function sanitizeFileName(value) {
    return String(value || 'chart')
        .replace(/[\\/:*?"<>|]+/g, '_')
        .replace(/\s+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');
}

function downloadCanvasChart(canvasId, fileNamePrefix) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        alert('Chart is not available for download.');
        return;
    }
    const link = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    link.href = canvas.toDataURL('image/png');
    link.download = `${sanitizeFileName(fileNamePrefix)}_${stamp}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function setStationPanelSize(panel, maximize) {
    if (!panel) return;
    // Position and size come from css/dashboard.css (#waterQualityStationPanel).
    panel.dataset.maximized = maximize ? '1' : '0';
    panel.style.display = 'block';
}

function wireStationPanelSizeToggle(panel, canvasId) {
    if (!panel) return;
    const btn = panel.querySelector('.panel-size-toggle');
    if (!btn) return;
    btn.addEventListener('click', function () {
        const nextMaximized = panel.dataset.maximized !== '1';
        setStationPanelSize(panel, nextMaximized);
        btn.textContent = nextMaximized ? 'Restore' : 'Maximize';
        const canvas = document.getElementById(canvasId);
        if (canvas) {
            canvas.style.height = nextMaximized ? '110px' : '110px';
        }
    });
}

function showMonthlyStationChart(properties, sourceName, stationName) {
    const monthly = extractMonthlyValuesFromProperties(properties);
    if (!monthly) return false;

    const panel = document.getElementById('waterQualityStationPanel');
    if (!panel) return false;

    const sourceUnits = {
        Evaporation: 'mm',
        Rainfall: 'mm',
        Temperature: '°C'
    };
    const unit = sourceUnits[sourceName] || '';
    const titleName = stationName || 'Station';
    const stationNumericValues = monthly.values.filter((v) => typeof v === 'number' && Number.isFinite(v));
    if (!stationNumericValues.length) return false;
    const fixedYAxisBySource = {
        Rainfall: { min: 0, max: 780, step: 60, decimals: 0 },
        Evaporation: { min: 0, max: 8, step: 0.5, decimals: 2 },
        Temperature: { min: 0, max: 35, step: 1, decimals: 1 }
    };

    const selectedRange = fixedYAxisBySource[sourceName] || null;
    let yMin;
    let yMax;
    let tickStep;
    let tickDecimals;

    if (selectedRange) {
        yMin = selectedRange.min;
        yMax = selectedRange.max;
        tickStep = selectedRange.step;
        tickDecimals = selectedRange.decimals;
    } else {
        let rawMin = Math.min(...stationNumericValues);
        let rawMax = Math.max(...stationNumericValues);
        if (!Number.isFinite(rawMin) || !Number.isFinite(rawMax)) return false;
        if (rawMin === rawMax) {
            rawMin -= 0.05;
            rawMax += 0.05;
        }
        const rangePadding = Math.max(0.05, (rawMax - rawMin) * 0.03);
        yMin = rawMin - rangePadding;
        yMax = rawMax + rangePadding;
        const yRange = yMax - yMin;
        tickStep = yRange <= 1 ? 0.1 : (yRange <= 3 ? 0.2 : (yRange <= 8 ? 0.5 : 1));
        tickDecimals = yRange <= 3 ? 2 : 1;
    }

    setStationPanelSize(panel, true);
    panel.innerHTML = `
        <strong>Station:</strong> ${titleName}<br>
        <strong>Type:</strong> ${sourceName}<br><br>
        <div style="position:relative;width:100%;height:320px;">
            <canvas id="monthlyStationChart"></canvas>
        </div>
        <div id="monthlyPointValue" style="margin-top:8px;font-size:12px;color:#1d1d1d;">Click a point to view the value.</div>
        <br>
        <button id="downloadMonthlyChartBtn" class="button" type="button">Download Chart</button>
        <br><br>
        <button class="hide-btn" onclick="hidePanel('waterQualityStationPanel')">Close</button>
    `;
    const downloadMonthlyBtn = document.getElementById('downloadMonthlyChartBtn');
    if (downloadMonthlyBtn) {
        downloadMonthlyBtn.onclick = () => downloadCanvasChart('monthlyStationChart', `${titleName}_${sourceName}_chart`);
    }

    const canvas = document.getElementById('monthlyStationChart');
    if (!canvas) return false;
    const ctx = canvas.getContext('2d');
    const pointValue = document.getElementById('monthlyPointValue');

    if (window.monthlyStationChartInstance) {
        window.monthlyStationChartInstance.destroy();
    }

    window.monthlyStationChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: monthly.labels,
            datasets: [{
                label: `${sourceName} (${unit || 'value'})`,
                data: monthly.values,
                borderColor: 'rgba(33, 150, 243, 1)',
                backgroundColor: 'rgba(33, 150, 243, 0.18)',
                borderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
                spanGaps: true,
                tension: 0.2,
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'nearest',
                intersect: true
            },
            onClick: function (event, elements) {
                if (!elements || !elements.length || !pointValue) return;
                const first = elements[0];
                const month = monthly.labels[first.index];
                const value = monthly.values[first.index];
                const displayValue = value === null ? 'No data' : Number(value).toFixed(tickDecimals);
                pointValue.textContent = `${month}: ${displayValue}${value === null ? '' : (unit ? ' ' + unit : '')}`;
            },
            plugins: {
                title: {
                    display: true,
                    text: `${sourceName} by month (January to December) - ${titleName}`
                }
            },
            scales: {
                x: { title: { display: true, text: 'Month' } },
                y: {
                    min: yMin,
                    max: yMax,
                    title: { display: true, text: unit ? `${sourceName} (${unit})` : sourceName },
                    ticks: {
                        stepSize: tickStep,
                        callback: function (value) {
                            return Number(value).toFixed(tickDecimals);
                        }
                    },
                    grid: {
                        color: 'rgba(0,0,0,0.08)',
                        borderDash: [3, 3]
                    }
                }
            }
        }
    });

    return true;
}

// Handle water source checkbox changes: load/unload multiple GeoJSON layers
async function handleWaterSourceChange() {
    const requestVersion = ++waterSourceRequestVersion;
    const checkboxes = Array.from(document.querySelectorAll('input[name="waterSource"]'));
    if (!checkboxes.length) return;
    const climateStationUrls = await getClimateStationUrls();
    if (requestVersion !== waterSourceRequestVersion) return;
    // Keep fixed station URLs authoritative; climate CSV URLs are only a fallback.
    const urls = { ...climateStationUrls, ...staticWaterSourceUrls };

    // One marker per source (shape, colour and symbol: see symbology.js)
    const icons = {
        'CEA': Symbology.markerIcon('wq-cea'),
        'MASL': Symbology.markerIcon('wq-masl'),
        'NWSDB': Symbology.markerIcon('wq-nwsdb'),
        'Rainfall': Symbology.markerIcon('rainfall'),
        'Temperature': Symbology.markerIcon('temperature'),
        'Evaporation': Symbology.markerIcon('evaporation')
    };

    // Determine checked sources
    const selected = checkboxes.filter(cb => cb.checked).map(cb => cb.value);
    const selectedSet = new Set(selected);

    // Add newly checked layers
    for (const src of selected) {
        if (requestVersion !== waterSourceRequestVersion) return;
        if (waterQualityLayers[src]) continue; // already loaded
        const url = urls[src];
        if (!url) {
            console.warn(`No GeoJSON URL configured for ${src}`);
            continue;
        }
        try {
            const resp = await fetch(url);
            if (!resp.ok) throw new Error(`Network response was not ok (${resp.status})`);
            const geojsonData = await resp.json();
            if (requestVersion !== waterSourceRequestVersion || !selectedSet.has(src)) {
                continue;
            }
            const numericValues = [];
            if (geojsonData && Array.isArray(geojsonData.features)) {
                geojsonData.features.forEach((feature) => {
                    const monthly = extractMonthlyValuesFromProperties(feature && feature.properties ? feature.properties : {});
                    if (!monthly || !Array.isArray(monthly.values)) return;
                    monthly.values.forEach((v) => {
                        if (typeof v === 'number' && Number.isFinite(v)) numericValues.push(v);
                    });
                });
            }
            if (numericValues.length) {
                monthlyRangeBySource[src] = {
                    min: Math.min(...numericValues),
                    max: Math.max(...numericValues)
                };
            }
            const layer = L.geoJSON(geojsonData, {
                pointToLayer: function (feature, latlng) {
                    return L.marker(latlng, { icon: icons[src] });
                },
                onEachFeature: function (feature, layer) {
                    if (!feature || !feature.properties) return;
                    const props = feature.properties || {};
                    const stationName = src === 'NWSDB' ? (props['Location o'] || '') : (
                        props.station_na ||
                        props.station_NA ||
                        props.STATION_NA ||
                        props.Station_Na ||
                        props.Name ||
                        props.NAME ||
                        props.station ||
                        props.STATION ||
                        props.Station ||
                        props.St_Name ||
                        props.st_name ||
                        ''
                    );
                    layer.on('click', async function () {
                        const clickLatLng = (layer && layer.getLatLng) ? layer.getLatLng() : null;
                        if (typeof window.handleMeasurePointFromLayer === 'function' && window.handleMeasurePointFromLayer(clickLatLng)) {
                            return;
                        }
                        if (typeof window.showClickCoordinates === 'function') {
                            window.showClickCoordinates(clickLatLng);
                        }
                        if (src === 'CEA' || src === 'MASL' || src === 'NWSDB') {
                            if (stationName) showCSVForStation(stationName, { agency: src });
                            else alert("No station name found in attributes.");
                            return;
                        }
                        if (src === 'Evaporation' || src === 'Rainfall' || src === 'Temperature') {
                            const rendered = showMonthlyStationChart(props, src, stationName);
                            if (!rendered) {
                                if (typeof updateInfoPanel === 'function') updateInfoPanel(props, src, layer);
                                else alert("No monthly data found in station attributes.");
                            }
                            return;
                        }
                        if (typeof updateInfoPanel === 'function') {
                            updateInfoPanel(props, src, layer);
                        } else if (stationName) {
                            showCSVForStation(stationName);
                        } else {
                            alert("No station data found in attributes.");
                        }
                    });
                }

            }).addTo(map);
            if (requestVersion === waterSourceRequestVersion && selectedSet.has(src)) {
                waterQualityLayers[src] = layer;
            } else {
                try { map.removeLayer(layer); } catch (e) { /* ignore */ }
            }
        } catch (err) {
            console.error('Failed to load water quality GeoJSON for', src, err);
        }
    }

    // Remove unchecked layers
    for (const src of Object.keys(waterQualityLayers)) {
        if (!selectedSet.has(src)) {
            try {
                map.removeLayer(waterQualityLayers[src]);
            } catch (e) { /* ignore */ }
            delete waterQualityLayers[src];
        }
    }

    // Fit bounds to all loaded layers, if any
    const loadedLayers = Object.values(waterQualityLayers);
    if (loadedLayers.length) {
        try {
            const group = L.featureGroup(loadedLayers);
            const bounds = group.getBounds();
            if (bounds && bounds.isValid && bounds.isValid()) map.fitBounds(bounds);
            else if (bounds && !bounds.isValid && Object.keys(bounds).length) map.fitBounds(bounds);
        } catch (err) {
            console.warn('Could not fit bounds to water quality layers:', err);
        }
    }
}

document.addEventListener('DOMContentLoaded', function () {
    renderWaterPanel();
});
