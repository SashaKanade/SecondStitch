/* Find SecondStitch — geolocation + nearby stores map */

const RADIUS_KM = 10;

const STORE_TEMPLATES = [
  { name: "Thread & Needle Co.", address: "Craft District" },
  { name: "Patch Haus", address: "Market Row" },
  { name: "Stitch & Co.", address: "Arts Walk" },
  { name: "Ember Embroideries", address: "Studio Lane" },
  { name: "The Mending Room", address: "Harbor Street" },
  { name: "Vintage Thread Supply", address: "Old Town Square" },
  { name: "Canvas Collective", address: "Design Quarter" },
  { name: "Second Hand Studio", address: "Greenway Ave" },
];

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Offset lat/lng by roughly `km` in a given bearing (degrees). */
function offsetLatLng(lat, lng, km, bearingDeg) {
  const R = 6371;
  const br = toRad(bearingDeg);
  const lat1 = toRad(lat);
  const lng1 = toRad(lng);
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(km / R) +
      Math.cos(lat1) * Math.sin(km / R) * Math.cos(br)
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(br) * Math.sin(km / R) * Math.cos(lat1),
      Math.cos(km / R) - Math.sin(lat1) * Math.sin(lat2)
    );
  return { lat: (lat2 * 180) / Math.PI, lng: (lng2 * 180) / Math.PI };
}

function buildStoresNear(lat, lng) {
  const bearings = [20, 75, 130, 185, 230, 290, 340, 45];
  const distances = [1.2, 2.8, 4.1, 5.5, 6.8, 8.2, 9.4, 3.5];

  return STORE_TEMPLATES.map((template, i) => {
    const pos = offsetLatLng(lat, lng, distances[i], bearings[i]);
    const distance = haversineKm(lat, lng, pos.lat, pos.lng);
    return {
      ...template,
      lat: pos.lat,
      lng: pos.lng,
      distance,
    };
  })
    .filter((s) => s.distance <= RADIUS_KM)
    .sort((a, b) => a.distance - b.distance);
}

function setStatus(text) {
  const el = document.getElementById("map-status");
  if (el) el.textContent = text;
}

function renderStoreList(stores) {
  const list = document.getElementById("store-list");
  if (!list) return;

  if (!stores.length) {
    list.innerHTML =
      '<p class="lede" style="text-align:center;margin:0 auto">No retailers within 10 km right now. Try again from a different area, or contact us for stockists.</p>';
    return;
  }

  list.innerHTML = stores
    .map(
      (s) => `
      <article class="store-item">
        <div>
          <div class="store-item__name">${s.name}</div>
          <div class="store-item__meta">${s.address}</div>
        </div>
        <div class="store-item__dist">${s.distance.toFixed(1)} km</div>
      </article>`
    )
    .join("");
}

function initMap(lat, lng, stores) {
  const mapEl = document.getElementById("store-map");
  if (!mapEl || typeof L === "undefined") return null;

  const map = L.map(mapEl, { scrollWheelZoom: false }).setView([lat, lng], 12);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map);

  const youIcon = L.divIcon({
    className: "",
    html: '<div style="width:18px;height:18px;border-radius:50%;background:#5c6ef0;border:3px solid #fff;box-shadow:0 4px 12px rgba(92,110,240,.45)"></div>',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

  L.marker([lat, lng], { icon: youIcon })
    .addTo(map)
    .bindPopup("You are here");

  const storeIcon = L.divIcon({
    className: "",
    html: '<div class="ss-marker"></div>',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

  const bounds = [[lat, lng]];

  stores.forEach((s) => {
    L.marker([s.lat, s.lng], { icon: storeIcon })
      .addTo(map)
      .bindPopup(`<strong>${s.name}</strong><br>${s.address}<br>${s.distance.toFixed(1)} km away`);
    bounds.push([s.lat, s.lng]);
  });

  L.circle([lat, lng], {
    radius: RADIUS_KM * 1000,
    color: "#7b8cff",
    weight: 3,
    fillColor: "#ff6eb4",
    fillOpacity: 0.1,
  }).addTo(map);

  if (bounds.length > 1) {
    map.fitBounds(bounds, { padding: [40, 40] });
  }

  setTimeout(() => map.invalidateSize(), 200);
  return map;
}

function showMapSection() {
  const section = document.getElementById("map-section");
  if (section) section.hidden = false;
}

function hideModal() {
  const modal = document.getElementById("location-modal");
  if (modal) {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
  }
}

function openModal() {
  const modal = document.getElementById("location-modal");
  if (modal) {
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
  }
}

function onLocationSuccess(position) {
  hideModal();
  showMapSection();

  const { latitude: lat, longitude: lng } = position.coords;
  const stores = buildStoresNear(lat, lng);

  setStatus(
    stores.length
      ? `Showing ${stores.length} stockist${stores.length === 1 ? "" : "s"} within ${RADIUS_KM} km of you.`
      : `We couldn't find stockists within ${RADIUS_KM} km of your location.`
  );

  renderStoreList(stores);
  initMap(lat, lng, stores);
}

function onLocationError(error) {
  hideModal();
  showMapSection();

  let msg = "We couldn't access your location.";
  if (error && error.code === 1) {
    msg = "Location permission was denied. Enable it in your browser settings to find nearby stores.";
  } else if (error && error.code === 2) {
    msg = "Your location is currently unavailable. Please try again.";
  } else if (error && error.code === 3) {
    msg = "Location request timed out. Please try again.";
  }

  setStatus(msg);
  renderStoreList([]);

  // Fallback map centered on a default city so the page still feels complete
  const fallback = { lat: 43.6532, lng: -79.3832 };
  initMap(fallback.lat, fallback.lng, []);
}

function requestLocation() {
  if (!navigator.geolocation) {
    onLocationError({ code: 2 });
    return;
  }

  setStatus("Locating you…");
  showMapSection();

  navigator.geolocation.getCurrentPosition(onLocationSuccess, onLocationError, {
    enableHighAccuracy: true,
    timeout: 12000,
    maximumAge: 60000,
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const allowBtn = document.getElementById("allow-location");
  const denyBtn = document.getElementById("deny-location");
  const retryBtn = document.getElementById("retry-location");

  openModal();

  allowBtn?.addEventListener("click", () => {
    requestLocation();
  });

  denyBtn?.addEventListener("click", () => {
    hideModal();
    showMapSection();
    setStatus("Location access was declined. You can still browse the map once you allow access.");
    renderStoreList([]);
  });

  retryBtn?.addEventListener("click", () => {
    openModal();
  });
});
