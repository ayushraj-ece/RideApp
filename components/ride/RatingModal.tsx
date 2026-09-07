'use client';

import { useState } from 'react';
import { Star, CheckCircle, X } from 'lucide-react';

interface RatingModalProps {
  isOpen: boolean;
  rideId: string;
  captainName?: string;
  vehicleNumber?: string;
  finalFare?: number;
  onSubmit: (rating: number, feedback: string) => Promise<void>;
  onClose: () => void;
}

export default function RatingModal({
  isOpen,
  rideId,
  captainName = 'Captain',
  vehicleNumber = '',
  finalFare,
  onSubmit,
  onClose,
}: RatingModalProps) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(rating, feedback);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
          <CheckCircle className="h-6 w-6" />
        </div>

        <h3 className="text-xl font-bold text-slate-100">Ride Completed!</h3>
        {finalFare !== undefined && (
          <p className="mt-1 text-2xl font-extrabold text-amber-400">
            ₹{finalFare} <span className="text-xs font-normal text-slate-400">(Cash / UPI)</span>
          </p>
        )}

        <p className="mt-3 text-xs text-slate-400">
          How was your ride with <span className="font-semibold text-slate-200">{captainName}</span> ({vehicleNumber})?
        </p>

        {/* 5-Star Selector */}
        <div className="my-5 flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="p-1 text-2xl transition-transform hover:scale-125 focus:outline-none"
            >
              <Star
                className={`h-8 w-8 ${
                  (hoverRating || rating) >= star
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-slate-700'
                }`}
              />
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            rows={2}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Write optional feedback (e.g. Great driving, polite)"
            className="w-full rounded-xl bg-slate-800 border border-slate-700/80 p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-amber-400 py-3 font-bold text-slate-950 hover:bg-amber-300 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Rating'}
          </button>
        </form>
      </div>
    </div>
  );
}
