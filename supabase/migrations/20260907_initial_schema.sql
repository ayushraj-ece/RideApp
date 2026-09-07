-- Initial Database Schema for Rapido-style Ride-Hailing WebApp

-- 1. ENUMS
CREATE TYPE user_role AS ENUM ('CUSTOMER', 'CAPTAIN');
CREATE TYPE vehicle_type AS ENUM ('BIKE', 'AUTO', 'CAB');
CREATE TYPE verification_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');
CREATE TYPE availability_status AS ENUM ('AVAILABLE', 'BUSY');
CREATE TYPE ride_status AS ENUM (
  'REQUESTED',
  'SEARCHING',
  'ACCEPTED',
  'CAPTAIN_ARRIVING',
  'CAPTAIN_ARRIVED',
  'OTP_VERIFIED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED_BY_CUSTOMER',
  'CANCELLED_BY_CAPTAIN',
  'NO_CAPTAIN_FOUND',
  'EXPIRED'
);

-- 2. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role user_role NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CAPTAINS TABLE
CREATE TABLE IF NOT EXISTS public.captains (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  vehicle_type vehicle_type NOT NULL,
  vehicle_number TEXT NOT NULL,
  vehicle_model TEXT NOT NULL,
  license_number TEXT NOT NULL,
  verification_status verification_status DEFAULT 'APPROVED',
  online_status BOOLEAN DEFAULT FALSE,
  availability_status availability_status DEFAULT 'AVAILABLE',
  latitude FLOAT8,
  longitude FLOAT8,
  last_location_update TIMESTAMPTZ,
  rating_sum INT DEFAULT 0,
  rating_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. RIDES TABLE
CREATE TABLE IF NOT EXISTS public.rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id),
  captain_id UUID REFERENCES public.profiles(id),
  vehicle_type vehicle_type NOT NULL,
  status ride_status DEFAULT 'SEARCHING',
  pickup_address TEXT NOT NULL,
  pickup_lat FLOAT8 NOT NULL,
  pickup_lng FLOAT8 NOT NULL,
  destination_address TEXT NOT NULL,
  destination_lat FLOAT8 NOT NULL,
  destination_lng FLOAT8 NOT NULL,
  distance_km FLOAT8 NOT NULL,
  estimated_fare NUMERIC(10,2) NOT NULL,
  final_fare NUMERIC(10,2),
  otp TEXT NOT NULL,
  cancelled_by TEXT,
  cancel_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id),
  sender_role user_role NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. RATINGS TABLE
CREATE TABLE IF NOT EXISTS public.ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.profiles(id),
  captain_id UUID NOT NULL REFERENCES public.profiles(id),
  rating INT CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. CAPTAIN EARNINGS TABLE
CREATE TABLE IF NOT EXISTS public.captain_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  captain_id UUID NOT NULL REFERENCES public.profiles(id),
  ride_id UUID NOT NULL REFERENCES public.rides(id),
  amount NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES FOR FAST REALTIME QUERIES
