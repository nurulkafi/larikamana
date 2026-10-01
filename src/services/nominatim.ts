export interface SearchResult {
  placeId: number | string;
  displayName: string;
  lat: number;
  lng: number;
  type: string;
  bbox?: [number, number, number, number]; // [south, north, west, east]
}

export async function searchLocation(query: string): Promise<SearchResult[]> {
  const cleanQuery = query?.trim();
  if (!cleanQuery || cleanQuery.length < 2) return [];

  // 1. Try Photon (Komoot OSM Geocoder - fast, typo-tolerant, outdoor & sports friendly)
  try {
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(cleanQuery)}&limit=6`;
    const photonRes = await fetch(photonUrl, {
      headers: { 'Accept-Language': 'id,en' },
      signal: AbortSignal.timeout(3500),
    });

    if (photonRes.ok) {
      const data = await photonRes.json();
      if (Array.isArray(data.features) && data.features.length > 0) {
        // Prioritize Indonesian results first
        const idFeatures = data.features.filter(
          (f: any) => f.properties?.countrycode === 'ID' || f.properties?.country === 'Indonesia'
        );
        const otherFeatures = data.features.filter(
          (f: any) => f.properties?.countrycode !== 'ID' && f.properties?.country !== 'Indonesia'
        );
        const sortedFeatures = [...idFeatures, ...otherFeatures].slice(0, 5);

        if (sortedFeatures.length > 0) {
          return sortedFeatures.map((item: any, idx: number) => {
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

            return {
              placeId: `photon-${props.osm_id || idx}`,
              displayName: context ? `${name}, ${context}` : name,
              lat,
              lng,
              type: props.osm_value || props.type || 'place',
            };
          });
        }
      }
    }
  } catch (err) {
    // If Photon fails or times out, fallback to Nominatim
  }

  // 2. Fallback to Nominatim OpenStreetMap (prioritizing Indonesia)
  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      cleanQuery
    )}&limit=5&countrycodes=id&addressdetails=1`;

    let response = await fetch(nominatimUrl, {
      headers: {
        'Accept-Language': 'id,en',
        'User-Agent': 'LariKamana-Running-Route-Planner/1.0',
      },
      signal: AbortSignal.timeout(4000),
    });

    let data = response.ok ? await response.json() : [];

    // If no results in Indonesia, fallback to worldwide
    if (!Array.isArray(data) || data.length === 0) {
      const worldwideUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        cleanQuery
      )}&limit=5&addressdetails=1`;
      response = await fetch(worldwideUrl, {
        headers: {
          'Accept-Language': 'id,en',
          'User-Agent': 'LariKamana-Running-Route-Planner/1.0',
        },
        signal: AbortSignal.timeout(4000),
      });
      data = response.ok ? await response.json() : [];
    }

    if (Array.isArray(data)) {
      return data.map((item: any) => ({
        placeId: item.place_id,
        displayName: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        type: item.type,
      }));
    }
  } catch (error) {
    console.error('Search failed:', error);
  }

  return [];
}
