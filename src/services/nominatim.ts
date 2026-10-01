export interface SearchResult {
  placeId: number | string;
  displayName: string;
  lat: number;
  lng: number;
  type: string;
}

// In-memory cache for instant 0ms responses on repeated or backspaced searches
const searchCache = new Map<string, { timestamp: number; data: SearchResult[] }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

async function fetchPhoton(
  query: string,
  biasLat: number,
  biasLng: number,
  signal?: AbortSignal
): Promise<SearchResult[]> {
  try {
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(
      query
    )}&lat=${biasLat}&lon=${biasLng}&limit=8`;

    // Combine external signal with internal 2.5s timeout
    const timeoutSignal = AbortSignal.timeout(2500);
    const combinedSignal = signal
      ? AbortSignal.any([signal, timeoutSignal])
      : timeoutSignal;

    const res = await fetch(photonUrl, {
      headers: { 'Accept-Language': 'id,en' },
      signal: combinedSignal,
    });

    if (!res.ok) return [];

    const data = await res.json();
    if (!Array.isArray(data.features)) return [];

    // Filter strictly for Indonesian locations and ignore non-Latin scripts
    const idFeatures = data.features.filter((f: any) => {
      const props = f.properties || {};
      const cc = (props.countrycode || '').toUpperCase();
      const country = (props.country || '').toLowerCase();
      const name = props.name || '';

      // Discard Cyrillic scripts
      if (/[\u0400-\u04FF]/.test(name)) return false;

      return cc === 'ID' || country === 'indonesia';
    });

    return idFeatures.map((item: any, idx: number) => {
      const props = item.properties || {};
      const [lng, lat] = item.geometry?.coordinates || [0, 0];
      const name = props.name || props.street || query;
      const context = [
        props.street && props.street !== name ? props.street : null,
        props.district || props.locality,
        props.city,
        props.state,
      ]
        .filter(Boolean)
        .join(', ');

      return {
        placeId: `photon-${props.osm_id || idx}`,
        displayName: context ? `${name}, ${context}` : name,
        lat,
        lng,
        type: props.osm_value || props.type || 'place',
      };
    });
  } catch {
    return [];
  }
}

async function fetchNominatim(
  query: string,
  signal?: AbortSignal
): Promise<SearchResult[]> {
  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query
    )}&countrycodes=id&limit=5&addressdetails=1`;

    const timeoutSignal = AbortSignal.timeout(2500);
    const combinedSignal = signal
      ? AbortSignal.any([signal, timeoutSignal])
      : timeoutSignal;

    const response = await fetch(nominatimUrl, {
      headers: {
        'Accept-Language': 'id,en',
        'User-Agent': 'LariKamana-Running-Route-Planner/1.0',
      },
      signal: combinedSignal,
    });

    if (!response.ok) return [];

    const data = await response.json();
    if (!Array.isArray(data)) return [];

    return data.map((item: any) => ({
      placeId: `osm-${item.place_id}`,
      displayName: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      type: item.type,
    }));
  } catch {
    return [];
  }
}

export async function searchLocation(
  query: string,
  userLat?: number,
  userLng?: number,
  signal?: AbortSignal
): Promise<SearchResult[]> {
  const cleanQuery = query?.trim();
  if (!cleanQuery || cleanQuery.length < 2) return [];

  // Default coordinate bias to Indonesia center (Jakarta/Java)
  const biasLat = typeof userLat === 'number' ? userLat : -6.2088;
  const biasLng = typeof userLng === 'number' ? userLng : 106.8456;

  // Check in-memory cache
  const cacheKey = `${cleanQuery.toLowerCase()}_${biasLat.toFixed(2)}_${biasLng.toFixed(2)}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  // Run Photon and Nominatim IN PARALLEL for ultra-fast response
  const [photonResult, nominatimResult] = await Promise.allSettled([
    fetchPhoton(cleanQuery, biasLat, biasLng, signal),
    fetchNominatim(cleanQuery, signal),
  ]);

  const results: SearchResult[] = [];
  const seenCoords = new Set<string>();

  const addResult = (res: SearchResult) => {
    const key = `${res.lat.toFixed(4)},${res.lng.toFixed(4)}`;
    if (!seenCoords.has(key)) {
      seenCoords.add(key);
      results.push(res);
    }
  };

  // Prioritize Photon results (more relevant for streets/suburbs)
  if (photonResult.status === 'fulfilled') {
    for (const item of photonResult.value) {
      addResult(item);
    }
  }

  // Then add Nominatim results
  if (nominatimResult.status === 'fulfilled') {
    for (const item of nominatimResult.value) {
      addResult(item);
    }
  }

  const finalResults = results.slice(0, 5);

  // Cache final results
  if (finalResults.length > 0) {
    searchCache.set(cacheKey, { timestamp: Date.now(), data: finalResults });
  }

  return finalResults;
}
