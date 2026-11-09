/**
 * UI panels and header controls
 *
 * Purpose : Header buttons (Go / Base Layers / Proposal / ...), side-panel show/hide, dropdown reset logic, statistics tab highlight, and the buttons that open the other pages (Log in, Help, Open MWS Data Catalog).
 * Depends : Plain DOM. Calls (when present) window.clearFeatureSelection and window.resetLayersForMwsChange from js/layers/feature-info.js and layer-panels.js.
 * Exposes : activateButtons(), handleButtonClick(), hidePanel(), selectTab(), openUserInput(), openWorkthrough(), openSymbologyGuide(), openNewTab()
 */

// Panel that is currently open (null when none).
let activePanel = null;

// ---------------------------------------------------------------------------
// Location selection and the Go button
//
// Buttons that work on one Mini Watershed carry the attribute data-requires-mws
// in index.html. They stay locked until District, DSD and MWS_ID are chosen AND
// Go is pressed. Changing any dropdown locks them again and clears the map.
// Station Data, Stakeholders, Help, User Guide and Log in do not need an MWS,
// so they are always available.
// ---------------------------------------------------------------------------

const LOCKED_HINT = 'Select District, DSD and MWS ID, then press Go.';

/** Current value and visible text of the three location dropdowns. */
function getSelectedLocation() {
    const read = (id) => {
        const select = document.getElementById(id);
        const index = select ? select.selectedIndex : -1;
        return {
            value: select ? select.value : '',
            text: index >= 0 ? select.options[index].text.trim() : ''
        };
    };
    const dist = read('selectDist');
    const dsd = read('selectDSD');
    const mws = read('selectMWSID');
    return { dist, dsd, mws, complete: Boolean(dist.value && dsd.value && mws.value) };
}

function getGatedButtons() {
    return Array.from(document.querySelectorAll('[data-requires-mws]'));
}

/** Lock or unlock the MWS-dependent buttons (real `disabled`, so keyboard and screen readers respect it). */
function setGatedButtonsEnabled(enabled) {
    getGatedButtons().forEach(button => {
        button.disabled = !enabled;
        if (enabled) {
            button.removeAttribute('title');
        } else {
            button.title = LOCKED_HINT;
        }
    });
}

/** Message under the dropdowns. state: '' (prompt) | 'pending' (ready to press Go) | 'ready' (data unlocked). */
function setSelectionStatus(message, state) {
    const status = document.getElementById('selectionStatus');
    if (!status) return;
    status.textContent = message;
    status.dataset.state = state || '';
}

/** Go: unlock the data buttons for the selected MWS. */
function activateButtons() {
    const loc = getSelectedLocation();
    if (!loc.complete) return;
    setGatedButtonsEnabled(true);
    setSelectionStatus('Showing MWS ' + loc.mws.text + ' (' + loc.dsd.text + ', ' + loc.dist.text + '). Choose a data button above.', 'ready');
}

document.addEventListener('DOMContentLoaded', function () {
    const selects = ['selectDist', 'selectDSD', 'selectMWSID'].map(id => document.getElementById(id));
    const goButton = document.getElementById('goBtn');

    // Go is available once all three dropdowns have a value; data buttons wait for Go.
    function lockUntilGo() {
        setGatedButtonsEnabled(false);
        const loc = getSelectedLocation();
        goButton.disabled = !loc.complete;
        if (loc.complete) {
            setSelectionStatus('Press Go to open data for MWS ' + loc.mws.text + '.', 'pending');
        } else {
            setSelectionStatus(LOCKED_HINT, '');
        }
    }

    // Clear active layer selections so a newly selected MWS starts clean.
    function clearLayerSelections() {
        const selectors = [
            '#basePanel input[type="checkbox"]',
            '#proposalPanel input[type="checkbox"]',
            '#climPanel input[type="checkbox"]',
            'input[name="waterSource"]'
        ];
        document.querySelectorAll(selectors.join(',')).forEach((checkbox) => {
            if (!checkbox.checked) return;
            checkbox.checked = false;
            checkbox.dispatchEvent(new Event('change', { bubbles: true }));
        });
        if (typeof window.clearFeatureSelection === 'function') {
            window.clearFeatureSelection();
        }
    }

    // Hide open panels/popups when the location context changes.
    function refreshForLocationChange() {
        if (typeof window.resetLayersForMwsChange === 'function') {
            window.resetLayersForMwsChange();
        }
        clearLayerSelections();
        const panelIds = ['basePanel', 'proposalPanel', 'infoPanel', 'climPanel', 'waterPanel', 'attributePanel', 'tablePanel', 'catalogPanel', 'statPanel', 'waterQualityStationPanel', 'partnersPanel'];
        panelIds.forEach((id) => {
            const panel = document.getElementById(id);
            if (panel) panel.style.display = 'none';
        });
        const infoPopup = document.getElementById('infoPopupPanel');
        if (infoPopup) {
            infoPopup.style.display = 'none';
            infoPopup.innerHTML = '';
        }
        activePanel = null;
        document.querySelectorAll('header .button').forEach(button => button.classList.remove('active'));
    }

    selects.forEach(select => {
        select.addEventListener('change', () => {
            refreshForLocationChange();     // clear the map and panels of the previous MWS
            setGatedButtonsEnabled(false);  // lock straight away
            goButton.disabled = true;
            // location-selector.js refills the dependent dropdowns while this same change event is still
            // being handled, so read the final values on the next tick.
            setTimeout(lockUntilGo, 0);
        });
    });

    goButton.addEventListener('click', activateButtons);
    lockUntilGo();
});

