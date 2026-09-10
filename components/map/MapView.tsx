'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MAP_CONFIG } from '@/lib/maps';
import { VehicleType } from '@/types/ride';
import { Crosshair, Navigation, Compass } from 'lucide-react';

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

// Top-Down Vehicle Asset Paths (2:3 aspect ratio, facing top/movement direction)
const VEHICLE_IMAGE_PATHS: Record<VehicleType, string> = {
  BIKE: '/vehicles/bike.svg',
  AUTO: '/vehicles/auto.svg',
  CAB: '/vehicles/cab.svg',
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
    const points: L.LatLng[] = [];

    if (routeCoordinates && routeCoordinates.length > 0) {
      routeCoordinates.forEach((c) => points.push(L.latLng(c[0], c[1])));
    }
    if (pickupLocation) points.push(L.latLng(pickupLocation[0], pickupLocation[1]));
    if (destinationLocation) points.push(L.latLng(destinationLocation[0], destinationLocation[1]));
    if (captainLocation) points.push(L.latLng(captainLocation[0], captainLocation[1]));
    if (customerLocation) points.push(L.latLng(customerLocation[0], customerLocation[1]));

    if (points.length > 1) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [65, 65], maxZoom: 16, animate: true });
    } else if (points.length === 1) {
      map.setView(points[0], 16, { animate: true });
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

    const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    const activeTileUrl = isDarkMode ? MAP_CONFIG.darkTileUrl : MAP_CONFIG.lightTileUrl;

    L.tileLayer(activeTileUrl, {
      maxZoom: 20,
      subdomains: MAP_CONFIG.subdomains,
      attribution: MAP_CONFIG.attribution,
    }).addTo(map);

    // Map click handler
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onMapClickRef.current) {
        onMapClickRef.current(e.latlng.lat, e.latlng.lng);
      }
    });

    // Detect user manual camera interactions (drag, zoom, touch, scroll)
    const onUserInteraction = () => {
      setPanningState(true);
    };

    map.on('movestart', (e: any) => {
      if (e && e.originalEvent) {
        setPanningState(true);
      }
    });
    map.on('dragstart', onUserInteraction);
    map.on('zoomstart', onUserInteraction);

    // Attach direct DOM listeners on map container to catch all touch/pointer gestures
    const container = mapContainerRef.current;
    const handlePointerDown = () => {
      setPanningState(true);
    };

    if (container) {
      container.addEventListener('pointerdown', handlePointerDown, { passive: true });
      container.addEventListener('touchstart', handlePointerDown, { passive: true });
      container.addEventListener('wheel', handlePointerDown, { passive: true });
    }

    mapRef.current = map;

    return () => {
      if (container) {
        container.removeEventListener('pointerdown', handlePointerDown);
        container.removeEventListener('touchstart', handlePointerDown);
        container.removeEventListener('wheel', handlePointerDown);
      }
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update map center when center prop changes
  const prevCenterRef = useRef<[number, number] | null>(null);
  useEffect(() => {
    if (!mapRef.current || !center) return;
    const [lat, lng] = center;
    if (
      !prevCenterRef.current ||
      prevCenterRef.current[0] !== lat ||
      prevCenterRef.current[1] !== lng
    ) {
      prevCenterRef.current = [lat, lng];
      setPanningState(false);
      mapRef.current.setView([lat, lng], mapRef.current.getZoom() || zoom, { animate: true });
    }
  }, [center, zoom]);

  // Auto-fit camera whenever key locations (pickup, drop, route) change, unless user is manually panning
  useEffect(() => {
    if (!mapRef.current) return;

    if (!isUserPanningRef.current) {
      fitMapBounds();
    }
  }, [pickupLocation, destinationLocation, routeCoordinates, fitMapBounds]);

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

    // 1. Customer Location Marker (Pulsing Sky Blue Dot)
    if (customerLocation && typeof customerLocation[0] === 'number' && typeof customerLocation[1] === 'number' && !isNaN(customerLocation[0]) && !isNaN(customerLocation[1])) {
      const icon = L.divIcon({
        html: `<div style="position:relative; display:flex; items-center; justify-content:center; width:28px; height:28px;">
            <span style="position:absolute; width:100%; height:100%; border-radius:50%; background-color:#38bdf8; opacity:0.6; animation:ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
            <span style="position:relative; width:16px; height:16px; border-radius:50%; background-color:#0284c7; border:2px solid #ffffff; box-shadow:0 4px 10px rgba(0,0,0,0.3);"></span>
          </div>`,
        className: 'custom-map-icon',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      if (!markersRef.current['customer']) {
        markersRef.current['customer'] = L.marker(customerLocation, { icon, zIndexOffset: 1500 }).addTo(map);
      } else {
        markersRef.current['customer'].setLatLng(customerLocation);
      }
    } else if (markersRef.current['customer']) {
      map.removeLayer(markersRef.current['customer']);
      delete markersRef.current['customer'];
    }

    // 2. Pickup Location Marker (Sleek Emerald Teardrop)
    if (pickupLocation && typeof pickupLocation[0] === 'number' && typeof pickupLocation[1] === 'number' && !isNaN(pickupLocation[0]) && !isNaN(pickupLocation[1])) {
      const icon = L.divIcon({
        html: `<div style="display:flex; flex-direction:column; align-items:center; width:70px; height:36px; pointer-events:none;">
            <div style="background:linear-gradient(135deg, #059669, #10b981); color:#ffffff; font-weight:900; font-size:10px; padding:3px 9px; border-radius:12px; border:1.5px solid #ffffff; box-shadow:0 4px 14px rgba(0,0,0,0.35); text-transform:uppercase; letter-spacing:0.8px;">
              <span>PICKUP</span>
            </div>
            <div style="width:0; height:0; border-left:6px solid transparent; border-right:6px solid transparent; border-top:8px solid #059669; margin-top:-1px;"></div>
          </div>`,
        className: 'custom-map-icon',
        iconSize: [70, 36],
        iconAnchor: [35, 36],
      });

      if (!markersRef.current['pickup']) {
        markersRef.current['pickup'] = L.marker(pickupLocation, { icon, zIndexOffset: 2500 }).addTo(map);
      } else {
        markersRef.current['pickup'].setLatLng(pickupLocation);
      }
    } else if (markersRef.current['pickup']) {
      map.removeLayer(markersRef.current['pickup']);
      delete markersRef.current['pickup'];
    }

    // 3. Destination Location Marker (Sleek Rose Teardrop)
    if (destinationLocation && typeof destinationLocation[0] === 'number' && typeof destinationLocation[1] === 'number' && !isNaN(destinationLocation[0]) && !isNaN(destinationLocation[1])) {
      const icon = L.divIcon({
        html: `<div style="display:flex; flex-direction:column; align-items:center; width:70px; height:36px; pointer-events:none;">
            <div style="background:linear-gradient(135deg, #e11d48, #f43f5e); color:#ffffff; font-weight:900; font-size:10px; padding:3px 9px; border-radius:12px; border:1.5px solid #ffffff; box-shadow:0 4px 14px rgba(0,0,0,0.35); text-transform:uppercase; letter-spacing:0.8px;">
              <span>DROP</span>
            </div>
            <div style="width:0; height:0; border-left:6px solid transparent; border-right:6px solid transparent; border-top:8px solid #e11d48; margin-top:-1px;"></div>
          </div>`,
        className: 'custom-map-icon',
        iconSize: [70, 36],
        iconAnchor: [35, 36],
      });

      if (!markersRef.current['destination']) {
        markersRef.current['destination'] = L.marker(destinationLocation, { icon, zIndexOffset: 2500 }).addTo(map);
      } else {
        markersRef.current['destination'].setLatLng(destinationLocation);
      }
    } else if (markersRef.current['destination']) {
      map.removeLayer(markersRef.current['destination']);
      delete markersRef.current['destination'];
    }

    // 4. Captain Live Location Marker with Smooth Rotation & Explicit High Visibility
    const activeCaptainPos = captainLocation || currentCaptainPosRef.current;
    if (activeCaptainPos && typeof activeCaptainPos[0] === 'number' && typeof activeCaptainPos[1] === 'number' && !isNaN(activeCaptainPos[0]) && !isNaN(activeCaptainPos[1])) {
      const vehicleSrc = VEHICLE_IMAGE_PATHS[captainVehicleType] || VEHICLE_IMAGE_PATHS['BIKE'];
      const initialHeading = captainHeadingRef.current || 0;

      if (!markersRef.current['captain_assigned']) {
        const icon = L.divIcon({
          html: `<div style="position:relative; width:44px; height:66px; display:flex; align-items:center; justify-content:center; pointer-events:none; overflow:visible;">
              <div class="vehicle-rotation-node" style="transform: rotate(${initialHeading}deg); width:44px; height:66px; transition: transform 0.3s ease-out; overflow:visible;">
                <img src="${vehicleSrc}" alt="${captainVehicleType}" style="width:44px; height:66px; object-fit:contain; display:block; filter: drop-shadow(0 6px 12px rgba(0,0,0,0.4));" />
              </div>
            </div>`,
          className: 'custom-map-icon',
          iconSize: [44, 66],
          iconAnchor: [22, 33],
        });
        markersRef.current['captain_assigned'] = L.marker(activeCaptainPos, { icon, zIndexOffset: 3000 }).addTo(map);
      } else {
        markersRef.current['captain_assigned'].setLatLng(activeCaptainPos);
        const el = markersRef.current['captain_assigned'].getElement();
        if (el) {
          const img = el.querySelector('img');
          if (img && img.getAttribute('src') !== vehicleSrc) {
            img.setAttribute('src', vehicleSrc);
          }
          const rotContainer = el.querySelector('.vehicle-rotation-node') as HTMLElement;
          if (rotContainer) {
            rotContainer.style.transform = `rotate(${initialHeading}deg)`;
          }
        }
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
      const vehicleSrc = VEHICLE_IMAGE_PATHS[c.vehicle_type] || VEHICLE_IMAGE_PATHS['BIKE'];
      const icon = L.divIcon({
        html: `<div class="relative flex items-center justify-center filter drop-shadow-lg hover:scale-110 transition-transform" style="width: 28px; height: 42px;">
            <img src="${vehicleSrc}" alt="${c.vehicle_type}" class="w-full h-full object-contain pointer-events-none" />
          </div>`,
        className: 'custom-map-icon',
        iconSize: [28, 42],
        iconAnchor: [14, 21],
      });

      if (!markersRef.current[key]) {
        markersRef.current[key] = L.marker([c.latitude, c.longitude], { icon }).addTo(map);
      } else {
        markersRef.current[key].setLatLng([c.latitude, c.longitude]);
      }
    });

    // 6. Layered High-Visibility Navigation Polyline Route Drawing
    if (polylineBgRef.current) {
      map.removeLayer(polylineBgRef.current);
      polylineBgRef.current = null;
    }
    if (polylineFgRef.current) {
      map.removeLayer(polylineFgRef.current);
      polylineFgRef.current = null;
    }

    if (routeCoordinates && routeCoordinates.length > 0) {
      // Dark outer border line for contrast
      polylineBgRef.current = L.polyline(routeCoordinates, {
        color: '#020617',
        weight: 10,
        opacity: 0.7,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      // Bright electric blue inner navigation line
      polylineFgRef.current = L.polyline(routeCoordinates, {
        color: '#2563eb',
        weight: 5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
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

