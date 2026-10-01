'use client';

import React, { useState } from 'react';
import { X, Download, FileCode, Check, Copy, Sparkles } from 'lucide-react';
import { Waypoint } from '@/types/route';
import { generateGPX, downloadFile, exportGeoJSON } from '@/services/gpx';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  routeName: string;
  coordinates: [number, number][];
  waypoints: Waypoint[];
  distanceMeters: number;
}

export default function ExportModal({
  isOpen,
  onClose,
  routeName,
  coordinates,
  waypoints,
  distanceMeters,
}: ExportModalProps) {
  const [exportName, setExportName] = useState(routeName);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleDownloadGPX = () => {
    const gpxString = generateGPX(exportName || 'rute_lari', coordinates, waypoints);
    const filename = `${(exportName || 'rute_lari').toLowerCase().replace(/[^a-z0-9]/g, '_')}.gpx`;
    downloadFile(gpxString, filename, 'application/gpx+xml');
    onClose();
  };

  const handleDownloadGeoJSON = () => {
    exportGeoJSON(exportName || 'rute_lari', coordinates, distanceMeters);
    onClose();
  };

  const handleCopyGPX = () => {
    const gpxString = generateGPX(exportName || 'rute_lari', coordinates, waypoints);
    navigator.clipboard.writeText(gpxString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100 flex flex-col gap-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Ekspor Rute Lari</h2>
              <p className="text-xs text-slate-500">Kompatibel dengan smartwatch & app lari</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Route Name Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Nama File / Rute
          </label>
          <input
            type="text"
            value={exportName}
            onChange={(e) => setExportName(e.target.value)}
            placeholder="Misal: Lari Pagi 5K GBK"
            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </div>

        {/* Route Details Summary */}
        <div className="bg-slate-50 rounded-xl p-3 text-xs flex justify-between items-center text-slate-600 border border-slate-100">
          <span>Jarak: <strong>{(distanceMeters / 1000).toFixed(2)} km</strong></span>
          <span>Titik: <strong>{waypoints.length} waypoint</strong></span>
          <span>Koordinat: <strong>{coordinates.length} titik</strong></span>
        </div>

        {/* Export Options */}
        <div className="flex flex-col gap-2.5">
          {/* GPX Primary Button */}
          <button
            onClick={handleDownloadGPX}
            className="w-full p-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-between shadow-md shadow-emerald-600/20 transition cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Download className="w-4 h-4" />
              <div className="text-left">
                <div>Download File .GPX (Rekomendasi)</div>
                <div className="text-[10px] font-normal text-emerald-100">
                  Untuk Garmin, Strava, Coros, Suunto, Apple Watch
                </div>
              </div>
            </div>
            <span className="text-[11px] bg-emerald-500/50 px-2 py-0.5 rounded font-mono">
              .gpx
            </span>
          </button>

          {/* GeoJSON Button */}
          <button
            onClick={handleDownloadGeoJSON}
            className="w-full p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs flex items-center justify-between transition cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <FileCode className="w-4 h-4 text-slate-500" />
              <div className="text-left">
                <div>Download File .GeoJSON</div>
                <div className="text-[10px] font-normal text-slate-400">
                  Untuk Google Earth, QGIS, pemetaan
                </div>
              </div>
            </div>
            <span className="text-[11px] bg-slate-200 px-2 py-0.5 rounded font-mono">
              .json
            </span>
          </button>

          {/* Copy to Clipboard */}
          <button
            onClick={handleCopyGPX}
            className="w-full p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-600 font-semibold">Tersalin ke Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Salin Raw XML GPX</span>
              </>
            )}
          </button>
        </div>

        {/* Strava / Garmin Instruction Tip */}
        <div className="text-[11px] text-slate-500 bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100 flex items-start gap-2">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
          <span>
            Di <strong>Strava</strong>: Buka menu <em>Dashboard &gt; My Routes &gt; Create New Route &gt; Upload GPX</em>.
            Di <strong>Garmin Connect</strong>: Buka <em>Training &gt; Courses &gt; Import</em>.
          </span>
        </div>
      </div>
    </div>
  );
}
