'use client';

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useRouteState } from '@/hooks/useRouteState';
import MapWrapper from '@/components/map/MapWrapper';
import TopSearchBar from '@/components/panels/TopSearchBar';
import RouteMetricsPanel from '@/components/panels/RouteMetricsPanel';
import ExportModal from '@/components/panels/ExportModal';
import SavedRoutesModal from '@/components/panels/SavedRoutesModal';
import { TileLayerId, MapTargetLocation } from '@/types/route';
import { ChevronUp, ChevronDown, Sparkles, MapPin } from 'lucide-react';

const POPULAR_SPOTS = [
  { name: 'GBK Senayan, Jakarta', lat: -6.2185, lng: 106.8026, zoom: 17 },
  { name: 'Monas, Jakarta', lat: -6.1754, lng: 106.8272, zoom: 16 },
  { name: 'Gasibu / Gedung Sate, Bandung', lat: -6.9003, lng: 107.6186, zoom: 17 },
  { name: 'Lapangan Renon, Bali', lat: -8.6705, lng: 115.2341, zoom: 17 },
];

export default function Home() {
  const {
    waypoints,
    coordinates,
    routingMode,
    setRoutingMode,
    isLoadingRoute,
    routeName,
    setRouteName,
    metrics,
    paceSecondsPerKm,
    setPaceSecondsPerKm,
    userWeightKg,
    setUserWeightKg,
    isLoadingElevation,
    addWaypoint,
    updateWaypoint,
    removeWaypoint,
    undo,
    redo,
    canUndo,
    canRedo,
    clearRoute,
    closeLoop,
    reverseRoute,
    outAndBack,
    savedRoutes,
    saveCurrentRoute,
    deleteSavedRoute,
    loadRoute,
  } = useRouteState();

  const [activeLayer, setActiveLayer] = useState<TileLayerId>('google_streets');
  const [targetLocation, setTargetLocation] = useState<MapTargetLocation | null>(null);
  const [fitBoundsTrigger, setFitBoundsTrigger] = useState<number>(0);

  // Modals state
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSavedModalOpen, setIsSavedModalOpen] = useState(false);
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(true);

  // Keyboard shortcuts (Ctrl+Z, Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // Handle save route with confetti
  const handleSaveRoute = () => {
    const success = saveCurrentRoute(routeName);
    if (success) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.7 },
      });
      alert(`Rute "${routeName}" berhasil disimpan ke browser!`);
    }
  };

  const handleSelectLocation = (
    lat: number,
    lng: number,
    label?: string,
    bbox?: [number, number, number, number],
    zoom?: number
  ) => {
    setTargetLocation({
      lat,
      lng,
      label,
      bbox,
      zoom: zoom || 16,
      timestamp: Date.now(),
    });
  };

  const handleLoadRouteFromModal = (route: any) => {
    loadRoute(route);
    setFitBoundsTrigger((prev) => prev + 1);
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden flex flex-col md:flex-row bg-slate-100 font-sans">
      {/* Desktop Floating Sidebar (Left) */}
      <div className="hidden md:block w-[380px] lg:w-[420px] h-full z-10 shrink-0">
        <RouteMetricsPanel
          routeName={routeName}
          onUpdateRouteName={setRouteName}
          metrics={metrics}
          waypointsCount={waypoints.length}
          routingMode={routingMode}
          onChangeRoutingMode={setRoutingMode}
          paceSeconds={paceSecondsPerKm}
          onChangePace={setPaceSecondsPerKm}
          userWeight={userWeightKg}
          onChangeWeight={setUserWeightKg}
          isLoadingRoute={isLoadingRoute}
          isLoadingElevation={isLoadingElevation}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
          onClear={clearRoute}
          onCloseLoop={closeLoop}
          onReverse={reverseRoute}
          onOutAndBack={outAndBack}
          onOpenExport={() => setIsExportOpen(true)}
          onOpenSaved={() => setIsSavedModalOpen(true)}
          onSaveRoute={handleSaveRoute}
        />
      </div>

      {/* Main Map Viewport */}
      <div className="flex-1 h-full w-full relative">
        {/* Top Search Bar & Map Controls (Sejajar di atas peta) */}
        <TopSearchBar
          onSelectLocation={handleSelectLocation}
          activeLayer={activeLayer}
          onChangeLayer={setActiveLayer}
        />

        <MapWrapper
          waypoints={waypoints}
          coordinates={coordinates}
          onAddWaypoint={addWaypoint}
          onUpdateWaypoint={updateWaypoint}
          onRemoveWaypoint={removeWaypoint}
          onCloseLoop={closeLoop}
          targetLocation={targetLocation}
          fitBoundsTrigger={fitBoundsTrigger}
          activeLayer={activeLayer}
        />

        {/* Popular Running Spots Quick Chips */}
        <div className="hidden lg:flex absolute bottom-5 left-6 z-10 items-center gap-1.5 bg-white/90 backdrop-blur-md px-3 py-2 rounded-2xl shadow-lg border border-slate-200/80">
          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Spot Lari:</span>
          </div>
          {POPULAR_SPOTS.map((spot) => (
            <button
              key={spot.name}
              onClick={() => handleSelectLocation(spot.lat, spot.lng, spot.name.split(',')[0], undefined, spot.zoom || 17)}
              className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 rounded-lg transition font-medium cursor-pointer border border-transparent hover:border-emerald-200"
            >
              {spot.name.split(',')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Bottom Sheet Panel */}
      <div
        className={`md:hidden fixed bottom-0 left-0 right-0 z-30 transition-all duration-300 ease-in-out bg-white rounded-t-3xl shadow-2xl border-t border-slate-200 ${
          isMobilePanelOpen ? 'max-h-[80vh]' : 'max-h-20'
        } overflow-hidden flex flex-col`}
      >
        {/* Drag / Toggle Header */}
        <button
          onClick={() => setIsMobilePanelOpen(!isMobilePanelOpen)}
          className="w-full py-2.5 px-4 flex items-center justify-between bg-slate-50/90 border-b border-slate-100 cursor-pointer text-xs font-bold text-slate-700"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>{routeName}</span>
            <span className="text-emerald-600 font-mono">
              ({(metrics.distance / 1000).toFixed(2)} km)
            </span>
          </div>
          {isMobilePanelOpen ? (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          )}
        </button>

        {/* Scrollable content when opened */}
        {isMobilePanelOpen && (
          <div className="flex-1 overflow-y-auto">
            <RouteMetricsPanel
              routeName={routeName}
              onUpdateRouteName={setRouteName}
              metrics={metrics}
              waypointsCount={waypoints.length}
              routingMode={routingMode}
              onChangeRoutingMode={setRoutingMode}
              paceSeconds={paceSecondsPerKm}
              onChangePace={setPaceSecondsPerKm}
              userWeight={userWeightKg}
              onChangeWeight={setUserWeightKg}
              isLoadingRoute={isLoadingRoute}
              isLoadingElevation={isLoadingElevation}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={undo}
              onRedo={redo}
              onClear={clearRoute}
              onCloseLoop={closeLoop}
              onReverse={reverseRoute}
              onOutAndBack={outAndBack}
              onOpenExport={() => setIsExportOpen(true)}
              onOpenSaved={() => setIsSavedModalOpen(true)}
              onSaveRoute={handleSaveRoute}
            />
          </div>
        )}
      </div>

      {/* Export GPX Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        routeName={routeName}
        coordinates={coordinates}
        waypoints={waypoints}
        distanceMeters={metrics.distance}
      />

      {/* Saved Routes & GPX Import Modal */}
      <SavedRoutesModal
        isOpen={isSavedModalOpen}
        onClose={() => setIsSavedModalOpen(false)}
        savedRoutes={savedRoutes}
        onLoadRoute={handleLoadRouteFromModal}
        onDeleteRoute={deleteSavedRoute}
      />
    </main>
  );
}
