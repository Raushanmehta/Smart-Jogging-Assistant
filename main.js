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

// ✅ Network Information API
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

// ✅ Duration format
function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ✅ Distance calculator
function calcDistance(lat1, lon1, lat2, lon2) {
  const toRad = deg => deg * Math.PI / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ✅ Draw canvas route
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
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);

    ctx.fillStyle = i === 0 ? "#fd7e14" : "#1e6b7b";
    ctx.beginPath();
    ctx.arc(x, y, i === 0 ? 6 : 4, 0, 2 * Math.PI);
    ctx.fill();
  });

  ctx.stroke();
}

// ✅ Update total distance
function updateDistance() {
  let dist = 0;
  for (let i = 1; i < positions.length; i++) {
    dist += calcDistance(
      positions[i - 1].lat, positions[i - 1].lon,
      positions[i].lat, positions[i].lon
    );
  }
  distanceSpan.textContent = dist.toFixed(1);
}

// ✅ Start jogging
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
      positions.push({ lat: latitude, lon: longitude });
      drawRoute();
      updateDistance();
    },
    err => errorMsg.textContent = "Location error: " + err.message,
    { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
  );

  // ✅ Background Tasks API (optional)
  if ('BackgroundTask' in window) {
    BackgroundTask.requestPermission().then(permission => {
      if (permission === 'granted') {
        BackgroundTask.run(() => {
          // Add background logic here
        });
      }
    });
  }
}

// ✅ Stop jogging
function stopJogging() {
  jogging = false;
  startBtn.disabled = false;
  stopBtn.disabled = true;
  if (timerInterval) clearInterval(timerInterval);
  if (watchId) navigator.geolocation.clearWatch(watchId);
  errorMsg.textContent = "";
}

startBtn.addEventListener("click", startJogging);
stopBtn.addEventListener("click", stopJogging);

// ✅ Intersection Observer
if ('IntersectionObserver' in window) {
  const statsElem = document.querySelector('.stats');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      statsElem.style.background = entry.isIntersecting ? "#d0f2ff" : "#fff";
    });
  }, { threshold: 0.6 });
  observer.observe(statsElem);
}
