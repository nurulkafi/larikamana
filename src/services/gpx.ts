import { Waypoint } from '@/types/route';

/**
 * Generate GPX 1.1 XML string for Garmin, Strava, Apple Watch, Coros.
 */
export function generateGPX(
  routeName: string,
  coordinates: [number, number][],
  waypoints: Waypoint[],
  elevations?: number[]
): string {
  const timestamp = new Date().toISOString();
  const safeName = routeName.replace(/[<>&'"]/g, '');

  let trkptsXml = '';
  coordinates.forEach((coord, idx) => {
    const lat = coord[0].toFixed(6);
    const lon = coord[1].toFixed(6);
    const eleXml =
      elevations && elevations[idx] !== undefined
        ? `\n        <ele>${elevations[idx].toFixed(1)}</ele>`
        : '';
    trkptsXml += `      <trkpt lat="${lat}" lon="${lon}">${eleXml}
      </trkpt>\n`;
  });

  let wptXml = '';
  waypoints.forEach((wpt, idx) => {
    const label =
      idx === 0
        ? 'Start'
        : idx === waypoints.length - 1
        ? 'Finish'
        : `Point ${idx + 1}`;
    wptXml += `  <wpt lat="${wpt.lat.toFixed(6)}" lon="${wpt.lng.toFixed(6)}">
    <name>${wpt.name || label}</name>
  </wpt>\n`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Lari Kamana - https://larikamana.local"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${safeName}</name>
    <time>${timestamp}</time>
  </metadata>
${wptXml}  <trk>
    <name>${safeName}</name>
    <type>Running</type>
    <trkseg>
${trkptsXml}    </trkseg>
  </trk>
</gpx>`;
}

/**
 * Trigger file download in browser
 */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generate and download GeoJSON
 */
export function exportGeoJSON(
  routeName: string,
  coordinates: [number, number][],
  distanceMeters: number
) {
  const geojson = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          name: routeName,
          type: 'Running Route',
          distanceKm: (distanceMeters / 1000).toFixed(2),
          createdAt: new Date().toISOString(),
        },
        geometry: {
          type: 'LineString',
          // GeoJSON is [lng, lat]
          coordinates: coordinates.map(([lat, lng]) => [lng, lat]),
        },
      },
    ],
  };

  const filename = `${routeName.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'route'}.geojson`;
  downloadFile(JSON.stringify(geojson, null, 2), filename, 'application/geo+json');
}

/**
 * Parse an uploaded GPX file into waypoints and coordinates.
 */
export function parseGPX(gpxText: string): {
  name: string;
  coordinates: [number, number][];
  waypoints: Waypoint[];
} {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(gpxText, 'text/xml');

  const nameEl = xmlDoc.querySelector('metadata > name') || xmlDoc.querySelector('trk > name');
  const name = nameEl?.textContent || 'Imported Route';

  const trkpts = xmlDoc.querySelectorAll('trkpt');
  const coordinates: [number, number][] = [];

  trkpts.forEach((pt) => {
    const lat = parseFloat(pt.getAttribute('lat') || '');
    const lon = parseFloat(pt.getAttribute('lon') || '');
    if (!isNaN(lat) && !isNaN(lon)) {
      coordinates.push([lat, lon]);
    }
  });

  // Extract waypoints or create simplified waypoints (Start, middle checkpoints, End)
  const waypoints: Waypoint[] = [];
  const wpts = xmlDoc.querySelectorAll('wpt');

  if (wpts.length > 0) {
    wpts.forEach((pt, i) => {
      const lat = parseFloat(pt.getAttribute('lat') || '');
      const lon = parseFloat(pt.getAttribute('lon') || '');
      const wptName = pt.querySelector('name')?.textContent || `Waypoint ${i + 1}`;
      if (!isNaN(lat) && !isNaN(lon)) {
        waypoints.push({
          id: `wpt-${Date.now()}-${i}`,
          lat,
          lng: lon,
          name: wptName,
        });
      }
    });
  } else if (coordinates.length > 0) {
    // Generate start, midpoint, finish
    waypoints.push({
      id: `wpt-${Date.now()}-0`,
      lat: coordinates[0][0],
      lng: coordinates[0][1],
      name: 'Start',
    });
    if (coordinates.length > 2) {
      const midIdx = Math.floor(coordinates.length / 2);
      waypoints.push({
        id: `wpt-${Date.now()}-1`,
        lat: coordinates[midIdx][0],
        lng: coordinates[midIdx][1],
        name: 'Checkpoint',
      });
    }
    waypoints.push({
      id: `wpt-${Date.now()}-last`,
      lat: coordinates[coordinates.length - 1][0],
      lng: coordinates[coordinates.length - 1][1],
      name: 'Finish',
    });
  }

  return { name, coordinates, waypoints };
}
