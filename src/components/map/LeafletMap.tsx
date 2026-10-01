'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import { Flag } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Waypoint, TileLayerId } from '@/types/route';
import { MAP_LAYERS } from '@/constants/map';

// Create custom SVG markers using L.divIcon
const createCustomMarker = (
  type: 'start' | 'finish' | 'intermediate',
  index?: number
) => {
  if (type === 'start') {
    return L.divIcon({
      className: 'custom-map-marker-start',
      html: `
        <div style="
          width: 32px;
          height: 32px;
          background: #10B981;
          border: 3px solid #FFFFFF;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 800;
          font-size: 13px;
          box-shadow: 0 4px 10px rgba(16, 185, 129, 0.5);
          cursor: grab;
          box-sizing: border-box;
          user-select: none;
        ">
          S
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  }

  if (type === 'finish') {
    return L.divIcon({
      className: 'custom-map-marker-finish',
      html: `
        <div style="
          width: 32px;
          height: 32px;
          background: #EF4444;
          border: 3px solid #FFFFFF;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 800;
          font-size: 13px;
          box-shadow: 0 4px 10px rgba(239, 68, 68, 0.5);
          cursor: grab;
          box-sizing: border-box;
          user-select: none;
        ">
          F
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  }

  return L.divIcon({
    className: 'custom-map-marker-intermediate',
    html: `
      <div style="
        width: 24px;
        height: 24px;
        background: #2563EB;
        border: 2.5px solid #FFFFFF;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 700;
        font-size: 11px;
        box-shadow: 0 3px 8px rgba(37, 99, 235, 0.4);
        cursor: grab;
        box-sizing: border-box;
        user-select: none;
      ">
        ${(index ?? 0) + 1}
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

// Map click handler to add new waypoint
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Map center controller when user searches or requests GPS
function MapCenterController({
  center,
  zoom,
}: {
  center: [number, number] | null;
  zoom?: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || 15, { duration: 1.2 });
    }
  }, [center, zoom, map]);
  return null;
}

// Fit bounds when coordinates change significantly or on route load
function FitBoundsController({
  coordinates,
  fitTrigger,
}: {
  coordinates: [number, number][];
  fitTrigger: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (coordinates.length >= 2 && fitTrigger > 0) {
      const bounds = L.latLngBounds(coordinates);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [fitTrigger, coordinates, map]);
  return null;
}

interface LeafletMapProps {
  waypoints: Waypoint[];
  coordinates: [number, number][];
  onAddWaypoint: (lat: number, lng: number) => void;
  onUpdateWaypoint: (id: string, lat: number, lng: number) => void;
  onRemoveWaypoint: (id: string) => void;
  onCloseLoop?: () => void;
  centerLocation: [number, number] | null;
  fitBoundsTrigger: number;
  activeLayer: TileLayerId;
}

export default function LeafletMap({
  waypoints,
  coordinates,
  onAddWaypoint,
  onUpdateWaypoint,
  onRemoveWaypoint,
  onCloseLoop,
  centerLocation,
  fitBoundsTrigger,
  activeLayer,
}: LeafletMapProps) {
  // Default center: Gelora Bung Karno (GBK) Jakarta, iconic Indonesian running hub
  const defaultCenter: [number, number] = [-6.2185, 106.8026];
  const selectedLayerConfig = MAP_LAYERS[activeLayer] || MAP_LAYERS.google_streets;

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={defaultCenter}
        zoom={15}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
        zoomControl={false}
      >
        <TileLayer
          key={selectedLayerConfig.id}
          url={selectedLayerConfig.url}
          attribution={selectedLayerConfig.attribution}
          maxZoom={selectedLayerConfig.maxZoom || 19}
        />

        <MapClickHandler onMapClick={onAddWaypoint} />
        <MapCenterController center={centerLocation} />
        <FitBoundsController coordinates={coordinates} fitTrigger={fitBoundsTrigger} />

        {/* Outer glow polyline for shadow/contrast */}
        {coordinates.length >= 2 && (
          <>
            <Polyline
              positions={coordinates}
              pathOptions={{
                color: '#000000',
                weight: 8,
                opacity: 0.25,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            {/* Primary vibrant runner polyline */}
            <Polyline
              positions={coordinates}
              pathOptions={{
                color: '#FF385C',
                weight: 5,
                opacity: 0.95,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </>
        )}

        {/* Waypoint Markers */}
        {waypoints.map((wpt, idx) => {
          const isStart = idx === 0;
          const isFinish = idx === waypoints.length - 1 && waypoints.length > 1;
          const markerType = isStart ? 'start' : isFinish ? 'finish' : 'intermediate';
          const icon = createCustomMarker(markerType, idx);

          return (
            <Marker
              key={wpt.id}
              position={[wpt.lat, wpt.lng]}
              icon={icon}
              draggable={true}
              eventHandlers={{
                dragend: (e) => {
                  const latLng = e.target.getLatLng();
                  onUpdateWaypoint(wpt.id, latLng.lat, latLng.lng);
                },
              }}
            >
              {isStart && waypoints.length >= 2 && (
                <Tooltip direction="top" offset={[0, -18]} opacity={0.95}>
                  <span className="font-semibold text-emerald-700 text-xs">🏁 Finish</span>
                </Tooltip>
              )}

              <Popup className="custom-marker-popup">
                <div className="p-2 text-center text-xs min-w-[150px]">
                  <div className="font-bold text-slate-800 mb-1">
                    {isStart ? 'Titik Mulai (Start)' : isFinish ? 'Titik Akhir (Finish)' : `Waypoint #${idx + 1}`}
                  </div>
                  <div className="text-slate-400 text-[10px] mb-2 font-mono">
                    {wpt.lat.toFixed(5)}, {wpt.lng.toFixed(5)}
                  </div>

                  {/* Tombol Finish di titik Start */}
                  {isStart && waypoints.length >= 2 && onCloseLoop && (
                    <button
                      onClick={() => onCloseLoop()}
                      className="w-full mb-1.5 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Flag className="w-3.5 h-3.5" />
                      <span>Finish</span>
                    </button>
                  )}

                  <button
                    onClick={() => onRemoveWaypoint(wpt.id)}
                    className="w-full px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded text-[11px] font-medium transition cursor-pointer"
                  >
                    Hapus Titik Ini
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
