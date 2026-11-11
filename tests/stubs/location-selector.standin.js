/* TEST STAND-IN for js/location/location-selector.js: fills the three drop-downs with two mini watersheds (no cascade). */
document.addEventListener('DOMContentLoaded', function () {
    const fill = (id, values) => { const s = document.getElementById(id); values.forEach(v => s.appendChild(new Option(v, v))); };
    fill('selectDist', ['Kandy']); fill('selectDSD', ['Pathahewaheta']); fill('selectMWSID', ['003', '010-1']);
});
window.findMwsFeatureAtLatLng = function () { return null; };
