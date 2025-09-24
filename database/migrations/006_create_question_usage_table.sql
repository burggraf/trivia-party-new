-- Migration: Create question_usage table for host question tracking

CREATE TABLE question_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  used_in_game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint - prevent question reuse per host
  UNIQUE(host_id, question_id)
);

-- Add indexes for performance
CREATE INDEX idx_question_usage_host ON question_usage(host_id, question_id);
CREATE INDEX idx_question_usage_game ON question_usage(used_in_game_id);

-- Add comments
COMMENT ON TABLE question_usage IS 'Track which questions each host has used to prevent reuse';
COMMENT ON COLUMN question_usage.host_id IS 'Host who used the question';
COMMENT ON COLUMN question_usage.used_in_game_id IS 'Game where question was used';