CREATE INDEX IF NOT EXISTS idx_rides_status ON public.rides(status);
CREATE INDEX IF NOT EXISTS idx_rides_customer ON public.rides(customer_id);
CREATE INDEX IF NOT EXISTS idx_rides_captain ON public.rides(captain_id);
CREATE INDEX IF NOT EXISTS idx_rides_created ON public.rides(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_captains_available ON public.captains(online_status, availability_status, verification_status, vehicle_type);
CREATE INDEX IF NOT EXISTS idx_messages_ride ON public.messages(ride_id);

-- ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.captains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.captain_earnings ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES FOR PROFILES
CREATE POLICY "Public profiles are readable by authenticated users" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- RLS POLICIES FOR CAPTAINS
CREATE POLICY "Captains are readable by authenticated users" ON public.captains
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Captains can insert their own entry" ON public.captains
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Captains can update their own entry" ON public.captains
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- RLS POLICIES FOR RIDES
CREATE POLICY "Customers and Captains can view relevant rides" ON public.rides
  FOR SELECT TO authenticated USING (
    customer_id = auth.uid() OR
    captain_id = auth.uid() OR
    (status = 'SEARCHING' AND EXISTS (
      SELECT 1 FROM public.captains
      WHERE captains.id = auth.uid()
      AND captains.verification_status = 'APPROVED'
      AND captains.online_status = true
      AND captains.vehicle_type = rides.vehicle_type
    ))
  );
CREATE POLICY "Customers can insert ride requests" ON public.rides
  FOR INSERT TO authenticated WITH CHECK (customer_id = auth.uid());
CREATE POLICY "Participants can update rides" ON public.rides
  FOR UPDATE TO authenticated USING (customer_id = auth.uid() OR captain_id = auth.uid() OR captain_id IS NULL);

-- RLS POLICIES FOR MESSAGES
CREATE POLICY "Messages readable by ride participants" ON public.messages
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.rides
      WHERE rides.id = messages.ride_id
      AND (rides.customer_id = auth.uid() OR rides.captain_id = auth.uid())
    )
  );
CREATE POLICY "Participants can insert messages" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.rides
      WHERE rides.id = messages.ride_id
      AND (rides.customer_id = auth.uid() OR rides.captain_id = auth.uid())
    )
  );

-- RLS POLICIES FOR RATINGS
CREATE POLICY "Ratings viewable by participants" ON public.ratings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Customer can submit rating" ON public.ratings
  FOR INSERT TO authenticated WITH CHECK (customer_id = auth.uid());

-- RLS POLICIES FOR CAPTAIN EARNINGS
CREATE POLICY "Captains view own earnings" ON public.captain_earnings
  FOR SELECT TO authenticated USING (captain_id = auth.uid());
CREATE POLICY "System/Captain insert earnings" ON public.captain_earnings
  FOR INSERT TO authenticated WITH CHECK (captain_id = auth.uid());

-- RPC: ATOMIC RIDE ACCEPTANCE (PREVENTS DOUBLE ACCEPTANCE)
CREATE OR REPLACE FUNCTION public.accept_ride(p_ride_id UUID, p_captain_id UUID)
RETURNS JSON AS $$
DECLARE
  v_ride public.rides%ROWTYPE;
  v_captain public.captains%ROWTYPE;
BEGIN
  -- Verify captain is online & approved
  SELECT * INTO v_captain FROM public.captains WHERE id = p_captain_id;
  IF NOT FOUND OR v_captain.verification_status != 'APPROVED' OR NOT v_captain.online_status THEN
    RETURN json_build_object('success', false, 'message', 'Captain is not online or approved');
  END IF;

  -- Perform atomic update on ride where status is SEARCHING and captain_id is NULL
  UPDATE public.rides
  SET captain_id = p_captain_id,
      status = 'ACCEPTED',
      updated_at = NOW()
  WHERE id = p_ride_id AND status = 'SEARCHING' AND captain_id IS NULL
  RETURNING * INTO v_ride;

  IF v_ride.id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Ride request is no longer available or already accepted');
  END IF;

  -- Set captain status to BUSY
  UPDATE public.captains
  SET availability_status = 'BUSY'
  WHERE id = p_captain_id;

  RETURN json_build_object('success', true, 'ride', row_to_json(v_ride));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: VERIFY OTP AND START RIDE
CREATE OR REPLACE FUNCTION public.verify_otp(p_ride_id UUID, p_captain_id UUID, p_otp TEXT)
RETURNS JSON AS $$
DECLARE
  v_ride public.rides%ROWTYPE;
