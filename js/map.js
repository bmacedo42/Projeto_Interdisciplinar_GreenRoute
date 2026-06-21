


class Map {
    static map = null;
    static markers = [];
    static routes = [];
    static currentTransport = 'car'; // carro, bicicleta, pe, transportes publicos
    static originCoords = null;
    static destinationCoords = null;
    static routeData = {};

    // OpenRouteService configuration (provide your key)
    static ORS_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjEzZjE5MTZiYmQ5ZDQ0NjI5MjJlOTdjNzJlMGY0OGJiIiwiaCI6Im11cm11cjY0In0=';
    static ORS_BASE_URL = 'https://api.openrouteservice.org';

    static CO2_EMISSIONS = { car: 0.192, bicycle: 0, foot: 0, bus: 0.105 };

    static init() {
        console.log('Inicializando mapa com Leaflet + OSM...');
        this.map = L.map('map', { zoomControl: true }).setView([38.7223, -9.1393], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
        }).addTo(this.map);

        // UI events
        const destInput = document.getElementById('destination');
        if (destInput) destInput.addEventListener('input', (e) => this.handleDestinationInput(e.target.value));

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-input-group') && !e.target.closest('.suggestions-dropdown')) {
                const d = document.getElementById('suggestionsDropdown'); if (d) d.style.display = 'none';
            }
        });

        this.getCurrentLocation();

        setTimeout(() => {
            this.map.invalidateSize();
        }, 500);
    }

    static getCurrentLocation() {
        const originEl = document.getElementById('origin');
        if ('geolocation' in navigator) {
            if (originEl) originEl.value = 'Obtendo localização...';
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    this.originCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                    this.addMarker(this.originCoords.lat, this.originCoords.lng, 'Você está aqui', 'origin');
                    if (originEl) originEl.value = 'Minha localização';
                    this.map.setView([this.originCoords.lat, this.originCoords.lng], 13);
                },
                (err) => {
                    console.warn('Geolocation error', err.message);
                    this.originCoords = { lat: 38.7223, lng: -9.1393 };
                    this.addMarker(this.originCoords.lat, this.originCoords.lng, 'Lisboa (padrão)', 'origin');
                    if (originEl) originEl.value = 'Lisboa, Portugal';
                },
                { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
            );
        } else {
            this.originCoords = { lat: 38.7223, lng: -9.1393 };
            this.addMarker(this.originCoords.lat, this.originCoords.lng, 'Lisboa (padrão)', 'origin');
            if (originEl) originEl.value = 'Lisboa, Portugal';
        }
    }

    static addMarker(lat, lng, title, type = 'destination') {

        const iconUrl =
            type === 'origin'
            ? 'Icons/icons/Localizacao.png'
            : 'Icons/icons/Localizacao.png';

        const customIcon = L.icon({
            iconUrl: iconUrl,
            iconSize: [42, 42],
            iconAnchor: [21, 42],
            popupAnchor: [0, -42]
        });

        const marker = L.marker(
            [lat, lng],
            {
                icon: customIcon,
                title: title
            }
        ).addTo(this.map);

        marker.bindPopup(`<strong>${title}</strong>`);

        this.markers.push(marker);

        return marker;
    }

    static async getLocationName(lat, lng) {
        try {
            const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
            const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
            if (!res.ok) return null;
            const data = await res.json();
            return data.display_name || null;
        } catch (err) { console.warn('reverse geocode error', err); return null; }
    }

