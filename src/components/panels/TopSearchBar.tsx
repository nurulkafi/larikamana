'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Navigation, Layers, Check, Loader2 } from 'lucide-react';
import { searchLocation, SearchResult } from '@/services/nominatim';
import { TileLayerId } from '@/types/route';
import { MAP_LAYERS } from '@/constants/map';

interface TopSearchBarProps {
  onSelectLocation: (lat: number, lng: number) => void;
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
  const [isLocating, setIsLocating] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const layerMenuRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (!query || query.trim().length < 3) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const res = await searchLocation(query);
      setResults(res);
      setIsSearching(false);
      setIsOpen(true);
    }, 400);

    return () => clearTimeout(timer);
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
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        onSelectLocation(pos.coords.latitude, pos.coords.longitude);
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
            onFocus={() => results.length > 0 && setIsOpen(true)}
            placeholder="Cari lokasi lari (mis: GBK, Monas, Gasibu)..."
            className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none"
          />
          {isSearching && <Loader2 className="w-4 h-4 text-emerald-600 animate-spin shrink-0" />}
        </div>

        {/* Dropdown Suggestions */}
        {isOpen && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 py-1 max-h-72 overflow-y-auto z-50">
            {results.map((item) => (
              <button
                key={item.placeId}
                onClick={() => {
                  onSelectLocation(item.lat, item.lng);
                  setIsOpen(false);
                  setQuery(item.displayName.split(',')[0]);
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-emerald-50 flex items-start gap-2.5 transition text-xs border-b border-slate-100 last:border-0 cursor-pointer"
              >
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="text-slate-700 line-clamp-2">{item.displayName}</span>
              </button>
            ))}
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
      </div>
    </div>
  );
}
