export interface SearchResult {
  placeId: number;
  displayName: string;
  lat: number;
  lng: number;
  type: string;
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
        'User-Agent': 'RunKeun-Running-Route-Planner/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim error: ${response.status}`);
    }

    const data = await response.json();
    return data.map((item: { place_id: number; display_name: string; lat: string; lon: string; type: string }) => ({
      placeId: item.place_id,
      displayName: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      type: item.type,
    }));
  } catch (error) {
    console.error('Search failed:', error);
    return [];
  }
}