// ---------------------------------------------------------------------------
// Side panels
// ---------------------------------------------------------------------------

// Handle button click
function clearPanelSelections(panelId) {
    const panel = document.getElementById(panelId);
    if (!panel) return;

    const checkboxes = panel.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach((checkbox) => {
        if (!checkbox.checked) return;
        checkbox.checked = false;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    });
}

function handleButtonClick(buttonId, panelId) {
    if (panelId === 'tablePanel') {
        hidePanel('waterQualityStationPanel');
    }
    if (typeof window.setMeasureModeActive === 'function') {
        window.setMeasureModeActive(false);
    }
    if (typeof window.clearFeatureSelection === 'function') {
        window.clearFeatureSelection();
    }

    if (activePanel && activePanel.id !== panelId) {
        // Keep base, proposal, and water station selections/layers when switching panels.
        const preserveSelections = ['basePanel', 'proposalPanel', 'waterPanel'];
        if (!preserveSelections.includes(activePanel.id)) {
            clearPanelSelections(activePanel.id);
        }
        hidePanel(activePanel.id);
    }

    const panel = document.getElementById(panelId);
    const distSelect = document.getElementById('selectDist');
    const dsdSelect = document.getElementById('selectDSD');
    const mwsIdSelect = document.getElementById('selectMWSID');

    // Show the panel first so we can measure it if needed
    panel.style.display = 'block';

     // Use default positioning (CSS) for panels, with right-side placement for table panels.
    panel.style.left = '';
    panel.style.right = '';
    panel.style.top = '';
    panel.style.transform = '';

    if (panelId === 'proposalPanel') {
        const label = document.getElementById('proposalNoLabel');
        if (label) {
            const ready = distSelect.value && dsdSelect.value && mwsIdSelect.value;
            label.style.display = ready ? 'block' : 'none';
        }
    }

    activePanel = panel;
    document.querySelectorAll('header .button').forEach(button => button.classList.remove('active'));
    document.getElementById(buttonId).classList.add('active');
}

/** Hide a panel. (Single definition; header-button state is managed by handleButtonClick.) */
function hidePanel(panelId) {
    const panel = document.getElementById(panelId);
    if (panel) {
        panel.style.display = 'none';
    }
}

/** Statistics tabs: highlight the clicked tab. The chart itself is drawn by js/statistics/*. */
function selectTab(tabName, tabElement) {
    if (typeof window.clearFeatureSelection === 'function') {
        window.clearFeatureSelection();
    }
    const legend = document.getElementById('statisticsLegend');
    if (legend) legend.style.display = 'none';
    document.querySelectorAll('#statPanel .tab').forEach(tab => tab.classList.remove('active'));
    if (tabElement) tabElement.classList.add('active');
}

// ---------------------------------------------------------------------------
// Links to the other pages
// ---------------------------------------------------------------------------

function openUserInput() {
    window.open('UserInput.html', '_blank');
}

function openWorkthrough() {
    window.open('workthrough.html', '_blank');
}

/** Page that explains every colour, symbol and legend on the map. */
function openSymbologyGuide() {
    window.open('symbology-guide.html', '_blank');
}

/** Open the stand-alone catalog, pre-selecting the MWS the user is already working on. */
function openNewTab() {
    const loc = getSelectedLocation();
    const mwsId = loc.complete ? loc.mws.value.trim() : '';   // only a complete selection is passed on
    const query = mwsId ? '?mwsId=' + encodeURIComponent(mwsId) : '';
    try {
        // Prefer the local catalog page so downloads run in a normal tab/context.
        const w = window.open('MWSDataCatalog.html' + query, '_blank');
        if (!w) {
            // Popup blocked or failed: fall back to the hosted catalog.
            const fallback = confirm('Could not open local catalog tab. Open the hosted catalog instead?');
            if (fallback) window.open('https://umw-dbms.github.io/MWSDataCatalog.html' + query, '_blank');
        }
    } catch (e) {
        // As a last resort, open the hosted catalog.
        window.open('https://umw-dbms.github.io/MWSDataCatalog.html' + query, '_blank');
    }
}
