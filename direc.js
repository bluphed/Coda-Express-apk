// ============================================
// VARIABLES GLOBALES
// ============================================
let map;
let markerRestaurante;
let markerCliente;
// Coordenadas más precisas para La Cremita
let restaurantePos = { lat: -0.245197, lng: -79.158230 };
let clientePos = null;
let geocoder;

const LOCALES = {
    cremita: { lat: -0.245197, lng: -79.158230, nombre: "La Cremita" }
};

// ============================================
// INICIALIZACIÓN DEL MAPA
// ============================================
function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        center: restaurantePos,
        zoom: 14,
        gestureHandling: 'greedy',
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        styles: [{ "featureType": "poi", "stylers": [{ "visibility": "off" }] }]
    });

    geocoder = new google.maps.Geocoder();

    markerRestaurante = new google.maps.Marker({
        position: restaurantePos,
        map: map,
        title: "Local",
        icon: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
    });

    map.addListener("click", (e) => {
        setCliente(e.latLng);
    });

    document.getElementById('localSelect').addEventListener('change', function() {
        const val = this.value;
        if (LOCALES[val]) {
            restaurantePos = LOCALES[val];
            markerRestaurante.setPosition(restaurantePos);
            map.panTo(restaurantePos);
        } else if (val === 'custom') {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        restaurantePos = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude
                        };
                        markerRestaurante.setPosition(restaurantePos);
                        map.setCenter(restaurantePos);
                        map.setZoom(16);
                    },
                    () => alert("No se pudo obtener tu ubicación")
                );
            }
        }
    });

    lucide.createIcons();
}

function setCliente(latLng) {
    if (markerCliente) {
        markerCliente.setPosition(latLng);
    } else {
        markerCliente = new google.maps.Marker({
            position: latLng,
            map: map,
            title: "Cliente",
            icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
            draggable: true
        });
        markerCliente.addListener('dragend', function() {
            const pos = markerCliente.getPosition();
            clientePos = { lat: pos.lat(), lng: pos.lng() };
            actualizarDireccion(pos);
        });
    }
    clientePos = { lat: latLng.lat(), lng: latLng.lng() };
    actualizarDireccion(latLng);
}

function actualizarDireccion(latLng) {
    geocoder.geocode({ location: latLng }, (results, status) => {
        if (status === "OK" && results[0]) {
            document.getElementById('direccion').value = results[0].formatted_address;
        }
    });
}

// ============================================
// PROCESAR LINK DE GOOGLE MAPS
// ============================================
function procesarLinkMaps(event) {
    const link = document.getElementById('mapsLink').value.trim();
    if (!link) {
        alert("❌ Por favor, pega un link de Google Maps");
        return;
    }

    const btn = event.currentTarget;
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<span class="loading"></span>';
    btn.disabled = true;

    const inputField = document.getElementById('mapsLink');
    const originalPlaceholder = inputField.placeholder;
    inputField.placeholder = 'Procesando link...';

    extraerCoordenadasDeLink(link)
        .then(coords => {
            if (coords) {
                const latLng = new google.maps.LatLng(coords.lat, coords.lng);
                map.setCenter(latLng);
                map.setZoom(18);
                setCliente(latLng);
                inputField.value = '';
                inputField.placeholder = originalPlaceholder;
                alert("✅ Ubicación encontrada y marcada en el mapa");
            } else {
                inputField.placeholder = originalPlaceholder;
                const userConfirmed = confirm(
                    "❌ No se pudo leer el link automáticamente.\n\n" +
                    "¿Quieres abrir el enlace en una nueva pestaña para copiar las coordenadas manualmente?\n" +
                    "(Luego puedes copiar las coordenadas @lat,lng de la barra de direcciones)"
                );
                if (userConfirmed) {
                    window.open(link, '_blank');
                }
            }
        })
        .catch(error => {
            console.error("Error:", error);
            inputField.placeholder = originalPlaceholder;
            alert("❌ Error al procesar el link: " + error.message);
        })
        .finally(() => {
            btn.innerHTML = originalHtml;
            btn.disabled = false;
        });
}