BEGIN
  SELECT * INTO v_ride FROM public.rides WHERE id = p_ride_id AND captain_id = p_captain_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Ride not found or unauthorized');
  END IF;

  IF v_ride.status != 'CAPTAIN_ARRIVED' AND v_ride.status != 'ACCEPTED' AND v_ride.status != 'CAPTAIN_ARRIVING' THEN
    RETURN json_build_object('success', false, 'message', 'Invalid ride state for OTP verification');
  END IF;

  IF TRIM(v_ride.otp) != TRIM(p_otp) THEN
    RETURN json_build_object('success', false, 'message', 'Invalid OTP code');
  END IF;

  UPDATE public.rides
  SET status = 'IN_PROGRESS',
      updated_at = NOW()
  WHERE id = p_ride_id
  RETURNING * INTO v_ride;

  RETURN json_build_object('success', true, 'ride', row_to_json(v_ride));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: COMPLETE RIDE & RECORD EARNINGS
CREATE OR REPLACE FUNCTION public.complete_ride(p_ride_id UUID, p_captain_id UUID)
RETURNS JSON AS $$
DECLARE
  v_ride public.rides%ROWTYPE;
BEGIN
  SELECT * INTO v_ride FROM public.rides WHERE id = p_ride_id AND captain_id = p_captain_id;

  IF NOT FOUND OR v_ride.status != 'IN_PROGRESS' THEN
    RETURN json_build_object('success', false, 'message', 'Ride is not in progress');
  END IF;

  UPDATE public.rides
  SET status = 'COMPLETED',
      final_fare = estimated_fare,
      updated_at = NOW()
  WHERE id = p_ride_id
  RETURNING * INTO v_ride;

  -- Free up captain
  UPDATE public.captains
  SET availability_status = 'AVAILABLE'
  WHERE id = p_captain_id;

  -- Record earnings
  INSERT INTO public.captain_earnings (captain_id, ride_id, amount)
  VALUES (p_captain_id, p_ride_id, v_ride.estimated_fare);

  RETURN json_build_object('success', true, 'ride', row_to_json(v_ride));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: CANCEL RIDE
CREATE OR REPLACE FUNCTION public.cancel_ride(p_ride_id UUID, p_user_id UUID, p_reason TEXT)
RETURNS JSON AS $$
DECLARE
  v_ride public.rides%ROWTYPE;
  v_user_role user_role;
  v_new_status ride_status;
BEGIN
  SELECT role INTO v_user_role FROM public.profiles WHERE id = p_user_id;
  SELECT * INTO v_ride FROM public.rides WHERE id = p_ride_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Ride not found');
  END IF;

  IF v_ride.status = 'COMPLETED' THEN
    RETURN json_build_object('success', false, 'message', 'Cannot cancel completed ride');
  END IF;

  IF v_user_role = 'CUSTOMER' THEN
    v_new_status := 'CANCELLED_BY_CUSTOMER';
  ELSE
    v_new_status := 'CANCELLED_BY_CAPTAIN';
  END IF;

  UPDATE public.rides
  SET status = v_new_status,
      cancelled_by = v_user_role::text,
      cancel_reason = p_reason,
      updated_at = NOW()
  WHERE id = p_ride_id
  RETURNING * INTO v_ride;

  IF v_ride.captain_id IS NOT NULL THEN
    UPDATE public.captains
    SET availability_status = 'AVAILABLE'
    WHERE id = v_ride.captain_id;
  END IF;

  RETURN json_build_object('success', true, 'ride', row_to_json(v_ride));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: UPDATE CAPTAIN LOCATION
CREATE OR REPLACE FUNCTION public.update_captain_location(p_captain_id UUID, p_lat FLOAT8, p_lng FLOAT8)
RETURNS VOID AS $$
BEGIN
  UPDATE public.captains
  SET latitude = p_lat,
      longitude = p_lng,
      last_location_update = NOW()
  WHERE id = p_captain_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ENABLE REALTIME PUBLICATION FOR RIDES, MESSAGES, AND CAPTAINS
ALTER PUBLICATION supabase_realtime ADD TABLE public.rides;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.captains;
