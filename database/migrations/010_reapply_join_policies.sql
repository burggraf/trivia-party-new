-- Migration: Reapply and expand join access policies for setup games
-- This migration drops the previous join-related policies and recreates them
-- with consistent predicates so both anonymous viewers and authenticated players
-- can discover games, teams, and lobby participants while a game is being set up.

-- Games ---------------------------------------------------------------
DROP POLICY IF EXISTS "anonymous_read_games" ON games;
CREATE POLICY "anonymous_read_games" ON games
  FOR SELECT TO anon
  USING (status IN ('setup', 'active', 'paused', 'completed'));

DROP POLICY IF EXISTS "authenticated_read_joinable_games" ON games;
CREATE POLICY "authenticated_read_joinable_games" ON games
  FOR SELECT TO authenticated
  USING (status IN ('setup', 'active', 'paused', 'completed'));

-- Teams ---------------------------------------------------------------
DROP POLICY IF EXISTS "anonymous_read_teams" ON teams;
CREATE POLICY "anonymous_read_teams" ON teams
  FOR SELECT TO anon
  USING (
    game_id IN (
      SELECT id
      FROM games
      WHERE status IN ('setup', 'active', 'paused', 'completed')
    )
  );

DROP POLICY IF EXISTS "authenticated_read_joinable_teams" ON teams;
CREATE POLICY "authenticated_read_joinable_teams" ON teams
  FOR SELECT TO authenticated
  USING (
    game_id IN (
      SELECT id
      FROM games
      WHERE status IN ('setup', 'active', 'paused', 'completed')
    )
  );

DROP POLICY IF EXISTS "players_create_joinable_teams" ON teams;
CREATE POLICY "players_create_joinable_teams" ON teams
  FOR INSERT TO authenticated
  WITH CHECK (
    game_id IN (
      SELECT id
      FROM games
      WHERE status IN ('setup', 'active')
    )
  );

-- Players -------------------------------------------------------------
DROP POLICY IF EXISTS "anonymous_read_players" ON players;
CREATE POLICY "anonymous_read_players" ON players
  FOR SELECT TO anon
  USING (
    game_id IN (
      SELECT id
      FROM games
      WHERE status IN ('setup', 'active', 'paused', 'completed')
    )
  );

DROP POLICY IF EXISTS "authenticated_read_joinable_players" ON players;
CREATE POLICY "authenticated_read_joinable_players" ON players
  FOR SELECT TO authenticated
  USING (
    game_id IN (
      SELECT id
      FROM games
      WHERE status IN ('setup', 'active', 'paused', 'completed')
    )
  );
