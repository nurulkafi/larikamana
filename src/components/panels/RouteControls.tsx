'use client';

import React from 'react';
import {
  Undo2,
  Redo2,
  RotateCcw,
  Repeat,
  Compass,
  Trash2,
  Footprints,
  Ruler,
} from 'lucide-react';
import { RoutingMode } from '@/types/route';

interface RouteControlsProps {
  canUndo: boolean;
  canRedo: boolean;
  hasPoints: boolean;
  routingMode: RoutingMode;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onCloseLoop: () => void;
  onReverse: () => void;
  onOutAndBack: () => void;
  onChangeRoutingMode: (mode: RoutingMode) => void;
}

export default function RouteControls({
  canUndo,
  canRedo,
  hasPoints,
  routingMode,
  onUndo,
  onRedo,
  onClear,
  onCloseLoop,
  onReverse,
  onOutAndBack,
  onChangeRoutingMode,
}: RouteControlsProps) {
  return (
    <div className="flex flex-col gap-2.5">
      {/* Routing Mode Toggle */}
      <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200/80">
        <button
          onClick={() => onChangeRoutingMode('foot')}
          className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
            routingMode === 'foot'
              ? 'bg-white text-emerald-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Footprints className="w-3.5 h-3.5" />
          <span>Ikuti Jalan</span>
        </button>

        <button
          onClick={() => onChangeRoutingMode('manual')}
          className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
            routingMode === 'manual'
              ? 'bg-white text-emerald-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Ruler className="w-3.5 h-3.5" />
          <span>Garis Bebas</span>
        </button>
      </div>

      {/* Action Buttons: Undo, Redo, Clear */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-slate-50 text-slate-700 border border-slate-200/80 flex flex-col items-center justify-center gap-1 transition cursor-pointer disabled:cursor-not-allowed"
        >
          <Undo2 className="w-4 h-4 text-slate-600" />
          <span className="text-[10px] font-medium">Undo</span>
        </button>

        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-slate-50 text-slate-700 border border-slate-200/80 flex flex-col items-center justify-center gap-1 transition cursor-pointer disabled:cursor-not-allowed"
        >
          <Redo2 className="w-4 h-4 text-slate-600" />
          <span className="text-[10px] font-medium">Redo</span>
        </button>

        <button
          onClick={onClear}
          disabled={!hasPoints}
          title="Hapus Rute"
          className="p-2.5 rounded-xl bg-slate-50 hover:bg-rose-50 disabled:opacity-40 disabled:hover:bg-slate-50 text-rose-600 border border-slate-200/80 flex flex-col items-center justify-center gap-1 transition cursor-pointer disabled:cursor-not-allowed"
        >
          <Trash2 className="w-4 h-4" />
          <span className="text-[10px] font-medium">Reset</span>
        </button>
      </div>
    </div>
  );
}
