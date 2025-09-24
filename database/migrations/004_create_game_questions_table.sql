-- Migration: Create game_questions table with answer randomization support

CREATE TABLE game_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  round_number INTEGER NOT NULL CHECK (round_number >= 1),
  question_order INTEGER NOT NULL CHECK (question_order >= 1),
  shuffled_answers TEXT[] NOT NULL CHECK (array_length(shuffled_answers, 1) = 4),
  correct_position INTEGER NOT NULL CHECK (correct_position >= 0 AND correct_position <= 3),
  displayed_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,

  -- Unique constraints
  UNIQUE(game_id, round_number, question_order),
  UNIQUE(game_id, question_id)
);

-- Add indexes for performance
CREATE INDEX idx_game_questions_game_round ON game_questions(game_id, round_number, question_order);
CREATE INDEX idx_game_questions_status ON game_questions(game_id, displayed_at, completed_at);

-- Add comments
COMMENT ON TABLE game_questions IS 'Questions selected and randomized for specific games';
COMMENT ON COLUMN game_questions.shuffled_answers IS 'Answer options in randomized order [a,b,c,d]';
COMMENT ON COLUMN game_questions.correct_position IS 'Index (0-3) of correct answer in shuffled_answers';
COMMENT ON COLUMN game_questions.displayed_at IS 'When question was shown to players';
COMMENT ON COLUMN game_questions.completed_at IS 'When question was closed for answers';