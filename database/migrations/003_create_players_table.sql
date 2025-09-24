-- Migration: Create players table with presence tracking fields

CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  team_id UUID NULL REFERENCES teams(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL CHECK (length(display_name) >= 2 AND length(display_name) <= 20),
  is_online BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraints
  UNIQUE(game_id, display_name)
);

-- Add indexes for performance
CREATE INDEX idx_players_game_team ON players(game_id, team_id);
CREATE INDEX idx_players_user_game ON players(user_id, game_id);
CREATE INDEX idx_players_online ON players(is_online) WHERE is_online = true;

-- Add comments
COMMENT ON TABLE players IS 'Individual participants in trivia games';
COMMENT ON COLUMN players.user_id IS 'Authenticated user (null for anonymous players)';
COMMENT ON COLUMN players.is_online IS 'Real-time presence status';
COMMENT ON COLUMN players.last_seen IS 'Last activity timestamp for presence tracking';