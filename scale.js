L.control.scale({
  position: 'bottomright',
  imperial: true,
  metric: true
}).addTo(map);

const measureState = {
  active: false,
  points: [],
  markers: [],
  line: null,
  labelMarker: null
};

function clearMeasureGraphics() {
  measureState.points = [];
  measureState.markers.forEach((m) => map.removeLayer(m));
  measureState.markers = [];
  if (measureState.line) {
    map.removeLayer(measureState.line);
    measureState.line = null;
  }
  if (measureState.labelMarker) {
    map.removeLayer(measureState.labelMarker);
    measureState.labelMarker = null;
  }
}

function formatDistance(meters) {
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${Math.round(meters)} m`;
}

function drawTwoPointDistance() {
  if (measureState.points.length !== 2) return;
  const [a, b] = measureState.points;
  const meters = map.distance(a, b);

  measureState.line = L.polyline([a, b], {
    color: '#00bcd4',
    weight: 3,
    opacity: 0.95
  }).addTo(map);

  const mid = L.latLng((a.lat + b.lat) / 2, (a.lng + b.lng) / 2);
  measureState.labelMarker = L.marker(mid, { opacity: 0 }).addTo(map);
  measureState.labelMarker.bindTooltip(formatDistance(meters), {
    permanent: true,
    direction: 'top',
    className: 'distance-tooltip'
  }).openTooltip();
}

function addMeasurePoint(latlng) {
  if (!latlng) return;
  if (measureState.points.length === 2) {
    clearMeasureGraphics();
  }

  measureState.points.push(latlng);
  const marker = L.circleMarker(latlng, {
    radius: 5,
    color: '#00bcd4',
    fillColor: '#00bcd4',
    fillOpacity: 1,
    weight: 1
  }).addTo(map);
  measureState.markers.push(marker);

  if (measureState.points.length === 2) {
    drawTwoPointDistance();
  }
}

function onMeasureMapClick(e) {
  if (!measureState.active) return;
  addMeasurePoint(e.latlng);
}

const measureControl = L.control({ position: 'bottomright' });

measureControl.onAdd = function () {
  const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
  const button = L.DomUtil.create('a', '', container);
  button.href = '#';
  button.title = 'Measure distance between two points';
  button.innerHTML = 'Measure';
  button.style.width = '64px';
  button.style.textAlign = 'center';
  button.style.fontSize = '11px';
  button.style.background = '#fff';
  button.style.color = '#222';

  L.DomEvent.disableClickPropagation(container);
  L.DomEvent.on(button, 'click', function (ev) {
    L.DomEvent.stop(ev);
    measureState.active = !measureState.active;
    button.style.background = measureState.active ? '#00bcd4' : '#fff';
    button.style.color = measureState.active ? '#fff' : '#222';
    if (!measureState.active) clearMeasureGraphics();
    if (measureState.active && typeof window.clearFeatureSelection === 'function') {
      window.clearFeatureSelection();
    }
  });

  return container;
};

measureControl.addTo(map);
const measureControlContainer = measureControl && measureControl.getContainer ? measureControl.getContainer() : null;
if (measureControlContainer) {
  measureControlContainer.style.display = 'none';
}
map.on('click', onMeasureMapClick);

window.isMeasureModeActive = function () {
  return !!measureState.active;
};

window.setMeasureModeActive = function (active) {
  const nextActive = !!active;
  if (measureState.active === nextActive) return;
  measureState.active = nextActive;
  const container = measureControl && measureControl.getContainer ? measureControl.getContainer() : null;
  const button = container ? container.querySelector('a') : null;
  if (button) {
    button.style.background = measureState.active ? '#00bcd4' : '#fff';
    button.style.color = measureState.active ? '#fff' : '#222';
  }
  if (!measureState.active) clearMeasureGraphics();
  if (typeof window.syncMeasureFooterButton === 'function') {
    window.syncMeasureFooterButton();
  }
};

window.handleMeasurePointFromLayer = function (latlng) {
  if (!measureState.active || !latlng) return false;
  addMeasurePoint(latlng);
  return true;
};
