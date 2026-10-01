import { ElevationPoint } from '@/types/route';
import { haversineDistance } from './osrm';

export interface ElevationResult {
  elevationGain: number; // meters
  elevationLoss: number; // meters
  profile: ElevationPoint[];
}

/**
 * Fetch elevation profile for a route using the free Open-Meteo Elevation API.
 * Downsamples coordinates if they exceed 70 points to avoid HTTP URL length limits.
 */
export async function fetchElevationProfile(
  coordinates: [number, number][]
): Promise<ElevationResult> {
  if (coordinates.length < 2) {
    return { elevationGain: 0, elevationLoss: 0, profile: [] };
  }

  // Downsample coordinates to around 60 points if larger
  const maxSamples = 60;
  let sampledIndices: number[] = [];

  if (coordinates.length <= maxSamples) {
    sampledIndices = coordinates.map((_, i) => i);
  } else {
    sampledIndices.push(0);
    const step = (coordinates.length - 1) / (maxSamples - 1);
    for (let i = 1; i < maxSamples - 1; i++) {
      sampledIndices.push(Math.round(i * step));
    }
    sampledIndices.push(coordinates.length - 1);
  }

  // Calculate cumulative distance for each sampled index
  const distances: number[] = [];
  let cumDistance = 0;
  let currentIndex = 0;

  for (let i = 0; i < coordinates.length; i++) {
    if (i > 0) {
      cumDistance += haversineDistance(
        coordinates[i - 1][0],
        coordinates[i - 1][1],
        coordinates[i][0],
        coordinates[i][1]
      );
    }
    if (sampledIndices[currentIndex] === i) {
      distances.push(Math.round(cumDistance));
      currentIndex++;
    }
  }

  const sampledCoords = sampledIndices.map((i) => coordinates[i]);
  const lats = sampledCoords.map((c) => c[0].toFixed(5)).join(',');
  const lngs = sampledCoords.map((c) => c[1].toFixed(5)).join(',');

  const url = `https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lngs}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`Elevation API returned ${res.status}`);
    }

    const data = await res.json();
    const elevations: number[] = data.elevation || [];

    let elevationGain = 0;
    let elevationLoss = 0;
    const profile: ElevationPoint[] = [];

    for (let i = 0; i < elevations.length; i++) {
      const ele = Math.round(elevations[i]);
      profile.push({
        distance: distances[i] || 0,
        elevation: ele,
      });

      if (i > 0) {
        const diff = elevations[i] - elevations[i - 1];
        if (diff > 0) {
          elevationGain += diff;
        } else {
          elevationLoss += Math.abs(diff);
        }
      }
    }

    return {
      elevationGain: Math.round(elevationGain),
      elevationLoss: Math.round(elevationLoss),
      profile,
    };
  } catch (error) {
    console.warn('Failed to fetch elevation data:', error);
    return {
      elevationGain: 0,
      elevationLoss: 0,
      profile: [],
    };
  }
}
