'use client';

import { useState } from 'react';
import { Shield, AlertTriangle, Share2, PhoneCall, X } from 'lucide-react';

interface SafetySheetProps {
  isOpen: boolean;
  onClose: () => void;
  rideId: string;
  captainName?: string;
  vehicleNumber?: string;
  vehicleModel?: string;
  pickupAddress: string;
  destinationAddress: string;
}

export default function SafetySheet({
  isOpen,
  onClose,
  rideId,
  captainName,
  vehicleNumber,
  vehicleModel,
  pickupAddress,
  destinationAddress,
}: SafetySheetProps) {
  const [sosTriggered, setSosTriggered] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const shareRideInfo = () => {
    const text = `I'm on a ride!\nCaptain: ${captainName || 'Assigned'}\nVehicle: ${vehicleModel || ''} (${vehicleNumber || ''})\nPickup: ${pickupAddress}\nDestination: ${destinationAddress}`;
    if (navigator.share) {
      navigator.share({ title: 'My Ride Info', text });
    } else {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSos = () => {
    setSosTriggered(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4 sm:items-center">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl bg-amber-400/10 text-amber-400">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Safety & Support</h3>
            <p className="text-xs text-slate-400">Ride Safety Tools</p>
          </div>
        </div>

        {/* SOS Alert Warning */}
        {sosTriggered ? (
          <div className="mb-4 rounded-2xl bg-rose-500/20 border border-rose-500/40 p-4 text-center">
            <AlertTriangle className="h-8 w-8 text-rose-400 mx-auto mb-2" />
            <h4 className="font-bold text-rose-400 text-sm">Emergency Alert Activated</h4>
            <p className="text-xs text-slate-300 mt-1">
              Safety alert recorded for Ride #{rideId.slice(0, 8)}. For real emergencies, please call official helpline 112 directly.
            </p>
          </div>
        ) : (
          <button
            onClick={handleSos}
            className="w-full mb-4 flex items-center justify-center gap-2 rounded-2xl bg-rose-600/90 py-3 font-bold text-white shadow-lg hover:bg-rose-500 transition-colors"
          >
            <AlertTriangle className="h-5 w-5" />
            Trigger Emergency Alert (SOS)
          </button>
        )}

        {/* Ride Details Card */}
        <div className="rounded-2xl bg-slate-800/60 p-4 border border-slate-700/50 space-y-2 text-xs mb-4">
          <div className="flex justify-between border-b border-slate-700/60 pb-2">
            <span className="text-slate-400">Captain</span>
            <span className="font-semibold text-slate-200">{captainName || 'Assigned Captain'}</span>
          </div>
          <div className="flex justify-between border-b border-slate-700/60 pb-2">
            <span className="text-slate-400">Vehicle</span>
            <span className="font-semibold text-slate-200">{vehicleModel} ({vehicleNumber})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Ride Reference</span>
            <span className="font-mono text-amber-400">{rideId.slice(0, 8)}</span>
          </div>
        </div>

        {/* Share Button */}
        <button
          onClick={shareRideInfo}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-800 py-3 font-semibold text-slate-200 hover:bg-slate-700 border border-slate-700/80 transition-colors"
        >
          <Share2 className="h-4 w-4 text-amber-400" />
          {copied ? 'Ride Details Copied!' : 'Share Live Ride Details'}
        </button>
      </div>
    </div>
  );
}
