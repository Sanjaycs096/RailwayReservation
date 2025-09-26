let map = null;
let currentRoute = null;
let trainMarker = null;
let isMapInitialized = false;

function initMap(accessToken) {
    if (!accessToken) {
        console.error('No LocationIQ access token provided');
        document.getElementById('map').innerHTML = 
            '<div style="padding: 20px; text-align: center;">Map loading failed. Please try again later.</div>';
        return;
    }

    try {
        // Initialize MapboxGL with LocationIQ token
        mapboxgl.accessToken = accessToken;
        
        const mapElement = document.getElementById('map');
        if (!mapElement) {
            console.error('Map container element not found');
            return;
        }

        // Create map instance
        map = new mapboxgl.Map({
            container: 'map',
            style: 'https://tiles.locationiq.com/v3/streets/vector.json',
            center: [78.9629, 20.5937], // Default center (India)
            zoom: 5
        });

        // Add navigation controls
        map.addControl(new mapboxgl.NavigationControl());

        // Add scale control
        map.addControl(new mapboxgl.ScaleControl({
            maxWidth: 80,
            unit: 'metric'
        }));

        // Initialize marker but don't add to map yet
        trainMarker = new mapboxgl.Marker({
            element: createTrainMarkerElement()
        });

        isMapInitialized = true;

        // Handle map load complete
        map.on('load', () => {
            console.log('Map loaded successfully');
        });

    } catch (error) {
        console.error('Error initializing map:', error);
        document.getElementById('map').innerHTML = 
            '<div style="padding: 20px; text-align: center;">Map loading failed. Please try again later.</div>';
    }
}

function initMapCallback() {
    try {
        const mapElement = document.getElementById('map');
        if (!mapElement) {
            console.error('Map container element not found');
            return;
        }

        // Default center (India)
        const center = { lat: 20.5937, lng: 78.9629 };

        // Create map
        map = new google.maps.Map(mapElement, {
            center: center,
            zoom: 5,
            styles: [
            {
                "featureType": "administrative",
                "elementType": "geometry",
                "stylers": [{"visibility": "off"}]
            },
            {
                "featureType": "landscape",
                "stylers": [{"color": "#f5f5f5"}]
            },
            {
                "featureType": "poi",
                "stylers": [{"visibility": "off"}]
            },
            {
                "featureType": "road",
                "stylers": [{"color": "#ffffff"}]
            },
            {
                "featureType": "road.arterial",
                "elementType": "labels",
                "stylers": [{"visibility": "off"}]
            },
            {
                "featureType": "road.highway",
                "elementType": "labels",
                "stylers": [{"visibility": "off"}]
            },
            {
                "featureType": "road.local",
                "stylers": [{"visibility": "off"}]
            },
            {
                "featureType": "transit",
                "stylers": [{"visibility": "off"}]
            },
            {
                "featureType": "water",
                "stylers": [{"color": "#e9ecef"}]
            }
        ]
    });

    // Create train icon
    trainMarker = new google.maps.Marker({
        map: null,
        icon: {
            url: '../static/images/train-icon.png',
            scaledSize: new google.maps.Size(32, 32),
            anchor: new google.maps.Point(16, 16)
        }
    });
}

function createTrainMarkerElement() {
    const el = document.createElement('div');
    el.className = 'train-marker';
    el.style.width = '32px';
    el.style.height = '32px';
    el.style.backgroundImage = 'url(../static/images/train-icon.png)';
    el.style.backgroundSize = 'cover';
    return el;
}

async function geocodeStation(stationName) {
    try {
        const response = await fetch(
            `https://us1.locationiq.com/v1/search.php?key=${mapboxgl.accessToken}&q=${encodeURIComponent(stationName + ' railway station, India')}&format=json`
        );
        
        if (!response.ok) {
            throw new Error('Geocoding failed');
        }

        const data = await response.json();
        if (data && data[0]) {
            return [parseFloat(data[0].lon), parseFloat(data[0].lat)];
        } else {
            throw new Error(`Could not geocode station: ${stationName}`);
        }
    } catch (error) {
        console.error('Geocoding error:', error);
        throw error;
    }
}

async function showTrainRoute(trainData) {
    if (!map) {
        console.error('Map not initialized');
        return;
    }

    // Clear existing route
    if (map.getSource('route')) {
        map.removeLayer('route');
        map.removeSource('route');
    }
    if (trainMarker) {
        trainMarker.remove();
    }

    try {
        // Get coordinates for source and destination
        const [sourceCoords, destCoords] = await Promise.all([
            geocodeStation(trainData.from),
            geocodeStation(trainData.to)
        ]);

        // Fetch route from LocationIQ Directions API
        const response = await fetch(
            `https://us1.locationiq.com/v1/directions/driving/${sourceCoords[0]},${sourceCoords[1]};${destCoords[0]},${destCoords[1]}?key=${mapboxgl.accessToken}&steps=true&alternatives=false&geometries=geojson`
        );

        if (!response.ok) {
            throw new Error('Could not calculate route');
        }

        const data = await response.json();
        if (!data.routes || !data.routes[0]) {
            throw new Error('No route found');
        }

        // Add the route to the map
        map.addSource('route', {
            type: 'geojson',
            data: {
                type: 'Feature',
                properties: {},
                geometry: data.routes[0].geometry
            }
        });

        map.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: {
                'line-join': 'round',
                'line-cap': 'round'
            },
            paint: {
                'line-color': '#1976d2',
                'line-width': 4,
                'line-opacity': 0.8
            }
        });

        // Add station markers
        new mapboxgl.Marker({
            element: createStationMarkerElement(trainData.from),
            anchor: 'center'
        })
            .setLngLat(sourceCoords)
            .addTo(map);

        new mapboxgl.Marker({
            element: createStationMarkerElement(trainData.to),
            anchor: 'center'
        })
            .setLngLat(destCoords)
            .addTo(map);

        // Position train marker and animate
        if (trainData.progress) {
            const coordinates = data.routes[0].geometry.coordinates;
            trainMarker
                .setLngLat(coordinates[0])
                .addTo(map);
            animateTrainAlongRoute(coordinates, trainData.progress);
        }

        // Fit map to show entire route
        const bounds = new mapboxgl.LngLatBounds();
        data.routes[0].geometry.coordinates.forEach(coord => {
            bounds.extend(coord);
        });
        map.fitBounds(bounds, { padding: 50 });

        // Start real-time updates if status is Running
        if (trainData.status === 'Running') {
            startRealtimeUpdates(trainData);
        }

    } catch (error) {
        console.error('Error showing train route:', error);
        showAlert('Could not display train route on map', 'error');
    }
}

