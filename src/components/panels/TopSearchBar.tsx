'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Navigation, Layers, Check, Loader2, X, Info } from 'lucide-react';
import { searchLocation, SearchResult } from '@/services/nominatim';
import { TileLayerId } from '@/types/route';
import { MAP_LAYERS } from '@/constants/map';

interface TopSearchBarProps {
  onSelectLocation: (
    lat: number,
    lng: number,
    label?: string,
    bbox?: [number, number, number, number],
    zoom?: number
  ) => void;
  activeLayer: TileLayerId;
  onChangeLayer: (layer: TileLayerId) => void;
}

export default function TopSearchBar({
  onSelectLocation,
  activeLayer,
  onChangeLayer,
}: TopSearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const layerMenuRef = useRef<HTMLDivElement>(null);
  const infoMenuRef = useRef<HTMLDivElement>(null);

  // Debounced search with race condition prevention
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    let isMounted = true;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      const res = await searchLocation(query);
      if (isMounted) {
        setResults(res);
        setIsSearching(false);
        setIsOpen(res.length > 0);
      }
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [query]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
      if (layerMenuRef.current && !layerMenuRef.current.contains(event.target as Node)) {
        setIsLayerMenuOpen(false);
      }
      if (infoMenuRef.current && !infoMenuRef.current.contains(event.target as Node)) {
        setIsInfoOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectResult = (item: SearchResult) => {
    const cleanLabel = item.displayName.split(',')[0].trim();
    onSelectLocation(item.lat, item.lng, cleanLabel, undefined, 16.5);
    setIsOpen(false);
    setQuery(cleanLabel);
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (results.length > 0) {
        handleSelectResult(results[0]);
      } else if (query.trim().length >= 2) {
        setIsSearching(true);
        const res = await searchLocation(query);
        setIsSearching(false);
        if (res.length > 0) {
          setResults(res);
          handleSelectResult(res[0]);
        }
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // HTML5 Geolocation
  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Browser Anda tidak mendukung geolokasi');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        onSelectLocation(pos.coords.latitude, pos.coords.longitude, 'Lokasi Saya', undefined, 17);
      },
      (err) => {
        setIsLocating(false);
        alert('Gagal mendeteksi lokasi: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="absolute top-4 left-4 right-4 md:right-auto z-20 flex items-center gap-2 pointer-events-none">
      {/* Search Input Container */}
      <div
        ref={containerRef}
        className="pointer-events-auto relative flex-1 md:flex-initial w-auto md:w-80 lg:w-96 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200/80 transition-all focus-within:shadow-xl focus-within:border-emerald-500"
      >
        <div className="flex items-center px-3.5 py-2.5">
          <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => results.length > 0 && setIsOpen(true)}
            placeholder="Cari lokasi lari (mis: GBK, Monas, Gasibu)..."
            className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none"
          />
          {isSearching && <Loader2 className="w-4 h-4 text-emerald-600 animate-spin shrink-0 ml-1" />}
          {query && !isSearching && (
            <button
              onClick={() => {
                setQuery('');
                setResults([]);
                setIsOpen(false);
              }}
              className="p-0.5 text-slate-400 hover:text-slate-600 rounded-full transition ml-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dropdown Suggestions */}
        {isOpen && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 py-1 max-h-72 overflow-y-auto z-50 divide-y divide-slate-100">
            {results.map((item) => {
              const parts = item.displayName.split(',');
              const title = parts[0]?.trim();
              const subtitle = parts.slice(1).join(',').trim();

              return (
                <button
                  key={item.placeId}
                  onClick={() => handleSelectResult(item)}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-emerald-50/80 flex items-start gap-2.5 transition text-xs cursor-pointer group"
                >
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-800 truncate">{title}</p>
                    {subtitle && (
                      <p className="text-[11px] text-slate-400 truncate">{subtitle}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Action Buttons: GPS & Layer Switcher */}
      <div className="pointer-events-auto flex items-center gap-2 shrink-0">
        {/* GPS Current Location Button */}
        <button
          onClick={handleCurrentLocation}
          title="Lokasi Saya"
          className="p-2.5 bg-white/95 backdrop-blur-md hover:bg-slate-50 text-slate-700 rounded-xl shadow-md border border-slate-200/80 transition cursor-pointer flex items-center justify-center hover:text-emerald-600"
        >
          {isLocating ? (
            <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
          ) : (
            <Navigation className="w-5 h-5" />
          )}
        </button>

        {/* Tile Layer Selector */}
        <div ref={layerMenuRef} className="relative">
          <button
            onClick={() => setIsLayerMenuOpen(!isLayerMenuOpen)}
            title="Ganti Tampilan Peta"
            className="p-2.5 bg-white/95 backdrop-blur-md hover:bg-slate-50 text-slate-700 rounded-xl shadow-md border border-slate-200/80 transition cursor-pointer flex items-center justify-center hover:text-emerald-600"
          >
            <Layers className="w-5 h-5" />
          </button>

          {isLayerMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50">
              <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Gaya Peta
              </div>
              {Object.entries(MAP_LAYERS).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => {
                    onChangeLayer(key as TileLayerId);
                    setIsLayerMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition cursor-pointer ${
                    activeLayer === key ? 'text-emerald-600 font-semibold bg-emerald-50/60' : 'text-slate-700'
                  }`}
                >
                  <span>{config.name}</span>
                  {activeLayer === key && <Check className="w-4 h-4 text-emerald-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Information & Guide Button */}
        <div ref={infoMenuRef} className="relative">
          <button
            onClick={() => setIsInfoOpen(!isInfoOpen)}
            title="Informasi & Cara Mulai"
            className={`p-2.5 bg-white/95 backdrop-blur-md hover:bg-slate-50 rounded-xl shadow-md border border-slate-200/80 transition cursor-pointer flex items-center justify-center ${
              isInfoOpen ? 'text-emerald-600 border-emerald-300 ring-2 ring-emerald-500/20' : 'text-slate-700 hover:text-emerald-600'
            }`}
          >
            <Info className="w-5 h-5" />
          </button>

          {isInfoOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 p-4 z-50 text-slate-700">
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800 uppercase tracking-wider">
                  <span className="text-base">💡</span>
                  <span>Cara Mulai</span>
                </div>
                <button
                  onClick={() => setIsInfoOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-2.5 bg-emerald-50/80 border border-emerald-200/70 rounded-xl">
                  <p className="text-emerald-900 text-[11px] leading-relaxed">
                    Klik pada peta untuk menentukan titik awal (Start), lalu klik titik-titik berikutnya untuk membentuk rute lari Anda. Titik dapat digeser kapan saja.
                  </p>
                </div>

                <div className="space-y-1.5 text-[11px] text-slate-600 pt-1">
                  <div className="flex items-start gap-1.5">
                    <span className="font-semibold text-slate-800 shrink-0">🏁 Finish Loop:</span>
                    <span>Klik titik Start hijau lalu pilih Finish untuk menutup rute.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="font-semibold text-slate-800 shrink-0">↩️ Undo / Redo:</span>
                    <span>Gunakan tombol Undo/Redo di panel atau pintasan <b>Ctrl + Z</b>.</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
