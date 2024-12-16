

// Create a FeatureGroup to store drawn items
var drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

// Initialize the draw control
var drawControl = new L.Control.Draw({
    draw: {
        polyline: true,   // Enable polyline drawing (distance measurement)
        polygon: true,    // Enable polygon drawing (area measurement)
        rectangle: true,  // Enable rectangle drawing (area measurement)
        circle: true      // Enable circle drawing (area measurement)
    },
    edit: {
        featureGroup: drawnItems // Allow editing of drawn features
    }
});

// Add the draw control to the map
map.addControl(drawControl);

// Event listener to handle when a shape is drawn
map.on('draw:created', function (event) {
    var layer = event.layer;
    drawnItems.addLayer(layer);

    // Calculate the area and perimeter (length) of the shape drawn
    if (layer instanceof L.Polyline) {
        var length = map.distance(layer.getLatLngs()[0], layer.getLatLngs()[1]); // Length of the polyline
        alert('Distance: ' + length.toFixed(2) + ' meters');
    } else if (layer instanceof L.Polygon) {
        var area = L.GeometryUtil.geodesicArea(layer.getLatLngs()[0]); // Area of the polygon
        alert('Area: ' + area.toFixed(2) + ' square meters');
    } else if (layer instanceof L.Circle) {
        var area = Math.PI * Math.pow(layer.getRadius(), 2); // Area of the circle
        alert('Area: ' + area.toFixed(2) + ' square meters');
    }
});
