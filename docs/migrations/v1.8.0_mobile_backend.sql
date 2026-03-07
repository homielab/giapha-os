-- v1.8.0: Mobile Backend Infrastructure
-- Migration for JWT token storage and sync logging

-- Create refresh_tokens table for tracking token rotation
CREATE TABLE IF NOT EXISTS public.refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  ip_address TEXT,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for looking up tokens by user
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON public.refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON public.refresh_tokens(expires_at);

-- Create sync_logs table for tracking mobile sync operations
CREATE TABLE IF NOT EXISTS public.sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  since_timestamp TIMESTAMPTZ NOT NULL,
  rows_synced INTEGER DEFAULT 0,
  sync_duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for sync logs queries
CREATE INDEX IF NOT EXISTS idx_sync_logs_user_id ON public.sync_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created_at ON public.sync_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_sync_logs_branch_id ON public.sync_logs(branch_id);

-- Enable RLS on refresh_tokens
ALTER TABLE public.refresh_tokens ENABLE ROW LEVEL SECURITY;

-- RLS policies: Users can only view their own tokens
CREATE POLICY "Users can view own refresh tokens" ON public.refresh_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tokens" ON public.refresh_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- Enable RLS on sync_logs
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies: Users can only view their own sync logs
CREATE POLICY "Users can view own sync logs" ON public.sync_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can insert logs
CREATE POLICY "Service can insert sync logs" ON public.sync_logs
  FOR INSERT WITH CHECK (true);

-- Grant permissions
GRANT SELECT, DELETE ON public.refresh_tokens TO authenticated;
GRANT SELECT ON public.sync_logs TO authenticated;
GRANT INSERT, SELECT ON public.sync_logs TO service_role;
