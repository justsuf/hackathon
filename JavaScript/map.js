// map and routing control logic

document.addEventListener('DOMContentLoaded', () => {
    // XP tracking
    let totalXP = 0;
    const xpPerMission = 25;  // XP gained per completed mission
    const maxXP = 100;

    function updateXPBar() {
        const xpProgress = document.getElementById('xp-progress');
        const xpDisplay = document.getElementById('xp-display');
        if (xpProgress && xpDisplay) {
            const percentage = Math.min((totalXP / maxXP) * 100, 100);
            xpProgress.style.width = percentage + '%';
            xpProgress.setAttribute('aria-valuenow', totalXP);
            xpDisplay.textContent = totalXP + ' / ' + maxXP;
        }
    }

    function addXP(amount) {
        totalXP = Math.min(totalXP + amount, maxXP);
        updateXPBar();
    }
    // create the map centered on Apeldoorn, Netherlands
    // coordinates: 52.2112 N, 5.9699 E
    const map = L.map('map', {
        zoomControl: true,
        preferCanvas: true  // better performance on mobile
    }).setView([52.2112, 5.9699], 13);

    // add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // routing control (hidden) — compute realistic road routes
    const routingControl = L.Routing.control({
        waypoints: [],
        routeWhileDragging: false,
        geocoder: L.Control.Geocoder.nominatim(),
        draggableWaypoints: false,
        addWaypoints: false,
        show: false,
        // don't create default markers (we use chest icons)
        createMarker: function() { return null; },
        lineOptions: { styles: [{ color: 'blue', weight: 4, opacity: 0.8 }] },
        // prevent waypoint optimization/reordering that causes loops
        waypointMode: 'waypoints',
        fitSelectedRoutes: false
    }).addTo(map);

    // chest icon for POIs (path relative to Html/map.html)
    const chestIcon = L.icon({
        iconUrl: '../Assets/chest.png',
        // smaller chest icon anchored below the route line
        iconSize: [32, 45],
        iconAnchor: [16, 40],
        popupAnchor: [0, -40]
    });
    // three predefined routes with 5 points each
    const routes = {
        1: [
            { lat: 52.2112, lng: 5.9699, name: 'Apeldoorn Station', objective: 'Vind de hoofdingang.' },
            { lat: 52.2177, lng: 5.9732, name: 'Groenplein', objective: 'Zoek de historische bomen.' },
            { lat: 52.2242, lng: 5.9800, name: 'Paleis Het Loo', objective: 'Maak een foto van het paleis.' },
            { lat: 52.2200, lng: 5.9650, name: 'Town Center', objective: 'Vind het oudste gebouw.' },
            { lat: 52.2160, lng: 5.9620, name: 'Historic Market Square', objective: 'Vind de fontein.' }
        ],
        2: [
            { lat: 52.2300, lng: 5.9850, name: 'Het Loo Nature Reserve', objective: 'Zoek vogels bij het moeras.' },
            { lat: 52.2350, lng: 5.9900, name: 'Forest Trail Start', objective: 'Vind een routepaal.' },
            { lat: 52.2280, lng: 5.9950, name: 'Pine Forest', objective: 'Vind een dennenappel.' },
            { lat: 52.2180, lng: 6.0000, name: 'Meadow Vista', objective: 'Zoek drie wilde bloemen.' },
            { lat: 52.2100, lng: 5.9900, name: 'Pond Viewpoint', objective: 'Maak een foto van een dier.' }
        ],
        3: [
            { lat: 52.2150, lng: 5.9800, name: 'Art Gallery Entrance', objective: 'Wat is de huidige tentoonstelling?' },
            { lat: 52.2200, lng: 5.9750, name: 'Library Building', objective: 'Vind het oudste boek.' },
            { lat: 52.2120, lng: 5.9680, name: 'Theater District', objective: 'Bekijk de komende voorstellingen.' },
            { lat: 52.2050, lng: 5.9650, name: 'Heritage Museum', objective: 'Vind het voorwerp van Apeldoorn.' },
            { lat: 52.2080, lng: 5.9750, name: 'Cultural Center', objective: 'Plan een evenement.' }
        ]
    };

    function loadRoute(routeId) {
        const route = routes[routeId];
        if (!route) return;

        // compute realistic route along roads using the routing engine
        const waypoints = route.map(p => L.latLng(p.lat, p.lng));
        routingControl.setWaypoints(waypoints);

        // clear markers and add new ones using chest icon
        poiLayer.clearLayers();
        route.forEach((p, index) => {
            const marker = L.marker([p.lat, p.lng], { icon: chestIcon }).addTo(poiLayer);
            const btnId = `mission-btn-${routeId}-${index}`;
            const popupContent = `
                <div class="p-3">
                    <strong class="d-block mb-2" style="font-size: 1.1rem;">${p.name}</strong>
                    <p class="mb-3 text-muted">${p.objective || ''}</p>
                    <button id="${btnId}" class="btn btn-sm btn-success w-100" style="font-weight: 600;">\ud83c\udfaf Start Missie</button>
                </div>
            `;            marker.bindPopup(popupContent);

            // wire button when popup opens
            marker.on('popupopen', () => {
                const btn = document.getElementById(btnId);
                if (!btn) return;
                if (btn.dataset.bound) return (btn.dataset.bound = 'true');
                btn.dataset.bound = 'true';
                btn.addEventListener('click', () => {
                    marker.setOpacity(0.5);
                    marker.closePopup();
                    marker.bindPopup(`<div class="p-3 text-center"><strong style="font-size: 1.1rem;">${p.name}</strong><p class="text-success mt-2" style="font-weight: 600;">✅ Missie voltooid!</p></div>`);
                    addXP(xpPerMission);  // award XP for completing mission
                });
            });
        });
    }

    // marker layer to show POI names
    const poiLayer = L.layerGroup().addTo(map);

    // route selector dropdown
    const routeSelect = document.getElementById('routeSelect');
    if (routeSelect) {
        routeSelect.addEventListener('change', (e) => {
            loadRoute(parseInt(e.target.value));
        });
    }

    // reset button clears all waypoints
    const resetBtn = document.getElementById('reset');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            routingControl.setWaypoints([]);
            poiLayer.clearLayers();
        });
    }

    // load first route on startup
    loadRoute(1);
});