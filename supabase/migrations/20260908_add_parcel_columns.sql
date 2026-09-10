-- Migration: Add Parcel and Order Preference columns
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS is_parcel BOOLEAN DEFAULT FALSE;
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS drop_otp TEXT;
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS pay_at TEXT DEFAULT 'PICKUP';
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS receiver_name TEXT;
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS receiver_phone TEXT;

ALTER TABLE public.captains ADD COLUMN IF NOT EXISTS accepts_rides BOOLEAN DEFAULT TRUE;
ALTER TABLE public.captains ADD COLUMN IF NOT EXISTS accepts_parcels BOOLEAN DEFAULT TRUE;

-- Update initial schema defaults
NOTIFY pgrst, 'reload schema';
