-- Migration: Create games table with all fields and constraints
-- This would be applied when database write access is available

CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (length(title) >= 3 AND length(title) <= 100),
  status TEXT NOT NULL DEFAULT 'setup' CHECK (status IN ('setup', 'active', 'paused', 'completed')),
  current_round INTEGER NOT NULL DEFAULT 1 CHECK (current_round >= 1),
  current_question INTEGER NOT NULL DEFAULT 1 CHECK (current_question >= 1),
  max_rounds INTEGER NOT NULL CHECK (max_rounds >= 1 AND max_rounds <= 20),
  questions_per_round INTEGER NOT NULL CHECK (questions_per_round >= 1 AND questions_per_round <= 50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ NULL,
  ended_at TIMESTAMPTZ NULL,
  settings JSONB NOT NULL DEFAULT '{
    "allowLateJoins": true,
    "timePerQuestion": 0,
    "pointsPerCorrect": 100,
    "categories": [],
    "difficulty": null
  }'::jsonb
);

-- Add indexes for performance
CREATE INDEX idx_games_host_status ON games(host_id, status);
CREATE INDEX idx_games_status_created ON games(status, created_at);

-- Add comments for documentation
COMMENT ON TABLE games IS 'Trivia game sessions with host controls and settings';
COMMENT ON COLUMN games.status IS 'Game state: setup, active, paused, completed';
COMMENT ON COLUMN games.settings IS 'JSON configuration for game rules and preferences';