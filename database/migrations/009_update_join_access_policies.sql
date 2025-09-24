-- Migration: Expand join access policies to cover setup games and allow authenticated players to lobby
-- access before they are formally part of a game.

-- Allow anonymous viewers (including unauthenticated join links) to see games that are
-- still setting up so the landing page can load context before the game starts.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'games'
      AND policyname = 'anonymous_read_games'
  ) THEN
    EXECUTE 'ALTER POLICY "anonymous_read_games" ON games
      USING (status IN (''setup'', ''active'', ''completed''));';
  ELSE
    RAISE NOTICE 'Policy "anonymous_read_games" does not exist, skipping ALTER.';
  END IF;
END
$$;

-- Allow authenticated players (e.g., users who signed in before joining) to load the
-- basic game details needed to join via a shared link without being members yet.
CREATE POLICY "authenticated_read_joinable_games" ON games
  FOR SELECT TO authenticated
  USING (status IN ('setup', 'active', 'completed'));

-- Allow anonymous access to team listings for games that are setting up so join pages
-- can render available teams.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'teams'
      AND policyname = 'anonymous_read_teams'
  ) THEN
    EXECUTE 'ALTER POLICY "anonymous_read_teams" ON teams
      USING (
        game_id IN (
          SELECT id FROM games WHERE status IN (''setup'', ''active'', ''completed'')
        )
      );';
  ELSE
    RAISE NOTICE 'Policy "anonymous_read_teams" does not exist, skipping ALTER.';
  END IF;
END
$$;

-- Allow authenticated players to inspect teams for joinable games even before they
-- have a player row created.
CREATE POLICY "authenticated_read_joinable_teams" ON teams
  FOR SELECT TO authenticated
  USING (
    game_id IN (
      SELECT id FROM games WHERE status IN ('setup', 'active', 'completed')
    )
  );

-- Allow anonymous viewers to see lobby participants for context while a game is being
-- set up.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'players'
      AND policyname = 'anonymous_read_players'
  ) THEN
    EXECUTE 'ALTER POLICY "anonymous_read_players" ON players
      USING (
        game_id IN (
          SELECT id FROM games WHERE status IN (''setup'', ''active'', ''completed'')
        )
      );';
  ELSE
    RAISE NOTICE 'Policy "anonymous_read_players" does not exist, skipping ALTER.';
  END IF;
END
$$;

-- Allow authenticated players to see lobby participants while deciding to join.
CREATE POLICY "authenticated_read_joinable_players" ON players
  FOR SELECT TO authenticated
  USING (
    game_id IN (
      SELECT id FROM games WHERE status IN ('setup', 'active', 'completed')
    )
  );

-- Allow authenticated users to spin up a new team in a lobby before they have a player
-- row (they will immediately create one after) while limiting creation to games that
-- are still joinable.
CREATE POLICY "players_create_joinable_teams" ON teams
  FOR INSERT TO authenticated
  WITH CHECK (
    game_id IN (
      SELECT id FROM games WHERE status IN ('setup', 'active')
    )
  );
