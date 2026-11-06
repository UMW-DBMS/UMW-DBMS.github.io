/* STAND-IN for js/layers/layer-loaders.js: loadGeoJsonLayer (base) and loadGeoJsonLayerP (proposal). The pointToLayer block with the cost circle and the number label is typed
   from the old script (lines 2549-2578); fetching, adding to geoJsonLayers and the legend follow the new loader (as read earlier). */
function makeLayer(data, layerName) {
    return L.geoJSON(data, {
        pointToLayer: function (feature, latlng) {
            const icon = L.divIcon({ className: 'umw-marker', html: '<span style="display:block;width:12px;height:12px;background:#c0392b;border:2px solid #fff;border-radius:50%"></span>', iconSize: [16, 16] });
            const amount = getAmountFromProps(feature && feature.properties);
            let marker; let labelTarget;
            if (amount !== null && shouldShowNoLabel(layerName)) {
                const color = getAmountColor(amount);
                const circle = L.circleMarker(latlng, { radius: getAmountRadius(amount), color: color, weight: 0, stroke: false, fillColor: color, fillOpacity: 0.15 });
                const point = L.marker(latlng, { icon: icon });
                point.setZIndexOffset(1000);
                marker = L.layerGroup([circle, point]);
                labelTarget = point;
            } else { marker = L.marker(latlng, { icon: icon }); labelTarget = marker; }
            const noValue = getNoValue(feature && feature.properties);
            if (noValue !== null && noValue !== undefined && shouldShowNoLabel(layerName)) {
                const labelText = String(noValue).trim();
                if (labelText) labelTarget.bindTooltip(labelText, { permanent: true, direction: 'top', className: 'proposal-no-label', opacity: 0.9 });
            }
            return marker;
        }
    });
}
function loadGeoJsonLayer(url, layerName) {
    fetch(url).then((r) => { if (!r.ok) throw new Error('Network response was not ok'); return r.json(); }).then((data) => { geoJsonLayers[layerName] = makeLayer(data, layerName).addTo(map); })
        .catch((e) => console.error('Error loading GeoJSON layer for ' + layerName + ':', e));
}
function loadGeoJsonLayerP(url, layerName) {
    fetch(url).then((r) => { if (!r.ok) throw new Error('Network response was not ok'); return r.json(); }).then((data) => { geoJsonLayers[layerName] = makeLayer(data, layerName).addTo(map); })
        .catch((e) => console.error('Error loading GeoJSON layer for ' + layerName + ':', e));
    return 'loader-return';
}
