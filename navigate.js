
// Variable to store the user's current location marker
var currentLocationMarker;

// Create a custom crosshair icon
var crosshairIcon = L.divIcon({
    className: 'crosshair-icon',
    html: `
        <div style="
            width: 20px; 
            height: 20px; 
            border: 2px solid red; 
            border-radius: 50%; 
            position: relative;">
            <div style="
                width: 2px; 
                height: 20px; 
                background: red; 
                position: absolute; 
                top: 0; 
                left: 50%; 
                transform: translateX(-50%);"></div>
            <div style="
                width: 20px; 
                height: 2px; 
                background: red; 
                position: absolute; 
                top: 50%; 
                left: 0; 
                transform: translateY(-50%);"></div>
        </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10] // Center the crosshair on the location
});

// Function to locate and add the crosshair to the map
function addCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function (position) {
                var lat = position.coords.latitude;
                var lng = position.coords.longitude;

                // Remove the existing marker, if any
                if (currentLocationMarker) {
                    map.removeLayer(currentLocationMarker);
                }

                // Add the crosshair to the user's location
                currentLocationMarker = L.marker([lat, lng], {
                    icon: crosshairIcon,
                }).addTo(map);

                // Zoom to the user's location
                map.setView([lat, lng], 13);
            },
            function (error) {
                console.error("Error getting location:", error.message);
                alert("Unable to retrieve your location.");
            }
        );
    } else {
        alert("Geolocation is not supported by your browser.");
    }
}

// Add a custom control button to trigger the location functionality
L.Control.CurrentLocation = L.Control.extend({
    onAdd: function (map) {
        var div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');

        // Add an icon to the button
        div.innerHTML = `<i class="fa fa-crosshairs" style="font-size: 18px; padding: 8px;"></i>`;
        div.style.backgroundColor = 'white';
        div.style.width = '36px';
        div.style.height = '36px';
        div.style.cursor = 'pointer';
        div.style.textAlign = 'center';

        // Trigger the location function on click
        div.onclick = function () {
            addCurrentLocation();
        };

        return div;
    }
});

// Add the custom control to the map
map.addControl(new L.Control.CurrentLocation({ position: 'topleft' }));
