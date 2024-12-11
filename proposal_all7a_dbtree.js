const tablePanel = document.getElementById('tablePanel');
const mwsDropdown = document.getElementById('selectMWSID'); // Dropdown for selecting MWS_ID
let csvData = [];
let currentPages = 1;
const rowsPerPages = 20;

// Function to reset UI to default
function resetToDefault() {
    // Clear the table panel
    tablePanel.innerHTML = '';

        const staticContent = `
            Data Table
            <button class="hide-btn" onclick="hidePanel('tablePanel')">Close</button>
        `;
        tablePanel.innerHTML = staticContent;
    // Reset page count
    currentPages = 1;

    // Clear any existing download buttons
    const existingDownloadButton = document.querySelector('button[download]');
    if (existingDownloadButton) {
        existingDownloadButton.remove();
    }

    // Optionally reset other UI components or state variables
    const anotherDropdown = document.getElementById('anotherDropdown'); // Example
    if (anotherDropdown) {
        anotherDropdown.value = ''; // Reset dropdown to default
    }
}

// Event listener for MWS_ID selection
mwsDropdown.addEventListener('change', function(event) {
    const selectedMwsID = event.target.value;
    const processedMwsID = selectedMwsID.replace(/-/g, '_'); // Process the selected MWS_ID
    const csvUrl = `https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Data/Proposal/MWS_${processedMwsID}/MWS_${processedMwsID}_table.csv`;

    // Reset everything to default first
    resetToDefault();

    // Load new data only if a valid MWS_ID is selected
    if (processedMwsID) {
        fetchAndLoadMainCsv(csvUrl);
    } else {
        tablePanel.innerHTML = '<p>Please select a valid MWS ID.</p>';
    }
});


// Fetch the main CSV file based on the processed mwsID
function fetchAndLoadMainCsv(csvUrl) {
    fetch(csvUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch CSV: ${response.statusText}`);
            }
            return response.text();
        })
        .then(csvText => {
            const parsedData = Papa.parse(csvText, { header: true });
            csvData = parsedData.data;
            renderDropdown(csvData); // Render the Description dropdown menu
        })
        .catch(() => {
            tablePanel.innerHTML = `<p style="color: red;">Error loading main CSV.</p>`;
        });
}

// Render the dropdown with unique values from the "Description" column
// Render dropdowns for "Database" and "Layer"
function renderDropdown(data) {
    if (!data || data.length === 0) {
        tablePanel.innerHTML = `<p>No data available in the CSV file.</p>`;
        return;
    }

    // Extract unique values from "Database" column
    const databaseColumn = data.map(row => row["Database"]).filter(Boolean);
    const uniqueDatabases = [...new Set(databaseColumn)];

    // Create Database dropdown
    const databaseDropdown = document.createElement('select');
    databaseDropdown.id = 'databaseDropdown';

    const defaultDatabaseOption = document.createElement('option');
    defaultDatabaseOption.value = '';
    defaultDatabaseOption.textContent = '-- Select a Database --';
    databaseDropdown.appendChild(defaultDatabaseOption);

    uniqueDatabases.forEach(database => {
        const option = document.createElement('option');
        option.value = database;
        option.textContent = database;
        databaseDropdown.appendChild(option);
    });

    // Create Layer dropdown
    const layerDropdown = document.createElement('select');
    layerDropdown.id = 'layerDropdown';
    layerDropdown.disabled = true;

    const defaultLayerOption = document.createElement('option');
    defaultLayerOption.value = '';
    defaultLayerOption.textContent = '-- Select a Layer --';
    layerDropdown.appendChild(defaultLayerOption);

    // Event listener for Database dropdown
    databaseDropdown.addEventListener('change', () => {
        const selectedDatabase = databaseDropdown.value;

        if (selectedDatabase) {
            // Filter rows based on selected Database and extract unique "Layer" values
            const filteredData = data.filter(row => row["Database"] === selectedDatabase);
            const layerColumn = filteredData.map(row => row["Layer"]).filter(Boolean);
            const uniqueLayers = [...new Set(layerColumn)];

            // Populate Layer dropdown
            layerDropdown.innerHTML = ''; // Clear existing options
            const defaultLayerOption = document.createElement('option');
            defaultLayerOption.value = '';
            defaultLayerOption.textContent = '-- Select a Layer --';
            layerDropdown.appendChild(defaultLayerOption);

            uniqueLayers.forEach(layer => {
                const option = document.createElement('option');
                option.value = layer;
                option.textContent = layer;
                layerDropdown.appendChild(option);
            });

            layerDropdown.disabled = false; // Enable Layer dropdown
        } else {
            layerDropdown.disabled = true; // Disable Layer dropdown if no Database selected
            layerDropdown.innerHTML = ''; // Clear Layer dropdown
            const defaultLayerOption = document.createElement('option');
            defaultLayerOption.value = '';
            defaultLayerOption.textContent = '-- Select a Layer --';
            layerDropdown.appendChild(defaultLayerOption);
        }
    });

    // Event listener for Layer dropdown
    layerDropdown.addEventListener('change', () => {
        const selectedLayer = layerDropdown.value;
        if (selectedLayer) {
            const selectedRow = data.find(row => row["Layer"] === selectedLayer);
            if (selectedRow && selectedRow["geojson"]) {
                const linkedCsvUrl = selectedRow["geojson"];
                fetchAndDisplayLinkedCsv(linkedCsvUrl); // Fetch and display linked CSV
            } else {
                clearExistingTable();
            }
        }
    });

    clearExistingDropdown();
    tablePanel.appendChild(databaseDropdown);
    tablePanel.appendChild(layerDropdown);
}

// Fetch and display linked CSV file based on the "NameFile" column
function fetchAndDisplayLinkedCsv(linkedCsvUrl) {
    fetch(linkedCsvUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch linked CSV: ${response.statusText}`);
            }
            return response.text();
        })
        .then(csvText => {
            const parsedData = Papa.parse(csvText, { header: true });
            displayPagedTable(parsedData.data);
            addDownloadButton(parsedData.data, linkedCsvUrl); // Pass the URL here
        })
        .catch(() => {
            clearExistingTable();
        });
}


