-- Migration: Add function & policy to delete rides older than 10 days
CREATE OR REPLACE FUNCTION public.delete_old_rides(p_days_old INT DEFAULT 10)
RETURNS JSON AS $$
DECLARE
  v_count INT;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  DELETE FROM public.rides
  WHERE (customer_id = v_user_id OR captain_id = v_user_id)
    AND created_at < NOW() - (p_days_old || ' days')::INTERVAL;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN json_build_object('success', true, 'deleted_count', v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policy allowing users to delete their own old rides
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Participants can delete old rides' AND tablename = 'rides'
  ) THEN
    CREATE POLICY "Participants can delete old rides" ON public.rides
      FOR DELETE TO authenticated
      USING (customer_id = auth.uid() OR captain_id = auth.uid());
  END IF;
END $$;
