const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const networkType = document.getElementById("networkType");
const networkSpeed = document.getElementById("networkSpeed");
const routeCanvas = document.getElementById("routeCanvas");
const ctx = routeCanvas.getContext("2d");
const durationSpan = document.getElementById("duration");
const distanceSpan = document.getElementById("distance");
const errorMsg = document.getElementById("errorMsg");

let jogging = false;
let positions = [];
let startTime = null;
let timerInterval = null;
let watchId = null;

// ✅ Network Info
function updateNetworkStatus() {
  if ('connection' in navigator) {
    const conn = navigator.connection;
    networkType.textContent = `Connection Type: ${conn.effectiveType}`;
    networkSpeed.textContent = `Download Speed: ${conn.downlink} Mbps`;
    conn.addEventListener('change', updateNetworkStatus);
  } else {
    networkType.textContent = `Network info unavailable`;
    networkSpeed.textContent = ``;
  }
}
updateNetworkStatus();

// ✅ Format time
function formatDuration(ms) {
  const total = Math.floor(ms / 1000);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ✅ Calculate distance
function calcDistance(lat1, lon1, lat2, lon2) {
  const toRad = deg => deg * Math.PI / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ✅ Draw line only
function drawRoute() {
  ctx.clearRect(0, 0, routeCanvas.width, routeCanvas.height);
  if (positions.length < 2) return;

  const lats = positions.map(p => p.lat);
  const lons = positions.map(p => p.lon);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLon = Math.min(...lons), maxLon = Math.max(...lons);
  const pad = 20;

  const norm = (val, min, max, size) => {
    if (max === min) return size / 2;
    return pad + ((val - min) / (max - min)) * (size - 2 * pad);
  };

  ctx.beginPath();
  ctx.strokeStyle = "#1e6b7b";
  ctx.lineWidth = 3;

  positions.forEach((pos, i) => {
    const x = norm(pos.lon, minLon, maxLon, routeCanvas.width);
    const y = routeCanvas.height - norm(pos.lat, minLat, maxLat, routeCanvas.height);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });

  ctx.stroke();
}

// ✅ Update distance
function updateDistance() {
  let dist = 0;
  const MIN_STEP = 2; // Ignore noise
  for (let i = 1; i < positions.length; i++) {
    const step = calcDistance(
      positions[i - 1].lat, positions[i - 1].lon,
      positions[i].lat, positions[i].lon
    );
    if (step > MIN_STEP) dist += step;
  }
  distanceSpan.textContent = dist.toFixed(1);
}

// ✅ Start
function startJogging() {
  if (!navigator.geolocation) {
    errorMsg.textContent = "Geolocation not supported!";
    return;
  }

  jogging = true;
  startBtn.disabled = true;
  stopBtn.disabled = false;
  errorMsg.textContent = "";
  positions = [];
  startTime = Date.now();
  durationSpan.textContent = "0:00";
  distanceSpan.textContent = "0";
  drawRoute();

  timerInterval = setInterval(() => {
    durationSpan.textContent = formatDuration(Date.now() - startTime);
  }, 1000);

  watchId = navigator.geolocation.watchPosition(
    pos => {
      const { latitude, longitude } = pos.coords;
      const last = positions[positions.length - 1];
      if (!last || last.lat !== latitude || last.lon !== longitude) {
        positions.push({ lat: latitude, lon: longitude });
        drawRoute();
        updateDistance();
      }
    },
    err => errorMsg.textContent = "Location error: " + err.message,
    { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
  );
}

// ✅ Stop
function stopJogging() {
  jogging = false;
  startBtn.disabled = false;
  stopBtn.disabled = true;
  if (timerInterval) clearInterval(timerInterval);
  if (watchId) navigator.geolocation.clearWatch(watchId);
  errorMsg.textContent = "";
}

// ✅ Event Listeners
startBtn.addEventListener("click", startJogging);
stopBtn.addEventListener("click", stopJogging);

// ✅ IntersectionObserver (background effect)
if ('IntersectionObserver' in window) {
  const statsElem = document.querySelector('.stats');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      statsElem.style.background = entry.isIntersecting ? "#d0f2ff" : "#f4f4f4";
    });
  }, { threshold: 0.6 });
  observer.observe(statsElem);
}
