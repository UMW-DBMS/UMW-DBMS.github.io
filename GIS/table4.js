// Get the select element
const selectElement = document.getElementById('selectMWSID');
let allData = [];
let currentMwsID = '';

const CSV_FIELD_KEYS = {
    mws: ['MWS', 'MWS_ID', 'mws', 'mws_id'],
    database: ['Database', 'database', 'DB', 'db'],
    layer: ['Layer', 'layer'],
    provider: ['Provider', 'provider'],
    download: ['Download-SHP', 'Download', 'download', 'geojson', 'GeoJSON', 'Download_URL', 'download_url', 'File', 'file']
};

function getField(row, keys) {
    if (!row || typeof row !== 'object') return '';
    for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(row, key) && row[key] !== undefined && row[key] !== null) {
            return String(row[key]).trim();
        }
    }
    return '';
}

// Fallback: scan all fields in a CSV row to find a URL-like value
function findUrlInRow(row) {
    if (!row || typeof row !== 'object') return '';
    const urlPatterns = [/https?:\/\//i, /\.geojson$/i, /\.zip$/i, /\.shp$/i, /raw\.githubusercontent/i];
    for (const val of Object.values(row)) {
        if (typeof val !== 'string') continue;
        const s = val.trim();
        if (!s) continue;
        for (const p of urlPatterns) {
            if (p.test(s)) return s;
        }
    }
    return '';
}

function fetchCsvFile(filePath) {
    return fetch(filePath)
        .then(response => {
            if (!response.ok) {
                console.warn(`CSV file not available: ${filePath} (${response.status})`);
                return '';
            }
            return response.text();
        })
        .then(csvText => {
            if (!csvText) return [];
            return new Promise(resolve => {
                Papa.parse(csvText, {
                    header: true,
                    skipEmptyLines: true,
                    complete: function (results) {
                        resolve(results.data || []);
                    },
                    error: function (err) {
                        console.warn('PapaParse error for', filePath, err);
                        resolve([]);
                    }
                });
            });
        })
        .catch(error => {
            console.warn(`Error fetching or parsing CSV file ${filePath}:`, error);
            return [];
        });
}

function clearCatalogDisplay() {
    allData = [];
    displayData([]);
    updateDropdownOptions([]);
}

function loadDataCatalogForMwsID(mwsID) {
    const normalizedMwsID = String(mwsID || '').replace(/-/g, '_').trim();
    if (!normalizedMwsID) {
        clearCatalogDisplay();
        currentMwsID = '';
        return;
    }

    if (normalizedMwsID === currentMwsID && allData.length) {
        return;
    }

    currentMwsID = normalizedMwsID;
    const csvFilePaths = [
        `https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Data/EXD/MWS_${normalizedMwsID}/AllDataLayer_${normalizedMwsID}.csv`,
        `https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Data/EXD/MWS_${normalizedMwsID}/PropLayers_${normalizedMwsID}.csv`,
        `https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Data/Proposal/MWS_${normalizedMwsID}/MWS_${normalizedMwsID}_table.csv`
    ];

    Promise.allSettled(csvFilePaths.map(fetchCsvFile))
        .then(results => {
            const parsedResults = results
                .filter(result => result.status === 'fulfilled')
                .map(result => result.value || [])
                .flat();

            allData = parsedResults.filter(Boolean);
            displayData(allData);
            updateDropdownOptions(allData);
        })
        .catch(error => {
            console.error('Error fetching or parsing CSV files:', error);
            clearCatalogDisplay();
        });
}

function loadDataCatalogForCurrentMwsID() {
    if (!selectElement) {
        console.error('Data Catalog MWS dropdown not found: selectMWSID');
        return;
    }
    loadDataCatalogForMwsID(selectElement.value);
}

window.loadDataCatalogForCurrentMwsID = loadDataCatalogForCurrentMwsID;

if (selectElement) {
    selectElement.addEventListener('change', function () {
        loadDataCatalogForMwsID(this.value);
    });
} else {
    console.error('Data Catalog MWS dropdown not found: selectMWSID');
}

// Function to populate dropdowns with unique values from the entire dataset
function updateDropdownOptions(data) {
    updateDropdownWithSelected('filterID', getUniqueValues(data, CSV_FIELD_KEYS.mws));
    updateDropdownWithSelected('filterDatabase', getUniqueValues(data, CSV_FIELD_KEYS.database));
    updateDropdownWithSelected('filterLayer', getUniqueValues(data, CSV_FIELD_KEYS.layer));
    updateDropdownWithSelected('filterProvider', getUniqueValues(data, CSV_FIELD_KEYS.provider));
}

// Helper function to get unique values from a column
function getUniqueValues(data, keys) {
    return Array.from(new Set(data.map(row => getField(row, keys)).filter(Boolean)));
}

// Helper function to populate a dropdown and retain the selected value
function updateDropdownWithSelected(dropdownID, values) {
    const dropdown = document.getElementById(dropdownID);
    if (!dropdown) return;

    const selectedValue = dropdown.value; // Store the currently selected value
    dropdown.innerHTML = ''; // Clear existing options

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Any';
    dropdown.appendChild(defaultOption);

    values.forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        dropdown.appendChild(option);
    });

    dropdown.value = values.includes(selectedValue) ? selectedValue : '';
}

