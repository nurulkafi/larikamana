'use client';

import React, { useRef } from 'react';
import {
  X,
  FolderOpen,
  Trash2,
  MapPin,
  Calendar,
  Upload,
  ArrowRight,
  Footprints,
} from 'lucide-react';
import { SavedRoute, Waypoint } from '@/types/route';
import { parseGPX } from '@/services/gpx';

interface SavedRoutesModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedRoutes: SavedRoute[];
  onLoadRoute: (route: SavedRoute | { name: string; waypoints: Waypoint[]; coordinates?: [number, number][] }) => void;
  onDeleteRoute: (id: string) => void;
}

export default function SavedRoutesModal({
  isOpen,
  onClose,
  savedRoutes,
  onLoadRoute,
  onDeleteRoute,
}: SavedRoutesModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseGPX(text);
        if (parsed.waypoints.length === 0 && parsed.coordinates.length === 0) {
          alert('File GPX tidak memiliki data koordinat yang valid.');
          return;
        }

        onLoadRoute({
          name: parsed.name || file.name.replace(/\.[^/.]+$/, ''),
          waypoints: parsed.waypoints,
          coordinates: parsed.coordinates,
        });
        onClose();
      } catch (err) {
        alert('Gagal membaca file GPX: ' + (err as Error).message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] p-6 border border-slate-100 flex flex-col gap-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Rute Lari Saya</h2>
              <p className="text-xs text-slate-500">
                {savedRoutes.length} rute tersimpan di browser
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Upload GPX Button */}
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".gpx"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-2.5 px-3 border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/50 hover:bg-emerald-50 rounded-xl text-emerald-700 font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Import File .GPX dari Perangkat / Watch</span>
          </button>
        </div>

        {/* Routes List */}
        <div className="flex-1 overflow-y-auto max-h-96 flex flex-col gap-2.5 pr-1">
          {savedRoutes.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400">
              <Footprints className="w-10 h-10 mb-2 text-slate-300 stroke-[1.5]" />
              <p className="text-sm font-semibold text-slate-600">Belum ada rute tersimpan</p>
              <p className="text-xs text-slate-400 max-w-xs mt-1">
                Buat rute lari Anda di peta lalu klik tombol &ldquo;Simpan Rute&rdquo; untuk menyimpannya di sini.
              </p>
            </div>
          ) : (
            savedRoutes.map((route) => (
              <div
                key={route.id}
                className="p-3.5 rounded-xl border border-slate-200/90 hover:border-emerald-500 bg-white hover:shadow-md transition flex items-center justify-between gap-3 group"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-slate-800 truncate group-hover:text-emerald-600 transition">
                    {route.name}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                    <span className="font-semibold text-emerald-600">
                      {(route.distance / 1000).toFixed(2)} km
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Calendar className="w-3 h-3" />
                      {new Date(route.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {route.waypoints.length} waypoint
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Delete button */}
                  <button
                    onClick={() => {
                      if (confirm(`Hapus rute "${route.name}"?`)) {
                        onDeleteRoute(route.id);
                      }
                    }}
                    title="Hapus Rute"
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  {/* Load button */}
                  <button
                    onClick={() => {
                      onLoadRoute(route);
                      onClose();
                    }}
                    className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow-sm cursor-pointer"
                  >
                    <span>Buka</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
