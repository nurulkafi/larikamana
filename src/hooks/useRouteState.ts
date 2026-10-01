'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Waypoint, RoutingMode, RouteMetrics, SavedRoute, ElevationPoint } from '@/types/route';
import { fetchPedestrianRoute, calculatePolylineDistance } from '@/services/osrm';
import { fetchElevationProfile } from '@/services/elevation';

const STORAGE_KEY = 'runkeun_saved_routes_v1';
const LAST_ROUTE_KEY = 'runkeun_active_draft_v1';

export function useRouteState() {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [coordinates, setCoordinates] = useState<[number, number][]>([]);
  const [routingMode, setRoutingMode] = useState<RoutingMode>('foot');
  const [isLoadingRoute, setIsLoadingRoute] = useState<boolean>(false);
  const [routeName, setRouteName] = useState<string>('Rute Lari Baru');

  // Running metrics state
  const [distance, setDistance] = useState<number>(0); // in meters
  const [paceSecondsPerKm, setPaceSecondsPerKm] = useState<number>(360); // 6:00 min/km default
  const [userWeightKg, setUserWeightKg] = useState<number>(65); // default weight
  const [elevationGain, setElevationGain] = useState<number>(0);
  const [elevationLoss, setElevationLoss] = useState<number>(0);
  const [elevationProfile, setElevationProfile] = useState<ElevationPoint[]>([]);
  const [isLoadingElevation, setIsLoadingElevation] = useState<boolean>(false);

  // Undo / Redo history
  const [history, setHistory] = useState<Waypoint[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Saved routes
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);

  // Load saved routes from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSavedRoutes(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load saved routes from localStorage:', e);
    }
  }, []);

  // Save routes to localStorage
  const persistSavedRoutes = (routes: SavedRoute[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(routes));
      setSavedRoutes(routes);
    } catch (e) {
      console.error('Failed to persist saved routes:', e);
    }
  };

  // Recalculate route whenever waypoints or routingMode changes
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const elevationTimerRef = useRef<NodeJS.Timeout | null>(null);

  const calculateRoute = useCallback(
    async (currentWaypoints: Waypoint[], mode: RoutingMode) => {
      if (currentWaypoints.length === 0) {
        setCoordinates([]);
        setDistance(0);
        setElevationGain(0);
        setElevationLoss(0);
        setElevationProfile([]);
        return;
      }

      if (currentWaypoints.length === 1) {
        setCoordinates([[currentWaypoints[0].lat, currentWaypoints[0].lng]]);
        setDistance(0);
        setElevationGain(0);
        setElevationLoss(0);
        setElevationProfile([]);
        return;
      }

      setIsLoadingRoute(true);

      if (mode === 'manual') {
        const coords: [number, number][] = currentWaypoints.map((w) => [w.lat, w.lng]);
        const dist = calculatePolylineDistance(coords);
        setCoordinates(coords);
        setDistance(dist);
        setIsLoadingRoute(false);

        // Fetch elevation
        fetchElevationData(coords);
      } else {
        // Foot mode with OSRM
        try {
          const result = await fetchPedestrianRoute(currentWaypoints);
          setCoordinates(result.coordinates);
          setDistance(result.distance);
          // Fetch elevation
          fetchElevationData(result.coordinates);
        } catch (error) {
          console.error('Error fetching route:', error);
          const fallbackCoords: [number, number][] = currentWaypoints.map((w) => [w.lat, w.lng]);
          setCoordinates(fallbackCoords);
          setDistance(calculatePolylineDistance(fallbackCoords));
        } finally {
          setIsLoadingRoute(false);
        }
      }
    },
    []
  );

  const fetchElevationData = (coords: [number, number][]) => {
    if (coords.length < 2) return;
    if (elevationTimerRef.current) {
      clearTimeout(elevationTimerRef.current);
    }
    elevationTimerRef.current = setTimeout(async () => {
      setIsLoadingElevation(true);
      try {
        const ele = await fetchElevationProfile(coords);
        setElevationGain(ele.elevationGain);
        setElevationLoss(ele.elevationLoss);
        setElevationProfile(ele.profile);
      } catch (e) {
        console.warn('Elevation fetch error:', e);
      } finally {
        setIsLoadingElevation(false);
      }
    }, 600);
  };

  // Trigger recalculation with debounce to avoid spamming OSRM
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      calculateRoute(waypoints, routingMode);
    }, 200);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [waypoints, routingMode, calculateRoute]);

  // Update history helper
  const pushToHistory = (newWaypoints: Waypoint[]) => {
    const updatedHistory = history.slice(0, historyIndex + 1);
    updatedHistory.push(newWaypoints);
    setHistory(updatedHistory);
    setHistoryIndex(updatedHistory.length - 1);
    setWaypoints(newWaypoints);
  };

  // Add waypoint
  const addWaypoint = (lat: number, lng: number) => {
    const newPoint: Waypoint = {
      id: `pt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      lat,
      lng,
    };
    pushToHistory([...waypoints, newPoint]);
  };

  // Update waypoint position (e.g. after drag)
  const updateWaypoint = (id: string, lat: number, lng: number) => {
    const updated = waypoints.map((pt) => (pt.id === id ? { ...pt, lat, lng } : pt));
    pushToHistory(updated);
  };

  // Remove waypoint
  const removeWaypoint = (id: string) => {
    const updated = waypoints.filter((pt) => pt.id !== id);
    pushToHistory(updated);
  };

  // Undo
  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setWaypoints(history[newIndex]);
    }
  };

  // Redo
  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setWaypoints(history[newIndex]);
    }
  };

  // Clear route
  const clearRoute = () => {
    pushToHistory([]);
  };

  // Close Loop (draw path from last point back to first)
  const closeLoop = () => {
    if (waypoints.length < 2) return;
    const first = waypoints[0];
    const newPoint: Waypoint = {
      id: `pt-${Date.now()}-loop`,
      lat: first.lat,
      lng: first.lng,
      name: 'Loop Finish',
    };
    pushToHistory([...waypoints, newPoint]);
  };

  // Reverse route direction
  const reverseRoute = () => {
    if (waypoints.length < 2) return;
    const reversed = [...waypoints].reverse().map((pt, i) => ({
      ...pt,
      id: `pt-rev-${Date.now()}-${i}`,
    }));
    pushToHistory(reversed);
  };

  // Out and Back (returns along same path back to start)
  const outAndBack = () => {
    if (waypoints.length < 2) return;
    const returnPoints = waypoints
      .slice(0, -1)
      .reverse()
      .map((pt, i) => ({
        ...pt,
        id: `pt-oab-${Date.now()}-${i}`,
      }));
    pushToHistory([...waypoints, ...returnPoints]);
  };

  // Save current route to LocalStorage
  const saveCurrentRoute = (name: string, notes?: string) => {
    if (waypoints.length < 2) return false;
    const newSavedRoute: SavedRoute = {
      id: `route-${Date.now()}`,
      name: name.trim() || `Rute Lari ${new Date().toLocaleDateString('id-ID')}`,
      createdAt: new Date().toISOString(),
      distance,
      estimatedDuration: Math.round((distance / 1000) * paceSecondsPerKm),
      waypoints,
      coordinates,
      routingMode,
      notes,
    };
    const updated = [newSavedRoute, ...savedRoutes];
    persistSavedRoutes(updated);
    setRouteName(newSavedRoute.name);
    return true;
  };

  // Delete saved route
  const deleteSavedRoute = (id: string) => {
    const updated = savedRoutes.filter((r) => r.id !== id);
    persistSavedRoutes(updated);
  };

  // Load a route
  const loadRoute = (route: SavedRoute | { name: string; waypoints: Waypoint[]; coordinates?: [number, number][] }) => {
    setRouteName(route.name);
    setWaypoints(route.waypoints);
    setHistory([[...route.waypoints]]);
    setHistoryIndex(0);
    if ('routingMode' in route && route.routingMode) {
      setRoutingMode(route.routingMode);
    }
  };

  // Computed metrics
  const distanceKm = distance / 1000;
  // Estimated duration in seconds = distance in km * pace (s/km)
  const estimatedDuration = Math.round(distanceKm * paceSecondsPerKm);
  // Rough calorie burn formula for running: ~1.036 kcal per kg per km
  const caloriesBurned = Math.round(distanceKm * userWeightKg * 1.036);

  const metrics: RouteMetrics = {
    distance,
    estimatedDuration,
    elevationGain,
    elevationLoss,
    elevationProfile,
    paceSecondsPerKm,
    caloriesBurned,
  };

  return {
    waypoints,
    coordinates,
    routingMode,
    setRoutingMode,
    isLoadingRoute,
    routeName,
    setRouteName,
    metrics,
    distanceKm,
    paceSecondsPerKm,
    setPaceSecondsPerKm,
    userWeightKg,
    setUserWeightKg,
    isLoadingElevation,
    // Operations
    addWaypoint,
    updateWaypoint,
    removeWaypoint,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    clearRoute,
    closeLoop,
    reverseRoute,
    outAndBack,
    // Saved routes
    savedRoutes,
    saveCurrentRoute,
    deleteSavedRoute,
    loadRoute,
  };
}
