/* TEST STAND-IN for js/panels/station-data.js (that file was not available when this was built).
   It has the same public names and the same worst-case behaviour that matters here: its change handler removes every layer in
   waterQualityLayers whose box is not ticked. It builds the panel the way the real file does (groups of divs with waterSource boxes). */
let waterQualityLayers = {};
const STAND_IN_STATIONS = { CEA: 'https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Data/EXD/12_WQ/CEA_pH.geojson', Rainfall: 'https://raw.githubusercontent.com/MWS003-GIS/MWS003-GIS.github.io/main/IWWRMP/Data/EXD/10_MET/RF_St/MET_RF_St.geojson' };
function renderWaterPanel() {
    const panel = document.getElementById('waterPanel'); if (!panel) return;
    panel.innerHTML = '';
    const close = document.createElement('button'); close.className = 'hide-btn'; close.textContent = 'Close'; close.onclick = function () { hidePanel('waterPanel'); }; panel.appendChild(close);
    [['Water Quality Stations', ['CEA', 'MASL', 'NWSDB'], 'primary'], ['Other Stations', ['Evaporation', 'Rainfall', 'Temperature'], 'other']].forEach(([title, items, kind]) => {
        const group = document.createElement('div'); const h = document.createElement('h3'); h.textContent = title; group.appendChild(h);
        items.forEach((s, i) => { const row = document.createElement('div'); const cb = document.createElement('input'); cb.type = 'checkbox'; cb.name = 'waterSource'; cb.value = s; cb.id = 'water_source_' + kind + '_' + i; cb.addEventListener('change', handleWaterSourceChange);
            const l = document.createElement('label'); l.htmlFor = cb.id; l.textContent = s; row.appendChild(cb); row.appendChild(l); group.appendChild(row); });
        panel.appendChild(group);
    });
}
async function handleWaterSourceChange() {
    const selected = Array.from(document.querySelectorAll('input[name="waterSource"]')).filter(c => c.checked).map(c => c.value);
    const set = new Set(selected);
    for (const src of selected) {
        if (waterQualityLayers[src] || !STAND_IN_STATIONS[src]) continue;
        const data = await (await fetch(STAND_IN_STATIONS[src])).json();
        waterQualityLayers[src] = L.geoJSON(data, { pointToLayer: (f, ll) => L.marker(ll) }).addTo(map);
    }
    for (const src of Object.keys(waterQualityLayers)) { if (!set.has(src)) { map.removeLayer(waterQualityLayers[src]); delete waterQualityLayers[src]; } }
}
document.addEventListener('DOMContentLoaded', renderWaterPanel);
