const tablePanel = document.getElementById('tablePanel');
const mwsDropdown = document.getElementById('selectMWSID'); // Dropdown for selecting mwsID
let csvData = [];
let currentPages = 1;
const rowsPerPages = 20;

// Example: Add an event listener for mwsID selection
mwsDropdown.addEventListener('change', function(event) {
    var selectedMwsID = event.target.value;
    var processedMwsID = selectedMwsID.replace(/-/g, '_'); // Process the selected mwsID
    const csvUrl = `https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Data/Proposal/MWS_${processedMwsID}/MWS_${processedMwsID}_table.csv`;
    
    if (processedMwsID) {
        fetchAndLoadMainCsv(csvUrl); // Load the CSV when a valid mwsID is selected
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
function renderDropdown(data) {
    if (!data || data.length === 0) {
        tablePanel.innerHTML = `<p>No data available in the CSV file.</p>`;
        return;
    }

    const descriptionColumn = data.map(row => row["Layer"]).filter(Boolean);
    const uniqueDescriptions = [...new Set(descriptionColumn)];

    const dropdown = document.createElement('select');
    dropdown.id = 'descriptionDropdown';

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '-- Select a Description --';
    dropdown.appendChild(defaultOption);

    uniqueDescriptions.forEach(description => {
        const option = document.createElement('option');
        option.value = description;
        option.textContent = description;
        dropdown.appendChild(option);
    });

    dropdown.addEventListener('change', () => {
        currentPages = 1;
        clearExistingTable();
        const selectedValue = dropdown.value;
        if (selectedValue) {
            const selectedRow = data.find(row => row["Layer"] === selectedValue);
            if (selectedRow && selectedRow["geojson"]) {
                const linkedCsvUrl = selectedRow["geojson"];
                fetchAndDisplayLinkedCsv(linkedCsvUrl); // Fetch and display linked CSV
            } else {
                clearExistingTable();
            }
        }
    });

    clearExistingDropdown();
    tablePanel.appendChild(dropdown);
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
            addDownloadButton(parsedData.data);
        })
        .catch(() => {
            clearExistingTable();
        });
}

// Display the linked CSV data in paginated table format
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

    const headers = Object.keys(data[0]);
    const headerRow = document.createElement('tr');
    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    pageData.forEach(row => {
        const tr = document.createElement('tr');
        headers.forEach(header => {
            const td = document.createElement('td');
            td.textContent = row[header];
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
function addDownloadButton(data) {
    const downloadButton = document.createElement('button');
    downloadButton.textContent = 'Download CSV';
    downloadButton.addEventListener('click', () => {
        const csvContent = Papa.unparse(data);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'download.csv';
        link.click();
    });

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
