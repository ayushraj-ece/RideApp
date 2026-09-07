'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MAP_CONFIG } from '@/lib/maps';
import { VehicleType } from '@/types/ride';

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  customerLocation?: [number, number] | null;
  pickupLocation?: [number, number] | null;
  destinationLocation?: [number, number] | null;
  captainLocation?: [number, number] | null;
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

// Vector SVG Icons for Vehicles (No Emojis!)
const VEHICLE_SVG_ICONS: Record<VehicleType, string> = {
  BIKE: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-amber-400"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6h2l3 6.5"/><path d="M12 17.5V14l-3-3 4-3 2 3h3"/></svg>`,
  AUTO: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-amber-400"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-1.1 0-2 .9-2 2v7c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>`,
  CAB: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-amber-400"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-1.1 0-2 .9-2 2v7c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M7 11h10"/></svg>`,
};

export default function MapView({
  center = MAP_CONFIG.defaultCenter,
  zoom = MAP_CONFIG.defaultZoom,
  customerLocation,
  pickupLocation,
  destinationLocation,
  captainLocation,
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

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center,
      zoom,
      zoomControl: false,
    });

    L.tileLayer(MAP_CONFIG.tileUrl, {
      attribution: MAP_CONFIG.attribution,
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onMapClickRef.current) {
        onMapClickRef.current(e.latlng.lat, e.latlng.lng);
      }
    });

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update Center & Fit Bounds
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    if (routeCoordinates && routeCoordinates.length > 0) {
      const bounds = L.latLngBounds(routeCoordinates.map((c) => L.latLng(c[0], c[1])));
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16, animate: true });
    } else if (pickupLocation && destinationLocation) {
      const bounds = L.latLngBounds([
        L.latLng(pickupLocation[0], pickupLocation[1]),
        L.latLng(destinationLocation[0], destinationLocation[1]),
      ]);
      map.fitBounds(bounds, { padding: [70, 70], maxZoom: 16, animate: true });
    } else if (pickupLocation) {
      map.setView(pickupLocation, 15, { animate: true });
    } else if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, pickupLocation, destinationLocation, routeCoordinates]);

  // Render Markers & Polylines
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

    // 4. Assigned Captain Live Marker (Gold Badge)
    if (captainLocation) {
      const icon = L.divIcon({
        html: `<div class="bg-slate-900 border-2 border-amber-400 text-amber-400 rounded-full p-2 shadow-2xl flex items-center justify-center">
            ${VEHICLE_SVG_ICONS['BIKE']}
          </div>`,
        className: 'custom-map-icon',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      if (!markersRef.current['captain_assigned']) {
        markersRef.current['captain_assigned'] = L.marker(captainLocation, { icon }).addTo(map);
      } else {
        markersRef.current['captain_assigned'].setLatLng(captainLocation);
      }
    } else if (markersRef.current['captain_assigned']) {
      map.removeLayer(markersRef.current['captain_assigned']);
      delete markersRef.current['captain_assigned'];
    }

    // 5. Nearby Available Captains (Vector SVG Vehicles in Dark Badges)
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

    // 6. Polyline Route Drawing (Dual layer path)
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
  }, [customerLocation, pickupLocation, destinationLocation, captainLocation, nearbyCaptains, routeCoordinates]);

  return <div ref={mapContainerRef} className={className} />;
}
