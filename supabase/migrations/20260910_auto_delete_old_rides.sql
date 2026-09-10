-- Migration: Automatic Database Cleanup for Rides Older Than 10 Days
-- 1. Enable pg_cron extension for background cron jobs in Supabase / PostgreSQL
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Schedule daily background cron job to automatically delete rides older than 10 days
-- Runs every day at 3:00 AM UTC automatically in the database
SELECT cron.schedule(
  'auto-delete-rides-older-than-10-days',
  '0 3 * * *',
  $$ 
    DELETE FROM public.rides 
    WHERE created_at < NOW() - INTERVAL '10 days'; 
  $$
);

-- 3. Automated trigger helper for immediate cleanup on new ride creations
CREATE OR REPLACE FUNCTION public.trigger_auto_cleanup_old_rides()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.rides
  WHERE created_at < NOW() - INTERVAL '10 days';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger executing automatically when new rides are created
DROP TRIGGER IF EXISTS trg_auto_cleanup_old_rides ON public.rides;
CREATE TRIGGER trg_auto_cleanup_old_rides
  AFTER INSERT ON public.rides
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trigger_auto_cleanup_old_rides();
