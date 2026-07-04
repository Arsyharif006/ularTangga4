-- Migration: Add trigger to emit player_left events
-- Creates a function and triggers that insert a `player_left` row into `game_events`
-- when a player is removed (DELETE) or marked inactive (is_active -> false).

BEGIN;

-- Drop existing function if present (safe to run)
DROP FUNCTION IF EXISTS public.fn_notify_player_left() CASCADE;

CREATE OR REPLACE FUNCTION public.fn_notify_player_left()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  p_room_id text;
  p_player_id text;
  p_name text;
BEGIN
  -- Prefer OLD values for DELETE/UPDATE
  p_room_id := COALESCE(OLD.room_id::text, NEW.room_id::text);
  p_player_id := COALESCE(OLD.player_id::text, NEW.player_id::text);
  p_name := COALESCE(OLD.name, NEW.name, 'Seseorang');

  INSERT INTO public.game_events (room_id, player_id, event_type, event_data, created_at)
  VALUES (
    p_room_id,
    p_player_id,
    'player_left',
    json_build_object('name', p_name),
    now()
  );

  RETURN NEW;
END;
$$;

-- Trigger: after delete -> notify
DROP TRIGGER IF EXISTS trg_player_left_after_delete ON public.game_players;
CREATE TRIGGER trg_player_left_after_delete
AFTER DELETE ON public.game_players
FOR EACH ROW
EXECUTE FUNCTION public.fn_notify_player_left();

-- Trigger: after update when is_active becomes false
DROP TRIGGER IF EXISTS trg_player_left_after_update_inactive ON public.game_players;
CREATE TRIGGER trg_player_left_after_update_inactive
AFTER UPDATE OF is_active ON public.game_players
FOR EACH ROW
WHEN (OLD.is_active IS DISTINCT FROM NEW.is_active AND NEW.is_active = false)
EXECUTE FUNCTION public.fn_notify_player_left();

COMMIT;
