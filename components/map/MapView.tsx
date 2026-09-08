'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MAP_CONFIG } from '@/lib/maps';
import { VehicleType } from '@/types/ride';
import { Crosshair, Navigation, Compasses } from 'lucide-react';

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  customerLocation?: [number, number] | null;
  pickupLocation?: [number, number] | null;
  destinationLocation?: [number, number] | null;
  captainLocation?: [number, number] | null;
  captainHeading?: number | null;
  captainVehicleType?: VehicleType;
  nearbyCaptains?: Array<{
    id: string;
    latitude: number;
    longitude: number;
    vehicle_type: VehicleType;
  }>;
  routeCoordinates?: [number, number][];
  onMapClick?: (lat: number, lng: number) => void;
  className?: string;
}

// Professional Vector SVG Icons for Vehicles with Direction Arrow
const VEHICLE_SVG_ICONS: Record<VehicleType, string> = {
  BIKE: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5 text-amber-400"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6h2l3 6.5"/><path d="M12 17.5V14l-3-3 4-3 2 3h3"/></svg>`,
  AUTO: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5 text-amber-400"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-1.1 0-2 .9-2 2v7c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>`,
  CAB: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5 text-amber-400"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-1.1 0-2 .9-2 2v7c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M7 11h10"/></svg>`,
};

export default function MapView({
  center = MAP_CONFIG.defaultCenter,
  zoom = MAP_CONFIG.defaultZoom,
  customerLocation,
  pickupLocation,
  destinationLocation,
  captainLocation,
  captainHeading,
  captainVehicleType = 'BIKE',
  nearbyCaptains = [],
  routeCoordinates = [],
  onMapClick,
  className = 'h-full w-full',
}: MapViewProps) {
  const onMapClickRef = useRef(onMapClick);
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const polylineBgRef = useRef<L.Polyline | null>(null);
  const polylineFgRef = useRef<L.Polyline | null>(null);

  // Camera follow & user manual pan tracking state
  const [isUserPanning, setIsUserPanning] = useState(false);
  const isUserPanningRef = useRef(false);
  const isInitialFitDoneRef = useRef(false);
  const prevRouteKeyRef = useRef<string>('');

  // Animated captain position & heading state
  const currentCaptainPosRef = useRef<[number, number] | null>(null);
  const targetCaptainPosRef = useRef<[number, number] | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const captainHeadingRef = useRef<number>(0);

  // Synchronize state and ref
  const setPanningState = (panning: boolean) => {
    isUserPanningRef.current = panning;
    setIsUserPanning(panning);
  };

  // Helper to fit map camera onto active markers
  const fitMapBounds = useCallback(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    if (routeCoordinates && routeCoordinates.length > 0) {
      const bounds = L.latLngBounds(routeCoordinates.map((c) => L.latLng(c[0], c[1])));
      map.fitBounds(bounds, { padding: [70, 70], maxZoom: 16, animate: true });
    } else if (pickupLocation && destinationLocation) {
      const bounds = L.latLngBounds([
        L.latLng(pickupLocation[0], pickupLocation[1]),
        L.latLng(destinationLocation[0], destinationLocation[1]),
      ]);
      map.fitBounds(bounds, { padding: [80, 80], maxZoom: 16, animate: true });
    } else if (pickupLocation) {
      map.setView(pickupLocation, 15, { animate: true });
    } else if (captainLocation) {
      map.setView(captainLocation, 16, { animate: true });
    } else if (customerLocation) {
      map.setView(customerLocation, 15, { animate: true });
    } else if (center) {
      map.setView(center, zoom, { animate: true });
    }
  }, [routeCoordinates, pickupLocation, destinationLocation, captainLocation, customerLocation, center, zoom]);

  // Recenter button click handler
  const handleRecenterClick = () => {
    setPanningState(false);
    fitMapBounds();
  };

  // Initialize Leaflet Map Instance
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center,
      zoom,
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      scrollWheelZoom: true,
      touchZoom: true,
      doubleClickZoom: true,
    });

    L.tileLayer(MAP_CONFIG.tileUrl, {
      maxZoom: 19,
    }).addTo(map);

    // Map click handler
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onMapClickRef.current) {
        onMapClickRef.current(e.latlng.lat, e.latlng.lng);
      }
    });

    // Detect user manual camera interactions (drag, zoom, touch)
    const onUserInteraction = (e: any) => {
      // e.originalEvent indicates the event was triggered by user input (mouse/touch/wheel)
      if (e && e.originalEvent) {
        setPanningState(true);
      }
    };

    map.on('movestart', onUserInteraction);
    map.on('dragstart', onUserInteraction);
    map.on('zoomstart', onUserInteraction);

    mapRef.current = map;

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update Camera Fit Bounds ONLY when route changes or initial load (DO NOT snap on location update ticks!)
  useEffect(() => {
    if (!mapRef.current) return;

    const currentRouteKey = routeCoordinates && routeCoordinates.length > 0
      ? `${routeCoordinates[0][0]},${routeCoordinates[0][1]}-${routeCoordinates[routeCoordinates.length - 1][0]},${routeCoordinates[routeCoordinates.length - 1][1]}`
      : `${pickupLocation?.[0]}-${destinationLocation?.[0]}`;

    const isNewRoute = currentRouteKey !== prevRouteKeyRef.current && currentRouteKey !== 'undefined-undefined';

    // Auto-fit camera ONLY on initial load or major route change when user hasn't manually panned
    if (!isInitialFitDoneRef.current || (isNewRoute && !isUserPanningRef.current)) {
      prevRouteKeyRef.current = currentRouteKey;
      isInitialFitDoneRef.current = true;
      fitMapBounds();
    }
  }, [routeCoordinates, pickupLocation, destinationLocation, fitMapBounds]);

  // Smooth Marker Animation Loop for Captain Vehicle Location & Heading Rotation
  useEffect(() => {
    if (!captainLocation) {
      currentCaptainPosRef.current = null;
      targetCaptainPosRef.current = null;
      return;
    }

    targetCaptainPosRef.current = captainLocation;

    if (!currentCaptainPosRef.current) {
      currentCaptainPosRef.current = captainLocation;
    }

    // Determine heading (rotation angle)
    if (captainHeading !== undefined && captainHeading !== null) {
      captainHeadingRef.current = captainHeading;
    } else if (currentCaptainPosRef.current && targetCaptainPosRef.current) {
      const dLat = targetCaptainPosRef.current[0] - currentCaptainPosRef.current[0];
      const dLng = targetCaptainPosRef.current[1] - currentCaptainPosRef.current[1];
      if (Math.abs(dLat) > 0.00001 || Math.abs(dLng) > 0.00001) {
        const rad = Math.atan2(dLng, dLat);
        const deg = (rad * (180 / Math.PI) + 360) % 360;
        captainHeadingRef.current = deg;
      }
    }

    // Animate smoothly towards target location over time
    const startPos = [...currentCaptainPosRef.current] as [number, number];
    const targetPos = [...targetCaptainPosRef.current] as [number, number];
    const startTime = performance.now();
    const duration = 900; // 900ms smooth interpolation duration

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out quadratic easing
      const easeProgress = progress * (2 - progress);

      const lat = startPos[0] + (targetPos[0] - startPos[0]) * easeProgress;
      const lng = startPos[1] + (targetPos[1] - startPos[1]) * easeProgress;

      currentCaptainPosRef.current = [lat, lng];

      // Update Leaflet Captain Marker
      if (mapRef.current && markersRef.current['captain_assigned']) {
        markersRef.current['captain_assigned'].setLatLng([lat, lng]);

        // Rotate SVG icon element smoothly
        const el = markersRef.current['captain_assigned'].getElement();
        if (el) {
          const rotContainer = el.querySelector('.vehicle-rotation-node') as HTMLElement;
          if (rotContainer) {
            rotContainer.style.transform = `rotate(${captainHeadingRef.current}deg)`;
          }
        }
      }

      if (progress < 1) {
        animFrameIdRef.current = requestAnimationFrame(animate);
      }
    };

    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
    }
    animFrameIdRef.current = requestAnimationFrame(animate);

  }, [captainLocation, captainHeading]);

  // Render Leaflet Markers & Polylines
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // 1. Customer Location Marker (Pulsing Dot)
    if (customerLocation) {
      const icon = L.divIcon({
        html: `<div class="relative flex items-center justify-center w-7 h-7">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-60"></span>
            <span class="relative inline-flex rounded-full h-4 w-4 bg-sky-500 border-2 border-white shadow-md"></span>
          </div>`,
        className: 'custom-map-icon',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      if (!markersRef.current['customer']) {
        markersRef.current['customer'] = L.marker(customerLocation, { icon }).addTo(map);
      } else {
        markersRef.current['customer'].setLatLng(customerLocation);
      }
    } else if (markersRef.current['customer']) {
      map.removeLayer(markersRef.current['customer']);
      delete markersRef.current['customer'];
    }

    // 2. Pickup Location Marker (Sleek Emerald Teardrop)
    if (pickupLocation) {
      const icon = L.divIcon({
        html: `<div class="flex flex-col items-center">
            <div class="bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-extrabold text-[10px] tracking-wider uppercase px-2.5 py-0.5 rounded-full shadow-xl border border-white flex items-center gap-1">
              <span>PICKUP</span>
            </div>
            <div class="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[7px] border-t-emerald-600 shadow-sm"></div>
          </div>`,
        className: 'custom-map-icon',
        iconSize: [70, 36],
        iconAnchor: [35, 36],
      });

      if (!markersRef.current['pickup']) {
        markersRef.current['pickup'] = L.marker(pickupLocation, { icon }).addTo(map);
      } else {
        markersRef.current['pickup'].setIcon(icon);
        markersRef.current['pickup'].setLatLng(pickupLocation);
      }
    } else if (markersRef.current['pickup']) {
      map.removeLayer(markersRef.current['pickup']);
      delete markersRef.current['pickup'];
    }

    // 3. Destination Location Marker (Sleek Rose Teardrop)
    if (destinationLocation) {
      const icon = L.divIcon({
        html: `<div class="flex flex-col items-center">
            <div class="bg-gradient-to-tr from-rose-600 to-pink-500 text-white font-extrabold text-[10px] tracking-wider uppercase px-2.5 py-0.5 rounded-full shadow-xl border border-white flex items-center gap-1">
              <span>DROP</span>
            </div>
            <div class="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[7px] border-t-rose-600 shadow-sm"></div>
          </div>`,
        className: 'custom-map-icon',
        iconSize: [70, 36],
        iconAnchor: [35, 36],
      });

      if (!markersRef.current['destination']) {
        markersRef.current['destination'] = L.marker(destinationLocation, { icon }).addTo(map);
      } else {
        markersRef.current['destination'].setIcon(icon);
        markersRef.current['destination'].setLatLng(destinationLocation);
      }
    } else if (markersRef.current['destination']) {
      map.removeLayer(markersRef.current['destination']);
      delete markersRef.current['destination'];
    }

    // 4. Captain Live Location Marker with Smooth Rotation & Direction Indicator
    if (captainLocation) {
      const svgIcon = VEHICLE_SVG_ICONS[captainVehicleType] || VEHICLE_SVG_ICONS['BIKE'];
      const initialPos = currentCaptainPosRef.current || captainLocation;
      const initialHeading = captainHeadingRef.current || 0;

      const icon = L.divIcon({
        html: `<div class="relative flex items-center justify-center">
            <span class="animate-ping absolute inline-flex h-11 w-11 rounded-full bg-amber-400 opacity-50"></span>
            <div class="vehicle-rotation-node transition-transform duration-300 ease-out relative flex items-center justify-center bg-slate-950 border-2 border-amber-400 text-amber-400 rounded-full p-2.5 shadow-2xl" style="transform: rotate(${initialHeading}deg);">
              ${svgIcon}
            </div>
          </div>`,
        className: 'custom-map-icon',
        iconSize: [48, 48],
        iconAnchor: [24, 24],
      });

      if (!markersRef.current['captain_assigned']) {
        markersRef.current['captain_assigned'] = L.marker(initialPos, { icon }).addTo(map);
      } else {
        markersRef.current['captain_assigned'].setIcon(icon);
      }
    } else if (markersRef.current['captain_assigned']) {
      map.removeLayer(markersRef.current['captain_assigned']);
      delete markersRef.current['captain_assigned'];
    }

    // 5. Nearby Available Captains
    Object.keys(markersRef.current).forEach((key) => {
      if (key.startsWith('nearby_') && !nearbyCaptains.some((c) => `nearby_${c.id}` === key)) {
        map.removeLayer(markersRef.current[key]);
        delete markersRef.current[key];
      }
    });

    nearbyCaptains.forEach((c) => {
      const key = `nearby_${c.id}`;
      const svgIcon = VEHICLE_SVG_ICONS[c.vehicle_type] || VEHICLE_SVG_ICONS['BIKE'];
      const icon = L.divIcon({
        html: `<div class="bg-slate-950/90 rounded-full p-1.5 shadow-md border border-slate-700/80 flex items-center justify-center hover:scale-110 transition-transform">
            ${svgIcon}
          </div>`,
        className: 'custom-map-icon',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      if (!markersRef.current[key]) {
        markersRef.current[key] = L.marker([c.latitude, c.longitude], { icon }).addTo(map);
      } else {
        markersRef.current[key].setLatLng([c.latitude, c.longitude]);
      }
    });

    // 6. Polyline Route Drawing
    if (polylineBgRef.current) {
      map.removeLayer(polylineBgRef.current);
      polylineBgRef.current = null;
    }
    if (polylineFgRef.current) {
      map.removeLayer(polylineFgRef.current);
      polylineFgRef.current = null;
    }

    if (routeCoordinates && routeCoordinates.length > 0) {
      polylineBgRef.current = L.polyline(routeCoordinates, {
        color: '#0f172a',
        weight: 8,
        opacity: 0.65,
        lineCap: 'round',
      }).addTo(map);

      polylineFgRef.current = L.polyline(routeCoordinates, {
        color: '#38bdf8',
        weight: 4,
        opacity: 0.95,
        lineCap: 'round',
      }).addTo(map);
    }
  }, [customerLocation, pickupLocation, destinationLocation, captainLocation, nearbyCaptains, routeCoordinates, captainVehicleType]);

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainerRef} className={className} />

      {/* FLOATING RECENTER / FREE PAN TOGGLE BUTTON (TOP-RIGHT / BOTTOM-RIGHT OF MAP) */}
      <div className="absolute top-20 right-4 z-20 pointer-events-auto flex flex-col gap-2">
        <button
          onClick={handleRecenterClick}
          className={`flex items-center justify-center h-11 w-11 rounded-2xl shadow-xl border backdrop-blur-md transition-all duration-200 active:scale-95 ${
            isUserPanning
              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-amber-500/20'
              : 'bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:text-amber-500'
          }`}
          title={isUserPanning ? 'Free Panning Active - Tap to Recenter Camera' : 'Recenter & Follow Live Location'}
        >
          <Crosshair className={`h-5 w-5 ${isUserPanning ? 'animate-pulse' : ''}`} />
        </button>
      </div>

      {/* USER PANNING NOTIFICATION BADGE */}
      {isUserPanning && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
          <button
            onClick={handleRecenterClick}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-950/80 text-amber-400 border border-amber-400/40 shadow-xl backdrop-blur-md text-[11px] font-bold hover:bg-slate-900 transition-all active:scale-95"
          >
            <Crosshair className="h-3.5 w-3.5 animate-spin text-amber-400" />
            <span>Map Free Panned • Tap to Recenter</span>
          </button>
        </div>
      )}
    </div>
  );
}

