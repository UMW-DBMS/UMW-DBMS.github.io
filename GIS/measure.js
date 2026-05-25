
// Initialize Leaflet Draw after map is ready
function initializeMeasureTools() {
    // Check if map exists
    if (typeof map === 'undefined') {
        console.error('Map not initialized yet, retrying in 500ms...');
        setTimeout(initializeMeasureTools, 500);
        return;
    }

    // Check if Turf.js is loaded
    if (typeof turf === 'undefined') {
        console.error('Turf.js not loaded yet, retrying in 500ms...');
        setTimeout(initializeMeasureTools, 500);
        return;
    }

    console.log('Initializing measure tools...');

    // Helper function to format coordinates
    function formatCoordinates(lat, lng) {
        return 'N ' + lat.toFixed(6) + ', E ' + lng.toFixed(6);
    }

    // Helper function to calculate distance between two points (in meters)
    function calculateDistance(latlng1, latlng2) {
        if (!window.turf) {
            console.warn('Turf.js not loaded');
            return 0;
        }
        var point1 = turf.point([latlng1.lng, latlng1.lat]);
        var point2 = turf.point([latlng2.lng, latlng2.lat]);
        var distance = turf.distance(point1, point2, { units: 'meters' });
        return distance;
    }

    // Helper function to calculate total distance of a polyline
    function calculatePolylineDistance(latLngs) {
        if (!window.turf || !latLngs || latLngs.length < 2) {
            console.warn('Turf.js not loaded or insufficient points for distance calculation');
            return 0;
        }
        var totalDistance = 0;
        for (var i = 0; i < latLngs.length - 1; i++) {
            totalDistance += calculateDistance(latLngs[i], latLngs[i + 1]);
        }
        return totalDistance;
    }

    // Helper function to calculate area of a closed polygon
    function calculatePolygonArea(latLngs) {
        if (!window.turf || !latLngs || latLngs.length < 3) {
            console.warn('Turf.js not loaded or insufficient points for area calculation');
            return 0;
        }
        
        // Ensure polygon is closed
        var coords = [];
        for (var i = 0; i < latLngs.length; i++) {
            coords.push([latLngs[i].lng, latLngs[i].lat]);
        }
        // Close the polygon if not already closed
        if (coords[0][0] !== coords[coords.length - 1][0] || coords[0][1] !== coords[coords.length - 1][1]) {
            coords.push(coords[0]);
        }
        
        try {
            var polygon = turf.polygon([coords]);
            var area = turf.area(polygon); // area in square meters
            return area;
        } catch (err) {
            console.error('Error calculating polygon area:', err);
            return 0;
        }
    }

    // Event listener to handle when a shape is drawn
    map.on('draw:created', function (event) {
        console.log('Draw event triggered, layer type:', event.layer.constructor.name);
        var layer = event.layer;
        drawnItems.addLayer(layer);

        // Get the ending point
        var endingPoint = null;
        var latLngs = [];
        
        if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
            // Polyline (distance measurement)
            console.log('Measuring polyline (distance)');
            latLngs = layer.getLatLngs();
            if (latLngs.length > 0) {
                endingPoint = latLngs[latLngs.length - 1];
                var distance = calculatePolylineDistance(latLngs);
                var message = 'Distance: ' + distance.toFixed(2) + ' meters\n';
                if (endingPoint) {
                    message += 'Ending point: ' + formatCoordinates(endingPoint.lat, endingPoint.lng);
                }
                console.log('Polyline message:', message);
                alert(message);
            }
        } else if (layer instanceof L.Polygon) {
            // Polygon (area measurement)
            console.log('Measuring polygon (area)');
            latLngs = layer.getLatLngs()[0]; // Get the outer ring
            if (latLngs.length > 0) {
                endingPoint = latLngs[latLngs.length - 1];
                var area = calculatePolygonArea(latLngs);
                var perimeter = calculatePolylineDistance(latLngs);
                var message = 'Area: ' + area.toFixed(2) + ' square meters\n';
                message += 'Perimeter: ' + perimeter.toFixed(2) + ' meters\n';
                if (endingPoint) {
                    message += 'Ending point: ' + formatCoordinates(endingPoint.lat, endingPoint.lng);
                }
                console.log('Polygon message:', message);
                alert(message);
            }
        } else if (layer instanceof L.Circle) {
            // Circle (area measurement)
            console.log('Measuring circle (area)');
            var radius = layer.getRadius();
            var area = Math.PI * Math.pow(radius, 2); // Area of the circle
            var circumference = 2 * Math.PI * radius;
            var center = layer.getLatLng();
            var message = 'Area: ' + area.toFixed(2) + ' square meters\n';
            message += 'Circumference: ' + circumference.toFixed(2) + ' meters\n';
            if (center) {
                message += 'Center point: ' + formatCoordinates(center.lat, center.lng);
            }
            console.log('Circle message:', message);
            alert(message);
        } else {
            console.warn('Unknown layer type:', event.layer.constructor.name);
        }
    });

    // Track measurement mode
    var measurementModeActive = false;

    // Function to activate/deactivate measurement mode
    function setMeasureModeActive(active) {
        measurementModeActive = active;
        console.log('Measurement mode:', active ? 'ACTIVE' : 'INACTIVE');
    }

    // Function to check if measurement mode is active
    function isMeasureModeActive() {
        return measurementModeActive;
    }

    // Expose functions globally
    window.setMeasureModeActive = setMeasureModeActive;
    window.isMeasureModeActive = isMeasureModeActive;

    console.log('measure.js loaded successfully');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMeasureTools);
} else {
    // DOM already loaded
    initializeMeasureTools();
}