function createStationMarkerElement(stationName) {
    const el = document.createElement('div');
    el.className = 'station-marker';
    el.style.width = '14px';
    el.style.height = '14px';
    el.style.borderRadius = '50%';
    el.style.backgroundColor = '#1976d2';
    el.style.border = '2px solid #ffffff';
    el.title = stationName;
    return el;
}

let animationInterval = null;

// Start real-time updates for a train
function startRealtimeUpdates(trainData) {
    if (!window.socket) return;

    // Listen for train position updates
    window.socket.on(`train_position_${trainData._id}`, (data) => {
        if (data.progress && map.getSource('route')) {
            const coordinates = map.getSource('route')._data.geometry.coordinates;
            animateTrainAlongRoute(coordinates, data.progress);
        }
    });
}

function updateTrainPosition(coordinates, progress) {
    if (!trainMarker || !coordinates || coordinates.length < 2) return;

    // Find position along the route based on progress
    const pointIndex = Math.floor((coordinates.length - 1) * (progress / 100));
    const point = coordinates[pointIndex];
    
    // Calculate rotation based on next point
    let rotation = 0;
    if (pointIndex < coordinates.length - 1) {
        const nextPoint = coordinates[pointIndex + 1];
        rotation = getBearing(point, nextPoint);
    }

    // Update marker position and rotation
    trainMarker.setLngLat(point);
    trainMarker.getElement().style.transform = `rotate(${rotation}deg)`;
}

function animateTrainAlongRoute(coordinates, progress) {
    if (!coordinates || coordinates.length < 2) return;

    // Clear existing animation
    if (animationInterval) {
        clearInterval(animationInterval);
        animationInterval = null;
    }

    let currentProgress = progress;
    animationInterval = setInterval(() => {
        updateTrainPosition(coordinates, currentProgress);

        currentProgress += 0.1;
        if (currentProgress >= 100) {
            clearInterval(animationInterval);
            animationInterval = null;
        }
    }, 100);
}

function getBearing(start, end) {
    const startLat = toRad(start[1]);
    const startLng = toRad(start[0]);
    const endLat = toRad(end[1]);
    const endLng = toRad(end[0]);

    const dLng = endLng - startLng;

    const y = Math.sin(dLng) * Math.cos(endLat);
    const x = Math.cos(startLat) * Math.sin(endLat) -
        Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng);

    let bearing = toDeg(Math.atan2(y, x));
    bearing = (bearing + 360) % 360;

    return bearing;
}

function toRad(deg) {
    return deg * Math.PI / 180;
}

function toDeg(rad) {
    return rad * 180 / Math.PI;
}