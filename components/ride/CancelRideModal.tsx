'use client';

import { useState } from 'react';
import { X, AlertTriangle, ArrowLeft, XCircle } from 'lucide-react';
import { UserRole } from '@/types/ride';

interface CancelRideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmCancel: (reason: string) => void;
  role: UserRole;
}

export default function CancelRideModal({
  isOpen,
  onClose,
  onConfirmCancel,
  role,
}: CancelRideModalProps) {
  const [step, setStep] = useState<'REASON' | 'CONFIRM'>('REASON');
  const [selectedReason, setSelectedReason] = useState<string>('');

  if (!isOpen) return null;

  const customerReasons = [
    'Change of plan / No longer needed',
    'Captain taking too long to arrive',
    'Driver asked me to cancel',
    'Wrong pickup location selected',
    'Found alternative transport',
  ];

  const captainReasons = [
    'Customer requested cancellation',
    'Heavy traffic / Unreachable route',
    'Customer not responding to calls',
    'Vehicle issue / Unexpected delay',
  ];

  const reasons = role === 'CUSTOMER' ? customerReasons : captainReasons;

  const handleSelectReason = (reason: string) => {
    setSelectedReason(reason);
    setStep('CONFIRM');
  };

  const handleReset = () => {
    setStep('REASON');
    setSelectedReason('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-2xl space-y-4">
        {step === 'REASON' ? (
          <>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-rose-500">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">Why cancel this ride?</h3>
              </div>
              <button onClick={handleReset} className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Please choose a reason to help us improve our service:
            </p>

            <div className="space-y-2">
              {reasons.map((r, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectReason(r)}
                  className="w-full text-left p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 hover:border-amber-400 hover:bg-amber-400/10 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors flex items-center justify-between group"
                >
                  <span>{r}</span>
                  <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-amber-500" />
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <button onClick={() => setStep('REASON')} className="flex items-center gap-1 text-xs font-extrabold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </button>
              <button onClick={handleReset} className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="text-center py-2 space-y-2">
              <div className="h-12 w-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto border border-rose-500/20">
                <XCircle className="h-6 w-6" />
              </div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">Are you sure you want to cancel?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 px-4">
                Reason: <strong className="text-slate-800 dark:text-slate-200">{selectedReason}</strong>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              {/* GREEN BUTTON: NO, KEEP RIDE */}
              <button
                onClick={handleReset}
                className="w-full rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold py-3.5 text-xs shadow-md transition-transform active:scale-95"
              >
                NO, KEEP RIDE
              </button>

              {/* RED BUTTON: YES, CANCEL RIDE */}
              <button
                onClick={() => {
                  onConfirmCancel(selectedReason);
                  handleReset();
                }}
                className="w-full rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold py-3.5 text-xs shadow-md transition-transform active:scale-95"
              >
                YES, CANCEL RIDE
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
