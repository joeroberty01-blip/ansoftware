/**
 * Browser GPS that holds up on real phones. One single reading is often a
 * rough first guess (or never comes indoors), so this listens for a few
 * seconds, keeps the most accurate reading, and uses the network/Wi-Fi
 * location when there is no satellite fix.
 */

export interface GeoReading {
  lat: number;
  lng: number;
  accuracy: number;
  /** When it was read (ms), so an old reading is not used for a new check-in. */
  at: number;
}

export type GeoProblem = "denied" | "dismissed" | "unavailable" | "unsupported";

export class GeoError extends Error {
  constructor(
    public kind: GeoProblem,
    message: string
  ) {
    super(message);
  }
}

export const GEO_MESSAGES: Record<GeoProblem, string> = {
  unsupported: "This browser has no GPS. Open the ERP in Google Chrome.",
  denied:
    "Your phone is blocking location for the ERP. Turning on the phone's Location is not enough: follow the steps below.",
  dismissed: 'The location question was closed. Tap again and choose "Allow".',
  unavailable:
    "The phone couldn't get your location. Make sure Location is on, go outside or near a window, then tap again.",
};

/** Readings worse than this are kept but flagged as weak. */
export const WEAK_ACCURACY_M = 200;

export type GeoPermission = "granted" | "denied" | "prompt" | "unknown";

export async function geoPermission(): Promise<GeoPermission> {
  try {
    const status = await navigator.permissions.query({ name: "geolocation" });
    return status.state;
  } catch {
    return "unknown"; // older Safari
  }
}

/** Calls back when the person changes the location permission in their browser. */
export async function watchGeoPermission(onChange: (state: GeoPermission) => void): Promise<void> {
  try {
    const status = await navigator.permissions.query({ name: "geolocation" });
    status.addEventListener("change", () => onChange(status.state));
  } catch {
    // Not supported: the person taps "Get location" instead.
  }
}

const GOOD_ENOUGH_M = 25;

export async function locate(onReading?: (best: GeoReading) => void): Promise<GeoReading> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    throw new GeoError("unsupported", GEO_MESSAGES.unsupported);
  }
  const geo = navigator.geolocation;
  const permission = await geoPermission();

  return new Promise<GeoReading>((resolve, reject) => {
    let best: GeoReading | null = null;
    let done = false;
    let watchId: number | null = null;
    let networkAsked = false;
    let networkFailed = false;
    let watchFailed = false;
    let startedAt = Date.now();
    const timers: ReturnType<typeof setTimeout>[] = [];

    const stop = () => {
      done = true;
      if (watchId != null) geo.clearWatch(watchId);
      timers.forEach(clearTimeout);
    };
    const finish = () => {
      if (done || !best) return;
      stop();
      resolve(best);
    };
    const fail = (kind: GeoProblem) => {
      if (done) return;
      stop();
      reject(new GeoError(kind, GEO_MESSAGES[kind]));
    };
    const refused = async () => {
      // Refused for good, or just closed without choosing?
      const now = await geoPermission();
      fail(now === "prompt" ? "dismissed" : "denied");
    };

    const onPosition = (p: GeolocationPosition) => {
      if (done) return;
      const reading: GeoReading = {
        lat: p.coords.latitude,
        lng: p.coords.longitude,
        accuracy: p.coords.accuracy,
        at: Date.now(),
      };
      if (!best || reading.accuracy <= best.accuracy) {
        best = reading;
        onReading?.(best);
      }
      const waited = Date.now() - startedAt;
      if (best.accuracy <= GOOD_ENOUGH_M || (waited > 8000 && best.accuracy <= 60)) finish();
    };

    const bothFailed = () => {
      if (watchFailed && networkFailed && !best) fail("unavailable");
    };

    const askNetwork = () => {
      if (done || networkAsked) return;
      networkAsked = true;
      geo.getCurrentPosition(
        onPosition,
        (e) => {
          if (e.code === 1) return void refused();
          networkFailed = true;
          bothFailed();
        },
        { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 }
      );
    };

    const listen = () => {
      startedAt = Date.now();
      watchId = geo.watchPosition(
        onPosition,
        (e) => {
          if (done) return;
          if (e.code === 1) return void refused();
          watchFailed = true;
          askNetwork();
          bothFailed();
        },
        { enableHighAccuracy: true, timeout: 25000, maximumAge: 0 }
      );
      const settleIf = (ms: number, worst: number) =>
        timers.push(
          setTimeout(() => {
            if (best && best.accuracy <= worst) finish();
          }, ms)
        );
      settleIf(8000, 60);
      settleIf(14000, 150);
      settleIf(22000, Infinity);
      timers.push(
        setTimeout(() => {
          if (!best) askNetwork();
        }, 4000)
      );
      timers.push(
        setTimeout(() => {
          if (best) finish();
          else fail("unavailable");
        }, 32000)
      );
    };

    if (permission === "granted") {
      listen();
      return;
    }
    // The phone is about to ask for permission: the clock starts only once
    // the person has answered.
    geo.getCurrentPosition(
      (p) => {
        if (done) return;
        listen();
        onPosition(p);
      },
      (e) => {
        if (e.code === 1) return void refused();
        listen();
      },
      { enableHighAccuracy: false, timeout: 60000, maximumAge: 60000 }
    );
  });
}
