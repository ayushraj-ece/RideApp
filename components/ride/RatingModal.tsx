'use client';

import { useState } from 'react';
import { Star, CheckCircle, X, Bike, Car, Package, ThumbsUp, ShieldCheck } from 'lucide-react';

interface RatingModalProps {
  isOpen: boolean;
  rideId: string;
  isParcel?: boolean;
  captainName?: string;
  vehicleNumber?: string;
  vehicleModel?: string;
  captainRating?: number;
  finalFare?: number;
  onSubmit: (rating: number, feedback: string) => Promise<void>;
  onClose: () => void;
}

const QUICK_FEEDBACK_CHIPS = [
  'Polite Captain',
  'Safe Driving',
  'On Time Pickup',
  'Clean Vehicle',
  'Great Communication',
];

const RATING_LABELS: Record<number, string> = {
  1: 'Poor Experience',
  2: 'Below Expectations',
  3: 'Good Ride',
  4: 'Very Good!',
  5: 'Excellent Service!',
};

export default function RatingModal({
  isOpen,
  rideId,
  isParcel = false,
  captainName = 'Captain',
  vehicleNumber = '',
  vehicleModel = 'Vehicle',
  captainRating,
  finalFare,
  onSubmit,
  onClose,
}: RatingModalProps) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const toggleChip = (chip: string) => {
    setSelectedChips((prev) =>
      prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const fullFeedback = [
      ...selectedChips,
      feedback.trim(),
    ]
      .filter(Boolean)
      .join(' • ');

    try {
      await onSubmit(rating, fullFeedback);
    } finally {
      setSubmitting(false);
    }
  };

  const displayRating = hoverRating || rating;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/70 p-0 sm:p-4 backdrop-blur-md animate-in fade-in duration-200 font-sans">
      <div className="w-full max-w-md rounded-t-[32px] sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-2xl text-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto overscroll-contain animate-in slide-in-from-bottom duration-200">
        
        {/* HEADER */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              {isParcel ? <Package className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                {isParcel ? 'Parcel Delivered!' : 'Ride Completed!'}
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">
                {isParcel ? 'Package handed over to recipient' : 'Thank you for riding with Rideon'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* CAPTAIN & FARE INFO CARD */}
        <div className="my-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-amber-400/20 text-amber-500 border border-amber-400/30 flex items-center justify-center font-bold shrink-0">
              <Bike className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100">{captainName}</h4>
              <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500 font-medium">
                {vehicleNumber && (
                  <span className="font-black px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[10px]">
                    {vehicleNumber}
                  </span>
                )}
                <span>{vehicleModel}</span>
              </div>
            </div>
          </div>

          {finalFare !== undefined && (
            <div className="text-right">
              <span className="text-[10px] font-black uppercase text-slate-400 block">Total Paid</span>
              <span className="font-black text-base text-emerald-600 dark:text-emerald-400">₹{finalFare}</span>
            </div>
          )}
        </div>

        {/* STAR RATING SECTION */}
        <div className="text-center py-2 space-y-2">
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {isParcel ? `Rate your package delivery by ${captainName}` : `How was your ride with ${captainName}?`}
          </p>

          {/* 5-Star Selector */}
          <div className="flex justify-center gap-2 py-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-1 transition-transform hover:scale-125 focus:outline-none cursor-pointer"
              >
                <Star
                  className={`h-9 w-9 transition-colors ${
                    displayRating >= star
                      ? 'fill-amber-400 text-amber-400 shadow-sm'
                      : 'text-slate-300 dark:text-slate-700'
                  }`}
                />
              </button>
            ))}
          </div>

          <p className="text-xs font-black text-amber-500 uppercase tracking-wider h-4">
            {RATING_LABELS[displayRating] || 'Tap stars to rate'}
          </p>
        </div>

        {/* QUICK FEEDBACK CHIPS */}
        <div className="my-4 space-y-2">
          <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
            What went well?
          </span>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_FEEDBACK_CHIPS.map((chip) => {
              const active = selectedChips.includes(chip);
              return (
                <button
                  key={chip}
                  type="button"
                  onClick={() => toggleChip(chip)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors cursor-pointer ${
                    active
                      ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-amber-400'
                  }`}
                >
                  {chip}
                </button>
              );
            })}
          </div>
        </div>

        {/* FEEDBACK FORM */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            rows={2}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Write additional feedback (optional)..."
            className="w-full rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
          />

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl bg-amber-400 hover:bg-amber-300 py-3.5 text-xs font-extrabold text-slate-950 transition-transform active:scale-[0.99] disabled:opacity-50 shadow-md cursor-pointer"
          >
            {submitting ? 'Submitting Rating...' : 'Submit Rating'}
          </button>
        </form>
      </div>
    </div>
  );
}

