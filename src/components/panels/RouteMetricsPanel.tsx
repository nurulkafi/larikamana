'use client';

import React, { useState } from 'react';
import {
  Timer,
  Flame,
  Gauge,
  Mountain,
  Edit2,
  Check,
  Bookmark,
  Download,
  Share2,
  FolderOpen,
  Settings2,
} from 'lucide-react';
import { RouteMetrics, RoutingMode } from '@/types/route';
import RouteControls from './RouteControls';
import ElevationChart from './ElevationChart';

interface RouteMetricsPanelProps {
  routeName: string;
  onUpdateRouteName: (name: string) => void;
  metrics: RouteMetrics;
  waypointsCount: number;
  routingMode: RoutingMode;
  onChangeRoutingMode: (mode: RoutingMode) => void;
  paceSeconds: number;
  onChangePace: (seconds: number) => void;
  userWeight: number;
  onChangeWeight: (weight: number) => void;
  isLoadingRoute: boolean;
  isLoadingElevation: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onCloseLoop: () => void;
  onReverse: () => void;
  onOutAndBack: () => void;
  onOpenExport: () => void;
  onOpenSaved: () => void;
  onSaveRoute: () => void;
}

// Convert seconds to mm:ss format
function formatPace(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Convert duration to human readable format
function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}d`;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}j ${minutes}m`;
  }
  return `${minutes}m ${seconds > 0 ? `${seconds}d` : ''}`;
}

const PACE_PRESETS = [
  { label: 'Jog Santai', seconds: 420 }, // 7:00
  { label: 'Moderate', seconds: 360 }, // 6:00
  { label: 'Tempo', seconds: 300 }, // 5:00
  { label: 'Fast / 5K', seconds: 255 }, // 4:15
];