async function extraerCoordenadasDeLink(link) {
    try {
        const response = await fetch(link, { method: 'HEAD', redirect: 'follow' });
        const finalUrl = response.url;
        console.log("URL final:", finalUrl);
        const coords = extraerCoordenadasDeUrl(finalUrl);
        if (coords) return coords;
    } catch (error) {
        console.warn("No se pudo seguir redirección, intentando extraer del link original:", error);
    }
    return extraerCoordenadasDeUrl(link);
}

function extraerCoordenadasDeUrl(url) {
    const patrones = [
        /@(-?\d+\.\d+),(-?\d+\.\d+)/,
        /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,
        /\/place\/[^@]*@(-?\d+\.\d+),(-?\d+\.\d+)/,
        /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
        /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/,
        /[?&]center=(-?\d+\.\d+),(-?\d+\.\d+)/
    ];
    for (let patron of patrones) {
        const match = url.match(patron);
        if (match) {
            return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
        }
    }
    return null;
}

// ============================================
// CALCULO DE COSTO
// ============================================
function calcular() {
    if (!clientePos) {
        alert("Por favor, marca la ubicación del cliente en el mapa.");
        return;
    }

    const dist = google.maps.geometry.spherical.computeDistanceBetween(
        new google.maps.LatLng(restaurantePos.lat, restaurantePos.lng),
        new google.maps.LatLng(clientePos.lat, clientePos.lng)
    );
    const km = dist / 1000;

    let total = 2.00;
    let detalle = `Base $2.00 (1.4 km)`;
    
    if (km > 1.4) {
        const kmExtras = km - 1.4;
        const segmentos = Math.ceil(kmExtras / 0.7);
        const extraTotal = segmentos * 0.25;
        total = 2.00 + extraTotal;
        detalle = `Base + ${segmentos}×700m → $${extraTotal.toFixed(2)} extra`;
    }

    total = Math.ceil(total * 4) / 4;

    document.getElementById('costoFinal').innerText = `$${total.toFixed(2)}`;
    document.getElementById('distanciaTexto').innerText = `Distancia: ${km.toFixed(2)} km`;
    document.getElementById('detalleCosto').innerText = detalle;
    document.getElementById('resultadoCard').classList.remove('hidden');
    document.getElementById('resultadoCard').scrollIntoView({ behavior: 'smooth' });
}

// ============================================
// ENVIAR WHATSAPP
// ============================================
function enviarWhatsApp() {
    if (!clientePos) {
        alert("Primero debes calcular el costo.");
        return;
    }
    const nombre = document.getElementById('nombre').value || "Cliente";
    const tel = document.getElementById('telefono').value || "No provisto";
    const dir = document.getElementById('direccion').value || "Ver mapa";
    const costo = document.getElementById('costoFinal').innerText;
    const dist = document.getElementById('distanciaTexto').innerText;
    const detalle = document.getElementById('detalleCosto').innerText;
    
    const localSelect = document.getElementById('localSelect');
    const localName = localSelect.options[localSelect.selectedIndex].text;

    const mapsLink = `https://www.google.com/maps?q=${clientePos.lat},${clientePos.lng}`;

    const mensaje = `*NUEVO PEDIDO DELIVERY*%0A%0A` +
        `*Local:* ${localName}%0A` +
        `*Cliente:* ${nombre}%0A` +
        `*Teléfono:* ${tel}%0A` +
        `*Dirección:* ${dir}%0A%0A` +
        `*Costo:* ${costo}%0A` +
        `*${dist}*%0A` +
        `*Detalle:* ${detalle}%0A%0A` +
        `*Ubicación en Maps:* ${mapsLink}`;

    window.open(`https://wa.me/593959698463?text=${mensaje}`, '_blank');
}

// ============================================
// RESET AL RECARGAR PÁGINA
// ============================================
window.addEventListener('load', function() {
    if (markerCliente) {
        markerCliente.setMap(null);
        markerCliente = null;
    }
    clientePos = null;
    restaurantePos = LOCALES.cremita;
    if (markerRestaurante) {
        markerRestaurante.setPosition(restaurantePos);
    }
    document.getElementById('nombre').value = '';
    document.getElementById('telefono').value = '';
    document.getElementById('direccion').value = '';
    document.getElementById('mapsLink').value = '';
    document.getElementById('resultadoCard').classList.add('hidden');
    if (map) {
        map.setCenter(restaurantePos);
        map.setZoom(14);
    }
    console.log("Página refrescada correctamente");
});