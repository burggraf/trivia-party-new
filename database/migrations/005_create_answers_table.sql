-- Migration: Create answers table with team submission constraints

CREATE TABLE answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  game_question_id UUID NOT NULL REFERENCES game_questions(id) ON DELETE CASCADE,
  selected_position INTEGER NOT NULL CHECK (selected_position >= 0 AND selected_position <= 3),
  is_correct BOOLEAN NOT NULL,
  points_earned INTEGER NOT NULL CHECK (points_earned >= 0),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_by UUID NOT NULL REFERENCES players(id) ON DELETE RESTRICT,

  -- Unique constraint - one answer per team per question
  UNIQUE(team_id, game_question_id)
);

-- Add indexes for performance
CREATE INDEX idx_answers_team_question ON answers(team_id, game_question_id);
CREATE INDEX idx_answers_game_submitted ON answers(game_id, submitted_at);
CREATE INDEX idx_answers_question_correct ON answers(game_question_id, is_correct);

-- Add comments
COMMENT ON TABLE answers IS 'Team submissions for trivia questions';
COMMENT ON COLUMN answers.selected_position IS 'Position selected in shuffled_answers (0-3)';
COMMENT ON COLUMN answers.is_correct IS 'Whether the selected answer was correct';
COMMENT ON COLUMN answers.points_earned IS 'Points awarded for this answer';
COMMENT ON COLUMN answers.submitted_by IS 'Player who submitted the answer for the team';