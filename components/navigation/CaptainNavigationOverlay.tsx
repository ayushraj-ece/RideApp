'use client';

import { useState } from 'react';
import { Navigation, Compass, ExternalLink, MapPin, X, ArrowUpRight, CornerUpLeft, CornerUpRight, ArrowUp } from 'lucide-react';
import { Ride } from '@/types/ride';

interface CaptainNavigationOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  ride: Ride;
}

export default function CaptainNavigationOverlay({
  isOpen,
  onClose,
  ride,
}: CaptainNavigationOverlayProps) {
  if (!isOpen || !ride) return null;

  const isHeadingToPickup = ['ACCEPTED', 'CAPTAIN_ARRIVING', 'CAPTAIN_ARRIVED'].includes(ride.status);
  const targetAddress = isHeadingToPickup ? ride.pickup_address : ride.destination_address;
  const targetLat = isHeadingToPickup ? ride.pickup_lat : ride.destination_lat;
  const targetLng = isHeadingToPickup ? ride.pickup_lng : ride.destination_lng;

  const openGoogleMaps = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${targetLat},${targetLng}&travelmode=driving`;
    window.open(url, '_blank');
  };

  const steps = isHeadingToPickup
    ? [
        { instruction: 'Head north towards pickup location', distance: '400 m', icon: ArrowUp },
        { instruction: 'Turn right at main junction', distance: '1.2 km', icon: CornerUpRight },
        { instruction: 'Destination pickup point is on your left', distance: '150 m', icon: MapPin },
      ]
    : [
        { instruction: 'Continue on main expressway', distance: '2.4 km', icon: ArrowUp },
        { instruction: 'Take left exit towards destination avenue', distance: '800 m', icon: CornerUpLeft },
        { instruction: 'Arrive at drop destination point', distance: '200 m', icon: MapPin },
      ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/90 text-white animate-in fade-in duration-200">
      {/* NAVIGATION HEADER */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
            <Navigation className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
              {isHeadingToPickup ? 'NAVIGATING TO PICKUP' : 'NAVIGATING TO DESTINATION'}
            </span>
            <h3 className="font-extrabold text-white text-xs sm:text-sm truncate max-w-[220px]">
              {targetAddress}
            </h3>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* LIVE TURN-BY-TURN INSTRUCTIONS LIST */}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-amber-400 font-bold uppercase">Estimated Time</p>
            <p className="text-2xl font-black text-white">{Math.ceil(ride.distance_km * 2.5)} mins</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-amber-400 font-bold uppercase">Distance</p>
            <p className="text-2xl font-black text-white">{ride.distance_km} km</p>
          </div>
        </div>

        <h4 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider pt-2">
          Turn-by-Turn Route Guidance
        </h4>

        <div className="space-y-2.5">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3.5"
              >
                <div className="h-9 w-9 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-white">{step.instruction}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{step.distance}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FOOTER ACTIONS */}
      <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-2">
        <button
          onClick={openGoogleMaps}
          className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
        >
          <ExternalLink className="h-4 w-4" />
          <span>Open in Google Maps App</span>
        </button>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition-colors"
        >
          Return to Rideon Captain Dashboard
        </button>
      </div>
    </div>
  );
}
