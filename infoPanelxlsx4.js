let currentPage = 1;
const rowsPerPage = 10;
let sheetData = []; // Global variable to hold the sheet data
let filteredData = []; // Global variable for filtered data

// Function to load XLSX and display it as a table in the infoPanel
document.getElementById('mwsInfoBtn').addEventListener('click', function () {
    const selectElement = document.getElementById('selectMWSID');
    const mwsID = selectElement.value;

    if (mwsID) {
        const xlsxFilePath = 'https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Data/EXD/Pathahewaheta_name%20lists.xlsx';

        fetch(xlsxFilePath)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.arrayBuffer(); // Get the file as an array buffer
            })
            .then(arrayBuffer => {
                const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                const firstSheetName = workbook.SheetNames[1];
                sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], { header: 1 });
                filteredData = sheetData.slice(); // Start with all data being visible
                currentPage = 1; // Reset to the first page when new data is loaded
                displayTable(filteredData);
            })
            .catch(error => {
                console.error('Error fetching the XLSX file:', error);
            });
    } else {
        alert('Please select a valid MWS_ID.');
    }
});

// Function to display parsed XLSX data as a table with pagination and filters
function displayTable(data) {
    const infoPanel = document.getElementById('infoPanel');
    infoPanel.innerHTML = ''; // Clear any existing content

    // Create a table
    const table = document.createElement('table');
    table.border = "1";
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';

    // Create the table header (first row of data as headers)
    const header = table.createTHead();
    const headerRow = header.insertRow(0);
    const keys = data[0]; // First row is considered the header

    keys.forEach((key, index) => {
        const th = document.createElement('th');
        th.textContent = key;
        headerRow.appendChild(th);
    });

    // Create a row for filters below the header row
    const filterRow = table.insertRow(1);

    keys.forEach((_, index) => {
        const filterCell = filterRow.insertCell(index);
        const filterSelect = document.createElement('select');
        filterSelect.style.width = '100%';
        filterSelect.innerHTML = '<option value="">All</option>';

        // Populate the dropdown with unique values
        const uniqueValues = [...new Set(data.slice(1).map(row => row[index]))].sort(); // Exclude the header and get unique values
        uniqueValues.forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            filterSelect.appendChild(option);
        });

        filterSelect.addEventListener('change', function () {
            applyDropdownFilter(index, filterSelect);
        });

        filterCell.appendChild(filterSelect); // Append select to the filter cell
    });

    // Create the table body
    const tbody = document.createElement('tbody');
    table.appendChild(tbody);

    // Display only the rows for the current page
    const startRow = (currentPage - 1) * rowsPerPage + 2; // +2 to skip header and filter row
    const endRow = Math.min(startRow + rowsPerPage - 1, data.length - 1); // Limit rows to 10

    for (let i = startRow; i <= endRow; i++) {
        const row = data[i];
        const tr = tbody.insertRow();

        row.forEach(cellData => {
            const td = tr.insertCell();
            td.textContent = cellData || ''; // Add cell data or empty string if undefined
        });
    }

    // Append the table to the infoPanel
    infoPanel.appendChild(table);

    // Add pagination controls
    createPaginationControls(data);
}

// Function to create pagination controls (Next and Previous buttons)
function createPaginationControls(data) {
    const infoPanel = document.getElementById('infoPanel');

    // Create a div for pagination buttons
    const paginationDiv = document.createElement('div');
    paginationDiv.style.marginTop = '10px';

    // Previous button
    const prevButton = document.createElement('button');
    prevButton.textContent = 'Previous';
    prevButton.disabled = currentPage === 1; // Disable if on the first page
    prevButton.addEventListener('click', function () {
        if (currentPage > 1) {
            currentPage--;
            displayTable(data); // Refresh the table with the previous page
        }
    });
    paginationDiv.appendChild(prevButton);

    // Next button
    const nextButton = document.createElement('button');
    nextButton.textContent = 'Next';
    nextButton.disabled = currentPage >= Math.ceil((data.length - 1) / rowsPerPage); // Disable if on the last page
    nextButton.addEventListener('click', function () {
        if (currentPage < Math.ceil((data.length - 1) / rowsPerPage)) {
            currentPage++;
            displayTable(data); // Refresh the table with the next page
        }
    });
    paginationDiv.appendChild(nextButton);

    // Append the pagination controls to the infoPanel
    infoPanel.appendChild(paginationDiv);
}

// Function to apply filtering based on selected dropdown values
function applyDropdownFilter(columnIndex, filterSelect) {
    const selectedValue = filterSelect.value; // Get the selected value from the dropdown

    filteredData = sheetData.filter((row, rowIndex) => {
        if (rowIndex === 0) return true; // Skip the header row
        const cellValue = row[columnIndex] || '';
        return selectedValue === '' || cellValue.toString() === selectedValue;
    });
    currentPage = 1; // Reset to the first page after filtering

    // Update dropdown value to show selected item
    filterSelect.value = selectedValue; // Set the dropdown to show the selected value

    displayTable(filteredData); // Display the filtered table
}
