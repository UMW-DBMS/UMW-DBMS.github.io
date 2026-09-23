// Get the select element
const selectElement = document.getElementById('selectMWSID');
let allData = []; 
// Add an event listener to detect when the user selects a new MWS ID
selectElement.addEventListener('change', function() {
    const mwsID = selectElement.value.replace(/-/g, '_');  // Clean up the selected mwsID

    // Check if a valid mwsID is selected
    if (!mwsID) {
        alert('Invalid mwsID: Please select a valid option from the dropdown.');
        return; // Exit if no valid option is selected
    }

    // Define the CSV file paths based on the selected mwsID
    const csvFilePaths = [
        //`https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Data/EXD/MWS_${mwsID}/datalayer_${mwsID}.csv`,
        `https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Data/EXD/MWS_${mwsID}/AllDataLayer_${mwsID}.csv`,
        `https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Data/EXD/MWS_${mwsID}/PropLayers_${mwsID}.csv`,
		`https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Data/Proposal/MWS_${mwsID}/MWS_${mwsID}_table.csv`
    ];

    //let allData = []; // Store all parsed CSV data

    // Fetch and parse all CSV files
    Promise.all(
        csvFilePaths.map(filePath =>
            fetch(filePath)
                .then(response => response.text())
                .then(csvText =>
                    new Promise(resolve => {
                        Papa.parse(csvText, {
                            header: true,
                            complete: function(results) {
                                resolve(results.data);
                            }
                        });
                    })
                )
        )
    )
    .then(results => {
        // Combine data from all files
        allData = results.flat(); 
        displayData(allData); // Display combined data
        updateDropdownOptions(allData); // Populate dropdowns based on combined data
    })
    .catch(error => {
        console.error("Error fetching or parsing CSV files:", error);
    });
});

// Function to populate dropdowns with unique values from the entire dataset
function updateDropdownOptions(data) {
    updateDropdownWithSelected('filterID', getUniqueValues(data, 'MWS'));
    updateDropdownWithSelected('filterDatabase', getUniqueValues(data, 'Database'));
    updateDropdownWithSelected('filterLayer', getUniqueValues(data, 'Layer'));
    updateDropdownWithSelected('filterProvider', getUniqueValues(data, 'Provider'));
}

// Helper function to get unique values from a column
function getUniqueValues(data, column) {
    return Array.from(new Set(data.map(row => row[column]).filter(Boolean)));
}

// Helper function to populate a dropdown and retain the selected value
function updateDropdownWithSelected(dropdownID, values) {
    const dropdown = document.getElementById(dropdownID);
    const selectedValue = dropdown.value; // Store the currently selected value
    dropdown.innerHTML = ''; // Clear existing options

    // Add an "Any" option at the top of the list
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Any';
    dropdown.appendChild(defaultOption);

    // Populate dropdown with the filtered unique values
    values.forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        dropdown.appendChild(option);
    });

    // Reapply the previously selected value (if it exists in the new options)
    dropdown.value = values.includes(selectedValue) ? selectedValue : '';
}

// Function to display the CSV data in the table
function displayData(data) {
    const tableBody = document.querySelector('#csvTable tbody');
    tableBody.innerHTML = ''; // Clear the table body

    data.forEach(row => {
        const tr = document.createElement('tr');
        const colsToShow = [row.MWS, row.Database, row.Layer, row['Provider']];
        colsToShow.forEach(col => {
            const td = document.createElement('td');
            td.textContent = col;
            tr.appendChild(td);
        });

        // Add a download button in the last column (robustly handle different field names)
        const td = document.createElement('td');
        const button = document.createElement('button');
        // try several common column names for download URL
        const url = row['Download-SHP'] || row['Download'] || row['download'] || row['geojson'] || row['GeoJSON'] || row['Download_URL'] || row['download_url'] || row['File'] || row['file'];
        if (!url) {
            button.textContent = 'Not available';
            button.disabled = true;
            button.classList.add('disabled');
        } else {
            button.textContent = 'Download';
            button.addEventListener('click', async () => {
                // Helper to convert GitHub blob URLs to raw.githubusercontent URLs
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
                    // If server returned an HTML page, don't try to download that
                    if (ct.includes('text/html')) throw new Error('Received HTML response instead of file');
                    const blob = await resp.blob();
                    const objectUrl = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = objectUrl;
                    const filename = (u.split('/').pop() || 'download').split('?')[0];
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
                }

                try {
                    await tryFetchAndDownload(url);
                } catch (err) {
                    console.warn('Initial fetch/download failed:', err);
                    // Try converting GitHub blob URL to raw URL and retry
                    const raw = toRawGitHubUrl(url);
                    if (raw !== url) {
                        try {
                            await tryFetchAndDownload(raw);
                            return;
                        } catch (err2) {
                            console.warn('Retry with raw.githubusercontent.com failed:', err2);
                        }
                    }

                    // Final fallback: provide user with the direct URL to open or copy
                    const userChoice = confirm('Automatic download failed (CORS or sandboxed frame).\nClick OK to open the file URL in a new tab, or Cancel to copy the URL to clipboard.');
                    if (userChoice) {
                        // Attempt to open in a new tab — note this can fail if the page is inside a sandboxed iframe.
                        try { window.open(url, '_blank', 'noopener'); }
                        catch (e) { console.error('Could not open new tab:', e); alert('Unable to open new tab. URL:\n' + url); }
                    } else {
                        try {
                            await navigator.clipboard.writeText(url);
                            alert('Download URL copied to clipboard. Paste it in your browser address bar to open.');
                        } catch (e) {
                            // As a last resort, show the URL so the user can copy it manually
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

    // Apply selected filters to data
    const filteredData = allData.filter(row =>
        (!filterID || row.MWS === filterID) &&
        (!filterDatabase || row.Database === filterDatabase) &&
        (!filterLayer || row.Layer === filterLayer) &&
        (!filterProvider || row['Provider'] === filterProvider)
    );

    displayData(filteredData); // Update displayed data based on filtered data
    
    // Update dropdown options based on currently filtered data
    updateDropdownOptions(filteredData);
}

// Add event listeners to dropdowns
['filterID', 'filterDatabase', 'filterLayer', 'filterProvider'].forEach(id => {
    document.getElementById(id).addEventListener('change', filterTable);
});