export default function RouteMetricsPanel({
  routeName,
  onUpdateRouteName,
  metrics,
  waypointsCount,
  routingMode,
  onChangeRoutingMode,
  paceSeconds,
  onChangePace,
  userWeight,
  onChangeWeight,
  isLoadingRoute,
  isLoadingElevation,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClear,
  onCloseLoop,
  onReverse,
  onOutAndBack,
  onOpenExport,
  onOpenSaved,
  onSaveRoute,
}: RouteMetricsPanelProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(routeName);
  const [showPaceSettings, setShowPaceSettings] = useState(false);

  const handleSaveName = () => {
    onUpdateRouteName(tempName.trim() || 'Rute Lari Baru');
    setIsEditingName(false);
  };

  const distanceKm = (metrics.distance / 1000).toFixed(2);

  return (
    <div className="flex flex-col h-full bg-white/95 backdrop-blur-md border-r border-slate-200/80 shadow-2xl overflow-y-auto">
      {/* Header & Route Name */}
      <div className="p-4 border-b border-slate-100 bg-gradient-to-b from-emerald-50/50 to-transparent">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Lari Kamana?
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onOpenSaved}
              title="Daftar Rute Tersimpan"
              className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-600 hover:bg-white transition cursor-pointer flex items-center gap-1 text-xs font-medium"
            >
              <FolderOpen className="w-4 h-4" />
              <span>Rute</span>
            </button>
          </div>
        </div>

        {/* Editable Route Title */}
        <div className="flex items-center gap-2">
          {isEditingName ? (
            <div className="flex items-center gap-1.5 flex-1">
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                autoFocus
                className="w-full text-base font-bold text-slate-800 bg-white border border-emerald-500 rounded-lg px-2.5 py-1 outline-none"
              />
              <button
                onClick={handleSaveName}
                className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => {
                setTempName(routeName);
                setIsEditingName(true);
              }}
              className="group flex items-center gap-2 cursor-pointer flex-1"
            >
              <h1 className="text-lg font-extrabold text-slate-800 group-hover:text-emerald-600 transition truncate">
                {routeName}
              </h1>
              <Edit2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 opacity-60 transition" />
            </div>
          )}
        </div>
      </div>

      {/* Main Stats Card */}
      <div className="p-4 flex flex-col gap-4">
        {/* Distance Highlight */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-4 text-white shadow-lg shadow-emerald-600/20 relative overflow-hidden">
          <div className="absolute right-[-15px] bottom-[-15px] w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none" />

          <div className="flex items-baseline justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-100">
              Total Jarak
            </span>
            {isLoadingRoute && (
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full text-emerald-100 animate-pulse">
                Menghitung...
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-4xl font-black tracking-tight">{distanceKm}</span>
            <span className="text-xl font-bold text-emerald-200">KM</span>
            <span className="text-xs text-emerald-200/80 ml-auto font-mono">
              ({metrics.distance} m)
            </span>
          </div>

          {/* Sub Metrics: Duration, Pace, Calories */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/20 text-center">
            <div>
              <div className="flex items-center justify-center gap-1 text-[11px] text-emerald-100 mb-0.5">
                <Timer className="w-3 h-3" />
                <span>Waktu</span>
              </div>
              <div className="text-sm font-bold tracking-tight">
                {formatDuration(metrics.estimatedDuration)}
              </div>
            </div>

            <div
              onClick={() => setShowPaceSettings(!showPaceSettings)}
              className="cursor-pointer hover:bg-white/10 rounded-lg py-0.5 transition"
              title="Klik untuk atur pace lari"
            >
              <div className="flex items-center justify-center gap-1 text-[11px] text-emerald-100 mb-0.5">
                <Gauge className="w-3 h-3" />
                <span>Pace</span>
              </div>
              <div className="text-sm font-bold tracking-tight underline decoration-dotted">
                {formatPace(paceSeconds)} /km
              </div>
            </div>

            <div>
              <div className="flex items-center justify-center gap-1 text-[11px] text-emerald-100 mb-0.5">
                <Mountain className="w-3 h-3 text-emerald-300" />
                <span>Elev. Gain</span>
              </div>
              <div className="text-sm font-bold tracking-tight">
                +{metrics.elevationGain} m
              </div>
            </div>
          </div>
        </div>

        {/* Pace Config (Collapsible or visible) */}
        {showPaceSettings && (
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs">
            <div className="flex items-center justify-between font-semibold text-slate-700 mb-2">
              <span>Pengaturan Target Pace</span>
              <Settings2 className="w-3.5 h-3.5 text-slate-400" />
            </div>

            {/* Presets */}
            <div className="grid grid-cols-2 gap-1.5 mb-2.5">
              {PACE_PRESETS.map((p) => (
                <button
                  key={p.seconds}
                  onClick={() => onChangePace(p.seconds)}
                  className={`py-1 px-2 rounded-lg text-left transition text-[11px] border cursor-pointer ${
                    paceSeconds === p.seconds
                      ? 'bg-emerald-600 text-white border-emerald-600 font-semibold'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div>{p.label}</div>
                  <div className="font-mono text-[10px] opacity-80">{formatPace(p.seconds)}/km</div>
                </button>
              ))}
            </div>

            {/* Slider */}
            <div>
              <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                <span>Sesuaikan Pace</span>
                <span className="font-bold text-emerald-600 font-mono">
                  {formatPace(paceSeconds)} min/km
                </span>
              </div>
              <input
                type="range"
                min="180" // 3:00 min/km
                max="600" // 10:00 min/km
                step="5"
                value={paceSeconds}
                onChange={(e) => onChangePace(parseInt(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Route Controls (Undo, Redo, Loop, etc.) */}
        <RouteControls
          canUndo={canUndo}
          canRedo={canRedo}
          hasPoints={waypointsCount > 0}
          routingMode={routingMode}
          onUndo={onUndo}
          onRedo={onRedo}
          onClear={onClear}
          onCloseLoop={onCloseLoop}
          onReverse={onReverse}
          onOutAndBack={onOutAndBack}
          onChangeRoutingMode={onChangeRoutingMode}
        />

        {/* Elevation Profile Chart */}
        <ElevationChart
          profile={metrics.elevationProfile}
          elevationGain={metrics.elevationGain}
          elevationLoss={metrics.elevationLoss}
          isLoading={isLoadingElevation}
        />

        {/* Helpful Tip when empty */}
        {waypointsCount === 0 && (
          <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-xs text-emerald-800 flex flex-col gap-1">
            <span className="font-semibold">💡 Cara Mulai:</span>
            <p className="text-slate-600 text-[11px]">
              Klik pada peta untuk menentukan titik awal (Start), lalu klik titik-titik berikutnya untuk membentuk rute lari Anda. Titik dapat digeser kapan saja.
            </p>
          </div>
        )}
      </div>

      {/* Footer Action Buttons */}
      <div className="p-4 mt-auto border-t border-slate-200/80 bg-white flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onSaveRoute}
            disabled={waypointsCount < 2}
            className="py-2.5 px-3 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 disabled:hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow cursor-pointer disabled:cursor-not-allowed"
          >
            <Bookmark className="w-4 h-4 text-emerald-400" />
            <span>Simpan Rute</span>
          </button>

          <button
            onClick={onOpenExport}
            disabled={waypointsCount < 2}
            className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            <span>Export GPX</span>
          </button>
        </div>
      </div>
    </div>
  );
}
