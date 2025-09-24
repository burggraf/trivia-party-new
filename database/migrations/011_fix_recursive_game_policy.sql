-- Migration: Break recursive policy dependency between games and players
-- The previous policy "players_read_joined_games" referenced the players table
-- while some player policies reference games. This created a cyclical dependency
-- that PostgreSQL detected as infinite recursion when evaluating row level
-- security, preventing games from being queried. We remove that policy and rely
-- on the joinable status based policies for exposing games to authenticated
-- players.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'games'
      AND policyname = 'players_read_joined_games'
  ) THEN
    EXECUTE 'DROP POLICY "players_read_joined_games" ON games;';
  END IF;
END
$$;
