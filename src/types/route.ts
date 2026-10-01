export interface Waypoint {
  id: string;
  lat: number;
  lng: number;
  name?: string;
}

export type RoutingMode = 'foot' | 'manual';

export interface ElevationPoint {
  distance: number; // in meters from start
  elevation: number; // in meters
}

export interface RouteMetrics {
  distance: number; // in meters
  estimatedDuration: number; // in seconds
  elevationGain: number; // in meters
  elevationLoss: number; // in meters
  elevationProfile: ElevationPoint[];
  paceSecondsPerKm: number;
  caloriesBurned: number;
}

export interface SavedRoute {
  id: string;
  name: string;
  createdAt: string;
  distance: number; // in meters
  estimatedDuration: number; // in seconds
  waypoints: Waypoint[];
  coordinates: [number, number][]; // [lat, lng]
  routingMode: RoutingMode;
  notes?: string;
}

export type TileLayerId = 'google_streets' | 'google_hybrid' | 'osm' | 'google_terrain';

export interface TileLayerConfig {
  id: TileLayerId;
  name: string;
  url: string;
  attribution: string;
  maxZoom?: number;
}

export interface MapTargetLocation {
  lat: number;
  lng: number;
  zoom?: number;
  bbox?: [number, number, number, number]; // [south, north, west, east]
  label?: string;
  timestamp: number;
}

