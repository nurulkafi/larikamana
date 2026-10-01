export interface SearchResult {
  placeId: number;
  displayName: string;
  lat: number;
  lng: number;
  type: string;
  bbox?: [number, number, number, number]; // [south, north, west, east]
}

export async function searchLocation(query: string): Promise<SearchResult[]> {
  if (!query || query.trim().length < 2) return [];

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    query
  )}&limit=5&addressdetails=1`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'id,en',
        'User-Agent': 'LariKamana-Running-Route-Planner/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim error: ${response.status}`);
    }

    const data = await response.json();
    return data.map((item: any) => {
      let bbox: [number, number, number, number] | undefined = undefined;
      if (Array.isArray(item.boundingbox) && item.boundingbox.length === 4) {
        bbox = [
          parseFloat(item.boundingbox[0]),
          parseFloat(item.boundingbox[1]),
          parseFloat(item.boundingbox[2]),
          parseFloat(item.boundingbox[3]),
        ];
      }

      return {
        placeId: item.place_id,
        displayName: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        type: item.type,
        bbox,
      };
    });
  } catch (error) {
    console.error('Search failed:', error);
    return [];
  }
}
