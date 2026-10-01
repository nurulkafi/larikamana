'use client';

import React, { useMemo, useState } from 'react';
import { ElevationPoint } from '@/types/route';
import { TrendingUp, Mountain } from 'lucide-react';

interface ElevationChartProps {
  profile: ElevationPoint[];
  elevationGain: number;
  elevationLoss: number;
  isLoading?: boolean;
}

export default function ElevationChart({
  profile,
  elevationGain,
  elevationLoss,
  isLoading,
}: ElevationChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<ElevationPoint | null>(null);

  const stats = useMemo(() => {
    if (!profile || profile.length < 2) return null;
    const elevations = profile.map((p) => p.elevation);
    const min = Math.min(...elevations);
    const max = Math.max(...elevations);
    const maxDist = profile[profile.length - 1].distance;
    return { min, max, maxDist, range: Math.max(max - min, 10) };
  }, [profile]);

  if (isLoading) {
    return (
      <div className="h-24 flex items-center justify-center bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-400">
        <Mountain className="w-4 h-4 mr-2 animate-bounce text-emerald-500" />
        Menghitung profil elevasi...
      </div>
    );
  }

  if (!profile || profile.length < 2 || !stats) {
    return (
      <div className="h-20 flex flex-col items-center justify-center bg-slate-50/70 rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
        <Mountain className="w-4 h-4 mb-1 text-slate-300" />
        <span>Profil ketinggian akan muncul saat rute dibuat</span>
      </div>
    );
  }

  // SVG dimensions
  const width = 360;
  const height = 70;
  const paddingY = 8;
  const chartHeight = height - paddingY * 2;

  // Build points for SVG
  const points = profile.map((p) => {
    const x = (p.distance / stats.maxDist) * width;
    const y =
      height -
      paddingY -
      ((p.elevation - stats.min) / stats.range) * chartHeight;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  const areaD = `M 0,${height} L ${points.join(' L ')} L ${width},${height} Z`;

  return (
    <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/80">
      <div className="flex items-center justify-between text-xs mb-1.5">
        <div className="flex items-center gap-1.5 font-medium text-slate-700">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          <span>Profil Elevasi</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-semibold">
          <span className="text-emerald-600">▲ +{elevationGain}m</span>
          <span className="text-rose-500">▼ -{elevationLoss}m</span>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-16 overflow-visible"
          preserveAspectRatio="none"
          onMouseLeave={() => setHoveredPoint(null)}
        >
          <defs>
            <linearGradient id="elevationGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Area fill */}
          <path d={areaD} fill="url(#elevationGrad)" />

          {/* Line stroke */}
          <path
            d={pathD}
            fill="none"
            stroke="#10B981"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Invisible hover areas */}
          {profile.map((p, idx) => {
            const cx = (p.distance / stats.maxDist) * width;
            const cy =
              height -
              paddingY -
              ((p.elevation - stats.min) / stats.range) * chartHeight;
            return (
              <circle
                key={idx}
                cx={cx}
                cy={cy}
                r="6"
                className="opacity-0 hover:opacity-100 fill-emerald-600 stroke-white stroke-2 cursor-pointer transition-opacity"
                onMouseEnter={() => setHoveredPoint(p)}
              />
            );
          })}
        </svg>

        {/* Hover info tooltip */}
        {hoveredPoint && (
          <div className="absolute top-0 right-1 bg-slate-900 text-white text-[10px] px-2 py-0.5 rounded shadow pointer-events-none">
            {(hoveredPoint.distance / 1000).toFixed(2)} km : {hoveredPoint.elevation}m dpl
          </div>
        )}
      </div>

      {/* Min & Max labels */}
      <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1 font-mono">
        <span>Min: {stats.min}m</span>
        <span>Max: {stats.max}m</span>
      </div>
    </div>
  );
}
