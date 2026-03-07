-- v1.8.1: Push Notifications Infrastructure
-- Tables and functions for managing push notification tokens and delivery

-- Create notification_tokens table
CREATE TABLE IF NOT EXISTS public.notification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  device_name TEXT,
  device_os_version TEXT,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_tokens_user_id ON public.notification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_tokens_platform ON public.notification_tokens(platform);

-- Create notification_logs table for tracking sends
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_token_id UUID REFERENCES public.notification_tokens(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL, -- 'family_event', 'member_added', 'birthday', etc
  title TEXT NOT NULL,
  body TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON public.notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON public.notification_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_notification_logs_notification_type ON public.notification_logs(notification_type);

-- Enable RLS
ALTER TABLE public.notification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for notification_tokens
CREATE POLICY "Users can view own tokens" ON public.notification_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tokens" ON public.notification_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tokens" ON public.notification_tokens
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tokens" ON public.notification_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for notification_logs
CREATE POLICY "Users can view own logs" ON public.notification_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can insert/update logs
CREATE POLICY "Service can manage logs" ON public.notification_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service can update logs" ON public.notification_logs
  FOR UPDATE USING (true);

-- Permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_tokens TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.notification_logs TO authenticated;
GRANT INSERT, UPDATE, SELECT ON public.notification_logs TO service_role;

-- Function to clean up expired tokens (runs weekly)
CREATE OR REPLACE FUNCTION cleanup_expired_notification_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM public.notification_tokens
  WHERE (
    is_active = false OR
    last_used_at IS NULL AND created_at < NOW() - INTERVAL '30 days' OR
    last_used_at < NOW() - INTERVAL '90 days'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Scheduled job (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-notification-tokens', '0 2 * * 0', 'SELECT cleanup_expired_notification_tokens()');
