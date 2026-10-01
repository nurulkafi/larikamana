'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import { Waypoint, TileLayerId } from '@/types/route';

interface MapWrapperProps {
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

const DynamicLeafletMap = dynamic(
  () => import('./LeafletMap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-500">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-medium">Memuat Peta Lari...</p>
      </div>
    ),
  }
);

export default function MapWrapper(props: MapWrapperProps) {
  return <DynamicLeafletMap {...props} />;
}
