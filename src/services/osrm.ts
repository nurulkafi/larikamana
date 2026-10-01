import { Waypoint } from '@/types/route';

export interface RouteResult {
  coordinates: [number, number][]; // [lat, lng]
  snappedWaypoints?: [number, number][]; // [lat, lng]
  distance: number; // in meters
  duration: number; // in seconds
}

// Calculate straight-line distance between 2 points via Haversine formula (meters)
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate total distance for an array of [lat, lng] coordinates
export function calculatePolylineDistance(coords: [number, number][]): number {
  let total = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    total += haversineDistance(
      coords[i][0],
      coords[i][1],
      coords[i + 1][0],
      coords[i + 1][1]
    );
  }
  return total;
}

/**
 * Trims unnatural U-turn overshoot spurs at the end of a segment.
 * If the path reaches within 35m of w2, but continues > 45m to an intersection and doubles back,
 * we trim the loop and end cleanly at w2.
 */
function trimEndOvershoot(
  coords: [number, number][],
  w2: { lat: number; lng: number }
): [number, number][] {
  if (coords.length < 5) return coords;

  let minDistance = Infinity;
  let minIndex = -1;

  for (let i = 0; i < coords.length - 2; i++) {
    const d = haversineDistance(coords[i][0], coords[i][1], w2.lat, w2.lng);
    if (d < minDistance) {
      minDistance = d;
      minIndex = i;
    }
  }

  if (minIndex > 0 && minDistance < 35 && minIndex < coords.length - 3) {
    let maxSubsequentDist = 0;
    for (let i = minIndex + 1; i < coords.length; i++) {
      const d = haversineDistance(coords[i][0], coords[i][1], w2.lat, w2.lng);
      if (d > maxSubsequentDist) {
        maxSubsequentDist = d;
      }
    }

    if (maxSubsequentDist > 45) {
      const trimmed = coords.slice(0, minIndex + 1);
      trimmed.push([w2.lat, w2.lng]);
      return trimmed;
    }
  }

  return coords;
}

/**
 * Route a single segment between two consecutive waypoints.
 * Smartly detects and prunes disconnected OSM roads, portals, gates, and median detours.
 */
async function routeSingleSegment(
  w1: Waypoint,
  w2: Waypoint,
  isFirstSegment: boolean,
  isLastSegment: boolean
): Promise<{ coordinates: [number, number][]; distance: number; duration: number }> {
  const straightDist = haversineDistance(w1.lat, w1.lng, w2.lat, w2.lng);

  if (straightDist < 2) {
    return {
      coordinates: [
        [w1.lat, w1.lng],
        [w2.lat, w2.lng],
      ],
      distance: straightDist,
      duration: 1,
    };
  }

  try {
    const url = `https://router.project-osrm.org/route/v1/foot/${w1.lng},${w1.lat};${w2.lng},${w2.lat}?overview=full&geometries=geojson&continue_straight=default`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`OSRM error status: ${res.status}`);

    const data = await res.json();

    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const osrmDist = route.distance;

      // DETOUR & ONE-WAY RESTRICTION DETECTION:
      // For runners, small curves (< 40m, like roundabouts) are normal up to 75m.
      // But if OSRM adds > 30m detour and ratio > 1.35x, it means OSRM is enforcing
      // vehicle one-way rules, residential access=private restrictions, or median barriers!
      const isShortCurve = straightDist < 40 && osrmDist < 75;
      const isAbsurdDetour =
        !isShortCurve && osrmDist > straightDist * 1.35 && osrmDist - straightDist > 30;

      if (!isAbsurdDetour) {
        let coords: [number, number][] = route.geometry.coordinates.map(
          (c: [number, number]) => [c[1], c[0]]
        );

        if (isLastSegment) {
          coords = trimEndOvershoot(coords, w2);
        }

        // Only attach off-road sticks to w1 if it's the very first point of the entire route
        if (isFirstSegment && coords.length > 0) {
          const startGap = haversineDistance(w1.lat, w1.lng, coords[0][0], coords[0][1]);
          if (startGap > 25) {
            coords.unshift([w1.lat, w1.lng]);
          } else {
            coords[0] = [w1.lat, w1.lng];
          }
        }

        // Only attach off-road sticks to w2 if it's the very last point of the entire route
        if (isLastSegment && coords.length > 0) {
          const endGap = haversineDistance(
            w2.lat,
            w2.lng,
            coords[coords.length - 1][0],
            coords[coords.length - 1][1]
          );
          if (endGap > 25) {
            coords.push([w2.lat, w2.lng]);
          } else {
            coords[coords.length - 1] = [w2.lat, w2.lng];
          }
        }

        const calculatedDist = Math.round(calculatePolylineDistance(coords));

        return {
          coordinates: coords,
          distance: calculatedDist,
          duration: Math.round(calculatedDist / 2.8),
        };
      }
    }
  } catch (err) {
    // Network fallback
  }

  // Direct connection fallback for blocked or disconnected segments
  return {
    coordinates: [
      [w1.lat, w1.lng],
      [w2.lat, w2.lng],
    ],
    distance: straightDist,
    duration: Math.round(straightDist / 2.8),
  };
}

