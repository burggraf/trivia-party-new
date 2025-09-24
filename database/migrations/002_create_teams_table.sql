-- Migration: Create teams table with foreign keys and unique constraints

CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(name) >= 2 AND length(name) <= 30),
  join_code TEXT NOT NULL CHECK (length(join_code) = 6),
  captain_id UUID NULL,
  score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraints
  UNIQUE(game_id, name),
  UNIQUE(game_id, join_code)
);

-- Add indexes for performance
CREATE INDEX idx_teams_game_id ON teams(game_id);
CREATE INDEX idx_teams_join_code ON teams(join_code);

-- Add comments
COMMENT ON TABLE teams IS 'Teams competing in trivia games';
COMMENT ON COLUMN teams.join_code IS '6-character alphanumeric code for players to join team';
COMMENT ON COLUMN teams.captain_id IS 'Player who created the team (optional)';