static async handleDestinationInput(query) {

    const dropdown = document.getElementById('suggestionsDropdown');

    if (!dropdown) return;

    if (!query || query.length < 3) {
        dropdown.style.display = 'none';
        return;
    }

    try {

        const response = await fetch(
            `https://api.openrouteservice.org/geocode/search?api_key=${this.ORS_API_KEY}&text=${encodeURIComponent(query)}&boundary.country=PRT&size=5`
        );

        const data = await response.json();

        if (!data.features || data.features.length === 0) {
            dropdown.style.display = 'none';
            return;
        }

        dropdown.innerHTML = data.features.map(place => {

            const name = place.properties.label;
            const lon = place.geometry.coordinates[0];
            const lat = place.geometry.coordinates[1];

            return `
                <div class="suggestion-item"
                     onclick="Map.selectDestination('${name.replace(/'/g,"\\'")}', ${lat}, ${lon})">
                    ${name}
                </div>
            `;
        }).join('');

        dropdown.style.display = 'block';

    } catch (error) {

        console.error("Erro geocoding:", error);
        dropdown.style.display = 'none';

    }
}

    static selectPrediction() { /* not used with Nominatim dropdown */ }

    static selectDestination(name, lat, lon) {
        const destEl = document.getElementById('destination'); if (destEl) destEl.value = name;
        const dropdown = document.getElementById('suggestionsDropdown'); if (dropdown) dropdown.style.display = 'none';
        this.destinationCoords = { lat: parseFloat(lat), lng: parseFloat(lon) };
        // remove previous destination markers
        this.markers.forEach(m=>{ try{ const p=m.getPopup(); if(!p||!p.getContent||!p.getContent().includes('Você está aqui')) this.map.removeLayer(m);}catch(e){} });
        this.markers = this.markers.filter(m=>{ try{ const p=m.getPopup(); return p&&p.getContent&&p.getContent().includes('Você está aqui'); }catch(e){return false;} });
        this.addMarker(this.destinationCoords.lat, this.destinationCoords.lng, name, 'destination');
    }

    static async searchRoute() {
        const destination = (document.getElementById('destination')||{}).value || '';
        if (!destination || !this.destinationCoords) { Auth.showNotification('Por favor, selecione um destino válido', 'error'); return; }
        if (!this.originCoords) { Auth.showNotification('Localização de origem não disponível', 'error'); return; }

        try {
            this.routes.forEach(route => this.map.removeLayer(route)); this.routes = [];
            Auth.showNotification('Calculando rota...', 'success');
            const routes = await this.calculateRoutes();
            await this.drawRoute(this.currentTransport);
            this.showComparisonTable(routes);
            const user = supabase.getCurrentUser(); if (user) await supabase.insertSearchHistory(user.id, { origin: document.getElementById('origin').value, destination, transport: this.currentTransport });
            Auth.showNotification('Rota calculada com sucesso!', 'success');
        } catch (err) { console.error('searchRoute error', err); Auth.showNotification('Erro ao calcular rota. Veja console.', 'error'); }
    }

    // request ORS route for profile, returns { summary, geometry }
    static async getORSRoute(profile) {
        if (!this.ORS_API_KEY || this.ORS_API_KEY === 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjU3YTUwODQ1YTk4MDRhZjg4MzAxOGRkNjQzNTk3OGUzIiwiaCI6Im11cm11cjY0In0=') throw new Error('OpenRouteService API key not configured (Map.ORS_API_KEY)');
        const url = `${this.ORS_BASE_URL}/v2/directions/${profile}/geojson`;
        const body = { coordinates: [ [this.originCoords.lng, this.originCoords.lat], [this.destinationCoords.lng, this.destinationCoords.lat] ] };
        const res = await fetch(url, { method: 'POST', headers: { 'Authorization': this.ORS_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!res.ok) { const txt = await res.text(); throw new Error(`ORS error ${res.status}: ${txt}`); }
        const data = await res.json();
        if (!data || !data.features || data.features.length === 0) return null;
        const feat = data.features[0];
        const summary = feat.properties && feat.properties.summary ? feat.properties.summary : null;
        const geometry = feat.geometry && feat.geometry.coordinates ? feat.geometry.coordinates : null;
        return { summary, geometry };
    }

    static async drawRoute(transport) {
        try {
            let profile = 'driving-car';
            if (transport === 'bicycle') profile = 'cycling-regular';
            if (transport === 'foot') profile = 'foot-walking';

            const res = await this.getORSRoute(profile);
            if (!res) throw new Error('Nenhuma rota obtida do ORS');
            const coords = res.geometry;
            const latlngs = coords.map(c => [c[1], c[0]]);
            const poly = L.polyline(latlngs, { color: transport==='bicycle'?'#f59e0b':'#10b981', weight: 4, opacity: 0.9 }).addTo(this.map);
            this.routes.push(poly);
            this.map.fitBounds(poly.getBounds(), { padding: [50,50] });
            return res;
        } catch (err) { console.error('drawRoute error', err); throw err; }
    }

    static async calculateRoutes() {
        const routes = {};
        try {
            const car = await this.getORSRoute('driving-car');
            const bike = await this.getORSRoute('cycling-regular');
            const walk = await this.getORSRoute('foot-walking');

            const carDist = car && car.summary ? +(car.summary.distance/1000).toFixed(1) : this.calculateDistance(this.originCoords.lat,this.originCoords.lng,this.destinationCoords.lat,this.destinationCoords.lng);
            const carTime = car && car.summary ? Math.round(car.summary.duration/60) : Math.round((carDist/60)*60);
            routes.car = { transport:'Carro', distance:carDist, time:carTime, co2:(carDist*this.CO2_EMISSIONS.car).toFixed(3) };

            if (bike && bike.summary) { const d=+(bike.summary.distance/1000).toFixed(1); const t=Math.round(bike.summary.duration/60); routes.bicycle={transport:'Bicicleta',distance:d,time:t,co2:(d*this.CO2_EMISSIONS.bicycle).toFixed(3)} } else { routes.bicycle={transport:'Bicicleta',distance:routes.car.distance,time:Math.round((routes.car.distance/20)*60),co2:(routes.car.distance*this.CO2_EMISSIONS.bicycle).toFixed(3)} }

            if (walk && walk.summary) { const d=+(walk.summary.distance/1000).toFixed(1); const t=Math.round(walk.summary.duration/60); routes.foot={transport:'A Pé',distance:d,time:t,co2:(d*this.CO2_EMISSIONS.foot).toFixed(3)} } else { routes.foot={transport:'A Pé',distance:routes.car.distance,time:Math.round((routes.car.distance/5)*60),co2:(routes.car.distance*this.CO2_EMISSIONS.foot).toFixed(3)} }

            routes.bus = { transport:'Transporte Público', distance:routes.car.distance, time:Math.round((routes.car.distance/40)*60), co2:(routes.car.distance*this.CO2_EMISSIONS.bus).toFixed(3) };

            this.routeData = { car, bicycle:bike, foot:walk };
            return routes;
        } catch (err) {
            console.warn('ORS failure, fallback to estimates', err);
            const distance = this.calculateDistance(this.originCoords.lat,this.originCoords.lng,this.destinationCoords.lat,this.destinationCoords.lng);
            const fallback = {
                car:{transport:'Carro',distance,time:Math.round((distance/60)*60),co2:(distance*this.CO2_EMISSIONS.car).toFixed(3)},
                bicycle:{transport:'Bicicleta',distance,time:Math.round((distance/20)*60),co2:(distance*this.CO2_EMISSIONS.bicycle).toFixed(3)},
                foot:{transport:'A Pé',distance,time:Math.round((distance/5)*60),co2:(distance*this.CO2_EMISSIONS.foot).toFixed(3)},
                bus:{transport:'Transporte Público',distance,time:Math.round((distance/40)*60),co2:(distance*this.CO2_EMISSIONS.bus).toFixed(3)}
            };
            this.routeData = fallback; return fallback;
        }
    }

    // Haversine distance in km (one decimal)
    static calculateDistance(lat1, lng1, lat2, lng2) {
        const R=6371; const dLat=(lat2-lat1)*Math.PI/180; const dLng=(lng2-lng1)*Math.PI/180; const a=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)*Math.sin(dLng/2); const c=2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)); return parseFloat((R*c).toFixed(1));
    }

    static showComparisonTable(routes) {
        const table = document.getElementById('comparisonTable'); const tableBody = document.getElementById('comparisonTableBody'); if (!table||!tableBody) return;
        let mostEco = Object.keys(routes).reduce((a,b)=>parseFloat(routes[a].co2)<parseFloat(routes[b].co2)?a:b);
        tableBody.innerHTML = Object.entries(routes).map(([key,data])=>{const isEco=key===mostEco;const rowClass=isEco?'eco-highlight':'';return `<tr class="${rowClass}"><td>${data.transport}</td><td>${data.time} min</td><td>${data.distance} km</td><td>${data.co2} kg</td></tr>`}).join('');
        const ecoBadge=document.getElementById('ecoBadge');const ecoBadgeText=document.getElementById('ecoBadgeText'); if (ecoBadge&&ecoBadgeText){ecoBadgeText.textContent=`${routes[mostEco].transport} é a opção mais ecológica! 🌱`;ecoBadge.style.display='flex';}
        table.style.display='block'; const mapInfo=document.getElementById('mapInfo'); const destination=document.getElementById('destination').value; const routeInfo=document.getElementById('routeInfo'); if(routeInfo) routeInfo.innerHTML=`<strong>Rota:</strong> ${destination}<br><strong>Distância:</strong> ${routes[mostEco].distance} km<br><strong>Tempo:</strong> ${routes[mostEco].time} minutos<br><strong>CO₂:</strong> ${routes[mostEco].co2} kg`; if(mapInfo) mapInfo.style.display='block';
    }

    static updateTransport(transport) { this.currentTransport = transport; if (this.destinationCoords && this.originCoords) { this.routes.forEach(r=>this.map.removeLayer(r)); this.routes=[]; this.drawRoute(transport).catch(e=>console.error('Erro ao redesenhar rota',e)); } }

    static async addToFavorites() { const user = supabase.getCurrentUser(); if (!user) { Auth.showNotification('Deve fazer login para guardar favoritos','error'); Auth.showLoginModal(); return; } try { const favorite={origin:document.getElementById('origin').value,destination:document.getElementById('destination').value,transport:this.currentTransport}; await supabase.insertFavorite(user.id,favorite); Auth.showNotification('Rota adicionada aos favoritos!','success'); } catch(e){ console.error('addToFavorites',e); Auth.showNotification('Erro ao adicionar favorito','error'); } }

    static clearRoute() {
        this.routes.forEach(r=>this.map.removeLayer(r)); this.routes=[];
        // remove destination markers but keep origin
        this.markers.forEach(m=>{ try{ const popup=m.getPopup(); if(popup && popup.getContent && popup.getContent().includes('Você está aqui')){} else this.map.removeLayer(m);}catch(e){} });
        this.markers = this.markers.filter(m=>{ try{return m.getPopup() && m.getPopup().getContent && m.getPopup().getContent().includes('Você está aqui')}catch(e){return false;} });
        const destEl=document.getElementById('destination'); if(destEl) destEl.value=''; const dropdown=document.getElementById('suggestionsDropdown'); if(dropdown) dropdown.style.display='none'; const table=document.getElementById('comparisonTable'); if(table) table.style.display='none'; const mapInfo=document.getElementById('mapInfo'); if(mapInfo) mapInfo.style.display='none'; if(this.originCoords) this.map.setView([this.originCoords.lat,this.originCoords.lng],13); 
    }
}

document.addEventListener('DOMContentLoaded', ()=>{ try{ Map.init(); } catch(e){ console.error('Map init failed', e); } });

window.addEventListener('resize', () => {

    if (Map.map) {

        setTimeout(() => {
            Map.map.invalidateSize();
        }, 300);

    }

});

window.addEventListener('resize', () => {
    if (Map.map) {
        setTimeout(() => {
            Map.map.invalidateSize();
        }, 200);
    }
});