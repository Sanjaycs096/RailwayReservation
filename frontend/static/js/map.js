let map = null;
let currentRoute = null;
let trainMarker = null;

function initMap(apiKey) {
    if (!window.google || !google.maps) {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMapCallback`;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
    } else {
        initMapCallback();
    }
}

function initMapCallback() {
    // Default center (India)
    const center = { lat: 20.5937, lng: 78.9629 };

    // Create map
    map = new google.maps.Map(document.getElementById('map'), {
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

function geocodeStation(stationName) {
    return new Promise((resolve, reject) => {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode(
            { address: `${stationName} railway station, India` },
            (results, status) => {
                if (status === 'OK' && results[0]) {
                    resolve(results[0].geometry.location);
                } else {
                    reject(new Error(`Could not geocode station: ${stationName}`));
                }
            }
        );
    });
}

async function showTrainRoute(trainData) {
    if (!map) {
        console.error('Map not initialized');
        return;
    }

    // Clear existing route
    if (currentRoute) {
        currentRoute.setMap(null);
        currentRoute = null;
    }
    trainMarker.setMap(null);

    try {
        // Get coordinates for source and destination
        const [sourcePos, destPos] = await Promise.all([
            geocodeStation(trainData.from),
            geocodeStation(trainData.to)
        ]);

        // Draw route
        const directionsService = new google.maps.DirectionsService();
        const response = await new Promise((resolve, reject) => {
            directionsService.route({
                origin: sourcePos,
                destination: destPos,
                travelMode: 'DRIVING' // Using DRIVING as trains mode is not available
            }, (result, status) => {
                if (status === 'OK') {
                    resolve(result);
                } else {
                    reject(new Error('Could not calculate route'));
                }
            });
        });

        // Create route with custom styling
        currentRoute = new google.maps.DirectionsRenderer({
            map: map,
            suppressMarkers: true,
            preserveViewport: false,
            polylineOptions: {
                strokeColor: '#1976d2',
                strokeWeight: 4
            }
        });
        currentRoute.setDirections(response);

        // Add station markers
        new google.maps.Marker({
            position: sourcePos,
            map: map,
            title: trainData.from,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: '#1976d2',
                fillOpacity: 1,
                strokeColor: '#fff',
                strokeWeight: 2,
                scale: 7
            }
        });

        new google.maps.Marker({
            position: destPos,
            map: map,
            title: trainData.to,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: '#1976d2',
                fillOpacity: 1,
                strokeColor: '#fff',
                strokeWeight: 2,
                scale: 7
            }
        });

        // Position train marker and animate
        if (trainData.progress) {
            const route = response.routes[0].overview_path;
            trainMarker.setMap(map);
            animateTrainAlongRoute(route, trainData.progress);
        }

        // Update bounds to show entire route
        const bounds = new google.maps.LatLngBounds();
        bounds.extend(sourcePos);
        bounds.extend(destPos);
        map.fitBounds(bounds);

        // Start real-time updates if status is Running
        if (trainData.status === 'Running') {
            startRealtimeUpdates(trainData);
        }

    } catch (error) {
        console.error('Error showing train route:', error);
        showAlert('Could not display train route on map', 'error');
    }
}

let animationInterval = null;

// Start real-time updates for a train
function startRealtimeUpdates(trainData) {
    if (!window.socket) return;

    // Listen for train position updates
    window.socket.on(`train_position_${trainData._id}`, (data) => {
        if (data.progress && currentRoute) {
            const route = currentRoute.getDirections().routes[0].overview_path;
            animateTrainAlongRoute(route, data.progress);
        }
    });
}

function updateTrainPosition(trainId, position, rotation) {
    if (!trainMarker || !position) return;

    trainMarker.setPosition(position);
    if (rotation !== undefined) {
        trainMarker.setIcon({
            ...trainMarker.getIcon(),
            rotation: rotation
        });
    }
}

function animateTrainAlongRoute(route, progress) {
    if (!route || route.length < 2) return;

    // Clear existing animation
    if (animationInterval) {
        clearInterval(animationInterval);
        animationInterval = null;
    }

    // Calculate total distance
    let totalDistance = 0;
    for (let i = 1; i < route.length; i++) {
        totalDistance += google.maps.geometry.spherical.computeDistanceBetween(
            route[i-1],
            route[i]
        );
    }

    // Find position based on progress
    const targetDistance = (progress / 100) * totalDistance;
    let currentDistance = 0;
    let segmentIndex = 0;

    for (let i = 1; i < route.length; i++) {
        const segmentDistance = google.maps.geometry.spherical.computeDistanceBetween(
            route[i-1],
            route[i]
        );

        if (currentDistance + segmentDistance >= targetDistance) {
            segmentIndex = i - 1;
            break;
        }

        currentDistance += segmentDistance;
    }

    // Animate train movement
    let currentProgress = progress;
    animationInterval = setInterval(() => {
        const segmentDistance = google.maps.geometry.spherical.computeDistanceBetween(
            route[segmentIndex],
            route[segmentIndex + 1]
        );

        const remainingDistance = targetDistance - currentDistance;
        const fraction = remainingDistance / segmentDistance;
        const position = google.maps.geometry.spherical.interpolate(
            route[segmentIndex],
            route[segmentIndex + 1],
            fraction
        );

        // Calculate heading for rotation
        const heading = google.maps.geometry.spherical.computeHeading(
            route[segmentIndex],
            route[segmentIndex + 1]
        );

        // Update train marker
        updateTrainPosition(null, position, heading);

        // Update progress for smooth animation
        currentProgress += 0.1;
        if (currentProgress >= 100) {
            clearInterval(animationInterval);
            animationInterval = null;
        }
    }, 100); // Update every 100ms for smooth animation
}