// Display the linked CSV data in a paginated table format
// Display the linked CSV data in a paginated table format
function displayPagedTable(data) {
    if (!data || data.length === 0) {
        clearExistingTable();
        return;
    }

    const totalPages = Math.ceil(data.length / rowsPerPages);

    const startIndex = (currentPages - 1) * rowsPerPages;
    const endIndex = startIndex + rowsPerPages;
    const pageData = data.slice(startIndex, endIndex);

    const table = document.createElement('table');
    table.id = 'linkedDataTable';
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');

    // Sanitize headers to replace auto-generated "_1", "_2" with blank values
    const rawHeaders = Object.keys(data[0]);
    const headers = rawHeaders.map(header => sanitizeString(header.startsWith('_') ? '' : header));

    // Create table header row
    const headerRow = document.createElement('tr');
    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header || ''; // Use blank for empty headers
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    // Create table body rows
    pageData.forEach(row => {
        const tr = document.createElement('tr');
        rawHeaders.forEach(header => {
            const td = document.createElement('td');
            td.textContent = sanitizeString(row[header] || ''); // Clean invalid characters
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });

    table.appendChild(thead);
    table.appendChild(tbody);

    clearExistingTable();
    tablePanel.appendChild(table);

    renderPaginationControls(totalPages);
}

// Helper function to sanitize strings and remove invalid characters
function sanitizeString(value) {
    if (!value) return '';
    // Remove non-printable characters or invalid characters
    return value.replace(/[^\x20-\x7E]/g, ''); // Keeps only printable ASCII characters
}

// Helper function to clear the table panel
function clearExistingTable() {
    tablePanel.innerHTML = ''; // Clear the content in the table panel
}



// Render pagination controls (Next / Previous buttons)
function renderPaginationControls(totalPages) {
    const paginationControls = document.createElement('div');
    paginationControls.id = 'paginationControls';

    const prevButton = document.createElement('button');
    prevButton.textContent = 'Previous';
    prevButton.disabled = currentPages === 1;
    prevButton.addEventListener('click', () => {
        if (currentPages > 1) {
            currentPages--;
            updateTableWithPagination();
        }
    });
    paginationControls.appendChild(prevButton);

    const nextButton = document.createElement('button');
    nextButton.textContent = 'Next';
    nextButton.disabled = currentPages === totalPages;
    nextButton.addEventListener('click', () => {
        if (currentPages < totalPages) {
            currentPages++;
            updateTableWithPagination();
        }
    });
    paginationControls.appendChild(nextButton);

    tablePanel.appendChild(paginationControls);
}

// Update table when pagination changes
function updateTableWithPagination() {
    const selectedValue = document.getElementById('descriptionDropdown').value;
    if (selectedValue) {
        const selectedRow = csvData.find(row => row["Layer"] === selectedValue);
        if (selectedRow && selectedRow["geojson"]) {
            fetch(selectedRow["geojson"])
                .then(response => response.text())
                .then(csvText => {
                    const parsedData = Papa.parse(csvText, { header: true });
                    displayPagedTable(parsedData.data);
                });
        }
    }
}

// Add download button for the linked CSV file
// Add a download button for the current CSV data
function addDownloadButton(data, linkedCsvUrl) {
    // Clear existing download button, if any, before adding a new one
    const existingDownloadButton = document.querySelector('button[download]');
    if (existingDownloadButton) {
        existingDownloadButton.remove();
    }

    // Extract the original filename from the URL
    const urlParts = linkedCsvUrl.split('/');
    const originalFilename = urlParts[urlParts.length - 1];

    // Create a new download button
    const downloadButton = document.createElement('button');
    downloadButton.textContent = 'Download CSV';
    downloadButton.setAttribute('download', originalFilename);

    // Convert the data back to CSV format
    const csvContent = Papa.unparse(data);

    // Create a Blob and URL for downloading
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    // Add event listener to the button for downloading
    downloadButton.addEventListener('click', function() {
        // Create an invisible link to trigger the download
        const tempLink = document.createElement('a');
        tempLink.href = url;
        tempLink.download = originalFilename;

        // Append the link to the document body, trigger the click event, then remove the link
        document.body.appendChild(tempLink);
        tempLink.click();
        document.body.removeChild(tempLink);
    });

    // Append the new download button to the table panel
    tablePanel.appendChild(downloadButton);
}




// Clear existing table and pagination
function clearExistingTable() {
    const existingTable = document.querySelector('#linkedDataTable');
    if (existingTable) existingTable.remove();

    const existingControls = document.querySelector('#paginationControls');
    if (existingControls) existingControls.remove();

    const existingDownloadButton = document.querySelector('button[download]');
    if (existingDownloadButton) existingDownloadButton.remove();
}

// Clear existing dropdown menu
function clearExistingDropdown() {
    const existingDropdown = document.querySelector('#descriptionDropdown');
    if (existingDropdown) existingDropdown.remove();
}