/**
 * Fetch pedestrian route for all waypoints.
 * 1. Checks global route sanity (no 10km detours on disconnected segments).
 * 2. Routes segment-by-segment in parallel, catching broken OSM ways and gates.
 */
export async function fetchPedestrianRoute(
  waypoints: Waypoint[]
): Promise<RouteResult> {
  if (waypoints.length < 2) {
    return {
      coordinates: waypoints.map((w) => [w.lat, w.lng]),
      distance: 0,
      duration: 0,
    };
  }

  // Calculate total straight line baseline
  let totalStraightDist = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    totalStraightDist += haversineDistance(
      waypoints[i].lat,
      waypoints[i].lng,
      waypoints[i + 1].lat,
      waypoints[i + 1].lng
    );
  }

  // 1. Try global continuous route first IF total points are within limits
  if (waypoints.length <= 15) {
    try {
      const coordString = waypoints.map((w) => `${w.lng},${w.lat}`).join(';');
      const url = `https://router.project-osrm.org/route/v1/foot/${coordString}?overview=full&geometries=geojson&continue_straight=default`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4500);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const totalDist = route.distance;

          // Only accept global route if it doesn't take an insane detour through another neighborhood
          const isGlobalDetour =
            totalDist > totalStraightDist * 1.8 && totalDist - totalStraightDist > 120;

          if (!isGlobalDetour) {
            let coords: [number, number][] = route.geometry.coordinates.map(
              (c: [number, number]) => [c[1], c[0]]
            );

            coords = trimEndOvershoot(coords, waypoints[waypoints.length - 1]);

            const finalDist = Math.round(calculatePolylineDistance(coords));

            return {
              coordinates: coords,
              distance: finalDist,
              duration: Math.round(finalDist / 2.8),
            };
          }
        }
      }
    } catch (err) {
      console.warn('Global route failed, falling back to segment routing:', err);
    }
  }

  // 2. Segment-by-segment routing (handles broken OSM gates & medians cleanly)
  const segmentPromises: Promise<{
    coordinates: [number, number][];
    distance: number;
    duration: number;
  }>[] = [];

  for (let i = 0; i < waypoints.length - 1; i++) {
    segmentPromises.push(
      routeSingleSegment(
        waypoints[i],
        waypoints[i + 1],
        i === 0,
        i === waypoints.length - 2
      )
    );
  }

  const segmentResults = await Promise.all(segmentPromises);

  const mergedCoordinates: [number, number][] = [];
  let totalDistance = 0;
  let totalDuration = 0;

  segmentResults.forEach((seg, idx) => {
    totalDistance += seg.distance;
    totalDuration += seg.duration;

    if (idx === 0) {
      mergedCoordinates.push(...seg.coordinates);
    } else {
      mergedCoordinates.push(...seg.coordinates.slice(1));
    }
  });

  return {
    coordinates: mergedCoordinates,
    distance: Math.round(totalDistance),
    duration: Math.round(totalDuration),
  };
}
