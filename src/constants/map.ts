import { TileLayerConfig, TileLayerId } from '@/types/route';

export const MAP_LAYERS: Record<TileLayerId, TileLayerConfig> = {
  google_streets: {
    id: 'google_streets',
    name: 'Google Maps (Terbaru)',
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps',
    maxZoom: 20,
  },
  google_hybrid: {
    id: 'google_hybrid',
    name: 'Google Satelit + Jalan',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps Satellite',
    maxZoom: 20,
  },
  osm: {
    id: 'osm',
    name: 'OpenStreetMap Resmi',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  google_terrain: {
    id: 'google_terrain',
    name: 'Google Terrain (Kontur)',
    url: 'https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps Terrain',
    maxZoom: 20,
  },
};