// Function to display the CSV data in the table
function displayData(data) {
    const tableBody = document.querySelector('#csvTable tbody');
    if (!tableBody) return;
    tableBody.innerHTML = ''; // Clear the table body

    data.forEach(row => {
        const tr = document.createElement('tr');
        const colsToShow = [
            getField(row, CSV_FIELD_KEYS.mws),
            getField(row, CSV_FIELD_KEYS.database),
            getField(row, CSV_FIELD_KEYS.layer),
            getField(row, CSV_FIELD_KEYS.provider)
        ];

        colsToShow.forEach(col => {
            const td = document.createElement('td');
            td.textContent = col;
            tr.appendChild(td);
        });

        const td = document.createElement('td');
        const button = document.createElement('button');
        let url = getField(row, CSV_FIELD_KEYS.download);
        if (!url) url = findUrlInRow(row);
        if (!url) {
            button.textContent = 'Not available';
            button.disabled = true;
            button.classList.add('disabled');
        } else {
            button.textContent = 'Download';
            button.addEventListener('click', async () => {
                function toRawGitHubUrl(u) {
                    try {
                        const gh = u.match(/https?:\/\/github.com\/(.+?)\/blob\/(.+)/);
                        if (gh) {
                            return `https://raw.githubusercontent.com/${gh[1]}/${gh[2]}`;
                        }
                    } catch (e) { }
                    return u;
                }

                async function tryFetchAndDownload(u) {
                    const resp = await fetch(u, { mode: 'cors' });
                    if (!resp.ok) throw new Error(`Network response was not ok (${resp.status})`);
                    const ct = resp.headers.get('content-type') || '';
                    if (ct.includes('text/html')) throw new Error('Received HTML response instead of file');
                    const blob = await resp.blob();
                    const objectUrl = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = objectUrl;
                    a.download = (u.split('/').pop() || 'download').split('?')[0];
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
                }

                try {
                    await tryFetchAndDownload(url);
                } catch (err) {
                    console.warn('Initial fetch/download failed:', err);
                    const raw = toRawGitHubUrl(url);
                    if (raw !== url) {
                        try {
                            await tryFetchAndDownload(raw);
                            return;
                        } catch (err2) {
                            console.warn('Retry with raw.githubusercontent.com failed:', err2);
                        }
                    }

                    const userChoice = confirm('Automatic download failed (CORS or sandboxed frame).\nClick OK to open the file URL in a new tab, or Cancel to copy the URL to clipboard.');
                    if (userChoice) {
                        try { window.open(url, '_blank', 'noopener'); }
                        catch (e) { console.error('Could not open new tab:', e); alert('Unable to open new tab. URL:\n' + url); }
                    } else {
                        try {
                            await navigator.clipboard.writeText(url);
                            alert('Download URL copied to clipboard. Paste it in your browser address bar to open.');
                        } catch (e) {
                            alert('Could not copy to clipboard. Please copy this URL manually:\n' + url);
                        }
                    }
                }
            });
        }
        td.appendChild(button);
        tr.appendChild(td);
        tableBody.appendChild(tr);
    });
}

// Filter the table and update dropdown options based on remaining filtered data
function filterTable() {
    const filterID = document.getElementById('filterID').value;
    const filterDatabase = document.getElementById('filterDatabase').value;
    const filterLayer = document.getElementById('filterLayer').value;
    const filterProvider = document.getElementById('filterProvider').value;

    const filteredData = allData.filter(row =>
        (!filterID || getField(row, CSV_FIELD_KEYS.mws) === filterID) &&
        (!filterDatabase || getField(row, CSV_FIELD_KEYS.database) === filterDatabase) &&
        (!filterLayer || getField(row, CSV_FIELD_KEYS.layer) === filterLayer) &&
        (!filterProvider || getField(row, CSV_FIELD_KEYS.provider) === filterProvider)
    );

    displayData(filteredData);
    updateDropdownOptions(filteredData);
}

['filterID', 'filterDatabase', 'filterLayer', 'filterProvider'].forEach(id => {
    const dropdown = document.getElementById(id);
    if (dropdown) dropdown.addEventListener('change', filterTable);
});
