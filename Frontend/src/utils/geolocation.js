const TARGET_ACCURACY_METERS = 200;
const LOCATION_TIMEOUT_MS = 20000;

export function getCurrentPosition(options = {}) {
  const targetAccuracy =
    options.targetAccuracyMeters ?? TARGET_ACCURACY_METERS;
  const timeoutMs = options.timeoutMs ?? LOCATION_TIMEOUT_MS;

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported on this device.'));
      return;
    }

    let bestPosition = null;
    let settled = false;
    let watchId = null;

    const finish = (position) => {
      if (settled) return;
      settled = true;
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
      resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        capturedAt: new Date(position.timestamp || Date.now()).toISOString(),
      });
    };

    const fail = (err) => {
      if (settled) return;
      if (bestPosition) {
        finish(bestPosition);
        return;
      }
      settled = true;
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
      if (err.code === 1) {
        reject(new Error('Location permission denied. Allow location access to mark attendance.'));
      } else if (err.code === 2) {
        reject(new Error('Location unavailable. Turn on device location/Wi-Fi and try again.'));
      } else if (err.code === 3) {
        reject(new Error('Location request timed out. Please try again near a window or outdoors.'));
      } else {
        reject(new Error(err.message || 'Could not get your location.'));
      }
    };

    const acceptIfGoodEnough = (pos) => {
      if (!bestPosition || pos.coords.accuracy < bestPosition.coords.accuracy) {
        bestPosition = pos;
      }
      if (pos.coords.accuracy <= targetAccuracy) {
        finish(pos);
      }
    };

    const timer = window.setTimeout(() => {
      if (bestPosition) finish(bestPosition);
      else fail({ code: 3 });
    }, timeoutMs);

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        acceptIfGoodEnough(pos);
        if (settled) window.clearTimeout(timer);
      },
      (err) => {
        window.clearTimeout(timer);
        fail(err);
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 }
    );
  });
}
