-- Migration: 20260828000000_create_instagram_and_saved_items.sql
-- Description: Establish tables for ConnectedInstagram, PendingInstagramConnection, and SavedItem with strict RLS policies.

-- 1. Connected Instagram Accounts
CREATE TABLE IF NOT EXISTS public.connected_instagram (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    instagram_scoped_id TEXT NOT NULL,
    display_username TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_instagram_scoped_id UNIQUE (user_id, instagram_scoped_id)
);

CREATE INDEX IF NOT EXISTS idx_connected_instagram_scoped_id ON public.connected_instagram (instagram_scoped_id, status);
CREATE INDEX IF NOT EXISTS idx_connected_instagram_user_id ON public.connected_instagram (user_id);

-- Enable RLS for connected_instagram
ALTER TABLE public.connected_instagram ENABLE ROW LEVEL SECURITY;

CREATE POLICY connected_instagram_select_own
    ON public.connected_instagram
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY connected_instagram_update_own
    ON public.connected_instagram
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY connected_instagram_delete_own
    ON public.connected_instagram
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);


-- 2. Pending Instagram Connection Handshakes
CREATE TABLE IF NOT EXISTS public.pending_instagram_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    connection_code TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pending_connections_code ON public.pending_instagram_connections (connection_code);
CREATE INDEX IF NOT EXISTS idx_pending_connections_user_id ON public.pending_instagram_connections (user_id);

-- Enable RLS for pending_instagram_connections
ALTER TABLE public.pending_instagram_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY pending_connections_select_own
    ON public.pending_instagram_connections
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY pending_connections_insert_own
    ON public.pending_instagram_connections
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY pending_connections_delete_own
    ON public.pending_instagram_connections
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);


-- 3. Saved Items (Captured Reels / Content)
CREATE TABLE IF NOT EXISTS public.saved_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    connected_instagram_id UUID REFERENCES public.connected_instagram(id) ON DELETE SET NULL,
    platform TEXT NOT NULL DEFAULT 'instagram',
    source_url TEXT NOT NULL,
    provider_item_id TEXT,
    source_event_id TEXT,
    caption TEXT,
    creator_username TEXT,
    thumbnail_url TEXT,
    processing_status TEXT NOT NULL DEFAULT 'SAVED',
    raw_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_saved_items_user_source_event UNIQUE (user_id, source_event_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_items_user_created_at ON public.saved_items (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_items_source_url ON public.saved_items (source_url);

-- Enable RLS for saved_items
ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY saved_items_select_own
    ON public.saved_items
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY saved_items_update_own
    ON public.saved_items
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY saved_items_delete_own
    ON public.saved_items
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
