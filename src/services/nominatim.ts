export interface SearchResult {
  placeId: number | string;
  displayName: string;
  lat: number;
  lng: number;
  type: string;
}

export async function searchLocation(
  query: string,
  userLat?: number,
  userLng?: number
): Promise<SearchResult[]> {
  const cleanQuery = query?.trim();
  if (!cleanQuery || cleanQuery.length < 2) return [];

  // Default coordinate bias to Indonesia center (Jakarta/Bandung/Java)
  const biasLat = typeof userLat === 'number' ? userLat : -6.2088;
  const biasLng = typeof userLng === 'number' ? userLng : 106.8456;

  const results: SearchResult[] = [];
  const seenCoords = new Set<string>();

  const addResult = (res: SearchResult) => {
    const key = `${res.lat.toFixed(4)},${res.lng.toFixed(4)}`;
    if (!seenCoords.has(key)) {
      seenCoords.add(key);
      results.push(res);
    }
  };

  // 1. Try Photon (Komoot OSM Geocoder with coordinate bias to current user view)
  try {
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(
      cleanQuery
    )}&lat=${biasLat}&lon=${biasLng}&limit=10`;

    const photonRes = await fetch(photonUrl, {
      headers: { 'Accept-Language': 'id,en' },
      signal: AbortSignal.timeout(3500),
    });

    if (photonRes.ok) {
      const data = await photonRes.json();
      if (Array.isArray(data.features)) {
        // Filter strictly for Indonesian locations and ignore non-Latin scripts
        const idFeatures = data.features.filter((f: any) => {
          const props = f.properties || {};
          const cc = (props.countrycode || '').toUpperCase();
          const country = (props.country || '').toLowerCase();
          const name = props.name || '';

          // Discard Cyrillic scripts that look foreign/unrelated to Latin typing
          if (/[\u0400-\u04FF]/.test(name)) return false;

          return cc === 'ID' || country === 'indonesia';
        });

        for (const item of idFeatures) {
          const props = item.properties || {};
          const [lng, lat] = item.geometry?.coordinates || [0, 0];
          const name = props.name || props.street || cleanQuery;
          const context = [
            props.street && props.street !== name ? props.street : null,
            props.district || props.locality,
            props.city,
            props.state,
          ]
            .filter(Boolean)
            .join(', ');

          addResult({
            placeId: `photon-${props.osm_id || Math.random()}`,
            displayName: context ? `${name}, ${context}` : name,
            lat,
            lng,
            type: props.osm_value || props.type || 'place',
          });
        }
      }
    }
  } catch (err) {
    // If Photon fails or times out, proceed to Nominatim
  }

  // 2. Query Nominatim with countrycodes=id if we need more results
  if (results.length < 5) {
    try {
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        cleanQuery
      )}&countrycodes=id&limit=6&addressdetails=1`;

      const response = await fetch(nominatimUrl, {
        headers: {
          'Accept-Language': 'id,en',
          'User-Agent': 'LariKamana-Running-Route-Planner/1.0',
        },
        signal: AbortSignal.timeout(3500),
      });

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          for (const item of data) {
            addResult({
              placeId: `osm-${item.place_id}`,
              displayName: item.display_name,
              lat: parseFloat(item.lat),
              lng: parseFloat(item.lon),
              type: item.type,
            });
          }
        }
      }
    } catch (err) {
      // Ignore Nominatim errors
    }
  }

  // 3. Fallback for international queries only if 0 results in Indonesia
  if (results.length === 0) {
    try {
      const fallbackUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(cleanQuery)}&limit=5`;
      const res = await fetch(fallbackUrl, {
        headers: { 'Accept-Language': 'en,id' },
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.features)) {
          for (const item of data.features) {
            const props = item.properties || {};
            const name = props.name || '';
            if (!/[\u0400-\u04FF]/.test(name)) {
              const [lng, lat] = item.geometry?.coordinates || [0, 0];
              const context = [props.city, props.country].filter(Boolean).join(', ');
              addResult({
                placeId: `fallback-${props.osm_id || Math.random()}`,
                displayName: context ? `${name}, ${context}` : name,
                lat,
                lng,
                type: props.osm_value || 'place',
              });
            }
          }
        }
      }
    } catch {
      // Ignore
    }
  }

  return results.slice(0, 5);
}
